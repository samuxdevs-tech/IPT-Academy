'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Award,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Volume2,
  Paperclip
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { SubmittedFileItem } from '@/types';
import {
  calculateRubricScoreOnScale5,
  formatUtcInTimeZone,
} from '@/lib/lmsData';
import { SubmissionUploadSchema } from '@/lib/lmsSchemas';
import EmbeddedFileViewer from '@/components/EmbeddedFileViewer';

function StudentAssignmentsContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams?.get('id');
  const requestedCourse = searchParams?.get('course');

  const {
    courses,
    assignments,
    submitStudentAssignment,
    timeZone,
  } = useLms();
  const { user } = useAuth();

  const filteredList = useMemo(() => {
    if (!requestedCourse) return assignments;
    const byCourse = assignments.filter((a) => a.courseSlug === requestedCourse);
    return byCourse.length > 0 ? byCourse : assignments;
  }, [assignments, requestedCourse]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    requestedId || filteredList[0]?.id || ''
  );

  const activeAssignment = useMemo(
    () =>
      assignments.find((a) => a.id === selectedAssignmentId) ||
      filteredList[0] ||
      assignments[0],
    [assignments, filteredList, selectedAssignmentId]
  );

  // Formulario de entrega del estudiante
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSizeMb, setUploadFileSizeMb] = useState<number>(2.5);
  const [studentExcerpt, setStudentExcerpt] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector responsivo móvil
  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');

  // Reproducción de audio de retroalimentación
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSelectAssignment = (id: string) => {
    setSelectedAssignmentId(id);
    setMobileTab('detail');
    setUploadError(null);
    setUploadSuccess(null);
    setStudentExcerpt('');
    setUploadFileName('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const mb = Math.max(0.1, Number((file.size / (1024 * 1024)).toFixed(2)));
    setUploadFileSizeMb(mb);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setUploadError(null);
    setUploadSuccess(null);

    const effectiveName =
      uploadFileName.trim() || `Mi_Entrega_${activeAssignment.id}.pdf`;
    const dotIndex = effectiveName.lastIndexOf('.');
    const ext = dotIndex >= 0 ? effectiveName.slice(dotIndex).toLowerCase() : '.pdf';

    const validation = SubmissionUploadSchema.safeParse({
      assignmentId: activeAssignment.id,
      fileName: effectiveName,
      extension: ext,
      sizeMb: Number(uploadFileSizeMb),
      maxAllowedMb: Number(activeAssignment.maxFileSizeMb || 50),
      studentNotes: studentExcerpt.trim() || 'Entrega de tarea completada.',
    });

    if (!validation.success) {
      setUploadError(validation.error.issues[0]?.message || 'Revisa el archivo seleccionado.');
      return;
    }

    if (
      activeAssignment.allowedExtensions &&
      activeAssignment.allowedExtensions.length > 0 &&
      !activeAssignment.allowedExtensions.includes(ext)
    ) {
      setUploadError(
        `Ese formato de archivo (${ext}) no está permitido. Formatos aceptados: ${activeAssignment.allowedExtensions.join(
          ', '
        )}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const newFile: SubmittedFileItem = {
        id: `file-${Date.now()}`,
        fileName: effectiveName,
        extension: ext,
        sizeMb: Number(uploadFileSizeMb),
        uploadedAtUtc: new Date().toISOString(),
        sha256Receipt: 'RECIBO_VERIFICADO',
      };

      submitStudentAssignment(
        activeAssignment.id,
        [newFile, ...(activeAssignment.submittedFiles || [])],
        studentExcerpt.trim() || 'Entrega de tarea completada.'
      );

      setUploadSuccess(
        `¡Entrega registrada con éxito! Tu archivo "${effectiveName}" quedó enviado en tiempo real.`
      );
      setUploadFileName('');
      setStudentExcerpt('');
    } catch {
      setUploadError('Ocurrió un error al guardar tu entrega. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayVoice = (url?: string, text?: string) => {
    if (url && url.startsWith('http')) {
      const audio = new Audio(url);
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
      return;
    }
    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-CO';
      u.onstart = () => setIsPlayingAudio(true);
      u.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(u);
    }
  };

  const getStatusBadge = (asg: typeof assignments[0]) => {
    if (asg.status === 'graded') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Calificada · {asg.finalGrade?.toFixed(2) || '5.00'} / 5.00
        </span>
      );
    }
    if (asg.status === 'submitted') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Entregada · En revisión
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        Pendiente por entregar
      </span>
    );
  };

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f] pb-20">
      <main className="max-w-[1300px] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Cabecera limpia y espaciosa estilo YouTube Studio */}
        <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2f2f2] text-xs font-semibold text-[#0f0f0f]">
              <FileCheck2 className="w-3.5 h-3.5 text-[#065fd4]" />
              <span>Portal de Estudiantes · Nivel 1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f0f0f] tracking-tight">
              Mis Tareas y Entregas
            </h1>
            <p className="text-sm text-[#606060] leading-relaxed">
              Consulta las actividades asignadas, envía tus archivos (PDF, Word, Excel o imágenes), previsualiza tus entregas con el visor integrado y revisa la calificación de tu instructor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/grades"
              prefetch={true}
              className="px-4 py-2.5 rounded-full bg-[#f2f2f2] hover:bg-[#e5e5e5] text-xs font-bold text-[#0f0f0f] inline-flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#065fd4]" />
              <span>Ver mis calificaciones</span>
            </Link>
          </div>
        </section>

        {!activeAssignment ? (
          <section className="bg-[#fafafa] rounded-3xl border border-[#e5e5e5] p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#e5e5e5] flex items-center justify-center mx-auto text-[#606060]">
              <FileText className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#0f0f0f]">
              No hay tareas activas en este momento
            </h2>
            <p className="text-xs text-[#606060] max-w-md mx-auto">
              Cuando tu profesor o instructor publique una tarea para tu curso, aparecerá automáticamente aquí lista para enviar.
            </p>
          </section>
        ) : (
          <div>
            {/* SELECTOR RESPONSIVO DE PESTAÑAS PARA MÓVIL / TABLET (OCULTO EN COMPUTADOR Y MONITORES) */}
            <div className="lg:hidden flex items-center p-1 bg-[#f2f2f2] rounded-2xl mb-6 gap-1">
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer ${
                  mobileTab === 'list'
                    ? 'bg-white text-[#0f0f0f] shadow-xs'
                    : 'text-[#606060] hover:text-[#0f0f0f]'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Tareas ({assignments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('detail')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer ${
                  mobileTab === 'detail'
                    ? 'bg-white text-[#0f0f0f] shadow-xs'
                    : 'text-[#606060] hover:text-[#0f0f0f]'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Detalle y Entrega</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* COLUMNA IZQUIERDA (4 COLS): SELECTOR DE TAREAS (EN MÓVIL SE MUESTRA EN PESTAÑA 'list', EN DESKTOP SIEMPRE ACTIVO) */}
              <div
                className={`lg:col-span-4 space-y-4 ${
                  mobileTab === 'list' ? 'block' : 'hidden lg:block'
                }`}
              >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#606060]">
                  Lista de Tareas ({assignments.length})
                </h3>
                <span className="text-[11px] font-semibold text-[#065fd4]">
                  {assignments.filter((a) => a.status === 'graded').length} de {assignments.length} calificadas
                </span>
              </div>

              <div className="space-y-3">
                {assignments.map((asg) => {
                  const isSelected = asg.id === activeAssignment.id;
                  return (
                    <div
                      key={asg.id}
                      onClick={() => handleSelectAssignment(asg.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-2 border-[#065fd4] shadow-sm ring-4 ring-[#065fd4]/5'
                          : 'bg-[#fafafa] border-[#e5e5e5] hover:bg-white hover:border-[#cccccc]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {getStatusBadge(asg)}
                      </div>

                      <h4 className="text-sm font-bold text-[#0f0f0f] line-clamp-2 leading-snug">
                        {asg.title}
                      </h4>

                      <p className="text-xs text-[#606060] mt-1 truncate">
                        {asg.courseTitle}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#606060] mt-3 pt-2.5 border-t border-[#f0f0f0]">
                        <Clock className="w-3.5 h-3.5 text-[#065fd4]" />
                        <span>Entrega: {formatUtcInTimeZone(asg.dueDateUtc, timeZone)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA (8 COLS): DETALLES, VISORES EMBEBIDOS, FORMULARIO Y RETROALIMENTACIÓN (EN MÓVIL SE MUESTRA EN PESTAÑA 'detail', EN DESKTOP SIEMPRE ACTIVO) */}
            <div
              className={`lg:col-span-8 space-y-6 ${
                mobileTab === 'detail' ? 'block' : 'hidden lg:block'
              }`}
            >
              {/* Botón contextual de retorno para móviles */}
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className="lg:hidden text-xs font-bold text-[#065fd4] inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-blue-50 cursor-pointer min-h-[44px]"
              >
                ← Volver a lista de tareas
              </button>
              {/* FICHA PRINCIPAL DE LA TAREA ACTIVA */}
              <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 lg:p-8 space-y-6 shadow-2xs">
                <div className="border-b border-[#f0f0f0] pb-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#f2f2f2] text-[11px] font-bold text-[#0f0f0f]">
                      {activeAssignment.courseTitle}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[#606060] font-semibold">
                      <Clock className="w-4 h-4 text-[#065fd4]" />
                      <span>
                        Plazo máximo: {formatUtcInTimeZone(activeAssignment.dueDateUtc, timeZone)}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f0f0f]">
                    {activeAssignment.title}
                  </h2>

                  <p className="text-sm text-[#0f0f0f]/80 leading-relaxed">
                    {activeAssignment.instructions}
                  </p>
                </div>

                {/* CRITERIOS DE EVALUACIÓN (RÚBRICA) */}
                {activeAssignment.rubric && activeAssignment.rubric.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#606060]">
                        Criterios de Evaluación ({activeAssignment.rubric.length})
                      </h4>
                      <span className="text-[11px] text-[#065fd4] font-semibold">
                        Escala 0.0 a 5.0
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeAssignment.rubric.map((crit) => (
                        <div
                          key={crit.id}
                          className="p-3.5 rounded-2xl bg-[#fafafa] border border-[#e5e5e5] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#0f0f0f] truncate">
                              {crit.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#e5e5e5] font-bold text-[#606060]">
                              {crit.weightPercent}%
                            </span>
                          </div>
                          <p className="text-[11px] text-[#606060] line-clamp-2 leading-relaxed">
                            {crit.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* RETROALIMENTACIÓN Y CALIFICACIÓN RECIBIDA (SI YA FUE CALIFICADA) */}
              {activeAssignment.status === 'graded' && activeAssignment.multimediaFeedback && (
                <section className="bg-white rounded-3xl border border-emerald-200 p-6 lg:p-8 space-y-5 bg-gradient-to-br from-emerald-50/30 to-white shadow-2xs">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0f0f0f]">
                          Retroalimentación de tu Instructor
                        </h3>
                        <p className="text-xs text-[#606060]">
                          Calificado por {activeAssignment.multimediaFeedback.gradedBy}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                        {activeAssignment.finalGrade?.toFixed(2) || '5.00'} / 5.00
                      </span>
                    </div>
                  </div>

                  {activeAssignment.multimediaFeedback.writtenFeedback && (
                    <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-sm text-[#0f0f0f] leading-relaxed">
                      {activeAssignment.multimediaFeedback.writtenFeedback}
                    </div>
                  )}

                  {/* Audio de voz del instructor */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handlePlayVoice(
                          activeAssignment.multimediaFeedback?.voiceNoteUrl,
                          activeAssignment.multimediaFeedback?.writtenFeedback
                        )
                      }
                      className="px-4 py-2 rounded-full bg-white border border-[#e5e5e5] hover:bg-[#f2f2f2] text-xs font-bold text-[#0f0f0f] inline-flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Volume2 className="w-4 h-4 text-[#065fd4]" />
                      <span>
                        {isPlayingAudio
                          ? 'Escuchando comentario...'
                          : 'Escuchar comentario en voz'}
                      </span>
                    </button>
                  </div>

                  {/* Archivo corregido por el instructor con visor embebido */}
                  {activeAssignment.multimediaFeedback.correctedAttachmentName && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-[#606060]">
                        Archivo con anotaciones del profesor:
                      </span>
                      <EmbeddedFileViewer
                        fileName={activeAssignment.multimediaFeedback.correctedAttachmentName}
                        fileUrl={activeAssignment.multimediaFeedback.correctedAttachmentUrl}
                        defaultExpanded={false}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* ARCHIVOS YA ENTREGADOS POR EL ESTUDIANTE (CON VISOR EMBEBIDO) */}
              {activeAssignment.submittedFiles && activeAssignment.submittedFiles.length > 0 && (
                <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 lg:p-8 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4">
                    <h3 className="text-sm font-bold text-[#0f0f0f] flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#065fd4]" />
                      <span>Tus Archivos Entregados ({activeAssignment.submittedFiles.length})</span>
                    </h3>
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Recibido en Firebase</span>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {activeAssignment.submittedFiles.map((f) => (
                      <EmbeddedFileViewer
                        key={f.id}
                        fileName={f.fileName}
                        fileSizeMb={f.sizeMb}
                        uploadedAtUtc={f.uploadedAtUtc}
                        defaultExpanded={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* FORMULARIO DE SUBIDA DE TAREA */}
              <section className="bg-white rounded-3xl border border-[#e5e5e5] p-6 lg:p-8 space-y-6 shadow-2xs">
                <div className="border-b border-[#f0f0f0] pb-4">
                  <h3 className="text-base font-bold text-[#0f0f0f]">
                    {activeAssignment.submittedFiles && activeAssignment.submittedFiles.length > 0
                      ? 'Enviar una nueva versión de tu trabajo'
                      : 'Enviar mi tarea'}
                  </h3>
                  <p className="text-xs text-[#606060] mt-1">
                    Formatos permitidos:{' '}
                    <span className="font-semibold text-[#0f0f0f]">
                      {(activeAssignment.allowedExtensions || ['.pdf', '.docx', '.xlsx', '.png', '.jpg']).join(', ')}
                    </span>
                    {' '}· Máximo {activeAssignment.maxFileSizeMb || 50} MB.
                  </p>
                </div>

                {uploadError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleStudentSubmit} className="space-y-5">
                  {/* Selector de Archivo limpio */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#0f0f0f]">
                      1. Selecciona tu archivo
                    </label>
                    <label className="border-2 border-dashed border-[#cccccc] hover:border-[#065fd4] rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-[#fafafa] hover:bg-white">
                      <Upload className="w-8 h-8 text-[#606060] mx-auto mb-2" />
                      <span className="text-xs font-bold text-[#0f0f0f] block">
                        Haz clic para elegir un archivo de tu computador o celular
                      </span>
                      <span className="text-[11px] text-[#606060] mt-1 block">
                        PDF, Word (.docx), Excel (.xlsx) o Imágenes (.jpg, .png)
                      </span>
                      <input
                        type="file"
                        onChange={handleFileInputChange}
                        accept={(activeAssignment.allowedExtensions || ['.pdf', '.docx', '.xlsx', '.png', '.jpg']).join(',')}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {uploadFileName && (
                    <div className="p-3.5 rounded-xl bg-[#f2f2f2] border border-[#e5e5e5] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-[#0f0f0f] truncate">
                        <FileText className="w-4 h-4 text-[#065fd4] shrink-0" />
                        <span className="truncate">{uploadFileName}</span>
                      </div>
                      <span className="text-[#606060] text-[11px] font-mono shrink-0">
                        {uploadFileSizeMb} MB
                      </span>
                    </div>
                  )}

                  {/* Notas o comentarios del estudiante */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0f0f0f]">
                      2. Comentarios sobre tu entrega (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={studentExcerpt}
                      onChange={(e) => setStudentExcerpt(e.target.value)}
                      placeholder="Escribe aquí un resumen breve o aclaraciones para tu profesor..."
                      className="w-full px-4 py-3 rounded-2xl border border-[#cccccc] text-xs text-[#0f0f0f] focus:outline-hidden focus:border-[#065fd4] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !uploadFileName}
                    className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all ${
                      uploadFileName && !isSubmitting
                        ? 'bg-[#065fd4] hover:bg-[#004dc0] text-white shadow-sm cursor-pointer'
                        : 'bg-[#f2f2f2] text-[#909090] cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Enviando entrega en tiempo real...'
                        : 'Subir y Confirmar Entrega'}
                    </span>
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-xs text-[#606060]">
          Cargando Tareas del Estudiante...
        </div>
      }
    >
      <StudentAssignmentsContent />
    </Suspense>
  );
}
