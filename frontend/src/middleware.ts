// Next.js middleware — S005: proteção de rotas server-side
// Lê cookies não-httpOnly definidos pelo backend para decidir redirecionamentos:
//   auth-session=1          → usuário está autenticado
//   requires-password-change=1 → S004: redirecionar para /primeiro-acesso

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que não requerem autenticação
const PUBLIC_PATHS = ['/login', '/primeiro-acesso'];

// Rotas de assets e Next.js internals — nunca interceptar
const SKIP_PREFIXES = ['/_next', '/favicon.ico', '/api/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Não interceptar assets e internals do Next.js
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.has('auth-session');
  const requiresPasswordChange = request.cookies.has('requires-password-change');

  // 1. Sem sessão e tentando acessar rota protegida → login
  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Com sessão mas tentando acessar /login → dashboard
  if (hasSession && pathname.startsWith('/login')) {
    const dashboardUrl = new URL(requiresPasswordChange ? '/primeiro-acesso' : '/kpis', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. S004: senha pendente e tentando acessar rota que não é /primeiro-acesso
  if (hasSession && requiresPasswordChange && !pathname.startsWith('/primeiro-acesso')) {
    const pwChangeUrl = new URL('/primeiro-acesso', request.url);
    return NextResponse.redirect(pwChangeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
