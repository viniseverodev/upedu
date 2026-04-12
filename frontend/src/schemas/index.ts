// Schemas Zod client-side — validação de formulários
// Espelham os schemas do backend para consistência

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos 1 maiúscula')
      .regex(/[0-9]/, 'Deve conter ao menos 1 número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const createAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']),
  observacoes: z.string().optional(),
  consentimentoResponsavel: z.literal(true, {
    errorMap: () => ({ message: 'Consentimento parental obrigatório (LGPD Art. 14)' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
