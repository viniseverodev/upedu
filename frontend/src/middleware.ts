// Next.js middleware — proteção de rotas server-side
// Redireciona para /login se não autenticado
// Redireciona para /primeiro-acesso se requiresPasswordChange

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/primeiro-acesso'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // TODO: verificar cookie de sessão ou token para redirecionar
  // Implementar em STORY-005 (Sprint 2)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
