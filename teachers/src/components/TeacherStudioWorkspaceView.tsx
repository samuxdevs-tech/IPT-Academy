'use client';

import React from 'react';
import Link from 'next/link';
import {
  Video,
  FileCheck2,
  Calendar,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onOpenLiveStudio: () => void;
  onResetWorkspace: () => void;
}

export default function TeacherStudioWorkspaceView({
  onOpenLiveStudio,
  onResetWorkspace,
}: Props) {
  const { assignments, liveSessions } = useLms();
  const { user } = useAuth();

  const userName = user?.displayName || 'Docente';
  const pendingSubmissions = assignments.filter((a) => a.status === 'submitted').length;

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Barra Superior con botón para cambiar espacio */}
      <div className="flex items-center justify-between">
        <button
          onClick={onResetWorkspace}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8e8e93] hover:text-[#1d1d1f] transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cambiar espacio de trabajo</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide">
          ESPACIO DOCENTE (NIVEL 2 Y 3)
        </span>
      </div>

      {/* Saludo Minimalista */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1d1d1f]">
          Bienvenido, {userName}
        </h1>
        <p className="text-sm text-[#8e8e93]">
          Tu espacio pedagógico para dictar sesiones en vivo, revisar entregas de estudiantes y gestionar la asistencia.
        </p>
      </div>

      {/* Tarjetas Principales de Acción Docente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Clases en Vivo /live */}
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6d28d2] flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#1d1d1f]">Clases en Vivo</h2>
            <p className="text-xs text-[#8e8e93] leading-relaxed">
              Estudio dividido con videollamada y materiales a la mano para proyectar en sesión.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/live"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-[#0071e3] text-white text-xs font-bold hover:bg-[#0077ed] transition-colors"
            >
              <span>Abrir Estudio en Vivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onOpenLiveStudio}
              className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] hover:bg-slate-50 transition-colors"
            >
              Gestionar Cupos y Horarios
            </button>
          </div>
        </div>

        {/* 2. Tareas y Calificaciones */}
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1d1d1f]">Tareas & Entregas</h2>
              {pendingSubmissions > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {pendingSubmissions} por revisar
                </span>
              )}
            </div>
            <p className="text-xs text-[#8e8e93] leading-relaxed">
              Revisa actividades enviadas por tus estudiantes y califica con apoyo de rúbricas oficiales.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/assignments"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <span>Bandeja de Calificación</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Calendario y Sesiones */}
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#1d1d1f]">Calendario Docente</h2>
            <p className="text-xs text-[#8e8e93] leading-relaxed">
              Organiza tus horarios de tutoría magistral y consulta la asistencia de los grupos.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/calendar"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] hover:bg-slate-50 transition-colors"
            >
              <span>Ver Calendario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
