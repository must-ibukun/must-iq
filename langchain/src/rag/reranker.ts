import { Logger } from '@nestjs/common';
import { DocumentChunk } from '@must-iq/db';

const logger = new Logger('Reranker');

// @xenova/transformers is ESM-only and cannot be loaded via webpack's require() shim.
// new Function bypasses webpack's static analysis so Node.js executes a real import()
// at runtime, resolving the ESM package from node_modules directly.
// Import is deferred to first use (inside getReranker) so a native ONNX crash
// does not kill the process at startup — native SIGSEGV bypasses JS .catch().
const _esmImport = new Function('s', 'return import(s)');

// Model singleton — loaded once on first use, kept resident in memory (~120 MB RAM)
let _rerankerPipeline: any = null;
let _rerankerUnavailable = false;

async function getReranker() {
  if (_rerankerUnavailable) return null;
  if (!_rerankerPipeline) {
    try {
      const mod = await _esmImport('@xenova/transformers');
      if (!mod) { _rerankerUnavailable = true; return null; }
      logger.log('Loading ms-marco-MiniLM-L-6-v2 cross-encoder (first run downloads ~90 MB)...');
      _rerankerPipeline = await mod.pipeline(
        'text-classification',
        'Xenova/ms-marco-MiniLM-L-6-v2',
      );
      logger.log('Cross-encoder loaded and cached.');
    } catch (err: any) {
      logger.warn(`@xenova/transformers unavailable: ${err.message}. Reranking will be skipped.`);
      _rerankerUnavailable = true;
      return null;
    }
  }
  return _rerankerPipeline;
}

/**
 * Reranks chunks using a cross-encoder (ms-marco-MiniLM-L-6-v2).
 * Returns the top-N most relevant chunks sorted by cross-encoder score.
 *
 * Falls back to returning the first topN chunks (by RRF score) if inference fails.
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
    if (!reranker) return chunks.slice(0, topN);

    // Xenova's text-classification pipeline does not accept batched {text, text_pair} objects —
    // it expects a plain string as the first arg and text_pair in options.
    const scores: { score: number }[] = await Promise.all(
      chunks.map((c) =>
        reranker(query, {
          text_pair: c.content.slice(0, 512),
          truncation: true,
        }).then((res: any) => (Array.isArray(res) ? res[0] : res))
      )
    );

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
