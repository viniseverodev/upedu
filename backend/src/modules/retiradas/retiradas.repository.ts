// RetiradasRepository — queries Prisma

import { prisma } from '../../config/database';

type UpdatePayload = {
  nome?: string;
  cpf?: string;
  relacao?: string;
  fotoUrl?: string | null;
  tipo?: 'PERMANENTE' | 'TEMPORARIA';
  dataInicio?: Date | null;
  dataFim?: Date | null;
  horarioInicio?: string;
  horarioFim?: string;
  ativo?: boolean;
};

export class RetiradasRepository {

  // ── Autorizações ──

  async findAllByAluno(alunoId: string) {
    return prisma.autorizacaoRetirada.findMany({
      where: { alunoId, ativo: true },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  async findById(id: string) {
    return prisma.autorizacaoRetirada.findUnique({ where: { id } });
  }

  async create(filialId: string, alunoId: string, data: {
    nome: string;
    cpf: string;
    relacao?: string;
    fotoUrl?: string;
    tipo: 'PERMANENTE' | 'TEMPORARIA';
    dataInicio?: Date | null;
    dataFim?: Date | null;
    horarioInicio?: string;
    horarioFim?: string;
  }) {
    return prisma.autorizacaoRetirada.create({
      data: { filialId, alunoId, ...data },
    });
  }

  async update(id: string, data: UpdatePayload) {
    return prisma.autorizacaoRetirada.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.autorizacaoRetirada.update({ where: { id }, data: { ativo: false } });
  }

  // ── Busca para tela da monitora ──

  async buscarAlunos(filialId: string, nome: string) {
    return prisma.aluno.findMany({
      where: {
        filialId,
        ...(nome ? { nome: { contains: nome, mode: 'insensitive' } } : {}),
        deletedAt: null,
        status: { in: ['ATIVO', 'PRE_MATRICULA'] },
      },
      select: { id: true, nome: true, turno: true, status: true },
      orderBy: { nome: 'asc' },
      take: nome ? 20 : 200,
    });
  }

  // Retorna meia-noite UTC da data atual em Brasília.
  // Datas são armazenadas como "YYYY-MM-DD" → new Date() → meia-noite UTC.
  // Para comparar corretamente, usamos a data de hoje no fuso de São Paulo,
  // pois às 21:00 BRT o UTC já virou para o dia seguinte.
  inicioDoDiaBRT(agora: Date): Date {
    const dateStrBRT = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // "YYYY-MM-DD"
    return new Date(dateStrBRT + 'T00:00:00.000Z');
  }

  async findAutorizacoesValidas(alunoId: string, filialId: string, agora: Date) {
    const inicioDoDia = this.inicioDoDiaBRT(agora);

    return prisma.autorizacaoRetirada.findMany({
      where: {
        alunoId,
        filialId,
        ativo: true,
        OR: [
          { tipo: 'PERMANENTE' },
          {
            tipo: 'TEMPORARIA',
            OR: [{ dataInicio: null }, { dataInicio: { lte: agora } }],
            dataFim: { gte: inicioDoDia },
          },
        ],
      },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  async findAutorizacaoPorCpf(alunoId: string, filialId: string, cpf: string, agora: Date) {
    const inicioDoDia = this.inicioDoDiaBRT(agora);

    return prisma.autorizacaoRetirada.findFirst({
      where: {
        alunoId,
        filialId,
        cpf,
        ativo: true,
        OR: [
          { tipo: 'PERMANENTE' },
          {
            tipo: 'TEMPORARIA',
            OR: [{ dataInicio: null }, { dataInicio: { lte: agora } }],
            dataFim: { gte: inicioDoDia },
          },
        ],
      },
    });
  }

  // ── Registro ──

  async createRegistro(data: {
    alunoId: string;
    filialId: string;
    autorizacaoId: string;
    nomeAutorizado: string;
    cpfAutorizado: string;
    tipoAutorizacao: 'PERMANENTE' | 'TEMPORARIA';
  }) {
    return prisma.registroRetirada.create({ data });
  }
}
