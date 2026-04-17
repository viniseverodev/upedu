// Mensalidades — STORY-022/023

'use client';

export default function MensalidadesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensalidades</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">Controle de mensalidades e pagamentos</p>
        </div>
      </div>
      <div className="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Módulo em desenvolvimento</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">Stories 022/023 — em breve disponível.</p>
      </div>
    </div>
  );
}
