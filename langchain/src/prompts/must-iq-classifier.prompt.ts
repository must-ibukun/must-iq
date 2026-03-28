// ============================================================
// Must-IQ Classifier Prompts — Fast Intent & Domain Classification
// Used by the AI engine before the main RAG chain runs
// ============================================================

/**
 * Domain classifier prompt — outputs a single word indicating
 * which department/domain a user message belongs to.
 * Used to dynamically select the correct RAG prompt template.
 * Kept as fallback for the ticket-tag short-circuit path.
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
 * Combined intent + domain classifier prompt.
 * Replaces the single-word domain classifier with a richer structured output.
 *
 * One LLM call produces:
 *   - domain       → selects RAG prompt template + embedding task type
 *   - issue_type   → tells reranker what kind of answer is expected
 *   - resources    → keyword boost terms for BM25 sparse retrieval
 *   - actors       → who is involved (teams, roles, users)
 *   - action       → core verb phrase (grant, fix, view, explain)
 *   - enriched_query → technical rewrite that bridges natural language → code vocabulary
 *
 * The enriched_query is embedded instead of the raw query, closing the semantic
 * gap between casual language ("CS team needs inquiry access") and the stored
 * code/doc vocabulary ("inquiry.show roleValidationMiddleware permissionKeys").
 */
export const COMBINED_INTENT_PROMPT =
  'You are an enterprise AI assistant router. Analyze the user message and output a JSON object.\n\n' +

  'Fields:\n' +
  '- domain: one of [engineering, operations, hr, it, general]\n' +
  '- issue_type: one of [permission_request, bug, incident, how_to, status_check, data_request, feature_request, approval_request, policy_lookup, other]\n' +
  '- resources: array of specific systems, modules, or features mentioned or implied (max 5 strings)\n' +
  '- actors: array of people, teams, or roles involved (max 3 strings, empty array if none)\n' +
  '- action: the core action verb phrase (e.g. "grant access", "fix bug", "view data", "explain policy")\n' +
  '- enriched_query: a technical rewrite of the query using precise system terminology that would match code, docs, or config\n\n' +

  'Domain definitions:\n' +
  '- engineering: code, bugs, features, architecture, mobile, backend, frontend, CI/CD, deployments, build errors\n' +
  '- hr: leave, policy, benefits, payroll, recruitment, onboarding, performance review, contract\n' +
  '- it: laptop, device, password reset, software access, helpdesk, VPN, account provisioning, wifi\n' +
  '- operations: permissions, account reset, data export, refund, revoke, bulk update, transaction, approval, admin requests\n' +
  '- general: company policy questions, general knowledge\n\n' +

  'Examples:\n\n' +

  'Input: "CS team needs access to admin panel for 1:1 inquiry tasks"\n' +
  'Output: {"domain":"operations","issue_type":"permission_request","resources":["inquiry","admin panel","role permissions","platform users"],"actors":["CS team"],"action":"grant access","enriched_query":"grant CS team inquiry.show inquiry.create permissions MSQ Admin platform users role management roleValidationMiddleware permissionKeys"}\n\n' +

  'Input: "can we give correct permission to handle photo replacement and inquiry"\n' +
  'Output: {"domain":"operations","issue_type":"permission_request","resources":["inquiry","photo replacement","admin permissions","roles_v2"],"actors":["CS team"],"action":"grant access","enriched_query":"grant inquiry.show inquiry.create photo upload permissions admin user roles_v2 platform users management"}\n\n' +

  'Input: "TypeError in the payment handler on checkout"\n' +
  'Output: {"domain":"engineering","issue_type":"bug","resources":["payment handler","checkout service"],"actors":[],"action":"fix bug","enriched_query":"TypeError exception payment handler checkout service JavaScript error stack trace debug"}\n\n' +

  'Input: "How do I reset a user account password?"\n' +
  'Output: {"domain":"it","issue_type":"how_to","resources":["user account","password reset","admin panel"],"actors":["user"],"action":"reset password","enriched_query":"reset user password account management admin panel steps procedure guide"}\n\n' +

  'Input: "What is the leave policy for remote employees?"\n' +
  'Output: {"domain":"hr","issue_type":"how_to","resources":["leave policy","remote work policy"],"actors":["remote employees"],"action":"explain policy","enriched_query":"leave policy remote employees annual leave sick leave HR policy documentation rules"}\n\n' +

  'Input: "Verify if transaction #12345 was refunded"\n' +
  'Output: {"domain":"operations","issue_type":"status_check","resources":["transaction","refund","payment system"],"actors":[],"action":"verify status","enriched_query":"transaction refund status check transaction ID payment history verification audit"}\n\n' +

  'Input: "Fix the null pointer in checkout service"\n' +
  'Output: {"domain":"engineering","issue_type":"bug","resources":["checkout service","null pointer exception"],"actors":[],"action":"fix bug","enriched_query":"NullPointerException null reference checkout service function call stack trace fix"}\n\n' +

  'Input: "Payment service is down, users can\'t complete checkout"\n' +
  'Output: {"domain":"engineering","issue_type":"incident","resources":["payment service","checkout"],"actors":["users"],"action":"investigate outage","enriched_query":"payment service outage down incident production checkout failure error logs runbook on-call"}\n\n' +

  'Input: "Can you approve my annual leave request for next week?"\n' +
  'Output: {"domain":"hr","issue_type":"approval_request","resources":["leave request","annual leave","HR approval workflow"],"actors":["manager"],"action":"approve leave","enriched_query":"annual leave approval request workflow manager sign-off HR policy leave balance"}\n\n' +

  'Input: "What is our data retention policy for customer records?"\n' +
  'Output: {"domain":"general","issue_type":"policy_lookup","resources":["data retention policy","customer records","compliance"],"actors":[],"action":"lookup policy","enriched_query":"data retention policy customer records duration compliance GDPR storage rules documentation"}\n\n' +

  'Output ONLY valid JSON on a single line. No markdown, no code blocks, no explanation.';

/**
 * Static map: domain classifier output → taskType for embedding model selection.
 * - CODE_RETRIEVAL_QUERY → use code-optimized embedding model
 * - RETRIEVAL_QUERY      → use standard text embedding model
 */
export const DOMAIN_TO_TASK_TYPE: Record<string, string> = {
  engineering: 'CODE_RETRIEVAL_QUERY',
  operations:  'RETRIEVAL_QUERY',
  hr:          'RETRIEVAL_QUERY',
  it:          'RETRIEVAL_QUERY',
  general:     'RETRIEVAL_QUERY',
};

