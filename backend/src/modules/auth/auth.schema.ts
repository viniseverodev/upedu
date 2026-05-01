// Schemas Zod para autenticação — validação via fastify-type-provider-zod

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8).max(100),
});

export const changePasswordSchema = z
  .object({
    // BUG-021: no primeiroAcesso a senha temporária foi gerada pelo sistema,
    // portanto não exigir a senha atual (validado no service via user.primeiroAcesso)
    currentPassword: z.string().optional(),
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

export const updateProfileSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100).optional(),
  email: z.string().email('Email inválido').optional(),
}).refine((d) => d.nome !== undefined || d.email !== undefined, {
  message: 'Informe ao menos um campo para atualizar',
});

export const registerSchema = z
  .object({
    nomeEscola: z.string().min(3, 'Nome da escola deve ter ao menos 3 caracteres').max(100),
    cnpjEscola: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
    nomeAdmin: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
    email: z.string().email('Email inválido'),
    senha: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos 1 maiúscula')
      .regex(/[0-9]/, 'Deve conter ao menos 1 número'),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
