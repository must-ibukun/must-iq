# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Infrastructure
docker-compose up -d          # Start PostgreSQL 16 + Redis 7

# Database
npm run db:generate           # Generate Prisma client after schema changes
npm run db:migrate            # Apply existing migrations
npm run migration:dev         # Generate + apply new migration
npm run db:seed               # Seed default teams, users, LLM settings
npm run db:studio             # Open Prisma Studio

# Development
npm run dev                   # Start NestJS API (port 4000)
npm run web:dev               # Start Next.js frontend (port 3000)

# Build
npm run build                 # Build NestJS API
npm run web:build             # Build Next.js frontend

# Testing
npm test                      # Run API tests
npx nx affected:test          # Test only changed packages
npx nx run api:test --testFile=path/to/spec.ts  # Run a single test file

# Other
npm run ingest                # CLI knowledge ingestion
npm run token:report          # Token usage reporting
npx nx graph                  # Visualize Nx dependency graph
```

## Architecture Overview

This is an Nx monorepo containing an AI-powered enterprise knowledge assistant.

### Workspace Layout

- `apps/api/` — NestJS 11 API gateway (port 4000)
- `apps/web/` — Next.js 15 frontend with App Router (port 3000)
- `libs/shared-types/` — Shared TypeScript interfaces, imported as `@must-iq/shared-types`
- `libs/db/` — Prisma ORM + pgvector schema, imported as `@must-iq/db`
- `libs/config/` — LLM factory & settings service, imported as `@must-iq/config`
- `langchain/` — AI orchestration layer (LangChain + LangGraph), imported as `@must-iq/langchain`

### Request Flow

1. User query → Next.js frontend (Zustand state, SSE streaming)
2. `POST /api/v1/chat` → NestJS `ChatService`
3. PII masking applied before any LLM call; audit log written only when PII is detected
4. If `deepSearch=true` → LangGraph ReAct agent with tools; otherwise → RAG chain
5. Intent extractor (fast LLM) → produces `domain` (engineering, operations, hr, general) + `issue_type` (permission_request, bug, incident, how_to, status_check, data_request, feature_request, approval_request, policy_lookup, other) + `enriched_query` (technical rewrite embedded instead of raw query). Structured ticket tags ([Requester], [Department], etc.) short-circuit the extractor to `domain=operations` with no LLM call.
6. Prompt router `getPrompt(issueType, domain)` selects response format — `issue_type` is the primary signal, `domain` only breaks ties for `how_to` and `policy_lookup`. Ticket-tag path bypasses this and always uses `ENGINEERING_PROMPT`.
7. HyDE (optional): generates a hypothetical answer document, embeds that instead of the raw query
8. Hybrid retrieval: pgvector cosine (dense) + PostgreSQL BM25 (sparse) run in parallel, merged via RRF (K=60), topK=60
9. Cross-encoder reranker (ms-marco-MiniLM-L-6-v2, local ONNX): narrows pool to top-20 by relevance
10. Context builder: filters out chunks below MIN_SCORE=0.1, deduplicates, enforces 6000-token budget
11. LLM called via provider-agnostic `LlmFactory` (OpenAI, Gemini, Anthropic, Ollama, Azure)
12. Response streamed via SSE (web) or returned as JSON (integrations); persisted to PostgreSQL
13. Non-blocking `TokenLog` write for usage visibility (no enforcement)

### AI Layer (`langchain/`)

- **Agent** (`langchain/src/agent/`) — LangGraph ReAct agent. `agent.builder.ts` constructs the graph with tools; `agent.stream.ts` is the streaming runner used by the API; `agent.runner.ts` is for batch/CLI use.
- **Tools** (`langchain/src/tools/internal-tools.ts`) — All tools are read-only except `ingest_to_mustiq`: `search_knowledge_base`, `search_jira`, `search_slack`, `search_github`.
- **Chains** (`langchain/src/chains/`) — `rag-chain.ts` for vector search + LLM; `conversational-chain.ts` for history-aware chat.
- **Memory** (`langchain/src/memory/`) — Redis-backed per-session chat history.
- **RAG utilities** (`langchain/src/rag/`) — `hyde.ts` (hypothetical document embedding), `reranker.ts` (local cross-encoder via `@xenova/transformers`).
- **Intent Extractor** (`langchain/src/intent/intent-extractor.ts`) — Fast LLM call producing `domain`, `issue_type`, `enriched_query`, `resources`, `actors`, `action`. `it` is not a domain — IT helpdesk queries are classified as `operations` domain + `how_to` issue_type.
- **Prompts** (`langchain/src/prompts/`) — Domain-specific RAG templates (engineering, hr, it-helpdesk, general) + `getPrompt(issueType, domain)` router + classifier prompt with few-shot examples.
- **Context builder** (`langchain/src/utils/context-builder.ts`) — Score threshold filter (MIN_SCORE=0.1), exact deduplication, token budget enforcement.

### LLM Configuration

`LlmFactory` (`libs/config/src/llm.factory.ts`) reads the active provider/model from the `Setting` table at runtime. Supports OpenAI, Gemini (with custom Matryoshka embedding handler), Anthropic, Ollama, and Azure OpenAI. The vector dimension is 768 for Gemini and 1536 for OpenAI — this is set in the Prisma schema.

### NestJS API Modules

Key modules under `apps/api/src/`:
- `chat/` — Core chat service and controller. Two paths: `chat()` (JSON, for integrations) and `streamChat()` (SSE, for web UI). Both write non-blocking `TokenLog` entries for usage visibility.
- `auth/` — JWT auth (cookies: `must-iq-token`, `must-iq-role`), refresh token rotation
- `settings/` — LLM settings CRUD, model management
- `admin/` — User/team management, audit logs, token usage dashboard
- `integrations/` — Slack webhook (`POST /webhooks/slack`) handles `app_mention` → fetch thread → AI → create Jira card → reply. GitHub and Jira webhooks removed; ingestion is cron-based only.
- `ingestion/` — Document upload and RAG pipeline trigger
- `common/` — Guards, filters, PII masking (`pii-masker.helper.ts`), DTOs

**Removed modules (no longer in codebase):**
- `token/` — Token budget enforcement deleted. Lightweight `TokenLog` writes remain in `ChatService` for visibility only; no budget errors are thrown.

### Database

PostgreSQL 16 with the `pgvector` extension. Key models: `User`, `ChatSession`, `Message`, `DocumentChunk` (vector embeddings), `Document`, `Team`, `Workspace`, `Setting` (single-row config), `TokenLog`, `AuditLog`, `IngestionEvent`.

API keys stored in the `Setting` table are encrypted at rest using AES-256 via `crypto-js`.

#### Migration Rules — ALWAYS follow these when changing `schema.prisma`

Every schema change (new model, new field, altered field type, new enum, new index) **must** be accompanied by a hand-written migration file. `prisma migrate dev` is **banned** — it tries to reset the Supabase DB due to extension drift and will destroy data.

**Steps for every schema change:**

1. Edit `libs/db/src/prisma/schema.prisma`
2. Create a new migration directory:
   ```
   libs/db/src/prisma/migrations/<YYYYMMDDHHMMSS>_<snake_case_description>/migration.sql
   ```
   Use the next available timestamp after the latest migration in the folder.
3. Write the raw SQL in `migration.sql` (e.g. `ALTER TABLE`, `CREATE TYPE`, `CREATE INDEX`)
4. Apply it: `npm run migration:run`
5. Regenerate the Prisma client: `npm run db:generate`
6. Update any TypeScript files that reference the changed models/enums

**Never run `prisma migrate dev`** — it detects Supabase extension drift and prompts to reset the database.

### Frontend

Next.js 15 App Router. State managed with Zustand (`apps/web/src/store/`). Auth state controlled by `apps/web/src/middleware.ts` (reads JWT cookies). Markdown/code blocks rendered with `react-markdown` + `react-syntax-highlighter`; diagrams with `mermaid`.

### Integrations & Cron Jobs

Ingestion is pull-based via cron jobs running at 06:00 and 18:00 daily (`@Cron('0 6,18 * * *')`). Each run fetches the last 12 hours of data:
- `slack-ingest.cron.ts` — lists all bot-member channels, maps them to workspaces, calls `pullSlackData`
- `github-ingest.cron.ts` — queries `Workspace` table for `type=GITHUB`, calls `pullRepoPRs` per repo
- `jira-ingest.cron.ts` — queries `Workspace` table for `type=JIRA`, calls `pullJiraIssues` per project

All three toggles (`slackIngestionEnabled`, `repoIngestionEnabled`, `jiraIngestionEnabled`) are controllable from Admin UI → System Settings.

The Slack `app_mention` webhook (`POST /webhooks/slack`) remains for the interactive Jira card flow — this is separate from ingestion and is intentional.

### Security Constraints

- CORS is restricted to `http://localhost:3000` — update `apps/api/src/main.ts` for production domains.
- All LLM calls go through PII masking (`pii-masker.helper.ts`); audit log is written only when PII is detected (`action: 'chat.pii_detected'`). Do not bypass this in new chat paths.
- The global validation pipe uses `whitelist: true, forbidNonWhitelisted: true` — all new DTOs must use `class-validator` decorators.
- API keys in the `Setting` table are encrypted at rest (AES-256). The settings service falls back to the plain-text value if decryption yields empty output (handles seeded plain keys).

### Environment

Copy `.env.example` to `.env`. Required variables: `DATABASE_URL`, `REDIS_URL`, and at least one LLM provider API key. Default seeded admin: `admin@mustcompany.com` / `admin123`.
