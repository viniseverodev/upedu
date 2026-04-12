// Schemas Zod para transacoes — TODO: implementar em STORY-027 (Sprint 7)
import { z } from 'zod';

export const createTransacoesSchema = z.object({
  // TODO: definir campos em STORY-027 (Sprint 7)
});

export const updateTransacoesSchema = createTransacoesSchema.partial();

export type CreateTransacoesInput = z.infer<typeof createTransacoesSchema>;
export type UpdateTransacoesInput = z.infer<typeof updateTransacoesSchema>;
