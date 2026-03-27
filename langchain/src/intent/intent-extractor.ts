// ============================================================
// Must-IQ — Rich Intent Extractor
//
// Runs ONE fast LLM call before embedding to extract structured
// intent from the raw query. The enriched_query field closes the
// vocabulary gap between natural language and stored code/docs.
//
// Example:
//   raw:      "CS team needs inquiry access"
//   enriched: "grant CS team inquiry.show inquiry.create permissions
//              MSQ Admin platform users roleValidationMiddleware"
// ============================================================

import { createFastClassifierLLM } from '@must-iq/config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { COMBINED_INTENT_PROMPT } from '../prompts/must-iq-classifier.prompt';

// ── Types ────────────────────────────────────────────────────

export type IntentDomain = 'engineering' | 'operations' | 'hr' | 'it' | 'general';

export type IntentIssueType =
  | 'permission_request'
  | 'bug'
  | 'how_to'
  | 'status_check'
  | 'data_request'
  | 'feature_request'
  | 'other';

export interface ExtractedIntent {
  domain: IntentDomain;
  issue_type: IntentIssueType;
  /** Specific systems, modules, or features mentioned or implied (max 5). */
  resources: string[];
  /** People, teams, or roles involved (max 3). */
  actors: string[];
  /** Core action verb phrase: "grant access", "fix bug", "explain policy", etc. */
  action: string;
  /**
   * Technical rewrite of the query using precise system terminology.
   * This is what gets embedded — bridges casual language → code vocabulary.
   * Falls back to the original query if LLM output is unusable.
   */
  enriched_query: string;
}

// ── Constants ────────────────────────────────────────────────

const VALID_DOMAINS: IntentDomain[] = ['engineering', 'operations', 'hr', 'it', 'general'];

const VALID_ISSUE_TYPES: IntentIssueType[] = [
  'permission_request',
  'bug',
  'how_to',
  'status_check',
  'data_request',
  'feature_request',
  'other',
];

// ── Helpers ──────────────────────────────────────────────────

/**
 * Validates and sanitizes raw LLM JSON output into a typed ExtractedIntent.
 * Any field that fails validation falls back to a safe default.
 */
function sanitizeIntent(raw: any, originalQuery: string): ExtractedIntent {
  const domain: IntentDomain = VALID_DOMAINS.includes(raw?.domain)
    ? raw.domain
    : 'general';

  const issue_type: IntentIssueType = VALID_ISSUE_TYPES.includes(raw?.issue_type)
    ? raw.issue_type
    : 'other';

  const resources: string[] = Array.isArray(raw?.resources)
    ? raw.resources.filter((r: unknown) => typeof r === 'string' && r.length > 0).slice(0, 5)
    : [];

  const actors: string[] = Array.isArray(raw?.actors)
    ? raw.actors.filter((a: unknown) => typeof a === 'string' && a.length > 0).slice(0, 3)
    : [];

  const action: string =
    typeof raw?.action === 'string' && raw.action.length > 0 ? raw.action : 'answer';

  // enriched_query must be a non-empty string; fall back to original query if not.
  const enriched_query: string =
    typeof raw?.enriched_query === 'string' && raw.enriched_query.trim().length > 0
      ? raw.enriched_query.trim()
      : originalQuery;

  return { domain, issue_type, resources, actors, action, enriched_query };
}

/**
 * Extracts a JSON object from a raw LLM string.
 * Handles models that wrap output in markdown code fences or add conversational preamble.
 */
function extractJSON(raw: string): string | null {
  // Direct JSON parse attempt first (ideal case)
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;

  // Extract first {...} block — handles markdown wrapping and preamble
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// ── Main Export ──────────────────────────────────────────────

/**
 * Extracts structured intent from a user query using a fast LLM call.
 *
 * Returns a fully typed ExtractedIntent. Never throws — all errors
 * produce a safe fallback with enriched_query = originalQuery.
 *
 * @param query    The raw user query string
 * @param settings Active settings object (provides LLM config)
 */
export async function extractIntent(query: string, settings: any): Promise<ExtractedIntent> {
  const fallback: ExtractedIntent = {
    domain: 'general',
    issue_type: 'other',
    resources: [],
    actors: [],
    action: 'answer',
    enriched_query: query,
  };

  try {
    const classifier = await createFastClassifierLLM(settings);

    const result = await classifier.invoke([
      new SystemMessage(COMBINED_INTENT_PROMPT),
      new HumanMessage(query),
    ]);

    const raw = result.content as string;
    const jsonStr = extractJSON(raw);

    if (!jsonStr) {
      console.warn('Intent extractor: no JSON object found in LLM output. Using fallback.');
      console.warn(`  LLM raw output: "${raw.substring(0, 120)}..."`);
      return fallback;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('Intent extractor: JSON.parse failed. Using fallback.');
      console.warn(`  Extracted JSON string: "${jsonStr.substring(0, 120)}..."`);
      return fallback;
    }

    const intent = sanitizeIntent(parsed, query);

    console.log(
      `Intent extractor: domain="${intent.domain}" type="${intent.issue_type}" ` +
      `action="${intent.action}" resources=[${intent.resources.join(', ')}] ` +
      `actors=[${intent.actors.join(', ')}]`
    );
    console.log(`Intent extractor: enriched_query="${intent.enriched_query.substring(0, 120)}"`);

    return intent;
  } catch (err: any) {
    console.warn(`Intent extractor: LLM call failed (${err.message}). Using fallback.`);
    return fallback;
  }
}
