-- Fix: excluir linhas CANCELADAS dos índices únicos de mensalidades.
--
-- Problema: ao desmatricular um aluno de uma oficina, o Postgres executa
-- ON DELETE SET NULL na mensalidade OFICINA já cancelada, tornando
-- matriculaOficinaId = null. Isso violava o índice mensalidade_regular_unique
-- quando já existia uma mensalidade REGULAR para o mesmo aluno/mês/ano.
--
-- Solução: os índices únicos só precisam garantir unicidade em mensalidades
-- ativas (não canceladas). Registros CANCELADOS são histórico e podem coexistir.
--
-- NOTA: Esta migração substitui 20260429235800_fix_mensalidade_unique_indexes,
-- que tinha timestamp anterior ao 20260430013158_add_oficina_mensalidades e
-- falharia em deploys frescos pois a coluna matriculaOficinaId ainda não existia.

DROP INDEX IF EXISTS mensalidade_regular_unique;
DROP INDEX IF EXISTS mensalidade_oficina_unique;

CREATE UNIQUE INDEX mensalidade_regular_unique
  ON mensalidades ("alunoId", "mesReferencia", "anoReferencia")
  WHERE "matriculaOficinaId" IS NULL AND status != 'CANCELADA';

CREATE UNIQUE INDEX mensalidade_oficina_unique
  ON mensalidades ("alunoId", "mesReferencia", "anoReferencia", "matriculaOficinaId")
  WHERE "matriculaOficinaId" IS NOT NULL AND status != 'CANCELADA';
