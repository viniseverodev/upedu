// Raiz "/" — redireciona para /kpis (ou /login via middleware)
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/kpis');
}
