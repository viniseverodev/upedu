// Rotas de relatórios — S025/S028
// GET /relatorios/inadimplencia?mes=&ano=  — S025
// GET /relatorios/fluxo-caixa?mes=&ano=   — S028 (+ ?format=csv)

import type { FastifyInstance } from 'fastify';
import { RelatoriosController } from './relatorios.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function relatoriosRoutes(app: FastifyInstance) {
  const controller = new RelatoriosController();
  const gerenteOnly = [
    authenticate,
    filialContext,
    authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL']),
  ];

  app.get('/inadimplencia', { preHandler: gerenteOnly }, controller.inadimplencia.bind(controller));
  app.get('/fluxo-caixa', { preHandler: gerenteOnly }, controller.fluxoCaixa.bind(controller));
}
