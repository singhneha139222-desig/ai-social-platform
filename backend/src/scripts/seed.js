/**
 * Seed Script — Creates demo data for the AI Social Platform.
 * 
 * Creates:
 * - 5 users (1 admin + 4 regular users)
 * - ~15 posts with varied moderation statuses
 * - Follow relationships
 * - Likes and comments
 * - Notifications
 * 
 * IMPORTANT: All content is synthetic and safe.
 * Moderation test content uses controlled phrases that reliably
 * demonstrate different severity levels without reproducing harmful content.
 * 
 * Usage: npm run seed (or node src/scripts/seed.js)
 * 
 * Demo Credentials:
 *   Admin:  admin@example.com / Admin@123
 *   Users:  john@example.com / User@123
 *           jane@example.com / User@123
 *           alice@example.com / User@123
 *           bob@example.com / User@123
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Interaction = require('../models/Interaction');
const Notification = require('../models/Notification');
const ModerationLog = require('../models/ModerationLog');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

async function seed() {
  await connectDB();

  logger.info('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Interaction.deleteMany({}),
    Notification.deleteMany({}),
    ModerationLog.deleteMany({}),
  ]);

  // --- Create Users ---
  logger.info('Creating users...');
  const users = await User.create([
    {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: 'Admin@123',
      displayName: 'Admin User',
      bio: 'Platform administrator. Keeping the community safe.',
      role: 'admin',
      avatar: '',
    },
    {
      username: 'john_doe',
      email: 'john@example.com',
      passwordHash: 'User@123',
      displayName: 'John Doe',
      bio: 'Software developer and tech enthusiast. Love building things.',
      avatar: '',
    },
    {
      username: 'jane_smith',
      email: 'jane@example.com',
      passwordHash: 'User@123',
      displayName: 'Jane Smith',
      bio: 'Data scientist and AI researcher. Passionate about ML.',
      avatar: '',
    },
    {
      username: 'alice_wonder',
      email: 'alice@example.com',
      passwordHash: 'User@123',
      displayName: 'Alice Wonder',
      bio: 'Creative writer and digital artist. Always exploring new ideas.',
      avatar: '',
    },
    {
      username: 'bob_builder',
      email: 'bob@example.com',
      passwordHash: 'User@123',
      displayName: 'Bob Builder',
      bio: 'Full-stack developer. Open source contributor.',
      avatar: '',
    },
  ]);

  const [adminUser, john, jane, alice, bob] = users;
  logger.info(`Created ${users.length} users`);

  // --- Create Posts ---
  // Safe content that will be published (toxicity < 0.70)
  logger.info('Creating posts...');
  const safePosts = await Post.create([
    {
      author: john._id,
      content: 'Just finished building my first machine learning model! The accuracy is really promising. Excited to share the results with the team.',
      toxicityScore: 0.05,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.92,
      likesCount: 8,
      commentsCount: 2,
    },
    {
      author: jane._id,
      content: 'Great article about transformer architectures and their impact on natural language processing. The attention mechanism is truly revolutionary.',
      toxicityScore: 0.03,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.88,
      likesCount: 12,
      commentsCount: 3,
    },
    {
      author: alice._id,
      content: 'Working on a new digital art project using generative AI. The results are stunning — technology and creativity go hand in hand.',
      toxicityScore: 0.02,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.95,
      likesCount: 15,
      commentsCount: 4,
    },
    {
      author: bob._id,
      content: 'Released a new open source library for API testing today. Check it out and let me know what you think!',
      toxicityScore: 0.04,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.85,
      likesCount: 6,
      commentsCount: 1,
    },
    {
      author: john._id,
      content: 'Sometimes debugging takes longer than writing the code itself. Patience is definitely a virtue in software development.',
      toxicityScore: 0.08,
      moderationStatus: 'published',
      sentiment: 'neutral',
      sentimentScore: 0.72,
      likesCount: 4,
      commentsCount: 2,
    },
    {
      author: jane._id,
      content: 'The weather has been terrible this week. Hard to stay motivated when it rains every single day.',
      toxicityScore: 0.10,
      moderationStatus: 'published',
      sentiment: 'negative',
      sentimentScore: 0.78,
      likesCount: 2,
      commentsCount: 1,
    },
    {
      author: alice._id,
      content: 'Just discovered an amazing coffee shop downtown. They have the best espresso I have ever tasted. Highly recommend!',
      toxicityScore: 0.01,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.96,
      likesCount: 20,
      commentsCount: 5,
    },
    {
      author: bob._id,
      content: 'Interesting debate about microservices vs monolith architectures. Both have their place depending on the project scale and team size.',
      toxicityScore: 0.06,
      moderationStatus: 'published',
      sentiment: 'neutral',
      sentimentScore: 0.65,
      likesCount: 9,
      commentsCount: 3,
    },
    {
      author: john._id,
      content: 'Completed a marathon this weekend! Six months of training finally paid off. Never give up on your goals.',
      toxicityScore: 0.01,
      moderationStatus: 'published',
      sentiment: 'positive',
      sentimentScore: 0.98,
      likesCount: 25,
      commentsCount: 7,
    },
  ]);

  // Flagged content (toxicity 0.70-0.90) — synthetic phrases for testing
  const flaggedPosts = await Post.create([
    {
      author: bob._id,
      content: 'This is absolutely the worst implementation I have ever seen. The developer who wrote this garbage should be ashamed. What a complete disaster of a codebase.',
      toxicityScore: 0.78,
      moderationStatus: 'flagged',
      moderationReason: 'Toxicity score 0.7800 exceeds publish threshold (0.70), flagged for admin review',
      sentiment: null,
      sentimentScore: null,
      likesCount: 0,
      commentsCount: 0,
    },
    {
      author: alice._id,
      content: 'People who disagree with this are complete idiots and morons. How can anyone be so incredibly stupid and ignorant about this obvious topic?',
      toxicityScore: 0.85,
      moderationStatus: 'flagged',
      moderationReason: 'Toxicity score 0.8500 exceeds publish threshold (0.70), flagged for admin review',
      sentiment: null,
      sentimentScore: null,
      likesCount: 0,
      commentsCount: 0,
    },
  ]);

  // Rejected content (toxicity > 0.90) — synthetic test phrases
  const rejectedPosts = await Post.create([
    {
      author: john._id,
      content: 'I absolutely hate every single person in this group. You are all worthless, disgusting, pathetic losers and I hope terrible things happen to all of you.',
      toxicityScore: 0.95,
      moderationStatus: 'rejected',
      moderationReason: 'Toxicity score 0.9500 exceeds rejection threshold (0.90)',
      sentiment: null,
      sentimentScore: null,
    },
  ]);

  // Admin-approved post
  const approvedPosts = await Post.create([
    {
      author: bob._id,
      content: 'This heated debate about programming languages sometimes gets out of hand. People can be really passionate and aggressive about their favorite stack.',
      toxicityScore: 0.72,
      moderationStatus: 'approved_by_admin',
      moderationReason: 'Approved by admin after review — content discusses aggression but is not itself harmful',
      sentiment: 'neutral',
      sentimentScore: 0.55,
      likesCount: 3,
      commentsCount: 1,
    },
  ]);

  const allPublishedPosts = [...safePosts, ...approvedPosts];
  logger.info(`Created ${safePosts.length + flaggedPosts.length + rejectedPosts.length + approvedPosts.length} posts`);

  // --- Create Moderation Logs ---
  logger.info('Creating moderation logs...');
  const allPosts = [...safePosts, ...flaggedPosts, ...rejectedPosts, ...approvedPosts];
  for (const post of allPosts) {
    await ModerationLog.create({
      post: post._id,
      contentType: 'post',
      model: 'unitary/toxic-bert',
      toxicityScore: post.toxicityScore,
      decision: post.moderationStatus === 'rejected' ? 'reject' :
                post.moderationStatus === 'flagged' ? 'flag' : 'publish',
      moderationStatus: post.moderationStatus,
      reason: post.moderationReason || 'Within safe range',
      source: 'ai_auto',
    });
  }

  // Admin action log for the approved post
  await ModerationLog.create({
    post: approvedPosts[0]._id,
    contentType: 'post',
    model: 'admin',
    toxicityScore: approvedPosts[0].toxicityScore,
    decision: 'publish',
    moderationStatus: 'approved_by_admin',
    reason: 'Content discusses aggression but is not itself harmful',
    adminAction: 'approve',
    adminId: adminUser._id,
    source: 'admin_manual',
  });

  // --- Create Follow Relationships ---
  logger.info('Creating follow relationships...');
  const follows = [
    { user: john._id, targetUser: jane._id },
    { user: john._id, targetUser: alice._id },
    { user: jane._id, targetUser: john._id },
    { user: jane._id, targetUser: bob._id },
    { user: alice._id, targetUser: john._id },
    { user: alice._id, targetUser: jane._id },
    { user: alice._id, targetUser: bob._id },
    { user: bob._id, targetUser: alice._id },
    { user: bob._id, targetUser: john._id },
  ];

  for (const follow of follows) {
    await Interaction.create({ ...follow, type: 'follow' });
    await User.findByIdAndUpdate(follow.user, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(follow.targetUser, { $inc: { followersCount: 1 } });
  }

  // --- Create Likes ---
  logger.info('Creating likes...');
  const likes = [
    { user: jane._id, post: safePosts[0]._id },
    { user: alice._id, post: safePosts[0]._id },
    { user: bob._id, post: safePosts[0]._id },
    { user: john._id, post: safePosts[1]._id },
    { user: alice._id, post: safePosts[1]._id },
    { user: bob._id, post: safePosts[1]._id },
    { user: john._id, post: safePosts[2]._id },
    { user: jane._id, post: safePosts[2]._id },
    { user: bob._id, post: safePosts[2]._id },
    { user: john._id, post: safePosts[6]._id },
    { user: jane._id, post: safePosts[6]._id },
    { user: bob._id, post: safePosts[6]._id },
    { user: alice._id, post: safePosts[8]._id },
    { user: jane._id, post: safePosts[8]._id },
    { user: bob._id, post: safePosts[8]._id },
  ];

  for (const like of likes) {
    await Interaction.create({ ...like, type: 'like' });
  }

  // --- Create Comments ---
  logger.info('Creating comments...');
  const comments = await Comment.create([
    {
      post: safePosts[0]._id,
      author: jane._id,
      content: 'Great work! What dataset did you use for training?',
      moderationStatus: 'published',
      toxicityScore: 0.02,
    },
    {
      post: safePosts[0]._id,
      author: alice._id,
      content: 'Impressive results! Would love to see the code.',
      moderationStatus: 'published',
      toxicityScore: 0.01,
    },
    {
      post: safePosts[1]._id,
      author: john._id,
      content: 'Transformers have completely changed how we approach NLP. Agreed!',
      moderationStatus: 'published',
      toxicityScore: 0.03,
    },
    {
      post: safePosts[2]._id,
      author: bob._id,
      content: 'The intersection of AI and art is fascinating. Keep it up!',
      moderationStatus: 'published',
      toxicityScore: 0.01,
    },
    {
      post: safePosts[8]._id,
      author: jane._id,
      content: 'Congratulations! That is an amazing achievement.',
      moderationStatus: 'published',
      toxicityScore: 0.01,
    },
  ]);

  // Create comment interactions
  for (const comment of comments) {
    await Interaction.create({
      user: comment.author,
      post: comment.post,
      type: 'comment',
    }).catch(() => {}); // ignore duplicates
  }

  // --- Create Notifications ---
  logger.info('Creating notifications...');
  await Notification.create([
    {
      recipient: john._id,
      sender: jane._id,
      type: 'follow',
      message: 'started following you',
    },
    {
      recipient: john._id,
      sender: alice._id,
      type: 'like',
      post: safePosts[0]._id,
      message: 'liked your post',
    },
    {
      recipient: john._id,
      sender: jane._id,
      type: 'comment',
      post: safePosts[0]._id,
      message: 'commented on your post',
    },
    {
      recipient: jane._id,
      sender: john._id,
      type: 'follow',
      message: 'started following you',
    },
    {
      recipient: alice._id,
      sender: bob._id,
      type: 'like',
      post: safePosts[2]._id,
      message: 'liked your post',
    },
    {
      recipient: john._id,
      sender: bob._id,
      type: 'follow',
      message: 'started following you',
      read: true,
    },
  ]);

  logger.info('');
  logger.info('=== SEED COMPLETE ===');
  logger.info(`Users: ${users.length}`);
  logger.info(`Posts: ${allPosts.length} (${safePosts.length} published, ${flaggedPosts.length} flagged, ${rejectedPosts.length} rejected, ${approvedPosts.length} admin-approved)`);
  logger.info(`Comments: ${comments.length}`);
  logger.info(`Follows: ${follows.length}`);
  logger.info(`Likes: ${likes.length}`);
  logger.info('');
  logger.info('Demo Credentials:');
  logger.info('  Admin:  admin@example.com / Admin@123');
  logger.info('  Users:  john@example.com / User@123');
  logger.info('          jane@example.com / User@123');
  logger.info('          alice@example.com / User@123');
  logger.info('          bob@example.com / User@123');
  logger.info('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
