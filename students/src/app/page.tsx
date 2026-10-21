'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  ExternalLink,
  Video,
  BookOpen,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

function YouTubeCatalogContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const { courses, assignments, liveSessions } = useLms();
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      setUserProgress({});
      return;
    }
    const progressRef = ref(db, `progress/${user.uid}`);
    const unsub = onValue(
      progressRef,
      (snap) => {
        setUserProgress(snap.exists() ? snap.val() : {});
      },
      () => setUserProgress({})
    );
    return () => unsub();
  }, [user]);

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const visibleCourses = useMemo(() => {
    return courses.filter((c) => c.visibility !== 'draft' && c.published !== false);
  }, [courses]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Todos']);
    visibleCourses.forEach((c) => {
      if (c.category) set.add(c.category);
      else if (c.faculty) set.add(c.faculty);
    });
    if (assignments.length > 0) set.add('Con tareas');
    if (liveSessions.length > 0) set.add('Clases en vivo');
    return Array.from(set);
  }, [visibleCourses, assignments.length, liveSessions.length]);

  const filteredCourses = useMemo(() => {
    return visibleCourses.filter((course) => {
      const cat = course.category || course.faculty || '';
      const matchesCat =
        selectedCategory === 'Todos' ||
        cat === selectedCategory ||
        (selectedCategory === 'Con tareas' &&
          assignments.some((a) => a.courseSlug === course.slug)) ||
        (selectedCategory === 'Clases en vivo' &&
          liveSessions.some((s) => s.courseSlug === course.slug));

      const q = initialQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (course.title.toLowerCase().includes(q) ||
          (course.description || '').toLowerCase().includes(q) ||
          (course.instructor?.name || '').toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q))
      );
    });
  }, [visibleCourses, selectedCategory, initialQuery, assignments, liveSessions]);

  return (
    <main className="flex-1 min-w-0 px-4 sm:px-6 py-4 bg-[#ffffff]">
      {/* Chips de categorías estilo YouTube */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0f0f0f] text-[#ffffff]'
                  : 'bg-[#f2f2f2] text-[#0f0f0f] hover:bg-[#e5e5e5]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Aviso de próxima clase en vivo */}
      {liveSessions.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#f9f9f9] border border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-[#cc0000] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" />
              En Vivo
            </span>
            <div>
              <p className="text-sm font-bold text-[#0f0f0f]">{liveSessions[0].title}</p>
              <p className="text-xs text-[#606060]">
                {liveSessions[0].courseSlug} · Instructor: {liveSessions[0].instructorName}
              </p>
            </div>
          </div>
          <a
            href={liveSessions[0].joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>Entrar a la sala</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Grilla de Cursos estilo YouTube */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {filteredCourses.map((course) => {
            const totalLessons =
              course.modules?.reduce(
                (acc, m) => acc + (m.lessons ? m.lessons.length : 0),
                0
              ) || 0;
            const courseProg =
              userProgress[course.slug] ||
              ((course as any).id ? userProgress[(course as any).id] : null) ||
              {};
            const completedLessonsList = Array.isArray(courseProg.completedLessons)
              ? courseProg.completedLessons
              : courseProg.completedLessons &&
                typeof courseProg.completedLessons === 'object'
              ? Object.keys(courseProg.completedLessons).filter(
                  (k) => courseProg.completedLessons[k]
                )
              : [];
            const completedLessons = completedLessonsList.length;
            const progressPct =
              totalLessons > 0
                ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
                : 0;

            return (
              <Link
                key={course.slug}
                href={`/course?course=${course.slug}`}
                prefetch={true}
                className="group flex flex-col cursor-pointer"
              >
                {/* Miniatura 16:9 */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#0f0f0f] mb-3">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1e2235] to-[#0f0f0f] text-white p-4 text-center">
                      <img
                        src="/favicon.png"
                        alt=""
                        className="w-10 h-10 object-contain mb-2 opacity-90"
                      />
                      <span className="text-xs font-semibold line-clamp-2">
                        {course.title}
                      </span>
                    </div>
                  )}

                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-semibold">
                    {totalLessons} {totalLessons === 1 ? 'clase' : 'clases'}
                  </span>

                  {progressPct > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/30">
                      <div
                        className="h-full bg-[#ff0000]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Metadatos debajo de la miniatura estilo YouTube */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f2f2f2] border border-[#e5e5e5] flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                    <img
                      src="/favicon.png"
                      alt={course.instructor?.name || 'IPT'}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#0f0f0f] leading-snug line-clamp-2 group-hover:text-[#065fd4]">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[#606060] mt-1 truncate">
                      {course.instructor?.name || 'Ivan Perez Tech (IPT)'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-[#606060] mt-0.5">
                      <span>{course.category || 'Curso Oficial'}</span>
                      <span>•</span>
                      {progressPct > 0 ? (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {progressPct}% completado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Disponible
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
                      <span className="px-3 py-1 rounded-full bg-[#f2f2f2] group-hover:bg-[#065fd4] group-hover:text-white text-[11px] font-bold text-[#0f0f0f] transition-colors inline-flex items-center gap-1">
                        <span>Entrar a clases</span>
                        <span>→</span>
                      </span>
                      <span className="text-[10px] text-[#808080] font-medium">
                        {totalLessons} {totalLessons === 1 ? 'lección' : 'lecciones'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="max-w-lg mx-auto my-16 text-center p-8 rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
          <div className="w-14 h-14 rounded-full bg-[#f2f2f2] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-[#606060]" />
          </div>
          <h2 className="text-base font-bold text-[#0f0f0f] mb-1">
            {initialQuery
              ? 'No encontramos cursos con esa búsqueda'
              : 'Aún no hay cursos publicados en el catálogo'}
          </h2>
          <p className="text-xs text-[#606060] leading-relaxed mb-5">
            {initialQuery
              ? 'Intenta con otra palabra o vuelve al catálogo completo.'
              : 'Próximamente encontrarás aquí los cursos disponibles en el catálogo.'}
          </p>
          {initialQuery && (
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-[#0f0f0f] text-white text-xs font-semibold inline-block"
            >
              Ver todos los cursos
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

export default function YouTubeCourseHome() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#ffffff] p-8 text-xs text-[#606060]">
          Cargando catálogo de cursos...
        </div>
      }
    >
      <YouTubeCatalogContent />
    </Suspense>
  );
}
