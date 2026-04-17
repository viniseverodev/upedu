// AuthRepository — queries Prisma para autenticação
// S001: findByEmail, saveRefreshToken
// S002: revokeRefreshTokenByRaw (logout)
// S003: findActiveTokensByUser, revokeTokenById (refresh com rotação + detecção de roubo)

import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { filiais: { select: { filialId: true } } },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { filiais: { select: { filialId: true } } },
    });
  }

  async saveRefreshToken(userId: string, tokenHash: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  // Busca todos os refresh tokens ativos (não revogados, não expirados) de um usuário.
  // Usado pelo refresh para comparar bcrypt e detectar reutilização de token revogado.
  async findActiveTokensByUser(userId: string) {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeTokenById(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  // Para logout: encontra o token ativo correspondente ao rawJti e o revoga.
  // rawJti é o campo jti extraído do JWT do refresh token.
  async revokeRefreshTokenByJti(userId: string, jti: string) {
    const activeTokens = await this.findActiveTokensByUser(userId);
    for (const token of activeTokens) {
      const match = await bcrypt.compare(jti, token.tokenHash);
      if (match) {
        await this.revokeTokenById(token.id);
        return true;
      }
    }
    return false;
  }

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, primeiroAcesso: false },
    });
  }
}
