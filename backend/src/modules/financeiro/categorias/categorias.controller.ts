// CategoriasController — handlers HTTP (S027)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { CategoriasService } from './categorias.service';
import { createCategoriaSchema } from './categorias.schema';

export class CategoriasController {
  private service = new CategoriasService();

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createCategoriaSchema.parse(request.body);
    const categoria = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(categoria);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const categorias = await this.service.listByFilial(request.filialId);
    return reply.status(200).send(categorias);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await this.service.delete(id, request.filialId, request.user.sub, request.ip);
    return reply.status(204).send();
  }
}
