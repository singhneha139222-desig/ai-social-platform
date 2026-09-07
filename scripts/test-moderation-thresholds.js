const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Mongoose Models
const postSchema = new mongoose.Schema({}, { strict: false, collection: 'posts' });
const Post = mongoose.model('Post', postSchema);
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', userSchema);

const AI_URL = 'http://localhost:5001/api/v1';
const API_URL = 'http://localhost:5000/api/v1';
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_social_platform';

const testCases = require('./moderation-test-cases.json');
const resultsPath = path.join(__dirname, '..', 'docs', 'testing', 'moderation-threshold-validation.json');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDirectModelTest(text) {
  try {
    const toxReq = await fetch(`${AI_URL}/moderation/toxicity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const toxData = await toxReq.json();

    const sentReq = await fetch(`${AI_URL}/moderation/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const sentData = await sentReq.json();
    
    return {
      toxicity: toxData,
      sentiment: sentData
    };
  } catch (err) {
    console.error('Direct Model Error:', err.message);
    return null;
  }
}

async function getAuthToken() {
  const dummyUser = {
    username: 'mod_tester_' + Date.now(),
    email: `tester_${Date.now()}@test.com`,
    password: await bcrypt.hash('password123', 10),
    displayName: 'Moderation Tester',
    dateOfBirth: new Date('1990-01-01'),
    role: 'user',
    status: 'active'
  };

  try {
    const user = await User.create(dummyUser);
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign({ id: user._id.toString() }, secret, { expiresIn: '1h' });
    return token;
  } catch (err) {
    console.error('Auth Error:', err);
    throw new Error('Failed to create test user in DB');
  }
}

async function runE2ETest(text, token) {
  try {
    // 1. Create Post
    const req = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: text })
    });
    const resData = await req.json();
    const postId = resData.data.post._id;

    // 2. Wait for async moderation to finish (typically < 1s, we wait 2.5s)
    await sleep(2500);

    // 3. Fetch from MongoDB to verify final state
    const post = await Post.findById(postId).lean();
    if (!post) throw new Error('Post not found in DB');

    return post;
  } catch (err) {
    console.error('E2E Test Error:', err.message);
    return null;
  }
}

async function main() {
  console.log('Starting Scientific End-to-End Moderation Test...');
  
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB.');

  const token = await getAuthToken();
  console.log('Obtained Auth Token for E2E testing.');

  const results = [];

  for (const tc of testCases) {
    console.log(`\nTesting [${tc.id}] "${tc.text}"`);
    
    // Test A: Direct Model
    const modelResult = await runDirectModelTest(tc.text);
    
    // Test B: E2E application
    const e2eResult = await runE2ETest(tc.text, token);

    const data = {
      id: tc.id,
      text: tc.text,
      language: modelResult?.toxicity?.language || 'en',
      model_overall_score: modelResult?.toxicity?.toxicity_score,
      model_categories: modelResult?.toxicity?.categories,
      model_decision: modelResult?.toxicity?.decision,
      model_sentiment_label: modelResult?.sentiment?.sentiment,
      model_sentiment_score: modelResult?.sentiment?.confidence,
      model_xai_triggered: !!modelResult?.toxicity?.explanation,
      
      e2e_status: e2eResult?.moderationStatus,
      e2e_toxicity_score: e2eResult?.toxicityScore,
      e2e_reason: e2eResult?.moderationReason,
      e2e_sentiment: e2eResult?.sentiment,
      e2e_xai_status: e2eResult?.explanation?.status,
      e2e_xai_top_tokens: e2eResult?.explanation?.topTokens || [],
      
      admin_review: e2eResult?.moderationStatus === 'flagged',
      public_feed: ['published', 'approved_by_admin'].includes(e2eResult?.moderationStatus)
    };

    results.push(data);
    
    console.log(`Model Decision: ${data.model_decision} | E2E Status: ${data.e2e_status} | XAI: ${data.model_xai_triggered}`);
  }

  // Save results
  const outDir = path.dirname(resultsPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nTesting complete. Raw data saved to ${resultsPath}`);

  await mongoose.disconnect();
}

main().catch(console.error);
