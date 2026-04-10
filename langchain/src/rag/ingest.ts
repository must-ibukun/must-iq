// ============================================================
// Document Ingestion — Must-IQ (Dynamic Vector Store)
// Loads PDF/DOCX/TXT → splits → embeds → stores in active Vector DB
// ============================================================

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguage } from "@langchain/textsplitters";
import { createVectorStore } from "@must-iq/config";
import { prisma } from "@must-iq/db";
import { CODE_EXTENSIONS } from "@must-iq/shared-types";
import path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import { Logger } from "@nestjs/common";
dotenv.config();

const logger = new Logger('IngestScript');

const BRANCH_SUFFIXES = ['-main', '-master', '-develop', '-dev', '-staging', '-production', '-prod'];

export function normalizeSourcePath(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/'); // unify separators
  const slashIdx = normalized.indexOf('/');
  if (slashIdx === -1) return normalized; // no folder prefix — nothing to strip

  const topFolder = normalized.slice(0, slashIdx);
  const rest = normalized.slice(slashIdx); // includes leading /

  for (const suffix of BRANCH_SUFFIXES) {
    if (topFolder.endsWith(suffix)) {
      return topFolder.slice(0, -suffix.length) + rest;
    }
  }
  return normalized;
}

function getSplitterForFile(extension: string) {
  const langId = CODE_EXTENSIONS[extension.toLowerCase()];
  if (langId) {
    try {
      return RecursiveCharacterTextSplitter.fromLanguage(
        langId as SupportedTextSplitterLanguage,
        { chunkSize: 1500, chunkOverlap: 200 }
      );
    } catch {
      // langId not in LangChain's supported list — fall through to generic
    }
  }
  return new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
}

/**
 * Ingests a file from disk into the active vector store.
 */
export async function ingestFile(filePath: string, workspace = "general", taskType = "RETRIEVAL_DOCUMENT", relativeFilePath?: string, layer = "docs"): Promise<{ chunksStored: number }> {
  const ext = path.extname(filePath).toLowerCase();

  const fileBuffer = fs.readFileSync(filePath);
  const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const sourceName = relativeFilePath || path.basename(filePath);

  const existing = await prisma.document.findFirst({
    where: { workspace, source: sourceName, contentHash, status: "COMPLETED" },
    select: { id: true, chunkCount: true },
  });
  if (existing) {
    logger.log(`⚡ Skipping ${sourceName} — already ingested (hash match)`);
    return { chunksStored: existing.chunkCount };
  }

  let loader: any;
  if (ext === ".pdf") loader = new PDFLoader(filePath);
  else if (ext === ".docx") loader = new DocxLoader(filePath);
  else {
    const textLoader = new TextLoader(filePath);
    loader = textLoader;
  }

  logger.log(`Loading ${filePath}...`);
  const docs = await loader.load();

  // Fetch workspace metadata
  const wsRecord = await prisma.workspace.findFirst({
    where: { OR: [{ id: workspace }, { identifier: workspace }] }
  });
  const techStack = wsRecord?.techStack || null;

  // Tag every chunk with workspace + source
  const langId = CODE_EXTENSIONS[ext] || "text";

  const tagged = docs.map((doc: any) => ({
    ...doc,
    metadata: { ...doc.metadata, workspace, source: sourceName, language: langId, layer, techStack },
  }));

  const splitter = getSplitterForFile(ext);
  const rawChunks = await splitter.splitDocuments(tagged);

  // 1. Create a parent Document record in Prisma so chunks can refer to it
  logger.log(`Creating Document record for ${sourceName}...`);
  const tags: string[] = [ext.replace('.', '') || 'text'];
  if (langId && langId !== 'text') tags.push(langId);

  const document = await prisma.document.create({
    data: {
      filename: path.basename(filePath),
      source: sourceName,
      workspace,
      status: "PROCESSING",
      uploadedBy: "system",
      contentHash,
      sizeBytes: fileBuffer.length,
      tags,
    }
  });

  // 2. Tag every chunk with the documentId
  const chunks = rawChunks.map((chunk, idx) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      documentId: document.id,
      chunkIndex: idx
    }
  }));

  logger.log(`Split into ${chunks.length} chunks — storing in active Vector DB...`);

  try {
    const vectorStore = await createVectorStore(taskType);
    await vectorStore.addDocuments(chunks as any);
  } catch (err: any) {
    logger.error(`Failed to store chunks for ${sourceName}: ${err.message}. Cleaning up database record...`);
    try {
      await prisma.document.delete({ where: { id: document.id } });
    } catch (cleanupErr) {
      logger.error(`Failed to delete orphaned Document record ${document.id}:`, cleanupErr);
    }
    throw err; // Re-throw to be caught by service
  }

  // 3. Mark document as completed
  await prisma.document.update({
    where: { id: document.id },
    data: { status: "COMPLETED", chunkCount: chunks.length }
  });

  logger.log(`✅ Ingested ${chunks.length} chunks from ${path.basename(filePath)} → ${workspace}`);
  return { chunksStored: chunks.length };
}

/**
 * Ingests a raw piece of text (e.g. Slack messages, GitHub PRs, Jira issues, Agent tools)
 * into the active vector store.
 *
 * For code files (language param provided), uses a language-specific splitter.
 * For all others, uses a generic text splitter.
 *
 * Deduplication strategy — "Source of Truth Replacement":
 *  - If no document exists for (workspace, source)       → ingest fresh.
 *  - If a document exists with the SAME contentHash      → skip (unchanged).
 *  - If a document exists with a DIFFERENT contentHash   → delete old doc (cascades all chunks) then re-ingest.
 */
export async function ingestDocument({
  content,
  metadata,
  taskType = 'RETRIEVAL_DOCUMENT',
  language,
}: {
  content: string;
  metadata: any;
  taskType?: string;
  language?: string; // e.g. 'js', 'python', 'markdown' — from CODE_EXTENSIONS
}) {
  const source = metadata.source || 'unknown';
  const workspace = metadata.workspace || 'general';

  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  // Find any existing document for this source in this workspace
  const existing = await prisma.document.findFirst({
    where: { workspace, source },
    select: { id: true, chunkCount: true, contentHash: true, status: true },
  });

  if (existing) {
    if (existing.contentHash === contentHash && existing.status === 'COMPLETED') {
      logger.log(`⚡ Skipping ${source} — already ingested (hash match)`);
      return;
    }
    // Content changed: atomically replace old document + its chunks
    logger.log(`🔄 Replacing ${source} — content changed (hash mismatch), deleting old document...`);
    await prisma.document.delete({ where: { id: existing.id } });
    // DocumentChunks cascade-delete via schema: onDelete: Cascade
  }

  // Track in Document table for visibility + rollback on failure
  const docTags: string[] = Array.isArray(metadata.tags) ? metadata.tags : [];
  const document = await prisma.document.create({
    data: {
      filename: source,
      source,
      workspace,
      status: 'PROCESSING',
      uploadedBy: 'system',
      contentHash,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      tags: docTags,
    },
  });

  // Choose splitter: language-specific for code, generic for prose/discussions
  let splitter: any;
  if (language) {
    try {
      splitter = RecursiveCharacterTextSplitter.fromLanguage(
        language as SupportedTextSplitterLanguage,
        { chunkSize: 1500, chunkOverlap: 200 },
      );
    } catch {
      // Fallback if LangChain doesn't recognize the language
      splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
    }
  } else {
    splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  }

  const chunks = await splitter.splitText(content);
  const docs = chunks.map((chunk: string, idx: number) => ({
    pageContent: chunk,
    metadata: {
      ...metadata,
      documentId: document.id,
      chunkIndex: idx,
      ingested_at: new Date().toISOString(),
    },
  }));

  try {
    const vectorStore = await createVectorStore(taskType);
    await vectorStore.addDocuments(docs);
  } catch (err: any) {
    logger.error(`Failed to store chunks for ${source}: ${err.message}. Cleaning up...`);
    await prisma.document.delete({ where: { id: document.id } }).catch(() => { });
    throw err;
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { status: 'COMPLETED', chunkCount: chunks.length },
  });

  logger.log(`✅ Ingested ${chunks.length} chunks from ${source} → ${workspace}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const wsIdx = args.indexOf("--workspace");
  if (fileIdx === -1) {
    logger.error("Usage: npx ts-node ingest.ts --file ./path/file.pdf --workspace hr");
    process.exit(1);
  }
  ingestFile(args[fileIdx + 1], wsIdx !== -1 ? args[wsIdx + 1] : "general").catch((e) => logger.error(e));
}
