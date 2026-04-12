// AuthService — lógica de negócio de autenticação
// TODO: implementar completamente em STORY-001/002/003/004 (Sprint 1-2)

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { redis, REDIS_TTL } from '../../config/redis';
import { env } from '../../config/env';
import { createAuditLog } from '../../middlewares/audit';
import { UnauthorizedError } from '../../shared/errors/AppError';
import type { LoginInput } from './auth.schema';
import type { JwtPayload } from '../../middlewares/authenticate';

const BCRYPT_COST = 12;

export class AuthService {
  private repo = new AuthRepository();

  async login(input: LoginInput, ip: string) {
    const user = await this.repo.findByEmail(input.email);

    // Sempre executar bcrypt mesmo para email inexistente — evita timing attack
    const dummyHash = '$2b$12$invalidhashfordummycomparisononlyXXXXXXXXXXXXXXXXXXX';
    const isValid = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.compare(input.password, dummyHash).then(() => false);

    if (!user || !isValid) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new UnauthorizedError('Usuário inativo. Contate o administrador.');
    }

    const jti = uuidv4();
    const accessToken = jwt.sign(
      { sub: user.id, jti, role: user.role, orgId: user.organizationId },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const refreshTokenRaw = uuidv4();
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, BCRYPT_COST);
    await this.repo.saveRefreshToken(user.id, refreshTokenHash);

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: { id: user.id, nome: user.nome, role: user.role, filiais: user.filiais },
      requiresPasswordChange: user.primeiroAcesso,
    };
  }

  async logout(userPayload: JwtPayload, refreshToken?: string) {
    await redis.setex(
      `blacklist:jwt:${userPayload.jti}`,
      REDIS_TTL.ACCESS_TOKEN_BLACKLIST,
      '1'
    );
    if (refreshToken) {
      await this.repo.revokeRefreshTokenByRaw(userPayload.sub, refreshToken);
    }
    await createAuditLog({
      userId: userPayload.sub,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userPayload.sub,
    });
  }

  async refresh(_rawToken?: string): Promise<{ accessToken: string; refreshToken: string }> {
    // TODO: STORY-003 — validar cookie, rotacionar token, detectar roubo
    throw new Error('TODO: implementar em STORY-003 (Sprint 1)');
  }

  async changePassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.repo.updatePassword(userId, hash);
  }
}
