'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileCheck2,
  Calendar,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Shield } from 'lucide-react';

export default function WelcomeStudioView({
  onOpenCreateCourse,
  onOpenAdminTools,
  onOpenLiveStudio,
  onResetWorkspace,
}: {
  onOpenCreateCourse: () => void;
  onOpenAdminTools?: () => void;
  onOpenLiveStudio?: () => void;
  onResetWorkspace?: () => void;
}) {
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const userName = user?.displayName || 'Iván Samuel';
  const pendingSubmissionsCount = assignments.filter((a) => a.status === 'submitted').length;

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Selector de Espacio de Trabajo / Botón Cambiar */}
      {onResetWorkspace && (
        <div className="flex items-center justify-between pb-2 border-b border-[#e5e5ea]/60">
          <button
            onClick={onResetWorkspace}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8e8e93] hover:text-[#1d1d1f] transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cambiar espacio de trabajo</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#6d28d2] text-xs font-semibold tracking-wide">
            <Shield className="w-3 h-3" />
            <span>ESPACIO ADMINISTRADOR (NIVEL SUPERIOR A 3)</span>
          </span>
        </div>
      )}

      {/* Saludo Apple Zen */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Centro de Control Académico</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1d1d1f]">
          Bienvenido de vuelta, {userName}
        </h1>
        <p className="text-sm sm:text-base text-[#8e8e93]">
          Todo tu campus listo y sincronizado. Administra tus contenidos, revisa entregas de estudiantes o supervisa la actividad en vivo.
        </p>
      </div>

      {/* Mini-KPIs en Tarjetas Suaves Apple */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e8e93]">Cursos en Catálogo</span>
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1d1d1f] tabular-nums">
            {courses.length}
          </div>
          <div className="text-[11px] text-[#8e8e93]">Programas de formación</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e8e93]">Actividades y Tareas</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#6d28d2]">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1d1d1f] tabular-nums">
            {assignments.length}
          </div>
          <div className="text-[11px] text-[#8e8e93]">
            {pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} por calificar` : 'Al día con revisiones'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e8e93]">Sesiones Programadas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1d1d1f] tabular-nums">
            0
          </div>
          <div className="text-[11px] text-[#8e8e93]">Clases y asesorías en vivo</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e8e93]">Estado del Sistema</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-600 flex items-center gap-1.5 pt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>100% Operativo</span>
          </div>
          <div className="text-[11px] text-[#8e8e93]">Firebase RTDB & Cloudflare D1</div>
        </div>
      </div>

      {/* Accesos Rápidos de Alta Productividad */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#8e8e93]">
          Acciones Principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/?view=courses"
            className="group bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-2xs hover:border-[#0071e3]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                Gestor y Editor de Cursos
              </h3>
              <p className="text-xs text-[#8e8e93] leading-relaxed">
                Abre la vista híbrida de hoja de cálculo para editar clases en caliente y organizar módulos con alta densidad.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#0071e3]">
              <span>Entrar al gestor</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {onOpenLiveStudio && (
            <button
              type="button"
              onClick={onOpenLiveStudio}
              className="group bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer text-left"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-emerald-700 transition-colors">
                  Estudio de Clases en Vivo
                </h3>
                <p className="text-xs text-[#8e8e93] leading-relaxed">
                  Programa clases magistrales con aforo, aprueba cupos de estudiantes con TTL de 4h e inicia la sala /live.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>Abrir Estudio Live</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )}

          <Link
            href="/assignments"
            className="group bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-2xs hover:border-[#0071e3]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6d28d2] flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-[#6d28d2] transition-colors">
                Calificación y Entregas
              </h3>
              <p className="text-xs text-[#8e8e93] leading-relaxed">
                Revisa entregas multiarchivo con el visor inmersivo Focus Grader y asigna calificaciones libres o con rúbrica.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#6d28d2]">
              <span>Abrir entregas</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <button
            type="button"
            onClick={onOpenCreateCourse}
            className="group bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-2xs hover:border-[#0071e3]/40 hover:shadow-xs transition-all flex flex-col justify-between text-left cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1d1d1f] group-hover:text-emerald-600 transition-colors">
                Crear Nuevo Curso
              </h3>
              <p className="text-xs text-[#8e8e93] leading-relaxed">
                Publica un nuevo programa de formación con modelo de evaluación continua, modular o por periodos.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>Crear programa</span>
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            </div>
          </button>
        </div>

        {onOpenAdminTools && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenAdminTools}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-[#e5e5ea] hover:border-[#0071e3]/40 shadow-2xs flex items-center justify-between transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f]">
                    Centro de Mando: Radar en Vivo, Acciones por Lote y Auditoría
                  </h3>
                  <p className="text-[11px] text-[#8e8e93]">
                    Monitorea estudiantes activos, descarga reportes maestros en CSV, gestiona cohortes y envía comunicados globales.
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#0071e3] shrink-0">
                <span>Abrir operaciones</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Lista Rápida de Cursos o Estado Virgen */}
      <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#1d1d1f]">Programas de Formación</h2>
            <p className="text-xs text-[#8e8e93]">Resumen de cursos en catálogo y estado de publicación</p>
          </div>
          {courses.length > 0 && (
            <Link
              href="/?view=courses"
              className="text-xs font-semibold text-[#0071e3] hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] text-[#8e8e93] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1d1d1f]">El catálogo está listo para comenzar</p>
              <p className="text-xs text-[#8e8e93] max-w-sm mx-auto">
                No hay cursos creados aún. Haz clic en el botón de abajo para dar de alta tu primer programa de formación.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateCourse}
              className="py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Curso</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.slug}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1d1d1f]">{course.title}</span>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                        course.published !== false && course.visibility !== 'draft'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {course.published !== false && course.visibility !== 'draft' ? 'Público' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8e8e93]">
                    {course.modules?.length || 0} módulos · {course.category || 'Formación'} ·{' '}
                    {course.evaluationModel === 'free'
                      ? 'Evaluación Continua'
                      : course.evaluationModel === 'modular'
                      ? 'Por Módulos'
                      : 'Cortes Universitarios'}
                  </p>
                </div>

                <Link
                  href={`/?view=courses&course=${course.slug}`}
                  className="py-1.5 px-3 rounded-lg bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] inline-flex items-center gap-1 shrink-0 self-start sm:self-auto transition-colors"
                >
                  <span>Gestionar Clases</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8e8e93]" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
