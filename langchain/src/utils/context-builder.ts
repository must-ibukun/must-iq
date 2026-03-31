// Chunks below this score are discarded regardless of rank.
// After cross-encoder reranking, scores < 0.1 are near-irrelevant.
// Without reranking, this filters cosine similarity noise (< 0.1 ≈ random match).
const MIN_SCORE = 0.01;

export function buildContext(chunks: any[], maxTokenBudget?: number): string {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  const qualified = chunks.filter((c) => typeof c.score !== 'number' || c.score >= MIN_SCORE);

  for (const chunk of qualified) {
    if (!chunk.content) continue;

    const fp = chunk.content.trim().replace(/\s+/g, ' ');
    if (!seen.has(fp)) {
      seen.add(fp);
      deduplicated.push(chunk);
    }
  }

  const parts: string[] = [];
  let budgetChars = maxTokenBudget != null ? maxTokenBudget * 4 : Infinity;

  for (let i = 0; i < deduplicated.length; i++) {
    const d = deduplicated[i];
    const layerLabel  = d.layer ? `[Layer: ${d.layer}] ` : '';
    const langLabel   = d.language && d.language !== 'text' ? `[Lang: ${d.language}] ` : '';
    const stackLabel  = d.techStack ? `[Stack: ${d.techStack}] ` : '';
    const sourceLabel = d.source ? `(${d.source})` : '(unknown source)';

    const header = `[${i + 1}] ${layerLabel}${langLabel}${stackLabel}${sourceLabel}`;
    const block  = `${header}\n${d.content}`;

    if (block.length > budgetChars) {
      if (parts.length === 0) parts.push(block.slice(0, budgetChars));
      break;
    }

    budgetChars -= block.length;
    parts.push(block);
  }

  return parts.join('\n\n---\n\n');
}
