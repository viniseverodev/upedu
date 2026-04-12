// FiliaisController — handlers HTTP para S006, S007, S008

import type { FastifyRequest, FastifyReply } from 'fastify';
import { FiliaisService } from './filiais.service';
import { createFilialSchema, updateFilialSchema } from './filiais.schema';

export class FiliaisController {
  private service = new FiliaisService();

  // S008: GET /filiais — lista todas (admin) ou apenas as atribuídas (outros)
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { sub: userId, orgId: organizationId, role } = request.user;
    const filiais = await this.service.list(userId, organizationId, role);
    return reply.status(200).send(filiais);
  }

  // S008: GET /filiais/ativas — seletor de filial ativa
  async listActive(request: FastifyRequest, reply: FastifyReply) {
    const { sub: userId, orgId: organizationId, role } = request.user;
    const filiais = await this.service.listActive(userId, organizationId, role);
    return reply.status(200).send(filiais);
  }

  // S006: POST /filiais — criar filial
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createFilialSchema.parse(request.body);
    const { sub: userId, orgId: organizationId } = request.user;
    const filial = await this.service.create(organizationId, userId, body);
    return reply.status(201).send(filial);
  }

  // S007: PATCH /filiais/:id — editar filial
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = updateFilialSchema.parse(request.body);
    const { sub: userId, orgId: organizationId } = request.user;
    const filial = await this.service.update(id, organizationId, userId, body);
    return reply.status(200).send(filial);
  }
}
