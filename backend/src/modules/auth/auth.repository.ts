// AuthRepository — queries Prisma para autenticação
// TODO: completar revokeRefreshTokenByRaw em STORY-003

import { prisma } from '../../config/database';

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { filiais: { select: { filialId: true } } },
    });
  }

  async saveRefreshToken(userId: string, tokenHash: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async revokeRefreshTokenByRaw(_userId: string, _rawToken: string) {
    // TODO: buscar tokens ativos, comparar bcrypt, setar revokedAt
    // Implementar em STORY-003 com detecção de roubo
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
