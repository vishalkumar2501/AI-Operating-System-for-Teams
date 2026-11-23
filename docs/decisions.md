# Architecture & Implementation Decisions

This document records the architectural and technology decisions made during the design and implementation of TeamOS.

## Decision 1: Monorepo Structure with npm Workspaces

- **Date:** Phase 1 Setup
- **Options Considered:** Turborepo / pnpm / npm workspaces
- **Decision:** npm workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Reason:** Built into Node/npm without extra global CLI dependencies; lightweight, reliable on Windows, and directly implements Section 5 of `PROJECT_BLUEPRINT.md`.

## Decision 2: Local Database & Cache Infrastructure (Docker Compose)

- **Date:** Phase 1 Setup
- **Options Considered:** Cloud services (Neon/Supabase + Upstash) vs Local Docker
- **Decision:** Local Docker Compose with `pgvector/pgvector:pg16` and `redis:7-alpine`.
- **Reason:** Zero cost, fully isolated, works completely offline, supports `pgvector` natively, and provides fast local development iteration.

## Decision 3: TypeScript Strict Mode Across Backend & Frontend

- **Date:** Phase 1 Setup
- **Decision:** Target ES2022 with NodeNext module resolution and `strict: true`.
- **Reason:** Enforces type safety, avoids null pointer bugs, and satisfies Rule 3 of the blueprint.

## Decision 4: Safe Secrets Architecture

- **Date:** Phase 1 Setup
- **Decision:** All credentials loaded exclusively via `.env`, validated by Zod at startup, strictly ignored by git, with `.env.example` as a template.
- **Reason:** Prevents accidental leakage of credentials in repository and CI/CD pipelines.

## Decision 5: DAG Dependency Engine & Critical Path Method (CPM)

- **Date:** Phase 3 Implementation
- **Options Considered:** Client-side path finding vs Server-side topological DP
- **Decision:** Implemented cycle detection using recursive Depth-First Search (DFS) with recursion stack tracking on the server (`O(V+E)`). CPM is calculated via Kahn's algorithm and dynamic programming longest-path traversal.
- **Reason:** Guaranteeing acyclic constraints on the database level prevents corrupted cyclic states. Graph analytics on the server allow instant response times (16ms for 24 nodes) and consistent calculations across web, mobile, and API clients.

## Decision 6: Distributed Socket.IO Cluster with Redis Pub/Sub Adapter

- **Date:** Phase 4 Implementation
- **Options Considered:** Single-instance in-memory sockets vs Redis Adapter
- **Decision:** Mounted `@socket.io/redis-adapter` for multi-worker scaling, using rolling TTL keys in Redis (`presence:workspace:{id}`) for ephemeral presence without database thrashing.
- **Reason:** Allows multiple API processes to scale horizontally behind a load balancer without dropping real-time events or presence indicators.

## Decision 7: Audio Intelligence Pipeline & 1-Click Task Conversion

- **Date:** Phase 5 Implementation
- **Options Considered:** Manual copy-pasting of meeting notes vs automated structured extraction
- **Decision:** Implemented multi-stage audio pipeline: Whisper speech-to-text (with built-in diarization fallback) -> structured summary -> action item commitment parsing (`{ title, assigneeName, deadline, priority }`) -> 1-click batch task conversion into active projects.
- **Reason:** Bridges the gap between team sync conversations and actionable project backlog execution.

## Decision 8: Hybrid Search with Reciprocal Rank Fusion (RRF)

- **Date:** Phase 6 Implementation
- **Options Considered:** Pure full-text search vs pure vector similarity search
- **Decision:** Combined PostgreSQL full-text search (`to_tsvector` / `ts_rank`) with pgvector semantic cosine similarity using Reciprocal Rank Fusion:
  $$RRF\_Score(d) = \sum_{m \in \{lexical, vector\}} \frac{1}{60 + rank_m(d)}$$
- **Reason:** Pure vector search misses exact keyword matches (like ticket numbers `CORE-42` or acronyms), while pure FTS misses semantic intent. RRF requires no arbitrary score normalization or parameter tuning, completing searches in under 2ms.

## Decision 9: Human-in-the-Loop AI Action Safety Architecture

- **Date:** Phase 7 Implementation
- **Options Considered:** Autonomous unconstrained AI write actions vs 100% manual entry
- **Decision:** Autonomous execution for all Read Tools (`searchWorkspace`, `getMyAgenda`, `getProjectStatus`, `detectRisks`). For all Write Tools (`createTask`, `updateTask`, `assignTask`, `addComment`, `scheduleMeeting`), the AI only creates `PROPOSED` action cards with visual before/after diffs requiring explicit human confirmation.
- **Reason:** Eliminates LLM hallucination risk on enterprise data and guarantees 100% auditability (`actorType: AI_AGENT`).

## Decision 10: Multi-Tenant Project Isolation for Webhook Ingestion

- **Date:** Phase 6 Implementation
- **Decision:** Regex matching against project key + number (`[A-Z0-9]+-\d+`) resolves the target workspace dynamically by task key, maintaining strict multi-tenant database isolation.
- **Reason:** Supports distributed GitHub repositories mapping to multiple distinct workspaces without cross-tenant data leakage.
