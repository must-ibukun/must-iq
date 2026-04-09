-- AlterTable
ALTER TABLE "token_logs" DROP CONSTRAINT "token_logs_userId_fkey";

-- AddForeignKey
ALTER TABLE "token_logs" ADD CONSTRAINT "token_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
