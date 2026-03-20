export const SYSTEM_SETTINGS_DESCRIPTIONS = {
  RESPONSE_CACHING: 'LLM calls with large context windows are slow and expensive. Caching identical or highly-similar queries for an hour will massively speed up the app and slash your provider bills down by 30-50%. Highly recommended for common questions.',
  AUDIT_LOGGING: "Critical for enterprise companies plugging into Slack, GitHub, and Jira. Provides a strict audit trail of who asked the AI a question, what it retrieved, and its final answer. Invaluable if the AI hallucinates or leaks info, proving exactly what happened.",
  PII_MASKING: 'Runs all user queries through a fast redaction engine to instantly scrub sensitive data (emails, phone numbers, API keys, SSNs) before they ever leave your server to reach OpenAI or Anthropic.',
  GLOBAL_DAILY_TOKEN_CAP: "Hard stop all AI features if the entire system exceeds this number of tokens in a single day. This is a crucial financial fail-safe that prevents massive overnight API bills if a script goes rogue or usage unexpectedly spikes.",
  BASE_USER_DAILY_BUDGET: "The global fallback token limit applied to all standard users per day. This restricts individuals from arbitrarily burning through tokens on massive, unstructured queries.",
};
