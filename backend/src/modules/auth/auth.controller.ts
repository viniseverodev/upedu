// AuthController — formata requests/responses HTTP
// TODO: implementar em STORY-001 (Sprint 1)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, changePasswordSchema } from './auth.schema';

export class AuthController {
  private service = new AuthService();

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);
    const result = await this.service.login(body, request.ip);
    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/api/v1/auth',
    });
    return reply.status(200).send({
      accessToken: result.accessToken,
      user: result.user,
      requiresPasswordChange: result.requiresPasswordChange,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    await this.service.logout(request.user, request.cookies.refreshToken);
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return reply.status(200).send({ message: 'Logout realizado' });
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.refresh(request.cookies.refreshToken);
    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/api/v1/auth',
    });
    return reply.status(200).send({ accessToken: result.accessToken });
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const body = changePasswordSchema.parse(request.body);
    await this.service.changePassword(request.user.sub, body.newPassword);
    return reply.status(200).send({ message: 'Senha alterada com sucesso' });
  }
}
