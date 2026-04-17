// Schemas Zod para matrículas — S020/S021

import { z } from 'zod';

export const createMatriculaSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'Data não existe no calendário'),
});

export type CreateMatriculaInput = z.infer<typeof createMatriculaSchema>;
