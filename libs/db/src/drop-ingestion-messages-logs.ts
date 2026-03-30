/**
 * drop-ingestion-messages-logs.ts
 *
 * Deletes ALL rows from:
 *   • ingestion_events   (ingestion)
 *   • document_chunks    (vector chunks — cascades from documents)
 *   • documents          (parent of document_chunks)
 *   • messages           (chat messages — cascades from chat_sessions)
 *   • chat_sessions      (parent of messages)
 *   • token_logs         (logs)
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register libs/db/src/drop-ingestion-messages-logs.ts
 *
 * Add --dry-run to preview row counts without deleting.
 */

import { PrismaClient } from './generated-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  Must-IQ — Drop Ingestion / Messages / Logs');
  console.log('══════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('  MODE: DRY RUN — no data will be deleted\n');
  } else {
    console.log('  MODE: LIVE — rows will be permanently deleted\n');
  }

  // ── Count rows before deletion ────────────────────────────────────────────
  // Run sequentially to avoid exceeding Supabase session-mode pool_size
  const ingestionCount = await prisma.ingestionEvent.count();
  const chunkCount     = await prisma.documentChunk.count();
  const documentCount  = await prisma.document.count();
  const tokenLogCount  = await prisma.tokenLog.count();
  const messageCount   = await prisma.message.count();
  const sessionCount   = await prisma.chatSession.count();
  const auditLogCount  = await prisma.auditLog.count();

  console.log('  Row counts BEFORE deletion:');
  console.log(`    ingestion_events : ${ingestionCount}`);
  console.log(`    document_chunks  : ${chunkCount}`);
  console.log(`    documents        : ${documentCount}`);
  console.log(`    token_logs       : ${tokenLogCount}`);
  console.log(`    messages         : ${messageCount}`);
  console.log(`    chat_sessions    : ${sessionCount}`);
  console.log(`    audit_logs       : ${auditLogCount}`);
  console.log('');

  if (DRY_RUN) {
    console.log('  Dry run complete — nothing deleted. Remove --dry-run to apply.');
    return;
  }

  // ── Delete in dependency order (children first) ───────────────────────────
  // token_logs → references chat_sessions & users, must go before sessions
  const deletedTokenLogs = await prisma.tokenLog.deleteMany({});
  console.log(`  ✓ token_logs       deleted: ${deletedTokenLogs.count}`);

  // messages → cascade-deleted when sessions are deleted, but be explicit
  const deletedMessages = await prisma.message.deleteMany({});
  console.log(`  ✓ messages         deleted: ${deletedMessages.count}`);

  // chat_sessions → parent of messages
  const deletedSessions = await prisma.chatSession.deleteMany({});
  console.log(`  ✓ chat_sessions    deleted: ${deletedSessions.count}`);

  // document_chunks → child of documents (has onDelete: Cascade, but be explicit)
  const deletedChunks = await prisma.documentChunk.deleteMany({});
  console.log(`  ✓ document_chunks  deleted: ${deletedChunks.count}`);

  // documents → parent of document_chunks
  const deletedDocuments = await prisma.document.deleteMany({});
  console.log(`  ✓ documents        deleted: ${deletedDocuments.count}`);

  // ingestion_events → standalone table
  const deletedIngestion = await prisma.ingestionEvent.deleteMany({});
  console.log(`  ✓ ingestion_events deleted: ${deletedIngestion.count}`);

  // auditLog → standalone table
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`  ✓ auditLog deleted: ${deletedAuditLogs.count}`);

  console.log('');
  console.log('  ✅  Done — ingestion, messages, and logs have been cleared.');
  console.log('══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('\n  ❌  Error during drop script:\n', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
