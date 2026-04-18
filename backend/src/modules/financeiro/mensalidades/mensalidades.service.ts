// MensalidadesService — lógica de negócio (S022/S023/S024)
// S022: POST /mensalidades — gerar mensalidade com snapshot de valorMensalidade
// S023: PATCH /:id/pagar — registrar pagamento
// S024: PATCH /:id/cancelar — cancelar mensalidade (GERENTE+)

import { MensalidadesRepository } from './mensalidades.repository';
import { createAuditLog } from '../../../middlewares/audit';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/AppError';
import { prisma } from '../../../config/database';
import { DashboardService } from '../../dashboard/dashboard.service';
import type { CreateMensalidadeInput, PagarMensalidadeInput } from './mensalidades.schema';

export class MensalidadesService {
  private repo = new MensalidadesRepository();

  // S022 — Gerar mensalidade manual
  async create(filialId: string, creatorId: string, data: CreateMensalidadeInput, ip?: string) {
    // Verificar aluno pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Buscar matrícula ativa para obter o valor snapshot
    const matriculaAtiva = await prisma.matricula.findFirst({
      where: { alunoId: data.alunoId, status: 'ATIVA' },
    });

    // Aluno precisa estar ATIVO para gerar mensalidade
    if (!matriculaAtiva && aluno.status !== 'ATIVO') {
      throw new ValidationError('Aluno não possui matrícula ativa');
    }

    // Idempotência — verificar se já existe para este mês/ano
    const existente = await this.repo.findByAlunoMesAno(
      data.alunoId,
      data.mesReferencia,
      data.anoReferencia,
    );
    if (existente) {
      throw new ConflictError('Mensalidade já existe para este mês');
    }

    // Buscar filial para calcular dataVencimento e valor de fallback
    const filial = await prisma.filial.findUnique({ where: { id: filialId } });
    if (!filial) throw new NotFoundError('Filial');

    // Valor: snapshot da matrícula se existir; caso contrário, valor atual da filial pelo turno
    const valorOriginal = matriculaAtiva
      ? Number(matriculaAtiva.valorMensalidade)
      : aluno.turno === 'MANHA'
        ? Number(filial.valorMensalidadeManha)
        : Number(filial.valorMensalidadeTarde);

    // Calcular dataVencimento — tratar dia > último dia do mês
    const dataVencimento = this.calcularVencimento(
      data.mesReferencia,
      data.anoReferencia,
      filial.diaVencimento,
    );

    const mensalidade = await this.repo.create({
      alunoId: data.alunoId,
      filialId,
      mesReferencia: data.mesReferencia,
      anoReferencia: data.anoReferencia,
      valorOriginal,
      dataVencimento,
    });

    await createAuditLog({
      userId: creatorId,
      filialId,
      action: 'CREATE',
      entityType: 'Mensalidade',
      entityId: mensalidade.id,
      newValues: {
        alunoId: data.alunoId,
        mes: data.mesReferencia,
        ano: data.anoReferencia,
        valorOriginal: Number(mensalidade.valorOriginal),
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return this.toResponse(mensalidade);
  }

  // S023 — Registrar pagamento
  async pagar(id: string, filialId: string, userId: string, data: PagarMensalidadeInput, ip?: string) {
    const mensalidade = await this.repo.findByIdAndFilial(id, filialId);
    if (!mensalidade) throw new NotFoundError('Mensalidade');

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Mensalidade já foi paga');
    }
    if (mensalidade.status === 'CANCELADA') {
      throw new ValidationError('Mensalidade cancelada não pode ser paga');
    }

    const updated = await this.repo.update(id, {
      status: 'PAGO',
      valorPago: data.valorPago,
      valorDesconto: data.valorDesconto,
      formaPagamento: data.formaPagamento,
      dataPagamento: new Date(data.dataPagamento),
    });

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: id,
      newValues: {
        acao: 'PAGAR',
        valorPago: data.valorPago,
        formaPagamento: data.formaPagamento,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    // Invalida cache de KPIs para refletir nova receita imediatamente
    const dataPag = new Date(data.dataPagamento);
    await DashboardService.invalidarCache(filialId, dataPag.getMonth() + 1, dataPag.getFullYear());

    return this.toResponse(updated);
  }

  // S024 — Cancelar mensalidade
  async cancelar(id: string, filialId: string, userId: string, motivoCancelamento: string, ip?: string) {
    const mensalidade = await this.repo.findByIdAndFilial(id, filialId);
    if (!mensalidade) throw new NotFoundError('Mensalidade');

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Mensalidade paga não pode ser cancelada. Use estorno.');
    }
    if (mensalidade.status === 'CANCELADA') {
      throw new ValidationError('Mensalidade já está cancelada');
    }

    const updated = await this.repo.update(id, { status: 'CANCELADA', motivoCancelamento });

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: id,
      newValues: {
        acao: 'CANCELAR',
        motivoCancelamento,
        statusAnterior: mensalidade.status,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return this.toResponse(updated);
  }

  // Calcula data de vencimento ajustando para último dia do mês se necessário
  private calcularVencimento(mes: number, ano: number, diaVencimento: number): Date {
    const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do próximo mês = último dia do mês atual
    const dia = Math.min(diaVencimento, ultimoDia);
    return new Date(ano, mes - 1, dia);
  }

  private toResponse(m: {
    id: string;
    alunoId: string;
    filialId: string;
    status: string;
    mesReferencia: number;
    anoReferencia: number;
    valorOriginal: import('@prisma/client').Prisma.Decimal;
    valorDesconto: import('@prisma/client').Prisma.Decimal;
    valorJuros: import('@prisma/client').Prisma.Decimal;
    valorPago: import('@prisma/client').Prisma.Decimal | null;
    dataVencimento: Date;
    dataPagamento: Date | null;
    formaPagamento: string | null;
    motivoCancelamento: string | null;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      alunoId: m.alunoId,
      filialId: m.filialId,
      status: m.status,
      mesReferencia: m.mesReferencia,
      anoReferencia: m.anoReferencia,
      valorOriginal: Number(m.valorOriginal),
      valorDesconto: Number(m.valorDesconto),
      valorJuros: Number(m.valorJuros),
      valorPago: m.valorPago !== null ? Number(m.valorPago) : null,
      dataVencimento: m.dataVencimento,
      dataPagamento: m.dataPagamento ?? null,
      formaPagamento: m.formaPagamento ?? null,
      motivoCancelamento: m.motivoCancelamento ?? null,
      createdAt: m.createdAt,
    };
  }
}
