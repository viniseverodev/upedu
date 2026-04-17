-- WARN-004: Partial unique index para garantir no máximo 1 responsável financeiro por aluno
-- Previne race condition no check-then-act do ResponsaveisService.vincular()
-- Prisma não suporta partial index via schema — criado via migration SQL raw

CREATE UNIQUE INDEX "alunos_responsaveis_financeiro_unique_idx"
  ON "alunos_responsaveis" ("alunoId")
  WHERE "isResponsavelFinanceiro" = true;
