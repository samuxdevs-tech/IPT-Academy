'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Layers,
  Film,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Video,
  HelpCircle,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Save,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  ArrowUpDown,
  MoreVertical,
  Award,
} from 'lucide-react';
import { Course, Module, Lesson, ProgressionMode } from '@/types';
import LessonDetailDrawer from '@/components/LessonDetailDrawer';

interface CourseSpreadsheetManagerProps {
  courses: Course[];
  initialCourseSlug?: string;
  onUpdateCourse: (updated: Course) => Promise<void>;
  onOpenCreateCourse: () => void;
}

export default function CourseSpreadsheetManager({
  courses,
  initialCourseSlug,
  onUpdateCourse,
  onOpenCreateCourse,
}: CourseSpreadsheetManagerProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(
    initialCourseSlug || courses[0]?.slug || ''
  );

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.slug === selectedSlug) || courses[0] || null;
  }, [courses, selectedSlug]);

  const [activeLessonDrawer, setActiveLessonDrawer] = useState<{
    lesson: Lesson;
    moduleTitle: string;
    modIdx: number;
    lesIdx: number;
  } | null>(null);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'published' | 'draft'>('all');

  const toggleModuleExpand = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: prev[modId] === false ? true : false,
    }));
  };

  const handleLessonTitleChange = (modIdx: number, lesIdx: number, newTitle: string) => {
    if (!activeCourse) return;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const lessons = [...(modules[modIdx].lessons || [])];
    lessons[lesIdx] = { ...lessons[lesIdx], title: newTitle };
    modules[modIdx] = { ...modules[modIdx], lessons };
    updated.modules = modules;
    onUpdateCourse(updated);
  };

  const handleLessonDurationChange = (modIdx: number, lesIdx: number, newDuration: string) => {
    if (!activeCourse) return;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const lessons = [...(modules[modIdx].lessons || [])];
    lessons[lesIdx] = { ...lessons[lesIdx], duration: newDuration };
    modules[modIdx] = { ...modules[modIdx], lessons };
    updated.modules = modules;
    onUpdateCourse(updated);
  };

  const handleAddModule = () => {
    if (!activeCourse) return;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const newMod: Module = {
      id: `mod-${Date.now()}`,
      title: `Módulo ${modules.length + 1}: Nuevo Módulo`,
      description: 'Descripción de los temas abordados.',
      order: modules.length + 1,
      lessons: [
        {
          id: `les-${Date.now()}`,
          title: 'Clase 1: Introducción',
          description: '',
          order: 1,
          videoType: 'youtube',
          videoUrl: '',
          duration: '10 min',
          checkpointQuiz: [],
          resources: [],
        },
      ],
    };
    updated.modules = [...modules, newMod];
    onUpdateCourse(updated);
    setSaveNotice('Módulo añadido exitosamente.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleAddLesson = (modIdx: number) => {
    if (!activeCourse) return;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const lessons = [...(modules[modIdx].lessons || [])];
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: `Clase ${lessons.length + 1}: Nueva Lección`,
      description: '',
      order: lessons.length + 1,
      videoType: 'youtube',
      videoUrl: '',
      duration: '12 min',
      checkpointQuiz: [],
      resources: [],
    };
    modules[modIdx] = { ...modules[modIdx], lessons: [...lessons, newLesson] };
    updated.modules = modules;
    onUpdateCourse(updated);
    setSaveNotice('Clase añadida al módulo.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleDeleteLesson = (modIdx: number, lesIdx: number) => {
    if (!activeCourse) return;
    if (!confirm('¿Seguro que deseas eliminar esta clase?')) return;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const lessons = modules[modIdx].lessons.filter((_, i) => i !== lesIdx);
    modules[modIdx] = { ...modules[modIdx], lessons };
    updated.modules = modules;
    onUpdateCourse(updated);
  };

  const handleSaveDrawerLesson = (updatedLesson: Lesson) => {
    if (!activeCourse || !activeLessonDrawer) return;
    const { modIdx, lesIdx } = activeLessonDrawer;
    const updated = { ...activeCourse };
    const modules = [...(updated.modules || [])];
    const lessons = [...(modules[modIdx].lessons || [])];
    lessons[lesIdx] = updatedLesson;
    modules[modIdx] = { ...modules[modIdx], lessons };
    updated.modules = modules;
    onUpdateCourse(updated);
    setActiveLessonDrawer(null);
    setSaveNotice(`Lección "${updatedLesson.title}" guardada.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleBulkTogglePublish = (publish: boolean) => {
    if (!activeCourse || selectedLessonIds.length === 0) return;
    // Publicar o despublicar curso completo o elementos
    const updated = { ...activeCourse, published: publish };
    onUpdateCourse(updated);
    setSelectedLessonIds([]);
    setSaveNotice(`Estado de publicación actualizado.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-in fade-in duration-150">
      {/* Toast Notificación */}
      {saveNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1d1d1f] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Drawer de Detalle de Lección */}
      <LessonDetailDrawer
        isOpen={!!activeLessonDrawer}
        onClose={() => setActiveLessonDrawer(null)}
        lesson={activeLessonDrawer?.lesson || null}
        moduleTitle={activeLessonDrawer?.moduleTitle || ''}
        onSaveLesson={handleSaveDrawerLesson}
      />

      {/* Barra de Control Superior */}
      <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1d1d1f]">
                Gestor y Editor de Cursos
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[#f5f5f7] border border-[#e5e5ea] text-[10px] font-bold text-[#8e8e93]">
                Alta Densidad
              </span>
            </div>
            <p className="text-xs text-[#8e8e93]">
              Edita títulos y duraciones directamente sobre la tabla, o abre el drawer lateral para multimedia y quizzes.
            </p>
          </div>
        </div>

        {/* Selector de Curso y Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs font-bold text-[#1d1d1f] bg-[#f5f5f7] hover:border-[#0071e3]/40 transition-colors cursor-pointer min-h-[38px]"
          >
            {courses.length === 0 ? (
              <option value="">Sin cursos disponibles</option>
            ) : (
              courses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={handleAddModule}
            disabled={!activeCourse}
            className="py-2 px-3 rounded-xl border border-[#e5e5ea] bg-white hover:bg-[#f5f5f7] text-xs font-semibold text-[#1d1d1f] inline-flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px] disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-[#0071e3]" />
            <span>Nuevo Módulo</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateCourse}
            className="py-2 px-3.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Curso</span>
          </button>
        </div>
      </div>

      {/* Si no hay cursos en catálogo */}
      {!activeCourse ? (
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] text-[#8e8e93] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1d1d1f]">No hay ningún curso registrado</h2>
            <p className="text-xs text-[#8e8e93] max-w-sm mx-auto">
              Crea tu primer programa de formación para comenzar a estructurar módulos y lecciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateCourse}
            className="py-2.5 px-4 rounded-xl bg-[#0071e3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primer Curso</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ficha Resumen del Curso Activo */}
          <div className="bg-white rounded-2xl border border-[#e5e5ea] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1d1d1f]">{activeCourse.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                    activeCourse.published !== false && activeCourse.visibility !== 'draft'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {activeCourse.published !== false && activeCourse.visibility !== 'draft'
                    ? 'Público'
                    : 'Borrador'}
                </span>
              </div>
              <p className="text-xs text-[#8e8e93]">
                {activeCourse.modules?.length || 0} módulos ·{' '}
                {activeCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} clases en
                total · Evaluación:{' '}
                {activeCourse.evaluationModel === 'free'
                  ? 'Continua / Libre'
                  : activeCourse.evaluationModel === 'modular'
                  ? 'Por Módulos'
                  : 'Cortes Universitarios'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleBulkTogglePublish(!activeCourse.published)}
                className="py-1.5 px-3 rounded-lg border border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {activeCourse.published !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{activeCourse.published !== false ? 'Ocultar' : 'Publicar'}</span>
              </button>
            </div>
          </div>

          {/* VISTA DESKTOP: TABLA DE ALTA DENSIDAD INTERACTIVA (Estilo Numbers / Linear) */}
          <div className="hidden lg:block space-y-4">
            {(activeCourse.modules || []).map((module, modIdx) => {
              const isCollapsed = expandedModules[module.id] === false;
              return (
                <div
                  key={module.id || modIdx}
                  className="bg-white rounded-2xl border border-[#e5e5ea] shadow-2xs overflow-hidden"
                >
                  {/* Cabecera del Módulo */}
                  <div className="px-4 py-3 bg-[#fafafa] border-b border-[#e5e5ea] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleModuleExpand(module.id)}
                      className="flex items-center gap-2 text-xs font-bold text-[#1d1d1f] hover:text-[#0071e3] transition-colors cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-[#8e8e93]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8e8e93]" />
                      )}
                      <span>
                        Módulo {modIdx + 1}: {module.title}
                      </span>
                      <span className="text-[10px] text-[#8e8e93] font-normal">
                        ({module.lessons?.length || 0} clases)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddLesson(modIdx)}
                      className="py-1 px-2.5 rounded-lg border border-[#e5e5ea] bg-white hover:bg-[#f5f5f7] text-[11px] font-bold text-[#0071e3] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Clase</span>
                    </button>
                  </div>

                  {/* Tabla de Lecciones del Módulo */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f5f5f7] text-[#8e8e93] text-[10px] font-extrabold uppercase border-b border-[#e5e5ea]">
                          <tr>
                            <th className="py-2.5 px-4 w-12 text-center">#</th>
                            <th className="py-2.5 px-4">Título de la Lección (Clic para editar)</th>
                            <th className="py-2.5 px-4 w-28">Duración</th>
                            <th className="py-2.5 px-4 w-32">Multimedia</th>
                            <th className="py-2.5 px-4 w-28">Evaluación</th>
                            <th className="py-2.5 px-4 w-36 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5ea]">
                          {(module.lessons || []).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-xs text-[#8e8e93]">
                                Este módulo no tiene lecciones aún.
                              </td>
                            </tr>
                          ) : (
                            module.lessons.map((lesson, lesIdx) => (
                              <tr
                                key={lesson.id || lesIdx}
                                className="hover:bg-[#fbfbfd] transition-colors group"
                              >
                                <td className="py-3 px-4 text-center text-[#8e8e93] font-mono text-[11px]">
                                  {lesIdx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) =>
                                      handleLessonTitleChange(modIdx, lesIdx, e.target.value)
                                    }
                                    className="w-full bg-transparent font-medium text-xs text-[#1d1d1f] hover:bg-neutral-100/60 focus:bg-white focus:ring-1 focus:ring-[#0071e3] px-2 py-1 rounded-md transition-all outline-none"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <input
                                    type="text"
                                    value={lesson.duration || '10 min'}
                                    onChange={(e) =>
                                      handleLessonDurationChange(modIdx, lesIdx, e.target.value)
                                    }
                                    className="w-20 bg-transparent text-xs text-[#515154] hover:bg-neutral-100/60 focus:bg-white focus:ring-1 focus:ring-[#0071e3] px-2 py-1 rounded-md transition-all outline-none"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#515154]">
                                    <Video className="w-3.5 h-3.5 text-[#0071e3]" />
                                    <span>{lesson.videoType === 'local' ? 'Cloudflare R2' : 'YouTube'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#515154]">
                                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                                    <span>{lesson.checkpointQuiz?.length || 0} preguntas</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveLessonDrawer({
                                          lesson,
                                          moduleTitle: module.title,
                                          modIdx,
                                          lesIdx,
                                        })
                                      }
                                      className="py-1 px-2.5 rounded-lg bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                      Detalle
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLesson(modIdx, lesIdx)}
                                      className="p-1 text-[#8e8e93] hover:text-rose-600 transition-colors cursor-pointer"
                                      title="Eliminar clase"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MOTOR MÓVIL DEDICADO: FICHAS VERTICALES ERGONÓMICAS (Sin tablas aplastadas ni textos truncados) */}
          <div className="lg:hidden space-y-4">
            {(activeCourse.modules || []).map((module, modIdx) => (
              <div
                key={module.id || modIdx}
                className="bg-white rounded-2xl border border-[#e5e5ea] p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#e5e5ea] pb-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0071e3]">
                      Módulo {modIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#1d1d1f]">{module.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddLesson(modIdx)}
                    className="py-1.5 px-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-xs font-bold inline-flex items-center gap-1 min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(module.lessons || []).map((lesson, lesIdx) => (
                    <div
                      key={lesson.id || lesIdx}
                      className="p-3.5 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-[#8e8e93] block">
                            Clase {lesIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-[#1d1d1f] block">
                            {lesson.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(modIdx, lesIdx)}
                          className="text-[#8e8e93] hover:text-rose-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#515154] pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-[#e5e5ea] font-medium">
                          {lesson.duration || '10 min'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-[#e5e5ea] font-medium">
                          {lesson.videoType === 'local' ? 'R2 Video' : 'YouTube'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-[#e5e5ea] font-medium">
                          {lesson.checkpointQuiz?.length || 0} preguntas
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveLessonDrawer({
                            lesson,
                            moduleTitle: module.title,
                            modIdx,
                            lesIdx,
                          })
                        }
                        className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#e5e5ea] text-xs font-bold text-[#0071e3] flex items-center justify-center gap-1.5 shadow-2xs min-h-[44px] cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>Abrir Detalle y Recursos</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
