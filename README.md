# 🧠 Must-IQ
**Must Company's private internal AI assistant — powered by LangChain + LangGraph.**

Nx monorepo · Next.js 15 · NestJS 11 · LangChain · LangGraph · PostgreSQL + pgvector · Redis

---

## 🏗️ Architecture & Flow

For a detailed breakdown of how the Frontend, Backend, and AI Engine interact, see:
👉 **[Full-Stack AI Flow Documentation](./doc/ai_ingestion_flow.md)**
👉 **[LangChain Solution Design](./doc/langchain-solution-design.md)**
👉 **[Full System Documentation](./doc/must-iq-docs.md)**

### 🏷️ Architectural Layer Classification
Must-IQ uses a multi-layered classification system to categorize knowledge and perform cross-layer analysis:
- **Docs**: Documentation, handbooks, wikis, and general business logic (formerly "General").
- **Backend**: Server-side logic, APIs, database schemas (NestJS, Node.js, Go, etc.).
- **Web**: Frontend web applications, UI components, state management (React, Next.js).
- **Mobile**: iOS and Android application code (Swift, Kotlin, Flutter, React Native).
- **Infrastructure**: IAC, DevOps, Cloud resources (Terraform, K8s, CloudFormation).
- **AI**: Machine learning models, prompt engineering, and LLM orchestration logic.

---

## 📁 Team Structure

```text
must-iq/
├── apps/
│   ├── web/           ← Next.js 14 Chat UI + Admin Panel
│   ├── api/           ← NestJS API Gateway (Auth, Token Budget, Settings)
│   └── ai-engine/     ← AI Orchestration Service (Routes to LangChain)
│
├── libs/
│   ├── shared-types/  ← @must-iq/shared-types
│   ├── db/            ← @must-iq/db (Prisma + pgvector + seed)
│   └── config/        ← @must-iq/config (LLM Factory + Settings Service)
│
├── langchain/         ← @must-iq/langchain (Core AI Library)
│   └── src/
│       ├── agent/     ← LangGraph ReAct Agent (split into focused files)
│       │   ├── agent.builder.ts   ← buildMustIQAgent()
│       │   ├── agent.runner.ts    ← runAgent()  (non-streaming)
│       │   ├── agent.stream.ts    ← runAgentStream()  (SSE/streaming)
│       │   ├── agent.types.ts     ← AgentStreamEvent type
│       │   └── index.ts           ← barrel re-export
│       ├── chains/    ← RAG and Conversational pipelines
│       ├── prompts/   ← Centralized system prompt templates
│       ├── memory/    ← Per-session conversation history
│       └── tools/     ← Jira, Slack, GitHub, Confluence integrations
│
├── doc/               ← Comprehensive system documentation
└── docker-compose.yml ← Postgres + pgvector + Redis
```

---

## 🚀 Quick Start

### 1. Install & Setup
```bash
npm install
npm install -g nx
cp .env.example .env
```

### 2. Infrastructure
```bash
docker-compose up -d
# Sets up PostgreSQL (with pgvector) + Redis
```

### 3. Database
```bash
nx run db:migrate      # Apply schema migrations
nx run db:generate     # Regenerate Prisma client
nx run db:seed         # Seed teams, users (with team assignments), and LLM settings
```

> **Seed includes:** 5 team teams (API Infrastructure, Frontend Excellence, Onboarding Flow, Security Audit, Compliance Center), 6 users spanning all roles, and 10 multi-provider API keys (Gemini × 4, OpenAI × 2, Anthropic × 2, xAI × 2).

### 4. Run Development Environment
```bash
nx run-many --target=dev --all --parallel
```

| App | URL |
|---|---|
| **Web UI** | http://localhost:3000 |
| **API** | http://localhost:4000 |

---

## 🔍 Search Modes (Quick vs. Deep Search)

Must-IQ supports two distinct search modes, controllable via the **Input Bar** toggle:

- **Quick Search**: Standard RAG pipeline. Fast, cost-effective, and optimized for straightforward retrieval of facts and context.
- **Deep Search 🔍**: Advanced Agentic Reasoning. The AI performs multiple iterative search steps, reasons over retrieved data, and can use specialized tools (Jira, Slack, GitHub) to synthesize complex answers.

### 🌐 Cross-Layer Intelligence
The system is grounded in **Cross-Layer Connectivity**. By labeling source data with architectural layers, Must-IQ can perform end-to-end flow analysis.
- **Example**: If you ask about a "login flow", the AI will bridge a `LoginForm.tsx` [WEB] component with the `/api/login` [BACKEND] route and the `User` [DB] schema to explain the complete path.

### 🛡️ Policy Cascade & Administrative Control
The system follows a strict hierarchy to determine if Deep Search is used:
1. **Admin Override**: If the "Agentic Reasoning (Deep Search)" master switch is **OFF** in Admin UI → LLM Settings, Deep Search is disabled for all users.
2. **User Query Toggle**: If enabled by the admin, users can flip the toggle for a single query. This resets back to their default preference after the message is sent.
3. **User Default Preference**: Users can set their preferred default mode (Quick vs. Deep) in their **Profile Settings**.

---

## 👥 Teams & Scopes

Must-IQ organises users into **Teams**. While Slack and GitHub integration sources are mapped 1:1 to a specific team, **Jira projects can be shared** across multiple teams simultaneously for cross-functional visibility. The **Docs** layer (General) is always available to everyone.

- **Admins** automatically have access to all teams.
- **Managers / Employees** are assigned to one or more specific teams.
- The Chat sidebar's **Search Scope** selector reflects the user's team membership, letting them include/exclude individual team data sources at search time.

### Managing Team Membership (Admin UI → Users)
- The **Team(s)** column shows team badges per user (or 🔑 ALL TEAMS for admins).
- Click the **✏️** pencil icon to open the multi-team assignment modal.
- Select any combination of teams and click **Save Teams**.

---

## ⚙️ Dynamic LLM Provider Management

Must-IQ is fully **provider-agnostic**. Admins can manage multiple API keys per provider from the Admin UI → **AI Models** section:

| Provider | Models |
|---|---|
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| **Anthropic** | claude-opus-4-5, claude-sonnet-4-6 |
| **xAI Grok** | grok-3-mini, grok-beta |
| **Ollama** | llama3, mistral, phi3 (local) |

Only **one key is active globally** at a time. Click **Use This** on any key to activate it (all others deactivate automatically). Keys are encrypted at rest using AES.

> **Decryption Safety**: The settings service safely handles both encrypted keys (saved via UI) and plain-text keys (from seed) — falling back to the raw value if AES decryption yields empty output.

---

## 📥 Knowledge Ingestion

### 1. Manual Ingestion (CLI)
```bash
nx run langchain:ingest -- --file ./path/to/doc.pdf --workspace hr
```

### 2. Admin UI Ingestion
Admins and Managers can ingest data directly from the **Admin UI → Knowledge Base** section:
- **Knowledge Ingestion (Manual):**
    - Drag-and-drop file upload (PDF, DOCX, TXT, Markdown).
    - **Manual Repository ZIP Upload:** Upload a `.zip` of a repository for automated extraction and recursive code ingestion.
    - **Targeted Selection:** Select a **Target Team** to automatically filter destination workspaces.
- **On-Demand Team Sync:**
    - Trigger deep-syncs for specific Teams.
    - High-precision filtering: Select specific workspaces (Slack channels, Jira projects, etc.) within a team for targeted ingestion.
- **Event Logging:** Real-time chunking status and comprehensive ingestion history log.

---

## 🔍 RAG Pipeline

Must-IQ uses a multi-stage retrieval pipeline for high-quality answers:

1. **Domain Classifier** — A fast LLM call routes the query to one of five domains: `engineering`, `hr`, `it`, `operations`, `general`. Structured ticket tags (`[Requester]`, `[Department]`, etc.) short-circuit this to `operations` without any LLM call.
2. **HyDE** *(optional)* — Generates a hypothetical answer document and embeds that instead of the raw query, bridging the vocabulary gap between natural language and code.
3. **Hybrid Search** — pgvector dense search + PostgreSQL BM25 (sparse) run in parallel, merged via Reciprocal Rank Fusion (K=60), topK=60.
4. **Cross-Encoder Reranker** — `ms-marco-MiniLM-L-6-v2` (local ONNX, ~90 MB, no external API) rescores the 60-chunk pool and returns the top-20 most relevant chunks.
5. **Context Builder** — Filters out chunks below MIN_SCORE=0.1, deduplicates, and enforces a 6000-token budget before injection into the LLM prompt.

All retrieval settings (HyDE, hybrid search, reranker, topK, context budget) are togglable from **Admin UI → LLM Settings**.

---

## 📥 Knowledge Ingestion

### Scheduled Pull (Cron)
Ingestion runs automatically at **06:00 and 18:00 daily** for the last 12 hours of data:
- **Slack** — pulls from all channels the bot is a member of
- **GitHub** — pulls merged PRs from all configured repositories
- **Jira** — pulls resolved issues from all configured projects

All three can be toggled individually from **Admin UI → System Settings → Scheduled Ingestion**.

### Manual Ingestion (Admin UI)
Drag-and-drop file upload (PDF, DOCX, TXT, Markdown) or ZIP repository upload from **Admin UI → Knowledge Base**.

### CLI Ingestion
```bash
nx run langchain:ingest -- --file ./path/to/doc.pdf --workspace hr
```

---

## 📊 Token Tracking

Token usage is logged non-blocking to the `TokenLog` table on every chat request (both JSON and SSE paths). No budget enforcement — purely for visibility. Admins can view usage in **Admin UI → Token Usage**: daily totals, estimated cost ($0.003/1K tokens blended), and top users.

---

## 🛡️ Security

- **PII Masking** — Regex engine redacts emails, phone numbers, SSNs, API keys, and UUIDs before any LLM call. Audit log entries are written only when PII is actually detected (`action: chat.pii_detected`).
- **Workspace Isolation** — Every RAG retrieval is scoped to the requesting user's team workspaces. The `general` scope is always included.
- **API Key Encryption** — All provider API keys are stored encrypted at rest (AES-256 via `crypto-js`).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | Nx 22 |
| **Frontend** | Next.js 15 + Tailwind + Zustand |
| **API** | NestJS 11 + JWT |
| **AI Orchestration** | LangChain (LCEL) + LangGraph ReAct |
| **Vector DB** | PostgreSQL 16 + pgvector |
| **Hybrid Search** | pgvector (dense) + PostgreSQL BM25 (sparse) + RRF |
| **Reranker** | ms-marco-MiniLM-L-6-v2 via @xenova/transformers (local ONNX) |
| **Persistence** | Prisma ORM |
| **Session History** | Redis |
| **Encryption** | crypto-js AES (API keys at rest) |
| **ZIP Handling** | adm-zip (Manual Repo Ingest) |

---

## 🔑 Default Seed Credentials

| User | Role | Team | Password |
|---|---|---|---|
| admin@mustcompany.com | ADMIN | General (all) | admin123 |
| manager@mustcompany.com | MANAGER | API Infrastructure | manager123 |
| employee@mustcompany.com | EMPLOYEE | Frontend Excellence | employee123 |
| hr@mustcompany.com | MANAGER | Onboarding Flow | employee123 |
| security@mustcompany.com | EMPLOYEE | Security Audit | employee123 |
| compliance@mustcompany.com | EMPLOYEE | Compliance Center | employee123 |
