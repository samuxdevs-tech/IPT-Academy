'use client';

import React, { useState } from 'react';
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

  const navItems = [
    {
      href: '/',
      match: '/',
      label: 'Inicio',
      icon: Home,
    },
    {
      href: visibleCourses[0]
        ? `/course?course=${visibleCourses[0].slug}`
        : '/course',
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

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0f0f0f] flex flex-col font-sans">
      {/* Barra superior única estilo YouTube para todo el portal estudiantil */}
      <header className="sticky top-0 z-40 h-14 bg-[#ffffff] px-4 flex items-center justify-between gap-4 border-b border-[#e5e5e5] print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-full hover:bg-[#f2f2f2] text-[#0f0f0f] cursor-pointer"
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
          className="flex-1 max-w-[600px] flex items-center"
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
              className="h-10 px-5 bg-[#f8f8f8] hover:bg-[#f0f0f0] border-l border-[#ccc] flex items-center justify-center text-[#0f0f0f] cursor-pointer"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Acciones derechas */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <UserProfileMenu />
          ) : (
            <Link
              href="/login"
              prefetch={true}
              className="px-4 py-1.5 rounded-full border border-[#d9d9d9] hover:bg-[#def1ff] hover:border-transparent text-xs font-semibold text-[#065fd4] transition-colors"
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

        {/* Contenido principal unificado */}
        <div className="flex-1 min-w-0 bg-[#ffffff] flex flex-col">
          {children}
        </div>
      </div>

      {/* Barra inferior móvil estilo YouTube */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff] border-t border-[#e5e5e5] px-2 py-1 grid grid-cols-6 gap-1 print:hidden"
      >
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.match);
          return (
            <Link
              key={item.match}
              href={item.href}
              prefetch={true}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-lg px-1 py-1 text-[10px] ${
                active ? 'font-bold text-[#0f0f0f]' : 'font-normal text-[#606060]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
