// ============================================================
// Must-IQ Prompt Templates — LangChain
// ============================================================

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

import { MUST_IQ_RAG_GENERAL_PROMPT } from './must-iq-rag-general.prompt';
import { MUST_IQ_RAG_HR_PROMPT } from './must-iq-rag-hr.prompt';
import { MUST_IQ_RAG_IT_PROMPT } from './must-iq-rag-it.prompt';
import { MUST_IQ_RAG_ENGINEERING_PROMPT } from './must-iq-rag-engineering.prompt';
import type { IntentIssueType, IntentDomain } from '../intent/intent-extractor';

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

/**
 * Primary prompt router — issue_type drives the format, domain breaks ties.
 *
 * issue_type is a sharper signal than domain: the LLM is more confident
 * about *what someone wants* than *which department owns it*.
 *
 * Routing table:
 *   bug / incident / feature_request              → ENGINEERING_PROMPT
 *   permission_request / approval_request /
 *     status_check / data_request                 → ENGINEERING_PROMPT
 *   how_to  + domain hr                           → HR_PROMPT
 *   how_to  + domain engineering                  → ENGINEERING_PROMPT
 *   how_to  + domain operations/general           → IT_PROMPT (step-by-step)
 *   policy_lookup + domain hr                     → HR_PROMPT
 *   policy_lookup + any other domain              → RAG_PROMPT
 *   other                                         → RAG_PROMPT
 */
export function getPrompt(issueType: IntentIssueType, domain: IntentDomain): ChatPromptTemplate {
  switch (issueType) {
    case 'bug':
    case 'incident':
    case 'feature_request':
    case 'permission_request':
    case 'approval_request':
    case 'status_check':
    case 'data_request':
      return ENGINEERING_PROMPT;

    case 'how_to':
      if (domain === 'hr') return HR_PROMPT;
      if (domain === 'engineering') return ENGINEERING_PROMPT;
      return IT_PROMPT; // operations / general → step-by-step helpdesk format

    case 'policy_lookup':
      return domain === 'hr' ? HR_PROMPT : RAG_PROMPT;

    default:
      return RAG_PROMPT;
  }
}

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
