/*
  Warnings:

  - You are about to drop the column `githubRepos` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `jiraProjects` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `slackChannels` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `githubRepo` on the `workspaces` table. All the data in the column will be lost.
  - You are about to drop the column `jiraProject` on the `workspaces` table. All the data in the column will be lost.
  - You are about to drop the column `slackChannel` on the `workspaces` table. All the data in the column will be lost.
  - Made the column `identifier` on table `workspaces` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "githubRepos",
DROP COLUMN "jiraProjects",
DROP COLUMN "slackChannels",
ADD COLUMN     "identifiers" TEXT[];

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "githubRepo",
DROP COLUMN "jiraProject",
DROP COLUMN "slackChannel",
ALTER COLUMN "identifier" SET NOT NULL;
