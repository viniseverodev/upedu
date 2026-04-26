// MatriculasController — handlers HTTP (S020/S021/S022)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MatriculasService } from './matriculas.service';
import { createMatriculaSchema } from './matriculas.schema';

// BUG-G: validação de path param UUID
const uuidParamSchema = z.string().uuid();

// C1: validação Zod para query params — evita enum inválido chegar ao Prisma como 500
const listByFilialQuerySchema = z.object({
  status: z.enum(['ATIVA', 'ENCERRADA', 'CANCELADA']).optional(),
  turno: z.enum(['MANHA', 'TARDE']).optional(),
});

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
    // BUG-G: validação de UUID para evitar query desnecessária ao Prisma com valor inválido
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const matriculas = await this.service.listByAluno(id, request.filialId);
    return reply.status(200).send(matriculas);
  }

  // S022 — GET /matriculas
  async listByFilial(request: FastifyRequest, reply: FastifyReply) {
    const query = listByFilialQuerySchema.parse(request.query);
    const matriculas = await this.service.listByFilial(request.filialId, query.status, query.turno);
    return reply.status(200).send(matriculas);
  }
}
