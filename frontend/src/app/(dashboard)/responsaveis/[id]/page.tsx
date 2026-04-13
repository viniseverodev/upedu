// Perfil do responsável — S018 (Sprint 5)
// Exibe CPF mascarado + botão "Revelar CPF" (ADMIN+)

'use client';

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
      // Auto-ocultar após 30s por segurança
      setTimeout(() => setCpfRevelado(null), 30_000);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setRevelarError(error.response?.data?.message ?? 'Sem permissão para revelar CPF.');
    },
  });

  if (isLoading) {
    return <div className="text-center text-gray-400 py-12">Carregando...</div>;
  }

  if (!responsavel) {
    return <div className="text-center text-gray-400 py-12">Responsável não encontrado.</div>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{responsavel.nome}</h1>
        <p className="mt-1 text-sm text-gray-500">Perfil do responsável</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
        <Row label="Nome" value={responsavel.nome} />

        {/* CPF com máscara + botão revelar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">CPF</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900 font-mono">
              {cpfRevelado ?? responsavel.cpf ?? '—'}
            </span>
            {responsavel.cpf && !cpfRevelado && (
              <button
                onClick={() => revelarMutation.mutate()}
                disabled={revelarMutation.isPending}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {revelarMutation.isPending ? 'Aguarde...' : 'Revelar'}
              </button>
            )}
            {cpfRevelado && (
              <span className="text-xs text-amber-600">Oculta em 30s</span>
            )}
          </div>
        </div>

        {revelarError && (
          <p className="text-xs text-red-600">{revelarError}</p>
        )}

        {responsavel.rg && <Row label="RG" value={responsavel.rg} />}
        {responsavel.telefone && <Row label="Telefone" value={responsavel.telefone} />}
        {responsavel.email && <Row label="Email" value={responsavel.email} />}
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        Dados sensíveis protegidos por AES-256-GCM — LGPD Art. 46
      </div>
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
