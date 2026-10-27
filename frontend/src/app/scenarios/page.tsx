"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, MousePointerClick, RefreshCcw, Loader2, Sparkles, BookOpen, Layers, Lock, ChevronLeft } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Scenario, Metric, Course } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { normalizeCourse } from '@/lib/courseUtils';
import { verifyUserHasCourseLicense, generateCourseLicenseToken } from '@/lib/licenseUtils';

export default function ScenariosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#202230] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#6d28d2] animate-spin" />
        </div>
      }
    >
      <ScenariosContent />
    </Suspense>
  );
}

function ScenariosContent() {
  const searchParams = useSearchParams();
  const courseSlug = searchParams.get('course');
  const { user, effectiveIsAdmin, userLicenses, grantCourseLicense } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scenSnap, metSnap, courseSnap] = await Promise.all([
          get(ref(db, 'scenarios')),
          get(ref(db, 'metrics')),
          courseSlug ? get(ref(db, `courses/${courseSlug}`)) : Promise.resolve(null)
        ]);

        if (scenSnap.exists()) {
          const data = scenSnap.val();
          const loaded: Scenario[] = Object.keys(data).map(key => ({
            ...data[key],
            id: key
          }));

          // Filtrar por curso si se especificó el parámetro
          if (courseSlug) {
            const filtered = loaded.filter(s => !s.courseSlug || s.courseSlug === courseSlug);
            setScenarios(filtered.length > 0 ? filtered : loaded);
          } else {
            setScenarios(loaded);
          }
        }

        if (metSnap.exists()) {
          setMetricsMap(metSnap.val());
        }

        if (courseSnap && courseSnap.exists()) {
          const rawCourse = courseSnap.val();
          const normalized = normalizeCourse(rawCourse);
          setCourse(normalized);
        }
      } catch (err) {
        console.error("Error cargando escenarios:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseSlug]);

  const currentScenario = scenarios[currentIndex];
  const isFinished = currentIndex >= scenarios.length && scenarios.length > 0;

  const handleSelectOption = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
    setIsAnswered(true);

    const isCorrect = currentScenario.options.find(o => o.id === optionId)?.isCorrect;
    if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#202230] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6d28d2] animate-spin" />
      </div>
    );
  }

  // Verificación de Acceso y Licencia para el curso
  if (course) {
    const isDraft = course.visibility === 'draft' || course.published === false;
    const isPaid = course.accessType === 'paid';
    const hasLicense = verifyUserHasCourseLicense(course, userLicenses);
    const hasAccess = effectiveIsAdmin || (!isPaid && !isDraft) || hasLicense;

    if (isDraft && !effectiveIsAdmin) {
      return (
        <div className="min-h-screen bg-[#151726] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#202336] border border-[#2e334d] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                Curso en Preparación
              </span>
              <h1 className="text-xl font-extrabold text-white">
                Fase 2: {course.title}
              </h1>
              <p className="text-xs text-[#9da1bd] leading-relaxed">
                Este programa y sus simulaciones se encuentran actualmente en revisión técnica por la dirección académica.
              </p>
            </div>
            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-[#6d28d2] hover:bg-[#5b21b6] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Volver al Catálogo</span>
            </Link>
          </div>
        </div>
      );
    }

    if (isPaid && !hasAccess) {
      return (
        <div className="min-h-screen bg-[#151726] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#202336] border border-[#2e334d] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                Fase 2 • Acceso Restringido
              </span>
              <h1 className="text-xl font-extrabold text-white">
                {course.title}
              </h1>
              <p className="text-xs text-[#9da1bd] leading-relaxed">
                El entrenamiento de reflejo operativo y reconocimiento visual forma parte integral del programa formativo completo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#191b2c] border border-[#2c3047] text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9da1bd]">Matrícula del Programa</span>
                <span className="text-base font-black text-white">${course.price || 49} USD</span>
              </div>
              <p className="text-[11px] text-[#717696]">
                Incluye lecciones en alta definición, simulaciones operativas y certificado oficial.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isEnrolling}
                onClick={async () => {
                  setIsEnrolling(true);
                  try {
                    await grantCourseLicense(course.slug, course.licenseToken || generateCourseLicenseToken(course.slug));
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsEnrolling(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isEnrolling ? 'Procesando inscripción...' : 'Matricularme y Habilitar Simulaciones'}</span>
              </button>
              <Link
                href={`/course?id=${course.slug}`}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#c0c4fc] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Ver detalles del curso en el aula</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  if (scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-[#e9eaf2] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-[#d1d2e0] p-8 text-center space-y-4">
          <MousePointerClick className="w-12 h-12 text-[#9194ac] mx-auto" />
          <h2 className="text-2xl font-bold text-[#2a2b3f]">Aún no hay escenarios</h2>
          <p className="text-[#595c73] text-sm">
            {course ? `El curso "${course.title}" aún no tiene simulaciones configuradas.` : 'No hay prácticas visuales publicadas.'}
          </p>
          <Link 
            href={courseSlug ? `/course?id=${courseSlug}` : '/'} 
            className="inline-block mt-4 py-2 px-6 rounded-lg bg-[#6d28d2] text-white font-bold"
          >
            {courseSlug ? 'Volver al Curso' : 'Volver al Inicio'}
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#e9eaf2] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-[#d1d2e0] p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2a2b3f]">¡Simulación Completada!</h2>
            <p className="text-[#595c73] text-sm mt-1">
              Entrenamiento de reflejo operativo finalizado.
            </p>
            {course && (
              <span className="inline-block mt-2 px-3 py-1 bg-[#6d28d2]/10 text-[#6d28d2] text-xs font-bold rounded-full">
                {course.title}
              </span>
            )}
          </div>

          <div className="p-4 bg-[#f6f7f9] rounded-xl border border-[#d1d2e0] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#595c73]">Puntaje Obtenido</span>
            <span className="text-xl font-bold text-[#6d28d2]">{score} / {scenarios.length}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 border border-[#d1d2e0] bg-white text-[#2a2b3f] font-bold rounded-xl hover:bg-[#f6f7f9] flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Reiniciar</span>
            </button>
            <Link
              href={courseSlug ? `/course?id=${courseSlug}` : '/'}
              className="flex-1 py-3 bg-[#6d28d2] text-white font-bold rounded-xl hover:bg-[#5b21b6] text-center"
            >
              {courseSlug ? 'Volver al Curso' : 'Ir al Inicio'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const linkedMetric = currentScenario.metricId ? metricsMap[currentScenario.metricId] : null;

  return (
    <div className="min-h-screen bg-[#202230] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#2a2b3f] border-b border-[#3d4055] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={courseSlug ? `/course?id=${courseSlug}` : '/'}
            className="flex items-center gap-1.5 text-xs text-[#b7b9cd] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{courseSlug ? 'Volver al Aula' : 'Volver a la Web'}</span>
          </Link>
          <div className="h-4 w-px bg-[#3d4055]" />
          <div>
            <h1 className="text-sm font-bold flex items-center gap-2">
              <span>Fase 2: Reflejo Operativo</span>
              {course && (
                <span className="text-xs text-[#c0c4fc] font-normal truncate max-w-[200px] md:max-w-none">
                  — {course.title}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-[#202230] px-3 py-1 rounded-full border border-[#3d4055]">
            Escenario {currentIndex + 1} de {scenarios.length}
          </span>
          <span className="text-xs text-emerald-400 font-bold">
            Aciertos: {score}
          </span>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6 items-stretch">
        {/* Panel Izquierdo: Imagen del Escenario */}
        <div className="flex-1 bg-[#2a2b3f] rounded-2xl border border-[#3d4055] overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 bg-[#33364a] border-b border-[#3d4055] flex items-center justify-between">
            <span className="text-xs font-bold text-[#c0c4fc] uppercase tracking-wider">
              Captura de Pantalla Operativa
            </span>
            {linkedMetric && (
              <span className="text-xs text-purple-300 bg-purple-900/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Métrica: {linkedMetric.label}</span>
              </span>
            )}
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px]">
            <Image
              src={currentScenario.imageUrl}
              alt="Escenario"
              width={800}
              height={500}
              className="max-h-[500px] w-auto max-w-full object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Panel Derecho: Pregunta y Opciones */}
        <div className="w-full md:w-96 bg-[#2a2b3f] rounded-2xl border border-[#3d4055] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#b7b9cd] uppercase tracking-wider">Contexto</span>
              <p className="text-xs text-[#b7b9cd] mt-0.5 leading-relaxed">{currentScenario.context}</p>
            </div>

            <div className="pt-2 border-t border-[#3d4055]">
              <h3 className="text-sm font-bold text-white leading-snug">
                {currentScenario.question}
              </h3>
            </div>

            {/* Opciones */}
            <div className="space-y-2 pt-2">
              {currentScenario.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                let btnStyle = "border-[#3d4055] bg-[#33364a] text-white hover:border-[#6d28d2]";

                if (isAnswered) {
                  if (opt.isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-900/40 text-emerald-200";
                  } else if (isSelected && !opt.isCorrect) {
                    btnStyle = "border-rose-500 bg-rose-900/40 text-rose-200";
                  } else {
                    btnStyle = "border-[#3d4055] bg-[#33364a] opacity-50";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={isAnswered}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt.text}</span>
                    {isAnswered && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !opt.isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explicación si ya se respondió */}
            {isAnswered && currentScenario.explanation && (
              <div className="p-3 bg-[#202230] rounded-xl border border-[#3d4055] text-xs text-[#b7b9cd] leading-relaxed animate-in fade-in">
                <strong className="text-white block mb-0.5">Fundamento Zootécnico:</strong>
                {currentScenario.explanation}
              </div>
            )}
          </div>

          {/* Botón Siguiente */}
          {isAnswered && (
            <button
              onClick={handleNext}
              className="w-full mt-4 py-3 bg-[#6d28d2] text-white font-bold rounded-xl hover:bg-[#5b21b6] transition-all shadow-lg animate-in fade-in"
            >
              {currentIndex < scenarios.length - 1 ? 'Siguiente Escenario →' : 'Ver Resultado Final'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
