// Rotas de autenticação — STORY-001/002/003/004 (Sprint 1-2)
// POST  /login           — público
// POST  /logout          — requer authenticate
// POST  /refresh         — público (usa cookie httpOnly)
// POST  /change-password — requer authenticate
// PATCH /me              — requer authenticate (atualiza nome/email do próprio usuário)

import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { rateLimitLogin } from '../../middlewares/rate-limit';
import { authenticate } from '../../middlewares/authenticate';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post('/register',        {}, controller.register.bind(controller));
  app.post('/login',           { preHandler: [rateLimitLogin] }, controller.login.bind(controller));
  app.post('/logout',          { preHandler: [authenticate] },   controller.logout.bind(controller));
  // C1: rate limiting no refresh — previne brute-force de refresh tokens por IP
  app.post('/refresh',         { preHandler: [rateLimitLogin] }, controller.refresh.bind(controller));
  app.post('/change-password', { preHandler: [authenticate] },   controller.changePassword.bind(controller));
  app.patch('/me',             { preHandler: [authenticate] },   controller.updateProfile.bind(controller));
}
