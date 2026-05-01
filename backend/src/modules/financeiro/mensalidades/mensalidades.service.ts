// MensalidadesService — lógica de negócio (S022/S023/S024)
// S022: POST /mensalidades — gerar mensalidade com snapshot de valorMensalidade
// S023: PATCH /:id/pagar — registrar pagamento
// S024: PATCH /:id/cancelar — cancelar mensalidade (GERENTE+)

import { MensalidadesRepository } from './mensalidades.repository';
import { createAuditLog } from '../../../middlewares/audit';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/AppError';
import { prisma } from '../../../config/database';
import { DashboardService } from '../../dashboard/dashboard.service';
import type {
  CreateMensalidadeInput,
  PagarMensalidadeInput,
  EstornarMensalidadeInput,
  BulkPagarInput,
  BulkCancelarInput,
  BulkEstornarInput,
} from './mensalidades.schema';

export class MensalidadesService {
  private repo = new MensalidadesRepository();

  // S022 — Listar mensalidades da filial por período (dataVencimento)
  async list(filialId: string, dataInicio: Date, dataFim: Date) {
    const items = await this.repo.findByFilialAndPeriod(filialId, dataInicio, dataFim);
    return items.map((m) => {
      const respVinculo = m.aluno.responsaveis?.[0];
      return {
        ...this.toResponse(m),
        oficinaNome: m.matriculaOficina?.turma?.oficina?.nome ?? null,
        aluno: {
          id: m.aluno.id,
          nome: m.aluno.nome,
          turno: m.aluno.turno,
          responsavelFinanceiro: respVinculo
            ? {
                nome: respVinculo.responsavel.nome,
                telefone: respVinculo.responsavel.telefone ?? null,
                email: respVinculo.responsavel.email ?? null,
                parentesco: respVinculo.parentesco ?? null,
              }
            : null,
        },
      };
    });
  }

  // S022 — Gerar mensalidade manual
  async create(filialId: string, creatorId: string, data: CreateMensalidadeInput, ip?: string) {
    // Verificar aluno pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Buscar filial para calcular dataVencimento e valor (necessário antes da checagem de idempotência)
    const filial = await prisma.filial.findUnique({ where: { id: filialId } });
    if (!filial) throw new NotFoundError('Filial');

    // Buscar matrícula ativa para obter o valor snapshot
    let matriculaAtiva = await prisma.matricula.findFirst({
      where: { alunoId: data.alunoId, status: 'ATIVA' },
    });

    // Aluno precisa estar ATIVO para gerar mensalidade
    if (!matriculaAtiva && aluno.status !== 'ATIVO') {
      throw new ValidationError('Aluno não possui matrícula ativa');
    }

    // Auto-criar matrícula para alunos ATIVO sem registro (integridade de dados)
    if (!matriculaAtiva && aluno.status === 'ATIVO') {
      const valorMensalidade =
        aluno.turno === 'MANHA'
          ? Number(filial.valorMensalidadeManha)
          : Number(filial.valorMensalidadeTarde);
      matriculaAtiva = await prisma.matricula.create({
        data: {
          alunoId: data.alunoId,
          filialId,
          turno: aluno.turno,
          status: 'ATIVA',
          dataInicio: new Date(),
          valorMensalidade,
        },
      });
    }

    // Valor: snapshot da matrícula
    const valorOriginal = Number(matriculaAtiva!.valorMensalidade);

    // Calcular dataVencimento — tratar dia > último dia do mês
    const dataVencimento = this.calcularVencimento(
      data.mesReferencia,
      data.anoReferencia,
      filial.diaVencimento,
    );

    // Idempotência — verificar se já existe para este mês/ano (incluindo canceladas)
    const existenteQualquer = await this.repo.findByAlunoMesAnoAny(
      data.alunoId,
      data.mesReferencia,
      data.anoReferencia,
    );

    if (existenteQualquer) {
      if (existenteQualquer.status !== 'CANCELADA') {
        const statusLabel = existenteQualquer.status === 'PAGO' ? 'paga' : 'em aberto';
        throw new ConflictError(
          `Já existe uma mensalidade ${statusLabel} para ${aluno.nome} em ${data.mesReferencia}/${data.anoReferencia}. Verifique a listagem.`,
        );
      }

      // Mensalidade cancelada: reativar em vez de criar nova (evita violação de unique no banco)
      const reativada = await this.repo.reactivate(existenteQualquer.id, {
        valorOriginal,
        dataVencimento,
      });

      await createAuditLog({
        userId: creatorId,
        filialId,
        action: 'UPDATE',
        entityType: 'Mensalidade',
        entityId: reativada.id,
        newValues: {
          acao: 'REATIVAR',
          mes: data.mesReferencia,
          ano: data.anoReferencia,
          valorOriginal: Number(reativada.valorOriginal),
        } as unknown as import('@prisma/client').Prisma.InputJsonValue,
        ipAddress: ip,
      });

      return this.toResponse(reativada);
    }

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

  // S023 — Registrar pagamento (suporta múltiplas formas e pagamento parcial)
  async pagar(id: string, filialId: string, userId: string, data: PagarMensalidadeInput, ip?: string) {
    const mensalidade = await this.repo.findByIdAndFilial(id, filialId);
    if (!mensalidade) throw new NotFoundError('Mensalidade');

    if (mensalidade.status === 'PAGO') throw new ValidationError('Mensalidade já foi paga');
    if (mensalidade.status === 'CANCELADA') throw new ValidationError('Mensalidade cancelada não pode ser paga');

    const totalNovosPagamentos = data.splits.reduce((acc, s) => acc + s.valor, 0);
    const totalJaPago = Number(mensalidade.valorPago ?? 0);

    // Desconto só é aceito no primeiro pagamento (PENDENTE/INADIMPLENTE)
    const novoDesconto = mensalidade.status === 'PARCIAL' ? 0 : data.valorDesconto;
    const totalDesconto = Number(mensalidade.valorDesconto) + novoDesconto;

    const totalPago = totalJaPago + totalNovosPagamentos;
    const valorLiquido = Number(mensalidade.valorOriginal) - totalDesconto;
    const novoStatus = totalPago >= valorLiquido ? 'PAGO' : 'PARCIAL';

    // M1: sufixo -03:00 garante interpretação BRT — evita shift de 1 dia em servidor UTC
    const dataPag = new Date(data.dataPagamento + 'T00:00:00-03:00');
    const formaLabel = data.splits.map((s) => s.formaPagamento).join(' + ');

    // Criar registros de Pagamento e atualizar Mensalidade em transação
    const updated = await prisma.$transaction(async (tx) => {
      for (const split of data.splits) {
        await tx.pagamento.create({
          data: { mensalidadeId: id, valor: split.valor, formaPagamento: split.formaPagamento, dataPagamento: dataPag },
        });
      }
      return tx.mensalidade.update({
        where: { id },
        data: {
          status: novoStatus,
          valorPago: totalPago,
          valorDesconto: totalDesconto,
          formaPagamento: formaLabel,
          dataPagamento: novoStatus === 'PAGO' ? dataPag : null,
        },
      });
    });

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: id,
      newValues: {
        acao: novoStatus === 'PAGO' ? 'PAGAR' : 'PAGAR_PARCIAL',
        totalPago,
        splits: data.splits,
        novoStatus,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    // Invalida cache apenas quando totalmente pago
    if (novoStatus === 'PAGO') {
      await DashboardService.invalidarCache(filialId, dataPag.getMonth() + 1, dataPag.getFullYear());
    }

    return this.toResponse(updated);
  }

  // Estornar pagamento — reverte PAGO/PARCIAL → PENDENTE
  async estornar(id: string, filialId: string, userId: string, data: EstornarMensalidadeInput, ip?: string) {
    const mensalidade = await this.repo.findByIdAndFilial(id, filialId);
    if (!mensalidade) throw new NotFoundError('Mensalidade');

    if (mensalidade.status !== 'PAGO' && mensalidade.status !== 'PARCIAL') {
      throw new ValidationError('Apenas mensalidades pagas ou parcialmente pagas podem ser estornadas');
    }

    // Remove todos os registros de Pagamento e reverte a Mensalidade em transação
    // H10: valorJuros também é zerado — o juros foi calculado com base no status INADIMPLENTE,
    // que deixa de existir após o estorno; o novo cálculo ocorre no próximo job de vencimento
    const updated = await prisma.$transaction(async (tx) => {
      await tx.pagamento.deleteMany({ where: { mensalidadeId: id } });
      return tx.mensalidade.update({
        where: { id },
        data: {
          status: 'PENDENTE',
          valorPago: null,
          valorDesconto: 0,
          valorJuros: 0,
          formaPagamento: null,
          dataPagamento: null,
          motivoCancelamento: `[ESTORNO] ${data.motivoEstorno}`,
        },
      });
    });

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: id,
      newValues: {
        acao: 'ESTORNAR',
        motivoEstorno: data.motivoEstorno,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    // Invalida cache de KPIs
    if (mensalidade.dataPagamento) {
      const dataPag = new Date(mensalidade.dataPagamento);
      await DashboardService.invalidarCache(filialId, dataPag.getMonth() + 1, dataPag.getFullYear());
    }

    return this.toResponse(updated);
  }

  // S024 — Cancelar mensalidade
  async cancelar(id: string, filialId: string, userId: string, motivoCancelamento: string, ip?: string) {
    const mensalidade = await this.repo.findByIdAndFilial(id, filialId);
    if (!mensalidade) throw new NotFoundError('Mensalidade');

    if (mensalidade.status === 'PAGO') {
      throw new ValidationError('Mensalidade paga não pode ser cancelada. Use estorno.');
    }
    if (mensalidade.status === 'PARCIAL') {
      throw new ValidationError('Mensalidade parcialmente paga não pode ser cancelada. Use estorno.');
    }
    if (mensalidade.status === 'CANCELADA') {
      throw new ValidationError('Mensalidade já está cancelada');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.mensalidade.update({
        where: { id },
        data: { status: 'CANCELADA', motivoCancelamento },
      });

      // Se for mensalidade de oficina, desmatricular o aluno da turma automaticamente
      if (mensalidade.tipo === 'OFICINA' && mensalidade.matriculaOficinaId) {
        await tx.matriculaOficina.delete({
          where: { id: mensalidade.matriculaOficinaId },
        }).catch((e: { code?: string }) => {
          if (e.code !== 'P2025') throw e; // Ignora apenas "registro não encontrado"
        });
      }

      return result;
    });

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
        desmatriculadoOficina: mensalidade.tipo === 'OFICINA' && !!mensalidade.matriculaOficinaId,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return this.toResponse(updated);
  }

  // Calcula data de vencimento ajustando para último dia do mês se necessário
  // Pagar em lote
  async pagarLote(filialId: string, userId: string, data: BulkPagarInput, ip?: string) {
    const items = await this.repo.findManyByIds(data.ids, filialId);
    const results = { success: 0, skipped: 0, skippedMotivos: [] as string[] };
    // M1: sufixo -03:00 garante interpretação BRT — evita shift de 1 dia em servidor UTC
    const dataPag = new Date(data.dataPagamento + 'T00:00:00-03:00');

    // H4: separar itens elegíveis para processar em uma única $transaction (N sequenciais → 1)
    const itemsParaPagar: typeof items = [];
    for (const item of items) {
      if (item.status !== 'PENDENTE' && item.status !== 'INADIMPLENTE') {
        results.skipped++;
        results.skippedMotivos.push(`ID ${item.id}: status ${item.status}`);
      } else {
        itemsParaPagar.push(item);
      }
    }

    if (itemsParaPagar.length > 0) {
      await prisma.$transaction(
        itemsParaPagar.flatMap((item) => {
          const valorOriginal = Number(item.valorOriginal);
          const valorPago = data.valorDesconto > 0
            ? Math.max(0, valorOriginal - data.valorDesconto)
            : valorOriginal;
          return [
            prisma.pagamento.create({
              data: {
                mensalidadeId: item.id,
                valor: valorPago,
                formaPagamento: data.formaPagamento,
                dataPagamento: dataPag,
              },
            }),
            prisma.mensalidade.update({
              where: { id: item.id },
              data: {
                status: 'PAGO',
                valorPago,
                valorDesconto: data.valorDesconto,
                formaPagamento: data.formaPagamento,
                dataPagamento: dataPag,
              },
            }),
          ];
        }),
      );
      results.success = itemsParaPagar.length;
    }

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: 'BULK',
      newValues: { acao: 'PAGAR_LOTE', ids: data.ids, total: results.success } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    await DashboardService.invalidarCache(filialId, dataPag.getMonth() + 1, dataPag.getFullYear());
    return results;
  }

  // Cancelar em lote
  async cancelarLote(filialId: string, userId: string, data: BulkCancelarInput, ip?: string) {
    const ids = data.items.map((i) => i.id);
    const motivoMap = new Map(data.items.map((i) => [i.id, i.motivoCancelamento]));
    const dbItems = await this.repo.findManyByIds(ids, filialId);

    // M2: cancelamento + desmatricula em uma única transação atômica
    const elegiveis = dbItems.filter((item) => item.status !== 'PAGO' && item.status !== 'CANCELADA' && item.status !== 'PARCIAL');
    const results = { success: elegiveis.length, skipped: dbItems.length - elegiveis.length };

    if (elegiveis.length > 0) {
      await prisma.$transaction([
        ...elegiveis.map((item) => {
          const motivo = motivoMap.get(item.id) ?? '';
          return prisma.mensalidade.update({ where: { id: item.id }, data: { status: 'CANCELADA', motivoCancelamento: motivo } });
        }),
        ...elegiveis
          .filter((item) => item.tipo === 'OFICINA' && item.matriculaOficinaId)
          .map((item) => prisma.matriculaOficina.deleteMany({ where: { id: item.matriculaOficinaId! } })),
      ]);
    }

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: 'BULK',
      newValues: { acao: 'CANCELAR_LOTE', ids, total: results.success } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return results;
  }

  // Estornar em lote — suporta PAGO e PARCIAL, com motivos individuais por item
  async estornarLote(filialId: string, userId: string, data: BulkEstornarInput, ip?: string) {
    const ids = data.items.map((i) => i.id);
    const motivoMap = new Map(data.items.map((i) => [i.id, i.motivoEstorno]));
    const dbItems = await this.repo.findManyByIds(ids, filialId);

    // BUG-009: uma única $transaction batch em vez de N transações sequenciais — N viagens → 1
    const elegiveis = dbItems.filter((item) => item.status === 'PAGO' || item.status === 'PARCIAL');
    const results = { success: elegiveis.length, skipped: dbItems.length - elegiveis.length };

    if (elegiveis.length > 0) {
      await prisma.$transaction(
        elegiveis.flatMap((item) => {
          const motivo = motivoMap.get(item.id) ?? '';
          return [
            prisma.pagamento.deleteMany({ where: { mensalidadeId: item.id } }),
            prisma.mensalidade.update({
              where: { id: item.id },
              data: {
                status: 'PENDENTE',
                valorPago: null,
                valorDesconto: 0,
                valorJuros: 0, // H10: resetar juros no estorno em lote também
                formaPagamento: null,
                dataPagamento: null,
                motivoCancelamento: `[ESTORNO] ${motivo}`,
              },
            }),
          ];
        }),
      );
      await Promise.all(
        elegiveis
          .filter((item) => item.dataPagamento)
          .map((item) =>
            DashboardService.invalidarCache(filialId, item.dataPagamento!.getMonth() + 1, item.dataPagamento!.getFullYear()),
          ),
      );
    }

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Mensalidade',
      entityId: 'BULK',
      newValues: { acao: 'ESTORNAR_LOTE', ids, total: results.success } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return results;
  }

  private calcularVencimento(mes: number, ano: number, diaVencimento: number): Date {
    const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do próximo mês = último dia do mês atual
    const dia = Math.min(diaVencimento, ultimoDia);
    // M3: usar string ISO com timezone BRT explícito — evita shift em servidor UTC onde
    // new Date(ano, mes-1, dia) cria meia-noite UTC = 21h BRT do dia anterior
    const mesStr = String(mes).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    return new Date(`${ano}-${mesStr}-${diaStr}T00:00:00-03:00`);
  }

  private toResponse(m: {
    id: string;
    alunoId: string;
    filialId: string;
    tipo: string;
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
    pagamentos?: Array<{ id: string; valor: import('@prisma/client').Prisma.Decimal; formaPagamento: string; dataPagamento: Date }>;
  }) {
    return {
      id: m.id,
      alunoId: m.alunoId,
      filialId: m.filialId,
      tipo: m.tipo,
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
      pagamentos: m.pagamentos?.map((p) => ({
        id: p.id,
        valor: Number(p.valor),
        formaPagamento: p.formaPagamento,
        dataPagamento: p.dataPagamento,
      })),
    };
  }
}
