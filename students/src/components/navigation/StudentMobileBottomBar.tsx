'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useLms } from '@/context/LmsContext';
import { resolveStudentNavItems, isMoreSectionActive } from '@/services/studentNavigationService';
import StudentNavButton from '@/components/navigation/StudentNavButton';
import { MoreHorizontal } from 'lucide-react';

interface StudentMobileBottomBarProps {
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
  className?: string;
}

export default function StudentMobileBottomBar({
  isDrawerOpen,
  onOpenDrawer,
  className = '',
}: StudentMobileBottomBarProps) {
  const pathname = usePathname() || '/';
  const { courses, assignments } = useLms();

  // 1. Obtener la lista centralizada de botones
  const allNavItems = resolveStudentNavItems({
    courses,
    assignments,
    currentPathname: pathname,
  });

  // Filtrar los 4 botones principales asignados a la barra inferior
  const bottomBarItems = allNavItems.filter((item) => item.inBottomBar);

  const isMoreActive = isMoreSectionActive(pathname);

  return (
    <nav
      aria-label="Navegación móvil"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#ffffff] border-t border-[#e5e5e5] px-1.5 py-1 grid grid-cols-5 gap-1 print:hidden shadow-lg select-none pb-[env(safe-area-inset-bottom,0px)] ${className}`}
    >
      {/* 4 Botones principales controlados por el servicio centralizado */}
      {bottomBarItems.map((item) => (
        <StudentNavButton
          key={item.id}
          item={item}
          variant="mobile-bottom-bar"
        />
      ))}

      {/* Pestaña "Más" que abre el menú con Calendario, Casos Prácticos, Certificados y Perfil */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-expanded={isDrawerOpen}
        aria-label="Abrir más secciones"
        className={`min-h-[52px] flex flex-col items-center justify-center rounded-xl px-1 py-1 text-[11px] active:bg-[#f2f2f2] transition-colors cursor-pointer ${
          isMoreActive || isDrawerOpen
            ? 'font-bold text-[#065fd4]'
            : 'font-normal text-[#606060]'
        }`}
      >
        <MoreHorizontal
          className={`w-5 h-5 mb-0.5 shrink-0 pointer-events-none ${
            isMoreActive || isDrawerOpen ? 'text-[#065fd4]' : 'text-[#606060]'
          }`}
        />
        <span className="truncate max-w-full text-center leading-tight pointer-events-none text-[11px]">
          Más
        </span>
      </button>
    </nav>
  );
}
