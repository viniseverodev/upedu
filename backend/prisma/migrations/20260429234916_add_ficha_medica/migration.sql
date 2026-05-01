-- CreateTable
CREATE TABLE "fichas_medicas" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "tipoSanguineo" TEXT,
    "possuiAlergia" BOOLEAN NOT NULL DEFAULT false,
    "alergias" TEXT,
    "medicamentosUso" TEXT,
    "condicoesEspeciais" TEXT,
    "planoSaude" TEXT,
    "contatoEmergenciaNome" TEXT,
    "contatoEmergenciaTelefone" TEXT,
    "observacoesMedicas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fichas_medicas_alunoId_key" ON "fichas_medicas"("alunoId");

-- AddForeignKey
ALTER TABLE "fichas_medicas" ADD CONSTRAINT "fichas_medicas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
