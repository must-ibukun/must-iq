-- Rename underlying table from "projects" to "teams"
ALTER TABLE "projects" RENAME TO "teams";

-- Rename primary key constraint
ALTER TABLE "teams" RENAME CONSTRAINT "projects_pkey" TO "teams_pkey";

-- Rename unique index
ALTER INDEX "projects_name_key" RENAME TO "teams_name_key";
