// Fastify instance — ADR-001
// Registra plugins, middlewares e rotas de todos os módulos

import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './shared/errors/error-handler';
import { env } from './config/env';

// Rotas
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { filiaisRoutes } from './modules/filiais/filiais.routes';
import { alunosRoutes } from './modules/alunos/alunos.routes';
import { responsaveisRoutes } from './modules/responsaveis/responsaveis.routes';
import { matriculasRoutes } from './modules/matriculas/matriculas.routes';
import { mensalidadesRoutes } from './modules/financeiro/mensalidades/mensalidades.routes';
import { transacoesRoutes } from './modules/financeiro/transacoes/transacoes.routes';
import { categoriasRoutes } from './modules/financeiro/categorias/categorias.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes';
import { auditRoutes } from './modules/audit/audit.routes';

export async function buildApp() {
  // BUG-020: trustProxy para que request.ip reflita o IP real do cliente via X-Forwarded-For
  // (sem isso, todos os audit logs registram o IP do container nginx em vez do cliente)
  const app = Fastify({ logger: true, trustProxy: true });

  // Zod type provider — ADR-001
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins
  await app.register(helmet);
  // BUG-017: usar env.FRONTEND_URL validado por Zod (garante que nunca seja undefined)
  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(cookie);

  // Error handler centralizado
  app.setErrorHandler(errorHandler);

  // Rotas com prefixo /api/v1
  const API_PREFIX = '/api/v1';
  await app.register(authRoutes,        { prefix: `${API_PREFIX}/auth` });
  await app.register(usersRoutes,       { prefix: `${API_PREFIX}/users` });
  await app.register(filiaisRoutes,     { prefix: `${API_PREFIX}/filiais` });
  await app.register(alunosRoutes,      { prefix: `${API_PREFIX}/alunos` });
  await app.register(responsaveisRoutes,{ prefix: `${API_PREFIX}/responsaveis` });
  await app.register(matriculasRoutes,  { prefix: `${API_PREFIX}/matriculas` });
  await app.register(mensalidadesRoutes,{ prefix: `${API_PREFIX}/mensalidades` });
  await app.register(transacoesRoutes,  { prefix: `${API_PREFIX}/transacoes` });
  await app.register(categoriasRoutes,  { prefix: `${API_PREFIX}/categorias` });
  await app.register(dashboardRoutes,   { prefix: `${API_PREFIX}/dashboard` });
  await app.register(relatoriosRoutes,  { prefix: `${API_PREFIX}/relatorios` });
  await app.register(auditRoutes,       { prefix: `${API_PREFIX}/auditoria` });

  return app;
}
