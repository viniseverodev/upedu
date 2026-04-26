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
  turno: z.enum(['MANHA', 'TARDE']),
  observacoes: z.string().optional(),
  consentimentoResponsavel: z.literal(true, {
    errorMap: () => ({ message: 'Consentimento parental obrigatório (LGPD Art. 14)' }),
  }),
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
});

// L2: CNPJ com verificação de dígito módulo 11 (alinhado com backend/filiais.schema.ts)
// BUG-002: algoritmo anterior divergia do backend — arrays de pesos fixos garantem consistência
function validarCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
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
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ inválido (formato: 00.000.000/0000-00)')
  .refine(validarCnpj, 'CNPJ inválido (dígitos verificadores)');

export const createFilialSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  cnpj: cnpjSchema,
  diaVencimento: z.coerce.number().int().min(1).max(28).default(10),
  valorMensalidadeManha: z.coerce.number().positive('Valor deve ser positivo'),
  valorMensalidadeTarde: z.coerce.number().positive('Valor deve ser positivo'),
});

export const updateFilialSchema = z.object({
  nome: z.string().min(3).max(100).optional(),
  cnpj: cnpjSchema.optional(),
  diaVencimento: z.coerce.number().int().min(1).max(28).optional(),
  valorMensalidadeManha: z.coerce.number().positive().optional(),
  valorMensalidadeTarde: z.coerce.number().positive().optional(),
  ativo: z.boolean().optional(),
});

export const updateAlunoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150).optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)').optional(),
  turno: z.enum(['MANHA', 'TARDE']).optional(),
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

export const cpfSchema = z
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

// S020 — Criar matrícula
export const createMatriculaSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  turno: z.enum(['MANHA', 'TARDE']),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
});

// S022 — Criar mensalidade
export const createMensalidadeSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  mesReferencia: z.number().int().min(1).max(12),
  anoReferencia: z.number().int().min(2020),
});

// S023 — Registrar pagamento (suporta múltiplas formas e pagamento parcial)
export const pagarMensalidadeSchema = z.object({
  splits: z.array(z.object({
    formaPagamento: z.string().min(1, 'Forma de pagamento obrigatória'),
    valor: z.number({ invalid_type_error: 'Informe o valor' }).positive('Valor deve ser positivo'),
  })).min(1, 'Informe ao menos uma forma de pagamento'),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  valorDesconto: z.number().min(0).default(0),
});

// S024 — Cancelar mensalidade
export const cancelarMensalidadeSchema = z.object({
  motivoCancelamento: z.string().min(3, 'Motivo obrigatório'),
});

// Estornar pagamento
export const estornarMensalidadeSchema = z.object({
  motivoEstorno: z.string().min(3, 'Motivo obrigatório'),
});

// Ações em lote
export const bulkPagarSchema = z.object({
  formaPagamento: z.string().min(1, 'Forma de pagamento obrigatória'),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  valorDesconto: z.number().min(0).default(0),
});

export const bulkCancelarSchema = z.object({
  motivoCancelamento: z.string().min(3, 'Motivo obrigatório'),
});

export const bulkEstornarSchema = z.object({
  motivoGlobal: z.string().optional(),
});

// S027 — Criar categoria financeira
export const createCategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
});

// S027 — Registrar transação
export const createTransacaoSchema = z.object({
  categoriaId: z.string().uuid('Categoria inválida'),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(3, 'Descrição obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  dataTransacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
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
export type CreateMatriculaInput = z.infer<typeof createMatriculaSchema>;
export type CreateMensalidadeInput = z.infer<typeof createMensalidadeSchema>;
export type PagarMensalidadeInput = z.infer<typeof pagarMensalidadeSchema>;
export type CancelarMensalidadeInput = z.infer<typeof cancelarMensalidadeSchema>;
export type EstornarMensalidadeInput = z.infer<typeof estornarMensalidadeSchema>;
export type BulkPagarInput = z.infer<typeof bulkPagarSchema>;
export type BulkCancelarInput = z.infer<typeof bulkCancelarSchema>;
export type BulkEstornarInput = z.infer<typeof bulkEstornarSchema>;
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type CreateTransacaoInput = z.infer<typeof createTransacaoSchema>;
