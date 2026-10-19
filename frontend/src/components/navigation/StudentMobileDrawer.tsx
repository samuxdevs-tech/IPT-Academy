'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { resolveStudentNavItems } from '@/services/studentNavigationService';
import StudentNavButton from '@/components/navigation/StudentNavButton';
import { setLocalStudentName } from '@/services/localDatabaseService';
import { Edit3, Check, X } from 'lucide-react';

interface StudentMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentMobileDrawer({ isOpen, onClose }: StudentMobileDrawerProps) {
  const pathname = usePathname() || '/';
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // 1. Obtener la lista centralizada de botones
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

  return (
    <>
      {/* Fondo oscuro táctil con desenfoque suave */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer lateral deslizable */}
      <aside
        className={`fixed inset-y-0 left-0 z-[120] w-72 bg-white text-[#0f0f0f] border-r border-[#e5e5e5] flex flex-col transition-transform duration-250 ease-out md:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Menú principal móvil"
        aria-hidden={!isOpen}
      >
        {/* Cabecera del Drawer con Logo y Botón de Cierre */}
        <div className="h-16 px-4 border-b border-[#e5e5e5] flex items-center justify-between shrink-0">
          <Link
            href="/"
            prefetch={true}
            onClick={onClose}
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
            onClick={onClose}
            className="p-2 rounded-xl text-[#606060] hover:text-[#0f0f0f] hover:bg-[#f2f2f2] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú móvil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de navegación centralizada para móviles */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#909090] mb-2 select-none">
            Navegación del Estudiante
          </p>
          {navItems.map((item) => (
            <StudentNavButton
              key={item.id}
              item={item}
              variant="mobile-drawer"
              onNavigate={onClose}
            />
          ))}
        </div>

        {/* Pie del Drawer con selector/edición de estudiante sin contraseña */}
        <div className="p-3 border-t border-[#e5e5e5] bg-[#fafafa]">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="space-y-2">
              <label className="text-[10px] font-bold text-[#606060] uppercase block">
                Nombre de Estudiante de Prueba:
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Escribe tu nombre..."
                autoFocus
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#065fd4] rounded-lg outline-none text-[#0f0f0f]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#065fd4] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-3 py-1.5 text-xs text-[#606060] hover:text-[#0f0f0f] rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="px-3 py-2.5 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-between text-xs gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0f0f0f] truncate">{studentDisplayName}</p>
                <p className="text-[10px] text-[#606060] truncate">{user?.email || 'ivan@ipt.local'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNameInput(studentDisplayName);
                  setIsEditingName(true);
                }}
                title="Cambiar nombre de estudiante"
                className="p-1.5 text-[#065fd4] hover:bg-blue-50 rounded-lg cursor-pointer"
                aria-label="Editar nombre de estudiante"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
