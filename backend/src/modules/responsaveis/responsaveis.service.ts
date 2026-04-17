// ResponsaveisService — lógica de negócio (S018/S019)
// S018: CRUD com criptografia AES-256-GCM para CPF/RG (LGPD)
// S019: Vinculação/desvinculação com regra de único responsável financeiro

import { ResponsaveisRepository } from './responsaveis.repository';
import { createAuditLog } from '../../middlewares/audit';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { encrypt, decrypt, maskCpf, maskRg } from '../../shared/utils/crypto';
import type {
  CreateResponsavelInput,
  UpdateResponsavelInput,
  VincularResponsavelInput,
} from './responsaveis.schema';
import { prisma } from '../../config/database';

// Responsável com CPF/RG mascarados (retorno padrão)
export interface ResponsavelPublico {
  id: string;
  nome: string;
  cpf?: string | null;    // mascarado: •••.123.•••-••
  rg?: string | null;     // mascarado: •••••23
  telefone?: string | null;
  email?: string | null;
  deletedAt?: Date | null;
}

export class ResponsaveisService {
  private repo = new ResponsaveisRepository();

  // S018 — Listar responsáveis vinculados a alunos da filial
  async listByFilial(filialId: string): Promise<ResponsavelPublico[]> {
    const responsaveis = await this.repo.findByFilial(filialId);
    return responsaveis.map((r) => this.toPublico(r));
  }

  // S018 — Criar responsável com CPF/RG encriptados
  async create(creatorId: string, data: CreateResponsavelInput, ip?: string): Promise<ResponsavelPublico> {
    const createData: {
      nome: string;
      cpfEnc?: Buffer;
      rgEnc?: Buffer;
      telefone?: string;
      email?: string;
    } = {
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
    };

    if (data.cpf) {
      const cpfClean = data.cpf.replace(/\D/g, '');
      createData.cpfEnc = encrypt(cpfClean);
    }
    if (data.rg) {
      createData.rgEnc = encrypt(data.rg.replace(/\D/g, ''));
    }

    const responsavel = await this.repo.create(createData);

    await createAuditLog({
      userId: creatorId,
      action: 'CREATE',
      entityType: 'Responsavel',
      entityId: responsavel.id,
      newValues: { nome: responsavel.nome } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return this.toPublico(responsavel);
  }

  // S018 — Buscar por ID com CPF/RG mascarados (BUG-009: check de org obrigatório)
  async findById(id: string, orgId: string): Promise<ResponsavelPublico> {
    const responsavel = await this.repo.findById(id);
    if (!responsavel) throw new NotFoundError('Responsável');
    await this.assertOrgAccess(id, orgId);
    return this.toPublico(responsavel);
  }

  // S018 — Revelar CPF completo + audit log (LGPD Art. 18) (BUG-010: check de org obrigatório)
  async revelarCpf(id: string, requesterId: string, orgId: string, ip?: string): Promise<{ cpf: string }> {
    const responsavel = await this.repo.findById(id);
    if (!responsavel) throw new NotFoundError('Responsável');
    await this.assertOrgAccess(id, orgId);
    if (!responsavel.cpfEnc) throw new ValidationError('Responsável não possui CPF cadastrado');

    const cpfClean = decrypt(responsavel.cpfEnc as Buffer);
    const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    await createAuditLog({
      userId: requesterId,
      action: 'UPDATE',
      entityType: 'Responsavel',
      entityId: id,
      newValues: { acao: 'REVELAR_CPF' } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return { cpf: cpfFormatted };
  }

  // S018 — Atualizar responsável (BUG-009: check de org obrigatório)
  async update(
    id: string,
    updaterId: string,
    orgId: string,
    data: UpdateResponsavelInput,
    ip?: string,
  ): Promise<ResponsavelPublico> {
    const responsavel = await this.repo.findById(id);
    if (!responsavel) throw new NotFoundError('Responsável');
    await this.assertOrgAccess(id, orgId);

    const updateData: {
      nome?: string;
      cpfEnc?: Buffer;
      rgEnc?: Buffer;
      telefone?: string;
      email?: string;
    } = {};

    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.telefone !== undefined) updateData.telefone = data.telefone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.cpf !== undefined) {
      updateData.cpfEnc = encrypt(data.cpf.replace(/\D/g, ''));
    }
    if (data.rg !== undefined) {
      updateData.rgEnc = encrypt(data.rg.replace(/\D/g, ''));
    }

    const updated = await this.repo.update(id, updateData);

    await createAuditLog({
      userId: updaterId,
      action: 'UPDATE',
      entityType: 'Responsavel',
      entityId: id,
      oldValues: { nome: responsavel.nome } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      newValues: { nome: updated.nome } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return this.toPublico(updated);
  }

  // S019 — Vincular responsável a aluno
  async vincular(
    alunoId: string,
    filialId: string,
    linkerId: string,
    data: VincularResponsavelInput,
    ip?: string,
  ) {
    // Verificar se aluno pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Verificar se responsável existe
    const responsavel = await this.repo.findById(data.responsavelId);
    if (!responsavel) throw new NotFoundError('Responsável');

    // Verificar se vínculo já existe
    const vinculoExistente = await this.repo.findVinculo(alunoId, data.responsavelId);
    if (vinculoExistente) {
      throw new ValidationError('Responsável já vinculado a este aluno');
    }

    // Regra: apenas 1 responsável financeiro por aluno
    // TECH DEBT: race condition teórica em requests simultâneos (check-then-act sem lock).
    // Mitigação definitiva: partial unique index em alunos_responsaveis(alunoId) WHERE isResponsavelFinanceiro=true.
    // Requer migration SQL raw (Prisma não suporta partial index via schema).
    // Deferido para sprint futuro — carga concorrente atual é baixa.
    if (data.isResponsavelFinanceiro) {
      const totalFinanceiros = await this.repo.countFinanceiros(alunoId);
      if (totalFinanceiros >= 1) {
        throw new ValidationError('Este aluno já possui um responsável financeiro');
      }
    }

    const vinculo = await this.repo.vincular(
      alunoId,
      data.responsavelId,
      data.parentesco,
      data.isResponsavelFinanceiro,
    );

    await createAuditLog({
      userId: linkerId,
      filialId,
      action: 'UPDATE',
      entityType: 'Aluno',
      entityId: alunoId,
      newValues: {
        acao: 'VINCULAR_RESPONSAVEL',
        responsavelId: data.responsavelId,
        parentesco: data.parentesco,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return vinculo;
  }

  // S019 — Desvincular responsável de aluno
  async desvincular(alunoId: string, filialId: string, responsavelId: string, unlinkerId: string, ip?: string) {
    // Verificar se aluno pertence à filial
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno || aluno.deletedAt || aluno.filialId !== filialId) {
      throw new NotFoundError('Aluno');
    }

    // Verificar se vínculo existe
    const vinculo = await this.repo.findVinculo(alunoId, responsavelId);
    if (!vinculo) throw new NotFoundError('Vínculo');

    await this.repo.desvincular(alunoId, responsavelId);

    await createAuditLog({
      userId: unlinkerId,
      filialId,
      action: 'UPDATE',
      entityType: 'Aluno',
      entityId: alunoId,
      newValues: {
        acao: 'DESVINCULAR_RESPONSAVEL',
        responsavelId,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });
  }

  // BUG-009/010 — Verifica que o responsável está vinculado a um aluno da organização do solicitante
  private async assertOrgAccess(responsavelId: string, orgId: string): Promise<void> {
    const link = await prisma.alunoResponsavel.findFirst({
      where: {
        responsavelId,
        aluno: { deletedAt: null, filial: { organizationId: orgId } },
      },
    });
    if (!link) throw new NotFoundError('Responsável');
  }

  // Converte campos BYTEA para CPF/RG mascarados
  private toPublico(r: {
    id: string;
    nome: string;
    cpfEnc?: Buffer | Uint8Array | null;
    rgEnc?: Buffer | Uint8Array | null;
    telefone?: string | null;
    email?: string | null;
    deletedAt?: Date | null;
  }): ResponsavelPublico {
    let cpf: string | null = null;
    let rg: string | null = null;

    if (r.cpfEnc) {
      try {
        const cpfClean = decrypt(Buffer.from(r.cpfEnc));
        const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        cpf = maskCpf(cpfFormatted);
      } catch {
        cpf = null;
      }
    }

    if (r.rgEnc) {
      try {
        rg = maskRg(decrypt(Buffer.from(r.rgEnc)));
      } catch {
        rg = null;
      }
    }

    return {
      id: r.id,
      nome: r.nome,
      cpf,
      rg,
      telefone: r.telefone ?? null,
      email: r.email ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
