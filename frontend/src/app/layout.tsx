// Root layout — Next.js App Router
// Providers: TanStack Query, fontes, globals.css
// force-dynamic: app usa autenticação — nenhuma página pode ser pré-gerada estaticamente

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

// Propaga para todas as páginas filhas — evita static generation que quebra
// o error boundary interno do Next.js antes do App Router context estar montado
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UpEdu — Gestão Escolar',
  description: 'Sistema de gestão para escolas de reforço',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
