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
