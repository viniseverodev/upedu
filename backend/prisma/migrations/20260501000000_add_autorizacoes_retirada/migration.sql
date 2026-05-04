-- CreateEnum
CREATE TYPE "AutorizacaoTipo" AS ENUM ('PERMANENTE', 'TEMPORARIA');

-- CreateTable
CREATE TABLE "autorizacoes_retirada" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "relacao" TEXT,
    "fotoUrl" TEXT,
    "tipo" "AutorizacaoTipo" NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "horarioInicio" TEXT,
    "horarioFim" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autorizacoes_retirada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_retirada" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "autorizacaoId" TEXT,
    "nomeAutorizado" TEXT NOT NULL,
    "cpfAutorizado" TEXT NOT NULL,
    "tipoAutorizacao" "AutorizacaoTipo" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_retirada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "autorizacoes_retirada_alunoId_idx" ON "autorizacoes_retirada"("alunoId");
CREATE INDEX "autorizacoes_retirada_filialId_cpf_idx" ON "autorizacoes_retirada"("filialId", "cpf");
CREATE INDEX "registros_retirada_alunoId_createdAt_idx" ON "registros_retirada"("alunoId", "createdAt" DESC);
CREATE INDEX "registros_retirada_filialId_createdAt_idx" ON "registros_retirada"("filialId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "autorizacoes_retirada" ADD CONSTRAINT "autorizacoes_retirada_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "autorizacoes_retirada" ADD CONSTRAINT "autorizacoes_retirada_filialId_fkey"
  FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registros_retirada" ADD CONSTRAINT "registros_retirada_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registros_retirada" ADD CONSTRAINT "registros_retirada_filialId_fkey"
  FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
