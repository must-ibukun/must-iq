// ============================================================
// Must-IQ — Cross-Encoder Reranker
// Uses ms-marco-MiniLM-L-6-v2 via @xenova/transformers (ONNX, CPU)
// Runs locally — no external API call, no extra cost.
//
// Flow: RRF pool (up to topK) → cross-encoder scores → top-N returned
// ============================================================

import { Logger } from '@nestjs/common';
import { DocumentChunk } from '@must-iq/db';

const logger = new Logger('Reranker');

// @xenova/transformers is ESM-only and cannot be loaded via webpack's require() shim.
// new Function bypasses webpack's static analysis so Node.js executes a real import()
// at runtime, resolving the ESM package from node_modules directly.
// Initiated at module load so ESM resolution starts in parallel with app startup.
const _esmImport = new Function('s', 'return import(s)');
const transformersPromise: Promise<any> = _esmImport('@xenova/transformers');

// Model singleton — loaded once on first use, kept resident in memory (~120 MB RAM)
let _rerankerPipeline: any = null;

async function getReranker() {
  if (!_rerankerPipeline) {
    const { pipeline } = await transformersPromise;
    logger.log('Loading ms-marco-MiniLM-L-6-v2 cross-encoder (first run downloads ~90 MB)...');
    _rerankerPipeline = await pipeline(
      'text-classification',
      'Xenova/ms-marco-MiniLM-L-6-v2',
    );
    logger.log('Cross-encoder loaded and cached.');
  }
  return _rerankerPipeline;
}

/**
 * Reranks chunks using a cross-encoder (ms-marco-MiniLM-L-6-v2).
 * Returns the top-N most relevant chunks sorted by cross-encoder score.
 *
 * Falls back to returning the first topN chunks (by RRF score) if inference fails.
 *
 * @param query     The original user query
 * @param chunks    RRF-merged candidate pool
 * @param topN      Number of top chunks to return (default 20)
 */
export async function rerank(
  query: string,
  chunks: DocumentChunk[],
  topN = 20,
): Promise<DocumentChunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= topN) return chunks;

  try {
    const reranker = await getReranker();

    // Truncate passage to 512 chars — cross-encoder max sequence is 512 tokens
    const pairs = chunks.map((c) => ({
      text: query,
      text_pair: c.content.slice(0, 512),
    }));

    const scores: { score: number; label: string }[] = await reranker(pairs, {
      truncation: true,
    });

    logger.debug(`Reranker scored ${chunks.length} chunks. Returning top-${topN}.`);

    return chunks
      .map((chunk, i) => ({ ...chunk, score: scores[i].score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  } catch (err: any) {
    logger.warn(`Cross-encoder reranking failed: ${err.message}. Falling back to RRF order.`);
    return chunks.slice(0, topN);
  }
}
