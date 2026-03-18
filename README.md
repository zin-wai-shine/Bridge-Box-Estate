# BriBox — AI-Powered Real Estate Bridge

> Intelligent property finding, listing, and management through a single chat interface.

![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css&logoColor=white)

## Architecture

**Backend:** Go + Gin Framework + GORM + PostgreSQL
**Frontend:** React + Vite + Tailwind CSS v4 + Framer Motion
**Security:** JWT Auth, AES-256 Encryption, Rate Limiting, CORS

```
bribox/
├── backend/              # Go API server
│   ├── cmd/briboxd/      # Entry point
│   └── internal/         # Core packages
│       ├── auth/         # JWT + middleware
│       ├── config/       # Env config
│       ├── database/     # GORM + migrations
│       ├── handlers/     # API handlers
│       ├── models/       # Data models
│       ├── services/     # AI services
│       └── utils/        # Encryption
├── frontend/             # React SPA
│   └── src/
│       ├── pages/        # Login, Register, Chat, Admin
│       ├── services/     # API client
│       └── components/   # Reusable UI
├── docker-compose.yml
└── Dockerfile
```

## Quick Start

### Prerequisites

- Go 1.22+
- Node.js 18+
- PostgreSQL 16 (or Docker)

### Option 1: Docker (Recommended)

```bash
docker-compose up
```

Backend: http://localhost:8080
Frontend: http://localhost:5173

### Option 2: Local Development

**1. Start PostgreSQL**

```bash
# Using Docker for just the database:
docker run -d --name bribox-pg \
  -e POSTGRES_USER=bribox \
  -e POSTGRES_PASSWORD=bribox_secret \
  -e POSTGRES_DB=bribox_db \
  -p 5432:5432 \
  postgres:16-alpine
```

**2. Start Backend**

```bash
cd backend
cp .env.example .env  # Edit as needed
go run cmd/briboxd/main.go
```

**3. Start Frontend**

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/register` | Create account |
| POST | `/api/v1/login` | Login (returns JWT) |
| GET | `/health` | Health check |

### Authenticated (JWT Required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/chat` | Send chat message |
| GET | `/api/v1/chat/history` | Get chat history |

### Agent/Admin Only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/stats` | Dashboard metrics |
| GET | `/api/v1/admin/listings/drafts` | Draft listings |
| GET | `/api/v1/admin/listings/active` | Active listings |
| PUT | `/api/v1/admin/property/:id` | Update property |
| POST | `/api/v1/admin/property/:id/approve` | Approve listing |
| DELETE | `/api/v1/admin/property/:id` | Delete listing |
| GET | `/api/v1/admin/permissions` | Permission requests |
| POST | `/api/v1/admin/permission/:id/approve` | Approve permission |
| POST | `/api/v1/admin/permission/:id/deny` | Deny permission |
| POST | `/api/v1/bridge/scrape` | Scrape property URL |

## Easy Repair Guide

### Updating Scraper Logic
Edit `backend/internal/services/scraper/scraper.go`. The `ScrapeURL` method handles fetching; update CSS selectors or parsing logic when target websites change.

### Updating AI Model Configuration
- **LLM Parser:** `backend/internal/services/llm_parser/llm_parser.go` — Update the OpenAI API prompt in `parseWithOpenAI()`
- **Image AI:** `backend/internal/services/image_ai/image_ai.go` — Swap the API endpoint in `enhanceWithAPI()`
- **API Keys:** Update `.env` with `OPENAI_API_KEY` and `IMAGE_AI_API_KEY`

### Adding New Social Media Platforms
Edit `backend/internal/services/poster/poster.go` — Add new methods following the pattern of `postToFacebook()`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `bribox` | Database user |
| `DB_PASSWORD` | `bribox_secret` | Database password |
| `DB_NAME` | `bribox_db` | Database name |
| `SERVER_PORT` | `8080` | Backend port |
| `JWT_SECRET` | (default) | JWT signing key (change in prod!) |
| `ENCRYPTION_KEY` | (default) | AES-256 key (exactly 32 bytes) |
| `ALLOW_ORIGINS` | `http://localhost:5173` | CORS allowed origins |
| `OPENAI_API_KEY` | (empty) | OpenAI API key for LLM parsing |
| `IMAGE_AI_API_KEY` | (empty) | Image enhancement API key |

## License

Private — BriBox © 2026
