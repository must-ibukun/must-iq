// ============================================================
// Must-IQ — Context Builder Utility
// Handles deduplication and compression of RAG chunks before LLM injection
// ============================================================

export function buildContext(chunks: any[], maxTokenBudget = 6000): string {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  // 1. Deduplicate by exact content or near-exact content
  for (const chunk of chunks) {
    if (!chunk.content) continue;
    
    // Normalize whitespace for a safer fingerprint
    const fp = chunk.content.trim().replace(/\s+/g, ' ');
    if (!seen.has(fp)) {
      seen.add(fp);
      deduplicated.push(chunk);
    }
  }

  // 2. Budget constraints (1 token ≈ 4 chars)
  let budgetChars = maxTokenBudget * 4;
  const parts: string[] = [];

  for (let i = 0; i < deduplicated.length; i++) {
    const d = deduplicated[i];
    const layerLabel  = d.layer ? `[Layer: ${d.layer}] ` : '';
    const langLabel   = d.language && d.language !== 'text' ? `[Lang: ${d.language}] ` : '';
    const stackLabel  = d.techStack ? `[Stack: ${d.techStack}] ` : '';
    const sourceLabel = d.source ? `(${d.source})` : '(unknown source)';
    
    const header = `[${i + 1}] ${layerLabel}${langLabel}${stackLabel}${sourceLabel}`;
    const block  = `${header}\n${d.content}`;

    if (block.length > budgetChars) {
      // If even the first block is too big, slice it, otherwise break.
      if (parts.length === 0) {
        parts.push(block.slice(0, budgetChars) + '\n...[TRUNCATED]');
      }
      break; 
    }
    
    budgetChars -= block.length;
    parts.push(block);
  }

  return parts.join('\n\n---\n\n');
}
