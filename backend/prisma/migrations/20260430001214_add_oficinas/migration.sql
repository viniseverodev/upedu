-- CreateTable
CREATE TABLE "oficinas" (
    "id" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas_oficinas" (
    "id" TEXT NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vagas" INTEGER,
    "horario" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turmas_oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas_oficinas" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matriculas_oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oficinas_filialId_idx" ON "oficinas"("filialId");

-- CreateIndex
CREATE INDEX "turmas_oficinas_oficinaId_idx" ON "turmas_oficinas"("oficinaId");

-- CreateIndex
CREATE INDEX "matriculas_oficinas_turmaId_idx" ON "matriculas_oficinas"("turmaId");

-- CreateIndex
CREATE INDEX "matriculas_oficinas_alunoId_idx" ON "matriculas_oficinas"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_oficinas_turmaId_alunoId_key" ON "matriculas_oficinas"("turmaId", "alunoId");

-- AddForeignKey
ALTER TABLE "oficinas" ADD CONSTRAINT "oficinas_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_oficinas" ADD CONSTRAINT "turmas_oficinas_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_oficinas" ADD CONSTRAINT "matriculas_oficinas_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas_oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_oficinas" ADD CONSTRAINT "matriculas_oficinas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
