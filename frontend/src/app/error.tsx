'use client';

// 500 / Error boundary — App Router global error handler

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center dark:bg-slate-950">
      <div className="card max-w-md px-12 py-14">
        <p className="text-7xl font-black text-crimson-500 dark:text-crimson-400">500</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-slate-100">Algo deu errado</h1>
        <p className="mt-2 text-sm text-gray-400 dark:text-slate-500">
          Ocorreu um erro inesperado. Se o problema persistir, entre em contato com o suporte.
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
