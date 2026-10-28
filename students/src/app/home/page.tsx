'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { Course } from '@/types';
import {
  BookOpen,
  CheckCircle2,
  Play,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  Layers,
  ArrowLeft,
  Tv,
  Monitor,
  Box
} from 'lucide-react';
import { IptLogoIcon } from '@/components/IptLogoIcon';

const DEFAULT_IPT_SPECIALIZATIONS = [
  {
    slug: 'introduccion-ingenieria-ipt',
    title: 'Fundamentos de Arquitectura de Software e Ingeniería',
    description:
      'Aprende los principios estructurales del desarrollo moderno de software, separación de responsabilidades y metodologías de diseño escalable.',
    category: 'Ingeniería de Software',
    isFreePublic: true,
  },
  {
    slug: 'ipt-master-fullstack',
    title: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    description:
      'Construcción de aplicaciones distribuidas modernas, bases de datos reactivas, autenticación por roles y despliegues serverless de alta concurrencia.',
    category: 'Ingeniería de Software',
  },
  {
    slug: 'arquitectura-cloud-ipt',
    title: 'Arquitectura Cloud Resiliente y Microservicios',
    description:
      'Diseño de topologías de alta disponibilidad, orquestación de contenedores, balanceo de carga y políticas de recuperación ante desastres.',
    category: 'Arquitectura & Cloud',
  },
  {
    slug: 'sistemas-distribuidos-ipt',
    title: 'Sistemas Distribuidos y Procesamiento de Eventos',
    description:
      'Patrones de consistencia eventual, colas de mensajería, streaming de datos con idempotencia y monitoreo de telemetría en tiempo real.',
    category: 'Sistemas Distribuidos',
  },
];

export default function StudentHomePage() {
  const { user } = useAuth();
  const { courses } = useLms();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Integración de cursos reales de Firebase con especializaciones
  const allCourses = useMemo(() => {
    const list: Course[] = [...(courses || [])];
    DEFAULT_IPT_SPECIALIZATIONS.forEach((spec) => {
      if (!list.some((c) => c.slug === spec.slug)) {
        list.push({
          slug: spec.slug,
          title: spec.title,
          subtitle: spec.title,
          description: spec.description,
          thumbnail: '',
          instructor: { name: 'Ivan Perez', role: 'Staff Engineer', avatar: '' },
          category: spec.category,
          level: 'Intermedio',
          rating: 4.9,
          ratingsCount: 120,
          modules: [],
          published: true,
          isFreePublic: spec.isFreePublic || false,
        } as Course);
      }
    });
    return list;
  }, [courses]);

  // Categorías únicas
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('Todos');
    allCourses.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats);
  }, [allCourses]);

  // Cursos filtrados
  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'Todos') return allCourses;
    return allCourses.filter((c) => c.category === selectedCategory);
  }, [allCourses, selectedCategory]);

  const totalCoursesCount = allCourses.length || 1;

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#8052ff] selection:text-white">
      {/* Cortina Lumínica de Transición Suave */}
      <div className="fixed inset-0 bg-radial from-[#8052ff]/12 via-transparent to-transparent pointer-events-none opacity-50 blur-3xl animate-pulse" />

      {/* Cabecera del Campus Estudiantil */}
      <header className="border-b border-[#ffffff]/10 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                <IptLogoIcon className="w-8 h-8" />
              </div>
              <span className="text-white text-[16px] font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#bdbdbd]">Academy</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#8052ff]/15 text-[#8052ff] text-[11px] font-mono border border-[#8052ff]/30">
              Campus Estudiantil
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-full border border-[#ffffff]/15 hover:border-[#ffffff]/30 hover:bg-[#ffffff]/5 text-xs text-[#bdbdbd] flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Home (/)</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#000000] border border-[#ffffff]/15 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-[#15846e]" />
                <span className="font-mono truncate max-w-[140px]">{user.email}</span>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(128,82,255,0.4)]"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal del Campus */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12 relative z-10">
        {/* Banner de Bienvenida y Métricas Generales */}
        <section className="p-8 sm:p-10 rounded-[30px] bg-[#09090b] border border-[#ffffff]/15 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffb829]/15 text-[#ffb829] text-xs font-semibold border border-[#ffb829]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Panel de Clases y Estudios Activos</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-white tracking-[-0.03em]">
                Bienvenido al Campus de Ingeniería
              </h1>
              <p className="text-sm font-extralight text-[#9a9a9a] leading-relaxed">
                Supervisa tu avance curricular, accede a las sesiones interactivas en vivo y practica en el sandbox con datos reales de producción.
              </p>
            </div>

            {/* Tarjeta de Métricas de Progreso */}
            <div className="p-6 rounded-2xl bg-[#000000] border border-[#ffffff]/10 shrink-0 w-full lg:w-80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.05em] font-semibold text-[#9a9a9a]">
                  Progreso Global
                </span>
                <span className="text-lg font-bold text-[#8052ff] font-mono">
                  38%
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2 rounded-full bg-[#ffffff]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8052ff] to-[#15846e] transition-all duration-500"
                  style={{ width: `38%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#ffffff]/5 text-center">
                <div>
                  <div className="text-lg font-semibold text-white font-mono">{totalCoursesCount}</div>
                  <div className="text-[11px] text-[#9a9a9a]">Cursos Totales</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white font-mono">18</div>
                  <div className="text-[11px] text-[#9a9a9a]">Lecciones Base</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Las 3 Fases de Aprendizaje Práctico */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">
            Metodología de las 3 Fases
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[22px] bg-[#09090b] border border-[#ffffff]/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#8052ff]/15 flex items-center justify-center text-[#8052ff]">
                <Tv className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Fase 1: Aula Virtual</h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed font-light">
                Lecciones audiovisuales con subtítulos sincronizados milisegundo a milisegundo y quizzes formativos.
              </p>
            </div>

            <div className="p-6 rounded-[22px] bg-[#09090b] border border-[#ffffff]/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#15846e]/15 flex items-center justify-center text-[#15846e]">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Fase 2: Reflejo Operativo</h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed font-light">
                Pantallas reales de software empresarial donde aprendes los flujos operativos paso a paso.
              </p>
            </div>

            <div className="p-6 rounded-[22px] bg-[#09090b] border border-[#ffffff]/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffb829]/15 flex items-center justify-center text-[#ffb829]">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Fase 3: Sandbox Interactivo</h3>
              <p className="text-xs text-[#9a9a9a] leading-relaxed font-light">
                Simulador de misión donde registras datos, tomas decisiones y experimentas sin miedo a romper el sistema.
              </p>
            </div>
          </div>
        </section>

        {/* Catálogo de Cursos Disponibles */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-[-0.02em]">
                Cursos Disponibles y Especializaciones
              </h2>
              <p className="text-xs text-[#9a9a9a]">
                Selecciona un programa para continuar tu formación
              </p>
            </div>

            {/* Filtros de Categoría */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#8052ff] text-white shadow-[0_0_15px_rgba(128,82,255,0.4)]'
                      : 'bg-[#ffffff]/5 text-[#9a9a9a] hover:text-white hover:bg-[#ffffff]/10 border border-[#ffffff]/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Cursos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => {
              const lessons = c.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 8;
              const isTrial = c.isFreePublic === true || c.slug === 'introduccion-ingenieria-ipt';

              return (
                <div
                  key={c.slug}
                  className="p-7 rounded-[26px] bg-[#09090b] border border-[#ffffff]/15 flex flex-col justify-between hover:border-[#8052ff]/50 transition-all shadow-xl group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-2.5 py-1 rounded-full font-mono ${
                          isTrial
                            ? 'bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30'
                            : 'bg-[#8052ff]/15 text-[#8052ff] border border-[#8052ff]/30'
                        }`}
                      >
                        {isTrial ? 'Acceso Libre' : 'Especialización'}
                      </span>
                      <span className="text-[11px] text-[#9a9a9a] font-light">
                        {lessons} lecciones
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white tracking-[-0.01em] group-hover:text-[#8052ff] transition-colors mb-2">
                        {c.title}
                      </h3>
                      <p className="text-xs text-[#9a9a9a] leading-relaxed line-clamp-3 font-light">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#ffffff]/10 mt-6 flex items-center justify-between">
                    <span className="text-[11px] text-[#9a9a9a] font-mono">
                      {c.category || 'Ingeniería'}
                    </span>
                    <Link
                      href={`/course?slug=${c.slug}&lesson=1`}
                      className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(128,82,255,0.4)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Ingresar al Curso</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
