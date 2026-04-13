// MensalidadesController — handlers HTTP (S022/S023/S024)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { MensalidadesService } from './mensalidades.service';
import {
  createMensalidadeSchema,
  pagarMensalidadeSchema,
  cancelarMensalidadeSchema,
} from './mensalidades.schema';

export class MensalidadesController {
  private service = new MensalidadesService();

  // S022 — POST /mensalidades
  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.create(request.filialId, request.user.sub, body);
    return reply.status(201).send(mensalidade);
  }

  // S023 — PATCH /mensalidades/:id/pagar
  async pagar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const body = pagarMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.pagar(id, request.filialId, request.user.sub, body);
    return reply.status(200).send(mensalidade);
  }

  // S024 — PATCH /mensalidades/:id/cancelar
  async cancelar(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { motivoCancelamento } = cancelarMensalidadeSchema.parse(request.body);
    const mensalidade = await this.service.cancelar(
      id,
      request.filialId,
      request.user.sub,
      motivoCancelamento,
    );
    return reply.status(200).send(mensalidade);
  }
}
