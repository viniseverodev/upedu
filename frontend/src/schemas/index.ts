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
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
});

export const createFilialSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  diaVencimento: z.coerce.number().int().min(1).max(28).default(10),
  valorMensalidadeIntegral: z.coerce.number().positive('Valor deve ser positivo'),
  valorMensalidadeMeioTurno: z.coerce.number().positive('Valor deve ser positivo'),
});

export const updateFilialSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  cnpj: z.string().min(14).max(18).optional(),
  diaVencimento: z.coerce.number().int().min(1).max(28).optional(),
  valorMensalidadeIntegral: z.coerce.number().positive().optional(),
  valorMensalidadeMeioTurno: z.coerce.number().positive().optional(),
  ativo: z.boolean().optional(),
});

export const updateAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150).optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)').optional(),
  turno: z.enum(['INTEGRAL', 'MEIO_TURNO']).optional(),
  observacoes: z.string().max(500).optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA', 'PRE_MATRICULA']).optional(),
});

export const createUserSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  email: z.string().email('Email inválido'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR']),
  filialIds: z.array(z.string()).min(1, 'Selecione ao menos uma filial'),
});

export const updateUserSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR']).optional(),
  filialIds: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type CreateFilialInput = z.infer<typeof createFilialSchema>;
export type UpdateFilialInput = z.infer<typeof updateFilialSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
