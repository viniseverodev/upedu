// OficinasService — lógica de negócio

import { OficinasRepository } from './oficinas.repository';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { prisma } from '../../config/database';
import type {
  CreateOficinaInput,
  UpdateOficinaInput,
  CreateTurmaInput,
  UpdateTurmaInput,
  MatricularAlunoInput,
} from './oficinas.schema';

export class OficinasService {
  private repo = new OficinasRepository();

  // ── Oficinas ──

  async list(filialId: string) {
    return this.repo.findAllByFilial(filialId);
  }

  async findById(id: string, filialId: string) {
    const oficina = await this.repo.findById(id);
    if (!oficina || oficina.filialId !== filialId) throw new NotFoundError('Oficina');
    return oficina;
  }

  async create(filialId: string, data: CreateOficinaInput) {
    return this.repo.create(filialId, data);
  }

  async update(id: string, filialId: string, data: UpdateOficinaInput) {
    const oficina = await this.repo.findById(id);
    if (!oficina || oficina.filialId !== filialId) throw new NotFoundError('Oficina');
    return this.repo.update(id, data);
  }

  async delete(id: string, filialId: string) {
    const oficina = await this.repo.findById(id);
    if (!oficina || oficina.filialId !== filialId) throw new NotFoundError('Oficina');

    // A1: turmas/matrículas buscadas DENTRO da transação para evitar race condition
    await prisma.$transaction(async (tx) => {
      const turmas = await tx.turmaOficina.findMany({
        where: { oficinaId: id },
        include: { matriculas: { select: { id: true } } },
      });

      const matriculaIds = turmas.flatMap((t) => t.matriculas.map((m) => m.id));

      if (matriculaIds.length > 0) {
        // Cancela mensalidades pendentes/inadimplentes
        await tx.mensalidade.updateMany({
          where: {
            matriculaOficinaId: { in: matriculaIds },
            status: { in: ['PENDENTE', 'INADIMPLENTE'] },
          },
          data: { status: 'CANCELADA', motivoCancelamento: 'Oficina removida' },
        });

        // Remove referência FK nas demais (preserva histórico financeiro)
        await tx.mensalidade.updateMany({
          where: { matriculaOficinaId: { in: matriculaIds } },
          data: { matriculaOficinaId: null },
        });

        // Remove todas as matrículas
        await tx.matriculaOficina.deleteMany({ where: { id: { in: matriculaIds } } });
      }

      // Remove todas as turmas
      await tx.turmaOficina.deleteMany({ where: { oficinaId: id } });

      // Remove a oficina
      await tx.oficina.delete({ where: { id } });
    });
  }

  // ── Turmas ──

  async createTurma(oficinaId: string, filialId: string, data: CreateTurmaInput) {
    const oficina = await this.repo.findById(oficinaId);
    if (!oficina || oficina.filialId !== filialId) throw new NotFoundError('Oficina');
    if (!oficina.ativa) throw new ValidationError('Oficina está inativa');
    return this.repo.createTurma(oficinaId, data);
  }

  async updateTurma(turmaId: string, filialId: string, data: UpdateTurmaInput) {
    const turma = await this.repo.findTurmaById(turmaId);
    if (!turma || turma.oficina.filialId !== filialId) throw new NotFoundError('Turma');
    return this.repo.updateTurma(turmaId, data);
  }

  async deleteTurma(turmaId: string, filialId: string) {
    const turma = await this.repo.findTurmaById(turmaId);
    if (!turma || turma.oficina.filialId !== filialId) throw new NotFoundError('Turma');
    return this.repo.deleteTurma(turmaId);
  }

  // ── Matrículas ──

  async listMatriculas(turmaId: string, filialId: string) {
    const turma = await this.repo.findTurmaById(turmaId);
    if (!turma || turma.oficina.filialId !== filialId) throw new NotFoundError('Turma');
    return this.repo.listMatriculas(turmaId);
  }

  async matricular(turmaId: string, filialId: string, data: MatricularAlunoInput) {
    const turma = await this.repo.findTurmaById(turmaId);
    if (!turma || turma.oficina.filialId !== filialId) throw new NotFoundError('Turma');
    if (!turma.ativa) throw new ValidationError('Turma está inativa');

    const aluno = await this.repo.findAluno(data.alunoId);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) throw new NotFoundError('Aluno');
    if (aluno.status !== 'ATIVO') throw new ValidationError('Apenas alunos com status ATIVO podem ser matriculados em oficinas');

    const jaMatriculado = await this.repo.findMatricula(turmaId, data.alunoId);
    if (jaMatriculado) throw new ValidationError('Aluno já está matriculado nesta turma');

    const oficina = await prisma.oficina.findUnique({ where: { id: turma.oficina.id } });
    if (!oficina) throw new NotFoundError('Oficina');

    const filial = await prisma.filial.findUnique({ where: { id: filialId } });
    if (!filial) throw new NotFoundError('Filial');

    // Criar matrícula e mensalidade do mês atual em transação
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dia = Math.min(filial.diaVencimento, ultimoDia);
    const mesStr = String(mes).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    const dataVencimento = new Date(`${ano}-${mesStr}-${diaStr}T00:00:00-03:00`);

    // A2: matrícula + mensalidade criadas em transação atômica — evita estado parcial
    // B2: verificação de vagas recontada DENTRO da transação para evitar race condition
    return prisma.$transaction(async (tx) => {
      if (turma.vagas !== null) {
        const count = await tx.matriculaOficina.count({ where: { turmaId } });
        if (count >= turma.vagas) throw new ValidationError('Turma sem vagas disponíveis');
      }

      const matricula = await tx.matriculaOficina.create({ data: { turmaId, alunoId: data.alunoId } }).catch((e: { code?: string }) => {
        if (e.code === 'P2002') throw new ValidationError('Aluno já está matriculado nesta turma');
        throw e;
      });

      const jaTemMensalidade = await tx.mensalidade.findFirst({
        where: { matriculaOficinaId: matricula.id, mesReferencia: mes, anoReferencia: ano },
      });

      if (!jaTemMensalidade) {
        await tx.mensalidade.create({
          data: {
            alunoId: data.alunoId,
            filialId,
            tipo: 'OFICINA',
            matriculaOficinaId: matricula.id,
            mesReferencia: mes,
            anoReferencia: ano,
            valorOriginal: Number(oficina.valor),
            dataVencimento,
          },
        });
      }

      return matricula;
    });
  }

  async desmatricular(turmaId: string, filialId: string, alunoId: string) {
    const turma = await this.repo.findTurmaById(turmaId);
    if (!turma || turma.oficina.filialId !== filialId) throw new NotFoundError('Turma');

    const matricula = await this.repo.findMatricula(turmaId, alunoId);
    if (!matricula) throw new NotFoundError('Matrícula');

    // M1: cancelamento de mensalidades + remoção da matrícula em transação atômica
    await prisma.$transaction(async (tx) => {
      await tx.mensalidade.updateMany({
        where: { matriculaOficinaId: matricula.id, status: { in: ['PENDENTE', 'INADIMPLENTE'] } },
        data: { status: 'CANCELADA', motivoCancelamento: 'Desmatriculado da oficina' },
      });
      await tx.matriculaOficina.delete({ where: { turmaId_alunoId: { turmaId, alunoId } } });
    });
  }
}
