// Schemas Zod para categorias — TODO: implementar em STORY-027 (Sprint 7)
import { z } from 'zod';

export const createCategoriasSchema = z.object({
  // TODO: definir campos em STORY-027 (Sprint 7)
});

export const updateCategoriasSchema = createCategoriasSchema.partial();

export type CreateCategoriasInput = z.infer<typeof createCategoriasSchema>;
export type UpdateCategoriasInput = z.infer<typeof updateCategoriasSchema>;
