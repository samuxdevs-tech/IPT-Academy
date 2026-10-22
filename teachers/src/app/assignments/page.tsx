'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Mic,
  Square,
  Volume2,
  Paperclip,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  FileCheck2,
  Award,
  Sparkles,
  Home,
  MessageSquarePlus,
  Sliders,
  Send,
  User,
  Music,
  X,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { formatUtcInTimeZone } from '@/lib/lmsData';
import UnifiedDeliveryViewer, { InlineAnnotationItem } from '@/components/UnifiedDeliveryViewer';
import {
  fetchSubmissions,
  gradeSubmissionByTeacher,
  requestAiReviewFromWorker,
  syncAssignmentToCloudflare,
  fetchAssignmentsFromCloudflare,
  FullSubmissionItem,
  AiReviewResult,
  RubricEvalItem,
} from '@/services/taskSyncService';

function AdminAssignmentsWorkspace() {
  const searchParams = useSearchParams();
  const requestedId = searchParams?.get('id');
  const requestedCourse = searchParams?.get('course');

  const {
    courses,
    assignments,
    createAssignmentAndSyncCalendar,
    deleteAssignment,
    timeZone,
  } = useLms();
  const { user } = useAuth();

  const [cloudAssignments, setCloudAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchAssignmentsFromCloudflare().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCloudAssignments(data);
      }
    });
  }, []);

  const allAssignments = useMemo(() => {
    const map = new Map<string, any>();
    assignments.forEach((a) => map.set(a.id, a));
    cloudAssignments.forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [assignments, cloudAssignments]);

  const filteredList = useMemo(() => {
    if (!requestedCourse) return allAssignments;
    const byCourse = allAssignments.filter((a) => a.courseSlug === requestedCourse);
    return byCourse.length > 0 ? byCourse : allAssignments;
  }, [allAssignments, requestedCourse]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    requestedId || filteredList[0]?.id || ''
  );

  useEffect(() => {
    if (!selectedAssignmentId && filteredList.length > 0) {
      setSelectedAssignmentId(filteredList[0].id);
    }
  }, [filteredList, selectedAssignmentId]);

  const activeAssignment = useMemo(
    () =>
      allAssignments.find((a) => a.id === selectedAssignmentId) ||
      filteredList[0] ||
      allAssignments[0] ||
      null,
    [allAssignments, filteredList, selectedAssignmentId]
  );

  // Lista de entregas reales de estudiantes para esta tarea
  const [submissions, setSubmissions] = useState<FullSubmissionItem[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Formulario de Calificación Docente (Nota libre + Justificación manual)
  const [freeGrade, setFreeGrade] = useState<number>(4.5);
  const [teacherJustification, setTeacherJustification] = useState<string>('');
  const [rubricEvals, setRubricEvals] = useState<Record<string, number>>({});
  const [submissionAnnotations, setSubmissionAnnotations] = useState<InlineAnnotationItem[]>([]);

  // Estado del Asistente de IA (Cloudflare Workers AI)
  const [isRequestingAi, setIsRequestingAi] = useState(false);
  const [aiReviewData, setAiReviewData] = useState<AiReviewResult | null>(null);

  // Mensajes de estado
  const [gradingNotice, setGradingNotice] = useState<string | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Crear tarea administrativa
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgInstructions, setNewAsgInstructions] = useState('');
  const [newAsgCourseSlug, setNewAsgCourseSlug] = useState(courses[0]?.slug || 'datagan-master-pro');
  const [newAsgCutId, setNewAsgCutId] = useState<'cut_1' | 'cut_2' | 'cut_3'>('cut_1');
  const [newAsgWeight, setNewAsgWeight] = useState<number>(100);
  const [newAsgDueDate, setNewAsgDueDate] = useState(
    new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 16)
  );
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Sincronizar slug del curso por defecto si se cargan cursos después
  useEffect(() => {
    if (courses.length > 0 && (!newAsgCourseSlug || newAsgCourseSlug === 'datagan-master-pro')) {
      setNewAsgCourseSlug(courses[0].slug);
    }
  }, [courses, newAsgCourseSlug]);

  // Selector responsivo móvil
  const [mobileTab, setMobileTab] = useState<'list' | 'grade' | 'create'>('list');

  // Cargar entregas al cambiar de tarea activa
  const loadSubmissions = async () => {
    if (!activeAssignment) return;
    try {
      const data = await fetchSubmissions(activeAssignment.id);
      setSubmissions(data);
      if (data.length > 0 && !selectedSubmissionId) {
        setSelectedSubmissionId(data[0].id);
      }
    } catch (err) {
      console.warn('Error cargando entregas:', err);
    }
  };

  useEffect(() => {
    loadSubmissions();
    const handleSync = () => loadSubmissions();
    window.addEventListener('ipt-task-sync-update', handleSync);
    return () => window.removeEventListener('ipt-task-sync-update', handleSync);
  }, [activeAssignment?.id]);

  // Entrega actualmente seleccionada para calificar
  const currentSubmission = useMemo(() => {
    return submissions.find((s) => s.id === selectedSubmissionId) || submissions[0] || null;
  }, [submissions, selectedSubmissionId]);

  // Sincronizar formulario cuando cambia la entrega seleccionada
  useEffect(() => {
    if (currentSubmission) {
      setFreeGrade(currentSubmission.finalGrade ?? 4.5);
      setTeacherJustification(currentSubmission.teacherJustification || '');
      setSubmissionAnnotations(currentSubmission.inlineAnnotations || []);

      const evalsMap: Record<string, number> = {};
      (currentSubmission.rubricEvaluations || []).forEach((ev) => {
        evalsMap[ev.criterionId] = ev.points;
      });
      setRubricEvals(evalsMap);
      setAiReviewData(null);
      setGradingNotice(null);
      setGradingError(null);
    }
  }, [currentSubmission?.id]);

  const handleSelectAssignment = (id: string) => {
    setSelectedAssignmentId(id);
    setSelectedSubmissionId(null);
    setMobileTab('grade');
    setGradingNotice(null);
    setGradingError(null);
  };

  // Crear tarea administrativa
  const handleCreateAdminAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim()) return;
    const targetCourse = courses.find((c) => c.slug === newAsgCourseSlug) || courses[0];
    const courseTitle = targetCourse?.title || 'DataGAN Master Pro';
    const courseSlug = targetCourse?.slug || newAsgCourseSlug || 'datagan-master-pro';
    const moduleTitle = targetCourse?.modules?.[0]?.title || 'Módulo 1: Fundamentos';

    const created = createAssignmentAndSyncCalendar({
      courseSlug,
      courseTitle,
      moduleTitle,
      cutId: newAsgCutId,
      weightInCutPercent: Number(newAsgWeight) || 100,
      title: newAsgTitle.trim(),
      instructions: newAsgInstructions.trim() || 'Desarrolla la actividad y sube tus archivos de soporte.',
      dueDateUtc: new Date(newAsgDueDate).toISOString(),
      allowedExtensions: ['*'],
      maxFileSizeMb: 50,
      rubric: [
        {
          id: 'crit-1',
          title: 'Claridad, rigor y orden del desarrollo',
          description: 'El trabajo presentado responde de forma integral a la consigna académica.',
          weightPercent: 50,
          maxPoints: 5.0,
          levels: [
            { id: 'l-exc', label: 'Excelente (5.0)', points: 5.0, description: 'Desarrollo impecable.' },
            { id: 'l-sob', label: 'Sobresaliente (4.3)', points: 4.3, description: 'Buen trabajo.' },
            { id: 'l-ace', label: 'Aceptable (3.5)', points: 3.5, description: 'Cumple lo básico.' },
            { id: 'l-ins', label: 'Insuficiente (2.0)', points: 2.0, description: 'Incompleto.' },
          ],
        },
        {
          id: 'crit-2',
          title: 'Evidencia técnica y análisis crítico',
          description: 'Aplica conceptos técnicos y de ingeniería con justificación fundamentada.',
          weightPercent: 50,
          maxPoints: 5.0,
          levels: [
            { id: 'l-exc', label: 'Excelente (5.0)', points: 5.0, description: 'Dominio demostrado.' },
            { id: 'l-sob', label: 'Sobresaliente (4.3)', points: 4.3, description: 'Buen análisis.' },
            { id: 'l-ace', label: 'Aceptable (3.5)', points: 3.5, description: 'Análisis superficial.' },
            { id: 'l-ins', label: 'Insuficiente (2.0)', points: 2.0, description: 'Faltan evidencias.' },
          ],
        },
      ],
    });

    setSelectedAssignmentId(created.id);
    setNewAsgTitle('');
    setNewAsgInstructions('');
    setShowCreateForm(false);
    setMobileTab('list');
    setCreateNotice(`Tarea "${created.title}" creada y publicada.`);

    // Sincronizar en la nube con Cloudflare Worker (D1 SQL)
    syncAssignmentToCloudflare(created).then((synced) => {
      if (synced) {
        setCreateNotice(`Tarea "${created.title}" sincronizada.`);
      }
    });

    setTimeout(() => setCreateNotice(null), 4000);
  };

  // Anotaciones In-Situ (docente anota directamente dentro del visor de archivo)
  const handleAddAnnotation = (ann: Omit<InlineAnnotationItem, 'id' | 'createdAt'>) => {
    const newAnn: InlineAnnotationItem = {
      ...ann,
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
    };
    setSubmissionAnnotations((prev) => [...prev, newAnn]);
  };

  const handleDeleteAnnotation = (annId: string) => {
    setSubmissionAnnotations((prev) => prev.filter((a) => a.id !== annId));
  };

  // Ejecutar Revisión Inteligente con Cloudflare Workers AI
  const handleRunAiReview = async () => {
    if (!currentSubmission) return;
    setIsRequestingAi(true);
    setGradingError(null);
    try {
      const result = await requestAiReviewFromWorker(currentSubmission.id);
      setAiReviewData(result);
    } catch (err: any) {
      setGradingError(err?.message || 'No fue posible conectar con el servicio de Cloudflare Workers AI.');
    } finally {
      setIsRequestingAi(false);
    }
  };

  // Aplicar sugerencias de la IA con 1 clic
  const handleApplyAiFeedback = () => {
    if (!aiReviewData) return;
    setFreeGrade(aiReviewData.suggestedFinalGrade);
    setTeacherJustification(aiReviewData.generalFeedback);

    // Mapear criterios de rúbrica sugeridos
    const updatedEvals: Record<string, number> = { ...rubricEvals };
    aiReviewData.criteriaEvaluations.forEach((crit, idx) => {
      const targetCrit = activeAssignment?.rubric?.[idx];
      if (targetCrit) {
        updatedEvals[targetCrit.id] = crit.aiSuggestedPoints;
      }
    });
    setRubricEvals(updatedEvals);

    // Añadir anotaciones sugeridas por IA
    if (aiReviewData.suggestedAnnotations && aiReviewData.suggestedAnnotations.length > 0) {
      const newAiAnnotations: InlineAnnotationItem[] = aiReviewData.suggestedAnnotations.map((sa) => ({
        id: `ann-ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        lineOrSelection: sa.lineOrSelection,
        commentText: sa.commentText,
        pageOrTimestamp: 'Sugerencia IA',
        authorRole: 'ai',
        createdAt: new Date().toISOString(),
      }));
      setSubmissionAnnotations((prev) => [...prev, ...newAiAnnotations]);
    }

    setGradingNotice('Evaluación de IA aplicada al formulario. Puedes ajustar la nota o editar el texto antes de guardar.');
  };

  // Guardar Calificación Oficial del Docente
  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubmission || !activeAssignment) return;
    setIsSavingGrade(true);
    setGradingNotice(null);
    setGradingError(null);

    const rubricList: RubricEvalItem[] = (activeAssignment.rubric || []).map((crit: any) => ({
      criterionId: crit.id,
      criterionTitle: crit.title,
      points: rubricEvals[crit.id] ?? freeGrade,
      teacherComment: `Puntaje asignado: ${(rubricEvals[crit.id] ?? freeGrade).toFixed(1)} / 5.0`,
    }));

    try {
      await gradeSubmissionByTeacher(currentSubmission.id, {
        finalGrade: Number(freeGrade),
        teacherJustification: teacherJustification.trim() || 'Revisión docente completada.',
        rubricEvaluations: rubricList,
        inlineAnnotations: submissionAnnotations,
      });

      setGradingNotice(`¡Calificación guardada exitosamente! Nota oficial: ${freeGrade.toFixed(1)} / 5.0.`);
      loadSubmissions();
    } catch {
      setGradingError('Ocurrió un error al guardar la calificación.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  return (
    <div className="flex-1 bg-neutral-100 text-neutral-900 font-sans pb-20">
      {/* Cabecera del Panel Docente */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/" className="hover:text-neutral-900 flex items-center gap-1 font-medium">
              <Home className="w-3.5 h-3.5" />
              <span>Panel Principal</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Calificación y Tareas</span>
          </nav>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
            Centro de Evaluación y Calificación Docente
          </span>
          <h1 className="text-base font-extrabold text-neutral-900">
            Gestor de Tareas, Entregas Multiarchivo y Revisión con IA
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-xl">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-neutral-900">{assignments.length}</span>
            <span>actividades</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setMobileTab('create');
            }}
            className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {createNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{createNotice}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 sm:mt-8 space-y-6 sm:space-y-8">
        {/* SELECTOR RESPONSIVO MÓVIL */}
        <div className="lg:hidden flex items-center p-1 bg-white border border-neutral-300 rounded-2xl shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setMobileTab('list');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              mobileTab === 'list' && !showCreateForm
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Tareas ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setMobileTab('grade');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              mobileTab === 'grade' && !showCreateForm
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Calificar ({submissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setMobileTab('create');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              mobileTab === 'create' || showCreateForm
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Crear</span>
          </button>
        </div>

        {/* VISTA MÓVIL Y ESCRITORIO DEL FORMULARIO DE CREACIÓN */}
        {mobileTab === 'create' || showCreateForm ? (
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="border-b border-neutral-100 pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Nueva Actividad Académica
                </span>
                <h2 className="text-lg font-extrabold text-neutral-900">
                  Crear y Publicar Tarea
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Los estudiantes podrán ver esta actividad en su calendario y enviar sus entregas en los formatos configurados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setMobileTab('list');
                }}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Cerrar formulario"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminAssignment} className="space-y-5">
              {/* Título de la Tarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Título de la Tarea <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  placeholder="Ej: Taller 1: Análisis y Modelación de Datos"
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Curso y Corte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Curso Asociado
                  </label>
                  <select
                    value={newAsgCourseSlug}
                    onChange={(e) => setNewAsgCourseSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors bg-white cursor-pointer"
                  >
                    {courses.length > 0 ? (
                      courses.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.title}
                        </option>
                      ))
                    ) : (
                      <option value="datagan-master-pro">DataGAN Master Pro</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Periodo / Corte Académico
                  </label>
                  <select
                    value={newAsgCutId}
                    onChange={(e) => setNewAsgCutId(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors bg-white cursor-pointer"
                  >
                    <option value="cut_1">Primer Corte (35%)</option>
                    <option value="cut_2">Segundo Corte (35%)</option>
                    <option value="cut_3">Tercer Corte (30%)</option>
                  </select>
                </div>
              </div>

              {/* Ponderación y Fecha Límite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Ponderación en el Corte (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={newAsgWeight}
                    onChange={(e) => setNewAsgWeight(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Fecha y Hora Límite de Entrega
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newAsgDueDate}
                    onChange={(e) => setNewAsgDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors bg-white"
                  />
                </div>
              </div>

              {/* Instrucciones */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Instrucciones para el Estudiante
                </label>
                <textarea
                  rows={4}
                  value={newAsgInstructions}
                  onChange={(e) => setNewAsgInstructions(e.target.value)}
                  placeholder="Describe con claridad los objetivos de la actividad, los archivos requeridos y las pautas para su entrega..."
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar Tarea en el Aula</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setMobileTab('list');
                  }}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: LISTA DE TAREAS Y ENTREGAS */}
          <div
            className={`lg:col-span-4 space-y-6 ${
              mobileTab === 'list' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* 1. Lista de Tareas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Actividades del Curso ({assignments.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setMobileTab('create');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {assignments.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-neutral-200 text-center space-y-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-neutral-900">No hay tareas creadas</h4>
                      <p className="text-[11px] text-neutral-500">Publica la primera actividad académica para los estudiantes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(true);
                        setMobileTab('create');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Primera Tarea</span>
                    </button>
                  </div>
                ) : (
                assignments.map((asg) => {
                  const isSelected = asg.id === activeAssignment?.id;
                  return (
                    <div
                      key={asg.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectAssignment(asg.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-white border-2 border-blue-600 shadow-sm ring-4 ring-blue-600/5'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800">
                          {asg.courseTitle}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-400">
                          {asg.weightInCutPercent || 20}%
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2">
                        {asg.title}
                      </h4>
                    </div>
                  );
                })
              )}
              </div>
            </div>

            {/* 2. Lista de Entregas de Estudiantes para la tarea activa */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Entregas de Estudiantes ({submissions.length})</span>
                </h4>
              </div>

              {submissions.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400">
                  No hay entregas registradas para esta tarea aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const isSubSelected = sub.id === currentSubmission?.id;
                    const isSubGraded = sub.status === 'graded';
                    return (
                      <div
                        key={sub.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSubSelected
                            ? 'bg-blue-50/50 border-blue-500 shadow-2xs'
                            : 'bg-neutral-50/60 border-neutral-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-neutral-900 truncate">
                            {sub.studentName}
                          </span>
                          {isSubGraded ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {sub.finalGrade?.toFixed(1)} / 5.0
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>{sub.files?.length || 0} archivo(s)</span>
                          <span>{sub.inlineAnnotations?.length || 0} notas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: ESPACIO DE CALIFICACIÓN, VISOR CON ANOTACIONES E IA */}
          <div
            className={`lg:col-span-8 space-y-6 ${
              mobileTab === 'grade' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Mensaje de confirmación */}
            {gradingNotice && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{gradingNotice}</span>
              </div>
            )}

            {gradingError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{gradingError}</span>
              </div>
            )}

            {!activeAssignment ? (
              <div className="bg-white rounded-3xl border border-neutral-200 p-8 sm:p-12 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-extrabold text-neutral-900">
                    Panel de Calificaciones y Entregas
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Crea una nueva tarea o selecciona una existente de la lista para revisar los trabajos de los estudiantes y realizar anotaciones pedagógicas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setMobileTab('create');
                  }}
                  className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nueva Tarea</span>
                </button>
              </div>
            ) : (
              <>
                {/* SECCIÓN 1: TRABAJO ENTREGADO Y VISOR CON ANOTACIONES IN-SITU */}
                <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 space-y-5 shadow-2xs">
              <div className="border-b border-neutral-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                    Entrega del Alumno
                  </span>
                  <h3 className="text-lg font-extrabold text-neutral-900">
                    {currentSubmission?.studentName || 'Sin selección'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {currentSubmission?.studentEmail} • Enviada: {currentSubmission ? formatUtcInTimeZone(currentSubmission.submittedAt, timeZone) : 'N/A'}
                  </p>
                </div>

                {/* BOTÓN ESTRELLA: REVISIÓN CON IA */}
                {currentSubmission && (
                  <button
                    type="button"
                    onClick={handleRunAiReview}
                    disabled={isRequestingAi}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>
                      {isRequestingAi
                        ? 'Analizando con Cloudflare Workers AI...'
                        : 'Revisar con IA (Llama 3 / DeepSeek)'}
                    </span>
                  </button>
                )}
              </div>

              {/* Texto explicativo adjunto por el estudiante */}
              {currentSubmission?.submissionTextContent && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-600">Comentario del alumno:</span>
                  <p className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {currentSubmission.submissionTextContent}
                  </p>
                </div>
              )}

              {/* ARCHIVOS MULTIFORMATO CON VISOR UNIFICADO Y ANOTACIONES IN-SITU */}
              {currentSubmission?.files && currentSubmission.files.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700">
                      Archivos entregados ({currentSubmission.files.length}):
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Puedes añadir anotaciones contextuales con el botón "Anotar in-situ"
                    </span>
                  </div>

                  {currentSubmission.files.map((file, idx) => {
                    const fileAnnotations = submissionAnnotations.filter(
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
                        canAnnotate={true} // El docente tiene permiso para agregar anotaciones in-situ
                        onAddAnnotation={handleAddAnnotation}
                        onDeleteAnnotation={handleDeleteAnnotation}
                        defaultExpanded={true}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl">
                  {currentSubmission ? 'Esta entrega no incluye archivos adjuntos.' : 'Selecciona una entrega para revisar.'}
                </div>
              )}
            </section>

            {/* SECCIÓN 2: TARJETA DE REVISIÓN CON IA (SI FUE EJECUTADA) */}
            {aiReviewData && (
              <section className="bg-gradient-to-br from-purple-50/60 via-indigo-50/30 to-white rounded-3xl border border-purple-200 p-6 lg:p-8 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-purple-950">
                        Análisis Sugerido por Cloudflare Workers AI
                      </h4>
                      <p className="text-xs text-purple-700">
                        Evaluación automatizada criterio por criterio con citas y feedback
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-purple-800 block uppercase">
                        Nota Sugerida
                      </span>
                      <span className="text-2xl font-extrabold text-purple-900">
                        {aiReviewData.suggestedFinalGrade.toFixed(1)} / 5.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyAiFeedback}
                      className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Aplicar Evaluación de IA
                    </button>
                  </div>
                </div>

                {/* Devolución global sugerida */}
                <div className="p-4 rounded-2xl bg-white border border-purple-100 text-xs text-neutral-800 leading-relaxed shadow-2xs">
                  <span className="font-bold text-purple-900 block mb-1">Devolución sugerida:</span>
                  {aiReviewData.generalFeedback}
                </div>

                {/* Desglose de Criterios con Citas */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-purple-950 block">
                    Criterios analizados con citas textuales:
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {aiReviewData.criteriaEvaluations.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900">{item.criterionTitle}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                            {item.aiSuggestedPoints.toFixed(1)} / 5.0
                          </span>
                        </div>
                        {item.aiQuote && (
                          <p className="text-[11px] text-neutral-600 italic bg-purple-50/50 p-2 rounded border border-purple-100 font-mono">
                            Cita del trabajo: "{item.aiQuote}"
                          </p>
                        )}
                        <p className="text-neutral-700 text-[11px]">
                          {item.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECCIÓN 3: FORMULARIO OFICIAL DE CALIFICACIÓN DOCENTE */}
            {currentSubmission && (
              <section className="bg-white rounded-3xl border border-neutral-200 p-6 lg:p-8 space-y-6 shadow-2xs">
                <div className="border-b border-neutral-100 pb-4">
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Calificación Manual y Justificación Oficial</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Asigna una nota libre de 0.0 a 5.0, redacta la justificación y ajusta los puntajes de rúbrica si lo deseas.
                  </p>
                </div>

                <form onSubmit={handleSaveGrading} className="space-y-6">
                  {/* Selector de Nota Libre (Input + Slider) */}
                  <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-900">
                        1. Nota libre asignada (0.0 a 5.0)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.0"
                          max="5.0"
                          value={freeGrade}
                          onChange={(e) => setFreeGrade(Math.min(5.0, Math.max(0.0, parseFloat(e.target.value) || 0)))}
                          className="w-20 px-3 py-1.5 rounded-xl border border-neutral-300 text-center font-extrabold text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <span className="text-xs font-bold text-neutral-400">/ 5.0</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={freeGrade}
                      onChange={(e) => setFreeGrade(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Campo de Justificación Libre */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-neutral-900">
                      2. Justificación docente de la nota
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Explica detalladamente al estudiante los aciertos, fundamentación y áreas de mejora..."
                      value={teacherJustification}
                      onChange={(e) => setTeacherJustification(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>

                  {/* Criterios de Rúbrica Ponderados */}
                  {activeAssignment?.rubric && activeAssignment.rubric.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-neutral-900">
                        3. Desglose opcional por criterio de rúbrica
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeAssignment.rubric.map((crit: any) => {
                          const currentScore = rubricEvals[crit.id] ?? freeGrade;
                          return (
                            <div key={crit.id} className="p-3.5 rounded-xl bg-white border border-neutral-200 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-neutral-800 truncate">{crit.title}</span>
                                <span className="text-[11px] font-mono font-bold text-blue-600">
                                  {currentScore.toFixed(1)} / 5.0
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.0"
                                max="5.0"
                                step="0.1"
                                value={currentScore}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setRubricEvals((prev) => ({ ...prev, [crit.id]: val }));
                                }}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingGrade}
                    className="w-full py-3.5 px-6 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSavingGrade
                        ? 'Guardando calificación...'
                        : 'Guardar y Publicar Calificación Oficial'}
                    </span>
                  </button>
                </form>
              </section>
            )}
              </>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
          Cargando Panel de Calificaciones...
        </div>
      }
    >
      <AdminAssignmentsWorkspace />
    </Suspense>
  );
}
