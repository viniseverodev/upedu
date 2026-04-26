// ResponsaveisController — handlers HTTP (S018/S019)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ResponsaveisService } from './responsaveis.service';
import {
  createResponsavelSchema,
  updateResponsavelSchema,
  vincularResponsavelSchema,
} from './responsaveis.schema';

// BUG-011: validação de path param UUID
const uuidParamSchema = z.string().uuid();

export class ResponsaveisController {
  private service = new ResponsaveisService();

  // GET /responsaveis — S018 (scoped por filial via filialContext)
  async list(req: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.listByFilial(req.filialId);
    return reply.send(result);
  }

  // POST /responsaveis — S018
  async create(req: FastifyRequest, reply: FastifyReply) {
    const data = createResponsavelSchema.parse(req.body);
    const result = await this.service.create(req.user.sub, data, req.ip);
    return reply.status(201).send(result);
  }

  // GET /responsaveis/:id — S018 (BUG-009: passa orgId para check de tenant)
  async findById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const result = await this.service.findById(id, req.user.orgId);
    return reply.send(result);
  }

  // GET /responsaveis/:id/revelar-cpf — S018 (BUG-010: passa orgId para check de tenant)
  async revelarCpf(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const result = await this.service.revelarCpf(id, req.user.sub, req.user.orgId, req.ip);
    return reply.send(result);
  }

  // PATCH /responsaveis/:id — S018 (BUG-009: passa orgId para check de tenant)
  async update(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const data = updateResponsavelSchema.parse(req.body);
    const result = await this.service.update(id, req.user.sub, req.user.orgId, data, req.ip);
    return reply.send(result);
  }

  // POST /alunos/:id/responsaveis — S019
  async vincular(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const data = vincularResponsavelSchema.parse(req.body);
    const result = await this.service.vincular(
      id,
      req.filialId,
      req.user.sub,
      data,
      req.ip,
    );
    return reply.status(201).send(result);
  }

  // DELETE /alunos/:alunoId/responsaveis/:responsavelId — S019
  async desvincular(req: FastifyRequest, reply: FastifyReply) {
    const { alunoId, responsavelId } = req.params as { alunoId: string; responsavelId: string };
    if (!uuidParamSchema.safeParse(alunoId).success || !uuidParamSchema.safeParse(responsavelId).success) {
      return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    }
    await this.service.desvincular(
      alunoId,
      req.filialId,
      responsavelId,
      req.user.sub,
      req.ip,
    );
    return reply.status(204).send();
  }
}
