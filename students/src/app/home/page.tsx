'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import DalaQuantumGridBackground from '@/components/home/DalaQuantumGridBackground';
import {
  Play,
  ArrowRight,
  Sparkles,
  Video,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FileCheck2,
  GraduationCap,
  Award,
  Users,
  Clock,
  Calendar,
  UserCheck,
  Radio,
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
    subtitle: 'Especialización Dinámica 1',
    description:
      'Construcción de aplicaciones distribuidas modernas, bases de datos reactivas, micro-frontends y despliegues serverless de alta concurrencia.',
    category: 'Ingeniería de Software',
    lessonsCount: 24,
  },
  {
    slug: 'arquitectura-cloud-ipt',
    title: 'Arquitectura Cloud Resiliente y Microservicios',
    subtitle: 'Especialización Dinámica 2',
    description:
      'Topologías de alta disponibilidad, orquestación de contenedores, balanceo de carga en producción y recuperación ante desastres.',
    category: 'Cloud & Sistemas',
    lessonsCount: 20,
  },
  {
    slug: 'sistemas-distribuidos-ipt',
    title: 'Sistemas Distribuidos y Procesamiento de Eventos',
    subtitle: 'Especialización Dinámica 3',
    description:
      'Patrones de consistencia eventual, colas de mensajería con idempotencia, streaming reactivo y telemetría de observabilidad en tiempo real.',
    category: 'Sistemas Distribuidos',
    lessonsCount: 22,
  },
];

interface WeeklyTeacherSession {
  id: string;
  title: string;
  instructor: string;
  dayLabel: string;
  timeLabel: string;
  enrolled: number;
  minQuota: number;
  maxCapacity: number;
}

const FIXED_TEACHER_SCHEDULE: WeeklyTeacherSession[] = [
  {
    id: 'live-wed-1900',
    title: 'Diseño de Sistemas de Alta Concurrencia e Idempotencia',
    instructor: 'Ing. Iván Pérez · Director Académico',
    dayLabel: 'Miércoles',
    timeLabel: '19:00 COT (60 min)',
    enrolled: 4,
    minQuota: 3,
    maxCapacity: 12,
  },
  {
    id: 'live-fri-1800',
    title: 'Arquitectura Limpia y Revisión de Casos Reales en Vivo',
    instructor: 'Comité Docente IPT',
    dayLabel: 'Viernes',
    timeLabel: '18:00 COT (60 min)',
    enrolled: 2,
    minQuota: 3,
    maxCapacity: 12,
  },
];

export default function StudentCampusPage() {
  const { user } = useAuth();
  const {
    subscription,
    entitlements,
    openPricingModal,
    activateDynamicCourse,
    zeroSumAccounting,
  } = useSubscription();

  const currentPlanId = useMemo<'free' | 'pro' | 'pro_plus' | 'your_plan'>(() => {
    if (!subscription || !subscription.planId) {
      if (entitlements.campusTheme === 'campus-pro-plus') return 'pro_plus';
      if (entitlements.campusTheme === 'campus-pro') return 'pro';
      if (entitlements.campusTheme === 'campus-enterprise') return 'your_plan';
      return 'free';
    }
    return subscription.planId;
  }, [subscription, entitlements.campusTheme]);

  // Cursos dinámicos disponibles para el estudiante según su nivel
  const userCourses = useMemo<SpecializationItem[]>(() => {
    if (currentPlanId === 'free') {
      return SYSTEM_COURSES.filter((c) => c.isFreePublic);
    }
    if (currentPlanId === 'pro') {
      const activeSlug =
        subscription?.activeDynamicCourseSlugs?.[0] || 'ipt-master-fullstack';
      const found = SYSTEM_COURSES.find((c) => c.slug === activeSlug);
      return found ? [found] : [SYSTEM_COURSES[1]];
    }
    if (currentPlanId === 'pro_plus') {
      return SYSTEM_COURSES.filter((c) => !c.isFreePublic);
    }
    return [
      {
        slug: 'programa-personalizado-ipt',
        title: 'Programa Especializado y Mentoría a la Medida',
        subtitle: 'Your Plan · Itinerario Personalizado',
        description:
          'Sesiones 1 a 1 adaptadas a tus objetivos, revisión directa de tus proyectos y acompañamiento personalizado con el equipo docente.',
        category: 'Mentoría Especializada',
        lessonsCount: 16,
      },
      ...SYSTEM_COURSES.filter((c) => !c.isFreePublic),
    ];
  }, [currentPlanId, subscription]);

  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Estado para Fila Virtual 1 a 1 (Exclusivo Your Plan)
  const [inQueue1on1, setInQueue1on1] = useState(false);
  const [queueTopic, setQueueTopic] = useState('');
  const [queueTicketCode, setQueueTicketCode] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCourseIndex >= (userCourses?.length || 0)) {
      setSelectedCourseIndex(0);
    }
  }, [userCourses, selectedCourseIndex]);

  const activeCourse =
    userCourses[selectedCourseIndex] || userCourses[0] || SYSTEM_COURSES[0];

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
          titleSuffix: 'Especializaciones Simultáneas y Clases en Vivo',
        };
      case 'pro':
        return {
          label: 'Plan Pro',
          badgeClass:
            'border-[#8052ff]/40 bg-[#8052ff]/10 text-[#8052ff] shadow-[0_0_20px_rgba(128,82,255,0.25)]',
          dotColor: 'bg-[#8052ff]',
          glowGradient: 'from-[#8052ff]/20 to-transparent',
          accentBorder: 'border-[#8052ff]/30',
          titleSuffix: 'Estudio Continuo con Evaluación y Tutoría',
        };
      case 'your_plan':
        return {
          label: 'Your Plan · A tu Medida',
          badgeClass:
            'border-[#15846e]/40 bg-[#15846e]/10 text-[#15846e] shadow-[0_0_20px_rgba(21,132,110,0.25)]',
          dotColor: 'bg-[#15846e]',
          glowGradient: 'from-[#15846e]/20 to-transparent',
          accentBorder: 'border-[#15846e]/30',
          titleSuffix: 'Mentoría 1 a 1 y Temario Personalizado',
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

  const handleJoin1on1Queue = (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = `YP-1A1-${Math.floor(100 + Math.random() * 900)}`;
    setQueueTicketCode(ticket);
    setInQueue1on1(true);
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-white selection:bg-[#8052ff] selection:text-white overflow-x-hidden font-sans">
      <DalaQuantumGridBackground />

      <div className="relative z-10 max-w-[1280px] mx-auto w-full px-6 py-12 space-y-12">
        {/* Encabezado de Bienvenida según el Nivel Activo */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border bg-[#09090b] border-[#ffffff]/10 mb-4">
              <span className={`w-2 h-2 rounded-full ${planBadgeConfig.dotColor}`} />
              <span className="text-xs font-medium text-[#d1d5db]">
                {planBadgeConfig.label} · {planBadgeConfig.titleSuffix}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-normal text-white tracking-[-0.035em] leading-[1.08]">
              {user?.displayName
                ? `Hola, ${user.displayName.split(' ')[0]}.`
                : 'Bienvenido a tu Campus.'}
            </h1>
          </div>

          {/* Si es Plan Pro: Botón de Intercambio Flexible de Especialización */}
          {currentPlanId === 'pro' && (
            <button
              type="button"
              onClick={() => setSwapModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#09090b] border border-[#8052ff]/40 hover:border-[#8052ff] text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#8052ff]" />
              <span>Intercambiar Curso Dinámico Activo</span>
            </button>
          )}
        </div>

        {/* Selector de Especialización (Para Pro+ y Your Plan con múltiples cursos simultáneos) */}
        {Array.isArray(userCourses) && userCourses.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.08em] font-semibold text-[#9a9a9a] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#8052ff]" />
                Tus Especializaciones Simultáneas ({userCourses.length})
              </span>
              <span className="text-xs text-[#bdbdbd] font-light">
                Selecciona la clase a la que deseas entrar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {userCourses.map((course, idx) => {
                const isSelected = idx === selectedCourseIndex;
                return (
                  <button
                    key={course.slug}
                    type="button"
                    onClick={() => setSelectedCourseIndex(idx)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#09090b] border-[#8052ff] shadow-[0_0_25px_rgba(128,82,255,0.2)]'
                        : 'bg-[#09090b]/50 border-[#ffffff]/10 hover:border-[#ffffff]/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8052ff]">
                        {course.category}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#8052ff] shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-white line-clamp-1">
                      {course.title}
                    </p>
                    <span className="text-xs text-[#9a9a9a] mt-1 block">
                      {course.lessonsCount} lecciones disponibles
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tarjeta Monumental Principal de Acceso a la Clase */}
        <div
          className={`relative rounded-3xl border ${planBadgeConfig.accentBorder} bg-[#09090b]/90 backdrop-blur-xl p-8 sm:p-12 overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)]`}
        >
          <div
            className={`absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-bl ${planBadgeConfig.glowGradient} rounded-full blur-3xl pointer-events-none`}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#ffffff]/10 text-white text-xs font-medium">
                  {activeCourse.subtitle}
                </span>
                <span className="text-xs text-[#9a9a9a]">
                  {activeCourse.lessonsCount} lecciones en video de alta definición
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-normal text-white tracking-[-0.03em] leading-[1.12]">
                {activeCourse.title}
              </h2>

              <p className="text-base font-light text-[#bdbdbd] leading-relaxed max-w-2xl">
                {activeCourse.description}
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-4">
                <Link
                  href={`/course?course=${encodeURIComponent(activeCourse.slug)}`}
                  className="inline-flex items-center gap-3 bg-[#8052ff] hover:bg-[#6c3df4] text-white text-sm font-semibold px-7 py-4 rounded-full shadow-[0_0_30px_rgba(128,82,255,0.4)] transition-all group"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Entrar a tu Clase Ahora</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>

                {currentPlanId === 'free' && (
                  <button
                    type="button"
                    onClick={() => openPricingModal('pro_plus')}
                    className="inline-flex items-center gap-2 bg-[#ffffff]/5 hover:bg-[#ffffff]/10 border border-[#ffffff]/15 text-[#d1d5db] hover:text-white text-xs font-medium px-5 py-4 rounded-full transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#ffb829]" />
                    <span>Desbloquear Plan Pro / Pro+</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tarjeta Visual Derecha */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <Link
                href={`/course?course=${encodeURIComponent(activeCourse.slug)}`}
                className="w-full aspect-video rounded-2xl border border-[#ffffff]/15 bg-gradient-to-br from-[#14141d] via-[#09090b] to-[#1a1136] flex flex-col items-center justify-center p-6 group hover:border-[#8052ff]/60 transition-all relative overflow-hidden"
              >
                <div className="w-16 h-16 rounded-full bg-[#8052ff]/20 border border-[#8052ff]/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#8052ff] transition-all shadow-[0_0_30px_rgba(128,82,255,0.3)]">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
                <span className="text-xs font-medium text-white mt-4">
                  Reproductor de Estudio Activo
                </span>
                <span className="text-[11px] text-[#9a9a9a] mt-0.5">
                  Clic para iniciar lección
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACCESOS RÁPIDOS DE NIVEL PRO, PRO+ Y YOUR PLAN (TAREAS, NOTAS, DIPLOMAS)
           ========================================================================= */}
        {currentPlanId !== 'free' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link
              href="/assignments"
              className="p-6 rounded-2xl border border-[#ffffff]/10 bg-[#09090b] hover:border-[#8052ff]/50 transition-all group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#8052ff]/15 border border-[#8052ff]/30 flex items-center justify-center text-[#8052ff]">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-[#15846e] bg-[#15846e]/10 px-2.5 py-0.5 rounded-full">
                  Rúbricas Activas
                </span>
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-[#c0c4fc]">
                Tareas, Entregas y Apelaciones
              </h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed">
                Adjunta tus proyectos en PDF, código o nota de voz, revisa tu evaluación criterio
                por criterio o radica apelación ante Rectoría.
              </p>
            </Link>

            <Link
              href="/grades"
              className="p-6 rounded-2xl border border-[#ffffff]/10 bg-[#09090b] hover:border-[#8052ff]/50 transition-all group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#15846e]/15 border border-[#15846e]/30 flex items-center justify-center text-[#15846e]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-white bg-[#ffffff]/10 px-2.5 py-0.5 rounded-full">
                  Promedio: 86/100
                </span>
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-[#c0c4fc]">
                Mis Notas e Historial Académico
              </h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed">
                Consulta tu promedio acumulado, horas de estudio verificadas y descarga tu
                certificado oficial de calificaciones.
              </p>
            </Link>

            <Link
              href="/certificate"
              className="p-6 rounded-2xl border border-[#ffffff]/10 bg-[#09090b] hover:border-[#8052ff]/50 transition-all group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#ffb829]/15 border border-[#ffb829]/30 flex items-center justify-center text-[#ffb829]">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-[#ffb829] bg-[#ffb829]/10 px-2.5 py-0.5 rounded-full">
                  Verificación OCR
                </span>
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-[#c0c4fc]">
                Certificados y Validación de Documento
              </h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed">
                Verifica tu documento nacional por OCR para remover las marcas de agua anti-IA y
                emitir tu diploma con huella SHA-256.
              </p>
            </Link>
          </div>
        )}

        {/* =========================================================================
            CATÁLOGO FIJO SEMANAL DE CLASES EN VIVO (PARA PLAN PRO+ Y YOUR PLAN)
           ========================================================================= */}
        {(currentPlanId === 'pro_plus' || currentPlanId === 'your_plan') && (
          <div className="rounded-3xl border border-[#ffb829]/30 bg-[#09090b] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff]/10 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb829]">
                  <Video className="w-4 h-4" />
                  <span>Catálogo Fijo Semanal del Docente · Cuota Mínima Protegida</span>
                </div>
                <h3 className="text-xl font-normal text-white">
                  Próximas Sesiones Sincrónicas en Vivo
                </h3>
                <p className="text-xs text-[#9a9a9a]">
                  Si una sesión no alcanza la cuota mínima de estudiantes 3 horas antes del inicio,
                  se cancela y tu crédito regresa automáticamente a tu saldo (Contabilidad Δ = 0).
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="px-4 py-2 rounded-2xl bg-[#000000] border border-[#ffffff]/10 text-right">
                  <span className="text-[10px] font-mono uppercase text-[#9a9a9a] block">
                    Bolsa Disponible
                  </span>
                  <span className="text-sm font-bold text-[#ffb829]">
                    {entitlements.availableLiveCredits} de {zeroSumAccounting.issuedCredits}{' '}
                    Créditos
                  </span>
                </div>
                <Link
                  href="/live"
                  className="px-5 py-3 rounded-full bg-[#ffb829] hover:bg-[#f2a818] text-black text-xs font-bold transition-all"
                >
                  Abrir Sala en Vivo
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIXED_TEACHER_SCHEDULE.map((sess) => {
                const quotaMet = sess.enrolled >= sess.minQuota;
                return (
                  <div
                    key={sess.id}
                    className="p-5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#ffb829]">
                          {sess.dayLabel} · {sess.timeLabel}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            quotaMet
                              ? 'bg-[#15846e]/15 text-[#15846e] border border-[#15846e]/30'
                              : 'bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30'
                          }`}
                        >
                          {quotaMet
                            ? `Confirmada (${sess.enrolled}/${sess.minQuota} mín.)`
                            : `En inscripción (${sess.enrolled}/${sess.minQuota} mín.)`}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{sess.title}</h4>
                      <p className="text-xs text-[#9a9a9a]">{sess.instructor}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#ffffff]/10">
                      <span className="text-[11px] text-[#bdbdbd] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#ffb829]" />
                        Cuota mínima: {sess.minQuota} estudiantes
                      </span>
                      <Link
                        href={`/live?session=${sess.id}`}
                        className="text-xs font-semibold text-[#ffb829] hover:underline flex items-center gap-1"
                      >
                        <span>Reservar / Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            FILA VIRTUAL DE ASESORÍA 1 A 1 (EXCLUSIVO PARA YOUR PLAN)
           ========================================================================= */}
        {currentPlanId === 'your_plan' && (
          <div className="rounded-3xl border-2 border-[#15846e]/50 bg-gradient-to-br from-[#15846e]/15 via-[#09090b] to-[#09090b] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15846e]/20 border border-[#15846e]/40 text-[#15846e] text-xs font-semibold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Exclusivo Your Plan · Atención Individual en Tiempo Real</span>
                </div>
                <h3 className="text-2xl font-normal text-white pt-1">
                  Fila Virtual de Asesorías 1 a 1 con el Profesor
                </h3>
                <p className="text-xs text-[#bdbdbd] max-w-2xl">
                  Durante el horario de oficina del instructor puedes tomar turno para conectarte en
                  una sesión privada individual de 15 minutos y resolver bloqueos específicos de tu
                  programa a la medida.
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-[#000000] border border-[#15846e]/40 text-right shrink-0">
                <span className="text-[10px] font-mono uppercase text-[#15846e] block">
                  Estado de Sala 1 a 1
                </span>
                <span className="text-sm font-bold text-white">
                  Docente Disponible · Espera ~3 min
                </span>
              </div>
            </div>

            {!inQueue1on1 ? (
              <form
                onSubmit={handleJoin1on1Queue}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2"
              >
                <input
                  type="text"
                  required
                  value={queueTopic}
                  onChange={(e) => setQueueTopic(e.target.value)}
                  placeholder="Describe brevemente el tema o bloqueo que deseas revisar 1 a 1 con el profesor..."
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/60 focus:outline-none focus:border-[#15846e]"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-full bg-[#15846e] hover:bg-[#116b59] text-white text-xs font-semibold shrink-0 cursor-pointer transition-all"
                >
                  Tomar Turno 1 a 1 Ahora
                </button>
              </form>
            ) : (
              <div className="p-5 rounded-2xl bg-[#000000] border border-[#15846e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#15846e]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Turno Activo #{queueTicketCode} · Posición #1 en Fila</span>
                  </div>
                  <p className="text-sm font-semibold text-white">Tema: {queueTopic}</p>
                  <p className="text-xs text-[#9a9a9a]">
                    Tu sala privada 1 a 1 está lista para ingresar.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInQueue1on1(false)}
                    className="px-4 py-2.5 rounded-full border border-[#ffffff]/15 text-xs text-[#bdbdbd] hover:text-white cursor-pointer"
                  >
                    Liberar Turno
                  </button>
                  <Link
                    href="/live?mode=1on1"
                    className="px-5 py-2.5 rounded-full bg-[#15846e] text-white text-xs font-semibold"
                  >
                    Entrar a Sala Privada 1 a 1
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Intercambio de Curso Dinámico (Para Plan Pro) */}
      {swapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#09090b] border border-[#ffffff]/15 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-semibold text-white">
              Intercambiar Especialización Dinámica Activa (Plan Pro)
            </h3>
            <p className="text-xs text-[#9a9a9a]">
              Con el Plan Pro dispones de 1 cupo dinámico activo con entregas y evaluación de
              rúbrica. Tu progreso en los demás cursos se conserva intacto.
            </p>
            <div className="space-y-2.5">
              {SYSTEM_COURSES.filter((c) => !c.isFreePublic).map((c) => {
                const isCurrent = c.slug === activeCourse.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={async () => {
                      await activateDynamicCourse(c.slug, activeCourse.slug);
                      setSwapModalOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#8052ff]/15 border-[#8052ff] text-white'
                        : 'bg-[#000000] border-[#ffffff]/10 hover:border-[#ffffff]/30 text-[#bdbdbd]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{c.title}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono text-[#8052ff]">Activo</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#9a9a9a] block mt-1">
                      {c.lessonsCount} lecciones · {c.category}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#ffffff]/15 text-xs text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
