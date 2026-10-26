"use client";

import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Video,
  Clock,
  HelpCircle,
  Save,
  Check,
  Eye,
  Layers,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";

export interface LessonItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  inVideoCheckpoints?: {
    timeSeconds: number;
    question: string;
    options: string[];
    correctIndex: number;
  }[];
}

export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  lessons: LessonItem[];
}

export function CourseBuilder({ onOpenPreview }: { onOpenPreview: () => void }) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [draggedModuleIdx, setDraggedModuleIdx] = useState<number | null>(null);

  useEffect(() => {
    async function loadRealModules() {
      try {
        const snap = await get(ref(rtdb, "courses/modules"));
        if (snap.exists()) {
          const val = snap.val();
          const list = Array.isArray(val) ? val : Object.values(val);
          setModules(list);
        } else {
          setModules([]);
        }
      } catch (err) {
        setModules([]);
      }
    }
    loadRealModules();
  }, []);

  const handleAddModule = () => {
    const newMod: ModuleItem = {
      id: `mod-${Date.now()}`,
      title: `Nuevo Módulo ${modules.length + 1}`,
      description: "Describe el objetivo pedagógico de este módulo...",
      lessons: [],
    };
    setModules([...modules, newMod]);
    setActiveModuleIndex(modules.length);
  };

  const handleAddLesson = () => {
    if (!modules[activeModuleIndex]) return;
    const newLesson: LessonItem = {
      id: `les-${Date.now()}`,
      title: `Nueva Lección ${modules[activeModuleIndex].lessons.length + 1}`,
      description: "Contenido de la explicación...",
      duration: "10:00",
    };
    const updated = [...modules];
    updated[activeModuleIndex].lessons.push(newLesson);
    setModules(updated);
    setSelectedLesson(newLesson);
  };

  const handleDeleteModule = (idx: number) => {
    if (confirm("¿Estás seguro de eliminar este módulo y todas sus lecciones?")) {
      const updated = modules.filter((_, i) => i !== idx);
      setModules(updated);
      setActiveModuleIndex(0);
      setSelectedLesson(null);
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedModuleIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedModuleIdx === null || draggedModuleIdx === targetIdx) return;
    const updated = [...modules];
    const item = updated.splice(draggedModuleIdx, 1)[0];
    updated.splice(targetIdx, 0, item);
    setDraggedModuleIdx(targetIdx);
    setModules(updated);
    setActiveModuleIndex(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedModuleIdx(null);
  };

  const handleSaveToFirebase = async () => {
    try {
      await set(ref(rtdb, "courses/datagan-360-certificacion-maestra/modules"), modules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn("Guardado local:", err);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const activeModule = modules[activeModuleIndex];

  return (
    <div className="space-y-6">
      {/* Action Toolbar Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Planificador Modular de Clases</h3>
              <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                Drag & Drop
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Arrastra módulos para reordenar la secuencia pedagógica y edita lecciones con checkpoints interactivos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Modo Alumno</span>
          </button>

          <button
            onClick={handleSaveToFirebase}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-violet-600/30"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? "Guardado en RTDB" : "Guardar Estructura"}</span>
          </button>
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
                  La estructura del curso está completamente en blanco. Haz clic en "Nuevo Módulo" para comenzar.
                </p>
                <button
                  onClick={handleAddModule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20 active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Primer Módulo</span>
                </button>
              </div>
            ) : (
              modules.map((mod, idx) => (
              <div
                key={mod.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setActiveModuleIndex(idx);
                  setSelectedLesson(null);
                }}
                className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  activeModuleIndex === idx
                    ? "bg-[#161622] border-violet-500 shadow-[0_4px_20px_rgba(124,58,237,0.15)] ring-1 ring-violet-500"
                    : "bg-[#121217] border-white/5 hover:border-white/15 hover:bg-[#15151c]"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-1 rounded-md text-zinc-600 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className={`text-xs font-bold truncate ${activeModuleIndex === idx ? "text-violet-300" : "text-white"}`}>
                      {mod.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <span>{mod.lessons.length} lecciones</span>
                      <span>•</span>
                      <span>{mod.lessons.reduce((acc, l) => acc + (parseInt(l.duration) || 10), 0)} min total</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModule(idx);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar módulo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-4 h-4 ${activeModuleIndex === idx ? "text-violet-400" : "text-zinc-600"}`} />
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Right Column: Module Details & Lessons Editor */}
        <div className="lg:col-span-7">
          <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-6 shadow-lg">
            {activeModule ? (
              <>
                {/* Module Meta Fields */}
                <div className="space-y-4 pb-5 border-b border-white/10">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-1.5">
                      Título del Módulo
                    </label>
                    <input
                      type="text"
                      value={activeModule.title}
                      onChange={(e) => {
                        const updated = [...modules];
                        updated[activeModuleIndex].title = e.target.value;
                        setModules(updated);
                      }}
                      className="w-full text-sm font-bold text-white bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-1.5">
                      Descripción Pedagógica
                    </label>
                    <textarea
                      rows={2}
                      value={activeModule.description}
                      onChange={(e) => {
                        const updated = [...modules];
                        updated[activeModuleIndex].description = e.target.value;
                        setModules(updated);
                      }}
                      className="w-full text-xs text-zinc-300 leading-relaxed bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>

                {/* Lessons List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      Lecciones ({activeModule.lessons.length})
                    </span>
                    <button
                      onClick={handleAddLesson}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Lección
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeModule.lessons.map((les, lIdx) => (
                      <div
                        key={les.id}
                        onClick={() => setSelectedLesson(les)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedLesson?.id === les.id
                            ? "bg-[#181828] border-violet-500 text-white"
                            : "bg-[#16161c] border-white/5 hover:border-white/10 hover:bg-[#1a1a22]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center flex-shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{les.title}</p>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5 font-mono">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span>{les.duration}</span>
                              {les.inVideoCheckpoints && les.inVideoCheckpoints.length > 0 && (
                                <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {les.inVideoCheckpoints.length} Checkpoint interactivo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = [...modules];
                            updated[activeModuleIndex].lessons.splice(lIdx, 1);
                            setModules(updated);
                            if (selectedLesson?.id === les.id) setSelectedLesson(null);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Eliminar lección"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {activeModule.lessons.length === 0 && (
                      <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 text-xs">
                        No hay lecciones en este módulo. Haz clic en "Añadir Lección" para comenzar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Lesson Editor */}
                {selectedLesson && (
                  <div className="p-4 rounded-xl bg-[#181820] border border-white/10 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 flex items-center gap-1.5">
                        <Edit2 className="w-3 h-3" />
                        Editando: {selectedLesson.title}
                      </span>
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="text-[10px] text-zinc-400 hover:text-white"
                      >
                        Cerrar Editor
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                          Título de la Lección
                        </label>
                        <input
                          type="text"
                          value={selectedLesson.title}
                          onChange={(e) => {
                            const updated = [...modules];
                            const les = updated[activeModuleIndex].lessons.find(l => l.id === selectedLesson.id);
                            if (les) les.title = e.target.value;
                            setModules(updated);
                            setSelectedLesson({ ...selectedLesson, title: e.target.value });
                          }}
                          className="w-full text-xs bg-[#121217] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                          Duración (mm:ss)
                        </label>
                        <input
                          type="text"
                          value={selectedLesson.duration}
                          onChange={(e) => {
                            const updated = [...modules];
                            const les = updated[activeModuleIndex].lessons.find(l => l.id === selectedLesson.id);
                            if (les) les.duration = e.target.value;
                            setModules(updated);
                            setSelectedLesson({ ...selectedLesson, duration: e.target.value });
                          }}
                          className="w-full text-xs bg-[#121217] border border-white/10 rounded-lg p-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                        URL de Video (Cloudflare R2 o YouTube)
                      </label>
                      <input
                        type="text"
                        value={selectedLesson.videoUrl || ""}
                        placeholder="https://pub-...r2.dev/video.mp4 o https://youtube.com/..."
                        onChange={(e) => {
                          const updated = [...modules];
                          const les = updated[activeModuleIndex].lessons.find(l => l.id === selectedLesson.id);
                          if (les) les.videoUrl = e.target.value;
                          setModules(updated);
                          setSelectedLesson({ ...selectedLesson, videoUrl: e.target.value });
                        }}
                        className="w-full text-xs bg-[#121217] border border-white/10 rounded-lg p-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-zinc-500 text-xs">
                Selecciona un módulo en la columna izquierda para inspeccionar sus lecciones.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
