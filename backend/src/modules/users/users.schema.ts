// Schemas Zod para users — S009, S010 (Sprint 3)

import { z } from 'zod';

// C3: Object.freeze previne mutação acidental da hierarquia em runtime
export const ROLE_HIERARCHY: Record<string, number> = Object.freeze({
  SUPER_ADMIN: 5,
  ADMIN_MATRIZ: 4,
  GERENTE_FILIAL: 3,
  ATENDENTE: 2,
  PROFESSOR: 1,
});

export const createUserSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  email: z.string().email('Email inválido'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR']),
  filialIds: z.array(z.string().uuid()).min(1, 'Ao menos uma filial é obrigatória'),
});

export const updateUserSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR']).optional(),
  filialIds: z.array(z.string().uuid()).optional(),
  ativo: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
