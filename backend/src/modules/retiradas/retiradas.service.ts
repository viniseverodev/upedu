// RetiradasService — lógica de negócio

import { RetiradasRepository } from './retiradas.repository';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { formatarCPF } from './retiradas.schema';
import type {
  CreateAutorizacaoInput,
  UpdateAutorizacaoInput,
  ValidarCpfInput,
  ConfirmarRetiradaInput,
} from './retiradas.schema';

// HH:MM → minutos desde meia-noite
function toMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Retorna "HH:MM" do horário BRT da data fornecida
function horarioBRT(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export class RetiradasService {
  private repo = new RetiradasRepository();

  // ── Autorizações ──

  async listAutorizacoes(alunoId: string, filialId: string) {
    // Confirma que aluno pertence à filial antes de retornar dados
    const { prisma } = await import('../../config/database');
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno || aluno.filialId !== filialId || aluno.deletedAt) throw new NotFoundError('Aluno');
    return this.repo.findAllByAluno(alunoId);
  }

  async createAutorizacao(alunoId: string, filialId: string, data: CreateAutorizacaoInput) {
    const { prisma } = await import('../../config/database');
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno || aluno.filialId !== filialId || aluno.deletedAt) throw new NotFoundError('Aluno');

    const cpfFormatado = formatarCPF(data.cpf);

    return this.repo.create(filialId, alunoId, {
      nome: data.nome,
      cpf: cpfFormatado,
      relacao: data.relacao,
      fotoUrl: data.fotoUrl,
      tipo: data.tipo,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      horarioInicio: data.horarioInicio,
      horarioFim: data.horarioFim,
    });
  }

  async updateAutorizacao(authId: string, filialId: string, data: UpdateAutorizacaoInput) {
    const auth = await this.repo.findById(authId);
    if (!auth || auth.filialId !== filialId) throw new NotFoundError('Autorização');

    return this.repo.update(authId, {
      nome: data.nome,
      cpf: data.cpf ? formatarCPF(data.cpf) : undefined,
      relacao: data.relacao,
      fotoUrl: data.fotoUrl,
      tipo: data.tipo,
      horarioInicio: data.horarioInicio,
      horarioFim: data.horarioFim,
      ativo: data.ativo,
      dataInicio: data.dataInicio !== undefined ? (data.dataInicio ? new Date(data.dataInicio) : null) : undefined,
      dataFim: data.dataFim !== undefined ? (data.dataFim ? new Date(data.dataFim) : null) : undefined,
    });
  }

  async deleteAutorizacao(authId: string, filialId: string) {
    const auth = await this.repo.findById(authId);
    if (!auth || auth.filialId !== filialId) throw new NotFoundError('Autorização');
    return this.repo.softDelete(authId);
  }

  // ── Tela da monitora ──

  async buscarAlunos(filialId: string, nome: string) {
    return this.repo.buscarAlunos(filialId, nome.trim());
  }

  async getAutorizacoesValidas(alunoId: string, filialId: string) {
    const agora = new Date();
    const autorizacoes = await this.repo.findAutorizacoesValidas(alunoId, filialId, agora);

    // Filtro de horário (pós-query, pois horário está em string HH:MM)
    const horarioAtual = horarioBRT(agora);
    const minutosAtual = toMinutos(horarioAtual);

    return autorizacoes.filter((auth) => {
      if (!auth.horarioInicio || !auth.horarioFim) return true; // sem restrição de horário
      return minutosAtual >= toMinutos(auth.horarioInicio) && minutosAtual <= toMinutos(auth.horarioFim);
    });
  }

  async validarCpf(filialId: string, data: ValidarCpfInput) {
    const cpfFormatado = formatarCPF(data.cpf);
    const agora = new Date();
    const auth = await this.repo.findAutorizacaoPorCpf(data.alunoId, filialId, cpfFormatado, agora);

    if (!auth) {
      return { valido: false, mensagem: 'CPF não encontrado nas autorizações ativas' };
    }

    // Verificar restrição de horário
    if (auth.horarioInicio && auth.horarioFim) {
      const minutosAtual = toMinutos(horarioBRT(agora));
      if (minutosAtual < toMinutos(auth.horarioInicio) || minutosAtual > toMinutos(auth.horarioFim)) {
        return {
          valido: false,
          mensagem: `Fora do horário permitido (${auth.horarioInicio}–${auth.horarioFim})`,
        };
      }
    }

    return {
      valido: true,
      autorizacao: {
        id: auth.id,
        nome: auth.nome,
        cpf: auth.cpf,
        relacao: auth.relacao,
        tipo: auth.tipo,
      },
    };
  }

  async confirmarRetirada(filialId: string, data: ConfirmarRetiradaInput) {
    const agora = new Date();

    // Busca e valida a autorização pelo ID
    const auth = await this.repo.findById(data.autorizacaoId);
    if (!auth || auth.filialId !== filialId || auth.alunoId !== data.alunoId || !auth.ativo) {
      throw new ValidationError('Autorização inválida.');
    }

    // Para temporárias, confirma que ainda está dentro do período
    if (auth.tipo === 'TEMPORARIA') {
      const inicioDoDia = this.repo.inicioDoDiaBRT(agora);
      if (auth.dataFim && auth.dataFim < inicioDoDia) {
        throw new ValidationError('Autorização temporária expirada.');
      }
      if (auth.dataInicio && auth.dataInicio > agora) {
        throw new ValidationError('Autorização temporária ainda não vigente.');
      }
    }

    // Verifica restrição de horário (se configurada)
    if (auth.horarioInicio && auth.horarioFim) {
      const minutosAtual = toMinutos(horarioBRT(agora));
      if (minutosAtual < toMinutos(auth.horarioInicio) || minutosAtual > toMinutos(auth.horarioFim)) {
        throw new ValidationError(`Fora do horário permitido (${auth.horarioInicio}–${auth.horarioFim})`);
      }
    }

    return this.repo.createRegistro({
      alunoId: data.alunoId,
      filialId,
      autorizacaoId: auth.id,
      nomeAutorizado: auth.nome,
      cpfAutorizado: auth.cpf,
      tipoAutorizacao: auth.tipo,
    });
  }
}
