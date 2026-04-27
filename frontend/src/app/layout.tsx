// Root layout — Next.js App Router
// Script inline evita flash de tema incorreto (FOUC) ao carregar com dark mode ativo

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Onest } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const onest = Onest({
  subsets: ['latin'],
  variable: '--font-onest',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'UpEdu — Gestão Escolar',
  description: 'Sistema de gestão para escolas de reforço',
  icons: {
    icon: [
      { url: '/03-dark.png', media: '(prefers-color-scheme: dark)' },
      { url: '/06-light.png', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/06-light.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={onest.variable} suppressHydrationWarning>
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
