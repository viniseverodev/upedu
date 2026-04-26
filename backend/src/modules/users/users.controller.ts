// UsersController — handlers HTTP para S009, S010

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { UsersService } from './users.service';
import { createUserSchema, updateUserSchema } from './users.schema';

// BUG-011: validação de path param UUID
const uuidParamSchema = z.string().uuid();

export class UsersController {
  private service = new UsersService();

  // S009: GET /users — listar usuários da organização
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { orgId: organizationId } = request.user;
    const users = await this.service.list(organizationId);
    return reply.status(200).send(users);
  }

  // S009: POST /users — criar usuário com senha temporária
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createUserSchema.parse(request.body);
    const { sub: creatorId, orgId: organizationId, role: creatorRole } = request.user;
    const result = await this.service.create(organizationId, creatorId, creatorRole, body, request.ip);
    return reply.status(201).send(result);
  }

  // S010: PATCH /users/:id — editar usuário
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = updateUserSchema.parse(request.body);
    const { sub: updaterId, orgId: organizationId, role: updaterRole } = request.user;
    const user = await this.service.update(id, organizationId, updaterId, updaterRole, body, request.ip);
    return reply.status(200).send(user);
  }
}
