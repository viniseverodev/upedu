// Schemas Zod — Oficinas

import { z } from 'zod';

export const createOficinaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  descricao: z.string().max(500).optional(),
  valor: z.number({ required_error: 'Valor é obrigatório' }).min(0, 'Valor não pode ser negativo'),
});

export const updateOficinaSchema = z.object({
  nome: z.string().min(2).max(150).optional(),
  descricao: z.string().max(500).optional(),
  valor: z.number().min(0).optional(),
  ativa: z.boolean().optional(),
});

export const createTurmaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  vagas: z.number().int().min(1).optional(),
  horario: z.string().max(150).optional(),
});

export const updateTurmaSchema = z.object({
  nome: z.string().min(2).max(150).optional(),
  vagas: z.number().int().min(1).optional(),
  horario: z.string().max(150).optional(),
  ativa: z.boolean().optional(),
});

export const matricularAlunoSchema = z.object({
  alunoId: z.string().uuid('ID de aluno inválido'),
});

export type CreateOficinaInput = z.infer<typeof createOficinaSchema>;
export type UpdateOficinaInput = z.infer<typeof updateOficinaSchema>;
export type CreateTurmaInput   = z.infer<typeof createTurmaSchema>;
export type UpdateTurmaInput   = z.infer<typeof updateTurmaSchema>;
export type MatricularAlunoInput = z.infer<typeof matricularAlunoSchema>;
