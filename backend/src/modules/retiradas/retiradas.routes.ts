// Rotas de retiradas
// GET    /retiradas/alunos/:alunoId/autorizacoes         — listar autorizações do aluno
// POST   /retiradas/alunos/:alunoId/autorizacoes         — criar autorização
// PATCH  /retiradas/alunos/:alunoId/autorizacoes/:authId — editar autorização
// DELETE /retiradas/alunos/:alunoId/autorizacoes/:authId — remover autorização
// GET    /retiradas/buscar?nome=xxx                       — buscar alunos (monitora)
// GET    /retiradas/autorizacoes-validas?alunoId=xxx     — autorizações válidas agora
// POST   /retiradas/validar                               — validar CPF
// POST   /retiradas/confirmar                             — confirmar retirada e criar log

import type { FastifyInstance } from 'fastify';
import { RetiradasController } from './retiradas.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function retiradasRoutes(app: FastifyInstance) {
  const controller = new RetiradasController();

  const base      = [authenticate, filialContext];
  const atendente = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE', 'PROFESSOR'])];
  const gerente   = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];

  // Autorizações (gestão — atendente+)
  app.get('/alunos/:alunoId/autorizacoes',              { preHandler: gerente },   controller.listAutorizacoes.bind(controller));
  app.post('/alunos/:alunoId/autorizacoes',             { preHandler: gerente },   controller.createAutorizacao.bind(controller));
  app.patch('/alunos/:alunoId/autorizacoes/:authId',    { preHandler: gerente },   controller.updateAutorizacao.bind(controller));
  app.delete('/alunos/:alunoId/autorizacoes/:authId',   { preHandler: gerente },   controller.deleteAutorizacao.bind(controller));

  // Tela da monitora (professor+ pode usar)
  app.get('/buscar',                { preHandler: atendente }, controller.buscarAlunos.bind(controller));
  app.get('/autorizacoes-validas',  { preHandler: atendente }, controller.getAutorizacoesValidas.bind(controller));
  app.post('/validar',              { preHandler: atendente }, controller.validarCpf.bind(controller));
  app.post('/confirmar',            { preHandler: atendente }, controller.confirmarRetirada.bind(controller));
}
