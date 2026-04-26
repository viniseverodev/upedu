// TransacoesController — handlers HTTP (S027)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TransacoesService } from './transacoes.service';
import { createTransacaoSchema, updateTransacaoSchema, bulkDeleteSchema, bulkUpdateSchema } from './transacoes.schema';

const uuidParamSchema = z.string().uuid('ID inválido');

const listQuerySchema = z.object({
  // range por data (novo padrão)
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // BUG-014: fallback mes/ano com range para evitar Date wrap silencioso
  mes: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 12, { message: 'Mês deve ser entre 1 e 12' })
    .optional(),
  ano: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .refine((n) => n >= 2020, { message: 'Ano deve ser >= 2020' })
    .optional(),
});

export class TransacoesController {
  private service = new TransacoesService();

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createTransacaoSchema.parse(request.body);
    const transacao = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(transacao);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = updateTransacaoSchema.parse(request.body);
    const transacao = await this.service.update(request.filialId, request.user.sub, id, body, request.ip);
    return reply.status(200).send(transacao);
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    await this.service.delete(request.filialId, request.user.sub, id, request.ip);
    return reply.status(204).send();
  }

  async removeBulk(request: FastifyRequest, reply: FastifyReply) {
    const body = bulkDeleteSchema.parse(request.body);
    const result = await this.service.deleteLote(request.filialId, request.user.sub, body.ids, request.ip);
    return reply.status(200).send(result);
  }

  async updateBulk(request: FastifyRequest, reply: FastifyReply) {
    const body = bulkUpdateSchema.parse(request.body);
    const result = await this.service.updateLote(request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(result);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listQuerySchema.parse(request.query);

    let transacoes;
    if (query.dataInicio && query.dataFim) {
      transacoes = await this.service.listByDateRange(request.filialId, query.dataInicio, query.dataFim);
    } else {
      const now = new Date();
      const mesNum = query.mes ?? now.getMonth() + 1;
      const anoNum = query.ano ?? now.getFullYear();
      transacoes = await this.service.listByPeriodo(request.filialId, mesNum, anoNum);
    }

    return reply.status(200).send(transacoes);
  }
}
