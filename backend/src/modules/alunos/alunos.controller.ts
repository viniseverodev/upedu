// AlunosController — handlers HTTP (S012-S017)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AlunosService } from './alunos.service';
import { createAlunoSchema, updateAlunoSchema, transferirAlunoSchema } from './alunos.schema';

// BUG-013: validar status como enum para retornar 422 em vez de 500
const listQuerySchema = z.object({
  status: z.enum(['ATIVO', 'INATIVO', 'LISTA_ESPERA', 'PRE_MATRICULA', 'TRANSFERIDO']).optional(),
});

export class AlunosController {
  private service = new AlunosService();

  // S012 — GET /alunos?status=
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { status } = listQuerySchema.parse(request.query);
    const alunos = await this.service.list(request.filialId, status);
    return reply.status(200).send(alunos);
  }

  // S016 — GET /alunos/:id
  async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const aluno = await this.service.findById(id, request.filialId);
    return reply.status(200).send(aluno);
  }

  // S012 — POST /alunos
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createAlunoSchema.parse(request.body);
    const aluno = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(aluno);
  }

  // S013 — PATCH /alunos/:id
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = updateAlunoSchema.parse(request.body);
    const aluno = await this.service.update(id, request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(aluno);
  }

  // S013 — DELETE /alunos/:id (soft delete)
  async softDelete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await this.service.softDelete(id, request.filialId, request.user.sub, request.ip);
    return reply.status(204).send();
  }

  // S014 — PATCH /alunos/:id/promover
  async promover(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const aluno = await this.service.promover(id, request.filialId, request.user.sub, request.ip);
    return reply.status(200).send(aluno);
  }

  // S015 — PATCH /alunos/:id/transferir
  async transferir(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = transferirAlunoSchema.parse(request.body);
    const aluno = await this.service.transferir(id, request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(aluno);
  }

  // S017 — GET /alunos/export?status=&format=csv (BUG-013: mesmo schema de validação)
  async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    const { status } = listQuerySchema.parse(request.query);
    const csv = await this.service.exportCsv(request.filialId, status);
    return reply
      .status(200)
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="alunos.csv"')
      .send(csv);
  }
}
