"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, MousePointerClick, RefreshCcw, Loader2, Sparkles, Lock, ChevronLeft, Home } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Scenario, Metric, Course } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { normalizeCourse } from '@/lib/courseUtils';
import { verifyUserHasCourseLicense, generateCourseLicenseToken } from '@/lib/licenseUtils';

interface NormalizedOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export default function ScenariosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#ffffff] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-[#0f0f0f] animate-spin" />
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
  const { effectiveIsAdmin, userLicenses, grantCourseLicense } = useAuth();

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
          get(ref(db, 'scenarios')).catch(() => null),
          get(ref(db, 'metrics')).catch(() => null),
          courseSlug ? get(ref(db, `courses/${courseSlug}`)).catch(() => null) : Promise.resolve(null)
        ]);

        if (scenSnap && scenSnap.exists()) {
          const data = scenSnap.val();
          const loaded: Scenario[] = Object.keys(data).map(key => ({
            ...data[key],
            id: key
          }));

          if (courseSlug) {
            const filtered = loaded.filter(s => !s.courseSlug || s.courseSlug === courseSlug);
            setScenarios(filtered.length > 0 ? filtered : loaded);
          } else {
            setScenarios(loaded);
          }
        }

        if (metSnap && metSnap.exists()) {
          setMetricsMap(metSnap.val());
        }

        if (courseSnap && courseSnap.exists()) {
          const rawCourse = courseSnap.val();
          const normalized = normalizeCourse(rawCourse);
          setCourse(normalized);
        }
      } catch {
        // Silencioso
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseSlug]);

  const currentScenario = scenarios[currentIndex];
  const isFinished = currentIndex >= scenarios.length && scenarios.length > 0;

  const nodes = Array.isArray(currentScenario?.nodes) ? currentScenario.nodes : [];
  const hasNodes = nodes.length > 0;
  const activeNode = hasNodes ? nodes[0] : null;

  const rawOptions = activeNode?.options || currentScenario?.options || [];
  const normalizedOptions: NormalizedOption[] = useMemo(() => {
    const list = Array.isArray(rawOptions) ? rawOptions : Object.values(rawOptions || {});
    return list.map((opt: any, idx: number): NormalizedOption => ({
      id: String(opt.id || idx),
      text: String(opt.label || opt.text || `Opción ${idx + 1}`),
      isCorrect: Boolean(opt.isOptimal ?? opt.isCorrect ?? false),
      feedback: String(opt.feedback || currentScenario?.explanation || ''),
    }));
  }, [rawOptions, currentScenario?.explanation]);

  const activeQuestion =
    activeNode?.situation ||
    currentScenario?.question ||
    '¿Qué decisión técnica o de gestión tomas ante esta situación?';
  const activeContext =
    currentScenario?.description ||
    currentScenario?.context ||
    activeNode?.title ||
    'Caso práctico de aplicación profesional.';
  const activeExplanation =
    currentScenario?.explanation ||
    (nodes[0]?.options as any[])?.find((o: any) => o.isOptimal)?.feedback ||
    '';

  const handleSelectOption = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
    setIsAnswered(true);

    const isCorrect = normalizedOptions.find((o: NormalizedOption) => o.id === optionId)?.isCorrect;
    if (isCorrect) setScore((prev) => prev + 1);
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
      <div className="flex-1 bg-[#ffffff] flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-[#0f0f0f] animate-spin" />
      </div>
    );
  }

  if (course) {
    const isDraft = course.visibility === 'draft' || course.published === false;
    const isPaid = course.accessType === 'paid';
    const hasLicense = verifyUserHasCourseLicense(course, userLicenses);
    const hasAccess = effectiveIsAdmin || (!isPaid && !isDraft) || hasLicense;

    if (isDraft && !effectiveIsAdmin) {
      return (
        <div className="flex-1 bg-[#ffffff] text-[#0f0f0f] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#f2f2f2] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-[#606060]" />
            </div>
            <h1 className="text-lg font-bold text-[#0f0f0f]">
              {course.title}
            </h1>
            <p className="text-xs text-[#606060] leading-relaxed">
              Este curso y sus casos prácticos se encuentran actualmente en preparación.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-full bg-[#0f0f0f] text-white text-xs font-semibold"
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
        <div className="flex-1 bg-[#ffffff] text-[#0f0f0f] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#f2f2f2] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-[#0f0f0f]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-[#0f0f0f]">{course.title}</h1>
              <p className="text-xs text-[#606060] leading-relaxed">
                Los casos prácticos interactivos forman parte del curso completo.
              </p>
            </div>
            <button
              type="button"
              disabled={isEnrolling}
              onClick={async () => {
                setIsEnrolling(true);
                try {
                  await grantCourseLicense(course.slug, course.licenseToken || generateCourseLicenseToken(course.slug));
                } finally {
                  setIsEnrolling(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isEnrolling ? 'Procesando...' : 'Habilitar Casos Prácticos'}
            </button>
          </div>
        </div>
      );
    }
  }

  if (scenarios.length === 0) {
    return (
      <div className="flex-1 bg-[#ffffff] flex items-center justify-center p-6">
        <div className="bg-[#fafafa] max-w-md w-full rounded-2xl border border-[#e5e5e5] p-8 text-center space-y-4">
          <MousePointerClick className="w-10 h-10 text-[#606060] mx-auto" />
          <h2 className="text-base font-bold text-[#0f0f0f]">Aún no hay casos prácticos publicados</h2>
          <p className="text-[#606060] text-xs">
            {course ? `El curso "${course.title}" aún no tiene ejercicios interactivos configurados.` : 'Próximamente encontrarás aquí casos prácticos interactivos.'}
          </p>
          <Link
            href={courseSlug ? `/course?course=${courseSlug}` : '/'}
            className="inline-block py-2 px-5 rounded-full bg-[#0f0f0f] text-white text-xs font-semibold"
          >
            {courseSlug ? 'Volver a la Clase' : 'Volver al Inicio'}
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex-1 bg-[#ffffff] flex items-center justify-center p-6">
        <div className="bg-[#fafafa] max-w-md w-full rounded-2xl border border-[#e5e5e5] p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f0f0f]">¡Práctica Completada!</h2>
            <p className="text-[#606060] text-xs mt-1">
              Has respondido todos los casos prácticos disponibles.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#e5e5e5] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#606060]">Puntaje Obtenido</span>
            <span className="text-lg font-bold text-[#0f0f0f]">{score} / {scenarios.length}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-2.5 border border-[#ccc] bg-white text-[#0f0f0f] text-xs font-semibold rounded-full hover:bg-[#f2f2f2] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
            <Link
              href={courseSlug ? `/course?course=${courseSlug}` : '/'}
              className="flex-1 py-2.5 bg-[#0f0f0f] text-white text-xs font-semibold rounded-full hover:bg-[#272727] text-center"
            >
              {courseSlug ? 'Volver a la Clase' : 'Ir al Inicio'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const linkedMetric = currentScenario.metricId ? metricsMap[currentScenario.metricId] : null;

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-5">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Casos Prácticos</span>
        </nav>

        <div className="bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#0f0f0f]">
              Casos Prácticos Interactivos {course ? `· ${course.title}` : ''}
            </h1>
            <p className="text-xs text-[#606060]">
              Observa la imagen del caso y elige la respuesta correcta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-[#f2f2f2] px-3 py-1 rounded-full text-[#0f0f0f]">
              Caso {currentIndex + 1} de {scenarios.length}
            </span>
            <span className="text-xs text-emerald-700 font-bold">
              Aciertos: {score}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#0f0f0f] rounded-2xl overflow-hidden border border-[#e5e5e5]">
            <div className="px-4 py-3 bg-[#f9f9f9] border-b border-[#e5e5e5] flex items-center justify-between text-[#0f0f0f]">
              <span className="text-xs font-bold">Imagen del Caso</span>
              {linkedMetric && (
                <span className="text-xs text-[#0f0f0f] bg-[#f2f2f2] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Parámetro: {linkedMetric.label}</span>
                </span>
              )}
            </div>

            <div className="relative bg-black flex items-center justify-center min-h-[320px]">
              {currentScenario?.imageUrl ? (
                <Image
                  src={currentScenario.imageUrl}
                  alt="Escenario"
                  width={800}
                  height={500}
                  className="max-h-[480px] w-auto max-w-full object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-white/80 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-sm font-bold max-w-md text-white/90">
                    {currentScenario?.title || 'Simulación de Caso Práctico'}
                  </p>
                  {currentScenario?.category && (
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30">
                      {currentScenario.category}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-[#606060] uppercase">Contexto</span>
              <p className="text-xs text-[#0f0f0f] mt-1 leading-relaxed">{activeContext}</p>
            </div>

            <div className="pt-3 border-t border-[#f0f0f0]">
              <h3 className="text-sm font-bold text-[#0f0f0f] leading-snug">
                {activeQuestion}
              </h3>
            </div>

            <div className="space-y-2 pt-1">
              {normalizedOptions.map((opt: NormalizedOption) => {
                const isSelected = selectedOption === opt.id;
                let btnStyle = "border-[#e5e5e5] bg-[#f9f9f9] text-[#0f0f0f] hover:bg-[#f2f2f2]";

                if (isAnswered) {
                  if (opt.isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                  } else if (isSelected && !opt.isCorrect) {
                    btnStyle = "border-rose-500 bg-rose-50 text-rose-900";
                  } else {
                    btnStyle = "border-[#e5e5e5] bg-[#f9f9f9] opacity-50";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={isAnswered}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{opt.text}</span>
                    {isAnswered && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {isAnswered && isSelected && !opt.isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && (normalizedOptions.find((o: NormalizedOption) => o.id === selectedOption)?.feedback || activeExplanation) && (
              <div className="p-3.5 bg-[#f9f9f9] rounded-xl border border-[#e5e5e5] text-xs text-[#0f0f0f] leading-relaxed">
                <strong className="block mb-1">Explicación y Retroalimentación:</strong>
                {normalizedOptions.find((o: NormalizedOption) => o.id === selectedOption)?.feedback || activeExplanation}
              </div>
            )}

            {isAnswered && (
              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-[#0f0f0f] text-white text-xs font-semibold rounded-full hover:bg-[#272727] transition-all cursor-pointer"
              >
                {currentIndex < scenarios.length - 1 ? 'Siguiente Caso →' : 'Ver Resultado Final'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
