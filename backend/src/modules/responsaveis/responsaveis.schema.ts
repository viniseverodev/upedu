// Schemas Zod para responsaveis — TODO: implementar em STORY-018 (Sprint 4)
import { z } from 'zod';

export const createResponsaveisSchema = z.object({
  // TODO: definir campos em STORY-018 (Sprint 4)
});

export const updateResponsaveisSchema = createResponsaveisSchema.partial();

export type CreateResponsaveisInput = z.infer<typeof createResponsaveisSchema>;
export type UpdateResponsaveisInput = z.infer<typeof updateResponsaveisSchema>;
