// 404 — App Router not-found page

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 text-center dark:bg-[#080b10]">
      <div className="card max-w-md px-12 py-14">
        <p className="text-7xl font-black text-brand-600 dark:text-brand-400">404</p>
        <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-slate-100">Página não encontrada</h1>
        <p className="mt-2 text-sm text-stone-400 dark:text-slate-500">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link href="/kpis" className="btn-primary mt-6 inline-flex">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
