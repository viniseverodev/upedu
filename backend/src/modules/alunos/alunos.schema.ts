// Schemas Zod — Alunos (S012-S015)

import { z } from 'zod';

export const createAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'Data não existe no calendário'),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']),
  observacoes: z.string().max(500).optional(),
  consentimentoResponsavel: z.literal(true, {
    errorMap: () => ({ message: 'Consentimento parental obrigatório (LGPD Art. 14)' }),
  }),
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
});

export const updateAlunoSchema = z.object({
  nome: z.string().min(3).max(150).optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'Data não existe no calendário').optional(),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']).optional(),
  observacoes: z.string().max(500).optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA', 'PRE_MATRICULA']).optional(),
});

export const transferirAlunoSchema = z.object({
  filialDestinoId: z.string().uuid('ID de filial inválido'),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type TransferirAlunoInput = z.infer<typeof transferirAlunoSchema>;
