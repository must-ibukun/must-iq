// ============================================================
// Must-IQ RAG Chain — LangChain
// Active LLM driven by settings (DB → .env fallback)
// No hardcoded provider imports — swap model from admin UI
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { createLLM } from '@must-iq/config';
import { getPromptForWorkspace, ENGINEERING_PROMPT } from '../prompts/must-iq-rag.prompt';
import * as dotenv from "dotenv";
import { resolveSearchScopes } from "../service/scope-resolution.helper";
dotenv.config();

// ---------------------------------------------------------------
// Build a workspace-scoped RAG chain
// Context is always pre-built by the engine via Prisma (retrieveChunks),
// so no VectorStore connection is needed here.
// ---------------------------------------------------------------
export async function buildRAGChain(rawWorkspaces: string[], taskType?: string, domain?: string) {
  // Resolve Team IDs into actual Workspace Identifiers
  const workspaces = await resolveSearchScopes(rawWorkspaces);

  const llm = await createLLM();

  // CODE-classified queries always get the engineering/report prompt
  // regardless of which workspace is selected.
  // If a domain was identified by the fast classifier, use it to select prompt.
  // Otherwise fall back to keyword matching on the workspace name.
  const primaryWorkspace = rawWorkspaces[0] || 'general';
  const isCodeQuery = taskType && taskType.toUpperCase().includes('CODE');
  const prompt = isCodeQuery
    ? ENGINEERING_PROMPT
    : getPromptForWorkspace(domain || primaryWorkspace);

  const chain = RunnableSequence.from([
    {
      // Context is always pre-built by runAIQuery; pass through directly.
      context: (input: { question: string; chat_history?: any[]; context?: string; image?: string }) =>
        input.context ?? "",
      question: (input: { question: string; chat_history?: any[]; context?: string; image?: string }) => {
        if (input.image) {
          return [
            { type: "text", text: input.question },
            { type: "image_url", image_url: { url: input.image } }
          ];
        }
        return input.question;
      },
      chat_history: (input: { question: string; chat_history?: any[]; context?: string; image?: string }) => input.chat_history ?? [],
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
