// ResponsaveisRepository — queries Prisma (S018/S019)
// CPF/RG armazenados como BYTEA (AES-256-GCM)

import { prisma } from '../../config/database';

export class ResponsaveisRepository {
  // S018 — criar responsável (CPF/RG já encriptados pelo service)
  async create(data: {
    nome: string;
    cpfEnc?: Buffer;
    rgEnc?: Buffer;
    telefone?: string;
    email?: string;
  }) {
    return prisma.responsavel.create({ data });
  }

  // S018 — buscar por ID (inclui BYTEA bruto para decrypt no service)
  async findById(id: string) {
    return prisma.responsavel.findUnique({
      where: { id, deletedAt: null },
    });
  }

  // S018 — atualizar campos (CPF/RG já encriptados pelo service)
  async update(
    id: string,
    data: {
      nome?: string;
      cpfEnc?: Buffer;
      rgEnc?: Buffer;
      telefone?: string;
      email?: string;
    },
  ) {
    return prisma.responsavel.update({ where: { id }, data });
  }

  // S018 — soft delete LGPD
  async softDelete(id: string) {
    return prisma.responsavel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // S019 — vincular responsável a aluno
  async vincular(
    alunoId: string,
    responsavelId: string,
    parentesco: string,
    isResponsavelFinanceiro: boolean,
  ) {
    return prisma.alunoResponsavel.create({
      data: { alunoId, responsavelId, parentesco, isResponsavelFinanceiro },
    });
  }

  // S019 — desvincular responsável de aluno
  async desvincular(alunoId: string, responsavelId: string) {
    return prisma.alunoResponsavel.delete({
      where: { alunoId_responsavelId: { alunoId, responsavelId } },
    });
  }

  // S019 — conta quantos responsáveis financeiros um aluno já tem
  async countFinanceiros(alunoId: string): Promise<number> {
    return prisma.alunoResponsavel.count({
      where: { alunoId, isResponsavelFinanceiro: true },
    });
  }

  // S019 — verifica se vínculo já existe
  async findVinculo(alunoId: string, responsavelId: string) {
    return prisma.alunoResponsavel.findUnique({
      where: { alunoId_responsavelId: { alunoId, responsavelId } },
    });
  }

  // S019 — lista vínculos de um aluno com dados do responsável
  async findVinculosByAluno(alunoId: string) {
    return prisma.alunoResponsavel.findMany({
      where: { alunoId },
      include: {
        responsavel: {
          select: { id: true, nome: true, telefone: true, email: true },
        },
      },
    });
  }

  // S018 — listar responsáveis vinculados a alunos da filial
  async findByFilial(filialId: string) {
    return prisma.responsavel.findMany({
      where: {
        deletedAt: null,
        alunos: {
          some: {
            aluno: {
              filialId,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }
}
