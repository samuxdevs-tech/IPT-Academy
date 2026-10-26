"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  Video,
  Clock,
  HelpCircle,
  Save,
  Check,
  Eye,
  Layers,
  Sparkles,
  ChevronRight,
  BookOpen,
  Settings
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, get, onValue } from "firebase/database";

export interface InVideoCheckpointItem {
  id: string;
  timestampSeconds: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  order: number;
  videoType: "youtube" | "local";
  videoUrl: string;
  inVideoCheckpoints?: InVideoCheckpointItem[];
}

export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonItem[];
}

export interface CourseData {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  category: string;
  level: string;
  published: boolean;
  progressionMode: "free" | "lesson_strict" | "module_strict";
  modules: ModuleItem[];
}

const DEFAULT_COURSE: CourseData = {
  slug: "datagan-360-certificacion-maestra",
  title: "Datagan 360: Certificación Maestra en Ganadería Inteligente",
  subtitle: "Formación integral en gestión operativa, pesaje, salud animal y trazabilidad",
  description: "Aprende a dominar los módulos de TecnoGan, interpretar métricas ganaderas y automatizar decisiones.",
  thumbnail: "/course-banner.png",
  category: "Tecnología Agropecuaria",
  level: "Profesional",
  published: true,
  progressionMode: "free",
  modules: [
    {
      id: "mod-01",
      title: "Módulo 1: Fundamentos y Parámetros Ganaderos",
      description: "Conceptos clave de pesaje, condición corporal y trazabilidad bovina.",
      order: 1,
      lessons: [
        {
          id: "les-01",
          title: "Lección 1: Introducción a TecnoGan y Pesaje Digital",
          description: "Configuración inicial y registro de básculas digitales.",
          duration: "12:00",
          order: 1,
          videoType: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          inVideoCheckpoints: [
            {
              id: "cp-01",
              timestampSeconds: 180,
              prompt: "¿Cuál es el beneficio primordial de registrar el peso al destete?",
              options: [
                "Calcular la ganancia diaria de peso (GDP)",
                "Reducir el costo del agua",
                "Evitar vacunas sanitarias"
              ],
              correctIndex: 0,
              explanation: "El peso al destete permite evaluar el desempeño materno y proyectar la curva de crecimiento del lote."
            }
          ]
        }
      ]
    }
  ]
};

// Normalizador seguro para evitar errores de undefined en propiedades anidadas
function normalizeCourseData(raw: any, fallbackSlug: string = "datagan-360-certificacion-maestra"): CourseData {
  if (!raw || typeof raw !== "object") return DEFAULT_COURSE;

  const rawModules = Array.isArray(raw.modules)
    ? raw.modules.filter(Boolean)
    : typeof raw.modules === "object" && raw.modules !== null
    ? Object.values(raw.modules)
    : [];

  const modules: ModuleItem[] = rawModules.map((m: any, mIdx: number) => {
    const rawLessons = Array.isArray(m?.lessons)
      ? m.lessons.filter(Boolean)
      : typeof m?.lessons === "object" && m?.lessons !== null
      ? Object.values(m.lessons)
      : [];

    return {
      id: m?.id || `mod-${mIdx + 1}`,
      title: m?.title || `Módulo ${mIdx + 1}: Eje Académico`,
      description: m?.description || "",
      order: m?.order || mIdx + 1,
      lessons: rawLessons.map((l: any, lIdx: number) => ({
        id: l?.id || `les-${mIdx + 1}-${lIdx + 1}`,
        title: l?.title || `Lección ${lIdx + 1}: Clase Práctica`,
        description: l?.description || "",
        duration: l?.duration || "10:00",
        order: l?.order || lIdx + 1,
        videoType: l?.videoType || "youtube",
        videoUrl: l?.videoUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        inVideoCheckpoints: Array.isArray(l?.inVideoCheckpoints) ? l.inVideoCheckpoints : [],
      })),
    };
  });

  return {
    slug: raw.slug || fallbackSlug,
    title: raw.title || "Programa de Capacitación Profesional",
    subtitle: raw.subtitle || "",
    description: raw.description || "",
    thumbnail: raw.thumbnail || "/course-banner.png",
    category: raw.category || "Tecnología Agropecuaria",
    level: raw.level || "Profesional",
    published: raw.published ?? true,
    progressionMode: raw.progressionMode || "free",
    modules,
  };
}

export function CourseBuilder({ onOpenPreview }: { onOpenPreview?: () => void }) {
  const [coursesList, setCoursesList] = useState<CourseData[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>("datagan-360-certificacion-maestra");
  const [currentCourse, setCurrentCourse] = useState<CourseData>(DEFAULT_COURSE);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [draggedModuleIdx, setDraggedModuleIdx] = useState<number | null>(null);

  // 1. Sincronizar en tiempo real con Firebase RTDB de Estudiantes
  useEffect(() => {
    const coursesRef = ref(rtdb, "courses");
    const unsubscribe = onValue(
      coursesRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          let list: CourseData[] = [];
          if (Array.isArray(val)) {
            list = val.filter(Boolean).map((c, i) => normalizeCourseData(c, `curso-${i + 1}`));
          } else if (typeof val === "object" && val !== null) {
            list = Object.keys(val).map((k) => normalizeCourseData(val[k], k));
          }

          if (list.length > 0) {
            setCoursesList(list);
            const current = list.find((c) => c.slug === selectedCourseSlug) || list[0];
            setCurrentCourse(current);
            setSelectedCourseSlug(current.slug);
            const firstLesson = current.modules?.[0]?.lessons?.[0] || null;
            setSelectedLesson(firstLesson);
            return;
          }
        }
        // Fallback robusto si la base de datos aún no tiene cursos
        setCoursesList([DEFAULT_COURSE]);
        setCurrentCourse(DEFAULT_COURSE);
        setSelectedCourseSlug(DEFAULT_COURSE.slug);
        setSelectedLesson(DEFAULT_COURSE.modules?.[0]?.lessons?.[0] || null);
      },
      (err) => {
        console.warn("Aviso de lectura RTDB:", err);
        setCoursesList([DEFAULT_COURSE]);
        setCurrentCourse(DEFAULT_COURSE);
      }
    );

    return () => unsubscribe();
  }, [selectedCourseSlug]);

  const modules = currentCourse.modules || [];
  const activeModule = modules[activeModuleIndex] || null;

  const handleAddModule = () => {
    const newMod: ModuleItem = {
      id: `mod-${Date.now()}`,
      title: `Módulo ${modules.length + 1}: Nuevo Eje Temático`,
      description: "Objetivo pedagógico del módulo...",
      order: modules.length + 1,
      lessons: [],
    };
    const nextModules = [...modules, newMod];
    setCurrentCourse({ ...currentCourse, modules: nextModules });
    setActiveModuleIndex(nextModules.length - 1);
  };

  const handleAddLesson = () => {
    if (!modules[activeModuleIndex]) return;
    const activeMod = modules[activeModuleIndex];
    const existingLessons = activeMod.lessons || [];
    const newLesson: LessonItem = {
      id: `les-${Date.now()}`,
      title: `Lección ${existingLessons.length + 1}: Clase Práctica`,
      description: "Contenido de la clase y recursos asociados...",
      duration: "10:00",
      order: existingLessons.length + 1,
      videoType: "youtube",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      inVideoCheckpoints: [],
    };
    const nextModules = [...modules];
    nextModules[activeModuleIndex] = {
      ...activeMod,
      lessons: [...existingLessons, newLesson],
    };
    setCurrentCourse({ ...currentCourse, modules: nextModules });
    setSelectedLesson(newLesson);
  };

  const handleDeleteModule = (idx: number) => {
    if (confirm("¿Estás seguro de eliminar este módulo y todas sus lecciones?")) {
      const nextModules = modules.filter((_, i) => i !== idx);
      setCurrentCourse({ ...currentCourse, modules: nextModules });
      setActiveModuleIndex(0);
      setSelectedLesson(null);
    }
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (!modules[activeModuleIndex]) return;
    const activeMod = modules[activeModuleIndex];
    const nextModules = [...modules];
    nextModules[activeModuleIndex] = {
      ...activeMod,
      lessons: (activeMod.lessons || []).filter((l) => l.id !== lessonId),
    };
    setCurrentCourse({ ...currentCourse, modules: nextModules });
    setSelectedLesson(null);
  };

  const handleDragStart = (idx: number) => {
    setDraggedModuleIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedModuleIdx === null || draggedModuleIdx === targetIdx) return;
    const next = [...modules];
    const item = next.splice(draggedModuleIdx, 1)[0];
    next.splice(targetIdx, 0, item);
    next.forEach((m, i) => (m.order = i + 1));
    setDraggedModuleIdx(targetIdx);
    setCurrentCourse({ ...currentCourse, modules: next });
    setActiveModuleIndex(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedModuleIdx(null);
  };

  // Guardar en Firebase RTDB con el esquema EXACTO que ipt-course-students consume
  const handleSaveToFirebase = async () => {
    setSaving(true);
    try {
      const slug = currentCourse.slug || "datagan-360-certificacion-maestra";
      const normalizedCourse: CourseData = {
        ...currentCourse,
        slug,
        modules: (currentCourse.modules || []).map((m, mIdx) => ({
          ...m,
          order: mIdx + 1,
          lessons: (m.lessons || []).map((l, lIdx) => ({
            ...l,
            order: lIdx + 1,
            videoType: l.videoType || "youtube",
            videoUrl: l.videoUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            inVideoCheckpoints: l.inVideoCheckpoints || [],
          })),
        })),
      };

      // Guardar directamente en el nodo de cursos de estudiantes
      await set(ref(rtdb, `courses/${slug}`), normalizedCourse);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error("Error al guardar curso en Firebase RTDB:", err);
      alert("No se pudo guardar en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Creador Modular de Cursos</h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Sincronizado con Alumnos
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Edita el contenido académico en tiempo real. Los cambios se reflejan inmediatamente en ipt-course-students.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenPreview && (
            <button
              onClick={onOpenPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Alumno</span>
            </button>
          )}

          <button
            onClick={handleSaveToFirebase}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-violet-600/30 disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Guardando..." : savedSuccess ? "¡Sincronizado con Alumnos!" : "Guardar en Base de Datos"}</span>
          </button>
        </div>
      </div>

      {/* Editor de Metadatos del Curso */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
            Curso Activo en ipt-course-students
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            slug: {currentCourse.slug}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Título del Curso</label>
            <input
              type="text"
              value={currentCourse.title}
              onChange={(e) => setCurrentCourse({ ...currentCourse, title: e.target.value })}
              className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-medium"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Subtítulo / Objetivo</label>
            <input
              type="text"
              value={currentCourse.subtitle}
              onChange={(e) => setCurrentCourse({ ...currentCourse, subtitle: e.target.value })}
              className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Drag & Drop Modules List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Módulos del Curso ({modules.length})
            </span>
            <button
              onClick={handleAddModule}
              className="inline-flex items-center gap-1 text-xs text-violet-400 font-bold hover:text-violet-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Módulo
            </button>
          </div>

          <div className="space-y-2">
            {modules.length === 0 ? (
              <div className="bg-[#121217] rounded-2xl border border-dashed border-white/10 p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white">Sin módulos creados</p>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  La estructura del curso está vacía. Haz clic en "Nuevo Módulo" para estructurar las clases.
                </p>
              </div>
            ) : (
              modules.map((mod, idx) => {
                const modLessons = mod.lessons || [];
                return (
                  <div
                    key={mod.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setActiveModuleIndex(idx);
                      if (modLessons.length > 0) setSelectedLesson(modLessons[0]);
                    }}
                    className={`group rounded-2xl border transition-all cursor-pointer p-4 ${
                      activeModuleIndex === idx
                        ? "bg-[#181822] border-violet-500/50 shadow-md shadow-violet-950/20"
                        : "bg-[#121217] border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 cursor-grab active:cursor-grabbing" />
                        <div className="truncate">
                          <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider block">
                            Módulo 0{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={mod.title}
                            onChange={(e) => {
                              const updated = [...modules];
                              updated[idx].title = e.target.value;
                              setCurrentCourse({ ...currentCourse, modules: updated });
                            }}
                            className="bg-transparent border-none text-xs font-bold text-white focus:outline-none w-full truncate p-0"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                          {modLessons.length} {modLessons.length === 1 ? "clase" : "clases"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(idx);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Lessons of Active Module */}
        <div className="lg:col-span-7 space-y-4">
          {activeModule ? (
            <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                    Contenido del Módulo {activeModuleIndex + 1}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{activeModule.title}</h4>
                </div>
                <button
                  onClick={handleAddLesson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Clase en Video</span>
                </button>
              </div>

              {/* Lista de Lecciones del Módulo */}
              <div className="space-y-3">
                {(activeModule.lessons || []).length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    Este módulo aún no tiene lecciones. Haz clic en "Agregar Clase en Video" para añadir contenido.
                  </div>
                ) : (
                  (activeModule.lessons || []).map((les) => (
                    <div
                      key={les.id}
                      onClick={() => setSelectedLesson(les)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedLesson?.id === les.id
                          ? "bg-[#181822] border-violet-500"
                          : "bg-[#16161d] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{les.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {les.duration}
                              </span>
                              <span>•</span>
                              <span>
                                {les.inVideoCheckpoints?.length || 0} checkpoints interactivos
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(les.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Editor de la Lección Seleccionada */}
              {selectedLesson && (
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Detalles de la Lección
                    </h5>
                    <span className="text-[10px] text-zinc-500 font-mono">{selectedLesson.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Título de la Clase</label>
                      <input
                        type="text"
                        value={selectedLesson.title}
                        onChange={(e) => {
                          const updated = { ...selectedLesson, title: e.target.value };
                          setSelectedLesson(updated);
                          const nextMods = [...modules];
                          if (nextMods[activeModuleIndex]) {
                            const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
                            const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
                            if (lIndex !== -1) {
                              modLessons[lIndex] = updated;
                              nextMods[activeModuleIndex] = {
                                ...nextMods[activeModuleIndex],
                                lessons: modLessons,
                              };
                              setCurrentCourse({ ...currentCourse, modules: nextMods });
                            }
                          }
                        }}
                        className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Duración estimada</label>
                      <input
                        type="text"
                        value={selectedLesson.duration}
                        onChange={(e) => {
                          const updated = { ...selectedLesson, duration: e.target.value };
                          setSelectedLesson(updated);
                          const nextMods = [...modules];
                          if (nextMods[activeModuleIndex]) {
                            const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
                            const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
                            if (lIndex !== -1) {
                              modLessons[lIndex] = updated;
                              nextMods[activeModuleIndex] = {
                                ...nextMods[activeModuleIndex],
                                lessons: modLessons,
                              };
                              setCurrentCourse({ ...currentCourse, modules: nextMods });
                            }
                          }
                        }}
                        className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">URL del Video (YouTube o HLS/MP4)</label>
                    <input
                      type="url"
                      value={selectedLesson.videoUrl || ""}
                      onChange={(e) => {
                        const updated = { ...selectedLesson, videoUrl: e.target.value };
                        setSelectedLesson(updated);
                        const nextMods = [...modules];
                        if (nextMods[activeModuleIndex]) {
                          const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
                          const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
                          if (lIndex !== -1) {
                            modLessons[lIndex] = updated;
                            nextMods[activeModuleIndex] = {
                              ...nextMods[activeModuleIndex],
                              lessons: modLessons,
                            };
                            setCurrentCourse({ ...currentCourse, modules: nextMods });
                          }
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Descripción pedagógica</label>
                    <textarea
                      rows={3}
                      value={selectedLesson.description || ""}
                      onChange={(e) => {
                        const updated = { ...selectedLesson, description: e.target.value };
                        setSelectedLesson(updated);
                        const nextMods = [...modules];
                        if (nextMods[activeModuleIndex]) {
                          const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
                          const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
                          if (lIndex !== -1) {
                            modLessons[lIndex] = updated;
                            nextMods[activeModuleIndex] = {
                              ...nextMods[activeModuleIndex],
                              lessons: modLessons,
                            };
                            setCurrentCourse({ ...currentCourse, modules: nextMods });
                          }
                        }
                      }}
                      className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#121217] rounded-2xl border border-white/10 p-12 text-center text-zinc-500 text-xs">
              Selecciona o crea un módulo para gestionar sus lecciones.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
