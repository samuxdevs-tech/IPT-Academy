'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { resolveStudentNavItems } from '@/services/studentNavigationService';
import StudentNavButton from '@/components/navigation/StudentNavButton';
import { setLocalStudentName, resetLocalDatabase } from '@/services/localDatabaseService';
import { User, Edit3, Check, RotateCcw } from 'lucide-react';

interface StudentSidebarProps {
  isOpen: boolean;
  className?: string;
}

export default function StudentSidebar({ isOpen, className = '' }: StudentSidebarProps) {
  const pathname = usePathname() || '/';
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // 1. Obtener la lista de botones resueltos de forma 100% centralizada desde el servicio
  const navItems = resolveStudentNavItems({
    courses,
    assignments,
    currentPathname: pathname,
  });

  const studentDisplayName = user?.displayName || 'Estudiante de Prueba';

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setLocalStudentName(nameInput.trim());
      setIsEditingName(false);
      window.location.reload();
    }
  };

  const handleResetData = () => {
    if (confirm('¿Restablecer la base de datos local a los valores iniciales de prueba?')) {
      resetLocalDatabase();
      window.location.reload();
    }
  };

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

      {/* Sección inferior de perfil y prueba local sin contraseña */}
      <div className="pt-3 border-t border-[#f0f0f0] mt-auto">
        {isOpen ? (
          <div className="p-2.5 rounded-xl bg-[#fafafa] border border-[#e5e5e5] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#065fd4] bg-blue-50 px-2 py-0.5 rounded">
                Prueba Local
              </span>
              <button
                type="button"
                onClick={handleResetData}
                title="Restablecer datos locales"
                className="text-[#909090] hover:text-[#0f0f0f] p-1 rounded hover:bg-[#ebebeb] cursor-pointer"
                aria-label="Restablecer base de datos local"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="space-y-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tu nombre..."
                  autoFocus
                  className="w-full text-xs px-2 py-1 bg-white border border-[#065fd4] rounded-lg outline-none text-[#0f0f0f]"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 py-1 bg-[#065fd4] text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Guardar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1 text-[11px] text-[#606060] hover:text-[#0f0f0f] rounded cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0f0f0f] truncate" title={studentDisplayName}>
                    {studentDisplayName}
                  </p>
                  <p className="text-[10px] text-[#707070] truncate">
                    {user?.email || 'ivan@ipt.local'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(studentDisplayName);
                    setIsEditingName(true);
                  }}
                  title="Cambiar nombre de prueba"
                  className="p-1 text-[#606060] hover:text-[#065fd4] rounded cursor-pointer hover:bg-white"
                  aria-label="Cambiar nombre de estudiante"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const newName = prompt('Ingresa tu nombre para probar la plataforma:', studentDisplayName);
              if (newName && newName.trim()) {
                setLocalStudentName(newName.trim());
                window.location.reload();
              }
            }}
            title={`Estudiante: ${studentDisplayName} (Clic para cambiar)`}
            className="w-full flex items-center justify-center py-2 text-[#606060] hover:text-[#0f0f0f] hover:bg-[#f2f2f2] rounded-xl cursor-pointer"
            aria-label="Cambiar nombre de prueba"
          >
            <User className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
