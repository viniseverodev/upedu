// Rotas de categorias — TODO: implementar em STORY-027 (Sprint 7)

import type { FastifyInstance } from 'fastify';
import { CategoriasController } from './categorias.controller';

export async function categoriasRoutes(app: FastifyInstance) {
  const _controller = new CategoriasController();
  // TODO: registrar rotas em STORY-027 (Sprint 7)
}
