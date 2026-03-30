-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'READY');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PROCESSING', 'STORED', 'SKIPPED', 'ERROR');

-- AlterTable documents: cast existing lowercase strings to uppercase enum
ALTER TABLE "documents"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "DocumentStatus" USING (upper("status")::"DocumentStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PROCESSING'::"DocumentStatus";

-- AlterTable ingestion_events: cast existing lowercase strings to uppercase enum
ALTER TABLE "ingestion_events"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "IngestionStatus" USING (upper("status")::"IngestionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'STORED'::"IngestionStatus";
