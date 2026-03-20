-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deepSearchEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "layer" TEXT NOT NULL DEFAULT 'docs',
ADD COLUMN     "name" TEXT;
