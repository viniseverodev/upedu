-- L3: Índice único parcial — garante no máximo 1 responsável financeiro por aluno no nível do banco
-- Prisma schema não suporta partial indexes nativamente; aplicar este SQL manualmente via psql ou
-- como migration customizada antes de iniciar a aplicação em produção.
--
-- Execução:
--   psql $DATABASE_URL -f prisma/migrations/manual/add_partial_unique_index_responsavel_financeiro.sql
--
-- Verificação:
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'alunos_responsaveis';

CREATE UNIQUE INDEX IF NOT EXISTS aluno_resp_financeiro_unique
  ON alunos_responsaveis (aluno_id)
  WHERE is_responsavel_financeiro = true;
