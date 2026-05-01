// OficinasController — handlers HTTP

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OficinasService } from './oficinas.service';
import {
  createOficinaSchema,
  updateOficinaSchema,
  createTurmaSchema,
  updateTurmaSchema,
  matricularAlunoSchema,
} from './oficinas.schema';

const uuidParam = z.string().uuid();

export class OficinasController {
  private service = new OficinasService();

  // GET /oficinas
  async list(request: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.list(request.filialId);
    return reply.status(200).send(data);
  }

  // GET /oficinas/:id
  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParam.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const data = await this.service.findById(id, request.filialId);
    return reply.status(200).send(data);
  }

  // POST /oficinas
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createOficinaSchema.parse(request.body);
    const data = await this.service.create(request.filialId, body);
    return reply.status(201).send(data);
  }

  // PATCH /oficinas/:id
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParam.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = updateOficinaSchema.parse(request.body);
    const data = await this.service.update(id, request.filialId, body);
    return reply.status(200).send(data);
  }

  // DELETE /oficinas/:id
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParam.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    await this.service.delete(id, request.filialId);
    return reply.status(204).send();
  }

  // POST /oficinas/:id/turmas
  async createTurma(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParam.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = createTurmaSchema.parse(request.body);
    const data = await this.service.createTurma(id, request.filialId, body);
    return reply.status(201).send(data);
  }

  // PATCH /oficinas/:id/turmas/:turmaId
  async updateTurma(request: FastifyRequest, reply: FastifyReply) {
    const { turmaId } = request.params as { turmaId: string };
    if (!uuidParam.safeParse(turmaId).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = updateTurmaSchema.parse(request.body);
    const data = await this.service.updateTurma(turmaId, request.filialId, body);
    return reply.status(200).send(data);
  }

  // DELETE /oficinas/:id/turmas/:turmaId
  async deleteTurma(request: FastifyRequest, reply: FastifyReply) {
    const { turmaId } = request.params as { turmaId: string };
    if (!uuidParam.safeParse(turmaId).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    await this.service.deleteTurma(turmaId, request.filialId);
    return reply.status(204).send();
  }

  // GET /oficinas/:id/turmas/:turmaId/alunos
  async listMatriculas(request: FastifyRequest, reply: FastifyReply) {
    const { turmaId } = request.params as { turmaId: string };
    if (!uuidParam.safeParse(turmaId).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const data = await this.service.listMatriculas(turmaId, request.filialId);
    return reply.status(200).send(data);
  }

  // POST /oficinas/:id/turmas/:turmaId/alunos
  async matricular(request: FastifyRequest, reply: FastifyReply) {
    const { turmaId } = request.params as { turmaId: string };
    if (!uuidParam.safeParse(turmaId).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = matricularAlunoSchema.parse(request.body);
    const data = await this.service.matricular(turmaId, request.filialId, body);
    return reply.status(201).send(data);
  }

  // DELETE /oficinas/:id/turmas/:turmaId/alunos/:alunoId
  async desmatricular(request: FastifyRequest, reply: FastifyReply) {
    const { turmaId, alunoId } = request.params as { turmaId: string; alunoId: string };
    if (!uuidParam.safeParse(turmaId).success || !uuidParam.safeParse(alunoId).success) {
      return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    }
    await this.service.desmatricular(turmaId, request.filialId, alunoId);
    return reply.status(204).send();
  }
}
