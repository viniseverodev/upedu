'use client';

import type { ToastState } from '@/hooks/useToast';

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-3.5 shadow-2xl dark:border-emerald-800 dark:bg-[#0c0e14]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-900 dark:text-slate-100">{toast.title}</p>
        {toast.sub && <p className="text-xs text-stone-500 dark:text-slate-400">{toast.sub}</p>}
      </div>
      <button
        onClick={onClose}
        className="ml-2 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-slate-500 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
