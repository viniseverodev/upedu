// DashboardController — handlers HTTP (S030)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from './dashboard.service';
import { kpisQuerySchema } from './dashboard.schema';

export class DashboardController {
  private service = new DashboardService();

  // S030 — GET /dashboard/kpis?mes=&ano=
  async kpis(request: FastifyRequest, reply: FastifyReply) {
    const query = kpisQuerySchema.parse(request.query);
    const kpis = await this.service.getKpis(request.filialId, query.mes, query.ano);
    return reply.status(200).send(kpis);
  }
}
