// MatriculasController — handlers HTTP (S020/S021/S022)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { MatriculasService } from './matriculas.service';
import { createMatriculaSchema } from './matriculas.schema';

export class MatriculasController {
  private service = new MatriculasService();

  // S020 — POST /matriculas
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createMatriculaSchema.parse(request.body);
    const matricula = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(matricula);
  }

  // S021 — GET /alunos/:id/matriculas
  async listByAluno(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const matriculas = await this.service.listByAluno(id, request.filialId);
    return reply.status(200).send(matriculas);
  }

  // S022 — GET /matriculas
  async listByFilial(request: FastifyRequest, reply: FastifyReply) {
    const { status, turno } = request.query as { status?: string; turno?: string };
    const matriculas = await this.service.listByFilial(request.filialId, status as any, turno as any);
    return reply.status(200).send(matriculas);
  }
}
