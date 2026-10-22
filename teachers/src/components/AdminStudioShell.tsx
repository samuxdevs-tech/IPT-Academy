'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import SafeNavLink from '@/components/SafeNavLink';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserProfileMenu from '@/components/UserProfileMenu';
import CommandPaletteModal from '@/components/CommandPaletteModal';
import {
  BookOpen,
  FileCheck2,
  Calendar,
  Users,
  ShieldCheck,
  Sparkles,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  GraduationCap,
  Home,
  Menu,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPath: string;
  badge?: string;
}

const PRIMARY_STUDIO_NAV: NavItem[] = [
  {
    id: 'nav-courses',
    label: 'Cursos & Contenido',
    sublabel: 'Gestor y editor híbrido',
    href: '/?view=courses',
    icon: BookOpen,
    matchPath: '/?view=courses',
  },
  {
    id: 'nav-assignments',
    label: 'Tareas & Calificaciones',
    sublabel: 'Bandeja y Focus Grader',
    href: '/assignments',
    icon: FileCheck2,
    matchPath: '/assignments',
  },
  {
    id: 'nav-students',
    label: 'Estudiantes & Cohortes',
    sublabel: 'Monitor en vivo y radar',
    href: '/analytics',
    icon: Users,
    matchPath: '/analytics',
  },
  {
    id: 'nav-calendar',
    label: 'Calendario & Sesiones',
    sublabel: 'Fechas y reuniones en vivo',
    href: '/calendar',
    icon: Calendar,
    matchPath: '/calendar',
  },
];

const SECONDARY_SYSTEM_NAV: NavItem[] = [
  {
    id: 'nav-roles',
    label: 'Seguridad & Roles RBAC',
    sublabel: 'Niveles de acceso y permisos',
    href: '/roles',
    icon: ShieldCheck,
    matchPath: '/roles',
  },
  {
    id: 'nav-metrics',
    label: 'Biblioteca de Parámetros',
    sublabel: 'Fórmulas, escalas y glosario',
    href: '/metrics',
    icon: Sparkles,
    matchPath: '/metrics',
  },
];

function AdminStudioShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');
  const currentStep = searchParams.get('step');
  const { user, userRole } = useAuth();
  const effectiveRole = user?.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2' ? 'owner' : userRole;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Escuchar atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.href.includes('?view=courses')) {
      return pathname === '/' && (currentView === 'courses' || !!currentStep);
    }
    return pathname.startsWith(item.matchPath);
  };

  const getBreadcrumbTitle = () => {
    if (pathname === '/') {
      if (currentView === 'courses' || currentStep) {
        return { section: 'Estudio de Formación', title: 'Gestor y Editor de Cursos' };
      }
      return { section: 'Centro de Control', title: 'Visión General' };
    }
    if (pathname.startsWith('/assignments')) {
      return { section: 'Evaluación Académica', title: 'Gestor de Tareas y Calificaciones' };
    }
    if (pathname.startsWith('/calendar')) {
      return { section: 'Planificación', title: 'Calendario y Sesiones en Vivo' };
    }
    if (pathname.startsWith('/analytics')) {
      return { section: 'Estudiantes', title: 'Monitoreo, Cohortes y Graduados' };
    }
    if (pathname.startsWith('/roles')) {
      return { section: 'Seguridad', title: 'Matriz de Permisos y Roles (RBAC)' };
    }
    if (pathname.startsWith('/metrics')) {
      return { section: 'Biblioteca', title: 'Parámetros, Fórmulas y Criterios' };
    }
    return { section: 'IPT Course Studio', title: 'Panel de Administración' };
  };

  const breadcrumb = getBreadcrumbTitle();

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex font-sans text-[#1d1d1f] antialiased selection:bg-[#0071e3] selection:text-white">
      {/* Modal Buscador Universal (Cmd + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Backdrop para menú móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR ESTILO APPLE MACOS (Suave, translúcido y limpio) */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 bg-[#fbfbfd]/95 backdrop-blur-md border-r border-[#e5e5ea] flex flex-col transition-all duration-200 shrink-0 select-none ${
          sidebarCollapsed ? 'w-20' : 'w-68'
        } ${
          mobileMenuOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div className="h-16 px-4 border-b border-[#e5e5ea] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e5e5ea] p-1 flex items-center justify-center shrink-0 shadow-2xs">
              <Image
                src="/favicon.png"
                alt="IPT Course"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight text-[#1d1d1f] truncate">
                    IPT Course Studio
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[9px] font-bold uppercase">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-[#8e8e93] truncate">Ivan Perez Tech</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]/50 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador Rápido en Sidebar */}
        {!sidebarCollapsed && (
          <div className="p-3 pb-1">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-[#e5e5ea] text-xs text-[#8e8e93] hover:border-[#0071e3]/40 hover:text-[#1d1d1f] shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Buscar módulo...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-[#f5f5f7] border border-[#d1d1d6] text-[9px] font-mono font-semibold">
                Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        {/* Elementos de Navegación por Secciones */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          {/* Módulos Principales */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#8e8e93] mb-1">
                Operación Principal
              </p>
            )}
            {PRIMARY_STUDIO_NAV.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <SafeNavLink
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#0071e3] shadow-2xs border border-[#e5e5ea] font-bold'
                      : 'text-[#515154] hover:text-[#1d1d1f] hover:bg-neutral-200/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0071e3]' : 'text-[#8e8e93]'}`} />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1 truncate">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] font-normal text-[#8e8e93] truncate">{item.sublabel}</div>
                    </div>
                  )}
                </SafeNavLink>
              );
            })}
          </div>

          {/* Sistema & Biblioteca */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#8e8e93] mb-1">
                Control & Biblioteca
              </p>
            )}
            {SECONDARY_SYSTEM_NAV.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <SafeNavLink
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#0071e3] shadow-2xs border border-[#e5e5ea] font-bold'
                      : 'text-[#515154] hover:text-[#1d1d1f] hover:bg-neutral-200/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0071e3]' : 'text-[#8e8e93]'}`} />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1 truncate">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] font-normal text-[#8e8e93] truncate">{item.sublabel}</div>
                    </div>
                  )}
                </SafeNavLink>
              );
            })}
          </div>
        </div>

        {/* Footer del Sidebar: Enlace al Portal de Estudiantes */}
        <div className="p-3 border-t border-[#e5e5ea] bg-white">
          <a
            href="https://ipt-course.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] transition-colors"
            title="Abrir el Portal de Alumnos en una nueva pestaña"
          >
            <div className="flex items-center gap-2.5 truncate">
              <GraduationCap className="w-4 h-4 text-[#0071e3] shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Portal Alumnos</span>}
            </div>
            {!sidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-[#8e8e93] shrink-0" />}
          </a>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER SUPERIOR TRANSLÚCIDO ESTILO APPLE */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-[#e5e5ea] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#515154] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Apple */}
            <div className="flex items-center gap-1.5 text-xs truncate">
              <span className="text-[#8e8e93] hidden sm:inline">{breadcrumb.section}</span>
              <span className="text-[#8e8e93] hidden sm:inline">/</span>
              <span className="text-[#1d1d1f] font-bold truncate">{breadcrumb.title}</span>
            </div>
          </div>

          {/* Controles de la derecha */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] text-xs text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
              <kbd className="px-1 py-0.2 rounded bg-white text-[10px] font-mono border border-[#d1d1d6]">
                Ctrl+K
              </kbd>
            </button>

            {/* Menú de Perfil Docente */}
            <UserProfileMenu />
          </div>
        </header>

        {/* CONTENEDOR DINÁMICO */}
        <main className="flex-1 flex flex-col pb-20 lg:pb-8">{children}</main>

        {/* MOTOR MÓVIL DEDICADO: DOCK INFERIOR FLOTANTE ESTILO IOS */}
        <nav
          aria-label="Navegación móvil inferior"
          className="lg:hidden fixed bottom-3 left-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-[#e5e5ea] rounded-2xl shadow-xl px-2 py-1.5 flex items-center justify-around"
        >
          <SafeNavLink
            href="/"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all min-h-[44px] justify-center ${
              pathname === '/' && !currentView && !currentStep ? 'text-[#0071e3]' : 'text-[#8e8e93]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </SafeNavLink>

          <SafeNavLink
            href="/?view=courses"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all min-h-[44px] justify-center ${
              pathname === '/' && (currentView === 'courses' || !!currentStep)
                ? 'text-[#0071e3]'
                : 'text-[#8e8e93]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cursos</span>
          </SafeNavLink>

          <SafeNavLink
            href="/assignments"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all min-h-[44px] justify-center ${
              pathname.startsWith('/assignments') ? 'text-[#0071e3]' : 'text-[#8e8e93]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Tareas</span>
          </SafeNavLink>

          <SafeNavLink
            href="/analytics"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold transition-all min-h-[44px] justify-center ${
              pathname.startsWith('/analytics') ? 'text-[#0071e3]' : 'text-[#8e8e93]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alumnos</span>
          </SafeNavLink>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold text-[#8e8e93] hover:text-[#1d1d1f] min-h-[44px] justify-center"
          >
            <Menu className="w-4 h-4" />
            <span>Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function AdminStudioShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-xs text-[#8e8e93]">
          Cargando entorno de administración...
        </div>
      }
    >
      <AdminStudioShellInner>{children}</AdminStudioShellInner>
    </Suspense>
  );
}
