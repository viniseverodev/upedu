// Schemas Zod — Alunos (S012-S015)

import { z } from 'zod';

// M2: Validação de data de nascimento — data válida + idade mínima 3 e máxima 100 anos
const dataNascimentoSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
  .refine((val) => {
    const [y, m, d] = val.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, 'Data não existe no calendário')
  .refine((val) => {
    const nascimento = new Date(val + 'T00:00:00');
    const idadeAnos = (Date.now() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return idadeAnos >= 3;
  }, 'Aluno deve ter ao menos 3 anos de idade')
  // M1: limite superior de 100 anos para rejeitar datas absurdas
  .refine((val) => {
    const nascimento = new Date(val + 'T00:00:00');
    const idadeAnos = (Date.now() - nascimento.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return idadeAnos <= 100;
  }, 'Data de nascimento inválida (mais de 100 anos)')
  .refine((val) => {
    const nascimento = new Date(val + 'T00:00:00');
    return nascimento <= new Date();
  }, 'Data de nascimento não pode ser no futuro');

export const createAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150),
  dataNascimento: dataNascimentoSchema,
  turno: z.enum(['MANHA', 'TARDE']),
  observacoes: z.string().max(500).optional(),
  consentimentoResponsavel: z.literal(true, {
    errorMap: () => ({ message: 'Consentimento parental obrigatório (LGPD Art. 14)' }),
  }),
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
});

export const updateAlunoSchema = z.object({
  nome: z.string().min(3).max(150).optional(),
  dataNascimento: dataNascimentoSchema.optional(),
  turno: z.enum(['MANHA', 'TARDE']).optional(),
  observacoes: z.string().max(500).optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA', 'PRE_MATRICULA']).optional(),
});

export const transferirAlunoSchema = z.object({
  filialDestinoId: z.string().uuid('ID de filial inválido'),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type TransferirAlunoInput = z.infer<typeof transferirAlunoSchema>;
