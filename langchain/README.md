# Must-IQ AI Engine
## Internal Knowledge Intelligence powered by LangChain + LangGraph

The **Must-IQ AI Engine** is a specialized library within the Must-IQ monorepo that handles all AI orchestration, RAG (Retrieval-Augmented Generation), and agentic workflows. It is provider-agnostic — switching between OpenAI, Anthropic, Gemini, xAI Grok, or local Ollama requires only an Admin UI change.

---

## 🏗️ Architecture at a Glance

For a detailed look at how data moves from raw files into the knowledge base and out through the chat interface, see:
👉 **[Full-Stack AI Flow Documentation](../doc/ai_ingestion_flow.md)**
👉 **[LangChain Solution Design](../doc/langchain-solution-design.md)**

---

## 🧩 Key Components

| Feature | Implementation | Source |
|---|---|---|
| **RAG Retrieval** | `PGVectorStore` (Postgres + pgvector) | `src/chains/rag-chain.ts` |
| **Conversational Chain** | LCEL pipe + `RunnableWithMessageHistory` | `src/chains/conversational-chain.ts` |
| **System Prompts** | Centralized, descriptive templates | `src/prompts/` |
| **Agent Builder** | Configures LangGraph ReAct + tools | `src/agent/agent.builder.ts` |
| **Agent Runner** | Single-turn, non-streaming response | `src/agent/agent.runner.ts` |
| **Agent Stream** | SSE streaming via `AsyncGenerator` | `src/agent/agent.stream.ts` |
| **Agent Types** | `AgentStreamEvent` union type | `src/agent/agent.types.ts` |
| **Memory** | Per-user/session chat history | `src/memory/session-memory.ts` |
| **Integrations** | Jira, Slack, GitHub, Confluence | `src/tools/internal-tools.ts` |

---

## 🛠️ Project Structure

```text
langchain/
└── src/
    ├── agent/             ← LangGraph ReAct agent (split into focused files)
    │   ├── agent.builder.ts   ← buildMustIQAgent() — creates the full agent
    │   ├── agent.runner.ts    ← runAgent() — non-streaming (jobs/tests/CLI)
    │   ├── agent.stream.ts    ← runAgentStream() — SSE streaming for frontend
    │   ├── agent.types.ts     ← AgentStreamEvent discriminated union
    │   └── index.ts           ← Barrel: re-exports all of the above
    ├── chains/            ← Pre-built RAG and conversational pipelines
    ├── memory/            ← Conversation history management  
    ├── prompts/           ← System & human prompt templates
    ├── rag/               ← Document ingestion (PDF/DOCX/TXT)
    ├── tools/             ← External platform integrations
    └── index.ts           ← Main library entry point
```

---

```typescript
import { buildMustIQAgent, runAgent, runAgentStream } from '@must-iq/langchain/agent';
```

---

## 🤖 Agent Event Types

`runAgentStream` yields `AgentStreamEvent` values:

```typescript
type AgentStreamEvent =
  | { type: 'thinking';  content: string }                              // LLM composing
  | { type: 'tool_call'; toolName: string; isExternal: boolean;         // tool invoked
      isIngest: boolean; content: string }
  | { type: 'done';      toolsUsed: string[]; tokensUsed: number }      // all done
  | { type: 'error';     content: string };                             // failure
```

---

## 🚀 Technical Advantages

### 1. Vector Search (PGVector)
Instead of a separate vector database, we use your existing **PostgreSQL** instance with the `pgvector` extension — data and vectors in one place, zero extra ops burden.

### 2. Provider Flexibility
The active LLM is driven entirely by the DB settings row — no code change needed:

```typescript
const llm = await createLLM({ maxTokens: 4096 }); // reads from DB + falls back to .env
```

Supported providers: **Anthropic Claude, OpenAI GPT, Google Gemini, xAI Grok, Ollama (local)**.

### 3. Agentic Ingestion
Must-IQ's agent can actively **discover** information in Jira or Slack and **persist** it back into the internal knowledge base for the rest of the team to benefit from. External sources are always READ-ONLY — the agent never creates tickets or posts messages.

### 4. Team-Scoped Retrieval
Every RAG retrieval is scoped to the requesting user's **team workspaces**. Users select which team/integration sources to search in the sidebar scope selector. The `General` scope is always included.

Workspace integration sources use a **unified `identifier` field** (Slack channel ID, GitHub repo full name, or Jira project key). The `type` enum (`SLACK | GITHUB | JIRA`) differentiates them.

### 🏷️ Supported Content Layers
- **Blockchain**: Solidity contracts & Web3 logic
- **Serverless**: AWS Lambda & Function-as-a-Service code
- **Crawler**: Web scrapers & automation scripts
- **Infrastructure**: IAC (Terraform/CloudFormation)
- **Core**: Frontend (React) & Backend (NestJS)

---

```bash
# Ingest a document (using the core library test script)
nx run langchain:ingest -- --file ./docs/policy.pdf --workspace hr

# Run a test query
nx run langchain:test-query -- --query "What is our remote work policy?"
```
