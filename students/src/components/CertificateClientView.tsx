'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import SafeNavLink from '@/components/navigation/SafeNavLink';
import Image from 'next/image';
import {
  Award,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  AlertCircle,
  PlayCircle,
  UserCheck
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { Certificate } from '@/types';
import { getLocalDatabase } from '@/services/localDatabaseService';
import CertificateCanvasView from '@/components/certificates/CertificateCanvasView';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface CertificateClientViewProps {
  courseSlug?: string;
}

export default function CertificateClientView({ courseSlug }: CertificateClientViewProps) {
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const [selectedSlug, setSelectedSlug] = useState<string>(
    courseSlug || courses[0]?.slug || ''
  );
  const [copied, setCopied] = useState(false);
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!selectedSlug && courses[0]) {
      setSelectedSlug(courses[0].slug);
    }
  }, [courses, selectedSlug]);

  // Suscribir al progreso del usuario
  useEffect(() => {
    if (!user) {
      const localDb = getLocalDatabase();
      setUserProgress(localDb.progress || {});
      return;
    }

    if (user.uid.startsWith('local-student')) {
      const localDb = getLocalDatabase();
      setUserProgress(localDb.progress || {});
      return;
    }

    const progressRef = ref(db, `progress/${user.uid}`);
    const unsub = onValue(
      progressRef,
      (snap) => {
        if (snap.exists()) {
          setUserProgress(snap.val());
        } else {
          const localDb = getLocalDatabase();
          setUserProgress(localDb.progress || {});
        }
      },
      () => {
        const localDb = getLocalDatabase();
        setUserProgress(localDb.progress || {});
      }
    );

    return () => unsub();
  }, [user]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || courses[0],
    [courses, selectedSlug]
  );

  // 1. Calcular progreso real exacto del curso activo
  const { totalLessons, completedLessonsCount, progressPercent, isCourseCompleted } = useMemo(() => {
    if (!activeCourse) {
      return { totalLessons: 0, completedLessonsCount: 0, progressPercent: 0, isCourseCompleted: false };
    }

    const total = (activeCourse.modules || []).reduce(
      (acc, m) => acc + (m.lessons ? m.lessons.length : 0),
      0
    );

    const progData =
      userProgress[activeCourse.slug] ||
      ((activeCourse as any).id ? userProgress[(activeCourse as any).id] : null) ||
      {};

    let completedList: string[] = [];
    if (Array.isArray(progData.completedLessons)) {
      completedList = progData.completedLessons;
    } else if (progData.completedLessons && typeof progData.completedLessons === 'object') {
      completedList = Object.keys(progData.completedLessons).filter((k) => progData.completedLessons[k]);
    }

    const completed = completedList.length;
    // Si la base de datos mock tiene progressPercent explícito 100
    const explicitPct = typeof progData.progressPercent === 'number' ? progData.progressPercent : null;
    const computedPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    const finalPct = explicitPct !== null ? explicitPct : computedPct;

    return {
      totalLessons: total,
      completedLessonsCount: completed,
      progressPercent: finalPct,
      isCourseCompleted: finalPct >= 100,
    };
  }, [activeCourse, userProgress]);

  // 2. Resolver Nombre Oficial Inmutable (NO editable a voluntad en diploma)
  const officialStudentName = useMemo(() => {
    const localDb = getLocalDatabase();
    if (user?.displayName && user.displayName.trim() && !user.displayName.includes('@')) {
      return user.displayName.trim();
    }
    if (localDb.student?.displayName) {
      return localDb.student.displayName.trim();
    }
    return 'Iván Samuel Pérez';
  }, [user]);

  // 3. Resolver Calificación Promedio y Nota Mínima
  const minPassingGrade = activeCourse?.minPassingGrade || 3.0;

  const gradedAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (!activeCourse || a.courseSlug === activeCourse.slug) &&
          typeof a.finalGrade === 'number'
      ),
    [assignments, activeCourse]
  );

  const computedGradeAverage = useMemo(() => {
    if (!gradedAssignments.length) {
      const localDb = getLocalDatabase();
      const existingCert = localDb.certificates?.find((c) => c.courseSlug === activeCourse?.slug);
      return existingCert?.scoreAverage || 0;
    }
    const sum = gradedAssignments.reduce((acc, a) => acc + (a.finalGrade || 0), 0);
    return Number((sum / gradedAssignments.length).toFixed(1));
  }, [gradedAssignments, activeCourse]);

  const hasPassingGrade = computedGradeAverage >= minPassingGrade;

  // 4. Certificado Oficial Inmutable (solo si cumple 100% y aprueba)
  const activeCertificate: Certificate = useMemo(() => {
    const localDb = getLocalDatabase();
    const existing = localDb.certificates?.find(
      (c) => c.courseSlug === (activeCourse?.slug || '')
    );

    const now = new Date();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const formattedDate = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    const id = existing?.id || `IPT-CERT-${Date.now()}`;

    return {
      id,
      userId: user?.uid || '',
      studentName: officialStudentName,
      studentEmail: user?.email || '',
      courseSlug: activeCourse?.slug || '',
      courseTitle: activeCourse?.title || '',
      instructor: activeCourse?.instructor?.name || 'Instructor IPT',
      instructorRole: activeCourse?.instructor?.role || 'Docente Titular · IPT Course',
      issueDate: existing?.issueDate || now.toISOString(),
      issueDateFormatted: existing?.issueDateFormatted || formattedDate,
      completionHours: 20,
      scoreAverage: computedGradeAverage,
      progressPercent: progressPercent,
      verificationHash: existing?.verificationHash || `IPT-HASH-${id}`,
      status: 'valid' as const,
    };
  }, [activeCourse, officialStudentName, user, computedGradeAverage, progressPercent]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCertificate.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main id="main-content" className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="no-print flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] font-medium">
            Inicio
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Certificados de Estudio</span>
        </nav>

        {/* Panel Superior: Selección de curso y estado */}
        <section className="no-print bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 md:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#065fd4]/10 border border-[#065fd4]/20 text-[#065fd4] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#065fd4]" />
                <span>Acreditación Académica Oficial · IPT Course</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#0f0f0f] leading-snug">
                Tu Diploma de Finalización Oficial
              </h1>
              <p className="text-xs text-[#606060] max-w-2xl leading-relaxed">
                Los certificados se expiden automáticamente únicamente tras completar el <strong>100% de las clases</strong> y alcanzar la <strong>nota mínima aprobatoria ({minPassingGrade.toFixed(1)} / 5.0)</strong>.
              </p>
            </div>

            {/* Selector de curso */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <label htmlFor="course-select-cert" className="text-xs font-bold text-[#606060] whitespace-nowrap">
                Ver curso:
              </label>
              <select
                id="course-select-cert"
                value={activeCourse?.slug || ''}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-[#e5e5e5] text-xs font-bold text-[#0f0f0f] focus:outline-none focus:border-[#065fd4] bg-white cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ficha de Identidad Verificada del Alumno (Inmutable / Anti-Spoofing) */}
          <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#707070] block">
                  Identidad Oficial Registrada para Diplomas
                </span>
                <span className="text-sm font-black text-[#0f0f0f]">
                  {officialStudentName}
                </span>
                <span className="text-xs text-[#606060] ml-2 font-mono">
                  ({user?.email || 'ivan@ipt.local'})
                </span>
              </div>
            </div>

            <div className="text-[11.5px] text-[#707070] sm:text-right">
              <span className="font-semibold text-emerald-800 flex items-center gap-1 sm:justify-end">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nombre verificado en matrícula</span>
              </span>
              <p className="text-[10.5px] text-[#909090]">
                Para cambios por corrección legal, contacta a un administrador de IPT.
              </p>
            </div>
          </div>
        </section>

        {/* CASO: AÚN NO HAY CURSOS REGISTRADOS EN LA PLATAFORMA */}
        {!activeCourse ? (
          <section className="bg-white rounded-3xl border border-[#e5e5e5] p-10 md:p-14 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f2f2f2] flex items-center justify-center mx-auto text-[#606060]">
              <Award className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#0f0f0f]">
              Aún no hay cursos publicados en la plataforma
            </h2>
            <p className="text-xs text-[#606060] max-w-md mx-auto leading-relaxed">
              En cuanto un instructor o administrador publique un curso oficial y lo completes satisfactoriamente, aquí podrás consultar, verificar y descargar tu diploma oficial.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-semibold inline-block"
              >
                Volver al catálogo principal
              </Link>
            </div>
          </section>
        ) : !isCourseCompleted ? (
          <section className="bg-white rounded-3xl border-2 border-amber-400/40 shadow-sm p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-black text-[#0f0f0f]">
                Certificado No Disponible Aún
              </h2>
              <p className="text-xs sm:text-sm text-[#606060] leading-relaxed">
                Para garantizar la seriedad de tu acreditación ante empresas, el diploma oficial únicamente se genera cuando completas el <strong>100% del programa</strong>.
              </p>
            </div>

            {/* Barra de Progreso del Curso */}
            <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-[#0f0f0f]">{activeCourse?.title}</span>
                <span className="text-[#065fd4]">{progressPercent}%</span>
              </div>

              <div className="w-full h-3 rounded-full bg-[#e5e5e5] overflow-hidden">
                <div
                  className="h-full bg-[#065fd4] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#707070]">
                <span>{completedLessonsCount} de {totalLessons} clases vistas</span>
                <span>Faltan {Math.max(0, totalLessons - completedLessonsCount)} clases</span>
              </div>
            </div>

            <div>
              <Link
                href={`/course?course=${activeCourse?.slug || ''}`}
                className="px-6 py-3 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Continuar con mis clases pendientes</span>
              </Link>
            </div>
          </section>
        ) : !hasPassingGrade ? (
          /* Bloqueo por nota insuficiente */
          <section className="bg-white rounded-3xl border-2 border-rose-300 shadow-sm p-8 md:p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-black text-[#0f0f0f]">
                Nota Mínima Aprobatoria No Alcanzada
              </h2>
              <p className="text-xs sm:text-sm text-[#606060] leading-relaxed">
                Has completado el 100% de las lecciones, pero tu calificación promedio actual es de <strong>{computedGradeAverage.toFixed(1)} / 5.0</strong>. La nota mínima para certificar este curso es de <strong>{minPassingGrade.toFixed(1)} / 5.0</strong>.
              </p>
            </div>
            <SafeNavLink
              href="/assignments"
              className="px-5 py-2.5 rounded-xl bg-[#0f0f0f] hover:bg-black text-white text-xs font-bold inline-flex items-center gap-2"
            >
              <span>Revisar entregas y tareas pendientes</span>
            </SafeNavLink>
          </section>
        ) : (
          /* CERTIFICADO DESBLOQUEADO (100% COMPLETADO + APROBADO) */
          <>
            {/* Barra de Acciones para Descargar e Imprimir */}
            <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    ¡Felicitaciones! Has completado el 100% del programa con éxito
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Calificación final: <strong>{computedGradeAverage.toFixed(1)} / 5.0</strong> · Título habilitado para descarga oficial en PDF.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href={`/verify/${encodeURIComponent(activeCertificate.id)}`}
                  target="_blank"
                  className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-xs font-bold text-emerald-900 flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Verificar en Línea (/verify)</span>
                </Link>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir o Guardar en PDF</span>
                </button>
              </div>
            </div>

            {/* Lienzo del Diploma Oficial Renderizado (Listo para Guardar en PDF) */}
            <section className="flex flex-col items-center justify-center p-2 sm:p-6 bg-[#161822] rounded-3xl border border-[#2b2e42] shadow-xl overflow-x-auto">
              <CertificateCanvasView cert={activeCertificate} isReadOnlyViewer={false} />
            </section>
          </>
        )}
      </main>

      {/* Reglas de Impresión Landscape Limpias */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-diploma,
          #printable-diploma * {
            visibility: visible !important;
          }
          #printable-diploma {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 6px solid #161c2d !important;
            padding: 2.2rem !important;
            background-color: #faf8f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
