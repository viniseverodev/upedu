// Layout do dashboard — sidebar + topbar + main

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/Sidebar';
import { TopBar } from '@/components/layouts/TopBar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-[#080b10]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
