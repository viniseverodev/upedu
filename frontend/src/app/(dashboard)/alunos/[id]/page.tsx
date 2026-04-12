// Perfil completo do aluno — S016 (Sprint 4)
// Tabs: Dados Pessoais | Responsáveis | Financeiro | Histórico

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Responsavel {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface AlunoResponsavel {
  parentesco: string;
  isResponsavelFinanceiro: boolean;
  responsavel: Responsavel;
}

interface Matricula {
  id: string;
  status: string;
  turno: string;
  valorMensalidade: number;
  dataInicio: string;
  dataFim: string | null;
}

interface Mensalidade {
  id: string;
  status: string;
  mesReferencia: number;
  anoReferencia: number;
  valorOriginal: number;
}

interface AlunoProfile {
  id: string;
  nome: string;
  dataNascimento: string;
  status: string;
  turno: string;
  observacoes: string | null;
  consentimentoTimestamp: string | null;
  responsaveis: AlunoResponsavel[];
  matriculas: Matricula[];
  mensalidades: Mensalidade[];
}

const STATUS_LABELS: Record<string, string> = {
  PRE_MATRICULA: 'Pré-Matrícula',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de Espera',
  TRANSFERIDO: 'Transferido',
};

const STATUS_COLORS: Record<string, string> = {
  PRE_MATRICULA: 'bg-blue-100 text-blue-700',
  ATIVO: 'bg-green-100 text-green-700',
  INATIVO: 'bg-gray-100 text-gray-500',
  LISTA_ESPERA: 'bg-yellow-100 text-yellow-700',
  TRANSFERIDO: 'bg-purple-100 text-purple-700',
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type Tab = 'dados' | 'responsaveis' | 'financeiro' | 'historico';

export default function AlunoPerfilPage() {
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('dados');

  const { data: aluno, isLoading } = useQuery<AlunoProfile>({
    queryKey: ['aluno', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados Pessoais' },
    { key: 'responsaveis', label: 'Responsáveis' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'historico', label: 'Histórico' },
  ];

  if (isLoading) {
    return <div className="text-center text-gray-400 py-12">Carregando...</div>;
  }

  if (!aluno) {
    return <div className="text-center text-gray-400 py-12">Aluno não encontrado.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{aluno.nome}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[aluno.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABELS[aluno.status] ?? aluno.status}
            </span>
            <span className="text-sm text-gray-500">
              {aluno.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'}
            </span>
          </div>
        </div>
        <Link
          href={`/alunos/${id}/editar`}
          className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Editar
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Dados Pessoais */}
      {activeTab === 'dados' && (
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <Row label="Nome completo" value={aluno.nome} />
          <Row
            label="Data de nascimento"
            value={new Date(aluno.dataNascimento).toLocaleDateString('pt-BR')}
          />
          <Row label="Turno" value={aluno.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'} />
          {aluno.observacoes && <Row label="Observações" value={aluno.observacoes} />}
          {aluno.consentimentoTimestamp && (
            <Row
              label="Consentimento LGPD"
              value={`Registrado em ${new Date(aluno.consentimentoTimestamp).toLocaleDateString('pt-BR')}`}
            />
          )}
        </div>
      )}

      {/* Tab: Responsáveis */}
      {activeTab === 'responsaveis' && (
        <div className="space-y-3">
          {aluno.responsaveis.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
              Nenhum responsável vinculado.
            </div>
          ) : (
            aluno.responsaveis.map((ar) => (
              <div key={ar.responsavel.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{ar.responsavel.nome}</span>
                  {ar.isResponsavelFinanceiro && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                      Responsável Financeiro
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{ar.parentesco}</p>
                {ar.responsavel.telefone && (
                  <p className="text-sm text-gray-600 mt-1">{ar.responsavel.telefone}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          {aluno.mensalidades.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
              Nenhuma mensalidade registrada.
            </div>
          ) : (
            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Referência</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {aluno.mensalidades.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-gray-700">
                        {MESES[m.mesReferencia - 1]}/{m.anoReferencia}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {Number(m.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                          m.status === 'PAGO' ? 'bg-green-100 text-green-700' :
                          m.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                          m.status === 'INADIMPLENTE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === 'historico' && (
        <div className="space-y-3">
          {aluno.matriculas.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
              Nenhuma matrícula registrada.
            </div>
          ) : (
            aluno.matriculas.map((m) => (
              <div key={m.id} className="rounded-xl bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {m.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'} —{' '}
                    {Number(m.valorMensalidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Início: {new Date(m.dataInicio).toLocaleDateString('pt-BR')}
                    {m.dataFim ? ` · Fim: ${new Date(m.dataFim).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                  m.status === 'ATIVA' ? 'bg-green-100 text-green-700' :
                  m.status === 'ENCERRADA' ? 'bg-gray-100 text-gray-500' :
                  'bg-red-100 text-red-700'
                }`}>
                  {m.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
