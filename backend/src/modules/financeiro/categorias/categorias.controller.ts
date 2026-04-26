// CategoriasController — handlers HTTP (S027)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CategoriasService } from './categorias.service';
import { createCategoriaSchema, updateCategoriaSchema } from './categorias.schema';

const uuidParamSchema = z.string().uuid('ID inválido');

export class CategoriasController {
  private service = new CategoriasService();

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createCategoriaSchema.parse(request.body);
    const categoria = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(categoria);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = updateCategoriaSchema.parse(request.body);
    const categoria = await this.service.update(id, request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(categoria);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const categorias = await this.service.listByFilial(request.filialId);
    return reply.status(200).send(categorias);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    await this.service.delete(id, request.filialId, request.user.sub, request.ip);
    return reply.status(204).send();
  }
}
