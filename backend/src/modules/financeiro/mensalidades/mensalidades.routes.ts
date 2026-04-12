// Rotas de mensalidades — TODO: implementar em STORY-022 (Sprint 5)

import type { FastifyInstance } from 'fastify';
import { MensalidadesController } from './mensalidades.controller';

export async function mensalidadesRoutes(app: FastifyInstance) {
  const _controller = new MensalidadesController();
  // TODO: registrar rotas em STORY-022 (Sprint 5)
}
