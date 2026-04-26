// MensalidadesRepository — queries Prisma (S022/S023/S024/S025)

import { prisma } from '../../../config/database';
import type { MensalidadeStatus } from '@prisma/client';

export class MensalidadesRepository {
  async create(data: {
    alunoId: string;
    filialId: string;
    mesReferencia: number;
    anoReferencia: number;
    valorOriginal: number;
    dataVencimento: Date;
  }) {
    return prisma.mensalidade.create({ data });
  }

  async findById(id: string) {
    return prisma.mensalidade.findUnique({ where: { id } });
  }

  async findByIdAndFilial(id: string, filialId: string) {
    return prisma.mensalidade.findFirst({
      where: { id, filialId },
      include: {
        pagamentos: {
          orderBy: { dataPagamento: 'asc' },
          select: { id: true, valor: true, formaPagamento: true, dataPagamento: true },
        },
      },
    });
  }

  // Idempotência — verifica se já existe mensalidade ativa (não cancelada) para aluno/mês/ano
  async findByAlunoMesAno(alunoId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.findFirst({
      where: {
        alunoId,
        mesReferencia,
        anoReferencia,
        status: { not: 'CANCELADA' },
      },
    });
  }

  // Busca qualquer registro (incluindo cancelados) pela chave única do banco
  async findByAlunoMesAnoAny(alunoId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.findUnique({
      where: { alunoId_mesReferencia_anoReferencia: { alunoId, mesReferencia, anoReferencia } },
    });
  }

  // Reativa uma mensalidade cancelada com novos valores
  async reactivate(id: string, data: { valorOriginal: number; dataVencimento: Date }) {
    return prisma.mensalidade.update({
      where: { id },
      data: {
        status: 'PENDENTE',
        valorOriginal: data.valorOriginal,
        valorDesconto: 0,
        valorJuros: 0,
        valorPago: null,
        dataPagamento: null,
        formaPagamento: null,
        motivoCancelamento: null,
        dataVencimento: data.dataVencimento,
      },
    });
  }

  async update(id: string, data: {
    status?: MensalidadeStatus;
    valorPago?: number | null;
    valorDesconto?: number;
    formaPagamento?: string | null;
    dataPagamento?: Date | null;
    motivoCancelamento?: string | null;
  }) {
    return prisma.mensalidade.update({ where: { id }, data });
  }

  async createPagamento(data: {
    mensalidadeId: string;
    valor: number;
    formaPagamento: string;
    dataPagamento: Date;
  }) {
    return prisma.pagamento.create({ data });
  }

  async deletePagamentos(mensalidadeId: string) {
    return prisma.pagamento.deleteMany({ where: { mensalidadeId } });
  }

  // S022 — Listar mensalidades da filial por intervalo de dataVencimento
  // H4: exclui mensalidades de alunos com soft delete (deletedAt != null)
  async findByFilialAndPeriod(filialId: string, dataInicio: Date, dataFim: Date) {
    return prisma.mensalidade.findMany({
      where: {
        filialId,
        dataVencimento: { gte: dataInicio, lte: dataFim },
        aluno: { deletedAt: null },
      },
      include: {
        aluno: {
          select: {
            id: true,
            nome: true,
            turno: true,
            responsaveis: {
              where: { isResponsavelFinanceiro: true },
              take: 1,
              select: {
                parentesco: true,
                responsavel: { select: { nome: true, telefone: true, email: true } },
              },
            },
          },
        },
        pagamentos: {
          orderBy: { dataPagamento: 'asc' },
          select: { id: true, valor: true, formaPagamento: true, dataPagamento: true },
        },
      },
      orderBy: [{ dataVencimento: 'asc' }, { aluno: { nome: 'asc' } }],
    });
  }

  // Busca múltiplos por IDs (para ações em lote)
  async findManyByIds(ids: string[], filialId: string) {
    return prisma.mensalidade.findMany({
      where: { id: { in: ids }, filialId },
    });
  }

  // S025 — Job: busca PENDENTE com vencimento < hoje
  async findOverdue(today: Date) {
    return prisma.mensalidade.findMany({
      where: { status: 'PENDENTE', dataVencimento: { lt: today } },
      select: { id: true },
    });
  }

  // S025 — Atualiza múltiplos para INADIMPLENTE
  async updateManyToInadimplente(ids: string[]) {
    return prisma.mensalidade.updateMany({
      where: { id: { in: ids } },
      data: { status: 'INADIMPLENTE' },
    });
  }

  // S025 — Relatório de inadimplência
  async findInadimplentes(filialId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.findMany({
      where: { filialId, mesReferencia, anoReferencia, status: 'INADIMPLENTE' },
      include: {
        aluno: {
          select: {
            nome: true,
            responsaveis: {
              where: { isResponsavelFinanceiro: true },
              include: { responsavel: { select: { nome: true, telefone: true } } },
            },
          },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  // S028 — Soma de mensalidades pagas no mês (por data de pagamento)
  async sumPagoNoMes(filialId: string, mes: number, ano: number) {
    const result = await prisma.mensalidade.aggregate({
      where: {
        filialId,
        status: 'PAGO',
        dataPagamento: {
          // BUG-A: sufixo -03:00 garante interpretação BRT; rollover de dezembro tratado explicitamente
          gte: new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00-03:00`),
          lt: new Date(`${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01T00:00:00-03:00`),
        },
      },
      _sum: { valorPago: true },
    });
    return Number(result._sum.valorPago ?? 0);
  }

  // S030 — Contar inadimplentes por filial
  async countInadimplentes(filialId: string) {
    return prisma.mensalidade.count({
      where: { filialId, status: 'INADIMPLENTE' },
    });
  }
}
