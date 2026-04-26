-- AlterEnum
ALTER TYPE "MensalidadeStatus" ADD VALUE 'PARCIAL';

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "mensalidadeId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagamentos_mensalidadeId_idx" ON "pagamentos"("mensalidadeId");

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_mensalidadeId_fkey" FOREIGN KEY ("mensalidadeId") REFERENCES "mensalidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
