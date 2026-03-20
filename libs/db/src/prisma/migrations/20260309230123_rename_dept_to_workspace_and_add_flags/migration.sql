/*
  Warnings:

  - You are about to drop the column `department` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `document_chunks` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `ingestion_events` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `workspace` to the `document_chunks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('SLACK', 'JIRA', 'GITHUB', 'GENERIC');

-- DropIndex
DROP INDEX "document_chunks_department_idx";

-- DropIndex
DROP INDEX "document_chunks_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "documents_department_idx";

-- DropIndex
DROP INDEX "ingestion_events_department_idx";

-- DropIndex
DROP INDEX "projects_department_idx";

-- DropIndex
DROP INDEX "users_department_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "department",
ADD COLUMN     "workspace" TEXT;

-- AlterTable
ALTER TABLE "document_chunks" DROP COLUMN "department",
ADD COLUMN     "workspace" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "department",
ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "ingestion_events" DROP COLUMN "department",
ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "department",
ADD COLUMN     "githubEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jiraEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "department",
ADD COLUMN     "workspace" TEXT NOT NULL DEFAULT 'general';

-- DropTable
DROP TABLE "departments";

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL DEFAULT 'GENERIC',
    "parentName" TEXT,
    "tokenBudget" INTEGER NOT NULL DEFAULT 20000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_name_key" ON "workspaces"("name");

-- CreateIndex
CREATE INDEX "document_chunks_workspace_idx" ON "document_chunks"("workspace");

-- CreateIndex
CREATE INDEX "documents_workspace_idx" ON "documents"("workspace");

-- CreateIndex
CREATE INDEX "ingestion_events_workspace_idx" ON "ingestion_events"("workspace");

-- CreateIndex
CREATE INDEX "projects_workspace_idx" ON "projects"("workspace");

-- CreateIndex
CREATE INDEX "users_workspace_idx" ON "users"("workspace");
