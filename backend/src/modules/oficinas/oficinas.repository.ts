// OficinasRepository — queries Prisma

import { prisma } from '../../config/database';

export class OficinasRepository {

  // ── Oficinas ──

  async findAllByFilial(filialId: string) {
    return prisma.oficina.findMany({
      where: { filialId },
      include: { _count: { select: { turmas: { where: { ativa: true } } } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.oficina.findUnique({
      where: { id },
      include: {
        turmas: {
          where: { ativa: true },
          include: { _count: { select: { matriculas: true } } },
          orderBy: { nome: 'asc' },
        },
      },
    });
  }

  async create(filialId: string, data: { nome: string; descricao?: string; valor: number }) {
    return prisma.oficina.create({
      data: { filialId, nome: data.nome, descricao: data.descricao, valor: data.valor },
    });
  }

  async update(id: string, data: { nome?: string; descricao?: string; valor?: number; ativa?: boolean }) {
    return prisma.oficina.update({ where: { id }, data });
  }

  // ── Turmas ──

  async findTurmaById(id: string) {
    return prisma.turmaOficina.findUnique({
      where: { id },
      include: {
        oficina: { select: { id: true, filialId: true, nome: true } },
        _count: { select: { matriculas: true } },
      },
    });
  }

  async createTurma(oficinaId: string, data: { nome: string; vagas?: number; horario?: string }) {
    return prisma.turmaOficina.create({ data: { oficinaId, ...data } });
  }

  async updateTurma(id: string, data: { nome?: string; vagas?: number; horario?: string; ativa?: boolean }) {
    return prisma.turmaOficina.update({ where: { id }, data });
  }

  async deleteTurma(id: string) {
    return prisma.turmaOficina.update({ where: { id }, data: { ativa: false } });
  }

  // ── Matrículas de Oficina ──

  async listMatriculas(turmaId: string) {
    return prisma.matriculaOficina.findMany({
      where: { turmaId },
      include: {
        aluno: { select: { id: true, nome: true, status: true, turno: true } },
      },
      orderBy: { aluno: { nome: 'asc' } },
    });
  }

  async findMatricula(turmaId: string, alunoId: string) {
    return prisma.matriculaOficina.findUnique({
      where: { turmaId_alunoId: { turmaId, alunoId } },
    });
  }

  async matricular(turmaId: string, alunoId: string) {
    return prisma.matriculaOficina.create({ data: { turmaId, alunoId } });
  }

  async desmatricular(turmaId: string, alunoId: string) {
    return prisma.matriculaOficina.delete({
      where: { turmaId_alunoId: { turmaId, alunoId } },
    });
  }

  async findAluno(alunoId: string) {
    return prisma.aluno.findUnique({
      where: { id: alunoId },
      select: { id: true, nome: true, status: true, filialId: true, deletedAt: true },
    });
  }
}
