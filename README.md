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

- [x] **Phase 1: Foundation**
  - Monorepo setup with npm workspaces, strict TypeScript, ESLint, Prettier
  - Docker Compose setup (PostgreSQL 16 + pgvector on port 5433, Redis on port 6379)
  - Layered Express backend architecture (`route → controller → service → repository`)
  - Authentication (JWT 15m access + 7d refresh token rotation in Redis, bcrypt hashing)
  - Google OAuth 2.0 flow with graceful credential detection
  - Workspace management (create workspace, auto-slugification, list user workspaces)
  - Workspace invitations (secure token hash, 7-day expiration, email console logger)
  - Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`)
  - React SPA with dark mode UI, protected routing, login, register, workspace selector, members page, and responsive sidebar navigation
- [x] **Phase 2: Projects & Tasks (Current)**
  - Project CRUD with unique project keys (e.g. `WEB`, `CORE`), start/target dates, and status
  - Task CRUD with sequential auto-incrementing numbers per project (`WEB-1`, `WEB-2`), rich descriptions, priorities, statuses
  - Dynamic Kanban Board with drag-and-drop status transitions (`@dnd-kit`)
  - List View with quick status completion toggle and filtering (search, status, priority, assignee)
  - "My Tasks" view aggregating all assigned tasks across workspace projects
  - Full Task Detail Drawer: inline property editing, subtasks checklist, subscriber management, and file attachments
  - In-app notification engine notifying subscribers whenever a task status, deadline, or assignee is updated
  - Complete audit log tracking on every project and task mutation (`PROJECT_CREATED`, `TASK_CREATED`, `TASK_STATUS_CHANGED`, `TASK_UPDATED`, `TASK_ATTACHMENT_ADDED`)
- [x] **Phase 3: Dependency Graph**
  - Directed Acyclic Graph (DAG) dependency modeling (`taskId` depends on `dependsOnTaskId`)
  - Cycle detection using recursive Depth-First Search (DFS); circular dependencies rejected with `400 CYCLE_DETECTED`
  - Auto-blocking logic: newly created dependencies transition incomplete dependent tasks to `BLOCKED` status
  - Auto-unblocking engine: completing a prerequisite task or deleting a dependency automatically clears blockers and returns tasks to `TODO`
  - Critical Path Method (CPM) using Kahn's topological sort and dynamic programming longest-path calculation
  - Interactive React Flow DAG canvas (`@xyflow/react`) with custom task nodes, animated critical path connectors, and minimap
  - Drag-and-drop edge creation with live cycle rejection feedback toasts
  - In-drawer dependency management with "+ Add Blocker" selector and blocker removal controls
- [x] **Phase 4: Realtime**
  - Socket.IO cluster infrastructure with `@socket.io/redis-adapter` for multi-instance scaling
  - JWT handshake authentication middleware validating tokens before allocating socket resources
  - Workspace room management & authorization: `workspace:{id}`, `project:{id}`, `task:{id}`
  - Redis-backed live presence engine (`presence:workspace:{id}` with rolling heartbeat and auto-pruning)
  - Active task detail viewers stack (`viewers:task:{id}`) showing teammate avatars in drawer in real-time
  - Real-time typing indicators (`task:user_typing`) with auto-clearing debounce
  - Real-time comments feed with optimistic updates, `@mentions` extraction, and in-app notifications
  - Live comment delivery benchmarked at **69ms** (far exceeding the <300ms blueprint target)
  - Live Kanban and dependency graph updates broadcasted on task mutations without page reload
- [x] **Phase 5: Calendar, Meetings & Audio Intelligence**
  - Unified Calendar Feed aggregating internal meetings, task deadlines, and calendar events
  - Team free/busy slot detection calculating open non-conflicting 30-min windows across team working hours
  - Meetings CRUD with attendee invitations, Google Meet URLs, and RSVP state tracking (`ACCEPTED`, `DECLINED`)
  - Audio recording & AI transcription pipeline with speaker diarization timestamps
  - Automated AI summary generation and action item extraction
  - 1-click action item to TeamOS task conversion creating assigned project tickets with priorities and due dates
  - Interactive Team Calendar UI (Month, Week, Day views) and Meeting Details page with audio player & transcript timeline

- [x] **Phase 6: Docs, GitHub Activity & Hybrid Search**
  - TipTap/Markdown document engine with live split-screen preview and debounced auto-saving
  - GitHub Webhook integration (`POST /api/v1/webhooks/github`) with HMAC-SHA256 signature verification
  - Task key regex parser (`[A-Z0-9]+-\d+`) linking commits and pull requests to TeamOS tickets
  - Automated PR merge resolution: PRs with `fixes KEY-1` automatically mark tasks `DONE` and post a celebratory audit comment
  - Hybrid Search Engine combining PostgreSQL Full-Text Search with pgvector semantic similarity using Reciprocal Rank Fusion (RRF)
  - Global `Cmd+K` / `Ctrl+K` Spotlight Search palette with instant keyboard navigation across tasks, docs, and meetings

- [x] **Phase 7: AI Agent & Risk Engine (Human-in-the-Loop)**
  - Autonomous Read Tools: `searchWorkspace`, `getMyAgenda`, `getProjectStatus`, `summarizeMeeting`, `detectRisks`
  - Risk Engine detecting:
    1. `OVERDUE_CHAIN`: Overdue tasks actively blocking downstream tasks
    2. `BLOCKED_CRITICAL_PATH`: Blocked tasks lying directly on the project critical path
    3. `OVERLOADED_ASSIGNEE`: Assignees with 4+ urgent tasks due within 7 days
    4. `STALE_TASK`: In-progress tasks untouched for >7 days
  - Write Tools requiring explicit human approval: `createTask`, `updateTask`, `assignTask`, `addComment`, `scheduleMeeting`
  - Interactive Approval Cards with before/after state diffs and 1-click Approve / Reject buttons
  - Floating AI Assistant drawer accessible across the entire application
  - Full audit logging with `actorType: AI_AGENT` tracking approved agent executions

- [x] **Phase 8: Scale, Polish, Enterprise Seeding & Benchmarks**
  - Enterprise baseline seed (`apps/api/prisma/seed.ts`): 100+ tasks, 5 projects, DAG dependencies, audio transcripts, docs, and git activities
  - **100K+ Large Enterprise Scale Seeder** (`npm run seed:large`):
    - **123,405 total objects** generated and inserted in **18.78 seconds**
    - 200 users, 5 workspaces, 1,000 memberships, 50 projects, 40,000 tasks, 9,950 DAG dependencies (acyclic), 40,000 comments, 500 docs, 100 meetings, 100 transcripts, 9,500 transcript segments, 12,000 audit logs, and 10,000 pgvector embeddings
  - Measured Autocannon performance suite (`scripts/loadtest/benchmarks.mjs`):
    - **Health Check**: 2,561 req/sec (7.3ms avg, 32ms p99)
    - **Project Tasks Query**: 5,503 req/sec (2.2ms avg, 9ms p99)
    - **Unified Calendar Feed**: 5,240 req/sec (2.3ms avg, 12ms p99)
    - **Hybrid RRF Search**: 5,900 req/sec (1.3ms avg, 5ms p99)
    - **Total Requests Measured**: 96,002 requests with 0 errors (100% success rate)
  - Detailed benchmarks documentation: [`docs/benchmarks.md`](docs/benchmarks.md)
  - Architecture decisions log: [`docs/decisions.md`](docs/decisions.md)
  - **AI Safety & Tool-Routing Evals** (`apps/api/src/modules/ai/__evals__/ai.eval.ts`):
    - 15 comprehensive evaluation test scenarios
    - 93.3% tool-routing accuracy
    - **100% of write intents gated behind human approval cards**

---

## 🐳 Production Deployment (Docker Compose)

TeamOS is containerized with multi-stage production builds for both backend API (`node:20-alpine`, non-root user) and web frontend (`nginx:1.27-alpine` with Gzip compression and reverse proxying).

```bash
# Build production images for all services
npm run docker:prod:build

# Launch production stack (PostgreSQL + pgvector, Redis, API, and Web Nginx)
npm run docker:prod:up

# Check container health and logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# Teardown production stack
npm run docker:prod:down
```

---

## 🔄 CI/CD Pipeline

Automated GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

1. **Code Quality & Typecheck**: ESLint, Prettier format verification, Prisma client generation, TypeScript compilation across all monorepo workspaces (`@teamos/shared`, `@teamos/api`, `@teamos/web`).
2. **Database Migrations & Integration Evals**: Ephemeral PostgreSQL 16 (`pgvector`) & Redis 7 services, Prisma schema synchronization, database seed verification, and automated AI tool-routing safety evaluations.
3. **Container Build Verification**: Multi-stage Docker builds for API and Web images.
