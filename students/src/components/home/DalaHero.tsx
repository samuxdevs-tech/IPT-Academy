'use client';

import React from 'react';
import Link from 'next/link';
import { Play, ArrowRight, BookOpen } from 'lucide-react';
import { Course } from '@/types';
import DalaHeroArchitecturePreview from '@/components/home/DalaHeroArchitecturePreview';

interface DalaHeroProps {
  freeCourse: Course | null;
}

export default function DalaHero({ freeCourse }: DalaHeroProps) {
  const trialSlug = freeCourse?.slug || 'introduccion-ingenieria-ipt';

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-6 py-20 z-10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Editorial Headline & Actions */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Section Marker */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ffb829] animate-pulse" />
            <span className="text-[12px] uppercase tracking-[0.06em] font-semibold text-[#ffb829] font-mono">
              Curso Liberado · Acceso de Prueba Inmediato
            </span>
          </div>

          {/* Monumental Headline */}
          <h1 className="text-[52px] sm:text-[72px] md:text-[84px] font-normal text-white leading-[0.98] tracking-[-0.04em] mb-8">
            Aprende operando <br />
            <span className="text-[#ffffff]">sistemas reales.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] sm:text-[19px] font-extralight text-[#bdbdbd] leading-[1.5] max-w-[560px] mb-10">
            La plataforma de formación técnica avanzada donde adquieres maestría práctica a través de
            software en vivo, retroalimentación docente continua y resolución de problemas en
            entornos de producción.
          </p>

          {/* Free Trial Hero Card & Campus Direct Link */}
          <div className="relative p-7 sm:p-8 rounded-[24px] bg-[#09090b] border border-[#ffffff]/15 max-w-[520px] backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#8052ff]/20 text-[#8052ff] text-[11px] font-semibold uppercase tracking-[0.05em] border border-[#8052ff]/30">
                Puerta de Entrada Oficial
              </span>
              <div className="flex items-center gap-4 text-[12px] text-[#9a9a9a] font-light">
                <span>18 lecciones</span>
                <span>Acceso libre</span>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] sm:text-[22px] font-normal text-white tracking-[-0.02em] mb-2">
                IPT Master: Arquitectura de Software e Inteligencia Artificial
              </h3>
              <p className="text-[13px] font-extralight text-[#bdbdbd] leading-relaxed font-light">
                Aprende a diseñar sistemas distribuidos, microservicios y aplicaciones de producción con los estándares de IPT.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                href={`/course?slug=${trialSlug}&lesson=1`}
                className="group px-6 py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[13px] font-semibold flex items-center justify-center gap-2.5 transition-all shadow-[0_0_25px_rgba(128,82,255,0.45)] hover:shadow-[0_0_35px_rgba(128,82,255,0.6)] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Comenzar Lección 1 Ahora</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/home"
                className="px-5 py-3.5 rounded-[24px] bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-all border border-[#ffffff]/15 hover:border-[#ffffff]/30 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#8052ff]" />
                <span>Entrar al Campus (/home)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Visual de Arquitectura de Sistemas en Tiempo Real */}
        <div className="lg:col-span-5 flex items-center justify-center min-h-[460px]">
          <DalaHeroArchitecturePreview />
        </div>
      </div>
    </section>
  );
}
