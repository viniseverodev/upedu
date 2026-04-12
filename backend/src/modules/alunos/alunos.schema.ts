// Schemas Zod para alunos — TODO: implementar em STORY-012 (Sprint 3)
import { z } from 'zod';

export const createAlunosSchema = z.object({
  // TODO: definir campos em STORY-012 (Sprint 3)
});

export const updateAlunosSchema = createAlunosSchema.partial();

export type CreateAlunosInput = z.infer<typeof createAlunosSchema>;
export type UpdateAlunosInput = z.infer<typeof updateAlunosSchema>;
