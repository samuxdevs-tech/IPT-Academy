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
  ChevronLeft,
  BookOpen,
  Key,
  Copy,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon,
  FolderOpen,
  CheckCircle2,
  Calendar,
  Radio,
  FileUp,
  ExternalLink
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, get, onValue } from "firebase/database";

export type CourseType = "static" | "dynamic";
export type ProgressionMode = "free" | "lesson_strict" | "module_strict";

export interface InVideoCheckpointItem {
  id: string;
  timestampSeconds: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  type: "document" | "spreadsheet" | "link" | "template";
  url: string;
  description?: string;
  fileSize?: string;
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
  resources?: ResourceItem[];
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
  courseType: CourseType;
  courseModality?: CourseType;
  isFreePublic?: boolean;
  licenseHash: string;
  progressionMode: ProgressionMode;
  modules: ModuleItem[];
}

function generateLicenseHash(slug: string): string {
  const clean = slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LIC-IPT-${clean || "COURSE"}-${rand1}-${rand2}`;
}

const DEFAULT_COURSE: CourseData = {
  slug: "ipt-master-fullstack",
  title: "IPT Master: Arquitectura de Software e IA",
  subtitle: "Formación integral en desarrollo fullstack, cloud e inteligencia artificial aplicada",
  description: "Domina el diseño de arquitecturas escalables, bases de datos en tiempo real y despliegue productivo.",
  thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200",
  category: "Ingeniería de Software & IA",
  level: "Profesional",
  published: true,
  courseType: "dynamic",
  licenseHash: "LIC-IPT-IPT Academy-360-A8F2-99BC",
  progressionMode: "free",
  modules: [
    {
      id: "mod-01",
      title: "Módulo 1: Fundamentos y Arquitectura Base",
      description: "Conceptos clave de arquitectura modular, tipado estricto y modelado de datos.",
      order: 1,
      lessons: [
        {
          id: "les-01",
          title: "Lección 1: Introducción a la Arquitectura IPT",
          description: "Configuración inicial del entorno y estructura de servicios.",
          duration: "12:00",
          order: 1,
          videoType: "youtube",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          inVideoCheckpoints: [
            {
              id: "cp-01",
              timestampSeconds: 180,
              prompt: "¿Cuál es el beneficio principal de desacoplar los permisos del estado persistido?",
              options: [
                "Evitar inconsistencias y evaluar accesos en tiempo real",
                "Reducir el tamaño de las imágenes",
                "Eliminar la autenticación del servidor"
              ],
              correctIndex: 0,
              explanation: "Calcular los permisos dinámicamente garantiza consistencia inmediata ante cambios de plan o vencimientos."
            }
          ]
        }
      ],
      resources: [
        {
          id: "res-01",
          title: "Plantilla de Diseño de Arquitectura y Contratos API",
          type: "spreadsheet",
          url: "https://example.com/recursos/plantilla-arquitectura.xlsx",
          description: "Plantilla oficial para estructurar módulos, endpoints y validaciones.",
          fileSize: "1.4 MB"
        }
      ]
    }
  ]
};

// Normalizador seguro para evitar errores de undefined en propiedades anidadas
function normalizeCourseData(raw: any, fallbackSlug: string = "ipt-master-fullstack"): CourseData {
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

    const rawResources = Array.isArray(m?.resources)
      ? m.resources.filter(Boolean)
      : typeof m?.resources === "object" && m?.resources !== null
      ? Object.values(m.resources)
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
      resources: rawResources.map((r: any, rIdx: number) => ({
        id: r?.id || `res-${mIdx + 1}-${rIdx + 1}`,
        title: r?.title || `Recurso ${rIdx + 1}`,
        type: r?.type || "document",
        url: r?.url || "",
        description: r?.description || "",
        fileSize: r?.fileSize || "1.0 MB",
      })),
    };
  });

  return {
    slug: raw.slug || fallbackSlug,
    title: raw.title || "Programa de Capacitación Profesional",
    subtitle: raw.subtitle || "",
    description: raw.description || "",
    thumbnail: raw.thumbnail || DEFAULT_COURSE.thumbnail,
    category: raw.category || "Tecnología Agropecuaria",
    level: raw.level || "Profesional",
    published: raw.published ?? true,
    courseType: raw.courseType === "static" || raw.courseModality === "static" ? "static" : "dynamic",
    courseModality: raw.courseType === "static" || raw.courseModality === "static" ? "static" : "dynamic",
    isFreePublic: raw.isFreePublic ?? false,
    licenseHash: raw.licenseHash || generateLicenseHash(raw.slug || fallbackSlug),
    progressionMode: raw.progressionMode || "free",
    modules,
  };
}

export function CourseBuilder({ onOpenPreview }: { onOpenPreview?: () => void }) {
  // Wizard Step: 1 = Creación Curso & Licencia, 2 = Módulos, 3 = Lecciones & Checkpoints, 4 = Recursos Didácticos
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [coursesList, setCoursesList] = useState<CourseData[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>("ipt-master-fullstack");
  const [currentCourse, setCurrentCourse] = useState<CourseData>(DEFAULT_COURSE);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Estados para nuevo recurso en Etapa 4
  const [newResourceTitle, setNewResourceTitle] = useState<string>("");
  const [newResourceType, setNewResourceType] = useState<"document" | "spreadsheet" | "link" | "template">("document");
  const [newResourceUrl, setNewResourceUrl] = useState<string>("");
  const [newResourceDesc, setNewResourceDesc] = useState<string>("");
  const [newResourceSize, setNewResourceSize] = useState<string>("2.5 MB");

  // Estados para nuevo checkpoint en Etapa 3
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState<boolean>(false);
  const [cpSeconds, setCpSeconds] = useState<number>(120);
  const [cpPrompt, setCpPrompt] = useState<string>("");
  const [cpOptions, setCpOptions] = useState<string[]>(["", "", ""]);
  const [cpCorrectIdx, setCpCorrectIdx] = useState<number>(0);
  const [cpExplanation, setCpExplanation] = useState<string>("");

  // Sincronizar en tiempo real con Firebase RTDB de Estudiantes
  const [hasInitializedFromRtdb, setHasInitializedFromRtdb] = useState<boolean>(false);

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
            if (!hasInitializedFromRtdb) {
              const current = list.find((c) => c.slug === selectedCourseSlug) || list[0];
              setCurrentCourse(current);
              setSelectedCourseSlug(current.slug);
              setActiveModuleIndex(0);
              setSelectedLesson(current.modules?.[0]?.lessons?.[0] || null);
              setHasInitializedFromRtdb(true);
            }
            return;
          }
        }
        setCoursesList([DEFAULT_COURSE]);
        if (!hasInitializedFromRtdb) {
          setCurrentCourse(DEFAULT_COURSE);
          setSelectedCourseSlug(DEFAULT_COURSE.slug);
          setSelectedLesson(DEFAULT_COURSE.modules?.[0]?.lessons?.[0] || null);
          setHasInitializedFromRtdb(true);
        }
      },
      (err) => {
        console.warn("Aviso de lectura RTDB:", err);
      }
    );

    return () => unsubscribe();
  }, [hasInitializedFromRtdb, selectedCourseSlug]);

  const handleSelectCourseFromDb = (slug: string) => {
    const found = coursesList.find((c) => c.slug === slug);
    if (found) {
      setSelectedCourseSlug(found.slug);
      setCurrentCourse(found);
      setActiveModuleIndex(0);
      setSelectedLesson(found.modules?.[0]?.lessons?.[0] || null);
    }
  };

  const handleCreateNewCourseBlank = () => {
    const newSlug = `curso-ipt-${Date.now().toString().slice(-4)}`;
    const blankCourse: CourseData = {
      slug: newSlug,
      title: "Nuevo Curso IPT",
      subtitle: "Descripción breve del nuevo programa",
      description: "Objetivos y competencias del curso...",
      thumbnail: DEFAULT_COURSE.thumbnail,
      category: "Ingeniería de Software & IA",
      level: "Profesional",
      published: true,
      courseType: "dynamic",
      courseModality: "dynamic",
      isFreePublic: false,
      licenseHash: generateLicenseHash(newSlug),
      progressionMode: "free",
      modules: [
        {
          id: `mod-${Date.now()}`,
          title: "Módulo 1: Introducción",
          description: "Unidad inicial del programa",
          order: 1,
          lessons: [],
          resources: [],
        },
      ],
    };
    setSelectedCourseSlug(newSlug);
    setCurrentCourse(blankCourse);
    setActiveModuleIndex(0);
    setSelectedLesson(null);
    setCurrentStep(1);
  };

  const modules = currentCourse.modules || [];
  const activeModule = modules[activeModuleIndex] || null;

  // Acciones de Módulos (Etapa 2)
  const handleAddModule = () => {
    const newMod: ModuleItem = {
      id: `mod-${Date.now()}`,
      title: `Módulo ${modules.length + 1}: Nuevo Eje Temático`,
      description: "Objetivo pedagógico de la unidad...",
      order: modules.length + 1,
      lessons: [],
      resources: [],
    };
    const nextModules = [...modules, newMod];
    setCurrentCourse({ ...currentCourse, modules: nextModules });
    setActiveModuleIndex(nextModules.length - 1);
  };

  const handleDeleteModule = (idx: number) => {
    if (confirm("¿Estás seguro de eliminar este módulo y todo su contenido?")) {
      const nextModules = modules.filter((_, i) => i !== idx);
      setCurrentCourse({ ...currentCourse, modules: nextModules });
      setActiveModuleIndex(0);
      setSelectedLesson(null);
    }
  };

  // Acciones de Lecciones (Etapa 3)
  const handleAddLesson = () => {
    if (!modules[activeModuleIndex]) return;
    const activeMod = modules[activeModuleIndex];
    const existingLessons = activeMod.lessons || [];
    const newLesson: LessonItem = {
      id: `les-${Date.now()}`,
      title: `Lección ${existingLessons.length + 1}: Clase Práctica`,
      description: "Contenido de la clase y conceptos clave...",
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

  // Checkpoints Interactivos (Etapa 3)
  const handleAddCheckpoint = () => {
    if (!selectedLesson || !cpPrompt.trim()) {
      alert("Por favor escribe la pregunta del checkpoint.");
      return;
    }
    const newCp: InVideoCheckpointItem = {
      id: `cp-${Date.now()}`,
      timestampSeconds: Number(cpSeconds),
      prompt: cpPrompt.trim(),
      options: cpOptions.filter((o) => o.trim() !== ""),
      correctIndex: Number(cpCorrectIdx),
      explanation: cpExplanation.trim() || "Respuesta basada en la lección.",
    };

    const updatedLesson = {
      ...selectedLesson,
      inVideoCheckpoints: [...(selectedLesson.inVideoCheckpoints || []), newCp],
    };
    setSelectedLesson(updatedLesson);

    const nextMods = [...modules];
    if (nextMods[activeModuleIndex]) {
      const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
      const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
      if (lIndex !== -1) {
        modLessons[lIndex] = updatedLesson;
        nextMods[activeModuleIndex] = {
          ...nextMods[activeModuleIndex],
          lessons: modLessons,
        };
        setCurrentCourse({ ...currentCourse, modules: nextMods });
      }
    }

    setCpPrompt("");
    setCpOptions(["", "", ""]);
    setCpExplanation("");
    setIsAddingCheckpoint(false);
  };

  const handleDeleteCheckpoint = (cpId: string) => {
    if (!selectedLesson) return;
    const updatedLesson = {
      ...selectedLesson,
      inVideoCheckpoints: (selectedLesson.inVideoCheckpoints || []).filter((c) => c.id !== cpId),
    };
    setSelectedLesson(updatedLesson);

    const nextMods = [...modules];
    if (nextMods[activeModuleIndex]) {
      const modLessons = [...(nextMods[activeModuleIndex].lessons || [])];
      const lIndex = modLessons.findIndex((l) => l.id === selectedLesson.id);
      if (lIndex !== -1) {
        modLessons[lIndex] = updatedLesson;
        nextMods[activeModuleIndex] = {
          ...nextMods[activeModuleIndex],
          lessons: modLessons,
        };
        setCurrentCourse({ ...currentCourse, modules: nextMods });
      }
    }
  };

  // Acciones de Recursos (Etapa 4)
  const handleAddResource = () => {
    if (!activeModule || !newResourceTitle.trim() || !newResourceUrl.trim()) {
      alert("Por favor indica el título y la URL o archivo del recurso.");
      return;
    }

    const newRes: ResourceItem = {
      id: `res-${Date.now()}`,
      title: newResourceTitle.trim(),
      type: newResourceType,
      url: newResourceUrl.trim(),
      description: newResourceDesc.trim(),
      fileSize: newResourceSize.trim() || "1.0 MB",
    };

    const nextModules = [...modules];
    const currentResList = nextModules[activeModuleIndex].resources || [];
    nextModules[activeModuleIndex] = {
      ...activeModule,
      resources: [...currentResList, newRes],
    };

    setCurrentCourse({ ...currentCourse, modules: nextModules });
    setNewResourceTitle("");
    setNewResourceUrl("");
    setNewResourceDesc("");
  };

  const handleDeleteResource = (resId: string) => {
    if (!activeModule) return;
    const nextModules = [...modules];
    nextModules[activeModuleIndex] = {
      ...activeModule,
      resources: (activeModule.resources || []).filter((r) => r.id !== resId),
    };
    setCurrentCourse({ ...currentCourse, modules: nextModules });
  };

  // Regenerar Hash de Licencia
  const handleRegenerateHash = () => {
    const newHash = generateLicenseHash(currentCourse.slug);
    setCurrentCourse({ ...currentCourse, licenseHash: newHash });
  };

  const handleCopyHash = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentCourse.licenseHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    }
  };

  // Guardar en Firebase RTDB con el esquema EXACTO que ipt-course-students consume
  const handleSaveToFirebase = async () => {
    setSaving(true);
    try {
      const slug = currentCourse.slug || "ipt-master-fullstack";
      const normalizedCourse: CourseData = {
        ...currentCourse,
        slug,
        courseModality: currentCourse.courseType,
        isFreePublic: currentCourse.courseType === "static" ? Boolean(currentCourse.isFreePublic) : false,
        licenseHash: currentCourse.licenseHash || generateLicenseHash(slug),
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
          resources: m.resources || [],
        })),
      };

      await set(ref(rtdb, `courses/${slug}`), normalizedCourse);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error("Error al guardar curso en Firebase RTDB:", err);
      alert("No se pudo guardar el curso en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    {
      num: 1,
      title: "1. Datos & Licencia",
      subtitle: "Modalidad y clave hash",
      icon: Key,
    },
    {
      num: 2,
      title: "2. Módulos",
      subtitle: "Estructura temática",
      icon: Layers,
    },
    {
      num: 3,
      title: "3. Lecciones & Clases",
      subtitle: "Video & checkpoints",
      icon: Video,
    },
    {
      num: 4,
      title: "4. Recursos Didácticos",
      subtitle: "Material de módulos",
      icon: FolderOpen,
    },
  ];

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
              <h3 className="text-sm font-bold text-white tracking-tight">Creador Guiado de Cursos</h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Sincronización en Vivo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Flujo profesional en 4 etapas: Creación, Módulos, Lecciones y Asignación de Recursos didácticos.
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
            <span>{saving ? "Guardando..." : savedSuccess ? "¡Guardado con Éxito!" : "Guardar Curso"}</span>
          </button>
        </div>
      </div>

      {/* Barra de Selección de Curso en Vivo desde Firebase RTDB */}
      <div className="bg-[#121217] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            Cursos en Base de Datos ({coursesList.length})
          </span>
          <select
            value={selectedCourseSlug}
            onChange={(e) => handleSelectCourseFromDb(e.target.value)}
            className="bg-[#181820] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-violet-500"
          >
            {coursesList.map((c) => {
              const modCount = (c.modules || []).length;
              const lesCount = (c.modules || []).reduce(
                (acc, m) => acc + (m.lessons?.length || 0),
                0
              );
              return (
                <option key={c.slug} value={c.slug}>
                  {c.title} ({c.slug}) — {modCount} mód. / {lesCount} clases
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCreateNewCourseBlank}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear Nuevo Curso en Blanco</span>
        </button>
      </div>

      {/* Stepper de 4 Etapas Interactivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#121217] p-3 rounded-2xl border border-white/10">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num as any)}
              className={`p-3.5 rounded-xl text-left border transition-all flex items-center gap-3 ${
                isActive
                  ? "bg-violet-600/20 border-violet-500 text-white shadow-md shadow-violet-950/30"
                  : isDone
                  ? "bg-[#181820] border-emerald-500/30 text-zinc-300 hover:border-white/20"
                  : "bg-[#181820] border-white/5 text-zinc-400 hover:border-white/10"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-zinc-500"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">{s.title}</span>
                <span className="text-[10px] text-zinc-400 block truncate">{s.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* ETAPA 1: CREACIÓN DEL CURSO, TIPO & HASH DE LICENCIA */}
      {/* ===================================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                Etapa 1 de 4
              </span>
              <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                Definición del Curso, Naturaleza & Hash de Licencia
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Configura los metadatos globales, define si es un curso estático o dinámico universitario, y gestiona su clave de licenciamiento.
              </p>
            </div>

            {/* Selector de Naturaleza: Estático vs Dinámico */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">
                Naturaleza del Programa Académico *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setCurrentCourse({ ...currentCourse, courseType: "static" })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    currentCourse.courseType === "static"
                      ? "bg-violet-600/15 border-violet-500 shadow-md"
                      : "bg-[#181820] border-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-violet-400" />
                      Curso Estático (On-Demand / Autoguiado)
                    </span>
                    <input
                      type="radio"
                      checked={currentCourse.courseType === "static"}
                      onChange={() => {}}
                      className="text-violet-600"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Contenido grabado continuo. Las clases, lecciones y videos son siempre los mismos. El estudiante avanza a su propio ritmo sin cohortes ni fechas de entrega rígidas.
                  </p>
                  {currentCourse.courseType === "static" && (
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-300 font-semibold cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(currentCourse.isFreePublic)}
                        onChange={(e) =>
                          setCurrentCourse({ ...currentCourse, isFreePublic: e.target.checked })
                        }
                        className="rounded border-white/20"
                      />
                      <span>Liberar gratuitamente en el Plan Free (Catálogo Abierto)</span>
                    </label>
                  )}
                </div>

                <div
                  onClick={() => setCurrentCourse({ ...currentCourse, courseType: "dynamic" })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    currentCourse.courseType === "dynamic"
                      ? "bg-violet-600/15 border-violet-500 shadow-md"
                      : "bg-[#181820] border-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      Curso Dinámico (Campus Virtual Universitario)
                    </span>
                    <input
                      type="radio"
                      checked={currentCourse.courseType === "dynamic"}
                      onChange={() => {}}
                      className="text-violet-600"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Modelo universitario. Incluye clases sincrónicas en vivo, calendario de entregas por cortes académicos, tareas calificadas con rúbrica y asignación a cohortes o personas.
                  </p>
                </div>
              </div>
            </div>

            {/* Hash de Licencia del Curso */}
            <div className="p-4 rounded-xl bg-[#16161f] border border-violet-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white">
                    Hash de Licencia Criptográfico del Curso
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Requerido para asignación de tareas
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Las tareas asignadas a este curso solo podrán ser visualizadas y entregadas por aquellos estudiantes que posean este hash de licencia activo en las configuraciones de su perfil.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentCourse.licenseHash}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, licenseHash: e.target.value })}
                  className="flex-1 bg-[#101015] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-violet-300 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleCopyHash}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Copiar hash al portapapeles"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedHash ? "Copiado" : "Copiar"}</span>
                </button>
                <button
                  onClick={handleRegenerateHash}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Regenerar clave hash"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerar</span>
                </button>
              </div>
            </div>

            {/* Metadatos Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Título del Curso *</label>
                <input
                  type="text"
                  value={currentCourse.title}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, title: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Slug de Enrutamiento (/course?slug=) *</label>
                <input
                  type="text"
                  value={currentCourse.slug}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, slug: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Subtítulo / Objetivo</label>
                <input
                  type="text"
                  value={currentCourse.subtitle}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, subtitle: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Categoría Temática</label>
                <input
                  type="text"
                  value={currentCourse.category}
                  onChange={(e) => setCurrentCourse({ ...currentCourse, category: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Descripción Pedagógica General</label>
              <textarea
                rows={3}
                value={currentCourse.description}
                onChange={(e) => setCurrentCourse({ ...currentCourse, description: e.target.value })}
                className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30"
            >
              <span>Continuar a Etapa 2: Módulos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ETAPA 2: CREACIÓN DE LOS MÓDULOS */}
      {/* ===================================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Etapa 2 de 4
                </span>
                <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Estructuración Pedagógica de Módulos
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Crea y organiza las unidades temáticas que componen el curso.
                </p>
              </div>
              <button
                onClick={handleAddModule}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Módulo</span>
              </button>
            </div>

            <div className="space-y-3">
              {modules.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-xs bg-[#181820] rounded-xl border border-dashed border-white/10">
                  No hay módulos creados. Haz clic en "Agregar Módulo" para comenzar a estructurar el curso.
                </div>
              ) : (
                modules.map((mod, idx) => (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl bg-[#181820] border border-white/10 hover:border-violet-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                          0{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => {
                            const updated = [...modules];
                            updated[idx].title = e.target.value;
                            setCurrentCourse({ ...currentCourse, modules: updated });
                          }}
                          placeholder="Título del Módulo..."
                          className="flex-1 bg-transparent border-b border-transparent focus:border-violet-500 text-xs font-bold text-white focus:outline-none p-1"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded-md">
                          {(mod.lessons || []).length} clases
                        </span>
                        <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded-md">
                          {(mod.resources || []).length} recursos
                        </span>
                        <button
                          onClick={() => handleDeleteModule(idx)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Eliminar módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={mod.description}
                        onChange={(e) => {
                          const updated = [...modules];
                          updated[idx].description = e.target.value;
                          setCurrentCourse({ ...currentCourse, modules: updated });
                        }}
                        placeholder="Descripción u objetivo pedagógico de este módulo..."
                        className="w-full bg-[#121217] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior: Datos & Licencia</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30"
            >
              <span>Continuar a Etapa 3: Lecciones</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ETAPA 3: CREACIÓN DE LAS LECCIONES & CHECKPOINTS */}
      {/* ===================================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Etapa 3 de 4
                </span>
                <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Creación de Lecciones en Video & Checkpoints
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Añade videos, duraciones y preguntas interactivas in-video que detienen la reproducción.
                </p>
              </div>

              {/* Selector del Módulo Activo */}
              {modules.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400">Módulo:</span>
                  <select
                    value={activeModuleIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setActiveModuleIndex(idx);
                      setSelectedLesson(modules[idx]?.lessons?.[0] || null);
                    }}
                    className="px-3 py-1.5 bg-[#181820] border border-white/10 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-violet-500"
                  >
                    {modules.map((m, i) => (
                      <option key={m.id} value={i}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs bg-[#181820] rounded-xl border border-dashed border-white/10">
                Primero debes crear al menos un módulo en la Etapa 2 para añadirle lecciones.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lista de Lecciones del Módulo */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Clases en {activeModule?.title} ({(activeModule?.lessons || []).length})
                    </span>
                    <button
                      onClick={handleAddLesson}
                      className="inline-flex items-center gap-1 text-xs text-violet-400 font-bold hover:text-violet-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nueva Clase
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {(activeModule?.lessons || []).length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-xs bg-[#181820] rounded-xl border border-white/5">
                        Sin clases en este módulo. Haz clic en "Nueva Clase".
                      </div>
                    ) : (
                      (activeModule?.lessons || []).map((les, lIdx) => (
                        <div
                          key={les.id}
                          onClick={() => setSelectedLesson(les)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            selectedLesson?.id === les.id
                              ? "bg-violet-600/15 border-violet-500 shadow-sm"
                              : "bg-[#181820] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-white truncate">{les.title}</p>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                {les.duration} • {les.inVideoCheckpoints?.length || 0} checkpoints
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLesson(les.id);
                            }}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Editor Detallado de la Lección & Checkpoints */}
                <div className="lg:col-span-7">
                  {selectedLesson ? (
                    <div className="p-5 rounded-2xl bg-[#181820] border border-white/10 space-y-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Detalles de la Clase
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{selectedLesson.id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Título</label>
                          <input
                            type="text"
                            value={selectedLesson.title}
                            onChange={(e) => {
                              const updated = { ...selectedLesson, title: e.target.value };
                              setSelectedLesson(updated);
                              const nextMods = [...modules];
                              const modLessons = [...(nextMods[activeModuleIndex]?.lessons || [])];
                              const lIdx = modLessons.findIndex((l) => l.id === selectedLesson.id);
                              if (lIdx !== -1) {
                                modLessons[lIdx] = updated;
                                nextMods[activeModuleIndex].lessons = modLessons;
                                setCurrentCourse({ ...currentCourse, modules: nextMods });
                              }
                            }}
                            className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Duración (mm:ss)</label>
                          <input
                            type="text"
                            value={selectedLesson.duration}
                            onChange={(e) => {
                              const updated = { ...selectedLesson, duration: e.target.value };
                              setSelectedLesson(updated);
                              const nextMods = [...modules];
                              const modLessons = [...(nextMods[activeModuleIndex]?.lessons || [])];
                              const lIdx = modLessons.findIndex((l) => l.id === selectedLesson.id);
                              if (lIdx !== -1) {
                                modLessons[lIdx] = updated;
                                nextMods[activeModuleIndex].lessons = modLessons;
                                setCurrentCourse({ ...currentCourse, modules: nextMods });
                              }
                            }}
                            className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                          URL del Video (YouTube o HLS/MP4)
                        </label>
                        <input
                          type="url"
                          value={selectedLesson.videoUrl || ""}
                          onChange={(e) => {
                            const updated = { ...selectedLesson, videoUrl: e.target.value };
                            setSelectedLesson(updated);
                            const nextMods = [...modules];
                            const modLessons = [...(nextMods[activeModuleIndex]?.lessons || [])];
                            const lIdx = modLessons.findIndex((l) => l.id === selectedLesson.id);
                            if (lIdx !== -1) {
                              modLessons[lIdx] = updated;
                              nextMods[activeModuleIndex].lessons = modLessons;
                              setCurrentCourse({ ...currentCourse, modules: nextMods });
                            }
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      {/* Checkpoints Interactivos In-Video */}
                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              Checkpoints Interactivos In-Video
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Detienen el video para validar la comprensión del estudiante.
                            </span>
                          </div>
                          <button
                            onClick={() => setIsAddingCheckpoint(!isAddingCheckpoint)}
                            className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[11px] font-semibold hover:bg-violet-600/30"
                          >
                            {isAddingCheckpoint ? "Cancelar" : "+ Agregar Checkpoint"}
                          </button>
                        </div>

                        {/* Formulario de nuevo checkpoint */}
                        {isAddingCheckpoint && (
                          <div className="p-3.5 rounded-xl bg-[#121217] border border-violet-500/30 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-32">
                                <label className="text-[10px] text-zinc-400 block mb-1">Segundo exacto:</label>
                                <input
                                  type="number"
                                  value={cpSeconds}
                                  onChange={(e) => setCpSeconds(Number(e.target.value))}
                                  className="w-full bg-[#181820] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] text-zinc-400 block mb-1">Pregunta formulada:</label>
                                <input
                                  type="text"
                                  value={cpPrompt}
                                  onChange={(e) => setCpPrompt(e.target.value)}
                                  placeholder="¿Qué concepto clave acaba de exponer el docente?"
                                  className="w-full bg-[#181820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-zinc-400 block">Opciones (marca la correcta):</label>
                              {cpOptions.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="correctCp"
                                    checked={cpCorrectIdx === oIdx}
                                    onChange={() => setCpCorrectIdx(oIdx)}
                                    className="text-violet-600"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...cpOptions];
                                      updated[oIdx] = e.target.value;
                                      setCpOptions(updated);
                                    }}
                                    placeholder={`Opción ${oIdx + 1}`}
                                    className="flex-1 bg-[#181820] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                onClick={handleAddCheckpoint}
                                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold"
                              >
                                Insertar en Minuto {Math.floor(cpSeconds / 60)}:{(cpSeconds % 60).toString().padStart(2, "0")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Lista de checkpoints existentes */}
                        <div className="space-y-2">
                          {(selectedLesson.inVideoCheckpoints || []).map((cp) => (
                            <div
                              key={cp.id}
                              className="p-3 rounded-xl bg-[#121217] border border-white/5 flex items-center justify-between text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                                    {Math.floor(cp.timestampSeconds / 60)}:{(cp.timestampSeconds % 60).toString().padStart(2, "0")}
                                  </span>
                                  <span className="font-semibold text-white">{cp.prompt}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 block pl-8">
                                  {cp.options?.length || 0} opciones • Correcta: {cp.options?.[cp.correctIndex] || "N/A"}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteCheckpoint(cp.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-zinc-500 text-xs bg-[#181820] rounded-2xl border border-white/5">
                      Selecciona una clase para editar su contenido y checkpoints.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior: Módulos</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30"
            >
              <span>Continuar a Etapa 4: Recursos Didácticos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ETAPA 4: CREACIÓN & ASIGNACIÓN DE RECURSOS A LOS MÓDULOS */}
      {/* ===================================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Etapa 4 de 4
                </span>
                <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Creación y Asignación de Recursos a Módulos
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Adjunta hojas de cálculo Excel (.xlsx), guías PDF, enlaces y plantillas operativas vinculadas a cada unidad.
                </p>
              </div>

              {modules.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400">Módulo destino:</span>
                  <select
                    value={activeModuleIndex}
                    onChange={(e) => setActiveModuleIndex(Number(e.target.value))}
                    className="px-3 py-1.5 bg-[#181820] border border-white/10 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-violet-500"
                  >
                    {modules.map((m, i) => (
                      <option key={m.id} value={i}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs bg-[#181820] rounded-xl border border-dashed border-white/10">
                Primero crea los módulos en la Etapa 2 para poder adjuntarles recursos didácticos.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulario de Asignación de Recursos */}
                <div className="lg:col-span-5 bg-[#181820] rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <FileUp className="w-4 h-4 text-violet-400" />
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Asignar Nuevo Recurso a {activeModule?.title}
                    </h5>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Título del Material *
                    </label>
                    <input
                      type="text"
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      placeholder="Ej. Plantilla Excel de Balance Hídrico y Forrajero"
                      className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Tipo de Recurso</label>
                      <select
                        value={newResourceType}
                        onChange={(e) => setNewResourceType(e.target.value as any)}
                        className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="spreadsheet">Hoja de Cálculo (.xlsx)</option>
                        <option value="document">Documento (.pdf / .docx)</option>
                        <option value="link">Enlace Web Externo</option>
                        <option value="template">Plantilla Operativa</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Peso estimado</label>
                      <input
                        type="text"
                        value={newResourceSize}
                        onChange={(e) => setNewResourceSize(e.target.value)}
                        placeholder="Ej. 1.8 MB"
                        className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      URL del Archivo o Enlace Web *
                    </label>
                    <input
                      type="url"
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      placeholder="https://... (URL pública de descarga o almacenamiento)"
                      className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                      Instrucción / Descripción breve
                    </label>
                    <textarea
                      rows={2}
                      value={newResourceDesc}
                      onChange={(e) => setNewResourceDesc(e.target.value)}
                      placeholder="Indica al alumno cómo utilizar esta plantilla en sus prácticas..."
                      className="w-full bg-[#121217] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleAddResource}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30"
                  >
                    Vincular Recurso a este Módulo
                  </button>
                </div>

                {/* Lista de Recursos Asociados al Módulo */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Recursos del Módulo ({activeModule?.resources?.length || 0})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {activeModule?.title}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {(activeModule?.resources || []).length === 0 ? (
                      <div className="p-12 text-center text-zinc-500 text-xs bg-[#181820] rounded-2xl border border-white/5 space-y-2">
                        <FolderOpen className="w-8 h-8 mx-auto text-zinc-600" />
                        <p className="font-semibold text-zinc-400">Sin recursos adjuntos en este módulo</p>
                        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                          Completa el formulario lateral para agregar plantillas descargables, PDFs o lecturas obligatorias.
                        </p>
                      </div>
                    ) : (
                      (activeModule?.resources || []).map((res) => (
                        <div
                          key={res.id}
                          className="p-4 rounded-xl bg-[#181820] border border-white/10 flex items-center justify-between gap-4 text-xs hover:border-violet-500/30 transition-all"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                              {res.type === "spreadsheet" ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : res.type === "link" ? (
                                <LinkIcon className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-white truncate">{res.title}</p>
                              {res.description && (
                                <p className="text-[11px] text-zinc-400 truncate">{res.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                <span>{res.fileSize || "1.0 MB"}</span>
                                <span>•</span>
                                <span className="uppercase">{res.type}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {res.url && (
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                title="Abrir enlace de recurso"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteResource(res.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Eliminar recurso del módulo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior: Lecciones</span>
            </button>
            <button
              onClick={handleSaveToFirebase}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? "Finalizando Guardado..." : "Finalizar & Guardar Curso Completo"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
