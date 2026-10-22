'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  Video,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  Save,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';
import { Lesson, QuizQuestion, InVideoCheckpoint, Resource } from '@/types';

interface LessonDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  moduleTitle: string;
  onSaveLesson: (updatedLesson: Lesson) => void;
}

export default function LessonDetailDrawer({
  isOpen,
  onClose,
  lesson,
  moduleTitle,
  onSaveLesson,
}: LessonDetailDrawerProps) {
  if (!isOpen || !lesson) return null;

  const [activeTab, setActiveTab] = useState<'video' | 'quiz' | 'resources'>('video');
  const [title, setTitle] = useState(lesson.title || '');
  const [description, setDescription] = useState(lesson.description || '');
  const [duration, setDuration] = useState(lesson.duration || '10 min');
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [videoType, setVideoType] = useState<'youtube' | 'local'>(lesson.videoType || 'youtube');
  const [checkpointQuiz, setCheckpointQuiz] = useState<QuizQuestion[]>(lesson.checkpointQuiz || []);
  const [resources, setResources] = useState<Resource[]>(lesson.resources || []);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    const updated: Lesson = {
      ...lesson,
      title: title.trim() || lesson.title,
      description: description.trim(),
      duration: duration.trim() || '10 min',
      videoUrl: videoUrl.trim(),
      videoType,
      checkpointQuiz,
      resources,
    };
    onSaveLesson(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const addQuizQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      prompt: 'Pregunta de comprensión de la clase',
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctIndex: 0,
      explanation: 'Explicación del concepto clave abordado en la lección.',
    };
    setCheckpointQuiz([...checkpointQuiz, newQ]);
  };

  const removeQuizQuestion = (idx: number) => {
    setCheckpointQuiz(checkpointQuiz.filter((_, i) => i !== idx));
  };

  const addResource = () => {
    const newRes: Resource = {
      id: `res-${Date.now()}`,
      title: 'Material complementario',
      url: '',
      type: 'document',
      description: 'Guía de lectura o archivo de soporte.',
    };
    setResources([...resources, newRes]);
  };

  const removeResource = (idx: number) => {
    setResources(resources.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor: Drawer Lateral en Desktop / Bottom Sheet en Móvil */}
      <div
        className="relative z-10 w-full sm:max-w-xl h-full sm:h-screen bg-white shadow-2xl border-l border-[#e5e5ea] flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Drawer */}
        <div className="p-4 sm:p-5 border-b border-[#e5e5ea] flex items-center justify-between shrink-0 bg-[#fafafa]">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0071e3] block truncate">
              {moduleTitle}
            </span>
            <h2 className="text-base font-bold text-[#1d1d1f] truncate">
              {title || 'Detalle de la Lección'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]/50 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Edición */}
        <div className="flex border-b border-[#e5e5ea] px-4 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video & Media</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cuestionario ({checkpointQuiz.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'resources'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Recursos ({resources.length})</span>
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1d1d1f]">
                  Título de la Lección
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1d1d1f]">
                    Duración Estimada
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ej: 15 min"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1d1d1f]">
                    Tipo de Transmisión
                  </label>
                  <select
                    value={videoType}
                    onChange={(e) => setVideoType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] bg-white cursor-pointer"
                  >
                    <option value="youtube">YouTube Embed</option>
                    <option value="local">Cloudflare R2 / Stream</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1d1d1f]">
                  URL del Video o Enlace Directo
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o URL de R2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              {/* Zona Drag & Drop Media Hub */}
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-dashed border-[#d1d1d6] text-center space-y-2">
                <Upload className="w-6 h-6 text-[#8e8e93] mx-auto" />
                <div className="text-xs font-bold text-[#1d1d1f]">
                  Subir video o archivo de clase a Cloudflare R2
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Arrastra aquí tu video MP4 o haz clic para seleccionarlo
                </p>
                <button
                  type="button"
                  onClick={() => alert('Selecciona tu archivo MP4 para subir a R2.')}
                  className="py-1.5 px-3 rounded-lg bg-white border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] hover:border-[#0071e3] transition-colors"
                >
                  Examinar archivos
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1d1d1f]">
                  Descripción y Objetivos de Aprendizaje
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica a los estudiantes qué aprenderán en esta clase..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1d1d1f]">Preguntas de Comprensión</h3>
                  <p className="text-[11px] text-[#8e8e93]">
                    Se presentarán al finalizar la lección para verificar la retención.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addQuizQuestion}
                  className="py-1.5 px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Pregunta</span>
                </button>
              </div>

              {checkpointQuiz.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8e8e93] bg-[#f5f5f7] rounded-xl p-4">
                  Esta lección aún no tiene preguntas de evaluación.
                </div>
              ) : (
                checkpointQuiz.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-4 rounded-xl border border-[#e5e5ea] bg-white space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#1d1d1f]">Pregunta {qIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeQuizQuestion(qIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => {
                        const updated = [...checkpointQuiz];
                        updated[qIdx].prompt = e.target.value;
                        setCheckpointQuiz(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#e5e5ea] text-xs"
                      placeholder="Enunciado de la pregunta..."
                    />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#8e8e93] uppercase">Opciones (Marca la correcta)</span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id || qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => {
                              const updated = [...checkpointQuiz];
                              updated[qIdx].correctIndex = optIdx;
                              setCheckpointQuiz(updated);
                            }}
                            className="accent-[#0071e3]"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...checkpointQuiz];
                              updated[qIdx].options[optIdx] = e.target.value;
                              setCheckpointQuiz(updated);
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-[#e5e5ea] rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1d1d1f]">Materiales y Enlaces</h3>
                  <p className="text-[11px] text-[#8e8e93]">Guías PDF, diapositivas y código de soporte.</p>
                </div>
                <button
                  type="button"
                  onClick={addResource}
                  className="py-1.5 px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Recurso</span>
                </button>
              </div>

              {resources.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8e8e93] bg-[#f5f5f7] rounded-xl p-4">
                  No hay materiales adjuntos en esta clase.
                </div>
              ) : (
                resources.map((res, rIdx) => (
                  <div key={res.id || rIdx} className="p-3.5 rounded-xl border border-[#e5e5ea] bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={res.title}
                        onChange={(e) => {
                          const updated = [...resources];
                          updated[rIdx].title = e.target.value;
                          setResources(updated);
                        }}
                        placeholder="Nombre del recurso..."
                        className="flex-1 font-bold text-xs border-b border-transparent focus:border-[#0071e3] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeResource(rIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-[#8e8e93] shrink-0" />
                      <input
                        type="text"
                        value={res.url || ''}
                        onChange={(e) => {
                          const updated = [...resources];
                          updated[rIdx].url = e.target.value;
                          setResources(updated);
                        }}
                        placeholder="URL de descarga o enlace..."
                        className="flex-1 px-2.5 py-1 text-xs border border-[#e5e5ea] rounded-md font-mono"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer del Drawer con botón de Guardado */}
        <div className="p-4 sm:p-5 border-t border-[#e5e5ea] bg-[#fafafa] flex items-center justify-between shrink-0">
          <div className="text-xs">
            {saveSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cambios guardados</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl border border-[#e5e5ea] bg-white hover:bg-neutral-100 text-xs font-semibold text-[#1d1d1f] transition-colors cursor-pointer min-h-[44px]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Lección</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
