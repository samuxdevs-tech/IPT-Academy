'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Video,
  Users,
  CheckCircle2,
  Eye,
  Volume2,
  Calendar,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import InstitutionalNavbar from '@/components/InstitutionalNavbar';
import { useLms, FontScaleMode } from '@/context/LmsContext';

export default function LearningAnalyticsAndSupportPage() {
  const {
    courses,
    studentAnalytics,
    highContrast,
    setHighContrast,
    fontScale,
    setFontScale,
    speakText,
    createCalendarEvent,
  } = useLms();

  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [scheduledMessage, setScheduledMessage] = useState<string | null>(null);

  const filteredStudents = studentAnalytics.filter((s) =>
    riskFilter === 'all' ? true : s.dropoutRiskLevel === riskFilter
  );

  const needSupportCount = studentAnalytics.filter(
    (s) => s.dropoutRiskLevel === 'high' || s.dropoutRiskLevel === 'medium'
  ).length;

  const onTrackCount = studentAnalytics.length - needSupportCount;

  const avgVideoEngagement =
    studentAnalytics.length > 0
      ? Math.round(
          studentAnalytics.reduce((acc, s) => acc + s.videoParticipationPercent, 0) /
            studentAnalytics.length
        )
      : 0;

  const groupAverageGrade =
    studentAnalytics.length > 0
      ? (
          studentAnalytics.reduce((acc, s) => acc + s.currentGpa, 0) /
          studentAnalytics.length
        ).toFixed(2)
      : '0.00';

  const publishedLessons = useMemo(() => {
    const list: Array<{ id: string; courseTitle: string; lessonTitle: string; duration: string }> = [];
    courses.forEach((c) => {
      (c.modules || []).forEach((m) => {
        (m.lessons || []).forEach((l) => {
          list.push({
            id: `${c.slug}-${l.id}`,
            courseTitle: c.title,
            lessonTitle: l.title,
            duration: l.duration || 'Clase en video',
          });
        });
      });
    });
    return list;
  }, [courses]);

  const handleScheduleTutoring = (studentName: string, program: string, courseSlug: string) => {
    const tomorrow = new Date(Date.now() + 86400 * 1000);
    const end = new Date(tomorrow.getTime() + 45 * 60000);

    createCalendarEvent({
      title: `Asesoría de refuerzo con ${studentName}`,
      description: `Reunión individual para ponerse al día en el curso ${program}.`,
      category: 'tutoring',
      courseSlug: courseSlug || 'general',
      courseTitle: program,
      startUtc: tomorrow.toISOString(),
      endUtc: end.toISOString(),
      locationOrUrl: 'Videollamada con el profesor',
      syncedProviders: ['google_calendar'],
      createdByRole: 'instructor',
    });

    setScheduledMessage(
      `Se agregó la asesoría con ${studentName} al Calendario para mañana.`
    );
  };

  return (
    <div className="min-h-screen bg-[#e9eaf2] text-[#2a2b3f]">
      <InstitutionalNavbar
        pageSummaryForScreenReader={`Avance del Grupo. Hay ${studentAnalytics.length} estudiantes registrados.`}
      />

      <main id="main-content" className="max-w-[1200px] mx-auto py-8 px-4 lg:px-6 space-y-8">
        {/* Cabecera */}
        <section className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-2">
          <h1 className="text-[24px] lg:text-[32px] font-bold text-[#2a2b3f] leading-[1.2]">
            Avance del Grupo y Seguimiento de Clases
          </h1>
          <p className="text-[15px] text-[#595c73]">
            Aquí el profesor puede ver en tiempo real los usuarios registrados, quiénes van al día y quiénes necesitan apoyo con sus tareas.
          </p>
        </section>

        {/* Resumen numérico sencillo */}
        <section className="bg-[#202230] text-[#ffffff] rounded-[16px] border border-[#3d4055] p-6 grid grid-cols-1 md:grid-cols-4 gap-6 tabular-nums">
          <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
            <span className="text-[13px] text-[#b7b9cd] block">
              Videos vistos por el grupo
            </span>
            <span className="text-[32px] font-bold text-[#c0c4fc]">
              {avgVideoEngagement}%
            </span>
            <span className="text-[13px] text-[#b7b9cd] block">
              Promedio de las clases publicadas
            </span>
          </div>

          <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
            <span className="text-[13px] text-[#b7b9cd] block">
              Estudiantes que van al día
            </span>
            <span className="text-[32px] font-bold text-[#ffffff]">
              {onTrackCount} de {studentAnalytics.length}
            </span>
            <span className="text-[13px] text-[#b7b9cd] block">
              Usuarios registrados en Firebase
            </span>
          </div>

          <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
            <span className="text-[13px] text-[#b7b9cd] block">
              Necesitan apoyo esta semana
            </span>
            <span className="text-[32px] font-bold text-[#ffffff]">
              {needSupportCount}
            </span>
            <span className="text-[13px] text-[#b7b9cd] block">
              Por clases o tareas pendientes
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[13px] text-[#b7b9cd] block">
              Nota promedio del grupo
            </span>
            <span className="text-[32px] font-bold text-[#ffffff]">
              {groupAverageGrade} / 5.0
            </span>
            <span className="text-[13px] text-[#b7b9cd] block">
              Se aprueba con 3.0
            </span>
          </div>
        </section>

        {/* Tabla de estudiantes */}
        <section className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] overflow-hidden">
          <div className="p-6 border-b border-[#e9eaf2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-[#2a2b3f] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6d28d2]" />
                <span>Avance de cada estudiante ({studentAnalytics.length})</span>
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Sincronizado en tiempo real con las cuentas de usuario registradas en la plataforma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'Ver todos' },
                  { id: 'high', label: 'Necesitan ayuda urgente' },
                  { id: 'medium', label: 'Con tareas pendientes' },
                  { id: 'low', label: 'Van al día' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRiskFilter(f.id)}
                  className={`px-3 py-1.5 rounded-[1000px] text-[13px] font-medium border cursor-pointer ${
                    riskFilter === f.id
                      ? 'border-[1.5px] border-[#6d28d2] text-[#6d28d2] bg-[#c0c4fc]/15'
                      : 'border-[#d1d2e0] text-[#2a2b3f]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {scheduledMessage && (
            <div
              role="status"
              className="mx-6 mt-4 p-3.5 rounded-[8px] border border-[#6d28d2] bg-[#f6f7f9] text-[14px] text-[#2a2b3f] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6d28d2] shrink-0" />
                <span>{scheduledMessage}</span>
              </div>
              <Link
                href="/calendar"
                className="text-[13px] font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Ver en el Calendario →</span>
              </Link>
            </div>
          )}

          {filteredStudents.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-[15px] font-medium text-[#2a2b3f]">
                No hay estudiantes en esta vista todavía
              </p>
              <p className="text-[13px] text-[#595c73]">
                A medida que los estudiantes se registren e inicien sesión, su progreso aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#f6f7f9] border-b border-[#d1d2e0] text-[13px] font-medium text-[#595c73]">
                    <th className="py-3.5 px-6">Nombre y curso</th>
                    <th className="py-3.5 px-4">Videos vistos</th>
                    <th className="py-3.5 px-4">Tareas entregadas</th>
                    <th className="py-3.5 px-4">Nota actual</th>
                    <th className="py-3.5 px-4">Situación</th>
                    <th className="py-3.5 px-6 text-right">Cómo ayudarle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9eaf2] text-[14px]">
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-[#f6f7f9]/60">
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#2a2b3f]">{stu.studentName}</div>
                        <div className="text-[13px] text-[#595c73]">
                          {stu.email} · {stu.program}
                        </div>
                        {stu.riskFactors.length > 0 && (
                          <div className="text-[13px] text-[#c4710d] mt-1">
                            • {stu.riskFactors.join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#e9eaf2] rounded-[1000px] overflow-hidden">
                            <div
                              className="h-full bg-[#6d28d2]"
                              style={{ width: `${stu.videoParticipationPercent}%` }}
                            />
                          </div>
                          <span className="font-medium text-[#2a2b3f]">
                            {stu.videoParticipationPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#2a2b3f]">
                        {stu.assignmentsCompleted} de {stu.assignmentsTotal}
                      </td>
                      <td className="py-4 px-4 font-bold text-[#2a2b3f]">
                        {stu.currentGpa.toFixed(2)} / 5.0
                      </td>
                      <td className="py-4 px-4">
                        {stu.dropoutRiskLevel === 'low' ? (
                          <span className="ipt-badge-violet">Va al día</span>
                        ) : (
                          <span className="ipt-badge-ember">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              {stu.dropoutRiskLevel === 'high'
                                ? 'Necesita apoyo urgente'
                                : 'Falta entregar tarea'}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleScheduleTutoring(stu.studentName, stu.program, stu.courseSlug)
                          }
                          className="btn-outline-violet !py-1.5 !px-3 !text-[13px] cursor-pointer"
                        >
                          Programar asesoría
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Grilla Inferior: Clases publicadas + Comodidad de lectura */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Clases publicadas en los cursos */}
          <div className="lg:col-span-6 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
            <div className="border-b border-[#e9eaf2] pb-4 space-y-1">
              <h2 className="text-[18px] font-bold text-[#2a2b3f] flex items-center gap-2">
                <Video className="w-5 h-5 text-[#6d28d2]" />
                <span>Clases publicadas desde el Panel Admin ({publishedLessons.length})</span>
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Lista en tiempo real de las lecciones activas en los cursos publicados.
              </p>
            </div>

            {publishedLessons.length === 0 ? (
              <p className="text-[14px] text-[#595c73] py-6 text-center">
                Aún no hay lecciones publicadas. Crea un curso desde el Panel de Administrador para ver sus clases aquí.
              </p>
            ) : (
              <div className="divide-y divide-[#e9eaf2] tabular-nums">
                {publishedLessons.map((les) => (
                  <div key={les.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-[13px]">
                    <div className="min-w-0">
                      <span className="font-medium text-[#2a2b3f] block truncate">
                        {les.lessonTitle}
                      </span>
                      <span className="text-[12px] text-[#595c73] block truncate">
                        {les.courseTitle}
                      </span>
                    </div>
                    <span className="text-[#6d28d2] font-medium shrink-0">
                      {les.duration}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comodidad de lectura y opciones de ayuda */}
          <div className="lg:col-span-6 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
            <div className="border-b border-[#e9eaf2] pb-4 space-y-1">
              <h2 className="text-[18px] font-bold text-[#2a2b3f] flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#6d28d2]" />
                <span>Opciones para leer y escuchar más cómodo</span>
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Ajusta el tamaño del texto, oscurece los colores o escucha la explicación en voz alta.
              </p>
            </div>

            <div className="space-y-4 text-[14px]">
              <div className="p-4 rounded-[12px] bg-[#f6f7f9] border border-[#d1d2e0] space-y-2">
                <span className="font-medium text-[#2a2b3f] block">
                  1. Cambiar el tamaño de la letra en toda la página:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'normal', label: 'Letra normal' },
                      { id: 'lg', label: 'Letra grande' },
                      { id: 'xl', label: 'Letra muy grande' },
                    ] as Array<{ id: FontScaleMode; label: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFontScale(item.id)}
                      className={`px-3.5 py-2 rounded-[8px] text-[13px] font-medium border cursor-pointer ${
                        fontScale === item.id
                          ? 'bg-[#ffffff] text-[#6d28d2] border-[1.5px] border-[#6d28d2]'
                          : 'bg-[#ffffff] text-[#2a2b3f] border-[#d1d2e0]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-[12px] bg-[#f6f7f9] border border-[#d1d2e0] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-medium text-[#2a2b3f] block">
                    2. Colores más oscuros para descansar la vista
                  </span>
                  <span className="text-[13px] text-[#595c73] block">
                    Hace que las letras resalten más sobre el fondo.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className="btn-outline-violet !py-2 !px-3.5 !text-[13px] cursor-pointer"
                >
                  {highContrast ? 'Desactivar colores oscuros' : 'Activar colores oscuros'}
                </button>
              </div>

              <div className="p-4 rounded-[12px] bg-[#f6f7f9] border border-[#d1d2e0] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-medium text-[#2a2b3f] block">
                    3. Escuchar el resumen de esta página en voz alta
                  </span>
                  <span className="text-[13px] text-[#595c73] block">
                    El computador leerá para ti los datos principales.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    speakText(
                      `En este momento ${onTrackCount} estudiantes van al día y ${needSupportCount} necesitan apoyo con sus tareas. La nota promedio del grupo es ${groupAverageGrade} sobre 5.0.`
                    )
                  }
                  className="btn-outline-violet !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar resumen</span>
                </button>
              </div>

              {(highContrast || fontScale !== 'normal') && (
                <button
                  type="button"
                  onClick={() => {
                    setHighContrast(false);
                    setFontScale('normal');
                  }}
                  className="btn-ghost-neutral w-full !py-2 !text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Dejar todo con el tamaño y color original</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
