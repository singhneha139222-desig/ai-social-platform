# AI-Driven Social Media Platform

**Intelligent Content Moderation, Real-Time Messaging & Personalized Recommendation System**

A full-stack social media platform with AI-powered content moderation, real-time multimedia chat, and personalized recommendations. Built as a Final Year Project demonstrating the practical application of NLP/ML models in content safety and user engagement.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                     │
│                  Hosted on Vercel (Port 80/443)               │
│        (Features: React Router, Socket.io-client, Axios)      │
├──────────────────────────────────────────────────────────────┤
│               EC2 Cloud Deployment (Dockerized)               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               Node.js Express Backend                  │  │
│  │                (API Gateway) Port 5000                 │  │
│  │ (Features: JWT, SMTP, Socket.io, Cloudinary, Multer)   │  │
│  └───────────────┬────────────────────────┬───────────────┘  │
│                  │                        │                  │
│  ┌───────────────┴──────────┐  ┌──────────┴───────────────┐  │
│  │   MongoDB (Port 27017)   │  │ Python Flask AI Service  │  │
│  │ (Interactions, Messages, │  │       (Port 5001)        │  │
│  │  Users, Posts, Comments) │  │  (Toxicity, Sentiment,   │  │
│  └──────────────────────────┘  │      Bot Detection)      │  │
│                                └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Core Features

### 🤖 AI Capabilities
- **Content Moderation**: BERT-based toxicity detection (`unitary/toxic-bert`) across 6 categories preventing toxic posts and comments.
- **Sentiment Analysis**: 3-class DistilBERT sentiment classifier for assessing post positivity/negativity.
- **Bot Detection**: Advanced ML heuristics checking for bot-like behavior based on engagement rates, posting frequency, and profile metrics.
- **Hybrid Recommendation Engine**: 5-component scoring: content similarity, collaborative filtering (Jaccard), engagement, recency decay, and sentiment quality.

### 💬 Real-Time Messaging
- Fully real-time one-on-one chat using **Socket.io**.
- Send text, custom stickers, **Giant Heart (❤️) animations**, **images**, and **voice notes**.
- Built-in `MediaRecorder` API for sending native voice clips.
- Read receipts, delivered statuses, and live "Typing..." indicators.

### 🌐 Platform Functionality
- **Auth & Security**: JWT-based login + OTP Email Verification (SMTP integration).
- **Post Engagements**: Create posts, leave comments, **Like**, **Save**, and **Share**.
- **Media Management**: Direct scalable image, video, and audio uploading through **Cloudinary**.
- **Privacy Features**: Public/Private account settings ensuring private posts don't leak into the global explore page.
- **Admin Dashboard**: Content moderation queues and bot-detection scanner audits.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, React Router, Socket.io-client, Axios, Lucide Icons |
| **Backend** | Node.js, Express 4, Mongoose ODM, Socket.io, Cloudinary |
| **AI Service** | Python 3.11, Flask, PyTorch, HuggingFace Transformers, scikit-learn |
| **Database** | MongoDB 7 |
| **Auth & Comms**| JWT (jsonwebtoken), bcryptjs, Nodemailer (SMTP OTPs) |
| **DevOps** | Docker, Docker Compose, Vercel (Frontend), EC2 (Backend) |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.10+
- MongoDB 7+ (running locally)
- Cloudinary Account (for media uploads)
- Gmail App Password (for OTP sending via SMTP)

### 1. Clone & Install

```bash
git clone <repository-url>
cd ai-social-platform

# Backend
cd backend
npm install
cp ../.env.example .env
# Edit .env with your MongoDB, Cloudinary, and SMTP values

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
npm run seed:realistic # Generates 50 realistic users + posts + interactions
```

### 4. Open the App
Navigate to `http://localhost:5173`

---

## Production Deployment (Split Architecture)

The system is designed to be split across a global CDN (Vercel) for the React frontend, and a persistent compute instance (e.g., AWS EC2) for the APIs.

### Backend & AI Service (EC2)
The root `docker-compose.yml` is configured strictly for backend infrastructure.

1. Clone the repo on your server.
2. Setup your `.env` with production keys (JWT_SECRET, CLOUDINARY, SMTP, CLIENT_URL=https://your-frontend.vercel.app).
3. Run docker compose:
```bash
docker-compose up -d --build
```

### Frontend (Vercel)
1. Import the project into Vercel and set the root directory to `frontend`.
2. Add the environment variable `VITE_API_URL` pointing to your EC2 instance (e.g. `http://<ec2-ip>:5000/api/v1`).
3. Deploy! Client-side routing is automatically handled via the included `vercel.json`.

---

## API & Socket Events Reference

### Core API Endpoints
- **Auth:** `POST /api/v1/auth/register` (w/ OTP), `POST /api/v1/auth/login`
- **Posts:** `POST /api/v1/posts` (AI moderated), `POST /api/v1/posts/:id/save`, `POST /api/v1/posts/:id/share`
- **Messages:** `GET /api/v1/messages/conversations`, `POST /api/v1/messages/conversations/:id/messages`
- **Media:** `POST /api/v1/media/upload` (Supports images/audio/video via Cloudinary)
- **Admin:** `GET /api/v1/admin/moderation/flagged`, `POST /api/v1/admin/bot-detection/:userId/scan`

### Socket.io Events
- `message:new` / `message:delivered` / `message:read`
- `typing:start` / `typing:stop`
- `user:online` / `user:offline`

---

## License

This project is developed as a Final Year Project for academic purposes.
