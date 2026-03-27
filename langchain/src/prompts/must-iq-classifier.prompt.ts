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
  "Classify this message into exactly ONE word from: engineering, hr, it, operations, general.\n\n" +
  "engineering = code bugs, features, architecture, mobile, backend, frontend, scripts, CI/CD, deployments, pull requests, build errors.\n" +
  "hr = leave, policy, benefits, payroll, recruitment, onboarding, performance review, contract.\n" +
  "it = laptop, device, password reset, software access, helpdesk, VPN, account provisioning, wifi, printer.\n" +
  "operations = account reset, data export, refund, revoke, bulk update, buyback, transaction, approval, abuse case, status check, admin request.\n" +
  "general = company policy questions, general knowledge, or anything that does not clearly fit the above.\n\n" +
  "Examples:\n" +
  "\"TypeError in the payment handler\" → engineering\n" +
  "\"Reset John's account password\" → it\n" +
  "\"My leave balance is incorrect\" → hr\n" +
  "\"Verify if user 12345 was refunded\" → operations\n" +
  "\"Fix the null pointer in checkout service\" → engineering\n" +
  "\"What are our data retention policies?\" → general\n\n" +
  "Output ONLY the single word, lowercase, no punctuation.";

/**
 * Static map: domain classifier output → taskType for embedding model selection.
 * - CODE_RETRIEVAL_QUERY → use code-optimized embedding model
 * - RETRIEVAL_QUERY      → use standard text embedding model
 */
export const DOMAIN_TO_TASK_TYPE: Record<string, string> = {
  engineering: 'CODE_RETRIEVAL_QUERY',
  operations:  'RETRIEVAL_QUERY',   // operational queries are natural language, not code
  hr:          'RETRIEVAL_QUERY',
  it:          'RETRIEVAL_QUERY',
  general:     'RETRIEVAL_QUERY',
};

