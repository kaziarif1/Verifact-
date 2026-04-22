# Verifact

> **Truth, Verified by the Crowd and the Machine.**

AI-powered rumor detection and fact-checking social platform. Users post claims, the community votes (weighted by trust score), an ML model classifies the text, and an admin delivers the final verdict.

---

## Architecture

```
React SPA (Vite)
      │ HTTPS / WSS
   Nginx (reverse proxy + SSL)
      │
Node.js / Express API  ──────────────►  Python FastAPI ML Service
      │                                       (RoBERTa / TF-IDF)
      ├── MongoDB Atlas    (primary data)
      ├── Redis / Upstash  (cache, queues, sessions)
      └── Cloudinary       (image & video CDN)
```

**Three-layer verdict system:**
1. **Community vote** — weighted by each voter's trust score
2. **ML prediction** — NLP classifier (FACT / RUMOR / UNCERTAIN + confidence)
3. **Admin decision** — final human-in-the-loop verdict → sets `finalVerdict`

---

## Project Structure

```
verifact/
├── backend/           Node.js + Express + TypeScript API
├── frontend/          React 18 + Vite + TypeScript SPA  (Phase 4)
├── ml-service/        Python 3.11 + FastAPI NLP service
├── docker-compose.yml Local development (all services)
├── nginx.conf         Production reverse proxy config
└── .github/workflows/ CI/CD pipeline (GitHub Actions)
```

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker 24+ and Docker Compose v2
- Node.js 20 LTS (for local backend dev without Docker)
- Python 3.11 (for local ML dev without Docker)

### 1. Clone & configure environment

```bash
git clone https://github.com/your-username/verifact.git
cd verifact

# Copy and fill in environment variables
cp backend/.env.example backend/.env
```

**Required variables in `backend/.env`:**

```bash
# Generate RSA key pair for JWT (RS256):
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
echo "JWT_PRIVATE_KEY_BASE64=$(base64 -w 0 private.pem)" >> backend/.env
echo "JWT_PUBLIC_KEY_BASE64=$(base64 -w 0 public.pem)" >> backend/.env
rm private.pem public.pem

# Fill in these manually:
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
# ML_INTERNAL_KEY (any random string, e.g. openssl rand -hex 32)
```

### 2. Start all services

```bash
docker-compose up --build
```

| Service       | URL                          |
|---------------|------------------------------|
| API           | http://localhost:5000        |
| API Docs      | http://localhost:5000/api-docs |
| ML Service    | http://localhost:8000/docs   |
| MongoDB       | mongodb://localhost:27017    |
| Redis         | redis://localhost:6379       |

### 3. Seed admin user (first run)

```bash
# Connect to MongoDB and create an admin user manually, or run:
docker exec -it verifact_api node -e "
  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const hash = await bcrypt.hash('Admin123!', 12);
    await mongoose.connection.db.collection('users').insertOne({
      email: 'admin@verifact.app',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: hash,
      role: 'admin',
      isEmailVerified: true,
      isBanned: false,
      trustScore: { current: 100, history: [], totalVotesCast: 0, correctVotes: 0, incorrectVotes: 0, pendingVotes: 0, lastCalculatedAt: new Date() },
      stats: { totalClaims: 0, factsPosted: 0, rumorsPosted: 0 },
      createdAt: new Date(), updatedAt: new Date()
    });
    console.log('Admin created: admin@verifact.app / Admin123!');
    process.exit(0);
  });
"
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
npm install
cp .env.example .env    # Fill in variables
npm run dev             # Starts on :5000 with hot reload
```

### ML Service

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# (Optional) Train fallback model first:
python -m app.training.train_classical

# Start service:
uvicorn app.main:app --reload --port 8000
```

---

## API Reference

Full interactive docs at **http://localhost:5000/api-docs** (Swagger UI).

### Key endpoints

| Method | Endpoint                            | Auth     | Description                    |
|--------|-------------------------------------|----------|--------------------------------|
| POST   | `/api/v1/auth/register`             | —        | Register new user              |
| POST   | `/api/v1/auth/login`                | —        | Login, returns JWT             |
| POST   | `/api/v1/auth/refresh`              | Cookie   | Refresh access token           |
| GET    | `/api/v1/claims`                    | Optional | Get claims feed                |
| POST   | `/api/v1/claims`                    | ✅        | Submit new claim               |
| GET    | `/api/v1/claims/:id`                | Optional | Get single claim               |
| POST   | `/api/v1/claims/:id/vote`           | ✅        | Cast/update vote               |
| GET    | `/api/v1/claims/trending/facts`     | —        | Trending facts                 |
| GET    | `/api/v1/claims/trending/rumors`    | —        | Trending rumors                |
| GET    | `/api/v1/search?q=`                 | Optional | Full-text search               |
| GET    | `/api/v1/users/:username`           | —        | Public profile                 |
| PUT    | `/api/v1/users/me`                  | ✅        | Update profile                 |
| GET    | `/api/v1/notifications`             | ✅        | Get notifications              |
| PATCH  | `/api/v1/admin/claims/:id/verdict`  | Admin    | Set Fact / Rumor verdict       |
| GET    | `/api/v1/admin/dashboard`           | Admin    | Dashboard statistics           |
| GET    | `/api/v1/admin/users`               | Admin    | List & search users            |
| PATCH  | `/api/v1/admin/users/:id/verify`    | Admin    | Promote user to Verified       |

---

## Trust Score Algorithm

Every user starts at **50**. Score moves toward 100 when votes match admin verdicts, toward 0 when they don't. Bayesian smoothing prevents new users from spiking on a single vote.

```
accuracy        = correct_votes / total_resolved   (or 0.5 if none)
weight          = total_resolved / (total_resolved + 20)
weightedAccuracy = accuracy × weight + 0.5 × (1 − weight)
trustScore      = clamp(weightedAccuracy × 100, 0, 100)
```

Users with `trustScore ≥ 75` and `≥ 20 resolved votes` are flagged as **Verification Candidates** for admin review.

---

## Running Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Backend with coverage report
cd backend && npm run test:coverage

# ML service tests
cd ml-service && pytest tests/ -v
```

---

## Tech Stack

| Layer         | Technology                                            |
|---------------|-------------------------------------------------------|
| Backend       | Node.js 20, Express 4, TypeScript 5, Mongoose 8       |
| Real-time     | Socket.io 4 (WebSocket + polling fallback)            |
| Queue         | BullMQ 5 (Redis-backed async jobs)                    |
| Auth          | JWT RS256 (15m access) + Refresh tokens in Redis      |
| Database      | MongoDB 7 / Atlas                                     |
| Cache         | Redis 7 / Upstash                                     |
| Media         | Cloudinary (upload, transform, CDN)                   |
| ML Service    | Python 3.11, FastAPI, RoBERTa, scikit-learn           |
| Frontend      | React 18, Vite 5, TypeScript, Tailwind, Framer Motion |
| State         | Zustand + TanStack Query v5                           |
| CI/CD         | GitHub Actions → Docker → Railway/DigitalOcean        |

---

## Development Phases

- ✅ **Phase 0** — Planning & Requirements
- ✅ **Phase 1** — System Design & Architecture
- ✅ **Phase 2** — Backend Development ← *you are here*
- ⬜ **Phase 3** — ML Microservice (training in progress)
- ⬜ **Phase 4** — Frontend Development
- ⬜ **Phase 5** — Integration & Real-time
- ⬜ **Phase 6** — Testing
- ⬜ **Phase 7** — Deployment

---

## License

MIT © Verifact Team

---

## Phase 3 — ML Microservice (Complete)

### What's inside `ml-service/`

| Sprint | Deliverable | Location |
|--------|-------------|----------|
| 3.1 | FastAPI app setup, __init__.py, project structure | `app/main.py`, `app/__init__.py`, etc. |
| 3.2 | Data pipeline: LIAR, FakeNewsNet, COVID, FEVER | `app/data/preprocessing.py`, `app/data/datasets.py` |
| 3.3 | RoBERTa fine-tune script + TF-IDF+LR fallback | `app/training/train_transformer.py`, `app/training/train_classical.py` |
| 3.4 | FastAPI endpoints + rate limiting + auth | `app/api/routes.py`, `app/models/schemas.py`, `app/models/classifier.py` |
| 3.5 | Evaluation, confusion matrix, bias tests | `evaluation/evaluate.py` |

### Quick Start (ML Service)

```bash
cd ml-service

# Install
pip install -r requirements.txt

# Data prep (downloads LIAR + COVID datasets automatically)
python -m app.data.preprocessing

# Train fallback model (CPU, ~1 min)
python -m app.training.train_classical

# Train transformer (GPU recommended — use Google Colab)
python -m app.training.train_transformer

# Evaluate both models
python -m evaluation.evaluate --model both

# Run tests
pytest tests/ -v

# Start server
uvicorn app.main:app --reload --port 8000
```

### Phase 2 Bug Fixes Applied

| # | File | Bug Fixed |
|---|------|-----------|
| 1 | `backend/src/shared/middleware/uploadHandler.ts` | Upload dir never created — multer crash on first file |
| 2 | `backend/src/modules/votes/vote.service.ts` | `pendingVotes` could go negative when toggling vote off |
| 3 | `backend/src/modules/votes/vote.service.ts` | `userRole` snapshot not updated when vote direction changed |
| 4 | `backend/src/modules/notifications/notification.service.ts` | Cursor filter used raw string instead of ObjectId |
| 5 | `backend/src/workers/trust.worker.ts` | `pendingVotes` decremented by 1 regardless of batch size |
| 6 | `backend/src/modules/users/user.service.ts` | Cloudinary `publicId` extracted incorrectly on avatar update |
