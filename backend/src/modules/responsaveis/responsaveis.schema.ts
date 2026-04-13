// Schemas Zod para responsaveis — S018/S019 (Sprint 5)
// CPF validado com algoritmo módulo 11 (LGPD)

import { z } from 'zod';

// CPF: dígito verificador módulo 11
function validarCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais

  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF inválido (formato: 000.000.000-00)')
  .refine(validarCpf, 'CPF inválido (dígitos verificadores)');

export const createResponsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150),
  cpf: cpfSchema.optional(),
  rg: z.string().min(5).max(20).optional(),
  telefone: z.string().min(8).max(20).optional(),
  email: z.string().email('Email inválido').optional(),
});

export const updateResponsavelSchema = z.object({
  nome: z.string().min(3).max(150).optional(),
  cpf: cpfSchema.optional(),
  rg: z.string().min(5).max(20).optional(),
  telefone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
});

export const vincularResponsavelSchema = z.object({
  responsavelId: z.string().uuid('ID de responsável inválido'),
  parentesco: z.string().min(2, 'Parentesco obrigatório').max(50),
  isResponsavelFinanceiro: z.boolean().default(false),
});

export type CreateResponsavelInput = z.infer<typeof createResponsavelSchema>;
export type UpdateResponsavelInput = z.infer<typeof updateResponsavelSchema>;
export type VincularResponsavelInput = z.infer<typeof vincularResponsavelSchema>;
