import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { createLLM } from '@must-iq/config';
import { getPrompt, getPromptForWorkspace, ENGINEERING_PROMPT } from '../prompts/must-iq-rag.prompt';
import type { IntentIssueType, IntentDomain } from '../intent/intent-extractor';
import * as dotenv from "dotenv";
dotenv.config();

// Receives pre-resolved workspace identifiers from ai-engine (no second DB lookup needed).
export async function buildRAGChain(
  resolvedWorkspaces: string[],
  taskType?: string,
  domain?: string,
  issueType?: string,
) {
  const llm = await createLLM();

  const primaryWorkspace = resolvedWorkspaces[0] || 'general';
  const isCodeQuery = taskType && taskType.toUpperCase().includes('CODE');

  // issue_type-first routing: sharper signal than domain alone.
  // Falls back to workspace-name keyword matching when intent extraction was skipped.
  const prompt = isCodeQuery
    ? ENGINEERING_PROMPT
    : issueType && domain
      ? getPrompt(issueType as IntentIssueType, domain as IntentDomain)
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
