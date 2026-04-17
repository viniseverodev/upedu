// Perfil do responsável — S018 (Sprint 5)
// Exibe CPF mascarado + botão "Revelar CPF" (ADMIN+)

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';

interface ResponsavelProfile {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  email: string | null;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function ResponsavelPerfilPage() {
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [cpfRevelado, setCpfRevelado] = useState<string | null>(null);
  const [revelarError, setRevelarError] = useState<string | null>(null);

  const { data: responsavel, isLoading } = useQuery<ResponsavelProfile>({
    queryKey: ['responsavel', id],
    queryFn: () => api.get(`/responsaveis/${id}`).then((r) => r.data),
  });

  const revelarMutation = useMutation({
    mutationFn: () => api.get(`/responsaveis/${id}/revelar-cpf`).then((r) => r.data),
    onSuccess: (data: { cpf: string }) => {
      setCpfRevelado(data.cpf);
      setRevelarError(null);
      setTimeout(() => setCpfRevelado(null), 30_000);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setRevelarError(error.response?.data?.message ?? 'Sem permissão para revelar CPF.');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!responsavel) {
    return (
      <div className="empty-state mt-12">
        <p className="text-sm text-gray-400 dark:text-slate-500">Responsável não encontrado.</p>
      </div>
    );
  }

  const initials = responsavel.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">{responsavel.nome}</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">Perfil do responsável</p>
        </div>
        <Link href={`/responsaveis`} className="btn-ghost text-sm">Voltar</Link>
      </div>

      {/* Avatar card */}
      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-slate-100">{responsavel.nome}</p>
          {responsavel.email && <p className="text-sm text-gray-500 dark:text-slate-400">{responsavel.email}</p>}
          {responsavel.telefone && <p className="text-sm text-gray-500 dark:text-slate-400">{responsavel.telefone}</p>}
        </div>
      </div>

      <div className="card px-6 py-2">
        {/* CPF com máscara + botão revelar */}
        <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-slate-800">
          <span className="text-sm text-gray-500 dark:text-slate-400">CPF</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-slate-100">
              {cpfRevelado ?? responsavel.cpf ?? '—'}
            </span>
            {responsavel.cpf && !cpfRevelado && (
              <button
                onClick={() => revelarMutation.mutate()}
                disabled={revelarMutation.isPending}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
              >
                {revelarMutation.isPending ? 'Aguarde…' : 'Revelar'}
              </button>
            )}
            {cpfRevelado && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">Oculta em 30s</span>
            )}
          </div>
        </div>

        {revelarError && (
          <p className="py-2 text-xs text-crimson-500">{revelarError}</p>
        )}

        {responsavel.rg && <InfoRow label="RG" value={responsavel.rg} />}
        {responsavel.telefone && <InfoRow label="Telefone" value={responsavel.telefone} />}
        {responsavel.email && <InfoRow label="Email" value={responsavel.email} />}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-slate-600">
        Dados sensíveis protegidos por AES-256-GCM — LGPD Art. 46
      </p>
    </div>
  );
}
