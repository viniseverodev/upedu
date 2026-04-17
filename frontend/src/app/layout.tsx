// Root layout — Next.js App Router
// Script inline evita flash de tema incorreto (FOUC) ao carregar com dark mode ativo

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UpEdu — Gestão Escolar',
  description: 'Sistema de gestão para escolas de reforço',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Previne FOUC: aplica classe 'dark' antes da hidratação do React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = localStorage.getItem('upedu-theme');
                var t = s ? JSON.parse(s) : null;
                if (t && t.state && t.state.theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
