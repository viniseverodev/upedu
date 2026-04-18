// MatriculasRepository — queries Prisma (S020/S021/S022)

import { prisma } from '../../config/database';
import type { MatriculaStatus, Turno } from '@prisma/client';

export class MatriculasRepository {
  // S022 — listar todas as matrículas da filial
  async findAllByFilial(filialId: string, status?: MatriculaStatus, turno?: Turno) {
    return prisma.matricula.findMany({
      where: {
        filialId,
        ...(status ? { status } : {}),
        ...(turno ? { turno } : {}),
      },
      include: {
        aluno: { select: { id: true, nome: true } },
      },
      orderBy: { dataInicio: 'desc' },
    });
  }

  // Busca matrícula ATIVA de um aluno
  async findActiveByAluno(alunoId: string) {
    return prisma.matricula.findFirst({
      where: { alunoId, status: 'ATIVA' },
    });
  }

  // Cria nova matrícula
  async create(data: {
    alunoId: string;
    filialId: string;
    turno: Turno;
    valorMensalidade: number;
    dataInicio: Date;
    status: MatriculaStatus;
  }) {
    return prisma.matricula.create({ data });
  }

  // Histórico de matrículas de um aluno (S021)
  async findByAluno(alunoId: string) {
    return prisma.matricula.findMany({
      where: { alunoId },
      orderBy: { dataInicio: 'desc' },
      include: {
        filial: { select: { nome: true } },
      },
    });
  }
}
