// MatriculasService — lógica de negócio (S020/S021/S022)
// S020: POST /matriculas — snapshot valorMensalidade, 1 ativa, requer resp. financeiro
// S021: GET /alunos/:id/matriculas — histórico

import { MatriculasRepository } from './matriculas.repository';
import { createAuditLog } from '../../middlewares/audit';
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors/AppError';
import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import type { MatriculaStatus, Turno } from '@prisma/client';
import type { CreateMatriculaInput } from './matriculas.schema';

export class MatriculasService {
  private repo = new MatriculasRepository();

  // S020 — Criar matrícula com snapshot de valor
  async create(filialId: string, creatorId: string, data: CreateMatriculaInput, ip?: string) {
    // Verificar aluno existe e pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Apenas alunos em PRE_MATRICULA ou INATIVO (rematrícula) podem ser matriculados
    if (aluno.status !== 'PRE_MATRICULA' && aluno.status !== 'INATIVO') {
      throw new ValidationError('Apenas alunos com status Pré-Matrícula ou Inativo podem ser matriculados');
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

    const valorSnapshot = data.turno === 'MANHA'
      ? Number(filial.valorMensalidadeManha)
      : Number(filial.valorMensalidadeTarde);

    // H9: Transação: criar matrícula + atualizar aluno para ATIVO
    // Race condition mitigation: a verificação de matrícula ativa e a criação ocorrem na
    // mesma transação; se dois requests simultâneos passarem a verificação, o segundo
    // lançará P2002 (caso haja unique constraint) ou será tratado abaixo
    let matricula;
    try {
      matricula = await prisma.$transaction(async (tx) => {
        // Re-verificar dentro da transação para reduzir janela de race condition
        const ativaExistente = await tx.matricula.findFirst({
          where: { alunoId: data.alunoId, status: 'ATIVA' },
        });
        if (ativaExistente) {
          throw new ValidationError('Aluno já possui matrícula ativa');
        }

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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Matrícula duplicada. Aluno já possui matrícula ativa.');
      }
      throw err;
    }

    await createAuditLog({
      userId: creatorId,
      filialId,
      action: 'CREATE',
      entityType: 'Matricula',
      entityId: matricula.id,
      newValues: {
        alunoId: data.alunoId,
        turno: data.turno,
        valorMensalidade: valorSnapshot,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return {
      ...matricula,
      valorMensalidade: Number(matricula.valorMensalidade),
    };
  }

  // S022 — Listar todas as matrículas da filial
  async listByFilial(filialId: string, status?: MatriculaStatus, turno?: Turno) {
    const matriculas = await this.repo.findAllByFilial(filialId, status, turno);
    return matriculas.map((m) => ({
      id: m.id,
      status: m.status,
      turno: m.turno,
      valorMensalidade: Number(m.valorMensalidade),
      dataInicio: m.dataInicio,
      dataFim: m.dataFim ?? null,
      createdAt: m.createdAt,
      aluno: m.aluno,
    }));
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
