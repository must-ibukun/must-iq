// ============================================================
// Must-IQ Classifier Prompts — Fast Intent & Domain Classification
// Used by the AI engine before the main RAG chain runs
// ============================================================

/**
 * Domain classifier prompt — outputs a single word indicating
 * which department/domain a user message belongs to.
 * Used to dynamically select the correct RAG prompt template.
 */
export const DOMAIN_CLASSIFIER_PROMPT =
  "Classify this message into exactly ONE word from: engineering, hr, it, operations, general.\n" +
  "engineering = code bugs, features, architecture, mobile, backend, frontend.\n" +
  "hr = leave, policy, benefits, payroll, recruitment, onboarding.\n" +
  "it = laptop, access, password, setup, infrastructure, helpdesk.\n" +
  "operations = account reset, data export, excel report, status check, refund, revoke.\n" +
  "general = anything else.\n" +
  "Output ONLY the single word, lowercase, no punctuation.";

/**
 * Static map: domain classifier output → taskType for embedding model selection.
 * - CODE_RETRIEVAL_QUERY → use code-optimized embedding model
 * - RETRIEVAL_QUERY      → use standard text embedding model
 */
export const DOMAIN_TO_TASK_TYPE: Record<string, string> = {
  engineering: 'CODE_RETRIEVAL_QUERY',
  operations:  'CODE_RETRIEVAL_QUERY',
  hr:          'RETRIEVAL_QUERY',
  it:          'RETRIEVAL_QUERY',
  general:     'RETRIEVAL_QUERY',
};

