import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from './prisma.service';
import { DocumentChunk } from './types';
import { Logger } from '@nestjs/common';

const logger = new Logger('PGVectorStore');

export async function retrieveChunks(
  queryVector: number[],
  workspace: string | string[],
  topK = 5
): Promise<DocumentChunk[]> {
  try {
    const scopes = Array.from(
      new Set(Array.isArray(workspace) ? workspace : [workspace])
    );

    const vectorLiteral = `[${queryVector.join(",")}]`;

    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        source: string;
        page: number | null;
        workspace: string;
        layer: string | null;
        language: string | null;
        techStack: string | null;
        distance: number;
      }>
    >`
      SELECT
        id,
        content,
        source,
        page,
        workspace,
        metadata->>'layer' AS layer,
        metadata->>'language' AS language,
        metadata->>'techStack' AS "techStack",
        embedding <=> ${vectorLiteral}::vector AS distance
      FROM document_chunks
      WHERE
        workspace = ANY(${scopes})
        AND embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${topK}
    `;

    return results.map((row) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      page: row.page ?? undefined,
      workspace: row.workspace,
      layer: row.layer ?? undefined,
      language: row.language ?? undefined,
      techStack: row.techStack ?? undefined,
      score: 1 - row.distance,
    }));
  } catch (err) {
    logger.error("[pgvector] Dense query failed, continuing without RAG context:", err);
    return [];
  }
}

// Build an OR-based tsquery from plain text.
// Strips punctuation so tokens like "(PIP)" → "PIP".
// Filters tokens shorter than 3 chars to skip noise.
// Joins with | (OR) so a truncated/unknown word like "managemen"
// doesn't AND-kill the entire query — other terms still match.
function buildOrTsQuery(text: string): string {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3)
    .join(' | ');
}

export async function retrieveChunksKeyword(
  query: string,
  workspace: string | string[],
  topK = 100
): Promise<DocumentChunk[]> {
  try {
    const scopes = Array.from(
      new Set(Array.isArray(workspace) ? workspace : [workspace])
    );
    const orQuery = buildOrTsQuery(query);
    if (!orQuery) return [];

    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        source: string;
        page: number | null;
        workspace: string;
        layer: string | null;
        language: string | null;
        techStack: string | null;
        rank: number;
      }>
    >`
      SELECT
        id,
        content,
        source,
        page,
        workspace,
        metadata->>'layer' AS layer,
        metadata->>'language' AS language,
        metadata->>'techStack' AS "techStack",
        ts_rank(content_tsv, to_tsquery('english', ${orQuery})) AS rank
      FROM document_chunks
      WHERE
        workspace = ANY(${scopes})
        AND content_tsv @@ to_tsquery('english', ${orQuery})
      ORDER BY rank DESC
      LIMIT ${topK}
    `;

    return results.map((row) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      page: row.page ?? undefined,
      workspace: row.workspace,
      layer: row.layer ?? undefined,
      language: row.language ?? undefined,
      techStack: row.techStack ?? undefined,
      score: row.rank,
    }));
  } catch (err) {
    logger.error("[pgvector] BM25 keyword query failed:", err);
    return [];
  }
}

// Reciprocal Rank Fusion — merges dense + sparse ranked lists without weight tuning.
// Formula: score(d) = Σ 1 / (k + rank(d)) for each list
// k=60 is the standard value (Robertson et al., 2009)
export function reciprocalRankFusion(
  ...rankedLists: DocumentChunk[][]
): DocumentChunk[] {
  const K = 60;
  const scores = new Map<string, { chunk: DocumentChunk; score: number }>();

  for (const list of rankedLists) {
    list.forEach((chunk, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (K + rank);
      const existing = scores.get(chunk.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(chunk.id, { chunk, score: rrfScore });
      }
    });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ chunk, score }) => ({ ...chunk, score }));
}

export async function storeChunk(params: {
  documentId: string;
  content: string;
  source: string;
  page?: number;
  workspace: string;
  chunkIndex: number;
  embedding: number[];
}): Promise<void> {
  const vectorLiteral = `[${params.embedding.join(",")}]`;

  await prisma.$executeRaw`
    INSERT INTO document_chunks
      (id, "documentId", content, source, page, workspace, "chunkIndex", embedding, "createdAt")
    VALUES
      (gen_random_uuid(), ${params.documentId}, ${params.content}, ${params.source},
       ${params.page ?? null}, ${params.workspace}, ${params.chunkIndex},
       ${vectorLiteral}::vector, NOW())
  `;
}

export async function createDocument(params: {
  filename: string;
  source: string;
  workspace: string;
  uploadedBy: string;
  sizeBytes: number;
}) {
  return prisma.document.create({
    data: {
      ...params,
      status: "PROCESSING",
    },
  });
}

export async function finalizeDocument(id: string, chunkCount: number) {
  return prisma.document.update({
    where: { id },
    data: { status: "READY", chunkCount },
  });
}

export { prisma };
