// RelatoriosController — handlers HTTP (S025/S028)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { RelatoriosService } from './relatorios.service';
import { inadimplenciaQuerySchema, fluxoCaixaQuerySchema } from './relatorios.schema';

export class RelatoriosController {
  private service = new RelatoriosService();

  // S025 — GET /relatorios/inadimplencia?mes=&ano=[&page=&pageSize=]
  async inadimplencia(request: FastifyRequest, reply: FastifyReply) {
    const query = inadimplenciaQuerySchema.parse(request.query);
    // M2: passa parâmetros de paginação ao service
    const resultado = await this.service.inadimplencia(
      request.filialId,
      query.mes,
      query.ano,
      query.page,
      query.pageSize,
    );
    return reply.status(200).send(resultado);
  }

  // S028 — GET /relatorios/fluxo-caixa?mes=&ano=[&format=csv]
  async fluxoCaixa(request: FastifyRequest, reply: FastifyReply) {
    const query = fluxoCaixaQuerySchema.parse(request.query);

    if (query.format === 'csv') {
      const csv = await this.service.fluxoCaixaCsv(request.filialId, query.mes, query.ano);
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="fluxo-caixa-${query.ano}-${String(query.mes).padStart(2, '0')}.csv"`)
        .status(200)
        .send(csv);
    }

    const resultado = await this.service.fluxoCaixa(request.filialId, query.mes, query.ano);
    return reply.status(200).send(resultado);
  }
}
