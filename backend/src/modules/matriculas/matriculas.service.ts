// MatriculasService — lógica de negócio (S020/S021)
// S020: POST /matriculas — snapshot valorMensalidade, 1 ativa, requer resp. financeiro
// S021: GET /alunos/:id/matriculas — histórico

import { MatriculasRepository } from './matriculas.repository';
import { createAuditLog } from '../../middlewares/audit';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { prisma } from '../../config/database';
import type { CreateMatriculaInput } from './matriculas.schema';

export class MatriculasService {
  private repo = new MatriculasRepository();

  // S020 — Criar matrícula com snapshot de valor
  async create(filialId: string, creatorId: string, data: CreateMatriculaInput) {
    // Verificar aluno existe e pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Apenas alunos em PRE_MATRICULA podem ser matriculados
    if (aluno.status !== 'PRE_MATRICULA') {
      throw new ValidationError('Apenas alunos com status PRE_MATRICULA podem ser matriculados');
    }

    // Verificar aluno tem responsável financeiro
    const responsavelFinanceiro = await prisma.alunoResponsavel.findFirst({
      where: { alunoId: data.alunoId, isResponsavelFinanceiro: true },
    });
    if (!responsavelFinanceiro) {
      throw new ValidationError('Aluno precisa ter responsável financeiro para ser matriculado');
    }

    // Verificar não tem matrícula ATIVA
    const matriculaAtiva = await this.repo.findActiveByAluno(data.alunoId);
    if (matriculaAtiva) {
      throw new ValidationError('Aluno já possui matrícula ativa');
    }

    // Buscar filial para snapshot de valor
    const filial = await prisma.filial.findUnique({ where: { id: filialId } });
    if (!filial) throw new NotFoundError('Filial');

    const valorSnapshot = data.turno === 'INTEGRAL'
      ? Number(filial.valorMensalidadeIntegral)
      : Number(filial.valorMensalidadeMeioTurno);

    // Transação: criar matrícula + atualizar aluno para ATIVO
    const matricula = await prisma.$transaction(async (tx) => {
      const created = await tx.matricula.create({
        data: {
          alunoId: data.alunoId,
          filialId,
          turno: data.turno,
          valorMensalidade: valorSnapshot,
          dataInicio: new Date(data.dataInicio),
          status: 'ATIVA',
        },
      });

      await tx.aluno.update({
        where: { id: data.alunoId },
        data: { status: 'ATIVO' },
      });

      return created;
    });

    await createAuditLog({
      userId: creatorId,
      action: 'CREATE',
      entityType: 'Matricula',
      entityId: matricula.id,
      newValues: {
        alunoId: data.alunoId,
        turno: data.turno,
        valorMensalidade: valorSnapshot,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
    });

    return {
      ...matricula,
      valorMensalidade: Number(matricula.valorMensalidade),
    };
  }

  // S021 — Histórico de matrículas
  async listByAluno(alunoId: string, filialId: string) {
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    const matriculas = await this.repo.findByAluno(alunoId);
    return matriculas.map((m) => ({
      id: m.id,
      status: m.status,
      turno: m.turno,
      valorMensalidade: Number(m.valorMensalidade),
      dataInicio: m.dataInicio,
      dataFim: m.dataFim ?? null,
      nomeDaFilial: m.filial.nome,
      createdAt: m.createdAt,
    }));
  }
}
