'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { resolveStudentNavItems } from '@/services/studentNavigationService';
import StudentNavButton from '@/components/navigation/StudentNavButton';
import { User } from 'lucide-react';

interface StudentSidebarProps {
  isOpen: boolean;
  className?: string;
}

export default function StudentSidebar({ isOpen, className = '' }: StudentSidebarProps) {
  const pathname = usePathname() || '/';
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  // 1. Obtener la lista de botones resueltos de forma 100% centralizada desde el servicio
  const navItems = resolveStudentNavItems({
    courses,
    assignments,
    currentPathname: pathname,
  });

  const studentDisplayName = user?.displayName || 'Estudiante';

  return (
    <aside
      className={`shrink-0 bg-[#ffffff] py-3 hidden md:flex flex-col border-r border-[#f0f0f0] transition-all print:hidden select-none ${
        isOpen ? 'w-56 px-3' : 'w-[72px] px-1.5'
      } ${className}`}
      aria-label="Barra de navegación principal"
    >
      {/* Lista de botones generada centralizadamente */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto" aria-label="Secciones del estudiante">
        {navItems.map((item) => (
          <StudentNavButton
            key={item.id}
            item={item}
            variant={isOpen ? 'desktop-expanded' : 'desktop-collapsed'}
          />
        ))}
      </nav>

      {/* Sección inferior de perfil de usuario */}
      {user && (
        <div className="pt-3 border-t border-[#f0f0f0] mt-auto">
          {isOpen ? (
            <div className="p-2.5 rounded-xl bg-[#fafafa] border border-[#e5e5e5] space-y-1">
              <p className="text-xs font-bold text-[#0f0f0f] truncate" title={studentDisplayName}>
                {studentDisplayName}
              </p>
              <p className="text-[10px] text-[#707070] truncate">
                {user.email || 'Estudiante'}
              </p>
            </div>
          ) : (
            <div
              title={`Estudiante: ${studentDisplayName}`}
              className="w-full flex items-center justify-center py-2 text-[#606060] rounded-xl"
            >
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
