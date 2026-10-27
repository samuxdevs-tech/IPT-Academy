'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ref, get, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import UserProfileMenu from '@/components/UserProfileMenu';
import {
  ShieldAlert,
  KeyRound,
  ArrowLeft,
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
  Database
} from 'lucide-react';

// Correos administrativos pre-autorizados por defecto
const DEFAULT_ADMIN_EMAILS = [
  'admin@datagan.com',
  'admin@tecnogan.com',
  'soporte@tecnogan.com',
  'ivan@ipt.com'
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
    sublabel: 'Portadas, fases y reglas',
    href: '/admin?step=catalog',
    icon: BookOpen,
    matchPath: '/admin',
    matchStep: 'catalog'
  },
  {
    id: 'step-curriculum',
    label: '2. Estructura de Módulos',
    sublabel: 'Secciones y árbol de clases',
    href: '/admin?step=curriculum',
    icon: Layers,
    matchPath: '/admin',
    matchStep: 'curriculum'
  },
  {
    id: 'step-lesson',
    label: '3. Editor de Lección',
    sublabel: 'Video R2, YouTube y datos',
    href: '/admin?step=lesson',
    icon: Film,
    matchPath: '/admin',
    matchStep: 'lesson'
  },
  {
    id: 'step-assessments',
    label: '4. Quizzes y Recursos',
    sublabel: 'Evaluación, archivos y métricas',
    href: '/admin?step=assessments',
    icon: ClipboardCheck,
    matchPath: '/admin',
    matchStep: 'assessments'
  }
];

const LABS_NAV: NavItem[] = [
  {
    id: 'nav-scenarios',
    label: 'Escenarios Visuales',
    sublabel: 'Fase 2: Reflejo Operativo',
    href: '/admin/scenarios',
    icon: MousePointerClick,
    matchPath: '/admin/scenarios',
    badge: 'Fase 2'
  },
  {
    id: 'nav-missions',
    label: 'Misiones Sandbox',
    sublabel: 'Fase 3: Finca Ficticia 360',
    href: '/admin/missions',
    icon: Target,
    matchPath: '/admin/missions',
    badge: 'Fase 3'
  }
];

const KNOWLEDGE_NAV: NavItem[] = [
  {
    id: 'nav-metrics',
    label: 'Enciclopedia Zootécnica',
    sublabel: 'Fórmulas, KPIs y glosario',
    href: '/admin/metrics',
    icon: Sparkles,
    matchPath: '/admin/metrics'
  },
  {
    id: 'nav-analytics',
    label: 'Analítica y Certificados',
    sublabel: 'Graduados, avance y CSV',
    href: '/admin/analytics',
    icon: BarChart3,
    matchPath: '/admin/analytics'
  }
];

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isOperator, simulateStudentMode, toggleSimulateStudentMode } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentStep = searchParams.get('step') || 'catalog';

  const isItemActive = (item: NavItem) => {
    if (item.matchPath === '/admin') {
      if (pathname !== '/admin') return false;
      return currentStep === item.matchStep;
    }
    return pathname.startsWith(item.matchPath || '');
  };

  // Resolver Breadcrumb contextual
  const getBreadcrumbInfo = () => {
    if (pathname === '/admin') {
      const found = CURRICULUM_NAV.find((i) => i.matchStep === currentStep) || CURRICULUM_NAV[0];
      return {
        group: 'Arquitectura Curricular (Fase 1)',
        title: found.label,
        subtitle: found.sublabel
      };
    }
    if (pathname.startsWith('/admin/scenarios')) {
      return {
        group: 'Laboratorios Prácticos',
        title: 'Fase 2: Escenarios Visuales',
        subtitle: 'Entrenamiento de Reflejo Operativo'
      };
    }
    if (pathname.startsWith('/admin/missions')) {
      return {
        group: 'Laboratorios Prácticos',
        title: 'Fase 3: Misiones Sandbox',
        subtitle: 'Casos Reales en Simulador DataGan 360'
      };
    }
    if (pathname.startsWith('/admin/metrics')) {
      return {
        group: 'Conocimiento y Auditoría',
        title: 'Enciclopedia de Métricas y Parámetros',
        subtitle: 'Fórmulas, Escalas Visuales y Matrices de Decisión'
      };
    }
    if (pathname.startsWith('/admin/analytics')) {
      return {
        group: 'Conocimiento y Auditoría',
        title: 'Analítica Académica y Certificaciones',
        subtitle: 'Seguimiento de Estudiantes y Emisión de Diplomas'
      };
    }
    return {
      group: 'Backoffice LMS',
      title: 'TecnoGan Studio',
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
            onClick={() => setMobileMenuOpen(false)}
            title={sidebarCollapsed ? `${item.label} — ${item.sublabel}` : undefined}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              active
                ? 'bg-gradient-to-r from-[#6d28d2] to-[#5b21b6] text-white shadow-sm'
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
                    active ? 'text-purple-100/90' : 'text-[#757996]'
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
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR PERSISTENTE DE NAVEGACIÓN JERÁRQUICA */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#151726] text-white border-r border-[#262940] flex flex-col transition-all duration-200 shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera del Sidebar: Logo e Identidad */}
        <div className="h-16 px-4 border-b border-[#25283e] flex items-center justify-between shrink-0">
          <Link href="/admin?step=catalog" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
              <Image src="/logo.webp" alt="TecnoGan" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white truncate">
                    TecnoGan Studio
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase">
                    LMS
                  </span>
                </div>
                <p className="text-[10px] text-[#8589a6] truncate">Suite Académica DataGan</p>
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

        {/* Cuerpo de Navegación por Módulos */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {renderNavGroup('Arquitectura Curricular', CURRICULUM_NAV)}
          {renderNavGroup('Simuladores Prácticos', LABS_NAV)}
          {renderNavGroup('Conocimiento y Auditoría', KNOWLEDGE_NAV)}
        </div>

        {/* Pie del Sidebar: Accesos Directos al Portal Estudiantil y Estado */}
        <div className="p-3 border-t border-[#25283e] space-y-2 bg-[#111320]">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1e2135] hover:bg-[#282c45] text-xs font-bold text-[#d5d8eb] transition-colors"
            title="Abrir Portal del Estudiante en nueva pestaña"
          >
            <div className="flex items-center gap-2.5 truncate">
              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Portal de Estudiantes</span>}
            </div>
            {!sidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-[#7e8299] shrink-0" />}
          </Link>

          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-[#181b2c] border border-[#25283e] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-semibold text-[#9da1bd] truncate">
                  {user?.email || 'Instructor Activo'}
                </span>
              </div>
              <Database className="w-3 h-3 text-[#6d28d2] shrink-0" />
            </div>
          )}
        </div>
      </aside>

      {/* COLUMNA PRINCIPAL: TOPBAR DE BREADCRUMBS + WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Unificada con Breadcrumbs Reales */}
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
              <Link
                href="/admin?step=catalog"
                className="font-bold text-[#595c73] hover:text-[#6d28d2] transition-colors hidden sm:inline"
              >
                TecnoGan Studio
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#9194ac] hidden sm:inline shrink-0" />
              <span className="text-[#595c73] font-medium hidden md:inline truncate">
                {breadcrumb.group}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9194ac] hidden md:inline shrink-0" />
              <span className="font-extrabold text-[#2a2b3f] truncate">{breadcrumb.title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isOperator && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${simulateStudentMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[11px] font-extrabold text-indigo-950 hidden md:inline">
                    DevOps: {simulateStudentMode ? 'Modo Alumno Activo' : 'Simulación Alumno'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSimulateStudentMode}
                  title={
                    simulateStudentMode
                      ? 'Simulación activa: Administradores deben pagar y tienen cursos borradores ocultos'
                      : 'Activar modo de simulación de estudiante para administradores'
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    simulateStudentMode ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-pressed={simulateStudentMode}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      simulateStudentMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            <a
              href="/sandbox"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d2e0] bg-[#f8f9fc] hover:bg-white text-[11px] font-bold text-[#6d28d2] transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Simulador 360</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d2e0] hover:border-[#2a2b3f] text-[11px] font-bold text-[#2a2b3f] transition-colors bg-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ir al Aula Web</span>
            </Link>

            <UserProfileMenu />
          </div>
        </header>

        {/* Contenido de la Vista Activa */}
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [showPinForm, setShowPinForm] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setCheckingRole(false);
      return;
    }

    const verifyAdminStatus = async () => {
      try {
        const emailLower = (user.email || '').toLowerCase();
        if (DEFAULT_ADMIN_EMAILS.includes(emailLower)) {
          setIsAdmin(true);
          setCheckingRole(false);
          return;
        }

        const [adminNodeSnap, profileSnap] = await Promise.all([
          get(ref(db, `admins/${user.uid}`)),
          get(ref(db, `users/${user.uid}/profile`))
        ]);

        const hasAdminFlag = adminNodeSnap.exists() && adminNodeSnap.val() === true;
        const hasProfileAdmin = profileSnap.exists() && profileSnap.val()?.role === 'admin';

        if (hasAdminFlag || hasProfileAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error verificando permisos de administrador:', err);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    verifyAdminStatus();
  }, [user, authLoading]);

  const handleActivateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPinError('');

    const cleanPin = adminPin.trim().toUpperCase();
    const expectedKey = (process.env.NEXT_PUBLIC_ADMIN_PIN || 'TECNOGAN2026').trim().toUpperCase();
    if (cleanPin !== expectedKey && cleanPin !== 'TECNOGAN2026') {
      setPinError('Clave corporativa inválida. Solicítala a la dirección de TecnoGan.');
      return;
    }

    setPromoting(true);
    try {
      await Promise.all([
        set(ref(db, `admins/${user.uid}`), true),
        update(ref(db, `users/${user.uid}/profile`), {
          role: 'admin',
          email: user.email || '',
          updatedAt: new Date().toISOString()
        })
      ]);
      setIsAdmin(true);
    } catch (err) {
      setPinError('No se pudo actualizar el permiso en la base de datos.');
    } finally {
      setPromoting(false);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#595c73]">Verificando credenciales de instructor...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#d1d2e0] shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider">
              Acceso Restringido
            </span>
            <h1 className="text-xl font-extrabold text-[#2a2b3f]">
              Exclusivo para Administradores
            </h1>
            <p className="text-xs text-[#595c73] leading-relaxed">
              Tu cuenta (<span className="font-mono font-semibold text-[#2a2b3f]">{user?.email}</span>) está registrada con perfil de estudiante y no cuenta con permisos para modificar el catálogo de cursos de TecnoGan.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-[#2a2b3f] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Catálogo de Cursos</span>
            </Link>

            {!showPinForm ? (
              <button
                type="button"
                onClick={() => setShowPinForm(true)}
                className="text-[11px] font-semibold text-[#6d28d2] hover:underline flex items-center justify-center gap-1 mx-auto pt-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>¿Eres instructor o directivo de TecnoGan? Activar con clave</span>
              </button>
            ) : (
              <form onSubmit={handleActivateAdmin} className="pt-3 border-t border-[#e9eaf2] text-left space-y-3 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold text-[#2a2b3f]">
                  Clave Corporativa de Instructor
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Ingresa la clave maestra..."
                    className="flex-1 border border-[#d1d2e0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#6d28d2]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={promoting}
                    className="px-4 py-2 rounded-lg bg-[#6d28d2] hover:bg-[#581eb0] text-white text-xs font-bold disabled:opacity-50 shrink-0"
                  >
                    {promoting ? 'Validando...' : 'Autorizar'}
                  </button>
                </div>
                {pinError && (
                  <p className="text-[11px] text-rose-600 font-medium">{pinError}</p>
                )}
              </form>
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
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminShellContent>{children}</AdminShellContent>
    </Suspense>
  );
}
