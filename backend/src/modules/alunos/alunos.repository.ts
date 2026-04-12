// AlunosRepository — queries Prisma (S012-S016)

import { prisma } from '../../config/database';
import type { AlunoStatus, Turno } from '@prisma/client';

export class AlunosRepository {
  // S012 — listar alunos da filial com filtro opcional de status
  async findAllByFilial(filialId: string, status?: AlunoStatus) {
    return prisma.aluno.findMany({
      where: { filialId, deletedAt: null, ...(status ? { status } : {}) },
      include: {
        responsaveis: {
          include: {
            responsavel: { select: { id: true, nome: true, telefone: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // S016 — perfil completo do aluno
  async findById(id: string) {
    return prisma.aluno.findUnique({
      where: { id },
      include: {
        responsaveis: {
          include: {
            responsavel: { select: { id: true, nome: true, telefone: true, email: true } },
          },
        },
        matriculas: { orderBy: { createdAt: 'desc' }, take: 5 },
        mensalidades: {
          orderBy: [{ anoReferencia: 'desc' }, { mesReferencia: 'desc' }],
          take: 5,
        },
      },
    });
  }

  // S012 — criar aluno com consentimento LGPD
  async create(
    filialId: string,
    data: {
      nome: string;
      dataNascimento: Date;
      turno: Turno;
      observacoes?: string;
      status: AlunoStatus;
      consentimentoTimestamp: Date;
    }
  ) {
    return prisma.aluno.create({
      data: {
        filialId,
        nome: data.nome,
        dataNascimento: data.dataNascimento,
        turno: data.turno,
        observacoes: data.observacoes,
        status: data.status,
        consentimentoResponsavel: true,
        consentimentoTimestamp: data.consentimentoTimestamp,
      },
    });
  }

  // S013 — atualizar campos editáveis
  async update(
    id: string,
    data: {
      nome?: string;
      dataNascimento?: Date;
      turno?: Turno;
      observacoes?: string;
      status?: AlunoStatus;
    }
  ) {
    return prisma.aluno.update({ where: { id }, data });
  }

  // S013 — soft delete (LGPD)
  async softDelete(id: string) {
    return prisma.aluno.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // S013 — inativação atômica: encerra matrícula + cancela mensalidades + atualiza status
  async inativarComCascade(
    id: string,
    updateData: {
      nome?: string;
      dataNascimento?: Date;
      turno?: Turno;
      observacoes?: string;
      status?: AlunoStatus;
    }
  ) {
    const now = new Date();
    return prisma.$transaction([
      prisma.matricula.updateMany({
        where: { alunoId: id, status: 'ATIVA' },
        data: { status: 'ENCERRADA', dataFim: now },
      }),
      prisma.mensalidade.updateMany({
        where: { alunoId: id, status: 'PENDENTE' },
        data: { status: 'CANCELADA' },
      }),
      prisma.aluno.update({ where: { id }, data: updateData }),
    ]);
  }

  // S015 — buscar filial destino para obter valorMensalidade
  async findFilial(filialId: string) {
    return prisma.filial.findUnique({
      where: { id: filialId },
      select: {
        id: true,
        valorMensalidadeIntegral: true,
        valorMensalidadeMeioTurno: true,
      },
    });
  }

  // S015 — transferência atômica entre filiais
  async transferir(alunoId: string, novaFilialId: string, valorMensalidade: number, turno: Turno) {
    await prisma.$transaction([
      prisma.aluno.update({
        where: { id: alunoId },
        data: { filialId: novaFilialId, status: 'PRE_MATRICULA' },
      }),
      prisma.matricula.updateMany({
        where: { alunoId, status: 'ATIVA' },
        data: { status: 'ENCERRADA', dataFim: new Date() },
      }),
      prisma.matricula.create({
        data: {
          alunoId,
          filialId: novaFilialId,
          status: 'ATIVA',
          turno,
          valorMensalidade,
          dataInicio: new Date(),
        },
      }),
    ]);
  }
}
