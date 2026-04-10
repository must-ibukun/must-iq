// ============================================================
// Must-IQ — HyDE (Hypothetical Document Embedding)
// Generates a synthetic code/doc snippet that "looks like"
// the answer to the user query, then embeds that instead.
// This bridges the vocabulary gap between natural-language
// queries and code-heavy vector stores.
// ============================================================

import { createUtilityLLM } from "@must-iq/config";
import { Logger } from "@nestjs/common";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const logger = new Logger("HyDE");

const HYDE_SYSTEM_PROMPT = `You are a code generation assistant for a developer knowledge base search engine.

Given a USER QUERY, generate a realistic code snippet or documentation excerpt that would DIRECTLY ANSWER the query. This is used purely as a search query to find real code — so the snippet does not need to be 100% correct, it just needs to use the right vocabulary, function names, and patterns that would appear in a real codebase.

Rules:
- Output ONLY the code or documentation text, no explanation or markdown fences.
- Use realistic variable names, function signatures, and patterns.
- Length: 5–20 lines max.
- Match the appropriate language or format for the query.`;

/**
 * Generates a hypothetical code/document snippet that answers the query.
 * Used to embed a code-like representation of the query instead of raw natural language,
 * dramatically improving retrieval when the corpus is code-heavy.
 *
 * @param query     The original user natural language query
 * @param taskType  Optional task type (CODE, GENERAL) to hint the generation style
 * @returns A string containing a realistic hypothetical code/doc snippet
 */
export async function generateHypotheticalDocument(
  query: string,
  taskType?: string,
): Promise<string> {
  try {
    const llm = await createUtilityLLM();

    const styleHint = taskType === 'CODE_RETRIEVAL_QUERY'
      ? 'Generate a TypeScript/JavaScript code snippet.'
      : 'Generate a concise documentation excerpt or code snippet.';

    const response = await llm.invoke([
      new SystemMessage(HYDE_SYSTEM_PROMPT),
      new HumanMessage(`${styleHint}\n\nUSER QUERY:\n${query}`),
    ]);

    const hypothetical = (response.content as string).trim();

    // Guard against empty / clearly wrong responses — fall back to raw query
    if (!hypothetical || hypothetical.length < 10) {
      logger.warn(`HyDE returned empty/short result for query: "${query.slice(0, 60)}...". Falling back to raw query.`);
      return query;
    }

    return hypothetical;
  } catch (err: any) {
    // Never block retrieval because of HyDE failure — just use the raw query
    logger.warn(`HyDE generation failed: ${err.message}. Falling back to raw query.`);
    return query;
  }
}
