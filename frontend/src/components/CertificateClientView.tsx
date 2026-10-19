'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Award, Printer, ArrowLeft, CheckCircle2, HelpCircle, Shield, Home } from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';

interface CertificateClientViewProps {
  courseSlug?: string;
}

export default function CertificateClientView({ courseSlug }: CertificateClientViewProps) {
  const { courses, assignments } = useLms();
  const { user, effectiveIsAdmin } = useAuth();

  const [selectedSlug, setSelectedSlug] = useState<string>(
    courseSlug || courses[0]?.slug || ''
  );
  const [studentName, setStudentName] = useState<string>(
    user?.displayName || ''
  );

  useEffect(() => {
    if (user?.displayName && !studentName) {
      setStudentName(user.displayName);
    }
  }, [user, studentName]);

  useEffect(() => {
    if (!selectedSlug && courses[0]) {
      setSelectedSlug(courses[0].slug);
    }
  }, [courses, selectedSlug]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || courses[0],
    [courses, selectedSlug]
  );

  const gradedAssignments = assignments.filter(
    (a) =>
      (!activeCourse || a.courseSlug === activeCourse.slug) &&
      typeof a.finalGrade === 'number'
  );
  const currentAverage = useMemo(() => {
    if (!gradedAssignments.length) return 'Sin calificar';
    const sum = gradedAssignments.reduce((acc, a) => acc + (a.finalGrade || 0), 0);
    return `${(sum / gradedAssignments.length).toFixed(2)} de 5.0`;
  }, [gradedAssignments]);

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main id="main-content" className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Certificados</span>
        </nav>

        <section className="bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl lg:text-2xl font-bold text-[#0f0f0f] leading-snug">
                Tus Certificados de Finalización
              </h1>
              <p className="text-xs text-[#606060]">
                Elige el curso, verifica que tu nombre esté bien escrito y presiona “Imprimir o guardar en PDF”.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/grades"
                className="btn-ghost-neutral !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Mis Notas</span>
              </Link>

              {activeCourse && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-outline-violet !py-2 !px-4 !text-[14px] inline-flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir o guardar en PDF</span>
                </button>
              )}
            </div>
          </div>

          {courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#e9eaf2]">
              <div className="space-y-1">
                <label htmlFor="cert-course-select" className="block text-[13px] font-medium text-[#2a2b3f]">
                  1. Elige el curso del diploma:
                </label>
                <select
                  id="cert-course-select"
                  name="cert-course-select"
                  value={activeCourse?.slug || ''}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="ipt-input w-full !py-2 !text-[14px]"
                >
                  {courses.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="cert-student-name" className="block text-[13px] font-medium text-[#2a2b3f]">
                  2. Nombre completo como aparecerá en el diploma:
                </label>
                <input
                  id="cert-student-name"
                  name="cert-student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Escribe tu nombre completo..."
                  className="ipt-input w-full !py-2 !text-[14px]"
                />
              </div>
            </div>
          )}

          <details className="text-[14px] text-[#2a2b3f] pt-1">
            <summary className="font-medium cursor-pointer flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#065fd4] shrink-0" />
              <span>¿Cómo guardo este diploma en mi computador?</span>
            </summary>
            <p className="mt-2 text-[#595c73] leading-[1.6] pl-6">
              Haz clic en el botón <strong>“Imprimir o guardar en PDF”</strong>. En la ventana que se abre, donde dice <em>Destino</em> o <em>Impresora</em>, elige la opción <strong>“Guardar como PDF”</strong> y presiona Guardar.
            </p>
          </details>
        </section>

        {!activeCourse ? (
          <section className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-10 text-center space-y-4">
            <Award className="w-12 h-12 text-[#065fd4] mx-auto" />
            <h2 className="text-[20px] font-bold text-[#2a2b3f]">
              Aún no hay cursos publicados para generar diplomas
            </h2>
            <p className="text-[15px] text-[#595c73] max-w-[50ch] mx-auto">
              Cuando haya cursos publicados en el catálogo podrás ver e imprimir aquí tu constancia de estudio.
            </p>
          </section>
        ) : (
          /* Vista previa del diploma lista para imprimir */
          <section className="bg-[#ffffff] rounded-[24px] border-2 border-[#065fd4] p-8 lg:p-14 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[1000px] border border-[#065fd4] text-[#065fd4] text-[13px] font-medium">
              <Award className="w-4 h-4" />
              <span>Constancia de Estudio · IPT Course & TecnoGan</span>
            </div>

            <div className="space-y-2">
              <p className="text-[15px] text-[#595c73]">
                Se otorga el presente reconocimiento a:
              </p>
              <h2 className="text-[28px] lg:text-[36px] font-bold text-[#2a2b3f] leading-[1.2]">
                {studentName || 'Estudiante'}
              </h2>
            </div>

            <div className="max-w-[60ch] mx-auto space-y-2">
              <p className="text-[15px] text-[#595c73]">
                Por haber cursado las clases y actividades de:
              </p>
              <h3 className="text-[22px] font-bold text-[#065fd4] leading-[1.3]">
                {activeCourse.title}
              </h3>
              <p className="text-[14px] text-[#595c73] tabular-nums">
                Duración: {activeCourse.approxHours || 'Programa completo'} · Nota promedio: {currentAverage}
              </p>
              <p className="text-[12px] text-[#595c73] pt-1">
                Expedido por IPT Course y TecnoGan como parte del programa oficial de formación técnica de Ivan Perez Tech (IPT).
              </p>
            </div>

            <div className="pt-8 border-t border-[#e9eaf2] max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 text-[14px]">
              <div>
                <div className="font-bold text-[#2a2b3f]">{activeCourse.instructor?.name || 'Dirección Académica IPT'}</div>
                <div className="text-[13px] text-[#595c73]">Profesor del curso</div>
              </div>
              <div>
                <div className="font-bold text-[#2a2b3f] inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#065fd4]" />
                  <span>{new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date())}</span>
                </div>
                <div className="text-[13px] text-[#595c73]">Fecha de emisión</div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
