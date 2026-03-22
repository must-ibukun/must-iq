// ============================================================
// Document Ingestion — Must-IQ (Dynamic Vector Store)
// Loads PDF/DOCX/TXT → splits → embeds → stores in active Vector DB
// ============================================================

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguage } from "@langchain/textsplitters";
import { createVectorStore, createEmbeddings, getActiveSettings } from "@must-iq/config";
import { prisma } from "@must-iq/db";
import { CODE_EXTENSIONS } from "@must-iq/shared-types";
import path from "path";
import * as dotenv from "dotenv";
import { Logger } from "@nestjs/common";
dotenv.config();

const logger = new Logger('IngestScript');

function getSplitterForFile(extension: string) {
  const langId = CODE_EXTENSIONS[extension.toLowerCase()];
  if (langId) {
    return RecursiveCharacterTextSplitter.fromLanguage(
      langId as SupportedTextSplitterLanguage,
      { chunkSize: 1500, chunkOverlap: 200 }
    );
  }
  return new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
}

/**
 * Ingests a file from disk into the active vector store.
 */
export async function ingestFile(filePath: string, workspace = "general", taskType = "RETRIEVAL_DOCUMENT", relativeFilePath?: string, layer = "docs"): Promise<{ chunksStored: number }> {
  const ext = path.extname(filePath).toLowerCase();
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
  const sourceName = relativeFilePath || path.basename(filePath);
  const langId = CODE_EXTENSIONS[ext] || "text";

  const tagged = docs.map((doc: any) => ({
    ...doc,
    metadata: { ...doc.metadata, workspace, source: sourceName, language: langId, layer, techStack },
  }));

  const splitter = getSplitterForFile(ext);
  const rawChunks = await splitter.splitDocuments(tagged);

  // 1. Create a parent Document record in Prisma so chunks can refer to it
  logger.log(`Creating Document record for ${sourceName}...`);
  const document = await prisma.document.create({
    data: {
      filename: path.basename(filePath),
      source: sourceName,
      workspace,
      status: "processing",
      uploadedBy: "system", // Or pass an actual userId if available
      sizeBytes: 0, // Should ideally be calculated from fs
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
    data: { status: "completed", chunkCount: chunks.length }
  });

  logger.log(`✅ Ingested ${chunks.length} chunks from ${path.basename(filePath)} → ${workspace}`);
  return { chunksStored: chunks.length };
}

/**
 * Ingests a raw piece of text (e.g. from Agent tools) into the active vector store.
 */
export async function ingestDocument({ content, metadata, taskType = "RETRIEVAL_DOCUMENT" }: { content: string, metadata: any, taskType?: string }) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const chunks = await splitter.splitText(content);
  const docs = chunks.map(chunk => ({
    pageContent: chunk,
    metadata: {
      ...metadata,
      ingested_at: new Date().toISOString()
    }
  }));

  const vectorStore = await createVectorStore(taskType);
  await vectorStore.addDocuments(docs);
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
