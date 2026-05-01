-- CreateEnum
CREATE TYPE "MensalidadeTipo" AS ENUM ('REGULAR', 'OFICINA');

-- DropIndex
DROP INDEX "mensalidades_alunoId_mesReferencia_anoReferencia_key";

-- AlterTable
ALTER TABLE "mensalidades" ADD COLUMN     "matriculaOficinaId" TEXT,
ADD COLUMN     "tipo" "MensalidadeTipo" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE INDEX "mensalidades_matriculaOficinaId_idx" ON "mensalidades"("matriculaOficinaId");

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_matriculaOficinaId_fkey" FOREIGN KEY ("matriculaOficinaId") REFERENCES "matriculas_oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
