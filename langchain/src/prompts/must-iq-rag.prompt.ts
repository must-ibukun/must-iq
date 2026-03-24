// ============================================================
// Must-IQ Prompt Templates — LangChain
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

import { MUST_IQ_RAG_GENERAL_PROMPT } from './must-iq-rag-general.prompt';
import { MUST_IQ_RAG_HR_PROMPT } from './must-iq-rag-hr.prompt';
import { MUST_IQ_RAG_IT_PROMPT } from './must-iq-rag-it.prompt';
import { MUST_IQ_RAG_ENGINEERING_PROMPT } from './must-iq-rag-engineering.prompt';

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

// Engineering / Code — structured report and annotated code answers
export const ENGINEERING_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', MUST_IQ_RAG_ENGINEERING_PROMPT],
  new MessagesPlaceholder('chat_history'),
  ['human', "{question}\n\n=== CRITICAL REMINDER ===\nYou MUST output your response strictly using the exact Markdown format matching the category of this request (e.g., Operational / Admin Request, Debug Request) as defined in your System Prompt. Under no circumstances should you reply with casual conversation or ignore the mandated markdown headers."],
]);

// Select prompt based on workspace name or domain classifier output
export function getPromptForWorkspace(workspace: string): ChatPromptTemplate {
  const ws = workspace.toLowerCase();
  
  // --- Direct domain classifier word matches (highest priority) ---
  if (ws === 'hr' || ws.includes('hr') || ['payroll','leave','benefits','recruitment','onboarding','people','policy'].some(k => ws.includes(k))) {
    return HR_PROMPT;
  }
  if (ws === 'it' || ['helpdesk','support','infrastructure','devops','access','ticket','setup'].some(k => ws.includes(k))) {
    return IT_PROMPT;
  }
  // 'operations' domain → Engineering prompt (uses Operational Request format)
  if (ws === 'operations' || ['reset','revoke','export','excel','bulk','transfer'].some(k => ws.includes(k))) {
    return ENGINEERING_PROMPT;
  }
  // Engineering-type workspaces
  if (['engineering', 'mobile', 'admin', 'platform', 'security', 'code', 'backend', 'frontend', 'api', 'app'].some(k => ws.includes(k))) {
    return ENGINEERING_PROMPT;
  }
  return RAG_PROMPT;
}
