# Must-IQ — Internal AI Platform

> **Must Company's private, self-hosted AI assistant.**
> Built to stop knowledge from leaking out and start keeping it in.

---

## Table of Contents

1. [What Is Must-IQ?](#1-what-is-must-iq)
2. [The Problems It Solves](#2-the-problems-it-solves)
3. [Solution Overview](#3-solution-overview)
4. [Architecture Overview](#4-architecture-overview)
5. [Nx Monorepo Structure](#5-nx-monorepo-structure)
6. [Application Layer: Web (apps/web)](#6-application-layer-web)
7. [Application Layer: API Gateway (apps/api)](#7-application-layer-api-gateway)
8. [Application Layer: AI Library (@must-iq/langchain)](#8-application-layer-ai-library)
9. [LangChain Implementation (langchain/)](#9-langchain-implementation)
10. [Shared Libraries (libs/)](#10-shared-libraries)
11. [Database: PostgreSQL + pgvector](#11-database-postgresql--pgvector)
12. [Cache & Memory: Redis](#12-cache--memory-redis)
13. [LLM Settings — Provider Switching](#13-llm-settings--provider-switching)
14. [Team Knowledge Base](#14-team-knowledge-base)
15. [Agent Integrations](#15-agent-integrations)
16. [Security Model](#16-security-model)
17. [Token Management](#17-token-management)
18. [Infrastructure & Deployment](#18-infrastructure--deployment)
19. [Developer Guide](#19-developer-guide)
20. [Environment Variables Reference](#20-environment-variables-reference)
21. [Data Flow Diagrams](#21-data-flow-diagrams)
22. [Roadmap](#22-roadmap)

---

## 1. What Is Must-IQ?

Must-IQ is **Must Company's official internal AI assistant**. It replaces the ad-hoc use of public AI tools (ChatGPT, Claude.ai, Gemini) with a fully private, auditable, company-controlled platform.

Every query employees send to Must-IQ stays inside Must Company's infrastructure. Answers are grounded in real company documents and team knowledge. Every interaction is logged, budgeted, and attributed to a user.

### Core Capabilities

| Capability | Description |
|---|---|
| **Document Q&A** | Ask questions about HR policies, IT runbooks, legal templates, finance procedures |
| **Team Knowledge** | Ask what any internal team does, who owns it, what stack it uses |
| **Cross-Team Discovery** | Find out if another team has already solved a problem |
| **Task Automation** | Lookup Jira ticket status, summarise Slack threads, query GitHub — via natural language |
| **Living Documentation** | Every answered question is saved back to the knowledge base |
| **Provider Flexibility** | Switch between Claude, GPT-4o, Gemini, or local Ollama from the admin UI |

### Design Principles

- **Private by default** — no data ever leaves Must Company's servers
- **Settings-controlled LLM** — the active model is a DB setting, not a hardcoded import
- **Unified Database** — PostgreSQL + pgvector handles relational data *and* vector search
- **Knowledge compounds** — the more employees use it, the smarter it gets
- **Auditable** — every query, every token, every source is logged

---

## 2. The Problems It Solves

### 2.1 Data Sovereignty

When employees use ChatGPT or Claude.ai directly, every query — including sensitive HR decisions, financial teamions, legal questions, and customer data — is sent to and stored on external servers. Must-IQ keeps all of this inside Must Company's own PostgreSQL database.

### 2.2 The Team Knowledge Gap

In most technology companies, institutional knowledge lives in three places: people's heads, scattered Slack messages, and outdated Confluence pages. New joiners spend weeks figuring out what teams exist. Colleagues interrupt team leads with repeat questions. Teams unknowingly build duplicate solutions.

Must-IQ solves this by maintaining a **Team Knowledge Base** — a living store of:
- What every team is and does
- Who owns it and how to contact them
- What technology stack it uses
- Links to repos, tickets, and documentation
- Answers to every question previously asked about it

### 2.3 No Token Cost Control

Without a dedicated internal tool, there is no way to see how many AI queries employees are making, which teams are the heaviest users, or what the daily/monthly cost is. Must-IQ enforces per-user daily token budgets tracked in Redis, with alerts at 80% usage and hard stops at the limit.

### 2.4 No Audit Trail

Public AI tools provide no record of what was asked, answered, or — critically — what company data was shared. Must-IQ logs every query to the `token_logs` table with the user, timestamp, session, model used, and token count. This is a prerequisite for GDPR compliance and internal security policies.

### 2.5 Tool Fragmentation

Employees context-switch constantly between Jira, Slack, GitHub, and Confluence to answer simple questions. Must-IQ's agent integration means they can ask "what's the status of the payments sprint" and get an answer pulled directly from Jira — without leaving the chat interface.

---

## 3. Solution Overview

Must-IQ is a **Retrieval-Augmented Generation (RAG) platform** with an agentic layer on top. Here is the simplified model:

```
Employee question
       ↓
Must-IQ searches two sources simultaneously:
  1. Internal documents (HR, IT, Finance, Legal) ── via pgvector
  2. Team Knowledge Base                       ── via pgvector
       ↓
Relevant context retrieved (top-5 chunks per source)
       ↓
Context + question + conversation history → LLM prompt
       ↓
LLM generates answer (streamed to browser)
       ↓
Answer + sources returned to employee
       ↓
Q&A pair saved back to knowledge base (loop)
```

For tasks that require *reasoning* across systems (finding ticket status, summarising Slack threads, checking a PR), the LangGraph agent layer kicks in:

```
Employee: "What is the status of the Jira ticket mentioned in the latest PR for the login service?"
       ↓
LangGraph ReAct agent plans: [query_github, search_jira]
       ↓
GitHub tool → finds PR → extracts ticket ID (AUTH-123)
Jira tool → looks up AUTH-123 → returns status "In Progress"
       ↓
Agent summarises the findings → employee sees the answer
```

### What Must-IQ Is Not

- It is **not a replacement for Jira/Confluence** — it is a natural language interface *on top of* those tools
- It is **not a chatbot** that makes things up — all answers are grounded in real documents and real data
- It is **not a public AI service** — it runs entirely on Must Company's own servers

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER LAYER         ┌──────────────────────────────▼──────────────────────────────────────┐
│                    AI CORE  (LangChain Library)                     │
│                                                                     │
│  ┌──────────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│  │   RAG Chain      │   │  Ingestion Module │   │ LangGraph     │  │
│  │  (LCEL Pipeline) │   │  (Multipart Upload)│   │ ReAct Agent   │  │
│  └───────▲──────────┘   └─────────▲─────────┘   └───────▲───────┘  │
│          │                        │                     │          │
│  ┌───────┴────────────────────────┴─────────────────────┴───────┐  │
│  │               UNIFIED ENGINE (runAIQuery)                   │  │
│  └────────────────────────────────▲─────────────────────────────┘  │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │ Called directly by API
┌───────────────────────────────────┴─────────────────────────────────┐
│                      API GATEWAY  (NestJS)                          │
│  JWT Auth  │  RBAC  │  Rate Limiting  │  Audit Log  │  Token Budget │
└──────────────────────────────▲──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    AI ENGINE  (LangChain)                           │
│                                                                     │
│  ┌──────────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│  │   RAG Chain      │   │  Ingestion Module │   │ LangGraph     │  │
│  │  (LCEL Pipeline) │   │  (Multipart Upload)│   │ ReAct Agent   │  │
│  └──────────────────┘   └───────────────────┘   └───────┬───────┘  │
│                                                          │           │
│  ┌──────────────────────────────────────────────────────▼────────┐  │
│  │                    AGENT TOOLS                                 │  │
│  │  search_docs  │  search_teams  │  jira  │  slack  │ github │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │             SESSION MEMORY                                    │  │
│  │  ConversationSummaryBufferMemory  │  Redis-backed (prod)      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────┬────────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────┐
              │                              │                      │
┌─────────────▼──────────┐  ┌───────────────▼──────┐  ┌───────────▼──────────┐
│  PostgreSQL + pgvector  │  │       Redis          │  │    LLM Provider      │
│                         │  │                      │  │   (settings-driven)  │
│  - Users / RBAC         │  │  token:usage:{id}    │  │                      │
│  - Chat sessions        │  │  cache:{hash}        │  │  Claude  /  GPT-4o   │
│  - Vectors (Chunks)     │  │  memory:{session}    │  │  Gemini  /  Ollama   │
│  - Auth logs            │  │                      │  │  xAI Grok            │
│  - Admin settings       │  └──────────────────────┘  └──────────────────────┘
└─────────────┬──────────┘
              │              ┌──────────────────────────────────┐
              └─────────────►│     EXTERNAL INTEGRATIONS        │
                             │  Jira · Slack · GitHub · Confluence│
                             └──────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| **Web UI** | Next.js 14 | Chat interface, streaming display, token badge |
| **API Gateway** | NestJS | Auth, RBAC, token enforcement, AI routing |
| **AI Core** | LangChain | RAG, agent, memory, tool calls, unified engine |
| **Database** | PostgreSQL + pgvector | All persistent data + vector embeddings |
| **Cache** | Redis | Token quotas, response cache, session memory |
| **LLM** | Configurable | Language model inference |

---

## 5. Nx Monorepo Structure

Must-IQ uses **Nx 19** as its monorepo build system. Nx provides:

- **Affected builds** — only rebuild teams touched by a change
- **Build cache** — previously built outputs are reused
- **Dependency graph** — visualise how apps and libs depend on each other
- **Parallel execution** — run tasks across apps concurrently

```
must-iq/
│
├── nx.json                          ← Nx workspace config (cache, pipelines)
├── tsconfig.base.json               ← Path aliases: @must-iq/langchain, @must-iq/db, @must-iq/config
├── package.json                     ← npm workspaces root
├── docker-compose.yml               ← PostgreSQL+pgvector + Redis
├── .env.example                     ← All environment variables documented
│
├── apps/                            ← Runnable applications
│   ├── web/                         ← Next.js 14 chat UI
│   │   ├── team.json             ← Nx targets: dev, build, test, lint
│   │   └── src/
│   │       ├── app/(chat)/chat/     ← Main chat page (App Router)
│   │       ├── components/          ← TokenUsageBadge, ChatWindow, MessageBubble
│   │       └── store/chat.store.ts  ← Zustand state (sessions, messages, streaming)
│   │
│   ├── api/                         ← NestJS API Gateway
│   │   ├── team.json
│   │   └── src/
│   │       ├── main.ts              ← Helmet, CORS, ValidationPipe bootstrap
│   │       ├── auth/                ← JwtAuthGuard, RolesGuard, AuthController
│   │       ├── chat/                ← ChatController → AIEngine service
│   │       ├── token/               ← TokenManagerService (Redis quota enforcement)
│   │       └── settings/            ← SettingsController (admin LLM config)
│   │
│   └── ai-engine/                   ← LangChain AI service layer
│       ├── team.json
│       └── src/
│           ├── main.ts              ← Re-exports from langchain/
│           ├── ai-engine.service.ts ← Routes queries: RAG chain vs Agent
│           └── prompts/             ← Workspace-specific system prompts
│
├── libs/                            ← Shared libraries (not runnable)
│   ├── shared-types/                ← @must-iq/shared-types
│   │   └── src/index.ts             ← All shared TypeScript interfaces
│   │
│   ├── db/                          ← @must-iq/db
│   │   └── src/
│   │       ├── prisma/schema.prisma ← Database schema (with vector column)
│   │       ├── migrations/          ← Manual SQL migrations (HNSW index)
│   │       ├── pgvector.ts          ← retrieve/store chunk helpers
│   │       └── init.sql             ← Enables pgvector extension on startup
│   │
│   └── config/                      ← @must-iq/config
│       └── src/
│           ├── llm.settings.types.ts ← LLMProvider type, PROVIDER_MODELS
│           ├── settings.service.ts   ← Reads/writes "llm" row from settings table
│           └── llm.factory.ts        ← createLLM() / createEmbeddings()
│
└── langchain/                       ← @must-iq/langchain (Core AI Implementation)
    └── src/
        ├── agent/                   ← LangGraph ReAct agent
        ├── chains/                  ← LCEL chains (RAG, Conversational)
        ├── memory/                  ← Conversation history management
        ├── prompts/                 ← Centralized system & human templates
        ├── rag/                     ← Knowledge base ingestion (PDF/DOCX/TXT)
        ├── service/                ← Unified AI Engine orchestration (runAIQuery)
        ├── tools/                   ← External platform integrations (Jira, Slack, etc)
        └── index.ts                 ← Library entry point
```

### Path Aliases

Defined in `tsconfig.base.json`, these allow clean cross-package imports:

```typescript
import type { ChatMessage } from "@must-iq/shared-types";
import { prisma }           from "@must-iq/db";
import { createLLM }        from "@must-iq/config";
```

---

## 6. Application Layer: Web

**Stack:** Next.js 14 (App Router), Tailwind CSS, Zustand

### Chat Page (`apps/web/src/app/(chat)/chat/page.tsx`)

The main interface. Connects to the API via Server-Sent Events (SSE) for streaming responses. Key behaviours:

- Session persistence — chat history stored in the DB, reloaded on return
- Streaming — each LLM token is appended to the message bubble as it arrives
- Source citations — RAG responses include which document chunks were used
- Token badge — shows the user's remaining daily token budget

### State Management

Zustand store (`chat.store.ts`) manages:

```typescript
interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  tokenUsage: { used: number; limit: number };
}
```

### Component Tree

```
ChatPage
├── Sidebar          ← session list, new chat button
├── ScopeSelector    ← workspace checkbox panel (NEW)
│   ├── ☑ General Knowledge  (always checked, disabled)
│   ├── ☐ Engineering
│   ├── ☐ HR
│   ├── ☐ Finance
│   └── ...          (only shows depts user has access to)
├── ChatWindow       ← message history
│   └── MessageBubble (user | assistant | system)
│       └── SourceCitations  ← documents used for this answer
└── InputBar
    ├── TextArea
    ├── AgentToggle  ← switch between RAG chain and full agent
    └── TokenUsageBadge
```

The `ScopeSelector` stores its state in Zustand (`selectedWorkspaces: string[]`).
Every chat message payload includes the current selection:

```typescript
// store/chat.store.ts
interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  tokenUsage: { used: number; limit: number };
  selectedWorkspaces: string[];        // user-controlled scope
  availableWorkspaces: Workspace[];   // populated on login from user's grants
}
```

On login, the API returns the list of workspaces the user has access to.
`general` is always present and always pre-selected. The selection persists
per-session in `localStorage` so users don't have to re-select on each visit.

---

## 7. Application Layer: API Gateway

**Stack:** NestJS, Passport.js, class-validator

The API Gateway is the security and routing layer. No LLM call happens without passing through it.

### Request Lifecycle

```
Incoming HTTP Request
        ↓
  Helmet (security headers)
        ↓
  CORS check
        ↓
  JwtAuthGuard → validate token → attach req.user
        ↓
  RolesGuard → check req.user.role against @Roles() decorator
        ↓
  TokenManagerService.checkBudget() → Redis → over limit? 429
        ↓
  Controller handler
        ↓
  AIEngine.runQuery()
        ↓
  TokenManagerService.recordUsage() → Redis + DB log
        ↓
  SSE stream back to client
```

### Key Modules

**AuthModule** (`apps/api/src/auth/`)
- `AuthController` — `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `JwtAuthGuard` — validates Bearer token on every protected route
- `RolesGuard` — checks `@Roles('ADMIN', 'MANAGER')` decorator

**ChatModule** (`apps/api/src/chat/`)
- `ChatController` — `POST /chat/message`, `GET /chat/sessions`, `GET /chat/history/:id`
- Forwards to `AIEngineService`, streams SSE back

**TokenModule** (`apps/api/src/token/`)
- `TokenManagerService` — Redis key: `token:usage:{userId}:{YYYY-MM-DD}`
- Checks budget before each call, records usage after
- Emits warning event at 80%, hard stop at 100%

**SettingsModule** (`apps/api/src/settings/`)
- `GET /settings/llm` — current active configuration (no API keys)
- `PUT /settings/llm` — update provider/model (ADMIN only)
- `GET /settings/llm/providers` — available providers and their models

---

## 8. AI Orchestration

The AI orchestration logic is encapsulated in `@must-iq/langchain` and used directly by the API. It decides which chain or agent to invoke for each request.

### Routing Logic (`langchain/src/service/ai-engine.service.ts`)

```typescript
async function runAIQuery(params: AIQueryParams): Promise<AIQueryResult> {
  // selectedWorkspaces comes from the UI checkbox selection.
  // "general" is always included server-side even if omitted by the client.
  const workspaces = [...new Set(["general", ...params.selectedWorkspaces])];

  if (params.useAgent) {
    return runAgent(params.query, params.userId, workspaces, params.sessionId);
  }

  const chain = await buildRAGChain(workspaces);
  // ... load session memory, invoke, save memory, return
}
```

**`useAgent: false` (default)** — fast, cheap, grounded in documents. Used for most Q&A.

**`useAgent: true`** — slower, more capable. Used when the query implies a *task* (create, update, find, notify) or needs to reason across multiple sources.

---

## 9. LangChain Implementation

All LangChain logic lives in `langchain/src/`. The apps treat this as an internal package `@must-iq/langchain`.

### 9.1 RAG Chain (`chains/rag-chain.ts`)

The primary document retrieval pipeline built with LCEL (LangChain Expression Language):

```typescript
const chain = RunnableSequence.from([
  {
    // Retrieve top-5 relevant chunks from pgvector, filtered by workspace
    context:      (input) => retriever.invoke(input.question).then(formatDocumentsAsString),
    question:     (input) => input.question,
    chat_history: (input) => input.chat_history ?? [],
  },
  mustIQPrompt,     // workspace-specific ChatPromptTemplate
  await createLLM(), // reads active provider from DB settings
  new StringOutputParser(),
]);
```

The retriever uses the **user-selected scope** from the UI — a list of workspaces the employee explicitly chose to search, plus `general` (always included). This replaces automatic workspace-scoping:

```typescript
const retriever = vectorStore.asRetriever({
  k: 5,
  filter: { workspace: { in: selectedWorkspaces } },
  // selectedWorkspaces always includes "general"
  // plus whatever the user checked in the scope selector
  // e.g. ["general", "engineering", "hr"]
});
```

### 9.2 Team Knowledge Chain

A second LCEL chain wired to the `team_knowledge` document namespace in pgvector. When an employee asks "What does Team Atlas do?", this chain retrieves team entries rather than policy documents.

Team entries are structured records:

```
Team: Atlas
Owner: Sarah Chen (sarah@mustcompany.com)
Team: Platform Engineering
Stack: Next.js, NestJS, PostgreSQL, AWS ECS
Description: Customer-facing analytics dashboard
Repo: github.com/mustcompany/atlas
Jira Board: ATLAS sprint board
Status: Active — v2.1 in development
```

These are either ingested manually or auto-populated by the GitHub and Jira agent tools.

### 9.3 Memory (`memory/`)

Two memory implementations are provided:

**`session-memory.ts` — Development (in-process)**

Uses `BaseChatMessageHistory` from `@langchain/core`, consumed via `RunnableWithMessageHistory`:
- Stores message objects (HumanMessage, AIMessage) per session
- Stored in a `Map<sessionId, BaseChatMessageHistory>` in process memory
- Swapped at runtime for the Redis implementation in production

**`redis-memory.ts` — Production**

Uses `RedisChatMessageHistory` from `@langchain/community`:
- Messages stored in Redis at key: `must-iq:memory:{sessionId}`
- TTL: 7 days (configurable via `MEMORY_TTL_SECONDS`)
- Shared session state across multiple API instances.

### 9.4 Prompts (`prompts/must-iq-prompts.ts`)

Workspace-specific `ChatPromptTemplate` instances. Each prompt:
- Sets the assistant's identity and scope ("You are Must-IQ...")
- Restricts answers to provided context ("Answer ONLY using the internal documents...")
- Instructs citation ("Always cite which document your answer came from...")
- Tailors tone for the workspace (HR is more empathetic; IT is more technical)

Available templates: `RAG_PROMPT`, `HR_PROMPT`, `IT_PROMPT`, `FINANCE_PROMPT`, `LEGAL_PROMPT`, `TEAM_KB_PROMPT`

### 9.5 Agent (`agent/must-iq-agent.ts`)

Built with `createReactAgent` from `@langchain/langgraph/prebuilt`. The ReAct (Reason + Act) pattern lets the LLM:

1. **Reason** about which tool(s) to use
2. **Act** by calling those tools
3. **Observe** the results
4. Repeat until it can generate a final answer

The agent's system prompt includes the currently active provider and model name, so it can accurately describe its own capabilities.

---

## 10. Shared Libraries

### `@must-iq/shared-types`

TypeScript interfaces shared across all apps. Key types:

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokensUsed: number;
  sources?: DocumentChunkRef[];
  createdAt: Date;
}

interface DocumentChunkRef {
  chunkId: string;
  source: string;
  page?: number;
  score: number;
}

interface TokenUsage {
  userId: string;
  used: number;
  limit: number;
  resetAt: Date;
}
```

### `@must-iq/db`

Exports the Prisma client and the pgvector query helpers:

```typescript
// pgvector.ts — the two functions everything else uses
export async function retrieveChunks(
  queryVector: number[],  // float[1536]
  workspace: string,
  topK = 5
): Promise<DocumentChunk[]>

export async function storeChunk(params: {
  documentId: string;
  content: string;
  source: string;
  page?: number;
  workspace: string;
  chunkIndex: number;
  embedding: number[];
}): Promise<void>
```

### `@must-iq/config`

The LLM factory and settings service:

```typescript
// Used everywhere — resolves the active provider from the DB at runtime
const llm        = await createLLM();          // BaseChatModel
const utilityLLM = await createUtilityLLM();   // cheapest model for summarisation
const embeddings = await createEmbeddings();   // Embeddings
```

Settings are cached for 60 seconds to avoid a DB hit on every chat message. Calling `saveActiveSettings()` busts the cache immediately.

---

## 11. Database: Switchable Vector Storage

Must-IQ supports dynamic switching between vector storage providers. This is controlled via the Admin Settings UI and stored in the `settings` table.

### Supported Providers

... (LLM providers list) ...

### 🏷️ Supported Content Layers

Must-IQ is optimized to understand and cross-analyze context across multiple technical layers:

- **Blockchain**: Solidity smart contracts, Hardhat/Foundry project structures, and Web3 integration logic.
- **Serverless**: Function-as-a-Service (Faas) code, including AWS Lambda, Cloud Functions, and edge workers.
- **Crawler**: Automation scripts, web scraping logic, and data extraction pipelines.
- **Infrastructure**: IAC (Infrastructure as Code) like Terraform, Kubernetes manifests, and Docker configurations.
- **Core Application**: Frontend (React/Next.js) and Backend (NestJS/Node.js) logic.

---

1. **Integrated (pgvector)**: Uses the same PostgreSQL instance. Best for lower cost and operational simplicity.
2. **External (Weaviate)**: Connects to an external Weaviate cluster. Best for high-scale or multi-cloud deployments.

### Advantages of pgvector (Default)

### Schema

The full schema is in `libs/db/src/prisma/schema.prisma`. Key models:

**`users`** — Employees and their RBAC roles. `tokenBudgetOverride` allows per-user exceptions to the role default.

**`chat_sessions`** — One session per conversation thread. Tracks total tokens used.

**`messages`** — Individual messages within a session. The `sources` JSON column stores the `DocumentChunkRef[]` used for that response.

**`token_logs`** — Immutable audit log. Every LLM call creates one row.

**`documents`** — Metadata for uploaded files. Status progresses from `processing` → `ready` (or `error`).

**`document_chunks`** — The critical table. One row per text chunk. The `embedding vector(1536)` column stores the float vector produced by the embedding model.

**`workspaces`** — Integration sources linked to teams. Each workspace has a single `identifier` field (e.g. a Slack channel ID, GitHub repo full name, or Jira project key) plus a `type` enum (`SLACK | GITHUB | JIRA | GENERIC`). This replaces the prior separate `slackChannel`, `githubRepo`, and `jiraProject` columns.

**`teams`** (mapped to `projects` table) — Organisational units. Each team has an `identifiers: String[]` array listing all linked workspace identifiers, plus boolean flags `slackEnabled`, `githubEnabled`, `jiraEnabled`.


### Vector Column

```prisma
model DocumentChunk {
  // ...
  embedding   Unsupported("vector(1536)")?
  // Dimensions must match embedding model:
  //   OpenAI text-embedding-3-small  → 1536
  //   Google text-embedding-004      → 768
}
```

> ⚠️ If you change the embedding model, you must also update the dimension number, re-run `nx run db:migrate`, and re-ingest all documents.

### HNSW Index

Applied via `libs/db/src/migrations/add_vector_index.sql` after the Prisma migration:

```sql
CREATE INDEX document_chunks_embedding_hnsw_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

HNSW (Hierarchical Navigable Small World) provides sub-linear query time for approximate nearest-neighbour search. `m=16` controls the number of connections per node; `ef_construction=64` controls the accuracy of the index build. These are good defaults for up to ~500,000 chunks.

### The Vector Query

```sql
-- Workspace-scoped cosine similarity search
SELECT
  id, content, source, page, workspace,
  1 - (embedding <=> $1::vector) AS score
FROM document_chunks
WHERE
  workspace IN ($2, 'general')
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

The `<=>` operator is pgvector's cosine distance operator. `1 - distance = similarity score`. Results are ordered from most similar to least similar.

---

## 12. Cache & Memory: Redis

Redis serves three purposes:

### 12.1 Token Quota Tracking

```
Key:   token:usage:{userId}:{YYYY-MM-DD}
Value: integer (cumulative tokens used today)
TTL:   expires at midnight
```

Before every LLM call: `GET token:usage:{userId}:{today}` → compare against role limit.
After every LLM call: `INCRBY token:usage:{userId}:{today} {tokensUsed}`.

### 12.2 Response Caching

Semantically identical queries get cached responses to eliminate redundant LLM calls:

```
Key:   cache:{sha256(userId + query + workspace)}
Value: JSON string (full response + sources)
TTL:   3600 seconds (configurable via TOKEN_CACHE_TTL_SECONDS)
```

### 12.3 Session Memory (Production)

In production, conversation history is stored in Redis rather than process memory:

```
Key:   must-iq:memory:{sessionId}
Value: JSON array of LangChain BaseMessage objects
TTL:   604800 seconds (7 days)
```

This allows multiple API instances to share session state without sticky sessions.

---

## 13. LLM Settings — Provider Switching

This is one of Must-IQ's most important operational features. The active LLM is **not hardcoded**. It is read at runtime from the `settings` table in PostgreSQL.

### How It Works

```
Request arrives
      ↓
createLLM() called
      ↓
getActiveSettings()
  → check in-memory cache (TTL: 60s)
  → cache miss: SELECT value FROM settings WHERE key = 'llm'
  → parse JSON: { provider: "anthropic", model: "claude-sonnet-4-6", ... }
      ↓
buildLLM(settings)
  → switch(provider):
    case "anthropic": new ChatAnthropic({ model, apiKey: process.env.ANTHROPIC_API_KEY })
    case "openai":    new ChatOpenAI({ model, apiKey: process.env.OPENAI_API_KEY })
    case "gemini":    new ChatGoogleGenerativeAI({ model, ... })
    case "ollama":    new ChatOllama({ model, baseUrl: OLLAMA_BASE_URL })
    case "azure-openai": new AzureChatOpenAI({ ... })
      ↓
return BaseChatModel
```

### Supported Providers

| Provider | Models | Notes |
|---|---|---|
| `anthropic` | claude-opus-4-5, claude-sonnet-4-6, claude-haiku-4-5 | Recommended for HR/legal/compliance. 200K context. |
| `openai` | gpt-4o, gpt-4o-mini, gpt-4-turbo | Best ecosystem. Dual-model strategy saves cost. |
| `gemini` | gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash | 1M token context. Multimodal capable. |
| `ollama` | llama3, mistral, phi3, mixtral | Fully local. Zero API cost. No external traffic. |
| `xai` | grok-3-mini, grok-beta | Competitive alternative; fast inference. |

### Changing the Active Model

Via the admin REST API (no restart required):

```bash
curl -X PUT http://localhost:4000/api/v1/settings/llm \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.3,
    "maxTokens": 2048
  }'
```

The change takes effect on the next request after the 60-second cache expires (or immediately if the cache is busted manually).

### Utility LLM

For background tasks (conversation summarisation, document classification), Must-IQ automatically uses the cheapest available model for the active provider:

| Active Provider | Utility Model |
|---|---|
| anthropic | claude-haiku-4-5 |
| openai | gpt-4o-mini |
| gemini | gemini-1.5-flash |
| ollama | same as primary (free) |

This prevents expensive primary models from being used for summarisation tasks.

## 14. Document Ingestion

Document ingestion is the process of loading external content (PDF, DOCX, TXT, Markdown) into the vector store.

### 14.1 Admin UI Ingestion

The **Knowledge Base** section in the Admin UI provides a managed interface for ingesting documents:

- **Upload Card**: Supports drag-and-drop or file selection.
- **Scope Selection**: Admins can target a specific workspace or the `general` scope.
- **Real-time Status**: Shows progress during ingestion and confirms chunk count on success.
- **Ingestion Log**: A persistent history of all ingestion attempts, sources, and status.

### 14.2 Technical Flow

1. Admin uploads file via multipart form.
2. `IngestionController` validates file type and size.
3. `IngestionService` writes to a temporary filesystem location.
4. `IngestionService` invokes the core `ingestFile` utility from `@must-iq/langchain`.
5. Document is parsed, split into 500-token chunks, and embeddings are generated via the active provider.
6. Chunks are stored in the `document_chunks` table with the selected workspace tag.
7. An `IngestionEvent` is recorded in the database for tracking.
8. Temp file is deleted.

### 14.3 Manual CLI Ingestion

The Team Knowledge Base is a specialised section of the pgvector store dedicated to information about Must Company's internal teams.

### Data Model

Team entries follow a structured template stored as document chunks in the `documents` table with `workspace = 'team-knowledge'`:

```
Team Name: [name]
Status: [Active | Maintenance | Deprecated | Planned]
Owner: [name] ([email])
Team: [team name]
Tech Stack: [languages, frameworks, databases, cloud]
Purpose: [2-3 sentence description]
Repository: [GitHub URL]
Jira Board: [board URL]
Confluence Space: [URL]
Dependencies: [list of other internal teams]
Consumers: [which teams/teams use this]
Last Updated: [date]
```

### How Knowledge Enters the Base

There are four entry points:

**1. Manual ingestion by admins**

```bash
nx run langchain:ingest -- --file ./docs/team-atlas.md --workspace team-knowledge
```

**2. Auto-populated by the GitHub agent tool**

When an employee asks about a repository that isn't yet in the knowledge base, the GitHub tool fetches the repo's README, topics, and recent commit messages, then saves a structured summary back to pgvector.

**3. Auto-populated by the Jira agent tool**

Jira team boards are periodically crawled. Epic names, team assignments, and sprint descriptions are ingested as team knowledge entries.

**4. Q&A learning loop**

When an employee asks a team question and a human expert answers it (via the admin approval flow), that answer is saved to the team knowledge base so the next employee gets an instant answer.

### Admin Approval Flow

New Q&A pairs are initially saved with `status: 'pending'`. Admins see a queue of pending entries in the settings dashboard:

```
Pending review:
Q: "What does the notification service do?"
A: "The notification service handles all transactional emails and push notifications..."
Source: answered by @johndoe on 2025-03-01
Action: [Approve] [Edit] [Reject]
```

Approved entries are promoted to `status: 'approved'` and become part of the searchable knowledge base.

---

## 15. Agent Integrations

The LangGraph ReAct agent can interact with multiple external tools defined in `langchain/src/tools/internal-tools.ts`.

### Tool Architecture

```typescript
const tool = tool(
  async (input: InputType) => {
    // implementation
    return result as string;
  },
  {
    name: "tool_name",
    description: "What this tool does and WHEN to use it. The LLM reads this.",
    schema: z.object({ /* typed input schema */ }),
  }
);
```

The agent reads each tool's `description` to decide which tool(s) to call. Good descriptions are critical — they are the agent's instructions.

### Jira Integration

| Capability | Description |
|---|---|
| Read ticket | `"What is the status of ATLAS-123?"` → retrieves issue details |
| Read comments | `"Summarise the discussion on ATLAS-124"` → extracts comment thread |
| Search tickets | `"Find tickets assigned to Sarah"` → searches by assignee |
| Query sprint | `"What's left in the current sprint?"` → returns open issues |
| Get board status | `"What's the status of the payments board?"` → sprint summary |

**API used:** Jira Cloud REST API v3. Credentials: `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

### Slack Integration

| Capability | Description |
|---|---|
| Read channel context | Reads recent messages to understand current discussions |
| Search threads | `"Has anyone discussed the 502 error in #backend today?"` |
| Summarise thread | `"Summarise the deployment discussion from yesterday"` |
| Find links | `"Find the design doc link shared in #product"` |

**API used:** Slack Web API. Credentials: `SLACK_BOT_TOKEN`.

### GitHub Integration

| Capability | Description |
|---|---|
| List open PRs | `"What PRs are open on the auth repo?"` |
| Summarise commits | `"What changed in payments-service this week?"` |
| Check CI/CD | `"Is the main branch build green?"` |
| Find owners | `"Who owns the notifications service?"` → reads CODEOWNERS |
| Ingest README | Auto-ingests README into team knowledge base |

**API used:** GitHub REST API v3 + GraphQL. Credentials: `GITHUB_TOKEN`.

### Confluence Integration

| Capability | Description |
|---|---|
| Search docs | `"Is there documentation on the onboarding process?"` |
| Ingest page | Converts Confluence pages to document chunks in pgvector |
| Read spaces | `"List all spaces matching 'Engineering'"` |
| Read page tree | `"What pages are under the Onboarding section?"` |

**API used:** Confluence Cloud REST API v2. Credentials: `CONFLUENCE_HOST`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN`.

### Adding a New Tool

To add a new integration (e.g., Google Calendar, PagerDuty):

1. Add the tool definition to `langchain/src/tools/internal-tools.ts`
2. Add it to the `ALL_TOOLS` array
3. Add any new env vars to `.env.example`
4. Rebuild the engine.

---

## 16. Security Model

### Authentication

Must-IQ uses a **JWT + Refresh Token** pattern:

```
POST /auth/login  →  { accessToken (15min), refreshToken (7 days) }
GET  /protected   →  Authorization: Bearer {accessToken}
POST /auth/refresh →  { accessToken (new 15min), refreshToken (rotated) }
```

Refresh tokens are stored in the `refresh_tokens` table with an expiry. Token rotation invalidates the previous refresh token on each use.

### Role-Based Access Control (RBAC)

Four roles with increasing privilege:

| Role | Workspaces Available in Scope Selector | Token Limit | Can Change Settings | Can Ingest Docs |
|---|---|---|---|---|
| `VIEWER` | General only | 5,000/day | No | No |
| `EMPLOYEE` | General + own dept + any granted | 20,000/day | No | No |
| `MANAGER` | General + own dept + sub-depts | 100,000/day | No | Yes (own dept) |
| `ADMIN` | All workspaces | Unlimited | Yes | Yes (all depts) |

> Users only see checkboxes for workspaces they have access to. They cannot select a workspace not in their list.

### Workspace Scope Selection (User-Controlled)

Rather than automatically restricting search to a user's own workspace, Must-IQ gives employees a **Scope Selector** — a checkbox panel in the chat UI where they choose which workspace silos to include in their search before asking a question.

**Defaults on first open:**
- `☑ General Knowledge` — always pre-checked and cannot be unchecked
- All other workspaces the user has been granted access to are listed and unchecked by default

**How it works:**

```
┌──────────────────────────────────┐
│  🔍 Search Scope                 │
│  ─────────────────────────────   │
│  ☑  General Knowledge  (always)  │
│  ☐  Engineering                  │
│  ☐  HR                           │
│  ☐  Finance                      │
│  ☐  Platform                     │
│  ☐  Security                     │
└──────────────────────────────────┘
```

The selected workspaces are sent with every query. The pgvector search uses exactly those workspaces — no more, no less:

```sql
-- User selected: General + Engineering + HR
WHERE workspace IN ('general', 'engineering', 'hr')
```

**Access control is still enforced** — users only see workspaces they have been granted access to in the scope selector. An employee with no `security` access will not see that checkbox at all. Admins see all workspaces.

**General Knowledge** is always visible to every user regardless of role and cannot be deselected. This covers company-wide policies, all-hands notes, and cross-team announcements.

### Prompt Injection Protection

Input validator (`apps/ai-engine/src/validator/input-validator.ts`) strips common injection patterns before the query reaches the LLM:

- Attempts to override the system prompt (`"Ignore all previous instructions..."`)
- Attempts to exfiltrate the system prompt (`"Repeat your instructions..."`)
- Role confusion attempts (`"You are now DAN..."`)
- Instruction injection hidden in document content (sanitised during ingestion)

### API Security Headers (NestJS + Helmet)

```typescript
app.use(helmet());        // X-Frame-Options, X-Content-Type-Options, CSP, etc.
app.enableCors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
});
```

### API Keys

API keys for LLM providers are stored in `.env` only. They are never:
- Written to the database
- Returned by any API endpoint
- Logged in audit logs

The `getActiveSettings()` function always strips `apiKeys` before returning to callers.

### PII Masking (Data Loss Prevention)

Must-IQ intercepts all data (both user prompts and retrieved RAG context) right before it is formatted for the LLM and processes it through a highly optimized PII Masker. 
It utilizes Regex, Lookarounds, and Checksums (Luhn algorithm) to aggressively redact:
- Email Addresses (`[REDACTED: EMAIL]`)
- Phone Numbers (`[REDACTED: PHONE]`)
- Credit Cards (`[REDACTED: CREDIT_CARD]`)
- US Social Security Numbers (`[REDACTED: SSN]`)

This ensures that even if sensitive customer data mistakenly ends up in an ingested HR or Finance document, the LLM provider will never see it.

---

## 17. Token Management

### Budget Enforcement Flow

```
1. Request arrives at ChatController
2. TokenManagerService.checkBudget(userId, role)
   → GET token:usage:{userId}:{today} from Redis
   → null? → 0 used
   → Parse role limit from env (TOKEN_BUDGET_EMPLOYEE=20000)
   → used >= limit? → throw HttpException(429, "Daily token budget exceeded")
   → used >= limit * 0.8? → attach warning header to response
3. AIEngine processes the query
4. LLM responds with usage: { promptTokens, completionTokens, totalTokens }
5. TokenManagerService.recordUsage(userId, sessionId, usage)
   → INCRBY token:usage:{userId}:{today} totalTokens
   → INSERT INTO token_logs (userId, sessionId, queryTokens, responseTokens, ...)
```

### Response Caching

Semantically identical queries return cached responses at zero token cost. The cache key is a SHA-256 hash of `userId + query + sortedSelectedWorkspaces`. Cache TTL is configurable dynamically via the Admin Settings UI (e.g., overriding the default of 1 hour) without requiring an application restart.

This is particularly effective for:
- Repeated policy questions ("What is the leave policy?")
- Repeated team questions ("What does service X do?")
- Onboarding questions asked by multiple new joiners

### Global Token Caps

Independent of the RBAC role budgets (`TOKEN_BUDGET_EMPLOYEE`), admins can specify a **Global Daily Cap** via the UI. If the system as a whole breaches this cap in a single 24-hour period, the LLM will halt further generation until the daily cron reset.

### Token Reporting

Admins can view token usage via:
```bash
nx run api:token-report
```

This outputs a daily/weekly/monthly breakdown by user, workspace, and model.

---

## 18. Infrastructure & Deployment

### Docker Compose (Local / Development)

```yaml
service:
  postgres:
    image: pgvector/pgvector:pg16   # Has pgvector extension pre-installed
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./libs/db/src/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports: ["6379:6379"]
```

The `init.sql` file automatically enables the `vector` extension when the container first starts:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Production Considerations

For production deployment, consider:

**Database**
- Use a managed PostgreSQL service that supports pgvector (e.g., Supabase, Neon, AWS RDS with pgvector, Azure Database for PostgreSQL)
- Enable connection pooling (PgBouncer recommended)
- Set up automated daily backups

**Redis**
- Use a managed Redis service (Redis Cloud, AWS ElastiCache, Azure Cache for Redis)
- Enable Redis persistence (AOF or RDB) for memory durability

**API / AI Engine**
- Deploy to a container orchestrator (AWS ECS, Google Cloud Run, or Kubernetes)
- Use at least 2 replicas for the API and AI Engine
- With multiple replicas, switch `session-memory.ts` to `redis-memory.ts` for shared session state

**Environment Variables**
- Use a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) — never commit `.env` to version control

### Nx Build Commands for Deployment

```bash
# Build all apps for production
nx run-many --target=build --all

# Build only affected apps (after a code change)
nx affected --target=build --base=main

# Outputs are in dist/apps/{web,api}
# Unified AI core is in dist/langchain
```

---

## 19. Developer Guide

### Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose
- (Optional) `nx` CLI: `npm install -g nx`

### First-Time Setup

```bash
# 1. Extract and install
tar -xzf must-iq.tar.gz
cd must-iq
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — minimum required:
#   ANTHROPIC_API_KEY=sk-ant-...   (or OPENAI_API_KEY)
#   OPENAI_API_KEY=sk-...          (required for embeddings)
#   JWT_SECRET=$(openssl rand -base64 64)

# 3. Start infrastructure
docker-compose up -d
# Wait ~10 seconds for Postgres to be ready

# 4. Set up database
nx run db:migrate      # runs Prisma migrations
nx run db:generate     # generates Prisma client
nx run db:seed         # creates default admin user + roles

# 5. Apply vector index
psql $DATABASE_URL -f libs/db/src/migrations/add_vector_index.sql

# 6. Start all apps in parallel
nx run-many --target=dev --all --parallel
```

### Default Users (after seed)

| Email | Password | Role |
|---|---|---|
| admin@mustcompany.com | admin123 | ADMIN |
| manager@mustcompany.com | manager123 | MANAGER |
| employee@mustcompany.com | employee123 | EMPLOYEE |

> ⚠️ Change all passwords immediately in production.

### Ingest Documents

```bash
# HR policy document
nx run langchain:ingest -- --file ./docs/leave-policy.pdf --workspace hr

# IT runbook
nx run langchain:ingest -- --file ./docs/vpn-setup.docx --workspace it

# Team description
nx run langchain:ingest -- --file ./docs/team-atlas.md --workspace team-knowledge

# Company-wide document (visible to all workspaces)
nx run langchain:ingest -- --file ./docs/company-handbook.pdf --workspace general
```

Supported file formats: `.pdf`, `.docx`, `.txt`, `.md`, `.csv`

### Useful Nx Commands

```bash
# Development
nx dev web                          # Next.js only on :3000
nx dev api                          # NestJS only on :4000
nx run-many --target=dev --all      # Everything at once

# Code quality
nx lint web                         # Lint one app
nx test api                         # Test one app
nx run-many --target=lint --all     # Lint everything
nx run-many --target=test --all     # Test everything

# Affected (CI-friendly)
nx affected --target=build          # Build only changed
nx affected --target=test           # Test only changed
nx affected --target=lint           # Lint only changed

# Visualise
nx graph                            # Opens dep graph in browser

# Database
nx run db:migrate                   # Apply pending migrations
nx run db:studio                    # Open Prisma Studio (DB GUI) on :5555
nx run db:generate                  # Regenerate Prisma client after schema change

# Cache
nx reset                            # Clear Nx build cache
```

### Switching the Active LLM (Development)

```bash
# Temporary: edit .env and restart
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o

# Permanent: via admin API (no restart needed)
curl -X PUT http://localhost:4000/api/v1/settings/llm \
  -H "Authorization: Bearer $(cat .dev-token)" \
  -H "Content-Type: application/json" \
  -d '{ "provider": "ollama", "model": "llama3" }'
```

---

## 20. Environment Variables Reference

```dotenv
# ── LLM PROVIDER ─────────────────────────────────────────────────
LLM_PROVIDER=anthropic          # anthropic | openai | gemini | ollama | azure-openai
LLM_MODEL=claude-sonnet-4-6
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=2048

# Anthropic (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI (https://platform.openai.com)
OPENAI_API_KEY=sk-...

# Google Gemini (https://aistudio.google.com)
GEMINI_API_KEY=AIza...

# Ollama (fully local — no API key required)
OLLAMA_BASE_URL=http://localhost:11434

# Azure OpenAI
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# ── EMBEDDINGS ───────────────────────────────────────────────────
EMBEDDING_PROVIDER=openai       # openai | gemini
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_DIMENSIONS=1536          # 1536 for OpenAI, 768 for Gemini

# ── DATABASE ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://mustiq:mustiqsecret@localhost:5432/must_iq
POSTGRES_USER=mustiq
POSTGRES_PASSWORD=mustiqsecret
POSTGRES_DB=must_iq

# ── CACHE ────────────────────────────────────────────────────────
REDIS_URL=redis://:redissecret@localhost:6379
REDIS_PASSWORD=redissecret

# ── AUTHENTICATION ────────────────────────────────────────────────
JWT_SECRET=                      # openssl rand -base64 64
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ── TOKEN BUDGETS ─────────────────────────────────────────────────
TOKEN_BUDGET_ADMIN=-1            # -1 = unlimited
TOKEN_BUDGET_MANAGER=100000
TOKEN_BUDGET_EMPLOYEE=20000
TOKEN_BUDGET_VIEWER=5000
TOKEN_WARNING_THRESHOLD=0.8      # warn at 80%
TOKEN_CACHE_TTL_SECONDS=3600
TOKEN_MAX_HISTORY_TURNS=20

# ── AGENT INTEGRATIONS ────────────────────────────────────────────
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=bot@mustcompany.com
JIRA_API_TOKEN=

SLACK_BOT_TOKEN=xoxb-...

GITHUB_TOKEN=ghp_...

CONFLUENCE_HOST=https://yourcompany.atlassian.net
CONFLUENCE_EMAIL=bot@mustcompany.com
CONFLUENCE_API_TOKEN=

# ── APP ──────────────────────────────────────────────────────────
NODE_ENV=development
PORT_WEB=3000
PORT_API=4000
PORT_AI_ENGINE=5000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Must-IQ

# ── SECURITY ─────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=60
MAX_UPLOAD_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,docx,txt,md,csv

# ── MEMORY ───────────────────────────────────────────────────────
MEMORY_TTL_SECONDS=604800        # 7 days

# ── AUDIT ────────────────────────────────────────────────────────
AUDIT_LOG_QUERIES=true
AUDIT_LOG_RETENTION_DAYS=365
```

---

## 21. Data Flow Diagrams

### Standard RAG Request

```
User types: "What is the annual leave policy?"
         │
         ▼
[NestJS API]
  1. JWT validated
  2. Role checked (EMPLOYEE ✓)
  3. Token budget checked: 3,200 / 20,000 ✓
  4. Cache check: MISS
         │
         ▼
[AI Engine — RAG Chain]
  5. Query embedded: "annual leave policy" → float[1536]
  6. Selected scope from UI: ["general", "hr"] (user checked HR)
     pgvector search:
     SELECT ... FROM document_chunks
     WHERE workspace IN ('general', 'hr')   -- user-selected
     ORDER BY embedding <=> $1::vector
     LIMIT 5;
     → returns 5 chunks from hr-policy.pdf
  7. Session memory loaded: 2 previous turns
  8. Prompt assembled:
     [System: You are Must-IQ...]
     [Context: {5 retrieved chunks}]
     [History: {2 previous turns}]
     [Human: "What is the annual leave policy?"]
         │
         ▼
[LLM — claude-sonnet-4-6]
  9. Generates answer (streamed token by token)
         │
         ▼ (SSE stream)
[NestJS API — post-processing]
 10. Tokens counted from response.usage
 11. Redis: INCRBY token:usage:{userId}:{today} 847
 12. DB: INSERT INTO token_logs (...)
 13. DB: INSERT INTO messages (role: 'assistant', ...)
 14. Memory saved: question + answer added to session
 15. Cache SET with 1h TTL
         │
         ▼
[Browser]
 16. Message rendered as it streams
 17. Sources panel shows: "hr-policy.pdf, page 4"
 18. Token badge updates: 4,047 / 20,000
```

### Agent Request

```
User types: "What is the status of the Jira ticket mentioned in the latest PR for the login service?"
         │
         ▼
[NestJS API] → useAgent: true
         │
         ▼
[LangGraph ReAct Agent]
  Iteration 1:
    Think: "I need to find the latest PR for the login service to get the ticket ID"
    Act:   query_github({ repo: "login-service", type: "pr", limit: 1 })
    Observe: { pr: "#42", title: "Fix auth flow (AUTH-123)" }

  Iteration 2:
    Think: "I found the ticket ID AUTH-123 in the PR title. Now I need to check its status in Jira"
    Act:   search_jira({ issueKey: "AUTH-123" })
    Observe: { status: "In Progress", assignee: "Sarah" }

  Final answer: "The Jira ticket (AUTH-123) mentioned in the latest login service PR (#42) is currently 'In Progress' and assigned to Sarah."
         │
         ▼
[NestJS API] → record tokens, stream response
```

---

## 22. Roadmap

### Phase 1 — Foundation (Complete ✅)
- [x] Nx monorepo structure
- [x] NestJS API Gateway with JWT + RBAC
- [x] LangChain RAG pipeline (LCEL)
- [x] Switchable Vector DB (PostgreSQL + pgvector / Weaviate)
- [x] Redis token quota management
- [x] Settings-controlled LLM (DB-driven provider switching)
- [x] Session memory (in-process + Redis-backed)
- [x] Document ingestion (PDF, DOCX, TXT, MD)
- [x] Agent logic and tool framework

### Phase 2 — Team Knowledge (In Progress 🔄)
- [ ] Team Knowledge Base schema and ingestion pipeline
- [ ] Admin approval flow for Q&A pairs
- [ ] Jira agent tool (read, search, query sprints)
- [ ] Slack agent tool (read, search, summarise)
- [ ] GitHub agent tool (PRs, commits, CI/CD, CODEOWNERS)
- [ ] Confluence agent tool (search, ingest, read)
- [ ] Auto-population from GitHub READMEs

### Phase 3 — Intelligence (Planned 📋)
- [ ] Multi-modal support (Gemini) — attach screenshots to queries
- [ ] Knowledge gap detection — flag questions that weren't answered well
- [ ] Proactive suggestions — "Based on your recent queries, you might want to read..."
- [ ] Analytics dashboard — usage by workspace, most-asked questions, knowledge gaps
- [ ] PagerDuty integration — query and acknowledge incidents via chat
- [ ] Google Calendar integration — schedule meetings from chat

### Phase 4 — Scale (Planned 📋)
- [ ] Multi-tenant support — separate knowledge bases per business unit
- [ ] Fine-tuning pipeline — train a smaller model on Must Company's Q&A history
- [ ] Voice interface — speech-to-text input, text-to-speech output
- [ ] Slack-native bot — answer questions directly inside Slack threads
- [ ] Mobile app — React Native client

---

*Must-IQ is an internal tool built and maintained by Must Company's engineering team.*
*For questions or contributions, contact the platform team.*
