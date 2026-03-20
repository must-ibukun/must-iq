-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "chat_sessions_workspace_idx" ON "chat_sessions"("workspace");
