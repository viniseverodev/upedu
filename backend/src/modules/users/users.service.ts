// UsersService — lógica de negócio
// S009: cadastro de usuário com hierarquia de role + senha temporária
// S010: edição, desativação imediata com revogação de tokens

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { redis, REDIS_TTL } from '../../config/redis';
import { createAuditLog } from '../../middlewares/audit';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError';
import { ROLE_HIERARCHY } from './users.schema';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

const BCRYPT_COST = 12;

export class UsersService {
  private repo = new UsersRepository();

  // S009 — Criar usuário com senha temporária
  async create(
    organizationId: string,
    creatorId: string,
    creatorRole: string,
    data: CreateUserInput
  ) {
    // Guard: criador só pode atribuir roles ≤ à sua própria hierarquia
    if ((ROLE_HIERARCHY[data.role] ?? 0) > (ROLE_HIERARCHY[creatorRole] ?? 0)) {
      throw new ForbiddenError('Sem permissão para criar esta role');
    }

    const existing = await this.repo.findByEmailAndOrg(data.email, organizationId);
    if (existing) {
      throw new ConflictError('Email já cadastrado nesta organização');
    }

    // Senha temporária de 16 chars (base64url, sem chars especiais)
    const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST);

    const user = await this.repo.create(organizationId, data, passwordHash);

    await createAuditLog({
      userId: creatorId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValues: { nome: user.nome, email: user.email, role: user.role },
    });

    return { user, tempPassword };
  }

  // S009 — Listar usuários da organização
  async list(organizationId: string) {
    return this.repo.findAllByOrg(organizationId);
  }

  // S010 — Editar usuário (nome, role, filialIds, ativo)
  async update(
    id: string,
    organizationId: string,
    updaterId: string,
    updaterRole: string,
    data: UpdateUserInput
  ) {
    const user = await this.repo.findById(id);
    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundError('Usuário');
    }

    // Guard: não elevar role além da hierarquia do atualizador
    if (data.role && (ROLE_HIERARCHY[data.role] ?? 0) > (ROLE_HIERARCHY[updaterRole] ?? 0)) {
      throw new ForbiddenError('Sem permissão para atribuir esta role');
    }

    // S010: desativação imediata — revogar tokens e blacklistar no Redis
    if (data.ativo === false && user.ativo === true) {
      await this.repo.revokeAllRefreshTokens(id);
      // Blacklist por usuário: bloqueia access tokens em circulação pelo TTL restante
      await redis.setex(
        `blacklist:user:${id}`,
        REDIS_TTL.ACCESS_TOKEN_BLACKLIST,
        '1'
      );
    }

    const { filialIds, ...scalarData } = data;

    await this.repo.update(id, scalarData);

    if (filialIds !== undefined) {
      await this.repo.replaceFiliais(id, filialIds);
    }

    await createAuditLog({
      userId: updaterId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      oldValues: { nome: user.nome, role: user.role, ativo: user.ativo },
      newValues: data as unknown as import('@prisma/client').Prisma.InputJsonValue,
    });

    return this.repo.findById(id);
  }
}
