/*
  Warnings:

  - You are about to drop the column `teamId` on the `workspaces` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_teamId_fkey";

-- DropIndex
DROP INDEX "workspaces_teamId_idx";

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN "teamId";

-- CreateTable
CREATE TABLE "_TeamToWorkspace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeamToWorkspace_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeamToWorkspace_B_index" ON "_TeamToWorkspace"("B");

-- AddForeignKey
ALTER TABLE "_TeamToWorkspace" ADD CONSTRAINT "_TeamToWorkspace_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamToWorkspace" ADD CONSTRAINT "_TeamToWorkspace_B_fkey" FOREIGN KEY ("B") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
