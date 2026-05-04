'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ---------- Interfaces ----------

interface AlunoResumo {
  id: string;
  nome: string;
  turno: string;
}

interface Autorizacao {
  id: string;
  nome: string;
  cpf: string;
  relacao: string | null;
  tipo: 'PERMANENTE' | 'TEMPORARIA';
  dataInicio: string | null;
  dataFim: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
}

type TurnoFiltro = 'TODOS' | 'MANHA' | 'TARDE';

// ---------- Helpers ----------

function initiais(nome: string) {
  return nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function fmtData(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const TURNO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde' };

// ---------- Card de pessoa autorizada ----------

function AuthCard({ auth }: { auth: Autorizacao }) {
  const isPermanente = auth.tipo === 'PERMANENTE';

  return (
    <div className={[
      'overflow-hidden rounded-2xl bg-white',
      'shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_20px_rgba(0,0,0,0.04)]',
      'ring-1',
      isPermanente
        ? 'ring-stone-900/[0.05] dark:ring-white/[0.07]'
        : 'ring-amber-300/40 dark:ring-amber-400/10',
      'dark:bg-slate-800/60 dark:shadow-none',
    ].join(' ')}>

      {/* ── Identidade ── */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3.5">
        <div className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
          isPermanente
            ? 'bg-brand-600 text-white'
            : 'bg-amber-500 text-white',
        ].join(' ')}>
          {initiais(auth.nome)}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[15px] font-bold leading-snug text-stone-900 dark:text-slate-50">
            {auth.nome}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {auth.relacao && (
              <>
                <span className="text-sm text-stone-500 dark:text-slate-400">{auth.relacao}</span>
                <span className="text-stone-300 dark:text-slate-600">·</span>
              </>
            )}
            <span className={[
              'text-xs font-semibold',
              isPermanente ? 'text-brand-600 dark:text-brand-400' : 'text-amber-600 dark:text-amber-400',
            ].join(' ')}>
              {isPermanente ? 'Permanente' : 'Temporária'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Área de verificação (CPF) ── */}
      <div className={[
        'px-5 py-4 border-t',
        isPermanente
          ? 'border-stone-100 bg-stone-50/80 dark:border-white/[0.05] dark:bg-slate-900/50'
          : 'border-amber-100/60 bg-amber-50/50 dark:border-amber-400/10 dark:bg-amber-950/20',
      ].join(' ')}>
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-slate-500">
          CPF para verificação
        </p>
        <p className="font-mono text-[22px] font-bold leading-none tracking-wider text-stone-900 dark:text-white">
          {auth.cpf}
        </p>

        {/* Metadados adicionais */}
        {(auth.horarioInicio || (!isPermanente && auth.dataFim)) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {!isPermanente && auth.dataFim && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700/90 dark:text-amber-400/80">
                <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3 shrink-0">
                  <path d="M3.5 1a.5.5 0 0 1 1 0v.5h3V1a.5.5 0 0 1 1 0v.5H9A1.5 1.5 0 0 1 10.5 3v6A1.5 1.5 0 0 1 9 10.5H3A1.5 1.5 0 0 1 1.5 9V3A1.5 1.5 0 0 1 3 1.5h.5V1zM3 3a.5.5 0 0 0-.5.5v.5h7V3.5A.5.5 0 0 0 9 3H3zm-.5 2.5V9a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V5.5h-7z" />
                </svg>
                Válido até {fmtData(auth.dataFim)}
              </span>
            )}
            {auth.horarioInicio && auth.horarioFim && (
              <span className={[
                'flex items-center gap-1.5 text-[11px] font-medium',
                isPermanente
                  ? 'text-stone-400 dark:text-slate-500'
                  : 'text-amber-700/90 dark:text-amber-400/80',
              ].join(' ')}>
                <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3 shrink-0">
                  <path fillRule="evenodd" d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm.5 2.5a.5.5 0 0 0-1 0V6c0 .15.068.294.184.39l1.5 1.25a.5.5 0 1 0 .632-.78L6.5 5.704V3.5z" clipRule="evenodd" />
                </svg>
                {auth.horarioInicio} – {auth.horarioFim}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Página ----------

export default function RetiradasPage() {
  const [search, setSearch] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState<TurnoFiltro>('TODOS');
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoResumo | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: alunos = [], isFetching } = useQuery<AlunoResumo[]>({
    queryKey: ['retiradas-busca', search],
    queryFn: () =>
      api.get(`/retiradas/buscar?nome=${encodeURIComponent(search)}`).then((r) => r.data),
    staleTime: 15_000,
  });

  const alunosFiltrados =
    turnoFiltro === 'TODOS' ? alunos : alunos.filter((a) => a.turno === turnoFiltro);

  const { data: autorizacoes = [], isLoading: loadingAuth } = useQuery<Autorizacao[]>({
    queryKey: ['autorizacoes-validas', alunoSelecionado?.id],
    queryFn: () =>
      api.get(`/retiradas/autorizacoes-validas?alunoId=${alunoSelecionado!.id}`).then((r) => r.data),
    enabled: !!alunoSelecionado,
    staleTime: 0,
  });

  function selecionarAluno(aluno: AlunoResumo) {
    setAlunoSelecionado(aluno);
  }

  function reiniciar() {
    setAlunoSelecionado(null);
    setTimeout(() => searchRef.current?.focus(), 80);
  }

  const painelVisivel = !!alunoSelecionado;

  // Separar permanentes e temporárias
  const permanentes = autorizacoes.filter((a) => a.tipo === 'PERMANENTE');
  const temporarias = autorizacoes.filter((a) => a.tipo === 'TEMPORARIA');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header mb-4 shrink-0">
        <div>
          <h1 className="page-title">Retirada de Alunos</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            Consulte quem está autorizado a retirar cada aluno
          </p>
        </div>
        {painelVisivel && (
          <button onClick={reiniciar} className="btn-secondary text-sm lg:hidden">
            ← Lista
          </button>
        )}
      </div>

      {/* Split layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#0c0e14]">

        {/* ── Lista de alunos ── */}
        <div className={[
          'flex flex-col border-r border-stone-200 dark:border-slate-800',
          'w-full lg:w-72 xl:w-80 shrink-0',
          painelVisivel ? 'hidden lg:flex' : 'flex',
        ].join(' ')}>

          {/* Busca + filtro */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-stone-100 dark:border-slate-800">
            <div className="relative">
              <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-slate-500">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar aluno…"
                className="input-base pl-9 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-slate-300"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex gap-1.5">
              {(['TODOS', 'MANHA', 'TARDE'] as TurnoFiltro[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTurnoFiltro(t)}
                  className={[
                    'flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
                    turnoFiltro === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                  ].join(' ')}
                >
                  {t === 'TODOS' ? 'Todos' : t === 'MANHA' ? 'Manhã' : 'Tarde'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {isFetching ? (
              <div className="p-3 space-y-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-[52px] rounded-xl" />
                ))}
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <p className="text-sm text-stone-400 dark:text-slate-600">
                  {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                </p>
              </div>
            ) : (
              <ul className="p-2 space-y-0.5">
                {alunosFiltrados.map((aluno) => {
                  const ativo = alunoSelecionado?.id === aluno.id;
                  return (
                    <li key={aluno.id}>
                      <button
                        onClick={() => selecionarAluno(aluno)}
                        className={[
                          'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                          ativo
                            ? 'bg-brand-600'
                            : 'hover:bg-stone-100 dark:hover:bg-slate-800/60',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                            ativo
                              ? 'bg-white/20 text-white'
                              : 'bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400',
                          ].join(' ')}>
                            {initiais(aluno.nome)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={[
                              'text-sm font-semibold truncate leading-tight',
                              ativo ? 'text-white' : 'text-stone-800 dark:text-slate-200',
                            ].join(' ')}>
                              {aluno.nome}
                            </p>
                            <p className={[
                              'text-xs mt-0.5',
                              ativo ? 'text-white/70' : 'text-stone-400 dark:text-slate-500',
                            ].join(' ')}>
                              {TURNO_LABEL[aluno.turno] ?? aluno.turno}
                            </p>
                          </div>
                          {ativo && (
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-white/80">
                              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!isFetching && alunosFiltrados.length > 0 && (
            <div className="px-4 py-2.5 border-t border-stone-100 dark:border-slate-800">
              <p className="text-xs text-stone-400 dark:text-slate-600">
                {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* ── Painel direito ── */}
        <div className={[
          'flex-1 flex flex-col overflow-hidden',
          painelVisivel ? 'flex' : 'hidden lg:flex',
        ].join(' ')}>

          {/* Vazio */}
          {!alunoSelecionado && (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-10">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-stone-100 dark:bg-slate-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-stone-400 dark:text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-stone-600 dark:text-slate-300">
                Selecione um aluno
              </p>
              <p className="mt-1.5 text-sm text-stone-400 dark:text-slate-500 max-w-xs leading-relaxed">
                Escolha um aluno na lista para ver as pessoas autorizadas a buscá-lo
              </p>
            </div>
          )}

          {/* Aluno selecionado */}
          {alunoSelecionado && (
            <div className="flex flex-col flex-1 min-h-0">

              {/* Cabeçalho */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-[#0c0e14] shrink-0">
                <button
                  onClick={reiniciar}
                  className="lg:hidden -ml-1 flex items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-slate-800"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                  {initiais(alunoSelecionado.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-800 dark:text-slate-200 truncate">
                    {alunoSelecionado.nome}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-slate-500">
                    {TURNO_LABEL[alunoSelecionado.turno] ?? alunoSelecionado.turno}
                  </p>
                </div>
                {!loadingAuth && autorizacoes.length > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {autorizacoes.length} autorizado{autorizacoes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-stone-50/50 dark:bg-slate-900/20">
                {loadingAuth ? (
                  <div className="space-y-3 max-w-2xl">
                    {[1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
                  </div>
                ) : autorizacoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-slate-800">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-stone-400 dark:text-slate-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-stone-500 dark:text-slate-400">
                      Nenhuma autorização ativa
                    </p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-slate-600 max-w-xs leading-relaxed">
                      Este aluno não possui pessoas autorizadas a buscá-lo no momento
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">

                    {/* Permanentes */}
                    {permanentes.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700/60" />
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-slate-500">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                            Permanentes
                          </span>
                          <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700/60" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {permanentes.map((auth) => (
                            <AuthCard key={auth.id} auth={auth} />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Temporárias */}
                    {temporarias.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700/60" />
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-slate-500">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Temporárias
                          </span>
                          <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700/60" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {temporarias.map((auth) => (
                            <AuthCard key={auth.id} auth={auth} />
                          ))}
                        </div>
                      </section>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
