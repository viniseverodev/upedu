-- Migration: remove INTEGRAL e MEIO_TURNO do sistema
-- 1. Renomeia colunas de filiais
ALTER TABLE "filiais" RENAME COLUMN "valorMensalidadeIntegral" TO "valorMensalidadeManha";
ALTER TABLE "filiais" RENAME COLUMN "valorMensalidadeMeioTurno" TO "valorMensalidadeTarde";

-- 2. Migra dados existentes de turno para os novos valores
UPDATE "alunos"    SET "turno" = 'MANHA' WHERE "turno" = 'INTEGRAL';
UPDATE "alunos"    SET "turno" = 'TARDE' WHERE "turno" = 'MEIO_TURNO';
UPDATE "matriculas" SET "turno" = 'MANHA' WHERE "turno" = 'INTEGRAL';
UPDATE "matriculas" SET "turno" = 'TARDE' WHERE "turno" = 'MEIO_TURNO';

-- 3. Recria o enum com apenas MANHA e TARDE
CREATE TYPE "Turno_new" AS ENUM ('MANHA', 'TARDE');

ALTER TABLE "alunos"
  ALTER COLUMN "turno" TYPE "Turno_new"
  USING "turno"::text::"Turno_new";

ALTER TABLE "matriculas"
  ALTER COLUMN "turno" TYPE "Turno_new"
  USING "turno"::text::"Turno_new";

DROP TYPE "Turno";
ALTER TYPE "Turno_new" RENAME TO "Turno";
