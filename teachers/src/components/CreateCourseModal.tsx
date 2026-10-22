'use client';

import React, { useState } from 'react';
import { X, BookOpen, Plus, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { Course, ProgressionMode, EvaluationModel } from '@/types';
import { generateCourseLicenseToken } from '@/lib/licenseUtils';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCourse: (course: Course) => Promise<void>;
}

export default function CreateCourseModal({
  isOpen,
  onClose,
  onCreateCourse,
}: CreateCourseModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Formación Profesional');
  const [level, setLevel] = useState('Intermedio');
  const [evaluationModel, setEvaluationModel] = useState<EvaluationModel>('free');
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>('lesson_strict');
  const [visibility, setVisibility] = useState<'public' | 'draft'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const cleanSlug = title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `curso-${Date.now()}`;

    const newCourse: Course = {
      slug: cleanSlug,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Programa de formación técnica y profesional.',
      description: 'Aprende los conceptos fundamentales y aplicaciones prácticas con ejercicios interactivos.',
      thumbnail: '',
      instructor: {
        name: 'IPT Course',
        role: 'Instructor Principal',
        avatar: '/favicon.png',
      },
      category,
      level,
      rating: 5.0,
      ratingsCount: 0,
      published: visibility === 'public',
      visibility,
      evaluationModel,
      progressionMode,
      approxHours: '12 horas',
      licenseToken: generateCourseLicenseToken(cleanSlug),
      modules: [
        {
          id: `mod-${Date.now()}`,
          title: 'Módulo 1: Fundamentos y Conceptos Clave',
          description: 'Bases teóricas y preparación del entorno de trabajo.',
          order: 1,
          lessons: [
            {
              id: `les-${Date.now()}`,
              title: '1.1 Bienvenida y Objetivos del Curso',
              description: 'Introducción a los contenidos que desarrollaremos en el programa.',
              order: 1,
              videoType: 'youtube',
              videoUrl: '',
              duration: '10 min',
              checkpointQuiz: [],
              resources: [],
            },
          ],
        },
      ],
    };

    try {
      await onCreateCourse(newCourse);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#e5e5ea] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-[#fafafa] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">
                Crear Nuevo Curso
              </h2>
              <p className="text-[11px] text-[#8e8e93]">
                Define la estructura y modelo de evaluación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f]">
              Título del Curso <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Arquitectura de Software e IA Aplicada"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f]">
              Subtítulo o Resumen Breve
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ej: Domina el desarrollo de soluciones escalables..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1d1d1f]">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] bg-white cursor-pointer"
              >
                <option value="Formación Profesional">Formación Profesional</option>
                <option value="Ingeniería y Tecnología">Ingeniería y Tecnología</option>
                <option value="Inteligencia Artificial">Inteligencia Artificial</option>
                <option value="Diseño y Producto">Diseño y Producto</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1d1d1f]">Nivel</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] bg-white cursor-pointer"
              >
                <option value="Todos los niveles">Todos los niveles</option>
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </select>
            </div>
          </div>

          {/* Estructura de Evaluación */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-[#1d1d1f]">
              Estructura de Evaluación de Tareas
            </label>
            <select
              value={evaluationModel}
              onChange={(e) => setEvaluationModel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] bg-white cursor-pointer"
            >
              <option value="free">Libre / Continua (Sin cortes - Cursos online)</option>
              <option value="modular">Por Módulos del Curso</option>
              <option value="periodic">Por Periodos / Meses</option>
              <option value="academic_cuts">Cortes Universitarios (Corte 1, 2, 3)</option>
            </select>
            <p className="text-[11px] text-[#8e8e93]">
              En evaluación libre, las notas no se encasillan en cortes semestrales y se promedian de forma continua.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1d1d1f]">Avance de Clases</label>
              <select
                value={progressionMode}
                onChange={(e) => setProgressionMode(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] bg-white cursor-pointer"
              >
                <option value="lesson_strict">Estricto por Lección</option>
                <option value="module_strict">Estricto por Módulo</option>
                <option value="free">Libre (Sin bloqueos)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1d1d1f]">Visibilidad Inicial</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] bg-white cursor-pointer"
              >
                <option value="public">Público (Visible)</option>
                <option value="draft">Borrador (Oculto)</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-4 border-t border-[#e5e5ea] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-[#e5e5ea] bg-white hover:bg-neutral-100 text-xs font-semibold text-[#1d1d1f] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="py-2.5 px-5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creando...' : 'Crear Programa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
