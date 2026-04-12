// Schemas Zod para filiais — S006, S007 (Sprint 2)
// CNPJ: aceita formatado (XX.XXX.XXX/XXXX-XX) ou apenas dígitos — normalizado para 14 dígitos

import { z } from 'zod';

const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(14, 'CNPJ deve ter 14 dígitos'));

export const createFilialSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  cnpj: cnpjSchema,
  diaVencimento: z.number().int().min(1).max(28).default(10),
  valorMensalidadeIntegral: z.number().positive('Valor deve ser positivo'),
  valorMensalidadeMeioTurno: z.number().positive('Valor deve ser positivo'),
});

export const updateFilialSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  cnpj: cnpjSchema.optional(),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  valorMensalidadeIntegral: z.number().positive().optional(),
  valorMensalidadeMeioTurno: z.number().positive().optional(),
  ativo: z.boolean().optional(),
});

export type CreateFilialInput = z.infer<typeof createFilialSchema>;
export type UpdateFilialInput = z.infer<typeof updateFilialSchema>;
