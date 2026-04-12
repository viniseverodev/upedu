// Schemas Zod para filiais — TODO: implementar em STORY-006 (Sprint 2)
import { z } from 'zod';

export const createFiliaisSchema = z.object({
  // TODO: definir campos em STORY-006 (Sprint 2)
});

export const updateFiliaisSchema = createFiliaisSchema.partial();

export type CreateFiliaisInput = z.infer<typeof createFiliaisSchema>;
export type UpdateFiliaisInput = z.infer<typeof updateFiliaisSchema>;
