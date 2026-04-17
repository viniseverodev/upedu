// TransacoesController — handlers HTTP (S027)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TransacoesService } from './transacoes.service';
import { createTransacaoSchema } from './transacoes.schema';

// BUG-014: validar mes/ano com range para evitar Date wrap silencioso (mes=0 → dez ano anterior)
const listQuerySchema = z.object({
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

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { mes, ano } = listQuerySchema.parse(request.query);
    const now = new Date();
    const mesNum = mes ?? now.getMonth() + 1;
    const anoNum = ano ?? now.getFullYear();
    const transacoes = await this.service.listByPeriodo(request.filialId, mesNum, anoNum);
    return reply.status(200).send(transacoes);
  }
}
