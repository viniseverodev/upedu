// Schemas Zod para users — TODO: implementar em STORY-009 (Sprint 3)
import { z } from 'zod';

export const createUsersSchema = z.object({
  // TODO: definir campos em STORY-009 (Sprint 3)
});

export const updateUsersSchema = createUsersSchema.partial();

export type CreateUsersInput = z.infer<typeof createUsersSchema>;
export type UpdateUsersInput = z.infer<typeof updateUsersSchema>;
