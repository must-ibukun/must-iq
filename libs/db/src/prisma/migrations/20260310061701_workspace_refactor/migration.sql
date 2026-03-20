/*
  Warnings:

  - You are about to drop the column `workspace` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `workspaces` table. All the data in the column will be lost.
  - You are about to drop the column `parentName` on the `workspaces` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "projects_workspace_idx";

-- DropIndex
DROP INDEX "workspaces_name_key";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "workspace";

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "name",
DROP COLUMN "parentName",
ADD COLUMN     "githubRepo" TEXT,
ADD COLUMN     "jiraProject" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "slackChannel" TEXT;

-- CreateIndex
CREATE INDEX "workspaces_projectId_idx" ON "workspaces"("projectId");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
