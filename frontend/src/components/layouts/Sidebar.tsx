'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { useSidebarStore } from '@/stores/sidebarStore';
import api from '@/lib/api';

// ---------- SVG Icons (Heroicons outline 24px) ----------

function IcoDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25zM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25z" />
    </svg>
  );
}

function IcoStudents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}


function IcoMatriculas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IcoCurrency() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function IcoCreditCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
    </svg>
  );
}

function IcoChartBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
    </svg>
  );
}

function IcoExclamation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function IcoBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function IcoUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />
    </svg>
  );
}

function IcoShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IcoLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function IcoMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  );
}

function IcoGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function IcoPerson() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

// ---------- Tipos ----------

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  visible: boolean;
  matchPrefix?: string; // para active check de relatórios (mesma rota, tabs diferentes)
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ---------- Componentes ----------

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
      {label}
    </p>
  );
}

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
        isActive
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SettingsDropdownItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <span className="text-gray-500 dark:text-slate-400">{icon}</span>
      {label}
    </Link>
  );
}

// ---------- Sidebar ----------

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: clearAuth } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const canManageUsers = usePermission('ADMIN_MATRIZ');
  const canManageFiliais = usePermission('ADMIN_MATRIZ');
  const canViewFinanceiro = usePermission('GERENTE_FILIAL');
  const canViewAuditoria = usePermission('ADMIN_MATRIZ');
  const canViewRelatorios = usePermission('GERENTE_FILIAL');

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearAuth();
      router.push('/login');
    },
  });

  const sections: NavSection[] = [
    {
      label: 'Cadastros',
      items: [
        { label: 'Alunos', href: '/alunos', icon: <IcoStudents />, visible: true },
        { label: 'Matrículas', href: '/matriculas', icon: <IcoMatriculas />, visible: true },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { label: 'Mensalidades', href: '/financeiro/mensalidades', icon: <IcoCurrency />, visible: canViewFinanceiro },
        { label: 'Transações', href: '/financeiro/transacoes', icon: <IcoCreditCard />, visible: canViewFinanceiro },
      ],
    },
    {
      label: 'Relatórios',
      items: [
        { label: 'Inadimplência', href: '/relatorios', icon: <IcoExclamation />, visible: canViewRelatorios },
        { label: 'Fluxo de Caixa', href: '/relatorios', icon: <IcoChartBar />, visible: canViewRelatorios },
      ],
    },
  ];

  const initials = user?.nome
    ? user.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'U';

  function isActive(item: NavItem) {
    if (!pathname) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo + Toggle */}
      <div className={`flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-slate-800 ${collapsed ? 'justify-center px-4' : 'justify-between px-5'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002-.34.18a.75.75 0 0 1-.707 0A50.88 50.88 0 0 0 7.5 12.173v-.224c0-.131.067-.248.172-.311a54.615 54.615 0 0 1 4.653-2.52.75.75 0 0 0-.65-1.352 56.123 56.123 0 0 0-4.78 2.589 1.858 1.858 0 0 0-.859 1.228 49.803 49.803 0 0 0-4.634-1.527.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805z" />
                <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.711 47.87 47.87 0 0 0-8.105 4.342.75.75 0 0 1-.832 0 47.87 47.87 0 0 0-8.104-4.342.75.75 0 0 1-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 0 1 6 13.18v1.27a1.5 1.5 0 0 0-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.66a6.727 6.727 0 0 0 .551-1.608 1.5 1.5 0 0 0 .14-2.67v-.645a48.549 48.549 0 0 1 3.44 1.667 2.25 2.25 0 0 0 2.12 0z" />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-slate-100">
              UpEdu
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <IcoMenu />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {/* Dashboard — standalone */}
        <ul className="space-y-0.5">
          <li>
            <NavLink
              item={{ label: 'Dashboard', href: '/kpis', icon: <IcoDashboard />, visible: true }}
              collapsed={collapsed}
              isActive={pathname === '/kpis'}
            />
          </li>
        </ul>

        {/* Seções agrupadas */}
        {sections.map((section) => {
          const visibleItems = section.items.filter((i) => i.visible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              {!collapsed && <SectionLabel label={section.label} />}
              {collapsed && <div className="mt-3" />}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <NavLink item={item} collapsed={collapsed} isActive={isActive(item)} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer: avatar + engrenagem + logout */}
      <div className="shrink-0 border-t border-gray-200 px-3 py-3 dark:border-slate-800">
        {/* Linha de usuário + engrenagem */}
        {!collapsed ? (
          <div className="relative mb-1" ref={settingsRef}>
            <div className="flex items-center gap-2 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-slate-100">{user?.nome}</p>
                <p className="truncate text-[11px] text-gray-400 dark:text-slate-500">
                  {user?.role.replace(/_/g, ' ')}
                </p>
              </div>
              {/* Botão engrenagem */}
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                title="Configurações"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  settingsOpen
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <IcoGear />
              </button>
            </div>

            {/* Dropdown de configurações */}
            {settingsOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-card dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  Configurações
                </p>
                <SettingsDropdownItem
                  href="/perfil"
                  icon={<IcoPerson />}
                  label="Perfil"
                  onClick={() => setSettingsOpen(false)}
                />
                {canManageFiliais && (
                  <SettingsDropdownItem
                    href="/filiais"
                    icon={<IcoBuilding />}
                    label="Filiais"
                    onClick={() => setSettingsOpen(false)}
                  />
                )}
                {canManageUsers && (
                  <SettingsDropdownItem
                    href="/usuarios"
                    icon={<IcoUsers />}
                    label="Usuários"
                    onClick={() => setSettingsOpen(false)}
                  />
                )}
                {canViewAuditoria && (
                  <SettingsDropdownItem
                    href="/auditoria"
                    icon={<IcoShield />}
                    label="Auditoria"
                    onClick={() => setSettingsOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          /* Collapsed: apenas o ícone de engrenagem centralizado */
          <div className="relative mb-1 flex justify-center" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              title="Configurações"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                settingsOpen
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <IcoGear />
            </button>

            {settingsOpen && (
              <div className="absolute bottom-full left-1/2 mb-1 w-44 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-card dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  Configurações
                </p>
                <SettingsDropdownItem href="/perfil" icon={<IcoPerson />} label="Perfil" onClick={() => setSettingsOpen(false)} />
                {canManageFiliais && <SettingsDropdownItem href="/filiais" icon={<IcoBuilding />} label="Filiais" onClick={() => setSettingsOpen(false)} />}
                {canManageUsers && <SettingsDropdownItem href="/usuarios" icon={<IcoUsers />} label="Usuários" onClick={() => setSettingsOpen(false)} />}
                {canViewAuditoria && <SettingsDropdownItem href="/auditoria" icon={<IcoShield />} label="Auditoria" onClick={() => setSettingsOpen(false)} />}
              </div>
            )}
          </div>
        )}

        {/* Sair */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          title={collapsed ? 'Sair' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${collapsed ? 'justify-center' : ''}`}
        >
          <IcoLogout />
          {!collapsed && (
            <span>{logoutMutation.isPending ? 'Saindo…' : 'Sair'}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
