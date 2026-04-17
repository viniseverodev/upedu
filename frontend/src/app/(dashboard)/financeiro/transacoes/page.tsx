// Transações financeiras — S027

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createTransacaoSchema, createCategoriaSchema, type CreateTransacaoInput, type CreateCategoriaInput } from '@/schemas/index';

interface Categoria { id: string; nome: string; tipo: string }
interface Transacao {
  id: string; tipo: string; descricao: string; valor: number;
  dataTransacao: string; categoria: { nome: string; tipo: string };
}

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TransacoesPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: transacoes = [], isLoading } = useQuery<Transacao[]>({
    queryKey: ['transacoes', mes, ano],
    queryFn: () => api.get(`/transacoes?mes=${mes}&ano=${ano}`).then((r) => r.data),
  });

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTransacaoInput>({
    resolver: zodResolver(createTransacaoSchema),
    defaultValues: { dataTransacao: now.toISOString().split('T')[0] },
  });

  const transacaoMutation = useMutation({
    mutationFn: (data: CreateTransacaoInput) => api.post('/transacoes', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transacoes'] }); setShowTransacaoModal(false); reset(); setServerError(null); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao registrar transação.'); },
  });

  const { register: registerCat, handleSubmit: handleCat, reset: resetCat, formState: { errors: errorsCat } } = useForm<CreateCategoriaInput>({ resolver: zodResolver(createCategoriaSchema) });

  const categoriaMutation = useMutation({
    mutationFn: (data: CreateCategoriaInput) => api.post('/categorias', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); setShowCategoriaModal(false); resetCat(); },
  });

  const totalEntradas = transacoes.filter((t) => t.tipo === 'ENTRADA').reduce((s, t) => s + t.valor, 0);
  const totalSaidas = transacoes.filter((t) => t.tipo === 'SAIDA').reduce((s, t) => s + t.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">{MESES[mes]}/{ano}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="input-base w-24 py-2 text-xs">
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} min={2020} max={2099} className="input-base w-24 py-2 text-xs" />
          <button onClick={() => setShowCategoriaModal(true)} className="btn-secondary py-2 text-xs">Categorias</button>
          <button onClick={() => { setShowTransacaoModal(true); setServerError(null); }} className="btn-primary py-2 text-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>
            Nova Transação
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 dark:text-forest-300">Entradas</p>
          <p className="mt-2 text-xl font-bold text-forest-500 dark:text-forest-300">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-crimson-500 dark:text-crimson-300">Saídas</p>
          <p className="mt-2 text-xl font-bold text-crimson-500 dark:text-crimson-300">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className={`text-xs font-semibold uppercase tracking-wide ${saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>Saldo</p>
          <p className={`mt-2 text-xl font-bold ${saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? <div className="skeleton h-64" /> :
       transacoes.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm text-gray-400 dark:text-slate-500">Nenhuma transação em {MESES[mes]}/{ano}.</p>
        </div>
       ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Data</th>
                <th className="table-th">Descrição</th>
                <th className="table-th">Categoria</th>
                <th className="table-th text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="table-td text-xs">{formatDate(t.dataTransacao)}</td>
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">{t.descricao}</td>
                  <td className="table-td">
                    <span className={t.categoria.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}>
                      {t.categoria.nome}
                    </span>
                  </td>
                  <td className={`table-td text-right font-semibold ${t.tipo === 'ENTRADA' ? 'text-forest-500 dark:text-forest-300' : 'text-crimson-500 dark:text-crimson-300'}`}>
                    {t.tipo === 'ENTRADA' ? '+' : '−'}{formatCurrency(t.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )}

      {/* Modal Nova Transação */}
      {showTransacaoModal && (
        <Modal title="Nova Transação" onClose={() => { setShowTransacaoModal(false); reset(); setServerError(null); }}>
          <form onSubmit={handleSubmit((d) => { setServerError(null); transacaoMutation.mutate(d); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Tipo</label>
              <select {...register('tipo')} className={`input-base ${errors.tipo ? 'input-error' : ''}`}>
                <option value="ENTRADA">Entrada (Receita)</option>
                <option value="SAIDA">Saída (Despesa)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Categoria</label>
              <select {...register('categoriaId')} className={`input-base ${errors.categoriaId ? 'input-error' : ''}`}>
                <option value="">Selecione…</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
              {errors.categoriaId && <p className="mt-1 text-xs text-crimson-500">{errors.categoriaId.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Descrição</label>
              <input {...register('descricao')} className={`input-base ${errors.descricao ? 'input-error' : ''}`} />
              {errors.descricao && <p className="mt-1 text-xs text-crimson-500">{errors.descricao.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" {...register('valor', { valueAsNumber: true })} className={`input-base ${errors.valor ? 'input-error' : ''}`} />
                {errors.valor && <p className="mt-1 text-xs text-crimson-500">{errors.valor.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Data</label>
                <input type="date" {...register('dataTransacao')} className="input-base" />
              </div>
            </div>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={transacaoMutation.isPending} className="btn-primary flex-1">
                {transacaoMutation.isPending ? 'Salvando…' : 'Registrar'}
              </button>
              <button type="button" onClick={() => { setShowTransacaoModal(false); reset(); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nova Categoria */}
      {showCategoriaModal && (
        <Modal title="Gerenciar Categorias" onClose={() => { setShowCategoriaModal(false); resetCat(); }}>
          <form onSubmit={handleCat((d) => categoriaMutation.mutate(d))} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Nome</label>
              <input {...registerCat('nome')} className={`input-base ${errorsCat.nome ? 'input-error' : ''}`} />
              {errorsCat.nome && <p className="mt-1 text-xs text-crimson-500">{errorsCat.nome.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Tipo</label>
              <select {...registerCat('tipo')} className="input-base">
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={categoriaMutation.isPending} className="btn-primary flex-1">
                {categoriaMutation.isPending ? 'Criando…' : 'Criar Categoria'}
              </button>
              <button type="button" onClick={() => { setShowCategoriaModal(false); resetCat(); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
          {categorias.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Categorias existentes</p>
              <div className="space-y-1.5">
                {categorias.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-300">{c.nome}</span>
                    <span className={c.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}>{c.tipo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
