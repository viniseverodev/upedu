"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

const editSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(150),
  descricao: z.string().max(500).optional(),
  valor: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .min(0, "Valor não pode ser negativo"),
});

type EditFormData = z.infer<typeof editSchema>;

interface Turma {
  id: string;
  nome: string;
  vagas: number | null;
  horario: string | null;
  ativa: boolean;
  _count: { matriculas: number };
}

interface Oficina {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  ativa: boolean;
  turmas: Turma[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export default function OficinaDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();

  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [confirmRemoveOficina, setConfirmRemoveOficina] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const { data: oficina, isLoading } = useQuery<Oficina>({
    queryKey: ["oficinas", id],
    queryFn: () => api.get(`/oficinas/${id}`).then((r) => r.data),
    staleTime: 0,
  });

  // Toast de turma criada (sinal via sessionStorage vindo da página nova)
  useEffect(() => {
    const msg = sessionStorage.getItem("turma-criada");
    if (msg) {
      sessionStorage.removeItem("turma-criada");
      showToast("Turma criada", msg);
    }
  }, [showToast]);

  function openEdit() {
    if (!oficina) return;
    reset({
      nome: oficina.nome,
      descricao: oficina.descricao ?? "",
      valor: Number(oficina.valor),
    });
    setEditError(null);
    setEditOpen(true);
  }

  const deleteTurmaMutation = useMutation({
    mutationFn: (turmaId: string) =>
      api.delete(`/oficinas/${id}/turmas/${turmaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
      queryClient.invalidateQueries({ queryKey: ["oficinas", id] });
      const nome = confirmDelete?.nome ?? "Turma";
      setConfirmDelete(null);
      showToast("Turma removida", `"${nome}" foi removida com sucesso.`);
    },
    onError: () => {
      showToast("Erro", "Não foi possível remover a turma. Tente novamente.");
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: EditFormData) => api.patch(`/oficinas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oficinas", id] });
      queryClient.invalidateQueries({ queryKey: ["oficinas"] });
      setEditOpen(false);
      showToast(
        "Oficina atualizada",
        "As alterações foram salvas com sucesso.",
      );
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setEditError(
        axiosErr.response?.data?.message ?? "Erro ao salvar alterações.",
      );
    },
  });

  const removeOficinaMutation = useMutation({
    mutationFn: () => api.delete(`/oficinas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
      queryClient.invalidateQueries({ queryKey: ['oficinas', id] });
      router.push('/oficinas');
    },
  });

  const toggleOficinaStatus = useMutation({
    mutationFn: () => api.patch(`/oficinas/${id}`, { ativa: !oficina?.ativa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oficinas'] });
      queryClient.invalidateQueries({ queryKey: ["oficinas", id] });
      const novoStatus = oficina?.ativa ? "desativada" : "ativada";
      showToast(
        `Oficina ${novoStatus}`,
        `A oficina foi ${novoStatus} com sucesso.`,
      );
    },
    onError: () => {
      showToast('Erro', 'Não foi possível alterar o status da oficina. Tente novamente.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-8 w-24" />
          </div>
        </div>
        <div className="skeleton h-5 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-1.5 w-full rounded-full" />
              <div className="skeleton h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!oficina) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/oficinas")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{oficina.nome}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  oficina.ativa
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {oficina.ativa ? "Ativa" : "Inativa"}
              </span>
            </div>
            {oficina.descricao && (
              <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
                {oficina.descricao}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            {formatCurrency(Number(oficina.valor))}
            <span className="text-xs font-normal text-stone-400">/mês</span>
          </span>
          <button onClick={openEdit} className="btn-secondary text-xs">
            Editar
          </button>
          <button
            onClick={() => toggleOficinaStatus.mutate()}
            disabled={toggleOficinaStatus.isPending}
            className="btn-secondary text-xs"
          >
            {oficina.ativa ? "Desativar" : "Ativar"}
          </button>
          <button
            onClick={() => setConfirmRemoveOficina(true)}
            className="flex items-center gap-1.5 rounded-xl border border-crimson-200 px-3 py-1.5 text-xs font-medium text-crimson-600 transition-colors hover:bg-crimson-50 dark:border-crimson-800 dark:text-crimson-400 dark:hover:bg-crimson-900/20"
            title="Remover oficina permanentemente"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
            Remover
          </button>
        </div>
      </div>

      {/* Turmas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-slate-300">
            Turmas{" "}
            <span className="ml-1 text-stone-400">
              ({oficina.turmas.length})
            </span>
          </h2>
          {oficina.ativa && (
            <Link
              href={`/oficinas/${id}/turmas/nova`}
              className="btn-primary text-sm"
            >
              + Nova Turma
            </Link>
          )}
        </div>

        {oficina.turmas.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-14 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mb-3 h-8 w-8 text-stone-300 dark:text-slate-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
              />
            </svg>
            <p className="text-sm text-stone-500 dark:text-slate-500">
              Nenhuma turma criada
            </p>
            {oficina.ativa && (
              <Link
                href={`/oficinas/${id}/turmas/nova`}
                className="btn-primary mt-3 text-sm"
              >
                Criar Turma
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {oficina.turmas.map((turma) => {
              const ocupacao = turma.vagas
                ? Math.min((turma._count.matriculas / turma.vagas) * 100, 100)
                : null;
              const lotada = ocupacao !== null && ocupacao >= 100;

              return (
                <Link
                  key={turma.id}
                  href={`/oficinas/${id}/turmas/${turma.id}`}
                  className="card group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-lg dark:hover:border-brand-600"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 transition-colors group-hover:bg-brand-600/20 dark:bg-brand-600/20 dark:group-hover:bg-brand-600/30">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400">
                          <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
                        </svg>
                      </div>
                      <h3 className="truncate font-semibold text-stone-800 transition-colors group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">
                        {turma.nome}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmDelete({ id: turma.id, nome: turma.nome });
                      }}
                      className="shrink-0 rounded-lg p-1 text-stone-300 transition-all hover:bg-crimson-50 hover:text-crimson-500 dark:text-slate-700 dark:hover:bg-crimson-900/20 dark:hover:text-crimson-400"
                      title="Remover turma"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Infos */}
                  <div className="flex flex-col gap-1 text-xs text-stone-400 dark:text-slate-500">
                    {turma.horario && (
                      <div className="flex items-center gap-1.5">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                        </svg>
                        {turma.horario}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                          <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
                        </svg>
                        <span>
                          <span className="font-medium text-stone-600 dark:text-slate-400">{turma._count.matriculas}</span>
                          {turma.vagas ? ` / ${turma.vagas} vagas` : ' alunos'}
                        </span>
                      </div>
                      {lotada && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Lotada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de ocupação */}
                  {turma.vagas && (
                    <div className="h-1.5 rounded-full bg-stone-100 dark:bg-slate-800">
                      <div
                        className={`h-1.5 rounded-full transition-all ${lotada ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${ocupacao}%` }}
                      />
                    </div>
                  )}

                  {/* Rodapé */}
                  <div className="mt-auto flex items-center justify-end gap-1 text-xs font-medium text-stone-400 transition-colors group-hover:text-brand-600 dark:text-slate-600 dark:group-hover:text-brand-400">
                    Ver alunos
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal editar oficina */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6 shadow-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800 dark:text-slate-200">
                Editar oficina
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) => editMutation.mutate(data))}
              noValidate
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Nome da oficina
                  <span className="ml-0.5 text-crimson-500">*</span>
                </label>
                <input
                  {...register("nome")}
                  autoFocus
                  placeholder="Ex: Oficina de Inglês"
                  className={`input-base ${errors.nome ? "input-error" : ""}`}
                />
                {errors.nome && (
                  <p className="mt-1 text-xs text-crimson-500">
                    {errors.nome.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Descrição
                </label>
                <textarea
                  {...register("descricao")}
                  rows={3}
                  placeholder="Breve descrição da oficina (opcional)"
                  className="input-base resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Valor mensal (R$)
                  <span className="ml-0.5 text-crimson-500">*</span>
                </label>
                <input
                  {...register("valor")}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  className={`input-base ${errors.valor ? "input-error" : ""}`}
                />
                {errors.valor && (
                  <p className="mt-1 text-xs text-crimson-500">
                    {errors.valor.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">
                  Alteração de valor não afeta mensalidades já geradas.
                </p>
              </div>

              {editError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="btn-primary min-w-28"
                >
                  {editMutation.isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirm delete turma */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-card-lg">
            <h2 className="text-base font-semibold text-stone-800 dark:text-slate-200">
              Remover turma?
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
              A turma{" "}
              <span className="font-semibold text-stone-800 dark:text-slate-200">
                &quot;{confirmDelete.nome}&quot;
              </span>{" "}
              será desativada. As matrículas existentes são mantidas.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteTurmaMutation.mutate(confirmDelete.id)}
                disabled={deleteTurmaMutation.isPending}
                className="rounded-xl bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700 disabled:opacity-50"
              >
                {deleteTurmaMutation.isPending ? "Removendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal remover oficina */}
      {confirmRemoveOficina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-card-lg">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-100 dark:bg-crimson-900/30">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-crimson-600 dark:text-crimson-400">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-stone-800 dark:text-slate-200">
              Remover &quot;{oficina.nome}&quot;?
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
              Esta ação é <span className="font-semibold text-stone-700 dark:text-slate-300">permanente e irreversível</span>. Serão removidos:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-stone-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 shrink-0" />
                Todas as turmas e matrículas
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 shrink-0" />
                Mensalidades pendentes serão canceladas
              </li>
            </ul>
            {removeOficinaMutation.isError && (
              <p className="mt-3 text-xs text-crimson-500">
                Erro ao remover a oficina. Tente novamente.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemoveOficina(false)}
                className="btn-secondary"
                disabled={removeOficinaMutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={() => removeOficinaMutation.mutate()}
                disabled={removeOficinaMutation.isPending}
                className="rounded-xl bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700 disabled:opacity-50"
              >
                {removeOficinaMutation.isPending ? "Removendo…" : "Remover permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
