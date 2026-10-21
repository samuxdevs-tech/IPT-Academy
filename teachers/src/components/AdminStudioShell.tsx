'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserProfileMenu from '@/components/UserProfileMenu';
import {
  ShieldAlert,
  Layers,
  BookOpen,
  Film,
  ClipboardCheck,
  MousePointerClick,
  Target,
  Sparkles,
  BarChart3,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Menu,
  X,
  GraduationCap,
  Database,
  Calendar,
  FileCheck2,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

const DEFAULT_ADMIN_EMAILS = [
  'ivanpereztech13@gmail.com',
  'admin@ipt.com',
  'ivan@ipt.com',
  'admin@datagan.com',
  'admin@tecnogan.com',
  'soporte@tecnogan.com'
];

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchStep?: string;
  matchPath?: string;
  badge?: string;
}

const CURRICULUM_NAV: NavItem[] = [
  {
    id: 'step-catalog',
    label: '1. Catálogo de Cursos',
    sublabel: 'Portadas, precios y visibilidad',
    href: '/?step=catalog',
    icon: BookOpen,
    matchPath: '/',
    matchStep: 'catalog'
  },
  {
    id: 'step-curriculum',
    label: '2. Estructura de Módulos',
    sublabel: 'Secciones y árbol de clases',
    href: '/?step=curriculum',
    icon: Layers,
    matchPath: '/',
    matchStep: 'curriculum'
  },
  {
    id: 'step-lesson',
    label: '3. Editor de Lección',
    sublabel: 'Videos y descripción de clase',
    href: '/?step=lesson',
    icon: Film,
    matchPath: '/',
    matchStep: 'lesson'
  },
  {
    id: 'step-assessments',
    label: '4. Evaluaciones y Archivos',
    sublabel: 'Preguntas, guías y recursos',
    href: '/?step=assessments',
    icon: ClipboardCheck,
    matchPath: '/',
    matchStep: 'assessments'
  }
];

const ACADEMIC_OPS_NAV: NavItem[] = [
  {
    id: 'nav-assignments-ops',
    label: 'Tareas y Calificaciones',
    sublabel: 'Crear entregas, rúbricas y notas',
    href: '/assignments',
    icon: FileCheck2,
    matchPath: '/assignments'
  },
  {
    id: 'nav-calendar-ops',
    label: 'Calendario y Clases en Vivo',
    sublabel: 'Programar sesiones y fechas',
    href: '/calendar',
    icon: Calendar,
    matchPath: '/calendar'
  }
];

const LABS_NAV: NavItem[] = [
  {
    id: 'nav-scenarios',
    label: 'Escenarios Interactivos',
    sublabel: 'Casos prácticos con imágenes',
    href: '/scenarios',
    icon: MousePointerClick,
    matchPath: '/scenarios'
  },
  {
    id: 'nav-missions',
    label: 'Misiones Prácticas',
    sublabel: 'Ejercicios guiados paso a paso',
    href: '/missions',
    icon: Target,
    matchPath: '/missions'
  }
];

const LEVEL_PANELS_NAV: NavItem[] = [
  {
    id: 'nav-nivel-4',
    label: 'Nivel 4 · Superadmin',
    sublabel: 'Panel Propietario (Máximo)',
    href: '/nivel-4',
    icon: ShieldCheck,
    matchPath: '/nivel-4',
    badge: 'Owner'
  },
  {
    id: 'nav-nivel-3',
    label: 'Nivel 3 · Operador',
    sublabel: 'Panel Licencias y Diplomas',
    href: '/nivel-3',
    icon: ShieldCheck,
    matchPath: '/nivel-3',
    badge: 'Ops'
  },
  {
    id: 'nav-nivel-2',
    label: 'Nivel 2 · Instructor',
    sublabel: 'Panel Clases y Tareas',
    href: '/nivel-2',
    icon: ShieldCheck,
    matchPath: '/nivel-2',
    badge: 'Docente'
  }
];

const KNOWLEDGE_NAV: NavItem[] = [
  {
    id: 'nav-roles',
    label: 'Roles y Licencias de Acceso',
    sublabel: 'Niveles de permisos y accesos',
    href: '/roles',
    icon: ShieldCheck,
    matchPath: '/roles',
    badge: 'Accesos'
  },
  {
    id: 'nav-metrics',
    label: 'Biblioteca de Parámetros',
    sublabel: 'Fórmulas, escalas y glosario',
    href: '/metrics',
    icon: Sparkles,
    matchPath: '/metrics'
  },
  {
    id: 'nav-analytics',
    label: 'Estudiantes y Certificados',
    sublabel: 'Graduados, avance y Habeas Data',
    href: '/analytics',
    icon: BarChart3,
    matchPath: '/analytics'
  }
];

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { user, userRole } = useAuth();
  const effectiveRole = user?.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2' ? 'owner' : userRole;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentStep = searchParams.get('step') || 'catalog';

  const isItemActive = (item: NavItem) => {
    if (item.matchPath === '/') {
      if (pathname !== '/') return false;
      return currentStep === item.matchStep;
    }
    return pathname.startsWith(item.matchPath || '');
  };

  const getBreadcrumbInfo = () => {
    if (pathname === '/') {
      const found = CURRICULUM_NAV.find((i) => i.matchStep === currentStep) || CURRICULUM_NAV[0];
      return {
        group: 'Cursos y Contenido',
        title: found.label,
        subtitle: found.sublabel
      };
    }
    if (pathname.startsWith('/nivel-4')) {
      return {
        group: 'Centro de Mando Máximo',
        title: 'Panel de Nivel 4 · Propietario (Superadministrador)',
        subtitle: 'Control total de roles RBAC, licencias y catálogo'
      };
    }
    if (pathname.startsWith('/nivel-3')) {
      return {
        group: 'Centro de Mando',
        title: 'Panel de Nivel 3 · Operador',
        subtitle: 'Gestión de licencias de cursos y diplomas'
      };
    }
    if (pathname.startsWith('/nivel-2')) {
      return {
        group: 'Centro de Mando',
        title: 'Panel de Nivel 2 · Instructor',
        subtitle: 'Editor de cursos, revisión de tareas y calendario'
      };
    }
    if (pathname.startsWith('/assignments')) {
      return {
        group: 'Operación Académica',
        title: 'Gestor de Tareas, Rúbricas y Calificaciones',
        subtitle: 'Crear entregas, configurar rúbricas y calificar estudiantes'
      };
    }
    if (pathname.startsWith('/calendar')) {
      return {
        group: 'Operación Académica',
        title: 'Programador de Calendario y Clases en Vivo',
        subtitle: 'Publicar fechas, evaluaciones y enlaces de videollamada'
      };
    }
    if (pathname.startsWith('/roles')) {
      return {
        group: 'Seguridad y Permisos',
        title: 'Matriz de Roles y Licencias (RBAC · 4 Niveles)',
        subtitle: 'Estudiante · Instructor · Operador · Propietario'
      };
    }
    if (pathname.startsWith('/scenarios')) {
      return {
        group: 'Prácticas Interactivas',
        title: 'Escenarios Interactivos',
        subtitle: 'Casos prácticos para estudiantes'
      };
    }
    if (pathname.startsWith('/missions')) {
      return {
        group: 'Prácticas Interactivas',
        title: 'Misiones Prácticas',
        subtitle: 'Ejercicios de resolución paso a paso'
      };
    }
    if (pathname.startsWith('/metrics')) {
      return {
        group: 'Biblioteca y Seguimiento',
        title: 'Biblioteca de Parámetros y Conceptos',
        subtitle: 'Fórmulas, escalas y guías de referencia'
      };
    }
    if (pathname.startsWith('/analytics')) {
      return {
        group: 'Biblioteca y Seguimiento',
        title: 'Seguimiento de Estudiantes y Certificados',
        subtitle: 'Avance real, diplomas y auditoría legal'
      };
    }
    return {
      group: 'Administración',
      title: 'IPT Course Studio',
      subtitle: 'Panel de Administración'
    };
  };

  const breadcrumb = getBreadcrumbInfo();

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!sidebarCollapsed && (
        <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#7e8299] mb-1.5">
          {title}
        </p>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            prefetch={true}
            onClick={() => setMobileMenuOpen(false)}
            title={sidebarCollapsed ? `${item.label} — ${item.sublabel}` : undefined}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              active
                ? 'bg-gradient-to-r from-[#1d4ed8] to-[#1e40af] text-white shadow-sm'
                : 'text-[#b5b8cc] hover:bg-[#23263a] hover:text-white'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'bg-[#202336] text-[#8f94b2] group-hover:text-white group-hover:bg-[#2b2f47]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate leading-tight">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-[#26293e] text-[#a2a6c4]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[10px] truncate mt-0.5 ${
                    active ? 'text-blue-100/90' : 'text-[#757996]'
                  }`}
                >
                  {item.sublabel}
                </p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f5f9] flex font-sans text-[#2a2b3f]">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR PERSISTENTE DE NAVEGACIÓN JERÁRQUICA */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-[60] lg:z-auto bg-[#151726] text-white border-r border-[#262940] flex flex-col transition-all duration-200 shrink-0 shadow-2xl lg:shadow-none ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${
          mobileMenuOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto'
        }`}
      >
        <div className="h-16 px-4 border-b border-[#25283e] flex items-center justify-between shrink-0">
          <Link href="/?step=catalog" prefetch={true} className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
              <Image src="/favicon.png" alt="IPT Course" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white truncate">
                    IPT Course Studio
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase">
                    {ROLE_DEFINITIONS[effectiveRole]?.shortLabel || 'Owner'}
                  </span>
                </div>
                <p className="text-[10px] text-[#8589a6] truncate">Panel de Control Académico</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-[#8589a6] hover:text-white hover:bg-[#23263a] transition-colors"
            title={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#8589a6] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Paneles de Control por Nivel (Jerarquía Estricta: Superior puede entrar a inferior, no viceversa) */}
          {renderNavGroup(
            'Paneles Jerárquicos RBAC',
            LEVEL_PANELS_NAV.filter((p) => {
              const myLevel = ROLE_DEFINITIONS[effectiveRole]?.level || 1;
              if (p.href === '/nivel-4') return myLevel >= 4;
              if (p.href === '/nivel-3') return myLevel >= 3;
              if (p.href === '/nivel-2') return myLevel >= 2;
              return true;
            })
          )}
          {renderNavGroup('Cursos y Clases', CURRICULUM_NAV)}
          {renderNavGroup('Operación Académica', ACADEMIC_OPS_NAV)}
          {renderNavGroup('Prácticas Interactivas', LABS_NAV)}
          {renderNavGroup('Roles, Biblioteca y Graduados', KNOWLEDGE_NAV)}
        </div>

        <div className="p-3 border-t border-[#25283e] space-y-2 bg-[#111320]">
          <a
            href="https://ipt-course.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1e2135] hover:bg-[#282c45] text-xs font-bold text-[#d5d8eb] transition-colors"
            title="Abrir el Portal de Estudiantes (ipt-course.web.app)"
          >
            <div className="flex items-center gap-2.5 truncate">
              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Portal de Estudiantes</span>}
            </div>
            {!sidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-[#7e8299] shrink-0" />}
          </a>

          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-[#181b2c] border border-[#25283e] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-semibold text-[#9da1bd] truncate">
                  {user?.email || 'Administrador Activo'}
                </span>
              </div>
              <Database className="w-3 h-3 text-blue-400 shrink-0" />
            </div>
          )}
        </div>
      </aside>

      {/* COLUMNA PRINCIPAL: TOPBAR DE BREADCRUMBS + WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-15 bg-white border-b border-[#e2e4f0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#d1d2e0] text-[#2a2b3f] hover:bg-[#f6f7f9]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs min-w-0">
              <a
                href="/?step=catalog"
                className="font-bold text-[#595c73] hover:text-[#1d4ed8] transition-colors hidden sm:inline"
              >
                IPT Course Studio
              </a>
              <ChevronRight className="w-3.5 h-3.5 text-[#9194ac] hidden sm:inline shrink-0" />
              <span className="text-[#595c73] font-medium hidden md:inline truncate">
                {breadcrumb.group}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9194ac] hidden md:inline shrink-0" />
              <span className="font-extrabold text-[#2a2b3f] truncate">{breadcrumb.title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/roles"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#065fd4] border border-blue-200 text-[10px] font-extrabold hover:bg-blue-100 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{ROLE_DEFINITIONS[effectiveRole]?.label || 'Nivel 4 · Propietario'}</span>
            </a>

            <a
              href="https://ipt-course.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d2e0] hover:border-[#2a2b3f] text-[11px] font-bold text-[#2a2b3f] transition-colors bg-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abrir Web de Estudiantes</span>
            </a>

            <UserProfileMenu />
          </div>
        </header>

        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">{children}</div>

        {/* BARRA INFERIOR FLOTANTE PARA MÓVILES (SOLO VISIBLE EN RESOLUCIONES PEQUEÑAS, DESKTOP INTACTO) */}
        <nav
          aria-label="Navegación Móvil"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#151726]/95 backdrop-blur-md border-t border-[#262940] px-2 py-1.5 flex items-center justify-around shadow-lg"
        >
          <a
            href="/?step=catalog"
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-colors ${
              pathname === '/' ? 'text-blue-400 font-bold' : 'text-[#8f94b2] hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Cursos</span>
          </a>

          <a
            href="/assignments"
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-colors ${
              pathname.startsWith('/assignments') ? 'text-blue-400 font-bold' : 'text-[#8f94b2] hover:text-white'
            }`}
          >
            <FileCheck2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Tareas</span>
          </a>

          <a
            href="/calendar"
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-colors ${
              pathname.startsWith('/calendar') ? 'text-blue-400 font-bold' : 'text-[#8f94b2] hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Horario</span>
          </a>

          <a
            href={
              ROLE_DEFINITIONS[effectiveRole]?.level >= 4
                ? '/nivel-4'
                : ROLE_DEFINITIONS[effectiveRole]?.level >= 3
                ? '/nivel-3'
                : '/nivel-2'
            }
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] transition-colors ${
              pathname.startsWith('/nivel-') ? 'text-purple-400 font-bold' : 'text-[#8f94b2] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Nivel</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl min-w-[56px] min-h-[44px] text-[#8f94b2] hover:text-white transition-colors cursor-pointer"
            title="Abrir menú completo"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Menú</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default function AdminStudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const { user, loading: authLoading, isAdmin: authIsAdmin, effectiveIsAdmin, userRole, logout } = useAuth();

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/legal');

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#151726] flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-9 h-9 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#b5b8cc]">Abriendo IPT Course Studio...</p>
      </div>
    );
  }

  // Comprobar rol administrativo directamente desde useAuth() (instantáneo, sin llamadas a Firebase al navegar)
  const isEmailAdmin = user?.email
    ? DEFAULT_ADMIN_EMAILS.includes(user.email.toLowerCase())
    : false;
  const isMasterUid = user?.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2';
  const hasRoleAccess =
    userRole === 'owner' || userRole === 'operator' || userRole === 'instructor';
  const hasAdminAccess =
    effectiveIsAdmin || authIsAdmin || isMasterUid || isEmailAdmin || hasRoleAccess;

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-[#151726] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#d1d2e0] shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider">
              Cerebro de Control · IPT Course
            </span>
            <h1 className="text-xl font-extrabold text-[#2a2b3f]">
              Acceso exclusivo para Administradores
            </h1>
            <p className="text-xs text-[#595c73] leading-relaxed">
              {user ? (
                <>
                  Tu cuenta (<span className="font-mono font-semibold text-[#2a2b3f]">{user.email}</span>) tiene nivel de Estudiante y no cuenta con permisos administrativos en el sistema.
                </>
              ) : (
                'Inicia sesión con tu cuenta de Propietario, Operador o Instructor para entrar al panel de control.'
              )}
            </p>
          </div>

          <div className="pt-2 space-y-3">
            {!user ? (
              <a
                href="/login"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Iniciar Sesión en IPT Course Studio</span>
              </a>
            ) : (
              <>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left">
                  <p className="text-[11px] text-amber-900 leading-snug">
                    <span className="font-bold">Privilegios restringidos:</span> Para obtener acceso como instructor, operador o administrador, un propietario debe asignar tu rol legítimamente desde el panel de gestión o en la base de datos de Firebase.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full py-2 px-4 rounded-xl border border-[#d1d2e0] hover:bg-[#f6f7f9] text-[#595c73] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión y cambiar de cuenta</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f9] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminShellContent>{children}</AdminShellContent>
    </Suspense>
  );
}
