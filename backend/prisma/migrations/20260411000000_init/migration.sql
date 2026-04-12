-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "AlunoStatus" AS ENUM ('PRE_MATRICULA', 'ATIVO', 'INATIVO', 'LISTA_ESPERA', 'TRANSFERIDO');

-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('INTEGRAL', 'MEIO_TURNO');

-- CreateEnum
CREATE TYPE "MatriculaStatus" AS ENUM ('ATIVA', 'ENCERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MensalidadeStatus" AS ENUM ('PENDENTE', 'PAGO', 'INADIMPLENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TransacaoTipo" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CategoriaFinanceiraTipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filiais" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "valorMensalidadeIntegral" DECIMAL(10,2) NOT NULL,
    "valorMensalidadeMeioTurno" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_filiais" (
    "userId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,

    CONSTRAINT "users_filiais_pkey" PRIMARY KEY ("userId","filialId")
);

-- CreateTable
CREATE TABLE "responsaveis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfEnc" BYTEA,
    "rgEnc" BYTEA,
    "telefone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "responsaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "status" "AlunoStatus" NOT NULL DEFAULT 'PRE_MATRICULA',
    "turno" "Turno" NOT NULL,
    "observacoes" TEXT,
    "consentimentoResponsavel" BOOLEAN NOT NULL DEFAULT false,
    "consentimentoTimestamp" TIMESTAMP(3),
    "anonimizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos_responsaveis" (
    "alunoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "isResponsavelFinanceiro" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alunos_responsaveis_pkey" PRIMARY KEY ("alunoId","responsavelId")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "status" "MatriculaStatus" NOT NULL DEFAULT 'ATIVA',
    "turno" "Turno" NOT NULL,
    "valorMensalidade" DECIMAL(10,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensalidades" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "status" "MensalidadeStatus" NOT NULL DEFAULT 'PENDENTE',
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "valorOriginal" DECIMAL(10,2) NOT NULL,
    "valorDesconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(10,2),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "CategoriaFinanceiraTipo" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "tipo" "TransacaoTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataTransacao" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "filialId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_cnpj_key" ON "organizations"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_organizationId_key" ON "users"("email", "organizationId");

-- CreateIndex
CREATE INDEX "users_email_organizationId_idx" ON "users"("email", "organizationId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "filiais_cnpj_organizationId_key" ON "filiais"("cnpj", "organizationId");

-- CreateIndex
CREATE INDEX "alunos_filialId_status_idx" ON "alunos"("filialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mensalidades_alunoId_mesReferencia_anoReferencia_key" ON "mensalidades"("alunoId", "mesReferencia", "anoReferencia");

-- CreateIndex
CREATE INDEX "mensalidades_filialId_status_dataVencimento_idx" ON "mensalidades"("filialId", "status", "dataVencimento");

-- CreateIndex
CREATE INDEX "matriculas_alunoId_status_idx" ON "matriculas"("alunoId", "status");

-- CreateIndex
CREATE INDEX "transacoes_filialId_dataTransacao_idx" ON "transacoes"("filialId", "dataTransacao");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filiais" ADD CONSTRAINT "filiais_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_filiais" ADD CONSTRAINT "users_filiais_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_filiais" ADD CONSTRAINT "users_filiais_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos_responsaveis" ADD CONSTRAINT "alunos_responsaveis_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos_responsaveis" ADD CONSTRAINT "alunos_responsaveis_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
