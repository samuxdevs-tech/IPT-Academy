'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import UserProfileMenu from '@/components/UserProfileMenu';
import StudentSidebar from '@/components/navigation/StudentSidebar';
import StudentMobileDrawer from '@/components/navigation/StudentMobileDrawer';
import StudentMobileBottomBar from '@/components/navigation/StudentMobileBottomBar';

export default function StudentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
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
      {/* 1. Drawer móvil lateral centralizado */}
      <StudentMobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* 2. Barra superior institucional */}
      <header className="sticky top-0 z-40 h-14 bg-[#ffffff] px-4 flex items-center justify-between gap-4 border-b border-[#e5e5e5] print:hidden select-none">
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

        {/* Buscador central */}
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

        {/* Acciones derechas y perfil de estudiante */}
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

      {/* 3. Estructura principal con Sidebar centralizado y contenido */}
      <div className="flex-1 flex min-h-0">
        <StudentSidebar isOpen={sidebarOpen} />

        {/* Área de contenido con margen ergonómico para barra móvil */}
        <div className="flex-1 min-w-0 bg-[#ffffff] flex flex-col pb-20 md:pb-0">
          {children}
        </div>
      </div>

      {/* 4. Barra inferior móvil centralizada */}
      <StudentMobileBottomBar
        isDrawerOpen={mobileDrawerOpen}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
      />
    </div>
  );
}
