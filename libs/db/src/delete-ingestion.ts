import { PrismaClient } from './generated-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the project root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all ingested vector documents...');
  const docResult = await prisma.document.deleteMany({});
  console.log(`✅ Deleted ${docResult.count} Document (and associated DocumentChunk) records.`);

  console.log('🗑️  Deleting all ingestion events...');
  const eventResult = await prisma.ingestionEvent.deleteMany({});
  console.log(`✅ Deleted ${eventResult.count} IngestionEvent records.`);

  console.log('🎉 Reset complete. You can now re-ingest your data with the new Tech Stack tags!');
}

main()
  .catch((e) => {
    console.error('❌ Error during deletion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
