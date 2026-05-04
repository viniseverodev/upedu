// RetiradasController — handlers HTTP

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RetiradasService } from './retiradas.service';
import {
  createAutorizacaoSchema,
  updateAutorizacaoSchema,
  validarCpfSchema,
  confirmarRetiradaSchema,
} from './retiradas.schema';

const uuidParam = z.string().uuid();

export class RetiradasController {
  private service = new RetiradasService();

  // GET /retiradas/alunos/:alunoId/autorizacoes
  async listAutorizacoes(request: FastifyRequest, reply: FastifyReply) {
    const { alunoId } = request.params as { alunoId: string };
    if (!uuidParam.safeParse(alunoId).success) return reply.status(422).send({ message: 'ID inválido' });
    const data = await this.service.listAutorizacoes(alunoId, request.filialId);
    return reply.status(200).send(data);
  }

  // POST /retiradas/alunos/:alunoId/autorizacoes
  async createAutorizacao(request: FastifyRequest, reply: FastifyReply) {
    const { alunoId } = request.params as { alunoId: string };
    if (!uuidParam.safeParse(alunoId).success) return reply.status(422).send({ message: 'ID inválido' });
    const body = createAutorizacaoSchema.parse(request.body);
    const data = await this.service.createAutorizacao(alunoId, request.filialId, body);
    return reply.status(201).send(data);
  }

  // PATCH /retiradas/alunos/:alunoId/autorizacoes/:authId
  async updateAutorizacao(request: FastifyRequest, reply: FastifyReply) {
    const { authId } = request.params as { authId: string };
    if (!uuidParam.safeParse(authId).success) return reply.status(422).send({ message: 'ID inválido' });
    const body = updateAutorizacaoSchema.parse(request.body);
    const data = await this.service.updateAutorizacao(authId, request.filialId, body);
    return reply.status(200).send(data);
  }

  // DELETE /retiradas/alunos/:alunoId/autorizacoes/:authId
  async deleteAutorizacao(request: FastifyRequest, reply: FastifyReply) {
    const { authId } = request.params as { authId: string };
    if (!uuidParam.safeParse(authId).success) return reply.status(422).send({ message: 'ID inválido' });
    await this.service.deleteAutorizacao(authId, request.filialId);
    return reply.status(204).send();
  }

  // GET /retiradas/buscar?nome=xxx
  async buscarAlunos(request: FastifyRequest, reply: FastifyReply) {
    const { nome } = request.query as { nome?: string };
    const data = await this.service.buscarAlunos(request.filialId, nome ?? '');
    return reply.status(200).send(data);
  }

  // GET /retiradas/autorizacoes-validas?alunoId=xxx
  async getAutorizacoesValidas(request: FastifyRequest, reply: FastifyReply) {
    const { alunoId } = request.query as { alunoId?: string };
    if (!alunoId || !uuidParam.safeParse(alunoId).success) {
      return reply.status(422).send({ message: 'alunoId inválido' });
    }
    const data = await this.service.getAutorizacoesValidas(alunoId, request.filialId);
    return reply.status(200).send(data);
  }

  // POST /retiradas/validar
  async validarCpf(request: FastifyRequest, reply: FastifyReply) {
    const body = validarCpfSchema.parse(request.body);
    const data = await this.service.validarCpf(request.filialId, body);
    return reply.status(200).send(data);
  }

  // POST /retiradas/confirmar
  async confirmarRetirada(request: FastifyRequest, reply: FastifyReply) {
    const body = confirmarRetiradaSchema.parse(request.body);
    const data = await this.service.confirmarRetirada(request.filialId, body);
    return reply.status(201).send(data);
  }
}
