// ============================================================
// pgvector RAG Utility — Must-IQ
// Replaces Weaviate with direct PostgreSQL vector search
// Used by all three providers (Gemini, OpenAI, Claude)
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from './prisma.service';
import { DocumentChunk } from './types';
import { Logger } from '@nestjs/common';

const logger = new Logger('PGVectorStore');

// -------------------------------------------------------------------
// Retrieve top-K relevant chunks using pgvector cosine similarity
// Department filter ensures employees only see their own workspace + general
// -------------------------------------------------------------------
export async function retrieveChunks(
  queryVector: number[],
  workspace: string | string[],
  topK = 5
): Promise<DocumentChunk[]> {
  try {
    // Normalise workspace(s) into a de-duped array that always includes 'general'
    const scopes = Array.from(
      new Set([...(Array.isArray(workspace) ? workspace : [workspace]), 'general'])
    );

    // Format vector for PostgreSQL: [0.1, 0.2, ...]
    const vectorLiteral = `[${queryVector.join(",")}]`;

    // pgvector cosine similarity query
    // <=> operator = cosine distance (0 = identical, 2 = opposite)
    // 1 - distance = similarity score
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        source: string;
        page: number | null;
        workspace: string;
        layer: string | null;
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
      score: 1 - row.distance, // convert distance → similarity
    }));
  } catch (err) {
    logger.error("[pgvector] Query failed, continuing without RAG context:", err);
    return [];
  }
}

// -------------------------------------------------------------------
// Store a chunk with its embedding vector
// Called during document ingestion
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// Create a document record (before ingesting its chunks)
// -------------------------------------------------------------------
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
      status: "processing",
    },
  });
}

// -------------------------------------------------------------------
// Mark document as ready after all chunks are stored
// -------------------------------------------------------------------
export async function finalizeDocument(id: string, chunkCount: number) {
  return prisma.document.update({
    where: { id },
    data: { status: "ready", chunkCount },
  });
}

export { prisma };
