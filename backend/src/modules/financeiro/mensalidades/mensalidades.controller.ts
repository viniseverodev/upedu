// MensalidadesController — handlers HTTP (S022/S023/S024)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MensalidadesService } from './mensalidades.service';
import {
  createMensalidadeSchema,
  pagarMensalidadeSchema,
  cancelarMensalidadeSchema,
  estornarMensalidadeSchema,
  bulkPagarSchema,
  bulkCancelarSchema,
  bulkEstornarSchema,
} from './mensalidades.schema';

// BUG-011: validação de path param UUID para evitar queries com IDs inválidos
const uuidParamSchema = z.string().uuid();

// C3: Validação Zod para query params do endpoint de listagem
const listQuerySchema = z.object({
  dataInicio: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataInicio inválida (YYYY-MM-DD)')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'dataInicio não existe no calendário')
    .optional(),
  dataFim: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataFim inválida (YYYY-MM-DD)')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'dataFim não existe no calendário')
    .optional(),
}).refine(
  (q) => {
    if (q.dataInicio && q.dataFim) return q.dataInicio <= q.dataFim;
    return true;
  },
  { message: 'dataInicio deve ser anterior ou igual a dataFim', path: ['dataInicio'] },
);

export class MensalidadesController {
  private service = new MensalidadesService();

  // S022 — GET /mensalidades?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
  // C3: query params validados via Zod antes de usar
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listQuerySchema.parse(request.query);
    // BUG-010: normalizar "hoje" para BRT — new Date() em servidor UTC pode retornar dia errado
    const hojeStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const fim = query.dataFim
      ? new Date(query.dataFim + 'T00:00:00-03:00')
      : new Date(hojeStr + 'T23:59:59.999-03:00');
    const ini = query.dataInicio
      ? new Date(query.dataInicio + 'T00:00:00-03:00')
      : new Date(fim.getTime() - 14 * 24 * 60 * 60 * 1000);
    const result = await this.service.list(request.filialId, ini, fim);
    return reply.status(200).send(result);
  }

  // S022 — POST /mensalidades
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.create(request.filialId, request.user.sub, body, request.ip);
    return reply.status(201).send(mensalidade);
  }

  // S023 — PATCH /mensalidades/:id/pagar
  async pagar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = pagarMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.pagar(id, request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(mensalidade);
  }

  // PATCH /mensalidades/:id/estornar
  async estornar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const body = estornarMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.estornar(id, request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(mensalidade);
  }

  // POST /mensalidades/bulk/pagar
  async bulkPagar(request: FastifyRequest, reply: FastifyReply) {
    const body = bulkPagarSchema.parse(request.body);
    const result = await this.service.pagarLote(request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(result);
  }

  // POST /mensalidades/bulk/cancelar
  async bulkCancelar(request: FastifyRequest, reply: FastifyReply) {
    const body = bulkCancelarSchema.parse(request.body);
    const result = await this.service.cancelarLote(request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(result);
  }

  // POST /mensalidades/bulk/estornar
  async bulkEstornar(request: FastifyRequest, reply: FastifyReply) {
    const body = bulkEstornarSchema.parse(request.body);
    const result = await this.service.estornarLote(request.filialId, request.user.sub, body, request.ip);
    return reply.status(200).send(result);
  }

  // S024 — PATCH /mensalidades/:id/cancelar
  async cancelar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    if (!uuidParamSchema.safeParse(id).success) return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'ID inválido' });
    const { motivoCancelamento } = cancelarMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.cancelar(
      id,
      request.filialId,
      request.user.sub,
      motivoCancelamento,
      request.ip,
    );
    return reply.status(200).send(mensalidade);
  }
}
