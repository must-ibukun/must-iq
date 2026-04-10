// ============================================================
// Must-IQ — Context Builder Utility
// Handles deduplication and compression of RAG chunks before LLM injection
// ============================================================

export function buildContext(chunks: any[], maxTokenBudget?: number): string {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  // 1. Deduplicate only — quality filtering is handled upstream by the reranker

  for (const chunk of chunks) {
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
