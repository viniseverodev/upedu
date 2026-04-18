// AlunosService — lógica de negócio
// S012: cadastro com LGPD + isolamento por filial
// S013: edição, inativação com cascade, soft delete
// S014: lista de espera + promoção
// S015: transferência entre filiais
// S016: perfil completo
// S017: exportação CSV

import { AlunosRepository } from "./alunos.repository";
import { createAuditLog } from "../../middlewares/audit";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError";
import { decrypt, maskRg } from "../../shared/utils/crypto";
import type {
  CreateAlunoInput,
  UpdateAlunoInput,
  TransferirAlunoInput,
} from "./alunos.schema";
import type { AlunoStatus } from "@prisma/client";

export class AlunosService {
  private repo = new AlunosRepository();

  // S012 — Listar alunos da filial
  async list(filialId: string, status?: AlunoStatus) {
    return this.repo.findAllByFilial(filialId, status);
  }

  // S016 — Perfil completo do aluno (com CPF/RG mascarados nos responsaveis)
  async findById(id: string, filialId: string) {
    const aluno = await this.repo.findById(id);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError("Aluno");
    }

    // Descriptografar CPF/RG sem mascaramento
    const responsaveisMascarados = aluno.responsaveis.map((vinculo) => {
      const r = vinculo.responsavel;
      let cpf: string | null = null;
      let rg: string | null = null;
      if (r.cpfEnc) {
        try { cpf = decrypt(Buffer.from(r.cpfEnc as Buffer)).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); } catch { /* sem CPF */ }
      }
      if (r.rgEnc) {
        try { rg = maskRg(decrypt(Buffer.from(r.rgEnc as Buffer))); } catch { /* sem RG */ }
      }
      return {
        ...vinculo,
        responsavel: { id: r.id, nome: r.nome, telefone: r.telefone, email: r.email, cpf, rg },
      };
    });

    return { ...aluno, responsaveis: responsaveisMascarados };
  }

  // S012 — Criar aluno com conformidade LGPD
  async create(filialId: string, creatorId: string, data: CreateAlunoInput, ip?: string) {
    const aluno = await this.repo.create(filialId, {
      nome: data.nome,
      dataNascimento: new Date(data.dataNascimento),
      turno: data.turno,
      observacoes: data.observacoes,
      status: data.status,
      consentimentoTimestamp: new Date(),
    });

    await createAuditLog({
      userId: creatorId,
      filialId,
      action: "CREATE",
      entityType: "Aluno",
      entityId: aluno.id,
      newValues: { nome: aluno.nome, status: aluno.status, filialId },
      ipAddress: ip,
    });

    return aluno;
  }

  // S013 — Editar aluno com cascade ao inativar
  async update(
    id: string,
    filialId: string,
    updaterId: string,
    data: UpdateAlunoInput,
    ip?: string,
  ) {
    const aluno = await this.repo.findById(id);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError("Aluno");
    }

    const updateData: Parameters<AlunosRepository["update"]>[1] = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.dataNascimento !== undefined)
      updateData.dataNascimento = new Date(data.dataNascimento);
    if (data.turno !== undefined) updateData.turno = data.turno;
    if (data.observacoes !== undefined)
      updateData.observacoes = data.observacoes;
    if (data.status !== undefined) updateData.status = data.status;

    // Cascade atômica: encerra matrícula + cancela mensalidades + atualiza status em $transaction
    if (data.status === "INATIVO" && aluno.status !== "INATIVO") {
      const [, , updated] = await this.repo.inativarComCascade(id, updateData);
      await createAuditLog({
        userId: updaterId,
        filialId,
        action: "UPDATE",
        entityType: "Aluno",
        entityId: id,
        oldValues: {
          nome: aluno.nome,
          status: aluno.status,
        } as unknown as import("@prisma/client").Prisma.InputJsonValue,
        newValues:
          data as unknown as import("@prisma/client").Prisma.InputJsonValue,
        ipAddress: ip,
      });
      return updated;
    }

    const updated = await this.repo.update(id, updateData);

    await createAuditLog({
      userId: updaterId,
      filialId,
      action: "UPDATE",
      entityType: "Aluno",
      entityId: id,
      oldValues: {
        nome: aluno.nome,
        status: aluno.status,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValues:
        data as unknown as import("@prisma/client").Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return updated;
  }

  // S013 — Soft delete LGPD
  async softDelete(id: string, filialId: string, deleterId: string, ip?: string) {
    const aluno = await this.repo.findById(id);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError("Aluno");
    }

    await this.repo.softDelete(id);

    await createAuditLog({
      userId: deleterId,
      filialId,
      action: "DELETE",
      entityType: "Aluno",
      entityId: id,
      oldValues: {
        nome: aluno.nome,
        status: aluno.status,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      ipAddress: ip,
    });
  }

  // S014 — Promover da lista de espera para PRE_MATRICULA
  async promover(id: string, filialId: string, updaterId: string, ip?: string) {
    const aluno = await this.repo.findById(id);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError("Aluno");
    }
    if (aluno.status !== "LISTA_ESPERA") {
      throw new ValidationError("Aluno não está na lista de espera");
    }

    const updated = await this.repo.update(id, { status: "PRE_MATRICULA" });

    await createAuditLog({
      userId: updaterId,
      filialId,
      action: "UPDATE",
      entityType: "Aluno",
      entityId: id,
      oldValues: {
        status: "LISTA_ESPERA",
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValues: {
        status: "PRE_MATRICULA",
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return updated;
  }

  // S015 — Transferência entre filiais
  async transferir(
    id: string,
    filialOrigemId: string,
    transferidorId: string,
    data: TransferirAlunoInput,
    ip?: string,
  ) {
    const aluno = await this.repo.findById(id);
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialOrigemId) {
      throw new NotFoundError("Aluno");
    }
    if (data.filialDestinoId === filialOrigemId) {
      throw new ValidationError(
        "Filial de destino deve ser diferente da origem",
      );
    }

    const filialDestino = await this.repo.findFilial(data.filialDestinoId);
    if (!filialDestino) {
      throw new NotFoundError("Filial destino");
    }

    // S015 AC: aviso de mensalidades em aberto (não bloqueia — admin pode confirmar mesmo assim)
    const qtdPendentes = await this.repo.countMensalidadesPendentes(id, filialOrigemId);

    const valorMensalidade =
      aluno.turno === "MANHA"
        ? Number(filialDestino.valorMensalidadeManha)
        : Number(filialDestino.valorMensalidadeTarde);

    await this.repo.transferir(
      id,
      data.filialDestinoId,
      valorMensalidade,
      aluno.turno,
    );

    await createAuditLog({
      userId: transferidorId,
      filialId: filialOrigemId,
      action: "UPDATE",
      entityType: "Aluno",
      entityId: id,
      oldValues: {
        filialId: filialOrigemId,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      newValues: {
        filialId: data.filialDestinoId,
        acao: "TRANSFERENCIA",
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      ipAddress: ip,
    });

    // Usar findById do service para aplicar mascaramento de CPF/RG (BUG-008: evitar vazamento de cpfEnc/rgEnc)
    const alunoAtualizado = await this.findById(id, data.filialDestinoId);
    return {
      ...alunoAtualizado,
      ...(qtdPendentes > 0
        ? { aviso: `Aluno possui ${qtdPendentes} mensalidade(s) em aberto na filial atual` }
        : {}),
    };
  }

  // S017 — Exportação CSV (sem CPF/RG — LGPD)
  async exportCsv(filialId: string, status?: AlunoStatus): Promise<string> {
    const alunos = await this.repo.findAllByFilial(filialId, status);

    // C4: prevenir injeção de fórmula CSV — prefixar com tab se valor começa com =, +, -, @
    const sanitize = (val: string): string =>
      /^[=+\-@\t\r]/.test(val) ? `\t${val}` : val;

    const header = [
      "nome",
      "dataNascimento",
      "status",
      "turno",
      "responsavelNome",
      "telefone",
    ].join(",");

    const rows = alunos.map((a) => {
      const resp = a.responsaveis[0]?.responsavel;
      return [
        `"${sanitize(a.nome).replace(/"/g, '""')}"`,
        a.dataNascimento.toISOString().slice(0, 10),
        a.status,
        a.turno,
        `"${sanitize(resp?.nome ?? "").replace(/"/g, '""')}"`,
        `"${sanitize(resp?.telefone ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }
}
