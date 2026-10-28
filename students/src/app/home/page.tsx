'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLms } from '@/context/LmsContext';
import { Course } from '@/types';
import DalaQuantumGridBackground from '@/components/home/DalaQuantumGridBackground';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import {
  Play,
  ArrowRight,
  Sparkles,
  Video,
  LogOut,
  Layers,
  ArrowLeft,
  Shield,
  Star,
  CheckCircle2,
  RefreshCw,
  Compass
} from 'lucide-react';

interface SpecializationItem {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  lessonsCount: number;
  isFreePublic?: boolean;
}

const SYSTEM_COURSES: SpecializationItem[] = [
  {
    slug: 'introduccion-ingenieria-ipt',
    title: 'Fundamentos de Arquitectura de Software e Ingeniería',
    subtitle: 'Curso Liberado · Acceso Libre',
    description:
      'Aprende los principios estructurales del software moderno, separación de responsabilidades y metodologías de diseño escalable sin costo.',
    category: 'Ingeniería de Software',
    lessonsCount: 18,
    isFreePublic: true,
  },
  {
    slug: 'ipt-master-fullstack',
    title: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    subtitle: 'Especialización Avanzada 1',
    description:
      'Construcción de aplicaciones distribuidas modernas, bases de datos reactivas, micro-frontends y despliegues serverless de alta concurrencia.',
    category: 'Ingeniería de Software',
    lessonsCount: 24,
  },
  {
    slug: 'arquitectura-cloud-ipt',
    title: 'Arquitectura Cloud Resiliente y Microservicios',
    subtitle: 'Especialización Avanzada 2',
    description:
      'Topologías de alta disponibilidad, orquestación de contenedores, balanceo de carga en producción y recuperación ante desastres.',
    category: 'Cloud & DevOps',
    lessonsCount: 20,
  },
  {
    slug: 'sistemas-distribuidos-ipt',
    title: 'Sistemas Distribuidos y Procesamiento de Eventos',
    subtitle: 'Especialización Avanzada 3',
    description:
      'Patrones de consistencia eventual, colas de mensajería con idempotencia, streaming reactivo y telemetría de observabilidad en tiempo real.',
    category: 'Sistemas Distribuidos',
    lessonsCount: 22,
  },
];

export default function StudentCampusPage() {
  const { user, logout } = useAuth();
  const { subscription, entitlements, openPricingModal } = useSubscription();
  const { courses } = useLms();

  // Detectar el plan del usuario de manera estricta y automática según su cuenta
  const currentPlanId = useMemo<'free' | 'pro' | 'pro_plus' | 'your_plan'>(() => {
    if (!subscription || !subscription.planId) {
      if (entitlements.campusTheme === 'campus-pro-plus') return 'pro_plus';
      if (entitlements.campusTheme === 'campus-pro') return 'pro';
      if (entitlements.campusTheme === 'campus-enterprise') return 'your_plan';
      return 'free';
    }
    return subscription.planId;
  }, [subscription, entitlements.campusTheme]);

  // Catálogo disponible para el usuario según su membresía
  const userCourses = useMemo<SpecializationItem[]>(() => {
    if (currentPlanId === 'free') {
      return SYSTEM_COURSES.filter((c) => c.isFreePublic);
    }
    if (currentPlanId === 'pro') {
      // 1 curso dinámico activo (por defecto Fullstack o el que tenga seleccionado en la suscripción)
      const activeSlug =
        subscription?.activeDynamicCourseSlugs?.[0] || 'ipt-master-fullstack';
      const found = SYSTEM_COURSES.find((c) => c.slug === activeSlug);
      return found ? [found] : [SYSTEM_COURSES[1]];
    }
    if (currentPlanId === 'pro_plus') {
      // 3 especializaciones simultáneas completas
      return SYSTEM_COURSES.filter((c) => !c.isFreePublic);
    }
    // Your Plan: Plan a la medida
    return [
      {
        slug: 'programa-personalizado-ipt',
        title: 'Programa Especializado y Mentoría a la Medida',
        subtitle: 'Your Plan · Itinerario Técnico Personalizado',
        description:
          'Sesiones 1 a 1 de arquitectura, revisión de código orientada a tus requerimientos individuales y acompañamiento directo de ingeniería.',
        category: 'Mentoría Especializada',
        lessonsCount: 16,
      },
      ...SYSTEM_COURSES.filter((c) => !c.isFreePublic),
    ];
  }, [currentPlanId, subscription]);

  // Índice de curso seleccionado (para Pro+ y Your Plan con múltiples especializaciones activas)
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);

  // Asegurar que el índice esté dentro del rango si cambia la lista
  useEffect(() => {
    if (selectedCourseIndex >= userCourses.length) {
      setSelectedCourseIndex(0);
    }
  }, [userCourses, selectedCourseIndex]);

  const activeCourse = userCourses[selectedCourseIndex] || userCourses[0] || SYSTEM_COURSES[0];

  // Identidad y estilos Dala según el plan activo
  const planBadgeConfig = useMemo(() => {
    switch (currentPlanId) {
      case 'pro_plus':
        return {
          label: 'Plan Pro+ · VIP',
          badgeClass:
            'border-[#ffb829]/40 bg-[#ffb829]/10 text-[#ffb829] shadow-[0_0_20px_rgba(255,184,41,0.2)]',
          dotColor: 'bg-[#ffb829]',
          glowGradient: 'from-[#ffb829]/20 to-transparent',
          accentBorder: 'border-[#ffb829]/30',
          titleSuffix: 'Clases Especializadas y Clases en Vivo',
        };
      case 'pro':
        return {
          label: 'Plan Pro',
          badgeClass:
            'border-[#8052ff]/40 bg-[#8052ff]/10 text-[#8052ff] shadow-[0_0_20px_rgba(128,82,255,0.25)]',
          dotColor: 'bg-[#8052ff]',
          glowGradient: 'from-[#8052ff]/20 to-transparent',
          accentBorder: 'border-[#8052ff]/30',
          titleSuffix: 'Tu Especialización Técnica Activa',
        };
      case 'your_plan':
        return {
          label: 'Your Plan · A tu Medida',
          badgeClass:
            'border-[#15846e]/40 bg-[#15846e]/10 text-[#15846e] shadow-[0_0_20px_rgba(21,132,110,0.25)]',
          dotColor: 'bg-[#15846e]',
          glowGradient: 'from-[#15846e]/20 to-transparent',
          accentBorder: 'border-[#15846e]/30',
          titleSuffix: 'Programa Técnico Personalizado',
        };
      case 'free':
      default:
        return {
          label: 'Acceso Inicial · Free',
          badgeClass: 'border-[#ffffff]/20 bg-[#ffffff]/5 text-[#bdbdbd]',
          dotColor: 'bg-[#15846e]',
          glowGradient: 'from-[#8052ff]/10 to-transparent',
          accentBorder: 'border-[#ffffff]/15',
          titleSuffix: 'Curso Abierto de Prueba',
        };
    }
  }, [currentPlanId]);

  return (
    <div className="relative min-h-screen bg-[#000000] text-white selection:bg-[#8052ff] selection:text-white overflow-x-hidden font-sans">
      {/* Malla Topológica de Grid Cuántico (Estilo D1 Dala) */}
      <DalaQuantumGridBackground />

      {/* Contenido Estructural del Campus */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Cabecera del Campus */}
        <header className="sticky top-0 z-40 border-b border-[#ffffff]/10 bg-[#000000]/80 backdrop-blur-md">
          <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
            {/* Logo y Enlace a la Landing */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <IptLogoIcon className="w-8 h-8" />
              </div>
              <span className="text-white text-[15px] font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#bdbdbd]">Academy</span>
              </span>
            </Link>

            {/* Identidad del Alumno y Plan Activo */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Badge Dinámico del Plan */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide uppercase transition-all duration-300 ${planBadgeConfig.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${planBadgeConfig.dotColor} animate-pulse`} />
                <span>{planBadgeConfig.label}</span>
              </div>

              {/* Datos del Usuario */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#09090b] border border-[#ffffff]/15 text-xs text-[#bdbdbd]">
                  <span className="font-mono truncate max-w-[160px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
              )}

              {/* Botón Salir */}
              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-full border border-[#ffffff]/15 hover:border-[#ffffff]/30 hover:bg-[#ffffff]/5 text-[#9a9a9a] hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Zona Central: Aula de Clases Inmediata */}
        <main className="flex-1 flex flex-col justify-center max-w-[1280px] mx-auto w-full px-6 py-12 sm:py-16">
          <div className="space-y-8">
            {/* Encabezado de Bienvenida Minimalista */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] font-mono text-[#9a9a9a]">
                <span>Campus Virtual</span>
                <span>·</span>
                <span className="text-white">{planBadgeConfig.titleSuffix}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-normal text-white tracking-[-0.03em] leading-tight">
                {user?.displayName
                  ? `Hola, ${user.displayName.split(' ')[0]}. Tu aula está lista.`
                  : 'Tu aula de formación técnica está lista.'}
              </h1>
              <p className="text-[15px] font-extralight text-[#9a9a9a] max-w-2xl leading-relaxed">
                Ingresa directamente a tus clases en video, reproduce tu temario y retoma tu lección activa sin pasos intermedios.
              </p>
            </div>

            {/* Selector de Especializaciones (Para Pro+ y cuentas con múltiples cursos) */}
            {userCourses.length > 1 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs uppercase tracking-wider text-[#9a9a9a] font-semibold block">
                  Selecciona la especialización activa:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {userCourses.map((c, idx) => {
                    const isSelected = idx === selectedCourseIndex;
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => setSelectedCourseIndex(idx)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#8052ff] text-white border-[#8052ff] shadow-[0_0_20px_rgba(128,82,255,0.4)]'
                            : 'bg-[#09090b] text-[#9a9a9a] border-[#ffffff]/15 hover:border-[#ffffff]/30 hover:text-white'
                        }`}
                      >
                        {c.title.split(':')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tarjeta Hero Play Monumental (La Clase Activa) */}
            <div
              className={`relative rounded-[32px] bg-[#09090b] border ${planBadgeConfig.accentBorder} p-8 sm:p-12 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300`}
            >
              {/* Resplandor ambiental de fondo */}
              <div
                className={`absolute top-0 right-0 w-[480px] h-[480px] bg-gradient-to-bl ${planBadgeConfig.glowGradient} rounded-full blur-[130px] pointer-events-none opacity-40`}
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Información de la Clase */}
                <div className="lg:col-span-8 space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10 text-white text-[11px] font-mono uppercase tracking-wider">
                      {activeCourse.category}
                    </span>
                    <span className="text-[12px] text-[#9a9a9a] font-light">
                      {activeCourse.lessonsCount} lecciones interactivas
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-4xl font-normal text-white tracking-[-0.03em] mb-3 leading-snug">
                      {activeCourse.title}
                    </h2>
                    <p className="text-[14px] sm:text-[15px] font-extralight text-[#bdbdbd] leading-relaxed max-w-2xl">
                      {activeCourse.description}
                    </p>
                  </div>

                  {/* Acceso Directo de Reproducción */}
                  <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <Link
                      href={`/course?slug=${activeCourse.slug}&lesson=1`}
                      className="group px-8 py-4 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[14px] font-semibold flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(128,82,255,0.45)] hover:shadow-[0_0_45px_rgba(128,82,255,0.65)] hover:scale-[1.02] cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>Entrar a tu Clase Ahora</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Micro-preview lateral de acceso a clase */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-[24px] bg-[#000000]/60 border border-[#ffffff]/10 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#8052ff]/15 border border-[#8052ff]/30 flex items-center justify-center text-[#8052ff]">
                    <Play className="w-7 h-7 fill-[#8052ff]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Lección 1: Lista para iniciar
                    </span>
                    <span className="text-[11px] text-[#9a9a9a] font-light">
                      Reproducción fluida 100% en la web
                    </span>
                  </div>
                  <div className="pt-2 w-full border-t border-[#ffffff]/10 flex items-center justify-between text-[11px] text-[#9a9a9a]">
                    <span>Modalidad</span>
                    <span className="text-white font-mono">Auto-ritmo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Módulo Especial para Plan Pro+: Clases Magistrales en Vivo */}
            {currentPlanId === 'pro_plus' && (
              <div className="p-6 sm:p-8 rounded-[28px] bg-[#09090b] border border-[#ffb829]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ffb829]">
                    <Video className="w-4 h-4 text-[#ffb829]" />
                    <span>Clases Magistrales en Vivo</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Tienes 8 cupos de sesiones virtuales con docentes disponibles este mes
                  </h3>
                  <p className="text-xs text-[#9a9a9a] font-light">
                    Ingresa a la sala interactiva para resolver dudas de arquitectura directamente con tu profesor.
                  </p>
                </div>

                <Link
                  href="/live"
                  className="px-6 py-3 rounded-full bg-[#ffb829] hover:bg-[#e5a420] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,184,41,0.3)] shrink-0 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Ingresar a Sala en Vivo</span>
                </Link>
              </div>
            )}

            {/* Módulo Especial para Plan Free: Invitación a Elevar Nivel */}
            {currentPlanId === 'free' && (
              <div className="p-6 sm:p-8 rounded-[28px] bg-[#09090b] border border-[#ffffff]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8052ff]">
                    <Sparkles className="w-4 h-4 text-[#8052ff]" />
                    <span>Especializaciones Avanzadas</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    ¿Deseas activar múltiples especializaciones dinámicas o clases en vivo?
                  </h3>
                  <p className="text-xs text-[#9a9a9a] font-light">
                    Los planes Pro y Pro+ te permiten alternar entre arquitecturas de cloud, microservicios y sistemas distribuidos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openPricingModal()}
                  className="px-5 py-2.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 border border-[#ffffff]/20 text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                >
                  Ver Membresías
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
