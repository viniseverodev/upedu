// Schemas Zod — Retiradas (autorizações + validação + registro)

import { z } from 'zod';

// CPF: aceita com ou sem máscara, valida dígitos verificadores
function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  if (rem !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  return rem === parseInt(d[10]);
}

export function formatarCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const cpfSchema = z.string()
  .min(1, 'CPF obrigatório')
  .refine((v) => validarCPF(v), 'CPF inválido');

// Horário HH:MM
const horarioSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional();

export const createAutorizacaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  cpf: cpfSchema,
  relacao: z.string().max(100).optional(),
  fotoUrl: z.string().url('URL inválida').optional(),
  tipo: z.enum(['PERMANENTE', 'TEMPORARIA']),
  dataInicio: z.string().date().optional(),
  dataFim: z.string().date().optional(),
  horarioInicio: horarioSchema,
  horarioFim: horarioSchema,
}).superRefine((data, ctx) => {
  if (data.tipo === 'TEMPORARIA' && !data.dataFim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data fim obrigatória para autorização temporária', path: ['dataFim'] });
  }
  if (data.horarioInicio && data.horarioFim && data.horarioInicio >= data.horarioFim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Horário fim deve ser após o início', path: ['horarioFim'] });
  }
});

export const updateAutorizacaoSchema = z.object({
  nome: z.string().min(2).max(150).optional(),
  cpf: cpfSchema.optional(),
  relacao: z.string().max(100).optional(),
  fotoUrl: z.string().url().optional().nullable(),
  tipo: z.enum(['PERMANENTE', 'TEMPORARIA']).optional(),
  dataInicio: z.string().date().optional().nullable(),
  dataFim: z.string().date().optional().nullable(),
  horarioInicio: horarioSchema,
  horarioFim: horarioSchema,
  ativo: z.boolean().optional(),
});

export const validarCpfSchema = z.object({
  alunoId: z.string().uuid(),
  cpf: cpfSchema,
});

export const confirmarRetiradaSchema = z.object({
  alunoId: z.string().uuid(),
  autorizacaoId: z.string().uuid(),
});

export type CreateAutorizacaoInput = z.infer<typeof createAutorizacaoSchema>;
export type UpdateAutorizacaoInput = z.infer<typeof updateAutorizacaoSchema>;
export type ValidarCpfInput = z.infer<typeof validarCpfSchema>;
export type ConfirmarRetiradaInput = z.infer<typeof confirmarRetiradaSchema>;
