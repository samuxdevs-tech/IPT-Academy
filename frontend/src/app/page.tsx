'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Layers, Award, Sparkles, Film, Target, Play, CheckCircle2, Lock } from 'lucide-react';
import { Course } from '@/types';
import UserProfileMenu from '@/components/UserProfileMenu';
import { normalizeCourse } from '@/lib/courseUtils';
import { verifyUserHasCourseLicense } from '@/lib/licenseUtils';

export default function HomePage() {
  const { user, isAdmin, isOperator, simulateStudentMode, effectiveIsAdmin, userLicenses } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressData, setProgressData] = useState<any>({});

  useEffect(() => {
    // 1. Cargar catálogo (desde RTDB o fallback)
    const mockCourses: Course[] = [
      {
        slug: 'datagan-master-pro',
        title: 'DataGan Master Pro: Gestión Zootécnica',
        description: 'Domina las 73 métricas operativas de DataGan 360.',
        category: 'Gestión',
        level: 'Avanzado',
        thumbnail: 'https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2',
        rating: 4.9,
        ratingsCount: 128,
        subtitle: 'Sub',
        instructor: { name: 'Prof', role: 'Role', avatar: 'avt' },
        published: true,
        modules: [{ id: 'm1', title: 'M1', description: 'Desc', order: 1, lessons: [{}, {}, {}] as any }]
      }
    ];

    get(ref(db, 'courses'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.keys(data).map((key) =>
            normalizeCourse({
              ...data[key],
              slug: data[key].slug || key
            })
          );
          setCourses(list);
        } else {
          setCourses(mockCourses.map((c) => normalizeCourse(c)));
        }
      })
      .catch(() => setCourses(mockCourses.map((c) => normalizeCourse(c))));

    // 2. Cargar progreso del usuario
    if (user) {
      get(ref(db, `progress/${user.uid}`)).then((snap) => {
        if (snap.exists()) {
          setProgressData(snap.val());
        }
      });
    }
  }, [user]);


  return (
    <div className="min-h-screen bg-[#e9eaf2]">
      {/* Top Navbar estilo Datagan */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#d1d2e0] px-6 py-3.5 shadow-xs">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt="TecnoGan"
                width={120}
                height={40}
                priority
                className="h-10 w-auto object-contain"
              />
              <span className="font-bold text-xl text-[#2a2b3f] tracking-tight">Datagan Course</span>
            </Link>

            <div className="hidden md:flex items-center gap-2 text-sm text-[#595c73] font-medium">
              <button type="button" className="hover:text-[#6d28d2] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden rounded px-1">Categorías</button>
              <span>•</span>
              <button type="button" className="hover:text-[#6d28d2] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden rounded px-1">Rutas de Aprendizaje</button>
            </div>
          </div>

          {/* Search Pill */}
          <div className="flex-1 max-w-lg hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar temas, métricas zootécnicas, ITH, GDP, curvas de lactancia..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-[#d1d2e0] rounded-full focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden placeholder-[#595c73]"
              />
              <svg className="w-4 h-4 text-[#595c73] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/certificate"
              className="px-3.5 py-2 text-sm font-semibold text-[#6d28d2] hover:bg-[#6d28d2]/10 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Certificados</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 text-sm font-medium text-[#6d28d2] border border-[#6d28d2] rounded-lg hover:bg-[#6d28d2]/5 transition-all"
              >
                Panel Admin
              </Link>
            )}
            
            {user ? (
              <UserProfileMenu courseSlug="datagan-master-pro" />
            ) : (
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-[#6d28d2] rounded-lg hover:bg-[#5b21b6] transition-all">
                Iniciar Sesión
              </Link>
            )}

          </div>
        </div>
      </header>

      {/* Hero Banner Invertido Obsidian */}
      <section className="bg-[#202230] text-white py-12 px-6">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d28d2]/30 border border-[#c0c4fc]/20 text-[#c0c4fc] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Certificación Oficial en Gestión Ganadera Inteligente</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Aprende a transformar datos zootécnicos en rentabilidad real.
            </h1>
            <p className="text-base text-[#b7b9cd] max-w-2xl leading-relaxed">
              Domina las 73 métricas operativas de DataGan 360: curvas de lactancia, pesaje y GDP, días abiertos, ITH contra estrés calórico y contabilidad agropecuaria avanzada.
            </p>
          </div>
          <div className="lg:col-span-4 bg-[#33364a] p-6 rounded-2xl border border-[#3d4055] space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#6d28d2] rounded-xl text-white">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Acreditación Zootécnica</h4>
                <p className="text-xs text-[#b7b9cd]">Compatible con estándares ICA & FEDEGAN</p>
              </div>
            </div>
            <p className="text-xs text-[#9194ac]">
              Cursos estructurados con videos embebidos en local o streaming YouTube, guías zootécnicas descargables y casos prácticos en campo.
            </p>
          </div>
        </div>
      </section>


      {/* Catálogo de Cursos con Fases 1, 2 y 3 y Certificados Integrados por Curso */}
      <main className="max-w-[1240px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2a2b3f]">Cursos Disponibles</h2>
            <p className="text-sm text-[#595c73] mt-1">Explora la oferta académica especializada en ganadería de precisión</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses
            .filter((course) => {
              if (effectiveIsAdmin) return true;
              return course.visibility !== 'draft' && course.published !== false;
            })
            .map((course) => {
            const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
            const completedCount = progressData[course.slug]?.completedLessons?.length || 0;
            const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

            return (
              <div
                key={course.slug}
                className="bg-white rounded-2xl border border-[#d1d2e0] overflow-hidden hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-[#202230]">
                    <Image
                      src={course.thumbnail || '/images/datagan-course-cover-v2.jpeg'}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                      {(course.visibility === 'draft' || course.published === false) && (
                        <div className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                          Borrador
                        </div>
                      )}
                      {course.accessType === 'paid' ? (
                        <div className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                          ${course.price || 49} USD
                        </div>
                      ) : (
                        <div className="bg-[#6d28d2] text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                          Gratuito
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[#595c73]">
                      <span className="font-semibold text-[#6d28d2] bg-[#6d28d2]/10 px-2 py-0.5 rounded-md">{course.category || 'Gestión'}</span>
                      <span>•</span>
                      <span>{course.level || 'Intermedio'}</span>
                    </div>

                    <h3 className="font-bold text-lg text-[#2a2b3f] leading-snug line-clamp-2 group-hover:text-[#6d28d2] transition-colors">
                      {course.title}
                    </h3>

                    <p className="text-xs text-[#595c73] line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Barra de progreso real si el usuario tiene avance */}
                    {user && progressData[course.slug] ? (
                      <div className="pt-2 border-t border-[#f6f7f9]">
                        <div className="flex justify-between text-[11px] text-[#595c73] mb-1 font-bold">
                          <span>Progreso del Curso</span>
                          <span className="text-[#6d28d2]">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-[#f6f7f9] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#6d28d2] h-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#595c73] pt-2 border-t border-[#f6f7f9]">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#6d28d2]" />
                      {course.modules?.length || 0} Módulos
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#6d28d2]" />
                      {totalLessons} Lecciones
                    </span>
                  </div>

                  {/* FASES INTEGRADAS DENTRO DE LA CARD */}
                  <div className="space-y-2 pt-1">
                    {/* Fase 1: Entrada Principal al Aula */}
                    {(() => {
                      const isDraft = course.visibility === 'draft' || course.published === false;
                      const isPaid = course.accessType === 'paid';
                      const hasAccess = effectiveIsAdmin || (!isDraft && (!isPaid || verifyUserHasCourseLicense(course, userLicenses)));

                      return (
                        <>
                          <Link
                            href={`/course?id=${course.slug}`}
                            className={`w-full text-center py-2.5 px-4 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                              hasAccess
                                ? 'bg-[#6d28d2] text-white hover:bg-[#5b21b6]'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {hasAccess ? (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Fase 1: Aula Virtual ({totalLessons} Clases)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Matricularse • ${course.price || 49} USD</span>
                              </>
                            )}
                          </Link>

                          {/* Fases 2 y 3: Con control de visibilidad del Administrador y Licencia */}
                          <div className="grid grid-cols-2 gap-2">
                            {course.phase2Visible !== false ? (
                              hasAccess ? (
                                <Link
                                  href={`/scenarios?course=${course.slug}`}
                                  className="py-2 px-2 text-center text-[11px] font-bold rounded-lg border border-[#6d28d2]/30 text-[#6d28d2] bg-[#6d28d2]/5 hover:bg-[#6d28d2]/15 transition-all flex items-center justify-center gap-1"
                                  title="Fase 2: Reflejo Operativo y Reconocimiento Visual"
                                >
                                  <Film className="w-3 h-3 text-[#6d28d2]" />
                                  <span>Fase 2: Reflejo</span>
                                </Link>
                              ) : (
                                <Link
                                  href={`/course?id=${course.slug}`}
                                  className="py-2 px-2 text-center text-[11px] font-semibold rounded-lg border border-amber-500/30 text-amber-700 bg-amber-500/5 hover:bg-amber-500/15 transition-all flex items-center justify-center gap-1"
                                  title="Requiere matrícula para acceder a la Fase 2"
                                >
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Fase 2: Inscripción</span>
                                </Link>
                              )
                            ) : (
                              <span className="py-2 px-2 text-center text-[10px] font-medium rounded-lg border border-dashed border-[#d1d2e0] text-[#595c73] bg-[#f6f7f9] flex items-center justify-center">
                                Fase 2: Inactiva
                              </span>
                            )}

                            {course.phase3Visible !== false && course.phase3Mode !== 'in_course' ? (
                              hasAccess ? (
                                <a
                                  href={`/sandbox?course=${course.slug}`}
                                  className="py-2 px-2 text-center text-[11px] font-bold rounded-lg border border-[#6d28d2]/30 text-[#6d28d2] bg-[#6d28d2]/5 hover:bg-[#6d28d2]/15 transition-all flex items-center justify-center gap-1"
                                  title="Fase 3: Sandbox Finca Ficticia DataGan 360"
                                >
                                  <Target className="w-3 h-3 text-[#6d28d2]" />
                                  <span>Fase 3: Sandbox</span>
                                </a>
                              ) : (
                                <Link
                                  href={`/course?id=${course.slug}`}
                                  className="py-2 px-2 text-center text-[11px] font-semibold rounded-lg border border-amber-500/30 text-amber-700 bg-amber-500/5 hover:bg-amber-500/15 transition-all flex items-center justify-center gap-1"
                                  title="Requiere matrícula para acceder a la Fase 3"
                                >
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Fase 3: Inscripción</span>
                                </Link>
                              )
                            ) : course.phase3Visible !== false && course.phase3Mode === 'in_course' ? (
                              <Link
                                href={`/course?id=${course.slug}`}
                                className="py-2 px-2 text-center text-[11px] font-medium rounded-lg border border-[#6d28d2]/30 text-[#6d28d2] bg-[#6d28d2]/5 hover:bg-[#6d28d2]/15 transition-all flex items-center justify-center gap-1"
                                title="Fase 3 accesible dentro del aula"
                              >
                                {hasAccess ? <Target className="w-3 h-3 text-[#6d28d2]" /> : <Lock className="w-3 h-3 text-amber-600" />}
                                <span>Fase 3: En Aula</span>
                              </Link>
                            ) : (
                              <span className="py-2 px-2 text-center text-[10px] font-medium rounded-lg border border-dashed border-[#d1d2e0] text-[#595c73] bg-[#f6f7f9] flex items-center justify-center">
                                Fase 3: Inactiva
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Certificado Zootécnico Específico de este Curso */}
                    <Link
                      href={`/certificate?course=${course.slug}`}
                      className="w-full text-center py-2 px-3 text-[11px] font-bold rounded-lg border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-[#c4710d]" />
                      <span>Certificado Zootécnico</span>
                      {progressPercent >= 80 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                          ¡Listo!
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
