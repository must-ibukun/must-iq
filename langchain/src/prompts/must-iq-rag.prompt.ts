// ============================================================
// Must-IQ Prompt Templates — LangChain
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

import { MUST_IQ_RAG_GENERAL_PROMPT } from "./must-iq-rag-general.prompt";
import { MUST_IQ_RAG_HR_PROMPT } from "./must-iq-rag-hr.prompt";
import { MUST_IQ_RAG_IT_PROMPT } from "./must-iq-rag-it.prompt";

// Standard RAG prompt — used in rag-chain.ts
export const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", MUST_IQ_RAG_GENERAL_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

// HR-specific prompt — more empathetic tone
export const HR_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", MUST_IQ_RAG_HR_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

// IT helpdesk prompt — technical, step-by-step
export const IT_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", MUST_IQ_RAG_IT_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

// Select prompt based on workspace
export function getPromptForWorkspace(workspace: string): ChatPromptTemplate {
  switch (workspace) {
    case "hr": return HR_PROMPT;
    case "it": return IT_PROMPT;
    default: return RAG_PROMPT;
  }
}
