// Schemas Zod para matrículas — S020/S021

import { z } from 'zod';

export const createMatriculaSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
});

export type CreateMatriculaInput = z.infer<typeof createMatriculaSchema>;
