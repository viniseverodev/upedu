-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_filialId_fkey";

-- AlterTable
ALTER TABLE "mensalidades" ADD COLUMN     "motivoCancelamento" TEXT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
