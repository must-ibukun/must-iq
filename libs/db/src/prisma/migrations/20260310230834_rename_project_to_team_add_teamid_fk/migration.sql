/*
  Warnings:

  - You are about to drop the column `projectId` on the `document_chunks` table. All the data in the column will be lost.
  - You are about to drop the column `workspace` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `workspaces` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_projectId_fkey";

-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_projectId_fkey";

-- DropIndex
DROP INDEX "document_chunks_projectId_idx";

-- DropIndex
DROP INDEX "users_workspace_idx";

-- DropIndex
DROP INDEX "workspaces_projectId_idx";

-- AlterTable
ALTER TABLE "document_chunks" DROP COLUMN "projectId",
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "workspace",
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "projectId",
ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "document_chunks_teamId_idx" ON "document_chunks"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE INDEX "users_teamId_idx" ON "users"("teamId");

-- CreateIndex
CREATE INDEX "workspaces_teamId_idx" ON "workspaces"("teamId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
