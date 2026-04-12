// Layout do dashboard — sidebar + topbar
// TODO: implementar em STORY-008 (Sprint 2)

import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* <Sidebar /> TODO: STORY-008 */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
