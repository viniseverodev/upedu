// Schemas Zod para filiais — S006, S007 (Sprint 2)
// CNPJ: aceita formatado (XX.XXX.XXX/XXXX-XX) ou apenas dígitos — normalizado para 14 dígitos
// WARN-003: validação completa com dígitos verificadores (módulo 11/8)

import { z } from 'zod';

function validarCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false; // todos dígitos iguais

  const calc = (weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(d[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(w1) === Number(d[12]) && calc(w2) === Number(d[13]);
}

const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z.string()
      .length(14, 'CNPJ deve ter 14 dígitos')
      .refine(validarCnpj, 'CNPJ inválido (dígitos verificadores)'),
  );

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
