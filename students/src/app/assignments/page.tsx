'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
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
  ShieldCheck,
  FileCheck2,
  Volume2,
  Paperclip,
  Home,
  Trash2,
  Music,
  Code2,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { formatUtcInTimeZone } from '@/lib/lmsData';
import UnifiedDeliveryViewer, { InlineAnnotationItem } from '@/components/UnifiedDeliveryViewer';
import {
  fetchSubmissions,
  uploadFileToR2,
  sendStudentSubmission,
  FullSubmissionItem,
  SubmissionFileItem,
} from '@/services/taskSyncService';

interface StagedFileItem {
  file: File;
  name: string;
  sizeMb: number;
  ext: string;
}

function StudentAssignmentsContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams?.get('id');
  const requestedCourse = searchParams?.get('course');

  const { assignments, timeZone } = useLms();
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

  // Estado de sincronización en tiempo real con Cloudflare Worker / Local
  const [submissionsList, setSubmissionsList] = useState<FullSubmissionItem[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // Formulario multiarchivo del estudiante
  const [stagedFiles, setStagedFiles] = useState<StagedFileItem[]>([]);
  const [studentExcerpt, setStudentExcerpt] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector responsivo móvil
  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');

  // Cargar entregas del estudiante al seleccionar tarea
  const loadSubmissions = async () => {
    if (!activeAssignment) return;
    setIsLoadingSubmissions(true);
    try {
      const data = await fetchSubmissions(activeAssignment.id);
      setSubmissionsList(data);
    } catch {
      // Ignorar error de red si estamos en modo offline
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
    const handleSync = () => loadSubmissions();
    window.addEventListener('ipt-task-sync-update', handleSync);
    return () => window.removeEventListener('ipt-task-sync-update', handleSync);
  }, [activeAssignment?.id]);

  // Entrega más reciente del estudiante para la tarea activa
  const currentSubmission = useMemo(() => {
    return submissionsList.find((s) => s.assignmentId === activeAssignment?.id);
  }, [submissionsList, activeAssignment?.id]);

  const handleSelectAssignment = (id: string) => {
    setSelectedAssignmentId(id);
    setMobileTab('detail');
    setUploadError(null);
    setUploadSuccess(null);
    setStudentExcerpt('');
    setStagedFiles([]);
  };

  // Selector Multiarchivo (acepta cualquier formato: Audio, PDF, Word, Markdown, TXT, etc.)
  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStaged: StagedFileItem[] = Array.from(files).map((f) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const mb = Math.max(0.01, Number((f.size / (1024 * 1024)).toFixed(2)));
      return {
        file: f,
        name: f.name,
        sizeMb: mb,
        ext,
      };
    });

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setUploadError(null);
  };

  const removeStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setUploadError(null);
    setUploadSuccess(null);

    if (stagedFiles.length === 0 && !studentExcerpt.trim()) {
      setUploadError('Por favor adjunta al menos un archivo o redacta tus respuestas en el campo de texto.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Subir cada archivo a Cloudflare R2
      const uploadedFilesResult: SubmissionFileItem[] = [];
      const subId = `sub-${activeAssignment.id}-${Date.now()}`;

      for (const item of stagedFiles) {
        const uploaded = await uploadFileToR2(item.file, subId);
        uploadedFilesResult.push(uploaded);
      }

      // 2. Registrar la entrega en Cloudflare Worker (D1) y almacenamiento local
      await sendStudentSubmission({
        id: subId,
        assignmentId: activeAssignment.id,
        studentUid: user?.uid || 'student-local',
        studentName: user?.displayName || 'Estudiante IPT',
        studentEmail: user?.email || 'estudiante@ipt.local',
        submissionTextContent: studentExcerpt.trim(),
        files: uploadedFilesResult,
      });

      setUploadSuccess(
        `¡Entrega registrada con éxito! Se subieron ${uploadedFilesResult.length} archivo(s) y tu trabajo quedó listo para revisión docente.`
      );
      setStagedFiles([]);
      setStudentExcerpt('');
      loadSubmissions();
    } catch {
      setUploadError('Ocurrió un error al registrar la entrega. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGraded = currentSubmission?.status === 'graded';
  const isSubmitted = !!currentSubmission;

  return (
    <div className="flex-1 bg-white text-neutral-900 pb-20">
      <main className="max-w-[1300px] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold">Tareas y Entregas</span>
        </nav>

        {/* Cabecera Principal */}
        <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-900">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Portal Académico de Entregas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Mis Tareas y Evaluaciones
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Sistema multiarchivo: entrega documentos (PDF, Word), audios explicativos, notas en texto o código. Revisa en tiempo real las calificaciones, rúbricas y anotaciones in-situ de tu profesor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/grades"
              prefetch={true}
              className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-900 inline-flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Ver mis calificaciones</span>
            </Link>
          </div>
        </section>

        {!activeAssignment ? (
          <section className="bg-neutral-50 rounded-3xl border border-neutral-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
              <FileText className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900">
              No hay tareas activas en este momento
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Cuando tu profesor publique una tarea para tu curso, aparecerá automáticamente aquí lista para enviar.
            </p>
          </section>
        ) : (
          <div>
            {/* SELECTOR RESPONSIVO MÓVIL */}
            <div className="lg:hidden flex items-center p-1 bg-neutral-100 rounded-2xl mb-6 gap-1">
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                  mobileTab === 'list'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Tareas ({assignments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('detail')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                  mobileTab === 'detail'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Detalle y Entrega</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* COLUMNA IZQUIERDA: LISTA DE TAREAS */}
              <div
                className={`lg:col-span-4 space-y-4 ${
                  mobileTab === 'list' ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Actividades ({assignments.length})
                  </h3>
                  <span className="text-[11px] font-semibold text-blue-600">
                    Ponderación por corte
                  </span>
                </div>

                <div className="space-y-3">
                  {assignments.map((asg) => {
                    const isSelected = asg.id === activeAssignment.id;
                    const asgSub = submissionsList.find((s) => s.assignmentId === asg.id);
                    const asgGraded = asgSub?.status === 'graded';
                    const asgSubmitted = !!asgSub;

                    return (
                      <div
                        key={asg.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectAssignment(asg.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectAssignment(asg.id);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] select-none ${
                          isSelected
                            ? 'bg-white border-2 border-blue-600 shadow-sm ring-4 ring-blue-600/5'
                            : 'bg-neutral-50/60 border-neutral-200 hover:bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          {asgGraded ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Calificada · {asgSub?.finalGrade?.toFixed(1) || '5.0'} / 5.0
                            </span>
                          ) : asgSubmitted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Entregada · En revisión
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pendiente por entregar
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-neutral-400">
                            {asg.weightInCutPercent || 20}%
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-neutral-900 line-clamp-2 leading-snug">
                          {asg.title}
                        </h4>

                        <p className="text-xs text-neutral-500 mt-1 truncate">
                          {asg.courseTitle}
                        </p>

                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-3 pt-2.5 border-t border-neutral-100">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Entrega: {formatUtcInTimeZone(asg.dueDateUtc, timeZone)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMNA DERECHA: DETALLE, RÚBRICA, CALIFICACIÓN Y MULTIARCHIVOS */}
              <div
                className={`lg:col-span-8 space-y-6 ${
                  mobileTab === 'detail' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Botón contextual de retorno móvil */}
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className="lg:hidden text-xs font-bold text-blue-600 inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-blue-50 min-h-[44px]"
                >
                  ← Volver a lista de tareas
                </button>

                {/* FICHA DE LA TAREA ACTIVA */}
                <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 space-y-6 shadow-2xs">
                  <div className="border-b border-neutral-100 pb-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="px-3 py-1 rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-900">
                        {activeAssignment.courseTitle} · {activeAssignment.moduleTitle || 'Módulo Principal'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-semibold">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>
                          Plazo: {formatUtcInTimeZone(activeAssignment.dueDateUtc, timeZone)}
                        </span>
                      </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                      {activeAssignment.title}
                    </h2>

                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {activeAssignment.instructions}
                    </p>
                  </div>

                  {/* RÚBRICA DE EVALUACIÓN OFICIAL */}
                  {activeAssignment.rubric && activeAssignment.rubric.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Rúbrica de Evaluación ({activeAssignment.rubric.length} criterios)
                        </h4>
                        <span className="text-[11px] text-blue-600 font-semibold">
                          Escala 0.0 a 5.0
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeAssignment.rubric.map((crit) => (
                          <div
                            key={crit.id}
                            className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {crit.title}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-neutral-200 font-bold text-neutral-600">
                                {crit.weightPercent}%
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                              {crit.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* CALIFICACIÓN Y JUSTIFICACIÓN DEL DOCENTE (SI YA FUE CALIFICADA) */}
                {isGraded && currentSubmission && (
                  <section className="bg-white rounded-3xl border border-emerald-300 p-6 lg:p-8 space-y-5 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-neutral-900">
                            Calificación y Justificación Docente
                          </h3>
                          <p className="text-xs text-neutral-500">
                            Evaluada oficialmente por tu profesor
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-emerald-800 font-bold block uppercase tracking-wider">
                          Nota Final
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                          {currentSubmission.finalGrade?.toFixed(1) || '5.0'} <span className="text-sm font-normal text-neutral-500">/ 5.0</span>
                        </span>
                      </div>
                    </div>

                    {/* Justificación libre redactada por el docente */}
                    {currentSubmission.teacherJustification && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-neutral-700">
                          Justificación del Docente:
                        </span>
                        <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-sm text-neutral-900 leading-relaxed shadow-2xs">
                          {currentSubmission.teacherJustification}
                        </div>
                      </div>
                    )}

                    {/* Desglose de Rúbrica */}
                    {currentSubmission.rubricEvaluations && currentSubmission.rubricEvaluations.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-neutral-700">
                          Evaluación Criterio por Criterio:
                        </span>
                        <div className="grid grid-cols-1 gap-2.5">
                          {currentSubmission.rubricEvaluations.map((item) => (
                            <div key={item.criterionId} className="p-3 rounded-xl bg-white border border-emerald-100 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="font-bold text-neutral-900 block">{item.criterionTitle}</span>
                                {item.teacherComment && (
                                  <span className="text-[11px] text-neutral-600 italic block mt-0.5">
                                    "{item.teacherComment}"
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
                                {item.points?.toFixed(1)} / 5.0
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* VISOR UNIFICADO DE ARCHIVOS ENTREGADOS Y ANOTACIONES IN-SITU */}
                {currentSubmission && currentSubmission.files && currentSubmission.files.length > 0 && (
                  <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <span>Archivos Entregados ({currentSubmission.files.length})</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Haz clic en cada archivo para previsualizarlo y leer las anotaciones ancladas de tu profesor.
                        </p>
                      </div>
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recibido</span>
                      </span>
                    </div>

                    <div className="space-y-4">
                      {currentSubmission.files.map((file, idx) => {
                        const fileAnnotations = (currentSubmission.inlineAnnotations || []).filter(
                          (ann) => !ann.fileId || ann.fileId === file.fileName
                        );

                        return (
                          <UnifiedDeliveryViewer
                            key={file.id || idx}
                            fileName={file.fileName}
                            fileUrl={file.downloadUrl}
                            fileSizeMb={file.fileSize ? Number((file.fileSize / (1024 * 1024)).toFixed(2)) : undefined}
                            uploadedAtUtc={file.uploadedAt || currentSubmission.submittedAt}
                            annotations={fileAnnotations}
                            canAnnotate={false} // El estudiante solo lee las notas
                            defaultExpanded={idx === 0}
                          />
                        );
                      })}
                    </div>

                    {currentSubmission.submissionTextContent && (
                      <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5">
                        <span className="text-xs font-bold text-neutral-700">Comentario del estudiante al entregar:</span>
                        <div className="p-3 rounded-xl bg-neutral-50 text-xs text-neutral-700">
                          {currentSubmission.submissionTextContent}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* FORMULARIO DE ENTREGA MULTIARCHIVOS (Permite cualquier archivo) */}
                <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 space-y-6 shadow-2xs">
                  <div className="border-b border-neutral-100 pb-4">
                    <h3 className="text-base font-bold text-neutral-900">
                      {isSubmitted ? 'Entregar una nueva versión' : 'Realizar Entrega de la Tarea'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Se permite cualquier tipo de archivo (Audios .mp3/.wav, documentos PDF, Word, Excel, texto, código, imágenes o comprimidos).
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
                    {/* Zona de Arrastrar / Cargar Múltiples Archivos */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-neutral-900">
                        1. Adjunta tus archivos (puedes seleccionar varios a la vez)
                      </label>
                      <label className="border-2 border-dashed border-neutral-300 hover:border-blue-600 rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-neutral-50/50 hover:bg-white group">
                        <Upload className="w-8 h-8 text-neutral-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors" />
                        <span className="text-xs font-bold text-neutral-900 block">
                          Haz clic para explorar o arrastra tus archivos aquí
                        </span>
                        <span className="text-[11px] text-neutral-500 mt-1 block">
                          Audios, PDFs, DOCX, TXT, Markdown, código, etc. Sin restricciones de formato.
                        </span>
                        <input
                          type="file"
                          multiple
                          onChange={handleMultipleFilesChange}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {/* Lista de Archivos Preparados para Entrega */}
                    {stagedFiles.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-neutral-700">
                          Archivos seleccionados ({stagedFiles.length}):
                        </span>
                        <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-neutral-50/30 overflow-hidden">
                          {stagedFiles.map((sf, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                                  {['mp3', 'wav', 'ogg', 'm4a'].includes(sf.ext) ? (
                                    <Music className="w-3.5 h-3.5 text-purple-600" />
                                  ) : sf.ext === 'pdf' ? (
                                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-neutral-900 truncate max-w-xs">{sf.name}</p>
                                  <span className="text-[10px] text-neutral-400 uppercase font-mono">{sf.ext || 'archivo'} • {sf.sizeMb} MB</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStagedFile(idx)}
                                className="text-neutral-400 hover:text-rose-600 p-1.5 transition-colors"
                                title="Quitar archivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Texto o Resumen del Estudiante */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-neutral-900">
                        2. Comentarios, desarrollo o notas de tu entrega (opcional)
                      </label>
                      <textarea
                        rows={3}
                        value={studentExcerpt}
                        onChange={(e) => setStudentExcerpt(e.target.value)}
                        placeholder="Escribe aquí un resumen breve, respuestas en texto o aclaraciones sobre tu entrega..."
                        className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || (stagedFiles.length === 0 && !studentExcerpt.trim())}
                      className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                        stagedFiles.length > 0 || studentExcerpt.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm cursor-pointer'
                          : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? 'Subiendo archivos a Cloudflare R2...'
                          : 'Confirmar y Enviar Entrega'}
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
        <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500">
          Cargando Tareas del Estudiante...
        </div>
      }
    >
      <StudentAssignmentsContent />
    </Suspense>
  );
}
