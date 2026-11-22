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
- [ ] **Phase 5: Calendar, Meetings & Transcripts** (Meeting audio pipeline, Whisper transcription, Google Calendar sync)
- [ ] **Phase 6: Docs, GitHub Activity & Hybrid Search** (TipTap docs, GitHub webhooks, pgvector + full-text RRF search)
- [ ] **Phase 7: AI Agent & Risk Engine** (Read tools, risk detection rules, human-in-the-loop approval cards, audit trail)
- [ ] **Phase 8: Scale & Production Polish** (100K+ object seed script, k6/autocannon benchmarks, caching, CI/CD, deployment)
