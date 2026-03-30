-- AlterTable
ALTER TABLE "documents" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "documents_workspace_source_contentHash_idx" ON "documents"("workspace", "source", "contentHash");
