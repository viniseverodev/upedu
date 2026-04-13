// DashboardController — handlers HTTP (S030/S031)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from './dashboard.service';
import { kpisQuerySchema, comparativoQuerySchema } from './dashboard.schema';

export class DashboardController {
  private service = new DashboardService();

  // S030 — GET /dashboard/kpis?mes=&ano=
  async kpis(request: FastifyRequest, reply: FastifyReply) {
    const query = kpisQuerySchema.parse(request.query);
    const kpis = await this.service.getKpis(request.filialId, query.mes, query.ano);
    return reply.status(200).send(kpis);
  }

  // S031 — GET /dashboard/kpis/comparativo?mes=&ano=
  async comparativo(request: FastifyRequest, reply: FastifyReply) {
    const query = comparativoQuerySchema.parse(request.query);
    const data = await this.service.getComparativo(request.user.orgId, query.mes, query.ano);
    return reply.status(200).send(data);
  }
}
