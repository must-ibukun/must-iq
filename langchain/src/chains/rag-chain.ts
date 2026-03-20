// ============================================================
// Must-IQ RAG Chain — LangChain + PGVectorStore
// Active LLM driven by settings (DB → .env fallback)
// No hardcoded provider imports — swap model from admin UI
// ============================================================

import { VectorStore } from "@langchain/core/vectorstores";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { createLLM, createEmbeddings, createVectorStore } from "@must-iq/config";
import { getActiveSettings } from "@must-iq/config";
import { getPromptForWorkspace } from "../prompts/must-iq-rag.prompt";
import * as dotenv from "dotenv";
import { resolveSearchScopes } from "../service/scope-resolution.helper";
dotenv.config();

// VectorStore initialised lazily so it reads current settings
let _vectorStore: VectorStore | null = null;

async function getVectorStore(): Promise<VectorStore> {
  if (_vectorStore) return _vectorStore;
  _vectorStore = await createVectorStore();
  return _vectorStore;
}

// ---------------------------------------------------------------
// Build a workspace-scoped RAG chain
// LLM is resolved from active settings — NOT hardcoded
// ---------------------------------------------------------------
export async function buildRAGChain(rawWorkspaces: string[]) {
  // Resolve Team IDs into actual Workspace Identifiers for Vector DB filtering
  const workspaces = await resolveSearchScopes(rawWorkspaces);

  const [llm, vectorStore] = await Promise.all([
    createLLM(),                 // ← reads provider + model from DB settings
    getVectorStore(),
  ]);

  const retriever = vectorStore.asRetriever({
    k: 5,
    filter: { workspace: { in: workspaces } },
  });

  // Use primary workspace for prompt selection (first item in array or fallback)
  const primaryWorkspace = rawWorkspaces[0] || "general";
  const prompt = getPromptForWorkspace(primaryWorkspace);

  const chain = RunnableSequence.from([
    {
      context: (input: { question: string; chat_history?: any[]; context?: string }) =>
        input.context || retriever.invoke(input.question).then((docs) => docs.map(d =>
          `[Layer: ${(d.metadata.layer || 'docs').toUpperCase()}] [Source: ${d.metadata.source || 'unknown'}] [Team: ${d.metadata.workspace || 'general'}]\n${d.pageContent}`
        ).join("\n\n---\n\n")),
      question: (input: { question: string; chat_history?: any[]; context?: string }) => input.question,
      chat_history: (input: { question: string; chat_history?: any[]; context?: string }) => input.chat_history ?? [],
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}

// ---------------------------------------------------------------
// Convenience: stream response from RAG chain
// ---------------------------------------------------------------
export async function streamRAGResponse(
  question: string,
  workspaces: string[],
  chatHistory: any[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const chain = await buildRAGChain(workspaces);

  for await (const chunk of await chain.stream({ question, chat_history: chatHistory })) {
    onChunk(chunk);
  }
}


