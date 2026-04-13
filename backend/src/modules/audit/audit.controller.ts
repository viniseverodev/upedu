// AuditController — handlers HTTP (S035)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from './audit.service';
import { auditQuerySchema } from './audit.schema';

export class AuditController {
  private service = new AuditService();

  // S035 — GET /auditoria
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = auditQuerySchema.parse(request.query);

    if (query.format === 'csv') {
      const csv = await this.service.listCsv(request.user.orgId, request.user.role, query);
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="auditoria.csv"')
        .send(csv);
    }

    const result = await this.service.list(request.user.orgId, request.user.role, query);
    return reply.status(200).send(result);
  }
}
