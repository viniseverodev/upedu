// FiliaisRepository — queries Prisma para S006, S007, S008

import { prisma } from '../../config/database';
import type { CreateFilialInput, UpdateFilialInput } from './filiais.schema';

export class FiliaisRepository {
  // S008: todas as filiais da organização (ADMIN_MATRIZ/SUPER_ADMIN)
  async findAllByOrg(organizationId: string) {
    return prisma.filial.findMany({
      where: { organizationId },
      orderBy: { nome: 'asc' },
    });
  }

  // S008: apenas filiais ativas da organização
  async findActiveByOrg(organizationId: string) {
    return prisma.filial.findMany({
      where: { organizationId, ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  // S008: filiais ativas às quais o usuário está atribuído (GERENTE_FILIAL/ATENDENTE/PROFESSOR)
  async findActiveByUserId(userId: string) {
    return prisma.filial.findMany({
      where: {
        ativo: true,
        usuarios: { some: { userId } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // S008: todas as filiais do usuário (incluindo inativas — para listar no painel admin)
  async findAllByUserId(userId: string) {
    return prisma.filial.findMany({
      where: { usuarios: { some: { userId } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.filial.findUnique({ where: { id } });
  }

  // S006/S007: verificar CNPJ único por organização
  async findByCnpjAndOrg(cnpj: string, organizationId: string) {
    return prisma.filial.findUnique({
      where: { cnpj_organizationId: { cnpj, organizationId } },
    });
  }

  // S007: guard de desativação — contar alunos ativos na filial
  async countActiveAlunos(filialId: string) {
    return prisma.aluno.count({
      where: { filialId, status: 'ATIVO', deletedAt: null },
    });
  }

  // S006: criar filial
  async create(organizationId: string, data: CreateFilialInput) {
    return prisma.filial.create({
      data: { ...data, organizationId, ativo: true },
    });
  }

  // S007: atualizar filial (partial update)
  async update(id: string, data: UpdateFilialInput) {
    return prisma.filial.update({
      where: { id },
      data,
    });
  }
}
