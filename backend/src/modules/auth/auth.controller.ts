// AuthController — formata requests/responses HTTP
// S001: login com cookies de sessão para o middleware Next.js
// S002: logout com limpeza de cookies
// S003: refresh com rotação de tokens
// S004: changePassword com limpeza do flag de primeiro acesso

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, changePasswordSchema, updateProfileSchema, registerSchema } from './auth.schema';
import { env } from '../../config/env';

// WARN-009 fix: usar env.NODE_ENV (Zod-validado) em vez de process.env.NODE_ENV diretamente
const COOKIE_BASE = {
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export class AuthController {
  private service = new AuthService();

  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = registerSchema.parse(request.body);
    const result = await this.service.register(body);
    return reply.status(201).send({
      message: 'Conta criada com sucesso',
      organizacao: result.org.nome,
      usuario: { id: result.user.id, nome: result.user.nome, email: result.user.email },
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);
    const result = await this.service.login(body, request.ip);

    // Refresh token — httpOnly para segurança (inacessível ao JS)
    reply.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Cookie de sessão — não-httpOnly para que o middleware Next.js possa ler
    reply.setCookie('auth-session', '1', {
      ...COOKIE_BASE,
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Flag de primeiro acesso — middleware Next.js redireciona para /primeiro-acesso
    if (result.requiresPasswordChange) {
      reply.setCookie('requires-password-change', '1', {
        ...COOKIE_BASE,
        httpOnly: false,
        maxAge: 60 * 60, // 1 hora — tempo suficiente para a troca
        path: '/',
      });
    }

    return reply.status(200).send({
      accessToken: result.accessToken,
      user: result.user,
      requiresPasswordChange: result.requiresPasswordChange,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    await this.service.logout(request.user, request.cookies.refreshToken);

    reply.clearCookie('refreshToken', { path: '/' });
    reply.clearCookie('auth-session', { path: '/' });
    reply.clearCookie('requires-password-change', { path: '/' });

    return reply.status(200).send({ message: 'Logout realizado' });
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.service.refresh(request.cookies.refreshToken);

    reply.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return reply.status(200).send({ accessToken: result.accessToken });
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const body = changePasswordSchema.parse(request.body);
    // BUG-011: recebe novo par de tokens para evitar JWT com primeiroAcesso=true stale
    const { accessToken, refreshToken } = await this.service.changePassword(
      request.user.sub,
      body.currentPassword,
      body.newPassword,
    );

    // Rolar o refresh token no cookie httpOnly
    reply.setCookie('refreshToken', refreshToken, {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Limpar flag de primeiro acesso
    reply.clearCookie('requires-password-change', { path: '/' });

    return reply.status(200).send({ message: 'Senha alterada com sucesso', accessToken });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateProfileSchema.parse(request.body);
    const updated = await this.service.updateProfile(request.user.sub, body);
    return reply.status(200).send(updated);
  }
}
