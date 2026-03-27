# Must-IQ: Full-Stack AI Flow

![Architecture Overview](image/ai_ingestion_flow/1773039742987.png)

The interaction between the user interface, the backend, and the AI ingestion process follows a structured **RAG (Retrieval-Augmented Generation)** architecture. This ensures a seamless, streaming chat experience backed by internal company knowledge, scoped to the user's **assigned teams and their associated workspaces**. Jira workspaces are uniquely shareable across multiple teams.

## 🏗️ High-Level Architecture

```mermaid
graph TD
    subgraph "Frontend: User Interface (apps/web)"
        UI[Chat UI: ChatWindow.tsx] --> Action[User Sends Message]
        Scope[Scope Selector: team + integration chips] --> Action
        Action --> API_Client[chatApi.stream with selectedTeams]
        Stream[SSE Stream Processor] --> UI
    end

    subgraph "Backend: API & AI Core"
        API_Client --> Gateway[NestJS Gateway + AuthGuard]
        Gateway --> Engine[Unified Engine: runAIQuery]
        Engine --> RAG[5-Stage RAG Pipeline]
        Engine --> Agent[AI Agent: runAgentStream]
        RAG --> Stream
        Agent --> Stream
        SlackMention[POST /webhooks/slack app_mention] --> ChatJSON[ChatService.chat — JSON]
        ChatJSON --> JiraCard[Create Jira Card → Slack Reply]
    end

    subgraph "Agent Modules (langchain/src/agent)"
        Agent --> Builder[agent.builder.ts]
        Builder --> Runner[agent.runner.ts — non-streaming]
        Builder --> Streamer[agent.stream.ts — SSE generator]
        Builder --> Types[agent.types.ts — AgentStreamEvent]
    end

    subgraph "Data & Knowledge (libs/db & langchain)"
        Embed[Embedder] --> DB[(Postgres + pgvector)]
        DB --> Retriever[Hybrid Retriever: pgvector + BM25 → RRF]
        Retriever --> RAG
        Agent --> IngestTool[ingest_to_mustiq Tool]
        IngestTool --> DB
    end

    subgraph "Source Pathways"
        Docs[Internal Docs: PDF/DOCX] --> Batch[Batch Ingest Script]
        Batch --> Embed
        Cron[Cron 06:00 / 18:00 — last 12h pull] --> CronIngest[Slack channels · GitHub PRs · Jira issues]
        CronIngest --> Embed
    end

    subgraph "Admin Platform"
        AdminUI[Admin Panel] --> TeamMgmt[Teams: View/Edit/Delete]
        AdminUI --> UserMgmt[Users: Multi-team assignment]
        AdminUI --> IntMgmt[Integrations: Workspace management]
        AdminUI --> LLMKeys[AI Models: Multi-provider key manager]
        AdminUI --> SysSettings[System Settings: Ingestion toggles Slack/GitHub/Jira]
    end
```

---

## 🎨 Frontend Flow (Interacting)

1. **Team/Scope Selection**: The user picks which team's integration sources (🎫 Jira · 🐙 GitHub · 💬 Slack) to include in the search, using the sidebar **Scope Selector**. `General` is always locked ON.
2. **Submission**: User types a question in `InputBar.tsx` and hits send. The selected team IDs are included in the request payload.
3. **Streaming Request**: `chatApi.stream` initiates a `POST` to the backend with `stream: true` and `selectedTeams`.
4. **Real-time Processing**: As the backend generates tokens, the frontend reads the body stream using a `ReadableStreamDefaultReader`.
5. **UI Updates**:
   - `onChunk` → appends new text to the active message bubble.
   - `onSources` → displays clickable citations (Jira ticket / GitHub file / Slack thread / Doc).
   - `onToolCall` → shows a typing indicator with the tool being used (🔍 / 🧠 / 💾).

---

## 🗄️ Ingestion & Knowledge Acquisition

### ⚡ Mode A: Static & Manual Ingestion (Admin UI)

Used for structured, stable documents or legacy codebase imports.

1.  **Document Upload:** Admins/Managers upload files (PDF, DOCX, etc.) via the Admin UI. Chunks are tagged with a specific **Team** or the **General** workspace.
2.  **Manual Repo ZIP Upload:** Entire repositories can be ingested by uploading a `.zip` file. The backend (using `adm-zip`) extracts and recursively processes supported code files for vectorization.
3.  **Persistence:** Chunks are saved in the `document_chunks` table, with high-precision metadata for team-scoped retrieval.

### 🕐 Mode B: Scheduled Cron Ingestion (Slack · GitHub · Jira)

Used for dynamic, ever-changing knowledge. Ingestion runs automatically at **06:00 and 18:00 daily** (`@Cron('0 6,18 * * *')`), pulling the last 12 hours of data for each configured workspace.

- `slack-ingest.cron.ts` — lists all bot-member channels, maps them to workspaces, calls `pullSlackData`
- `github-ingest.cron.ts` — queries `Workspace` table for `type=GITHUB`, calls `pullRepoPRs` (merged PRs only)
- `jira-ingest.cron.ts` — queries `Workspace` table for `type=JIRA`, calls `pullJiraIssues` (resolved issues)

Each source can be toggled independently from **Admin UI → System Settings**: `slackIngestionEnabled`, `repoIngestionEnabled`, `jiraIngestionEnabled`.

### ⚙️ Mode C: On-Demand Admin Sync

From the Admin UI, admins can trigger a targeted sync for a specific workspace at any time. This runs the same pull logic as the cron job but outside the scheduled window.

### 💬 Mode D: Slack app_mention → Jira Card Flow

When a user @-mentions the Must-IQ bot in Slack, the `POST /webhooks/slack` endpoint:

1. Detects the `app_mention` event
2. Fetches the Slack thread context
3. Calls `ChatService.chat()` (JSON API — same as integrations path)
4. Creates a Jira card with the AI-generated summary
5. Replies in the Slack thread with the Jira ticket link

This is a real-time interactive flow, separate from scheduled ingestion, and is intentionally kept as a push webhook.

> [!IMPORTANT]
> **Why Pull instead of Push for ingestion?**
> - **Cost & Noise**: We only ingest relevant data, avoiding the high cost of embedding every single message or commit across the company.

---

## 🔍 Backend Retrieval Flow

1. **PII Masking**: The query is scanned by `pii-masker.helper.ts`. If PII is detected, it is redacted and an audit log entry (`action: 'chat.pii_detected'`) is written. No audit entry is written for clean queries.
2. **Ticket-Tag Short-Circuit**: If the query contains structured ticket tags (`[Requester]`, `[Department]`, etc.), domain is set to `operations` immediately — no LLM classifier call.
3. **Domain Classifier**: A fast/cheap LLM call classifies the query into one of `{engineering, hr, it, operations, general}`. This selects the RAG prompt template and the embedding task type (`CODE_RETRIEVAL_QUERY` vs `RETRIEVAL_QUERY`).
4. **HyDE (optional)**: If `hydeEnabled`, the system generates a hypothetical answer document and embeds that instead of the raw query, improving semantic match quality.
5. **Hybrid Search (parallel)**:
   - `retrieveChunks()` — pgvector cosine similarity (dense), filtered to the user's selected team workspaces
   - `retrieveChunksKeyword()` — PostgreSQL BM25 `ts_rank` full-text search (sparse)
   - Results merged via `reciprocalRankFusion([dense, sparse], { K: 60 })` → topK=60 chunks
6. **Cross-Encoder Rerank**: `ms-marco-MiniLM-L-6-v2` (local ONNX via `@xenova/transformers`, ~90 MB) scores each chunk against the query and narrows to top-20.
7. **Context Builder**: Filters chunks below `MIN_SCORE=0.1`, deduplicates exact matches, enforces 6000-token budget.
8. **Generation**: Domain-specific prompt template + top-20 context chunks → LLM → answer streamed via SSE (web UI) or returned as JSON (integrations).
9. **Token Log**: Non-blocking `TokenLog` row written to PostgreSQL for visibility. No enforcement.

---

## 🔐 Key Integration Points

| Component | Responsibility | Location |
|---|---|---|
| **LangChain Lib** | Core RAG, Agent, and tool logic | `langchain/src/` |
| **Agent Builder** | Wires LLM + tools + prompt | `langchain/src/agent/agent.builder.ts` |
| **Agent Stream** | SSE `AsyncGenerator` for frontend | `langchain/src/agent/agent.stream.ts` |
| **AI Core** | Orchestrates the 5-stage RAG flow; manages memory | `langchain/src/service/` |
| **RAG Utilities** | HyDE, cross-encoder reranker, context builder | `langchain/src/rag/`, `langchain/src/utils/` |
| **API Gateway** | Auth, RBAC, PII masking, routing | `apps/api/` |
| **Settings Service** | LLM config + encrypted key management | `libs/config/src/settings.service.ts` |
| **PostgreSQL** | Relational data (Users/Teams/Sessions) + pgvector + BM25 | `libs/db/` |

---

## 🏷️ Team Model

Each **Team** consists of:
- A name (e.g., "API Infrastructure")
- Assigned integration sources: Jira · GitHub · Slack.
- **Shared Jira**: A single Jira workspace can be associated with multiple teams.
- **Unique Slack/GitHub**: Slack and GitHub sources are uniquely mapped 1:1 to a team.
- A set of assigned users.

The `General` workspace is shared across all users and always included in search.

**Admins** automatically have access to all teams' data. All other users only see chunks tagged to their assigned teams.
