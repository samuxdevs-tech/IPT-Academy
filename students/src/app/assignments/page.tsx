'use client';

import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
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
  FileCheck2,
  Paperclip,
  Trash2,
  Mic,
  Square,
  Scale,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Check,
  Send,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { AcademicFeatureGate } from '@/components/AcademicFeatureGate';

export interface RubricCriterion {
  id: string;
  title: string;
  weightPercent: number;
  description: string;
  maxPoints: number;
  awardedPoints?: number;
  teacherComment?: string;
}

export interface AssignmentItem {
  id: string;
  code: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'appealed';
  description: string;
  deliverablesExpected: string[];
  rubric: RubricCriterion[];
  finalScore?: number;
  teacherGeneralFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  submittedAssets?: {
    textNotes: string;
    repoUrl?: string;
    files: { name: string; sizeMb: number; type: string }[];
    voiceNoteDurationSec?: number;
    submittedAt: string;
  };
  appealRecord?: {
    folio: string;
    criterionId: string;
    criterionTitle: string;
    reason: string;
    status: 'pending_rectoria' | 'resolved';
    createdAt: string;
  };
}

const INITIAL_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'asg-arch-01',
    code: 'TR-101',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    title: 'Diseño de Separación de Capas y Contratos de Dominio',
    dueDate: '2026-11-05T23:59:00Z',
    status: 'graded',
    description:
      'Diseñar e implementar la capa de dominio y casos de uso desacoplados de la base de datos para un sistema transaccional de reservas, garantizando inmutabilidad y validación estricta en los bordes.',
    deliverablesExpected: [
      'Enlace a repositorio o documento PDF con el diagrama de componentes.',
      'Implementación de contratos de entrada y entidades de dominio.',
      'Explicación breve (escrita o en nota de voz) sobre las decisiones de desacoplamiento.',
    ],
    finalScore: 86,
    gradedBy: 'Comité Docente IPT',
    gradedAt: '2026-10-27 18:40',
    teacherGeneralFeedback:
      'Excelente aislamiento de las reglas de negocio respecto al motor de persistencia.En el criterio de manejo de errores faltó tipar explícitamente las excepciones de concurrencia.',
    submittedAssets: {
      textNotes:
        'Se separó el dominio en tres módulos independientes sin dependencias hacia el ORM. Se adjunta el diagrama arquitectónico y las pruebas de contrato.',
      repoUrl: 'https://github.com/estudiante-ipt/clean-domain-contracts',
      files: [
        { name: 'arquitectura-capas-v1.pdf', sizeMb: 1.4, type: 'application/pdf' },
        { name: 'contratos-dominio.ts', sizeMb: 0.12, type: 'text/typescript' },
      ],
      voiceNoteDurationSec: 42,
      submittedAt: '2026-10-26 21:15',
    },
    rubric: [
      {
        id: 'crit-1',
        title: 'Aislamiento y Pureza de la Capa de Dominio',
        weightPercent: 35,
        maxPoints: 35,
        awardedPoints: 34,
        description:
          'Las entidades y reglas de negocio no importan librerías de infraestructura, frameworks web ni clientes HTTP.',
        teacherComment: 'Cumplimiento impecable de la regla de dependencia.',
      },
      {
        id: 'crit-2',
        title: 'Contratos y Validación de Esquemas en Bordes',
        weightPercent: 30,
        maxPoints: 30,
        awardedPoints: 28,
        description:
          'Todo dato externo es validado con esquemas deterministas antes de instanciar objetos de valor.',
        teacherComment: 'Muy bien estructurado con tipos estrictos.',
      },
      {
        id: 'crit-3',
        title: 'Manejo Determinista de Errores y Estados',
        weightPercent: 20,
        maxPoints: 20,
        awardedPoints: 11,
        description:
          'Uso de resultados tipados (Result Pattern) en lugar de excepciones genéricas no controladas.',
        teacherComment:
          'En el servicio de reserva se lanzó un Error genérico en la línea 84 en lugar de un error de dominio tipado.',
      },
      {
        id: 'crit-4',
        title: 'Claridad de Documentación y Justificación Técnica',
        weightPercent: 15,
        maxPoints: 15,
        awardedPoints: 13,
        description:
          'El diagrama y la explicación justifican con precisión el porqué de cada frontera modular.',
        teacherComment: 'Diagrama claro y nota de voz directa al grano.',
      },
    ],
  },
  {
    id: 'asg-arch-02',
    code: 'TR-102',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    title: 'Políticas de Reintento (Backoff) e Idempotencia en Pagos',
    dueDate: '2026-11-12T23:59:00Z',
    status: 'pending',
    description:
      'Construir un procesador de órdenes que soporte caídas intermitentes de red sin duplicar cobros ni reservas, utilizando llaves de idempotencia y retroceso exponencial con jitter.',
    deliverablesExpected: [
      'Archivo PDF, código fuente o enlace al repositorio con la lógica de idempotencia.',
      'Documento o nota de voz explicando cómo se evita la condición de carrera ante doble clic.',
    ],
    rubric: [
      {
        id: 'crit-201',
        title: 'Garantía de Idempotencia Estricta',
        weightPercent: 40,
        maxPoints: 40,
        description:
          'Múltiples peticiones idénticas con la misma clave producen exactamente un único efecto lateral en el estado.',
      },
      {
        id: 'crit-202',
        title: 'Algoritmo de Exponential Backoff con Jitter',
        weightPercent: 30,
        maxPoints: 30,
        description:
          'Los reintentos espacian la carga progresivamente evitando tormentas de peticiones al servidor.',
      },
      {
        id: 'crit-203',
        title: 'Pruebas de Concurrencia y Casos Borde',
        weightPercent: 30,
        maxPoints: 30,
        description:
          'Demostración de que dos solicitudes simultáneas no corrompen el saldo del usuario.',
      },
    ],
  },
  {
    id: 'asg-arch-03',
    code: 'TR-103',
    courseSlug: 'arquitectura-cloud-ipt',
    courseTitle: 'Arquitectura Cloud Resiliente y Microservicios',
    title: 'Patrón Transactional Outbox y Consistencia Eventual',
    dueDate: '2026-11-19T23:59:00Z',
    status: 'submitted',
    description:
      'Implementar una tabla de salida transaccional (Outbox) que garantice que cada actualización en base de datos emita su evento correspondiente sin pérdida de mensajes.',
    deliverablesExpected: [
      'Esquema de tabla Outbox y worker de despacho.',
      'Evidencia de recuperación ante caída del bus de eventos.',
    ],
    submittedAssets: {
      textNotes:
        'Se implementó el almacenamiento atómico en la misma transacción local y un despachador con bloqueo optimista.',
      repoUrl: 'https://github.com/estudiante-ipt/outbox-pattern-demo',
      files: [{ name: 'outbox-worker-diagram.pdf', sizeMb: 2.1, type: 'application/pdf' }],
      submittedAt: '2026-10-28 08:10',
    },
    rubric: [
      {
        id: 'crit-301',
        title: 'Atomicidad entre Estado y Registro Outbox',
        weightPercent: 45,
        maxPoints: 45,
        description:
          'El cambio de negocio y el evento se guardan en la misma transacción ACID.',
      },
      {
        id: 'crit-302',
        title: 'Tolerancia a Fallos y Reintento de Despacho',
        weightPercent: 35,
        maxPoints: 35,
        description:
          'Los mensajes pendientes se reenvían de forma segura hasta recibir confirmación (ACK).',
      },
      {
        id: 'crit-303',
        title: 'Limpieza y Particionado de Eventos Procesados',
        weightPercent: 20,
        maxPoints: 20,
        description: 'Estrategia clara para evitar el crecimiento infinito de la tabla Outbox.',
      },
    ],
  },
];

const STORAGE_KEY_ASSIGNMENTS = 'ipt_student_assignments_v2';

function StudentAssignmentsContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams?.get('id');

  const { user } = useAuth();
  const { entitlements, subscription, openPricingModal, switchDemoTier } = useSubscription();

  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
        if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return parsed; }
      } catch {}
    }
    return INITIAL_ASSIGNMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    } catch {}
  }, [assignments]);

  const [selectedId, setSelectedId] = useState<string>(
    requestedId || INITIAL_ASSIGNMENTS[0].id
  );

  const activeAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedId) || assignments[0];
  }, [assignments, selectedId]);

  // Estado para formulario de entrega Multi-Asset
  const [notesInput, setNotesInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [stagedFiles, setStagedFiles] = useState<
    { name: string; sizeMb: number; type: string }[]
  >([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDurationSec, setVoiceDurationSec] = useState(0);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

  // Estado para Modal de Apelación Formal ante Rectoría
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealCriterionId, setAppealCriterionId] = useState<string>('');
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealBanner, setAppealBanner] = useState<string | null>(null);

  useEffect(() => {
    if (activeAssignment?.rubric?.length) {
      setAppealCriterionId(activeAssignment.rubric[0].id);
    }
    setSubmitBanner(null);
    setAppealBanner(null);
  }, [activeAssignment]);

  // Grabadora de nota de voz simulada/interactiva
  const toggleVoiceRecording = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    } else {
      setVoiceDurationSec(0);
      setIsRecordingVoice(true);
      voiceTimerRef.current = setInterval(() => {
        setVoiceDurationSec((prev) => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const added = files.map((f) => ({
      name: f.name,
      sizeMb: Number((f.size / (1024 * 1024)).toFixed(2)) || 0.25,
      type: f.type || 'application/octet-stream',
    }));
    setStagedFiles((prev) => [...prev, ...added]);
  };

  const handleDeliverAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim() && stagedFiles.length === 0 && !repoUrlInput.trim()) {
      return;
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === activeAssignment.id
          ? {
              ...item,
              status: 'submitted',
              submittedAssets: {
                textNotes: notesInput.trim() || 'Entrega técnica adjunta.',
                repoUrl: repoUrlInput.trim() || undefined,
                files:
                  stagedFiles.length > 0
                    ? stagedFiles
                    : [{ name: 'entrega-arquitectura.pdf', sizeMb: 1.1, type: 'application/pdf' }],
                voiceNoteDurationSec: voiceDurationSec > 0 ? voiceDurationSec : undefined,
                submittedAt: nowStr,
              },
            }
          : item
      )
    );
    setNotesInput('');
    setRepoUrlInput('');
    setStagedFiles([]);
    setVoiceDurationSec(0);
    setSubmitBanner(
      'Tu entrega ha sido registrada y enviada al flujo de evaluación con rúbrica.'
    );
  };

  const handleFormalAppealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;

    const crit =
      activeAssignment.rubric.find((c) => c.id === appealCriterionId) ||
      activeAssignment.rubric[0];
    const folio = `APL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === activeAssignment.id
          ? {
              ...item,
              status: 'appealed',
              appealRecord: {
                folio,
                criterionId: crit.id,
                criterionTitle: crit.title,
                reason: appealReason.trim(),
                status: 'pending_rectoria',
                createdAt: nowStr,
              },
            }
          : item
      )
    );

    setAppealModalOpen(false);
    setAppealReason('');
    setAppealBanner(
      `Apelación formal radicada ante Rectoría con folio ${folio}. Tu solicitud será auditada frente a la evidencia entregada.`
    );
  };

  const currentPlanId = subscription?.planId || 'free';

  return (
    <div className="min-h-screen bg-[#000000] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1360px] mx-auto space-y-8">
        {/* Cabecera de Sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ffffff]/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium mb-3">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Evaluación Basada en Rúbricas Multicriterio</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Tareas, Entregas y Rúbricas Oficiales
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-2 max-w-2xl">
              Revisa los criterios exactos con los que se evalúa cada proyecto, adjunta tus
              entregables en múltiples formatos y consulta el desglose de tu calificación.
            </p>
          </div>

          {/* Indicador de Política Académica */}
          <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-4 flex items-center gap-3.5 max-w-md">
            <div className="w-10 h-10 rounded-xl bg-[#15846e]/15 border border-[#15846e]/30 flex items-center justify-center shrink-0 text-[#15846e]">
              <Scale className="w-5 h-5" />
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-white block">
                Calificación Definitiva con Garantía de Rectoría
              </span>
              <span className="text-[#9a9a9a]">
                Toda nota emitida bajo rúbrica es definitiva; si detectas un error objetivo de
                evaluación, puedes elevar apelación formal a Rectoría.
              </span>
            </div>
          </div>
        </div>

        {/* Aviso si está en modo Free */}
        {currentPlanId === 'free' && (
          <div className="rounded-2xl border border-[#8052ff]/40 bg-gradient-to-r from-[#8052ff]/15 via-[#09090b] to-[#09090b] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8052ff]">
                Información de Membresía
              </span>
              <h3 className="text-lg font-medium text-white">
                La entrega y calificación docente con rúbricas está activa a partir del Plan Pro
              </h3>
              <p className="text-xs text-[#bdbdbd]">
                Puedes explorar los criterios de evaluación y ejemplos de rúbricas aquí. Para entregar proyectos y recibir retroalimentación docente, activa tu suscripción Pro.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => openPricingModal('pro')}
                className="px-5 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Activar Plan Pro
              </button>
            </div>
          </div>
        )}

        {/* Layout Principal: Lista Izquierda (4 cols) + Detalle y Línea de Vida Derecha (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Listado de Tareas */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9a]">
                Actividades del Curso ({(assignments || []).length})
              </span>
              <span className="text-[11px] font-mono text-[#8052ff]">100 pts máx.</span>
            </div>

            {assignments.map((item) => {
              const isSelected = item.id === activeAssignment.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#09090b] border-[#8052ff] shadow-[0_0_25px_rgba(128,82,255,0.18)]'
                      : 'bg-[#09090b]/60 border-[#ffffff]/10 hover:border-[#ffffff]/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-[#9a9a9a]">{item.code}</span>
                    {item.status === 'graded' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#15846e]/15 text-[#15846e] border border-[#15846e]/30">
                        Calificada · {item.finalScore}/100
                      </span>
                    )}
                    {item.status === 'submitted' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30">
                        En Evaluación
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffffff]/10 text-[#bdbdbd]">
                        Pendiente de Entrega
                      </span>
                    )}
                    {item.status === 'appealed' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#8052ff]/20 text-[#c0c4fc] border border-[#8052ff]/40">
                        En Apelación · Rectoría
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#9a9a9a] line-clamp-1 mb-3">{item.courseTitle}</p>

                  <div className="flex items-center justify-between text-[11px] text-[#9a9a9a] pt-2.5 border-t border-[#ffffff]/10">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Vence: {item.dueDate.slice(0, 10)}
                    </span>
                    <span className="text-white font-medium flex items-center gap-1">
                      Ver rúbrica <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Columna Derecha: Línea de Vida, Rúbrica, Entrega y Apelación */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tarjeta Principal de la Tarea */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 sm:p-8 space-y-8">
              {/* 1. Línea de Vida de la Tarea (Stepper Visual) */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#9a9a9a] block mb-4">
                  Línea de Vida de la Tarea
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      step: '1',
                      label: 'Publicada con Rúbrica',
                      done: true,
                    },
                    {
                      step: '2',
                      label: 'Entrega Recibida',
                      done: activeAssignment.status !== 'pending',
                    },
                    {
                      step: '3',
                      label: 'Evaluación Docente',
                      done:
                        activeAssignment.status === 'graded' ||
                        activeAssignment.status === 'appealed',
                    },
                    {
                      step: '4',
                      label:
                        activeAssignment.status === 'appealed'
                          ? 'Auditoría en Rectoría'
                          : 'Nota Definitiva',
                      done:
                        activeAssignment.status === 'graded' ||
                        activeAssignment.status === 'appealed',
                    },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                        s.done
                          ? 'bg-[#15846e]/10 border-[#15846e]/40 text-white'
                          : 'bg-[#000000]/60 border-[#ffffff]/10 text-[#9a9a9a]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          s.done ? 'bg-[#15846e] text-white' : 'bg-[#ffffff]/10 text-[#9a9a9a]'
                        }`}
                      >
                        {s.done ? <Check className="w-3 h-3" /> : s.step}
                      </span>
                      <span className="font-medium truncate">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Encabezado y Enunciado */}
              <div className="space-y-3 border-t border-[#ffffff]/10 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#8052ff]">
                    {activeAssignment.code} · {activeAssignment.courseTitle}
                  </span>
                  <span className="text-xs text-[#9a9a9a]">
                    Fecha límite: {activeAssignment.dueDate.slice(0, 10)}
                  </span>
                </div>
                <h2 className="text-2xl font-normal text-white tracking-[-0.02em]">
                  {activeAssignment.title}
                </h2>
                <p className="text-sm text-[#bdbdbd] leading-relaxed">
                  {activeAssignment.description}
                </p>

                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-2">
                    Entregables requeridos:
                  </h4>
                  <ul className="space-y-1.5">
                    {activeAssignment.deliverablesExpected.map((deliv, i) => (
                      <li key={i} className="text-xs text-[#bdbdbd] flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8052ff] shrink-0 mt-0.5" />
                        <span>{deliv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Banners de confirmación */}
              {submitBanner && (
                <div className="p-4 rounded-2xl bg-[#15846e]/15 border border-[#15846e]/40 text-xs text-white flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#15846e] shrink-0" />
                  <span>{submitBanner}</span>
                </div>
              )}

              {appealBanner && (
                <div className="p-4 rounded-2xl bg-[#8052ff]/15 border border-[#8052ff]/40 text-xs text-white flex items-center gap-3">
                  <Scale className="w-5 h-5 text-[#8052ff] shrink-0" />
                  <span>{appealBanner}</span>
                </div>
              )}

              {/* 2. Matriz de Rúbrica Oficial Multicriterio */}
              <div className="space-y-4 border-t border-[#ffffff]/10 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Matriz de Rúbrica Oficial
                    </h3>
                    <p className="text-xs text-[#9a9a9a]">
                      Criterios objetivos de calificación ponderada sobre 100 puntos.
                    </p>
                  </div>
                  {(activeAssignment.status === 'graded' ||
                    activeAssignment.status === 'appealed') && (
                    <div className="text-right">
                      <span className="text-xs text-[#9a9a9a] block">Nota Definitiva</span>
                      <span className="text-2xl font-bold text-[#15846e]">
                        {activeAssignment.finalScore} / 100
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {activeAssignment.rubric.map((crit) => {
                    const hasScore = typeof crit.awardedPoints === 'number';
                    return (
                      <div
                        key={crit.id}
                        className="p-4 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{crit.title}</span>
                          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10 text-white">
                            {hasScore
                              ? `${crit.awardedPoints} / ${crit.maxPoints} pts`
                              : `Peso: ${crit.weightPercent}% (${crit.maxPoints} pts)`}
                          </span>
                        </div>
                        <p className="text-xs text-[#9a9a9a] leading-relaxed">
                          {crit.description}
                        </p>
                        {crit.teacherComment && (
                          <div className="mt-2 pt-2 border-t border-[#ffffff]/10 text-xs text-[#bdbdbd] flex items-start gap-2">
                            <span className="font-semibold text-[#8052ff] shrink-0">
                              Observación docente:
                            </span>
                            <span>{crit.teacherComment}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Resultado de Calificación y Botón de Apelación ante Rectoría */}
              {(activeAssignment.status === 'graded' ||
                activeAssignment.status === 'appealed') && (
                <div className="p-5 rounded-2xl bg-[#000000] border border-[#ffffff]/15 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-[#15846e] uppercase">
                        Dictamen Oficial · {activeAssignment.gradedBy} ({activeAssignment.gradedAt})
                      </span>
                      <p className="text-xs text-[#bdbdbd] leading-relaxed">
                        {activeAssignment.teacherGeneralFeedback}
                      </p>
                    </div>

                    {activeAssignment.status === 'graded' ? (
                      <button
                        type="button"
                        onClick={() => setAppealModalOpen(true)}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/5 hover:bg-[#8052ff]/20 border border-[#ffffff]/15 hover:border-[#8052ff] text-xs font-semibold text-white transition-all cursor-pointer"
                      >
                        <Scale className="w-4 h-4 text-[#8052ff]" />
                        <span>Apelar ante Rectoría</span>
                      </button>
                    ) : (
                      <div className="shrink-0 px-3.5 py-2 rounded-xl bg-[#8052ff]/15 border border-[#8052ff]/40 text-xs text-[#c0c4fc] font-mono">
                        Folio Rectoría: {activeAssignment.appealRecord?.folio}
                      </div>
                    )}
                  </div>

                  {activeAssignment.appealRecord && (
                    <div className="p-4 rounded-xl bg-[#8052ff]/10 border border-[#8052ff]/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          Solicitud de Revisión en Rectoría · Criterio:{' '}
                          {activeAssignment.appealRecord.criterionTitle}
                        </span>
                        <span className="text-[11px] font-mono text-[#c0c4fc]">
                          Estado: En auditoría por Rectoría
                        </span>
                      </div>
                      <p className="text-[#bdbdbd]">
                        Justificación presentada: «{activeAssignment.appealRecord.reason}»
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Activos Entregados por el Estudiante */}
              {activeAssignment.submittedAssets && (
                <div className="space-y-3 border-t border-[#ffffff]/10 pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Evidencia Entregada por el Estudiante
                    </h4>
                    <span className="text-[11px] font-mono text-[#9a9a9a]">
                      Enviado: {activeAssignment.submittedAssets.submittedAt}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-3 text-xs">
                    <p className="text-[#bdbdbd]">{activeAssignment.submittedAssets.textNotes}</p>
                    {activeAssignment.submittedAssets.repoUrl && (
                      <div className="flex items-center gap-2 text-[#8052ff]">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <a
                          href={activeAssignment.submittedAssets.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline break-all"
                        >
                          {activeAssignment.submittedAssets.repoUrl}
                        </a>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeAssignment.submittedAssets.files.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10 text-[11px] text-white"
                        >
                          <Paperclip className="w-3 h-3 text-[#8052ff]" />
                          {f.name} ({f.sizeMb} MB)
                        </span>
                      ))}
                      {activeAssignment.submittedAssets.voiceNoteDurationSec && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15846e]/15 border border-[#15846e]/30 text-[11px] text-[#15846e]">
                          <Mic className="w-3 h-3" />
                          Nota de voz explicativa ({activeAssignment.submittedAssets.voiceNoteDurationSec}s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Formulario de Entrega Multi-Asset (Para tareas pendientes) */}
              {activeAssignment.status === 'pending' && (
                <form
                  onSubmit={handleDeliverAssignment}
                  className="space-y-5 border-t border-[#ffffff]/10 pt-6"
                >
                  <h3 className="text-base font-semibold text-white">
                    Enviar Entrega Multi-Formato
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#bdbdbd] block">
                      Enlace a Repositorio, Documento o Proyecto Desplegado (Opcional)
                    </label>
                    <input
                      type="url"
                      value={repoUrlInput}
                      onChange={(e) => setRepoUrlInput(e.target.value)}
                      placeholder="https://github.com/tu-usuario/proyecto-arquitectura"
                      className="w-full px-4 py-3 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/50 focus:outline-none focus:border-[#8052ff]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#bdbdbd] block">
                      Notas Técnicas y Justificación de Diseño
                    </label>
                    <textarea
                      rows={4}
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Explica cómo cumpliste los criterios de la rúbrica oficial..."
                      className="w-full px-4 py-3 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/50 focus:outline-none focus:border-[#8052ff]"
                    />
                  </div>

                  {/* Archivos + Grabadora de Voz */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-[#ffffff]/20 hover:border-[#8052ff] bg-[#000000] cursor-pointer transition-colors text-center">
                      <Upload className="w-5 h-5 text-[#8052ff] mb-1.5" />
                      <span className="text-xs font-medium text-white">
                        Adjuntar PDF, Diagramas o Código
                      </span>
                      <span className="text-[11px] text-[#9a9a9a] mt-0.5">
                        Hasta 25 MB por archivo
                      </span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[#ffffff]/15 bg-[#000000] text-center">
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isRecordingVoice
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        {isRecordingVoice ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Detener Grabación ({voiceDurationSec}s)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-[#15846e]" />
                            <span>
                              {voiceDurationSec > 0
                                ? `Audio Grabado (${voiceDurationSec}s) · Regrabar`
                                : 'Grabar Nota de Voz Explicativa'}
                            </span>
                          </>
                        )}
                      </button>
                      <span className="text-[11px] text-[#9a9a9a] mt-1.5">
                        Ideal para sustentar tu entrega verbalmente
                      </span>
                    </div>
                  </div>

                  {stagedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {stagedFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffffff]/10 text-xs text-white"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#8052ff]" />
                          <span>{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-[#9a9a9a] hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-semibold shadow-[0_0_25px_rgba(128,82,255,0.4)] transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Registrar Entrega Oficial</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Apelación Formal ante Rectoría */}
      {appealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#09090b] border border-[#ffffff]/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8052ff]">
                  Instancia Superior de Auditoría Académica
                </span>
                <h3 className="text-xl font-semibold text-white">
                  Elevar Apelación Formal ante Rectoría
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="p-1.5 rounded-full bg-[#ffffff]/5 text-[#9a9a9a] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#bdbdbd] leading-relaxed">
              Las calificaciones de los docentes son definitivas en primera instancia. Rectoría
              únicamente interviene y modifica una nota cuando se demuestra con evidencia que un
              criterio de la rúbrica oficial fue aplicado de manera errónea.
            </p>

            <form onSubmit={handleFormalAppealSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white block">
                  Criterio de la rúbrica que deseas apelar:
                </label>
                <select
                  value={appealCriterionId}
                  onChange={(e) => setAppealCriterionId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white focus:outline-none focus:border-[#8052ff]"
                >
                  {activeAssignment.rubric.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.awardedPoints ?? 0}/{c.maxPoints} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white block">
                  Sustentación objetiva basada en tu entrega:
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Indica en qué página, archivo o línea de tu entrega se cumple el requisito solicitado en la rúbrica..."
                  className="w-full px-4 py-3 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/50 focus:outline-none focus:border-[#8052ff]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealModalOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-[#ffffff]/15 text-xs text-[#bdbdbd] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-semibold cursor-pointer"
                >
                  Radicar Apelación en Rectoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-xs font-mono">
          Cargando módulo de tareas y rúbricas...
        </div>
      }
    >
      <AcademicFeatureGate feature="assignments">
        <StudentAssignmentsContent />
      </AcademicFeatureGate>
    </Suspense>
  );
}
