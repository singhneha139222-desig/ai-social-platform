# AI-Driven Social Media Platform

**Intelligent Content Moderation & Recommendation System**

A full-stack social media platform with AI-powered content moderation and personalized recommendations. Built as a Final Year Project demonstrating the practical application of NLP/ML models in content safety and user engagement.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                     │
│                        Port 5173                              │
├──────────────────────────────────────────────────────────────┤
│                   Node.js Express Backend                     │
│                    (API Gateway) Port 5000                    │
├───────────────┬──────────────────────────────────────────────┤
│   MongoDB     │        Python Flask AI Service                │
│  Port 27017   │           Port 5001                           │
│               │   ┌─────────────┬──────────────┐             │
│               │   │ toxic-bert  │ DistilBERT   │             │
│               │   │ (toxicity)  │ (sentiment)  │             │
│               │   └─────────────┴──────────────┘             │
└───────────────┴──────────────────────────────────────────────┘
```

## Features

### AI Components
- **Content Moderation** — BERT-based toxicity detection using `unitary/toxic-bert` with 6 toxicity categories
- **Sentiment Analysis** — 3-class DistilBERT sentiment classifier (`lxyuan/distilbert-base-multilingual-cased-sentiments-student`)
- **Hybrid Recommendation Engine** — 5-component scoring: content similarity, collaborative filtering (Jaccard), engagement, recency decay, sentiment quality

### Platform Features
- User registration & JWT authentication
- Post creation with AI moderation (publish/flag/reject)
- Comment moderation through the same AI pipeline
- Like/unlike posts, follow/unfollow users
- Personalized feed & explore page
- Real-time notification system
- Admin dashboard with moderation queue
- Admin content approval/rejection with audit logging

### Safety
- **Fail-safe moderation** — if AI service is unavailable, content is held as `pending` (never auto-published)
- RBAC with admin role for manual content review
- Rate limiting on authentication and API endpoints
- Input validation on all endpoints

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Axios, Lucide Icons |
| Backend | Node.js, Express 4, Mongoose ODM |
| AI Service | Python 3.11, Flask, PyTorch, HuggingFace Transformers |
| Database | MongoDB 7 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Testing | Jest + Supertest (backend), pytest (AI service) |
| DevOps | Docker, Docker Compose |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+
- MongoDB 7+ (running locally)
- Git

### 1. Clone & Install

```bash
git clone <repository-url>
cd ai-social-platform

# Backend
cd backend
npm install
cp ../.env.example .env
# Edit .env with your values

# AI Service
cd ../services/ai-service
pip install -r requirements.txt

# Frontend
cd ../../frontend
npm install
```

### 2. Start Services

```bash
# Terminal 1 — AI Service (downloads models on first run, ~5 min)
cd services/ai-service
python run.py

# Terminal 2 — Backend
cd backend
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

### 3. Seed Demo Data

```bash
cd backend
npm run seed
```

### Demo Credentials

| Role  | Email              | Password  |
|-------|--------------------|-----------|
| Admin | admin@example.com  | Admin@123 |
| User  | john@example.com   | User@123  |
| User  | jane@example.com   | User@123  |
| User  | alice@example.com  | User@123  |
| User  | bob@example.com    | User@123  |

### 4. Open the App

Navigate to `http://localhost:5173`

---

## Docker Deployment

```bash
docker-compose up --build
```

Access the app at `http://localhost:3000`

---

## AI Models Documentation

### Toxicity Detection

| Property | Value |
|----------|-------|
| Model | `unitary/toxic-bert` |
| Architecture | BERT-base-uncased |
| Dataset | Jigsaw Toxic Comment Classification (~160k comments) |
| Labels | toxic, severe_toxic, obscene, threat, insult, identity_hate |
| Input | Raw text (max 512 tokens) |
| Output | Sigmoid probabilities per label (multi-label) |
| Overall Score | Maximum probability across all 6 categories |
| Preprocessing | BERT WordPiece tokenizer (automatic) |

**Scoring Strategy:**
The overall toxicity score is the `max(probability)` across all 6 toxic categories. This is a conservative approach — if ANY category has high probability, the content is moderated.

**Moderation Thresholds:**

| Score Range | Decision | Action |
|-------------|----------|--------|
| ≤ 0.70 | Publish | Content goes live immediately |
| 0.70 – 0.90 | Flag | Held for admin review |
| > 0.90 | Reject | Automatically rejected |

**Limitations:**
- English-only (trained on English Wikipedia comments)
- May miss coded language, sarcasm, or context-dependent toxicity
- Training data bias from Wikipedia's content patterns

### Sentiment Analysis

| Property | Value |
|----------|-------|
| Model | `lxyuan/distilbert-base-multilingual-cased-sentiments-student` |
| Architecture | DistilBERT (multilingual cased) |
| Training | Knowledge distillation from teacher model |
| Labels | positive, neutral, negative (**native 3-class**) |
| Input | Raw text (max 512 tokens) |
| Output | Softmax probabilities across 3 classes |

**Why this model (not SST-2):**
SST-2 is a binary model (positive/negative). To avoid artificially constructing a "neutral" class via confidence thresholds, we use a genuine 3-class model that directly supports positive, neutral, and negative classification.

**Limitations:**
- Primarily trained on English despite being multilingual
- Knowledge-distilled model trades some accuracy for speed

### Recommendation Engine

The hybrid recommendation engine uses 5 normalized components:

```
score = α·content + β·collaborative + γ·engagement + δ·recency + ε·sentiment
```

| Component | Weight | Method |
|-----------|--------|--------|
| Content (α) | 0.25 | TF-IDF cosine similarity on post content |
| Collaborative (β) | 0.25 | Jaccard similarity between likers of posts the user liked |
| Engagement (γ) | 0.20 | Log-normalized likes + comments count |
| Recency (δ) | 0.20 | Exponential time decay (24h half-life) |
| Sentiment (ε) | 0.10 | Sentiment confidence score (rewards clear sentiment) |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/auth/me` | Get current user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/posts` | Create post (AI moderated) |
| GET | `/api/v1/posts/:id` | Get post by ID |
| DELETE | `/api/v1/posts/:id` | Delete own post |
| POST | `/api/v1/posts/:id/like` | Like a post |
| DELETE | `/api/v1/posts/:id/like` | Unlike a post |
| POST | `/api/v1/posts/:postId/comments` | Add comment (AI moderated) |
| GET | `/api/v1/posts/:postId/comments` | Get comments |

### Feed
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/feed` | Personalized feed |
| GET | `/api/v1/explore` | Discover content |
| GET | `/api/v1/recommendations` | AI recommendations |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/:username` | Get user profile |
| PUT | `/api/v1/users/profile` | Update profile |
| POST | `/api/v1/users/:id/follow` | Follow user |
| DELETE | `/api/v1/users/:id/follow` | Unfollow user |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/stats` | Dashboard statistics |
| GET | `/api/v1/admin/moderation/flagged` | Flagged content queue |
| POST | `/api/v1/admin/moderation/:id/approve` | Approve content |
| POST | `/api/v1/admin/moderation/:id/reject` | Reject content |

---

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### AI Service Tests
```bash
cd services/ai-service
python -m pytest tests/ -v
```

---

## Project Structure

```
ai-social-platform/
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── config/              # Environment & DB config
│   │   ├── controllers/         # Route handlers
│   │   ├── middleware/          # Auth, validation, error handling
│   │   ├── models/              # Mongoose schemas (6 models)
│   │   ├── routes/              # Express routes
│   │   ├── services/            # Business logic
│   │   │   ├── aiService.js           # AI client (HTTP → Flask)
│   │   │   ├── moderationService.js   # Policy engine
│   │   │   ├── recommendationService.js # Hybrid recommender
│   │   │   └── notificationService.js
│   │   ├── utils/               # Logger, pagination, constants
│   │   ├── validators/          # express-validator rules
│   │   └── scripts/seed.js      # Demo data seeder
│   ├── tests/                   # Jest tests
│   └── Dockerfile
├── services/
│   └── ai-service/              # Python Flask AI Service
│       ├── app/
│       │   ├── models/          # ML model wrappers
│       │   │   ├── toxicity.py  # unitary/toxic-bert
│       │   │   └── sentiment.py # 3-class DistilBERT
│       │   └── routes/          # Flask API endpoints
│       ├── tests/               # pytest tests
│       └── Dockerfile
├── frontend/                    # React + Vite
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # Auth & Toast state
│   │   ├── pages/               # Page components (10 pages)
│   │   └── services/api.js      # Axios API client
│   └── Dockerfile
├── docker-compose.yml           # Full stack deployment
└── .env.example                 # Environment template
```

---

## License

This project is developed as a Final Year Project for academic purposes.
