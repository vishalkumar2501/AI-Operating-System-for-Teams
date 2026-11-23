# TeamOS — AI Operating System for Teams

> Ek team workspace jo **projects, tasks, meetings, docs, calendar aur code activity** ko ek jagah connect karta hai, aur AI samajhta hai ki kya chal raha hai, **risk dikhata hai**, aur **approval ke baad action leta hai**.
> (Jira + Lark/Notion jaisa, lekin AI-native. Naam kuch bhi rakh sakte ho.)

Yeh file AI coding agent ke liye **single source of truth** hai. Agent ko is file ke order mein kaam karna hai, phase by phase.

---

## 0. AGENT KE LIYE RULES (sabse pehle padho)

1. **Phase by phase build karo.** Ek phase pura chalega, test hoga, commit hoga — tabhi agle phase pe jao.
2. **Vibe-coded nahi, humanized code likho.**
   - Meaningful naam (`assignTaskToUser`, not `handleData2`).
   - Chhote functions, ek function = ek kaam.
   - Jahan logic non-obvious ho wahin comment likho ("kyun" batao, "kya" nahi).
   - Koi copy-paste duplicate code nahi; shared logic `utils/` ya `services/` mein.
   - Consistent folder structure, consistent error handling.
   - Dead code, `console.log` spam, aur TODO-dumps nahi.
3. **TypeScript strict mode** har jagah (frontend + backend).
4. **Har API input Zod se validate ho.** Kabhi bhi `req.body` direct trust mat karo.
5. **Layered architecture:** `route → controller → service → repository`. Controller mein business logic nahi.
6. **Har important action ka audit log** ho (kisne, kya, kab, kis object pe, before/after).
7. **AI kabhi bina approval ke destructive/write action nahi karega.** (Section 9)
8. **Secrets `.env` mein.** `.env.example` repo mein ho. Kuch bhi hardcode nahi.
9. **Har phase ke end mein:** tests pass, lint clean, README update, ek meaningful commit message (Conventional Commits: `feat:`, `fix:`, `refactor:`).
10. Jab kisi cheez ke liye 2 options hon, **simple wala choose karo** aur `docs/decisions.md` mein ek line likho kyun.

---

## 1. Product Vision

**Problem:** Teams ka kaam 5-6 tools mein bikhra hota hai (tickets, chat, calendar, docs, GitHub, meetings). Kisi ko poori picture nahi dikhti.

**Solution:** Ek workspace jahan sab connected hai, aur AI:

- Roz ka summary deta hai ("aaj tumhare 4 tasks, 2 overdue").
- Meeting transcript se **action items nikaal kar tasks banata hai** (approval ke baad).
- Project ke **risk detect** karta hai (blocked dependencies, overdue chain, overloaded member).
- Natural language mein search / sawaal ka jawab deta hai ("is week kya ship hoga?").

**Target users:** Engineering/product teams (5–200 log).

---

## 2. Success Metrics (resume ke liye numbers)

| Metric                                                         | Target         |
| -------------------------------------------------------------- | -------------- |
| Workspace objects indexed (tasks, comments, docs, transcripts) | **100K+**      |
| Search / list API p95 latency                                  | **< 1 second** |
| Realtime event delivery (comment, presence)                    | **< 300 ms**   |
| AI agent actions with audit trail                              | **100%**       |
| AI write-actions requiring human approval                      | **100%**       |
| Test coverage (services layer)                                 | **70%+**       |

Yeh numbers **seed script + k6/autocannon load test** se actually measure karke README mein screenshot/table ke saath dikhane hain. Bina measure kiye claim mat karo.

---

## 3. Tech Stack

### Frontend

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** + **shadcn/ui** (clean, professional UI)
- **TanStack Query** (server state), **Zustand** (UI state)
- **React Router**, **React Hook Form + Zod**
- **React Flow** (task dependency graph)
- **FullCalendar** (calendar view)
- **Socket.IO client** (realtime)
- **dnd-kit** (kanban drag & drop)

### Backend

- **Node.js + Express + TypeScript**
- **PostgreSQL** (primary DB) + **pgvector** extension (vector search)
  - _Note:_ MERN comfort ke liye MongoDB bhi chalega, but Postgres better hai kyunki relations (task dependencies, RBAC) + pgvector ek hi DB mein mil jata hai. Is project mein **Postgres + Prisma** default hai.
- **Prisma ORM**
- **Redis** — caching, presence, rate limiting, pub/sub, BullMQ backend
- **BullMQ** — background queues (embeddings, notifications, AI jobs, email sync)
- **Socket.IO** (+ Redis adapter for horizontal scaling)
- **Zod** (validation), **Pino** (logging), **Helmet, CORS, express-rate-limit**

### Auth

- **JWT access token (15 min) + refresh token (httpOnly cookie, rotation)**
- **Google OAuth** (login + Calendar/Gmail connect)
- **RBAC:** `OWNER`, `ADMIN`, `MEMBER`, `GUEST`
- **Workspace invite flow** — sirf invited/authorized user hi join kar sakta hai

### AI

- **LLM provider-agnostic interface** (`LLMProvider`): Anthropic Claude / OpenAI / Gemini — env se switch ho.
- **Embeddings** + **pgvector** semantic search
- **Tool-calling agent** (structured JSON, Zod-validated tool inputs)
- **Meeting transcription:** Whisper API (ya browser Web Speech API for demo)

### DevOps / Quality

- **Docker + docker-compose** (api, web, postgres, redis)
- **GitHub Actions** CI (lint, typecheck, test, build)
- **Vitest / Jest + Supertest** (backend tests), **Playwright** (1–2 e2e flows)
- **ESLint + Prettier + Husky + lint-staged**
- **Swagger/OpenAPI** docs (`/api/docs`)
- Deploy: **Frontend → Vercel**, **Backend → Render/Railway/Fly.io**, **DB → Neon/Supabase**, **Redis → Upstash**

---

## 4. High-Level Architecture

```
┌────────────┐   HTTPS/REST    ┌──────────────────────┐
│  React App │ ◄─────────────► │  Express API (Node)  │
│  (Vite)    │   WebSocket     │  routes→svc→repo     │
└────────────┘ ◄─────────────► │  Socket.IO server    │
                               └───┬─────────┬────────┘
                                   │         │
                      ┌────────────▼──┐  ┌───▼──────────┐
                      │ PostgreSQL     │  │ Redis        │
                      │ + pgvector     │  │ cache/presence│
                      └───────▲────────┘  │ pubsub/queues│
                              │           └───┬──────────┘
                      ┌───────┴───────────────▼──────┐
                      │ BullMQ Workers                │
                      │ embeddings | ai-jobs | notif  │
                      │ transcript | email-sync       │
                      └───────────────┬───────────────┘
                                      │
                              ┌───────▼────────┐
                              │ LLM / Whisper  │
                              └────────────────┘
```

**Key flows**

- **Write path:** API → DB transaction → audit log → emit event → (queue: embed + notify) → websocket broadcast.
- **Read path:** API → Redis cache check → DB (indexed query) → cache set.
- **AI path:** user prompt → retrieve context (SQL + vector search) → LLM → proposed action → **approval card** → user approve → execute → audit.

---

## 5. Folder Structure (monorepo)

```
teamos/
├── apps/
│   ├── web/                      # React frontend
│   │   └── src/
│   │       ├── app/              # router, providers
│   │       ├── components/ui/    # shadcn components
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── workspace/
│   │       │   ├── projects/
│   │       │   ├── tasks/        # board, list, detail drawer
│   │       │   ├── dependency-graph/
│   │       │   ├── comments/
│   │       │   ├── presence/
│   │       │   ├── calendar/
│   │       │   ├── meetings/
│   │       │   ├── docs/
│   │       │   ├── ai-assistant/
│   │       │   ├── notifications/
│   │       │   └── search/
│   │       ├── lib/              # api client, socket client, utils
│   │       └── hooks/
│   └── api/                      # Node backend
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts           # 100K+ objects seeder
│       └── src/
│           ├── config/           # env, constants
│           ├── middleware/       # auth, rbac, validate, error, rateLimit
│           ├── modules/
│           │   ├── auth/
│           │   ├── users/
│           │   ├── workspaces/
│           │   ├── projects/
│           │   ├── tasks/
│           │   ├── dependencies/
│           │   ├── comments/
│           │   ├── meetings/
│           │   ├── docs/
│           │   ├── calendar/
│           │   ├── integrations/ # github, google
│           │   ├── notifications/
│           │   ├── search/
│           │   ├── audit/
│           │   └── ai/
│           │       ├── providers/    # llm provider adapters
│           │       ├── agent/        # planner, tools, executor
│           │       ├── tools/        # createTask, updateTask, ...
│           │       ├── prompts/
│           │       └── approvals/
│           ├── realtime/         # socket server, rooms, presence
│           ├── queues/           # producers
│           ├── workers/          # consumers
│           ├── lib/              # redis, prisma, logger
│           └── app.ts / server.ts
├── packages/
│   └── shared/                   # shared Zod schemas + types
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   ├── api.md
│   └── benchmarks.md
├── docker-compose.yml
├── .github/workflows/ci.yml
├── .env.example
└── README.md
```

Har module ke andar: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts` (Zod), `*.test.ts`.

---

## 6. Database Design (Prisma, core models)

Har table mein `id (uuid)`, `createdAt`, `updatedAt`. Har workspace-scoped table mein `workspaceId` (multi-tenancy isolation).

- **User**: email, name, avatarUrl, passwordHash?, googleId?
- **Workspace**: name, slug, ownerId
- **WorkspaceMember**: workspaceId, userId, role (`OWNER|ADMIN|MEMBER|GUEST`)
- **Invite**: workspaceId, email, role, tokenHash, expiresAt, acceptedAt
- **Project**: workspaceId, name, key (e.g. `WEB`), description, status, startDate, targetDate
- **Task**: projectId, workspaceId, number (auto per project, `WEB-42`), title, description, status (`BACKLOG|TODO|IN_PROGRESS|IN_REVIEW|DONE|BLOCKED`), priority (`LOW|MEDIUM|HIGH|URGENT`), assigneeId, reporterId, parentTaskId (subtasks), startDate, dueDate, completedAt, estimate, position (for ordering)
- **TaskSubscriber**: taskId, userId
- **TaskDependency**: taskId, dependsOnTaskId, type (`BLOCKS`) — **cycle detection zaruri**
- **Label**, **TaskLabel**
- **Attachment**: taskId/docId, fileUrl, name, size, mime
- **Comment**: taskId, authorId, body, mentions[] , parentCommentId
- **Meeting**: workspaceId, projectId?, title, startsAt, endsAt, organizerId, status, meetingUrl
- **MeetingParticipant**: meetingId, userId, rsvp
- **Transcript**: meetingId, rawText, summary, status
- **TranscriptSegment**: transcriptId, speakerId?, startMs, endMs, text
- **Doc**: workspaceId, projectId?, title, content (JSON/markdown), authorId
- **CalendarEvent**: userId, source (`INTERNAL|GOOGLE`), externalId, title, startsAt, endsAt
- **GitActivity**: workspaceId, repo, type (`PR|COMMIT|ISSUE`), externalId, title, author, url, linkedTaskId?, state
- **Notification**: userId, type, payload JSON, readAt
- **AuditLog**: workspaceId, actorType (`USER|AI_AGENT|SYSTEM`), actorId, action, entityType, entityId, before JSON, after JSON, approvalId?, ip, createdAt
- **AgentRun**: workspaceId, userId, prompt, status, steps JSON, tokensUsed, latencyMs
- **AgentAction** (proposed actions): agentRunId, tool, input JSON, status (`PROPOSED|APPROVED|REJECTED|EXECUTED|FAILED`), approvedBy, executedAt, result JSON
- **Embedding**: workspaceId, entityType, entityId, chunkIndex, content, `vector(1536)`, metadata JSON

### Indexes (performance ke liye mandatory)

- `Task(workspaceId, projectId, status)`, `Task(assigneeId, dueDate)`, `Task(workspaceId, updatedAt)`
- `Comment(taskId, createdAt)`
- `AuditLog(workspaceId, createdAt)`, `AuditLog(entityType, entityId)`
- `Embedding` pe **HNSW/IVFFlat** index (`vector_cosine_ops`) + `(workspaceId)` btree
- Full-text search: Postgres `tsvector` GIN index on task title/description, doc content

### Rules

- Pagination **cursor-based** (offset nahi) lists pe.
- N+1 queries avoid karo (Prisma `include`/`select` soch ke).
- Soft delete (`deletedAt`) tasks/projects pe.

---

## 7. Features — Phase by Phase

### Phase 1 — Foundation (Week 1)

- Monorepo setup, TS, ESLint, Prettier, Husky, Docker compose (Postgres + Redis).
- Express app skeleton, global error handler, request-id, Pino logger.
- Prisma schema v1 + migrations.
- **Auth:** register/login, JWT + refresh rotation, Google OAuth, logout, `/me`.
- **Workspace:** create, invite by email (token), accept invite, member list, role change.
- **RBAC middleware:** `requireRole('ADMIN')`, `requireWorkspaceMember`.
- Frontend: login/signup, workspace switcher, app shell (sidebar, topbar), protected routes.
- **Done when:** user signup → workspace banaye → teammate invite kare → teammate join kare.

### Phase 2 — Projects & Tasks (Week 2)

- Project CRUD.
- Task CRUD with full detail: title, description (rich text), assignee, subscribers, priority, status, start/due date, labels, attachments (S3/Cloudinary), subtasks, parent task.
- Views: **List**, **Kanban (drag-drop)**, **My Tasks**.
- Filters, sort, saved filters.
- Subscribers ko notification (in-app) jab task change ho.
- Audit log har task mutation pe.
- **Done when:** Lark jaisa "Record a video" task banao → subscriber add karo → deadline set karo → subscriber ko notification mile.

### Phase 3 — Dependency Graph (Week 3)

- `TaskDependency` API: add/remove (A blocks B).
- **Cycle detection** (DFS/topological check) — cycle bane to 400 error.
- React Flow graph: nodes = tasks, edges = dependencies, color by status, blocked tasks highlighted.
- **Critical path** calculation (longest path by estimate) — backend service + UI highlight.
- Task `BLOCKED` auto-status jab blocker incomplete ho; blocker done hote hi auto-unblock + notify.
- **Done when:** 20 tasks ka graph render ho, critical path highlight ho, cycle reject ho.

### Phase 4 — Realtime (Week 4)

- Socket.IO with **Redis adapter**.
- Rooms: `workspace:{id}`, `project:{id}`, `task:{id}`.
- **Real-time comments** (optimistic UI + server confirm), `@mentions` → notification.
- **Presence:** kaun online hai, kaun is task/page ko dekh raha hai (Redis set + TTL heartbeat). Avatars stack task detail mein.
- Typing indicator, live task status updates (board automatically update ho).
- Socket auth (JWT handshake) + room authorization (user sirf apne workspace ke rooms join kare).
- **Done when:** do browsers mein ek comment dusre mein <300ms mein dikhe.

### Phase 5 — Calendar, Meetings, Transcripts (Week 5)

- Calendar view (day/week/month): tasks (due dates) + meetings + Google events.
- **Team calendar:** apne subscribed members ka schedule dekho; free/busy.
- Google Calendar OAuth sync (read) via worker; conflict detection.
- Meeting create (participants, link, agenda), RSVP.
- **Transcript pipeline:** audio upload / browser mic → queue job → Whisper → `TranscriptSegment`s → summary (LLM).
- Meeting page: transcript timeline, speakers, summary, **extracted action items**.
- **Done when:** meeting audio upload → transcript + summary + action-item suggestions dikhe.

### Phase 6 — Docs, Code Activity, Search (Week 6)

- Docs: create/edit (TipTap editor), link tasks in docs.
- **GitHub integration:** OAuth app / webhook; PR/commit mein task key (`WEB-42`) mile to task se auto-link; PR merged → task `DONE` suggest.
- Activity feed per project (tasks + commits + meetings + comments).
- **Hybrid search:** Postgres full-text + pgvector semantic, results merge (RRF). Global `Cmd+K` search.
- Embedding pipeline: entity create/update → BullMQ job → chunk → embed → store.
- **Done when:** "login bug ka kya hua" type query pe relevant task + PR + meeting note aaye.

### Phase 7 — AI Layer (Week 7) — _sabse important_

Section 9 padho. Summary:

- **AI Assistant panel** (chat) — Messenger jaisa.
- Read tools: daily summary, project status, search, "meri aaj ki agenda".
- **Risk detection engine** (scheduled job): overdue chains, blocked critical path, overloaded assignee, stale tasks, deadline slip prediction.
- **Write tools with approval:** createTask, updateTask, assignTask, addComment, scheduleMeeting, createTasksFromTranscript.
- **Approval UI:** AI proposal card (diff/preview) → Approve / Edit / Reject.
- Full audit trail (`actorType = AI_AGENT`, approvalId, approver).

### Phase 8 — Scale, Polish, Ship (Week 8)

- **Seed script:** 100K+ objects (tasks, comments, embeddings, audit logs) with `@faker-js/faker`.
- **Load test:** autocannon/k6 — list, search, task detail, create. Results `docs/benchmarks.md` mein.
- Redis caching (project summary, user task list, permission checks) + invalidation strategy.
- Rate limiting (per user, per IP; stricter on AI endpoints).
- Query optimization via `EXPLAIN ANALYZE` (before/after screenshots).
- Notifications center + email digest (queue).
- E2E tests (Playwright), CI green, Docker prod build.
- **Deploy** + demo video + README with architecture diagram.

---

## 8. API Design (REST, prefix `/api/v1`)

```
POST   /auth/register | /auth/login | /auth/refresh | /auth/logout
GET    /auth/google | /auth/google/callback
GET    /me

POST   /workspaces                       GET /workspaces
POST   /workspaces/:id/invites           POST /invites/:token/accept
GET    /workspaces/:id/members           PATCH /workspaces/:id/members/:userId

GET/POST   /workspaces/:wid/projects     GET/PATCH/DELETE /projects/:id
GET/POST   /projects/:id/tasks           GET/PATCH/DELETE /tasks/:id
POST   /tasks/:id/subscribers            DELETE /tasks/:id/subscribers/:userId
POST   /tasks/:id/dependencies           DELETE /tasks/:id/dependencies/:depId
GET    /projects/:id/graph               GET /projects/:id/critical-path
GET/POST   /tasks/:id/comments
POST   /tasks/:id/attachments

GET/POST   /meetings                     POST /meetings/:id/transcript
GET    /meetings/:id/transcript          POST /meetings/:id/extract-actions
GET    /calendar?from=&to=&users=

GET/POST   /docs                         GET/PATCH /docs/:id
GET    /search?q=&type=
GET    /activity?projectId=
GET    /notifications                    PATCH /notifications/:id/read

POST   /ai/chat                          (streaming SSE)
GET    /ai/runs/:id
GET    /ai/actions?status=PROPOSED
POST   /ai/actions/:id/approve | /reject
GET    /audit-logs?entityType=&entityId=&actorType=

POST   /webhooks/github
GET    /health
```

**Standard response format:**

```json
{ "success": true, "data": {}, "meta": { "nextCursor": "..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

---

## 9. AI Agent Design (core differentiator)

### 9.1 Principle

> **AI suggest karta hai, insaan approve karta hai, system audit karta hai.**

### 9.2 Context building (RAG)

1. User query aaya → intent classify (question / search / action).
2. **Structured context:** SQL se user ke tasks, projects, deadlines (hamesha accurate).
3. **Semantic context:** pgvector se top-k relevant chunks (docs, comments, transcripts).
4. **Permission filter:** sirf wahi data jo user dekh sakta hai.
5. Context ko token budget ke andar trim karke LLM ko do.

### 9.3 Tools (Zod-validated)

| Tool                        | Type         | Approval |
| --------------------------- | ------------ | -------- |
| `searchWorkspace`           | read         | no       |
| `getMyAgenda`               | read         | no       |
| `getProjectStatus`          | read         | no       |
| `summarizeMeeting`          | read         | no       |
| `detectRisks`               | read         | no       |
| `createTask`                | write        | **yes**  |
| `updateTask`                | write        | **yes**  |
| `assignTask`                | write        | **yes**  |
| `addComment`                | write        | **yes**  |
| `scheduleMeeting`           | write        | **yes**  |
| `createTasksFromTranscript` | write (bulk) | **yes**  |

### 9.4 Action lifecycle

```
PROPOSED → (user) APPROVED → EXECUTED
                ↘ REJECTED
                         EXECUTED → FAILED (with error logged)
```

- Write tool call ko seedha execute nahi karte — `AgentAction` row banti hai `PROPOSED` status mein.
- Frontend approval card dikhata hai: kya badlega (before → after).
- Approve pe hi executor chalta hai, **same RBAC checks** ke saath jaise user khud kar raha ho.
- Execute ke baad `AuditLog` entry: `actorType=AI_AGENT`, `approvedBy=userId`.

### 9.5 Safety & reliability

- **Prompt injection defense:** transcript/doc/comment content ko "untrusted data" treat karo; system prompt mein clearly likho ki data ke andar ke instructions follow nahi karne. Tool inputs Zod se strict validate.
- **Idempotency key** har action pe (double-click / retry se duplicate na bane).
- **Rate limit + token budget** per user/day.
- **Timeouts + retries** (exponential backoff) LLM calls pe; fallback message.
- **Streaming responses** (SSE) for fast first-token.
- **Eval set:** 20–30 test prompts + expected tool calls (`apps/api/src/modules/ai/__evals__`) — accuracy report README mein.
- **Observability:** har `AgentRun` mein tokens, latency, tool calls log.

### 9.6 Risk detection rules (pehle rule-based, phir LLM explain)

- Task overdue + dusre tasks us par dependent.
- Critical path pe koi task `BLOCKED` / unassigned.
- Assignee ke paas >N open tasks same week mein.
- Task 7+ din se `IN_PROGRESS` bina update ke.
- Project target date se pehle remaining estimate > available capacity.

Output: risk score (LOW/MED/HIGH) + reason + suggested action (jo approval flow se jayega).

### 9.7 Prompt templates

`modules/ai/prompts/` mein alag files — system prompt, risk-explainer, meeting-summarizer, action-item-extractor. Versioned (`v1`), taaki baad mein improve kar sako.

---

## 10. Realtime & Redis Usage

| Use            | Redis structure                                                 |
| -------------- | --------------------------------------------------------------- |
| Presence       | `presence:workspace:{id}` → set/hash with TTL heartbeat (30s)   |
| Task viewers   | `viewers:task:{id}` set                                         |
| Cache          | `cache:project:{id}:summary`, `cache:user:{id}:tasks` (TTL 60s) |
| Rate limit     | sliding window counters                                         |
| Socket scaling | `@socket.io/redis-adapter`                                      |
| Queues         | BullMQ                                                          |
| Idempotency    | `idem:{key}` with TTL                                           |

**Cache invalidation rule:** write hone pe related keys delete karo (service layer mein, ek jagah). Cache kabhi source of truth nahi.

---

## 11. Queues (BullMQ)

| Queue           | Job                                        |
| --------------- | ------------------------------------------ |
| `embeddings`    | entity chunk + embed + upsert              |
| `notifications` | in-app + email fan-out                     |
| `transcription` | audio → text → segments → summary          |
| `ai-jobs`       | risk scan, action extraction, daily digest |
| `integrations`  | google calendar sync, github backfill      |

Har job: retries (3, exponential), dead-letter handling, `jobId` dedupe, logging.

---

## 12. Security Checklist

- Passwords: **argon2/bcrypt**.
- Refresh token rotation + reuse detection; httpOnly + secure + sameSite cookies.
- **Workspace isolation:** har query mein `workspaceId` filter (repository level enforce).
- Helmet, CORS whitelist, rate limits, request size limits.
- File upload: type/size validate, signed URLs.
- Webhook signature verify (GitHub).
- No secrets in logs; PII redact.
- Dependency audit in CI (`npm audit`).

---

## 13. Testing Strategy

- **Unit:** services (dependency cycle detection, critical path, risk rules, RBAC).
- **Integration:** Supertest + test DB (auth flow, task CRUD, approval flow).
- **E2E (Playwright):** signup→create project→create task→comment realtime; AI propose→approve.
- **AI evals:** fixed prompts → expected tool call check.
- **Load test:** k6/autocannon scripts in `/scripts/loadtest`.
- CI mein sab chale.

---

## 14. Performance Plan (< 1s target)

1. Correct indexes (Section 6).
2. Cursor pagination.
3. Redis caching hot reads.
4. `select` sirf zaroori fields.
5. Embedding/AI kaam async queue mein, request path mein nahi.
6. Frontend: TanStack Query cache, virtualized lists (`@tanstack/react-virtual`), code-splitting.
7. Measure: `EXPLAIN ANALYZE` + load test → `docs/benchmarks.md` (before/after).

---

## 15. Seed Data (100K+ objects)

`prisma/seed.ts`:

- 5 workspaces, 200 users, 50 projects
- ~40,000 tasks, ~40,000 comments, ~10,000 docs/transcript chunks, ~10,000+ audit logs
- Realistic dependencies (DAG, no cycles)
- Embeddings: bulk batch jobs (cost bachane ke liye chhota subset real embeddings, baaki mock vectors — README mein transparent likho)
- Command: `npm run seed:large`

---

## 16. Docker & Local Setup

`docker-compose.yml` services: `postgres` (pgvector image), `redis`, `api`, `web`.

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run db:seed
npm run dev            # web + api + workers
```

`.env.example` (keys): `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `LLM_PROVIDER`, `LLM_API_KEY`, `EMBEDDING_MODEL`, `S3_*`/`CLOUDINARY_*`, `CLIENT_URL`.

---

## 17. Git & Commit Discipline (recruiters commit history dekhte hain)

- Branches: `main`, `feat/<name>`.
- Chhote, meaningful commits (Conventional Commits).
- Har phase ek PR jaisa (self-review description ke saath).
- Issues/Project board use karo (apna hi tool 😄).
- Repo mein **ek ya do dummy-free, real** commits per day dikhein — ek din mein sab dump mat karo.

---

## 18. README.md mein kya hona chahiye (final deliverable)

1. One-line pitch + live demo link + demo video (2–3 min).
2. Screenshots / GIFs (board, dependency graph, realtime, AI approval).
3. Architecture diagram + data flow.
4. Tech stack + "why this choice" (short).
5. Features list.
6. **Benchmarks table** (real numbers).
7. AI safety design (approval + audit).
8. Setup instructions.
9. Trade-offs & future work (honest).

---

## 19. Demo Script (interview / video ke liye, 3 min)

1. Signup → workspace → teammate invite.
2. Project banao, 5 tasks, dependencies jodo → graph dikhao, critical path highlight.
3. Do browsers: realtime comment + presence.
4. Meeting transcript upload → summary + action items.
5. AI se pucho: "is week ke risks kya hain?" → risk list.
6. AI propose kare: "3 tasks banao" → **approval card** → approve → audit log dikhao.
7. Cmd+K semantic search.
8. Benchmarks slide: 100K+ objects, p95 < 1s.

---

## 20. Resume Bullets (numbers apne measure kiye hue daalna)

- Built **TeamOS**, an AI-native team workspace (MERN + PostgreSQL/pgvector, Redis, BullMQ, Socket.IO) combining tasks, dependency graphs, meetings, docs and code activity.
- Designed a **tool-calling AI agent with human-in-the-loop approvals** and a full audit trail; 100% of AI write actions are approved and logged.
- Implemented **hybrid search (full-text + vector)** over **100K+ indexed objects** with **p95 latency under 1s** via indexing and Redis caching.
- Built **real-time collaboration** (comments, presence) with Socket.IO + Redis adapter, delivering events in **<300 ms**.
- Developed async pipelines (BullMQ) for embeddings, meeting transcription, and risk detection; CI/CD with GitHub Actions and Dockerized deployment.

---

## 21. Final Definition of Done

- [ ] Sab 8 phases complete, app deployed.
- [ ] CI green, tests pass, lint clean.
- [ ] 100K+ seed data + benchmark report.
- [ ] AI write actions 100% approval-gated + audited.
- [ ] README + architecture diagram + demo video.
- [ ] Koi hardcoded secret nahi, `.env.example` complete.
- [ ] Code readable, consistent, humanized — koi dead code / console.log spam nahi.

---

## 22. Agent ko last instruction

Ab **Phase 1** se shuru karo. Har phase ke end mein mujhe batao: kya bana, kya test hua, aur next phase ke liye kya plan hai. Agar koi requirement unclear ho to apni best judgment se simple option lo, `docs/decisions.md` mein likho, aur aage badho — bina kaam roke.
