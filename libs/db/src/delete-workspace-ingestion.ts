import { PrismaClient } from './generated-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the project root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrlBase = process.env.DATABASE_URL || '';
// Force Supabase transaction pool port (6543) instead of session port (5432)
// to bypass `MaxClientsInSessionMode: max clients reached`
const dbUrlTransaction = dbUrlBase.replace(':5432', ':6543');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrlTransaction + (dbUrlTransaction.includes('?') ? '&' : '?') + 'connect_timeout=30&pool_timeout=30&pgbouncer=true'
    }
  }
});

// ─────────────────────────────────────────────
// Set the workspace identifier(s) to delete
// ─────────────────────────────────────────────
const WORKSPACES_TO_DELETE = [
  'globalmsq/msquare-admin-frontend',
];

async function main() {
  for (const workspace of WORKSPACES_TO_DELETE) {
    console.log(`\n🗑️  Deleting ingested data for workspace: "${workspace}"`);

    // 1. Find all Document records for this workspace
    const docs = await prisma.document.findMany({
      where: { workspace },
      select: { id: true },
    });
    const docIds = docs.map(d => d.id);
    console.log(`   Found ${docIds.length} Document records.`);

    // 2. Delete DocumentChunks for those documents (cascade not guaranteed on all DBs)
    if (docIds.length > 0) {
      const chunkResult = await prisma.documentChunk.deleteMany({
        where: { documentId: { in: docIds } },
      });
      console.log(`   ✅ Deleted ${chunkResult.count} DocumentChunk (vector) records.`);
    }

    // 3. Delete the Document records themselves
    const docResult = await prisma.document.deleteMany({ where: { workspace } });
    console.log(`   ✅ Deleted ${docResult.count} Document records.`);

    // 4. Delete IngestionEvent records for this workspace
    const eventResult = await prisma.ingestionEvent.deleteMany({ where: { workspace } });
    console.log(`   ✅ Deleted ${eventResult.count} IngestionEvent records.`);

    console.log(`   🎉 Workspace "${workspace}" cleared successfully.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during deletion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
