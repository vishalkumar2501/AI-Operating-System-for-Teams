# TeamOS — AI Operating System for Teams

> A unified team workspace connecting projects, tasks, meetings, docs, calendar, and code activity — powered by an AI agent that surfaces project risks and executes write actions only after human approval.

---

## 🛠️ Tech Stack

### Frontend (`apps/web`)

- **React 18 + Vite + TypeScript (Strict Mode)**
- **Tailwind CSS** (dark Linear/Lark aesthetic) + accessible custom UI components
- **TanStack Query v5** (server state, caching, optimistic updates)
- **Zustand** (client UI state & session management)
- **React Router v6** + **React Hook Form + Zod**
- **Lucide React** (icons)

### Backend (`apps/api`)

- **Node.js + Express + TypeScript (Strict Mode)**
- **PostgreSQL 16** with **pgvector** extension (relations + vector search)
- **Prisma ORM**
- **Redis 7** (caching, refresh token tracking, BullMQ background queues)
- **Zod** (strict runtime validation for every request body/query)
- **Pino** (high-performance structured JSON logging with request-ID tracking)
- **Helmet, CORS whitelist, express-rate-limit**

### Monorepo Structure

- `apps/api`: Express API server (layered: `routes → controllers → services → repositories`)
- `apps/web`: React SPA application
- `packages/shared`: Shared TypeScript types, enums, and Zod schemas

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js >= 20
- Docker Desktop with Docker Compose

### 1. Clone & Setup Environment

```cmd
git clone https://github.com/vishalkumar2501/AI-Operating-System-for-Teams.git
cd 04_TeamOS_FULL-STACK
copy .env.example .env
```

_(Configure secrets in `.env` as needed. All defaults are pre-configured for local Docker)_

### 2. Start PostgreSQL (with pgvector) and Redis

```cmd
npm run docker:up
```

### 3. Install Dependencies

```cmd
npm install
```

### 4. Push Database Schema

```cmd
npm run prisma:generate --workspace=@teamos/api
npm run prisma:migrate --workspace=@teamos/api
```

### 5. Start Development Servers

```cmd
:: Start both backend (port 5000) and frontend (port 5173):
npm run dev

:: Or run individually:
npm run dev:api
npm run dev:web
```

- API Base: `http://localhost:5000/api/v1`
- API Health Check: `http://localhost:5000/api/v1/health`
- Web Application: `http://localhost:5173`

---

## 📦 Phase Status & Roadmap

- [x] **Phase 1: Foundation (Current)**
  - Monorepo setup with npm workspaces, strict TypeScript, ESLint, Prettier
  - Docker Compose setup (PostgreSQL 16 + pgvector on port 5433, Redis on port 6379)
  - Layered Express backend architecture (`route → controller → service → repository`)
  - Authentication (JWT 15m access + 7d refresh token rotation in Redis, bcrypt hashing)
  - Google OAuth 2.0 flow with graceful credential detection
  - Workspace management (create workspace, auto-slugification, list user workspaces)
  - Workspace invitations (secure token hash, 7-day expiration, email console logger)
  - Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`)
  - React SPA with dark mode UI, protected routing, login, register, workspace selector, members page, and responsive sidebar navigation
- [ ] **Phase 2: Projects & Tasks** (Kanban board, List view, task detail drawer, rich text, attachments)
- [ ] **Phase 3: Dependency Graph** (Cycle detection, React Flow DAG, critical path analysis)
- [ ] **Phase 4: Realtime** (Socket.IO + Redis adapter, live presence, typing indicators, realtime comments)
- [ ] **Phase 5: Calendar, Meetings & Transcripts** (Meeting audio pipeline, Whisper transcription, Google Calendar sync)
- [ ] **Phase 6: Docs, GitHub Activity & Hybrid Search** (TipTap docs, GitHub webhooks, pgvector + full-text RRF search)
- [ ] **Phase 7: AI Agent & Risk Engine** (Read tools, risk detection rules, human-in-the-loop approval cards, audit trail)
- [ ] **Phase 8: Scale & Production Polish** (100K+ object seed script, k6/autocannon benchmarks, caching, CI/CD, deployment)
