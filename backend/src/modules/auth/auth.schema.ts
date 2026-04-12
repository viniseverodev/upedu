// Schemas Zod para autenticação — validação via fastify-type-provider-zod

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8).max(100),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
