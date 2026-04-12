// Schemas Zod para mensalidades — TODO: implementar em STORY-022 (Sprint 5)
import { z } from 'zod';

export const createMensalidadesSchema = z.object({
  // TODO: definir campos em STORY-022 (Sprint 5)
});

export const updateMensalidadesSchema = createMensalidadesSchema.partial();

export type CreateMensalidadesInput = z.infer<typeof createMensalidadesSchema>;
export type UpdateMensalidadesInput = z.infer<typeof updateMensalidadesSchema>;
