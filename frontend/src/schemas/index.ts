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

// CPF: dígito verificador módulo 11
function validarCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
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
  rg: z.string().min(5, 'RG inválido').max(20).optional(),
  telefone: z.string().min(8, 'Telefone inválido').max(20).optional(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type CreateFilialInput = z.infer<typeof createFilialSchema>;
export type UpdateFilialInput = z.infer<typeof updateFilialSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type CreateResponsavelInput = z.infer<typeof createResponsavelSchema>;
export type UpdateResponsavelInput = z.infer<typeof updateResponsavelSchema>;
export type VincularResponsavelInput = z.infer<typeof vincularResponsavelSchema>;
