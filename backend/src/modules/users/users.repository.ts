// UsersRepository — queries Prisma para S009, S010 (Sprint 3)

import { prisma } from '../../config/database';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

// BUG-001: passwordHash nunca deve sair nas respostas da API
const USER_SELECT = {
  id: true,
  organizationId: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  primeiroAcesso: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  filiais: { select: { filialId: true } },
} as const;

export class UsersRepository {
  async findByEmailAndOrg(email: string, organizationId: string) {
    return prisma.user.findFirst({
      where: { email, organizationId, deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
  }

  async findAllByOrg(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: USER_SELECT,
      orderBy: { nome: 'asc' },
    });
  }

  // S009: criar usuário com filiais associadas numa transaction
  async create(organizationId: string, data: CreateUserInput, passwordHash: string) {
    return prisma.user.create({
      data: {
        organizationId,
        nome: data.nome,
        email: data.email,
        passwordHash,
        role: data.role,
        primeiroAcesso: true,
        ativo: true,
        filiais: {
          create: data.filialIds.map((filialId) => ({ filialId })),
        },
      },
      select: USER_SELECT,
    });
  }

  // S010: atualizar campos escalares do usuário
  async update(id: string, data: Omit<UpdateUserInput, 'filialIds'>) {
    return prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  // S010: substituir filiais do usuário atomicamente
  async replaceFiliais(userId: string, filialIds: string[]) {
    await prisma.$transaction([
      prisma.userFilial.deleteMany({ where: { userId } }),
      prisma.userFilial.createMany({
        data: filialIds.map((filialId) => ({ userId, filialId })),
      }),
    ]);
  }

  // S010: revogar todos os refresh tokens do usuário
  async revokeAllRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
