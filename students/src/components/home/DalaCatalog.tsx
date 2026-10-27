'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { BookOpen, Clock, ArrowRight, Award, Layers, Sparkles } from 'lucide-react';

interface DalaCatalogProps {
  courses: Course[];
}

const DEFAULT_IPT_SPECIALIZATIONS = [
  {
    id: 'c1',
    slug: 'introduccion-ingenieria-ipt',
    title: 'Fundamentos de Arquitectura de Software e Ingeniería',
    description:
      'Aprende los principios estructurales del desarrollo moderno de software, separación de responsabilidades y metodologías de diseño escalable.',
    category: 'Ingeniería de Software',
    lessonsCount: 8,
    isFreePublic: true,
  },
  {
    id: 'c2',
    slug: 'ipt-master-fullstack',
    title: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    description:
      'Construcción de aplicaciones distribuidas modernas, bases de datos reactivas, autenticación por roles y despliegues serverless de alta concurrencia.',
    category: 'Ingeniería de Software',
    lessonsCount: 16,
    courseModality: 'dynamic',
  },
  {
    id: 'c3',
    slug: 'arquitectura-cloud-ipt',
    title: 'Arquitectura Cloud Resiliente y Microservicios',
    description:
      'Diseño de topologías de alta disponibilidad, orquestación de contenedores, balanceo de carga y políticas de recuperación ante desastres.',
    category: 'Arquitectura & Cloud',
    lessonsCount: 12,
    courseModality: 'dynamic',
  },
  {
    id: 'c4',
    slug: 'sistemas-distribuidos-ipt',
    title: 'Sistemas Distribuidos y Procesamiento de Eventos',
    description:
      'Patrones de consistencia eventual, colas de mensajería, streaming de datos con idempotencia y monitoreo de telemetría en tiempo real.',
    category: 'Sistemas Distribuidos',
    lessonsCount: 14,
    courseModality: 'dynamic',
  },
];

export default function DalaCatalog({ courses }: DalaCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Merge real courses with curriculum specializations
  const catalogCourses = useMemo(() => {
    const list = [...(courses || [])];
    DEFAULT_IPT_SPECIALIZATIONS.forEach((spec) => {
      if (!list.some((c) => c.slug === spec.slug || c.title === spec.title)) {
        list.push({
          id: spec.id,
          slug: spec.slug,
          title: spec.title,
          description: spec.description,
          category: spec.category,
          isFreePublic: spec.isFreePublic,
          courseModality: spec.courseModality,
          modules: [],
        } as unknown as Course);
      }
    });
    return list;
  }, [courses]);

  const categories = ['Todos', 'Ingeniería de Software', 'Arquitectura & Cloud', 'Sistemas Distribuidos'];

  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'Todos') return catalogCourses;
    return catalogCourses.filter((c: any) => c.category === selectedCategory);
  }, [catalogCourses, selectedCategory]);

  return (
    <section id="catalogo" className="relative py-28 px-6 z-10 border-t border-[#ffffff]/10">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Header Block — Two-column asymmetric rhythm */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-7">
            <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#ffb829] block mb-3">
              Oferta Formativa Especializada
            </span>
            <h2 className="text-[42px] sm:text-[56px] md:text-[64px] font-normal text-white leading-[1.05] tracking-[-0.04em]">
              Programas y Especializaciones.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[17px] font-extralight text-[#bdbdbd] leading-[1.5]">
              Cursos modulares orientados a la práctica con evaluación formativa docente,
              diseñados para resolver retos reales de arquitectura y desarrollo técnico.
            </p>
          </div>
        </div>

        {/* Categories Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-[13px] uppercase tracking-[0.025em] font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-black font-semibold shadow-lg'
                  : 'bg-[#ffffff]/[0.06] text-[#9a9a9a] hover:text-white hover:bg-[#ffffff]/12'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Courses Grid — Solid Opaque Cards so particles NEVER pass through text */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course: any, idx: number) => {
            const isFree =
              course.isFreePublic === true ||
              course.slug === 'introduccion-ingenieria-ipt' ||
              (!course.courseModality && !course.isDynamic);
            const totalL =
              course.lessonsCount ||
              course.lessons?.length ||
              course.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) ||
              8;

            return (
              <div
                key={course.id || course.slug || idx}
                className="relative z-10 group p-8 rounded-[24px] bg-[#09090b] border border-[#ffffff]/15 hover:border-[#8052ff]/60 shadow-xl transition-all duration-300 flex flex-col justify-between hover:bg-[#0c0c10]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    {isFree ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#ffb829] bg-[#ffb829]/15 px-3 py-1 rounded-full border border-[#ffb829]/25">
                        Acceso Libre · Trial
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8052ff] bg-[#8052ff]/15 px-3 py-1 rounded-full border border-[#8052ff]/25">
                        Especialización Pro
                      </span>
                    )}
                    <span className="text-[12px] text-[#9a9a9a] flex items-center gap-1.5 font-light">
                      <BookOpen className="w-3.5 h-3.5" />
                      {totalL} lecciones
                    </span>
                  </div>

                  <h3 className="text-[22px] font-normal text-white leading-tight tracking-[-0.02em] mb-3">
                    {course.title}
                  </h3>

                  <p className="text-[14px] font-extralight text-[#bdbdbd] leading-relaxed line-clamp-3 mb-8">
                    {course.description ||
                      'Programa enfocado en la aplicación directa de patrones y solución práctica de problemas técnicos.'}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#ffffff]/10 flex items-center justify-between">
                  <span className="text-[12px] font-light text-[#9a9a9a]">
                    {isFree ? 'Sin costo inicial' : 'Incluido en membresía'}
                  </span>
                  <Link
                    href={`/course?course=${encodeURIComponent(course.slug)}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.03em] text-[#8052ff] group-hover:text-white transition-colors"
                  >
                    <span>Explorar Temario</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
