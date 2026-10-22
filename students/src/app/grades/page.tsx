'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Award,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  Volume2,
  HelpCircle,
  RotateCcw,
  Home,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { formatUtcInTimeZone } from '@/lib/lmsData';

function GradebookContent() {
  const searchParams = useSearchParams();
  const requestedCourse = searchParams?.get('course') || 'all';

  const { courses, assignments, timeZone } = useLms();
  const [selectedCourse, setSelectedCourse] = useState<string>(requestedCourse);

  const visibleAssignments = useMemo(() => {
    if (selectedCourse === 'all') return assignments;
    return assignments.filter((a) => a.courseSlug === selectedCourse);
  }, [assignments, selectedCourse]);

  const gradedList = visibleAssignments.filter((a) => typeof a.finalGrade === 'number');
  const overallAverage = useMemo(() => {
    if (!gradedList.length) return null;
    const sum = gradedList.reduce((acc, a) => acc + (a.finalGrade || 0), 0);
    return Number((sum / gradedList.length).toFixed(2));
  }, [gradedList]);

  const getCutAverage = (cutId: 'cut_1' | 'cut_2' | 'cut_3') => {
    const inCut = visibleAssignments.filter(
      (a) => a.cutId === cutId && typeof a.finalGrade === 'number'
    );
    if (!inCut.length) return null;
    const sum = inCut.reduce((acc, a) => acc + (a.finalGrade || 0), 0);
    return Number((sum / inCut.length).toFixed(2));
  };

  const cut1Avg = getCutAverage('cut_1');
  const cut2Avg = getCutAverage('cut_2');
  const cut3Avg = getCutAverage('cut_3');

  const currentCourse = courses.find((c) => c.slug === selectedCourse);
  const isAcademicCuts =
    currentCourse?.evaluationModel === 'academic_cuts' ||
    (selectedCourse === 'all' &&
      visibleAssignments.some(
        (a) => a.cutId === 'cut_1' || a.cutId === 'cut_2' || a.cutId === 'cut_3'
      ));

  const [targetFinalGrade, setTargetFinalGrade] = useState<number>(3.0);
  const [cut1Simulated, setCut1Simulated] = useState<number>(cut1Avg ?? 0);
  const [cut2Simulated, setCut2Simulated] = useState<number>(cut2Avg ?? 0);

  const requiredCut3Score = useMemo(() => {
    const accumulated = cut1Simulated * 0.3 + cut2Simulated * 0.3;
    const needed = (targetFinalGrade - accumulated) / 0.4;
    return Number(Math.max(0, Math.min(5.0, needed)).toFixed(2));
  }, [targetFinalGrade, cut1Simulated, cut2Simulated]);

  const cutLabel = (cutId: string) => {
    if (cutId === 'cut_1') return 'Primera parte';
    if (cutId === 'cut_2') return 'Segunda parte';
    if (cutId === 'cut_3') return 'Parte final';
    if (cutId === 'free') return 'Evaluación continua';
    if (cutId?.startsWith('period_')) {
      const num = cutId.replace('period_', '');
      return num === 'final' ? 'Evaluación final' : `Periodo ${num}`;
    }
    if (cutId?.startsWith('mod-')) return 'Por módulo';
    return 'General';
  };

  const handleExportTranscriptCsv = () => {
    const headers = [
      'Curso',
      'Tarea',
      'Parte del curso',
      'Valor en esa parte (%)',
      'Estado',
      'Nota (de 0.0 a 5.0)',
    ];
    const rows = visibleAssignments.map((a) => [
      `"${a.courseTitle}"`,
      `"${a.title}"`,
      cutLabel(a.cutId),
      String(a.weightInCutPercent),
      a.status === 'graded'
        ? 'Calificada'
        : a.status === 'submitted'
          ? 'Entregada'
          : 'Pendiente',
      a.finalGrade !== undefined ? a.finalGrade.toFixed(2) : 'Sin calificar',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mis-notas-ipt-course.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetCalculator = () => {
    setCut1Simulated(cut1Avg ?? 0);
    setCut2Simulated(cut2Avg ?? 0);
    setTargetFinalGrade(3.0);
  };

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main id="main-content" className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Calificaciones</span>
        </nav>

        {/* Cabecera */}
        <section className="bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl lg:text-2xl font-bold text-[#0f0f0f] leading-snug">
                Mis Notas y Calificaciones
              </h1>
              <p className="text-[15px] text-[#595c73]">
                Consulta cuánto has sacado en cada tarea. Las notas van de 0.0 a 5.0 y el curso se aprueba con 3.0 o más.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="grades-course-filter" className="text-[13px] text-[#595c73]">
                Ver curso:
              </label>
              <select
                id="grades-course-filter"
                name="grades-course-filter"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                aria-label="Elegir el curso para ver sus notas"
                className="ipt-input !py-2 !px-3 !text-[14px]"
              >
                <option value="all">Todos mis cursos</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportTranscriptCsv}
                disabled={visibleAssignments.length === 0}
                className="btn-outline-violet !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Descargar tabla de notas (para Excel)</span>
              </button>
            </div>
          </div>

          <details className="text-[14px] text-[#2a2b3f] border-t border-[#e9eaf2] pt-4">
            <summary className="font-medium cursor-pointer flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#6d28d2] shrink-0" />
              <span>¿Cómo se calcula mi nota final del curso?</span>
            </summary>
            <p className="mt-2 text-[#595c73] leading-[1.6] pl-6">
              {isAcademicCuts ? (
                <>
                  El curso se divide en tres partes: la <strong>Primera parte</strong> vale el 30% de la nota, la <strong>Segunda parte</strong> vale otro 30%, y la <strong>Parte final</strong> vale el 40% restante. Al sumar las tres partes obtienes tu promedio final de 0.0 a 5.0.
                </>
              ) : (
                <>
                  La evaluación en este curso es <strong>continua y directa</strong>: cada tarea o taller calificado suma proporcionalmente a tu promedio final de 0.0 a 5.0 sin divisiones semestrales rígidas.
                </>
              )}
            </p>
          </details>
        </section>

        {/* Resumen de Calificaciones */}
        {isAcademicCuts ? (
          <section className="bg-[#202230] text-[#ffffff] rounded-[16px] border border-[#3d4055] p-6 grid grid-cols-1 md:grid-cols-4 gap-6 tabular-nums">
            <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
              <span className="text-[13px] text-[#b7b9cd] block">
                Tu nota promedio hasta hoy
              </span>
              <span className="text-[28px] font-bold text-[#c0c4fc]">
                {overallAverage !== null ? `${overallAverage.toFixed(2)} / 5.00` : 'Sin notas aún'}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                {overallAverage === null
                  ? 'Aún no hay tareas calificadas'
                  : overallAverage >= 3.0
                    ? 'Vas aprobando el curso'
                    : 'Necesitas subir el promedio a 3.0'}
              </span>
            </div>

            <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
              <span className="text-[13px] text-[#b7b9cd] block">Primera parte (vale 30%)</span>
              <span className="text-[22px] font-bold text-[#ffffff]">
                {cut1Avg !== null ? `${cut1Avg.toFixed(2)} / 5.00` : 'Sin calificar'}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                {cut1Avg !== null ? 'Calificada' : 'Sin entregas calificadas'}
              </span>
            </div>

            <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
              <span className="text-[13px] text-[#b7b9cd] block">Segunda parte (vale 30%)</span>
              <span className="text-[22px] font-bold text-[#ffffff]">
                {cut2Avg !== null ? `${cut2Avg.toFixed(2)} / 5.00` : 'Sin calificar'}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                {cut2Avg !== null ? 'Calificada' : 'Sin entregas calificadas'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[13px] text-[#b7b9cd] block">
                Parte final (vale 40%)
              </span>
              <span className="text-[22px] font-bold text-[#ffffff]">
                {cut3Avg !== null ? `${cut3Avg.toFixed(2)} / 5.00` : 'Sin calificar'}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                {cut3Avg !== null ? 'Calificada' : 'Sin entregas calificadas'}
              </span>
            </div>
          </section>
        ) : (
          <section className="bg-[#202230] text-[#ffffff] rounded-[16px] border border-[#3d4055] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 tabular-nums">
            <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
              <span className="text-[13px] text-[#b7b9cd] block">
                Promedio Acumulado
              </span>
              <span className="text-[28px] font-bold text-[#c0c4fc]">
                {overallAverage !== null ? `${overallAverage.toFixed(2)} / 5.00` : 'Sin notas aún'}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                {overallAverage === null
                  ? 'Aún no hay actividades calificadas'
                  : overallAverage >= 3.0
                    ? 'Aprobando satisfactoriamente'
                    : 'Necesitas subir el promedio a 3.0'}
              </span>
            </div>

            <div className="space-y-1 border-b md:border-b-0 md:border-r border-[#3d4055] pb-4 md:pb-0 md:pr-4">
              <span className="text-[13px] text-[#b7b9cd] block">Progreso de Evaluación</span>
              <span className="text-[22px] font-bold text-[#ffffff]">
                {gradedList.length} de {visibleAssignments.length}
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                Actividades calificadas en total
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[13px] text-[#b7b9cd] block">
                Esquema de Evaluación
              </span>
              <span className="text-[22px] font-bold text-[#38d494]">
                Evaluación Continua
              </span>
              <span className="text-[13px] text-[#b7b9cd] block">
                Sin cortes ni periodos rígidos
              </span>
            </div>
          </section>
        )}

        {/* Tabla de tareas y notas */}
        <section className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] overflow-hidden">
          <div className="p-6 border-b border-[#e9eaf2] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold text-[#2a2b3f]">
                Detalle de tus tareas y notas
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Haz clic en una tarea para abrirla o ver los comentarios del profesor.
              </p>
            </div>
            <Link
              href="/certificate"
              className="btn-solid-dark !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Ver mi diploma</span>
            </Link>
          </div>

          {visibleAssignments.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-[16px] font-medium text-[#2a2b3f]">
                Aún no hay tareas ni calificaciones registradas
              </p>
              <p className="text-[14px] text-[#595c73]">
                Las tareas creadas y calificadas desde la sección de Tareas o el Panel de Administrador aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#f6f7f9] border-b border-[#d1d2e0] text-[13px] font-medium text-[#595c73]">
                    <th className="py-3.5 px-6">Tarea y curso</th>
                    <th className="py-3.5 px-4">Parte del curso</th>
                    <th className="py-3.5 px-4">Plazo de entrega</th>
                    <th className="py-3.5 px-4">Comentarios del profesor</th>
                    <th className="py-3.5 px-6 text-right">Nota obtenida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9eaf2] text-[14px]">
                  {visibleAssignments.map((asg) => (
                    <tr key={asg.id} className="hover:bg-[#f6f7f9]/60">
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#2a2b3f]">{asg.title}</div>
                        <div className="text-[13px] text-[#595c73] mt-0.5">
                          {asg.courseTitle}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#2a2b3f]">
                        {cutLabel(asg.cutId)}
                      </td>
                      <td className="py-4 px-4 text-[13px] text-[#595c73]">
                        {formatUtcInTimeZone(asg.dueDateUtc, timeZone)}
                      </td>
                      <td className="py-4 px-4">
                        {asg.multimediaFeedback ? (
                          <Link
                            href={`/assignments?id=${asg.id}`}
                            className="text-[13px] font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>Escuchar o leer comentarios</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/assignments?id=${asg.id}`}
                            className="text-[13px] font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Abrir tarea</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {typeof asg.finalGrade === 'number' ? (
                          <span className="text-[18px] font-bold text-[#6d28d2]">
                            {asg.finalGrade.toFixed(2)} / 5.0
                          </span>
                        ) : asg.status === 'submitted' ? (
                          <span className="ipt-badge-violet">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>En revisión</span>
                          </span>
                        ) : (
                          <span className="ipt-badge-ember">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Falta por enviar</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Calculadora sencilla de nota */}
        {isAcademicCuts && (
        <section className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#2a2b3f] flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#6d28d2]" />
                <span>Calculadora: ¿Qué nota necesito sacar en la parte final?</span>
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Puedes cambiar los números de abajo libremente para hacer tus cuentas; tus notas reales no se borrarán.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetCalculator}
              className="btn-ghost-neutral !py-1.5 !px-3 !text-[13px] inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer calculadora</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end tabular-nums">
            <div className="space-y-1">
              <label htmlFor="sim-c1" className="block text-[13px] font-medium text-[#2a2b3f]">
                Nota en la Primera parte (30%)
              </label>
              <input
                id="sim-c1"
                name="sim-c1"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={cut1Simulated}
                onChange={(e) => setCut1Simulated(Number(e.target.value))}
                className="ipt-input w-full"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sim-c2" className="block text-[13px] font-medium text-[#2a2b3f]">
                Nota en la Segunda parte (30%)
              </label>
              <input
                id="sim-c2"
                name="sim-c2"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={cut2Simulated}
                onChange={(e) => setCut2Simulated(Number(e.target.value))}
                className="ipt-input w-full"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sim-target" className="block text-[13px] font-medium text-[#2a2b3f]">
                Nota final que quieres lograr (3.0 a 5.0)
              </label>
              <input
                id="sim-target"
                name="sim-target"
                type="number"
                step="0.1"
                min="3.0"
                max="5.0"
                value={targetFinalGrade}
                onChange={(e) => setTargetFinalGrade(Number(e.target.value))}
                className="ipt-input w-full"
              />
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#f6f7f9] border border-[#6d28d2] flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#2a2b3f]">
                Necesitas sacar al final:
              </span>
              <span className="text-[20px] font-bold text-[#6d28d2]">
                {requiredCut3Score.toFixed(2)} / 5.0
              </span>
            </div>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

export default function GradesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#ffffff] p-8 text-xs text-[#606060]">
          Abriendo tus notas...
        </div>
      }
    >
      <GradebookContent />
    </Suspense>
  );
}
