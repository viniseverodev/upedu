'use client';

import type { ToastState } from '@/hooks/useToast';

const variants = {
  success: {
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    title: 'text-stone-900 dark:text-slate-100',
    sub: 'text-stone-500 dark:text-slate-400',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    border: 'border-crimson-200 dark:border-crimson-800',
    icon: 'bg-crimson-100 text-crimson-600 dark:bg-crimson-900/40 dark:text-crimson-400',
    title: 'text-stone-900 dark:text-slate-100',
    sub: 'text-stone-500 dark:text-slate-400',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    border: 'border-yellow-200 dark:border-yellow-700',
    icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
    title: 'text-stone-900 dark:text-slate-100',
    sub: 'text-stone-500 dark:text-slate-400',
    svg: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;

  const v = variants[toast.type ?? 'success'];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-2xl dark:bg-[#0c0e14] ${v.border}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${v.icon}`}>
        {v.svg}
      </div>
      <div>
        <p className={`text-sm font-semibold ${v.title}`}>{toast.title}</p>
        {toast.sub && <p className={`text-xs ${v.sub}`}>{toast.sub}</p>}
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
