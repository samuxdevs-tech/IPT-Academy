'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  Home,
  PlaySquare,
  FileCheck2,
  Calendar,
  Award,
  BarChart2,
  Layers,
  MoreHorizontal,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import UserProfileMenu from '@/components/UserProfileMenu';

export default function StudentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [headerSearch, setHeaderSearch] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const isAuthOrStandalone =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  if (isAuthOrStandalone) {
    return <>{children}</>;
  }

  const visibleCourses = courses.filter(
    (c) => c.visibility !== 'draft' && c.published !== false
  );
  const pendingAssignmentsCount = assignments.filter(
    (a) => a.status === 'pending'
  ).length;

  const primaryCourse = visibleCourses[0] || courses[0];
  const classesHref = primaryCourse?.slug
    ? `/course?course=${encodeURIComponent(primaryCourse.slug)}`
    : '/course?course=datagan-master-pro';

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (pathname === href || (href.startsWith('/course') && pathname.startsWith('/course'))) {
      setMobileDrawerOpen(false);
      return;
    }
    router.push(href);
    setTimeout(() => {
      setMobileDrawerOpen(false);
    }, 120);
  };

  const navItems = [
    {
      href: '/',
      match: '/',
      label: 'Inicio',
      icon: Home,
    },
    {
      href: classesHref,
      match: '/course',
      label: 'Clases',
      icon: PlaySquare,
    },
    {
      href: '/assignments',
      match: '/assignments',
      label: 'Tareas',
      icon: FileCheck2,
      badge:
        pendingAssignmentsCount > 0 ? String(pendingAssignmentsCount) : undefined,
    },
    {
      href: '/grades',
      match: '/grades',
      label: 'Calificaciones',
      icon: BarChart2,
    },
    {
      href: '/calendar',
      match: '/calendar',
      label: 'Calendario',
      icon: Calendar,
    },
    {
      href: '/scenarios',
      match: '/scenarios',
      label: 'Casos Prácticos',
      icon: Layers,
    },
    {
      href: '/certificate',
      match: '/certificate',
      label: 'Certificados',
      icon: Award,
    },
  ];

  const isRouteActive = (match: string) => {
    if (match === '/') return pathname === '/';
    return pathname.startsWith(match);
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerSearch.trim();
    if (!q) {
      router.push('/');
      return;
    }
    router.push(`/?q=${encodeURIComponent(q)}`);
  };

  const toggleSidebarOrDrawer = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0f0f0f] flex flex-col font-sans">
      {/* Drawer lateral para móviles con backdrop táctil */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[120] w-72 bg-white text-[#0f0f0f] border-r border-[#e5e5e5] flex flex-col transition-transform duration-250 ease-out md:hidden shadow-2xl ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Menú principal móvil"
      >
        <div className="h-16 px-4 border-b border-[#e5e5e5] flex items-center justify-between shrink-0">
          <Link
            href="/"
            prefetch={true}
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <img
              src="/logo.png"
              alt="IPT Course"
              className="h-8 w-auto object-contain pointer-events-none"
            />
            <span className="font-extrabold text-sm text-[#0f0f0f] truncate pointer-events-none">
              IPT Course
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="p-2 rounded-xl text-[#606060] hover:text-[#0f0f0f] hover:bg-[#f2f2f2] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú móvil"
          >
            <span className="text-xl font-bold leading-none">✕</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#909090] mb-2 select-none">
            Navegación del Estudiante
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.match);
            return (
              <Link
                key={item.match}
                href={item.href}
                prefetch={true}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] cursor-pointer select-none ${
                  active
                    ? 'bg-[#f2f2f2] text-[#0f0f0f] font-bold shadow-2xs'
                    : 'text-[#0f0f0f] hover:bg-[#f8f8f8] active:bg-[#f0f0f0]'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 pointer-events-none ${active ? 'text-[#065fd4]' : 'text-[#606060]'}`} />
                <span className="flex-1 truncate pointer-events-none">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#cc0000] text-white pointer-events-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-[#e5e5e5] bg-[#fafafa] space-y-2">
          {user ? (
            <div className="px-3 py-2 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-between text-xs">
              <span className="text-[#606060] truncate">{user.email}</span>
              <span className="text-[10px] font-extrabold uppercase text-[#065fd4] bg-blue-50 px-2 py-0.5 rounded">
                Estudiante
              </span>
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={true}
              onClick={() => setMobileDrawerOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#065fd4] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </aside>

      {/* Barra superior única estilo YouTube para todo el portal estudiantil */}
      <header className="sticky top-0 z-40 h-14 bg-[#ffffff] px-4 flex items-center justify-between gap-4 border-b border-[#e5e5e5] print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSidebarOrDrawer}
            className="p-2 rounded-full hover:bg-[#f2f2f2] text-[#0f0f0f] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Mostrar u ocultar menú lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" prefetch={true} className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="IPT Course"
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Buscador central tipo píldora de YouTube */}
        <form
          onSubmit={handleGlobalSearch}
          className="flex-1 max-w-[600px] hidden sm:flex items-center"
        >
          <div className="flex w-full items-center border border-[#ccc] rounded-full overflow-hidden focus-within:border-[#1c62b9] bg-[#ffffff]">
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Buscar cursos, clases o temas..."
              className="w-full h-10 pl-4 pr-3 text-sm text-[#0f0f0f] placeholder-[#606060] focus:outline-hidden"
            />
            <button
              type="submit"
              className="h-10 px-5 bg-[#f8f8f8] hover:bg-[#f0f0f0] border-l border-[#ccc] flex items-center justify-center text-[#0f0f0f] cursor-pointer min-h-[40px] min-w-[44px]"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Acciones derechas */}
        <div className="flex items-center gap-2">
          {user ? (
            <UserProfileMenu />
          ) : (
            <Link
              href="/login"
              prefetch={true}
              className="px-4 py-2 rounded-full border border-[#d9d9d9] hover:bg-[#def1ff] hover:border-transparent text-xs font-semibold text-[#065fd4] transition-colors min-h-[44px] inline-flex items-center justify-center"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      {/* Cuerpo con barra lateral izquierda fija estilo YouTube + área de contenido */}
      <div className="flex-1 flex">
        <aside
          className={`${
            sidebarOpen ? 'w-56 px-3' : 'w-[72px] px-1.5'
          } shrink-0 bg-[#ffffff] py-3 hidden md:flex flex-col gap-1 border-r border-[#f0f0f0] transition-all print:hidden`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.match);
            return (
              <Link
                key={item.match}
                href={item.href}
                prefetch={true}
                className={`flex ${
                  sidebarOpen
                    ? 'flex-row items-center gap-5 px-3 py-2.5'
                    : 'flex-col items-center justify-center py-3 gap-1'
                } rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-[#f2f2f2] font-semibold text-[#0f0f0f]'
                    : 'font-normal text-[#0f0f0f] hover:bg-[#f2f2f2]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0 text-[#0f0f0f]" />
                <span
                  className={`${
                    sidebarOpen ? 'text-sm truncate flex-1' : 'text-[10px] truncate'
                  }`}
                >
                  {item.label}
                </span>
                {sidebarOpen && item.badge && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#cc0000] text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </aside>

        {/* Contenido principal unificado con padding inferior para no solapar la barra fija en móvil */}
        <div className="flex-1 min-w-0 bg-[#ffffff] flex flex-col pb-20 md:pb-0">
          {children}
        </div>
      </div>

      {/* Barra inferior móvil estilo YouTube/Canvas con 5 pestañas amplias, targets táctiles confortables y z-[100] */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#ffffff] border-t border-[#e5e5e5] px-1.5 py-1 grid grid-cols-5 gap-1 print:hidden shadow-lg select-none"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.match);
          return (
            <Link
              key={item.match}
              href={item.href}
              prefetch={true}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`min-h-[52px] flex flex-col items-center justify-center rounded-xl px-1 py-1 text-[11px] active:bg-[#f2f2f2] transition-colors cursor-pointer relative ${
                active ? 'font-bold text-[#0f0f0f]' : 'font-normal text-[#606060]'
              }`}
            >
              <div className="relative pointer-events-none">
                <Icon className={`w-5 h-5 mb-0.5 shrink-0 ${active ? 'text-[#065fd4]' : 'text-[#606060]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#cc0000] text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-full text-center leading-tight pointer-events-none">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Pestaña "Más" que abre el menú con Calendario, Casos Prácticos, Certificados y Perfil */}
        {(() => {
          const isMoreActive =
            pathname.startsWith('/calendar') ||
            pathname.startsWith('/scenarios') ||
            pathname.startsWith('/certificate');
          return (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className={`min-h-[52px] flex flex-col items-center justify-center rounded-xl px-1 py-1 text-[11px] active:bg-[#f2f2f2] transition-colors cursor-pointer ${
                isMoreActive || mobileDrawerOpen
                  ? 'font-bold text-[#065fd4]'
                  : 'font-normal text-[#606060]'
              }`}
              aria-label="Abrir más secciones"
            >
              <MoreHorizontal
                className={`w-5 h-5 mb-0.5 shrink-0 pointer-events-none ${
                  isMoreActive || mobileDrawerOpen ? 'text-[#065fd4]' : 'text-[#606060]'
                }`}
              />
              <span className="truncate max-w-full text-center leading-tight pointer-events-none">
                Más
              </span>
            </button>
          );
        })()}
      </nav>
    </div>
  );
}
