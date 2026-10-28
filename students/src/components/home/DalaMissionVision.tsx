'use client';

import React from 'react';
import { Target, Compass, Sparkles, Shield, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function DalaMissionVision() {
  return (
    <section id="mision-vision" className="relative py-28 px-6 z-10 border-t border-[#ffffff]/10 bg-[#000000]">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Encabezado de Sección */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb829] font-mono">
            Propósito y Dirección Estratégica
          </span>
          <h2 className="text-[40px] sm:text-[54px] md:text-[62px] font-normal text-white leading-[1.05] tracking-[-0.04em]">
            Misión y Visión
          </h2>
          <p className="text-[16px] sm:text-[18px] font-extralight text-[#bdbdbd] leading-relaxed">
            El propósito transformador que define el rumbo formativo y tecnológico de Ivan Perez Tech (IPT).
          </p>
        </div>

        {/* Dos Contenedores Rectangulares con IDs para el cálculo físico del Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Tarjeta 1: MISIÓN (id="mision-card") */}
          <div
            id="mision-card"
            className="relative z-10 p-8 sm:p-10 rounded-[28px] bg-[#09090b] border border-[#ffffff]/15 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-[#8052ff]/40"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#8052ff]/15 border border-[#8052ff]/30 flex items-center justify-center text-[#8052ff]">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9a9a9a] px-3 py-1 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10">
                  Pilar Fundamental
                </span>
              </div>

              <div>
                <h3 className="text-[28px] sm:text-[34px] font-normal text-white tracking-[-0.03em] mb-4">
                  Nuestra Misión
                </h3>
                <p className="text-[15px] sm:text-[16px] font-extralight text-[#d1d5db] leading-[1.7]">
                  Romper el paradigma de los sistemas de educación convencional y poder transmitir información, formación y conocimiento a través de la web al 100%.
                </p>
              </div>

              <div className="pt-4 border-t border-[#ffffff]/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#9a9a9a]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#8052ff] shrink-0" />
                  <span>Ruptura del paradigma tradicional</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#15846e] shrink-0" />
                  <span>Transmisión 100% a través de la web</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#8052ff] hover:text-white transition-colors"
              >
                <span>Explorar campus de estudio</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Tarjeta 2: VISIÓN (id="vision-card") */}
          <div
            id="vision-card"
            className="relative z-10 p-8 sm:p-10 rounded-[28px] bg-[#09090b] border border-[#ffffff]/15 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-[#8052ff]/40"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#ffb829]/15 border border-[#ffb829]/30 flex items-center justify-center text-[#ffb829]">
                  <Compass className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#9a9a9a] px-3 py-1 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10">
                  Horizonte Estratégico
                </span>
              </div>

              <div>
                <h3 className="text-[28px] sm:text-[34px] font-normal text-white tracking-[-0.03em] mb-4">
                  Nuestra Visión
                </h3>
                <p className="text-[15px] sm:text-[16px] font-extralight text-[#d1d5db] leading-[1.7]">
                  Consolidar a IPT Academy como la institución digital referente en formación técnica y arquitectura de sistemas en Iberoamérica, democratizando el acceso a estándares de ingeniería nivel Big Tech, auditoría de código rigurosa y soberanía tecnológica para la próxima generación de constructores de software.
                </p>
              </div>

              <div className="pt-4 border-t border-[#ffffff]/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#9a9a9a]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ffb829] shrink-0" />
                  <span>Estándar Big Tech</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#8052ff] shrink-0" />
                  <span>Soberanía y autonomía</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[#ffb829] hover:text-white transition-colors"
              >
                <span>Formar parte del ecosistema</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
