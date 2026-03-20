// ============================================================
// Must-IQ RAG Chain — LangChain
// Active LLM driven by settings (DB → .env fallback)
// No hardcoded provider imports — swap model from admin UI
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { createLLM } from "@must-iq/config";
import { getPromptForWorkspace } from "../prompts/must-iq-rag.prompt";
import * as dotenv from "dotenv";
import { resolveSearchScopes } from "../service/scope-resolution.helper";
dotenv.config();

// ---------------------------------------------------------------
// Build a workspace-scoped RAG chain
// Context is always pre-built by the engine via Prisma (retrieveChunks),
// so no VectorStore connection is needed here.
// ---------------------------------------------------------------
export async function buildRAGChain(rawWorkspaces: string[]) {
  // Resolve Team IDs into actual Workspace Identifiers
  const workspaces = await resolveSearchScopes(rawWorkspaces);

  const llm = await createLLM();

  // Use primary workspace for prompt selection (first item in array or fallback)
  const primaryWorkspace = rawWorkspaces[0] || "general";
  const prompt = getPromptForWorkspace(primaryWorkspace);

  const chain = RunnableSequence.from([
    {
      // Context is always pre-built by runAIQuery; pass through directly.
      context: (input: { question: string; chat_history?: any[]; context?: string }) =>
        input.context ?? "",
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
