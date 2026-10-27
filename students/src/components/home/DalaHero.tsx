'use client';

import React from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { ArrowRight, Play, Sparkles, BookOpen, Clock, ShieldCheck } from 'lucide-react';

interface DalaHeroProps {
  freeCourse: Course | null;
}

export default function DalaHero({ freeCourse }: DalaHeroProps) {
  const courseSlug = freeCourse?.slug || 'introduccion-ingenieria-ipt';
  const courseTitle = freeCourse?.title || 'Fundamentos de Arquitectura de Software e Ingeniería';
  const courseDescription =
    freeCourse?.description ||
    'Inicia tu formación técnica conociendo los principios de diseño de sistemas modernos, patrones distribuidos y metodologías operativas reales.';
  const totalLessons =
    freeCourse?.lessons?.length ||
    freeCourse?.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) ||
    8;

  return (
    <section
      id="curso-liberado"
      className="relative min-h-[92vh] flex items-center pt-28 pb-16 px-6 z-10"
    >
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Monolithic Typographic Statement + Free Course Gateway */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Micro-label Saffron Spark */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ffb829] animate-pulse" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#ffb829]">
              Curso Liberado · Acceso de Prueba Inmediato
            </span>
          </div>

          {/* Monolithic Headline — Weight 400, Massive Scale, Negative Tracking */}
          <h1 className="text-[52px] sm:text-[68px] md:text-[86px] lg:text-[94px] font-normal text-white leading-[0.96] tracking-[-0.04em] mb-8">
            Aprende operando sistemas reales.
          </h1>

          {/* Ultra-light Weight 200 Body Copy */}
          <p className="text-[17px] sm:text-[18px] font-extralight text-[#ffffff] leading-[1.55] max-w-[560px] mb-10">
            La plataforma de formación técnica avanzada donde adquieres maestría práctica
            a través de software en vivo, retroalimentación docente continua y resolución
            de problemas en entornos de producción.
          </p>

          {/* Spotlight Gateway for the Free / Trial Course — Solid Surface for Pure Legibility */}
          <div className="relative z-10 p-6 sm:p-8 rounded-[24px] bg-[#09090b] border border-[#ffffff]/15 shadow-2xl max-w-[580px] hover:border-[#8052ff]/50 transition-colors">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8052ff] bg-[#8052ff]/15 px-3 py-1 rounded-full border border-[#8052ff]/25">
                Puerta de Entrada Oficial
              </span>
              <div className="flex items-center gap-3 text-[12px] text-[#9a9a9a] font-light">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {totalLessons} lecciones
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Acceso libre
                </span>
              </div>
            </div>

            <h2 className="text-[22px] sm:text-[24px] font-normal text-white tracking-[-0.02em] mb-2">
              {courseTitle}
            </h2>
            <p className="text-[14px] font-extralight text-[#bdbdbd] leading-relaxed mb-6">
              {courseDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href={`/course?course=${encodeURIComponent(courseSlug)}`}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[14px] font-semibold uppercase tracking-[0.025em] transition-all hover:shadow-[0_0_24px_rgba(128,82,255,0.45)] group"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Comenzar Lección 1 Ahora</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className="text-[12px] font-light text-[#9a9a9a] text-center sm:text-left">
                Sin tarjeta requerida · Acceso inmediato
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Spatial Clearing for the Interactive Particle Constellation */}
        <div className="lg:col-span-5 hidden lg:flex items-center justify-center min-h-[500px]">
          {/* Subtle atmospheric vignette anchor */}
          <div className="relative w-full max-w-[420px] aspect-square rounded-full flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 rounded-full bg-radial from-[#8052ff]/10 via-[#15846e]/5 to-transparent blur-3xl opacity-60" />
            <div className="relative text-center p-8 text-[#bdbdbd]/40 text-[12px] uppercase tracking-[0.08em] font-light">
              Constelación de Conocimiento IPT
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
