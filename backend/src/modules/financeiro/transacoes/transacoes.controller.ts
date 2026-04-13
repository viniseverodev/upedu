// TransacoesController — handlers HTTP (S027)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { TransacoesService } from './transacoes.service';
import { createTransacaoSchema } from './transacoes.schema';

export class TransacoesController {
  private service = new TransacoesService();

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createTransacaoSchema.parse(request.body);
    const transacao = await this.service.create(request.filialId, request.user.sub, body);
    return reply.status(201).send(transacao);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { mes, ano } = request.query as { mes?: string; ano?: string };
    const now = new Date();
    const mesNum = mes ? parseInt(mes, 10) : now.getMonth() + 1;
    const anoNum = ano ? parseInt(ano, 10) : now.getFullYear();
    const transacoes = await this.service.listByPeriodo(request.filialId, mesNum, anoNum);
    return reply.status(200).send(transacoes);
  }
}
