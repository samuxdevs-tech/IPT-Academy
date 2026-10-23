'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_DEFINITIONS } from '@/lib/rbac';
import { GraduationCap, Shield, Lock } from 'lucide-react';

interface Props {
  onSelectWorkspace: (workspace: 'teacher' | 'admin') => void;
}

export default function MinimalistWorkspaceSelector({ onSelectWorkspace }: Props) {
  const { user, userRole } = useAuth();
  const [deniedNotice, setDeniedNotice] = useState<string | null>(null);

  const effectiveRole = user?.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2' ? 'owner' : userRole;
  const roleDef = ROLE_DEFINITIONS[effectiveRole] || ROLE_DEFINITIONS.student;
  const userLevel = roleDef.level ?? 1;

  const handleSelectAdmin = () => {
    // Rol superior a 3 (Nivel 4: Owner / Superadministrador)
    if (userLevel > 3) {
      setDeniedNotice(null);
      onSelectWorkspace('admin');
    } else {
      setDeniedNotice('Acceso restringido: el espacio de Administrador requiere rol superior a 3.');
      setTimeout(() => setDeniedNotice(null), 4000);
    }
  };

  const handleSelectTeacher = () => {
    // Roles 2, 3 y superiores tienen acceso docente
    if (userLevel >= 2) {
      setDeniedNotice(null);
      onSelectWorkspace('teacher');
    } else {
      setDeniedNotice('Acceso restringido: requiere rol de Docente o Instructor (Nivel 2 o superior).');
      setTimeout(() => setDeniedNotice(null), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 select-none">
      <div className="w-full max-w-lg text-center space-y-10 animate-in fade-in duration-300">
        {/* Título Minimalista en Mayúsculas Sutiles */}
        <div className="space-y-2">
          <h1 className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#8e8e93] uppercase">
            SELECCIONA EL ESPACIO DE TRABAJO
          </h1>
        </div>

        {/* Selector Central: DOCENTE | ADMINISTRADOR */}
        <div className="inline-flex items-center justify-center gap-4 sm:gap-8 px-6 py-4 rounded-2xl bg-white border border-[#e5e5ea] shadow-2xs">
          {/* Opción DOCENTE */}
          <button
            onClick={handleSelectTeacher}
            className="group inline-flex items-center gap-2 text-sm sm:text-base font-bold tracking-wider text-[#1d1d1f] hover:text-[#0071e3] transition-colors py-1 px-2 rounded-lg focus:outline-hidden"
          >
            <GraduationCap className="w-4 h-4 text-[#8e8e93] group-hover:text-[#0071e3] transition-colors" />
            <span>DOCENTE</span>
          </button>

          {/* Divisor Minimalista */}
          <span className="text-xl sm:text-2xl font-light text-[#d2d2d7] select-none">|</span>

          {/* Opción ADMINISTRADOR */}
          <button
            onClick={handleSelectAdmin}
            className="group inline-flex items-center gap-2 text-sm sm:text-base font-bold tracking-wider text-[#1d1d1f] hover:text-[#0071e3] transition-colors py-1 px-2 rounded-lg focus:outline-hidden"
          >
            {userLevel > 3 ? (
              <Shield className="w-4 h-4 text-[#8e8e93] group-hover:text-[#0071e3] transition-colors" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-[#aeaeb2] group-hover:text-amber-600 transition-colors" />
            )}
            <span>ADMINISTRADOR</span>
          </button>
        </div>

        {/* Mensaje de Restricción si no tiene nivel superior a 3 */}
        {deniedNotice && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-in fade-in slide-in-from-top-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{deniedNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
}
