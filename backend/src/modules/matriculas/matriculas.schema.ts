// Schemas Zod para matriculas — TODO: implementar em STORY-020 (Sprint 4)
import { z } from 'zod';

export const createMatriculasSchema = z.object({
  // TODO: definir campos em STORY-020 (Sprint 4)
});

export const updateMatriculasSchema = createMatriculasSchema.partial();

export type CreateMatriculasInput = z.infer<typeof createMatriculasSchema>;
export type UpdateMatriculasInput = z.infer<typeof updateMatriculasSchema>;
