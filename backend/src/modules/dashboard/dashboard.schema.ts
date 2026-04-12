// Schemas Zod para dashboard — TODO: implementar em STORY-030 (Sprint 6)
import { z } from 'zod';

export const createDashboardSchema = z.object({
  // TODO: definir campos em STORY-030 (Sprint 6)
});

export const updateDashboardSchema = createDashboardSchema.partial();

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;
