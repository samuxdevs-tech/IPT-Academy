'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Laptop,
  MessageSquare,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Play
} from 'lucide-react';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import Link from 'next/link';
import { useLoginTransition } from '@/context/LoginTransitionContext';

export default function DalaHeroArchitecturePreview() {
  const { handleAuthAction } = useLoginTransition();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const studySteps = [
    {
      id: 0,
      title: 'Ver las clases',
      detail: 'Videos explicados paso a paso',
      icon: Video,
      color: 'text-[#8052ff]',
      bgColor: 'bg-[#8052ff]/15',
      borderColor: 'border-[#8052ff]/40',
      activeColor: 'border-[#8052ff] bg-[#8052ff]/20 shadow-[0_0_24px_rgba(128,82,255,0.35)]',
      stateText: 'Listo para ver'
    },
    {
      id: 1,
      title: 'Hacer la práctica',
      detail: 'Ejercicios directo en la pantalla',
      icon: Laptop,
      color: 'text-[#ffb829]',
      bgColor: 'bg-[#ffb829]/15',
      borderColor: 'border-[#ffb829]/40',
      activeColor: 'border-[#ffb829] bg-[#ffb829]/20 shadow-[0_0_24px_rgba(255,184,41,0.35)]',
      stateText: 'En el navegador'
    },
    {
      id: 2,
      title: 'Resolver dudas',
      detail: 'Apoyo directo de tus profesores',
      icon: MessageSquare,
      color: 'text-[#15846e]',
      bgColor: 'bg-[#15846e]/15',
      borderColor: 'border-[#15846e]/40',
      activeColor: 'border-[#15846e] bg-[#15846e]/20 shadow-[0_0_24px_rgba(21,132,110,0.35)]',
      stateText: 'Acompañamiento'
    },
    {
      id: 3,
      title: 'Obtener tu diploma',
      detail: 'Certificado oficial al finalizar',
      icon: Award,
      color: 'text-[#60a5fa]',
      bgColor: 'bg-[#60a5fa]/15',
      borderColor: 'border-[#60a5fa]/40',
      activeColor: 'border-[#60a5fa] bg-[#60a5fa]/20 shadow-[0_0_24px_rgba(96,165,250,0.35)]',
      stateText: 'Validez oficial'
    },
  ];

  const simulationStates = [
    {
      label: '1. Mirando la lección de hoy',
      message: 'Aprendiendo con explicaciones claras y ejemplos prácticos.',
      stepNumber: 'Paso 1 de 4'
    },
    {
      label: '2. Realizando el ejercicio en vivo',
      message: 'Practicando en la pantalla sin instalar programas en tu equipo.',
      stepNumber: 'Paso 2 de 4'
    },
    {
      label: '3. Recibiendo orientación del docente',
      message: 'Tu profesor y tus compañeros te guían en cada avance.',
      stepNumber: 'Paso 3 de 4'
    },
    {
      label: '4. Avance completado y guardado',
      message: 'Tus notas se registran y tu certificado se prepara automáticamente.',
      stepNumber: 'Paso 4 de 4'
    },
  ];

  const currentSim = simulationStates[activeStep];

  return (
    <div className="relative w-full max-w-[480px] p-6 rounded-[28px] bg-[#09090b]/95 border border-[#ffffff]/15 shadow-2xl backdrop-blur-xl space-y-5 animate-fade-in text-white">
      {/* Resplandor ambiental suave */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#8052ff]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera: Clara, acogedora y sin tecnicismos */}
      <div className="flex items-center justify-between pb-4 border-b border-[#ffffff]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#8052ff]/20 border border-[#8052ff]/40 flex items-center justify-center text-[#ffb829] shadow-sm">
            <IptLogoIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-tight">
                Así se estudia en IPT Academy
              </span>
              <span className="w-2 h-2 rounded-full bg-[#15846e] animate-pulse" />
            </div>
            <p className="text-xs text-[#9a9a9a]">
              A tu propio ritmo y 100% por internet
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-[#15846e]/20 border border-[#15846e]/30 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Aula Activa
        </span>
      </div>

      {/* Las 4 Etapas del Aprendizaje */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[#bdbdbd] px-1 font-medium">
          <span>Tu camino paso a paso:</span>
          <span className="text-[#8052ff] font-semibold">Fácil y guiado</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {studySteps.map((step) => {
            const isHighlight = activeStep === step.id;
            const IconComponent = step.icon;
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                  isHighlight
                    ? step.activeColor
                    : 'bg-[#121217] border-[#ffffff]/10 hover:border-[#ffffff]/25'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${step.bgColor} ${step.color}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isHighlight
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-white/5 text-[#9a9a9a]'
                    }`}
                  >
                    {step.stateText}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5">{step.title}</h4>
                <p className="text-[11px] text-[#9a9a9a] leading-tight font-light">
                  {step.detail}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visor de Experiencia del Alumno (Sustituye la consola técnica) */}
      <div className="p-4 rounded-2xl bg-[#121217] border border-[#ffffff]/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ffb829] animate-ping" />
            <span className="font-bold text-white">{currentSim.label}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#8052ff] bg-[#8052ff]/15 px-2 py-0.5 rounded-full">
            {currentSim.stepNumber}
          </span>
        </div>

        <p className="text-xs text-[#d1d5db] leading-relaxed">
          {currentSim.message}
        </p>

        {/* Barra de Avance Suave */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-[#9a9a9a] mb-1.5">
            <span>Progreso del tema</span>
            <span className="text-white font-bold">{(activeStep + 1) * 25}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#ffffff]/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8052ff] via-[#a855f7] to-[#ffb829] transition-all duration-500 rounded-full"
              style={{ width: `${(activeStep + 1) * 25}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pie: Tranquilidad y Facilidad de Uso */}
      <div className="flex items-center justify-between pt-1 px-1 text-xs text-[#9a9a9a]">
        <span className="flex items-center gap-1.5 text-[#15846e] font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#15846e]" />
          <span>Tu avance se guarda automáticamente</span>
        </span>
        <button
          type="button"
          onClick={() => handleAuthAction('/home')}
          className="text-[#8052ff] hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Probar campus</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
