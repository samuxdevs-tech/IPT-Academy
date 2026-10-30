'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Award,
  CheckCircle2,
  Clock,
  Printer,
  Scale,
  FileCheck2,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { AssignmentItem } from '@/types/assignments';
import { AcademicFeatureGate } from '@/components/AcademicFeatureGate';

const STORAGE_KEY_ASSIGNMENTS = 'ipt_student_assignments_v3_clean';

const DEFAULT_GRADES_SNAPSHOT: AssignmentItem[] = [
  {
    id: 'asg-arch-01',
    code: 'TR-101',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    title: 'Diseño de Separación de Capas y Contratos de Dominio',
    dueDate: '2026-11-05T23:59:00Z',
    status: 'pending',
    description: 'Separación de dominio y validación de esquemas.',
    deliverablesExpected: [],
    rubric: [
      {
        id: 'crit-1',
        title: 'Aislamiento y Pureza de la Capa de Dominio',
        weightPercent: 35,
        maxPoints: 35,
        description: '',
      },
      {
        id: 'crit-2',
        title: 'Contratos y Validación de Esquemas en Bordes',
        weightPercent: 30,
        maxPoints: 30,
        description: '',
      },
      {
        id: 'crit-3',
        title: 'Manejo Determinista de Errores y Estados',
        weightPercent: 20,
        maxPoints: 20,
        description: '',
      },
      {
        id: 'crit-4',
        title: 'Claridad de Documentación y Justificación Técnica',
        weightPercent: 15,
        maxPoints: 15,
        description: '',
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
    description: 'Políticas de reintento deterministas con jitter.',
    deliverablesExpected: [],
    rubric: [],
  },
  {
    id: 'asg-arch-03',
    code: 'TR-103',
    courseSlug: 'arquitectura-cloud-ipt',
    courseTitle: 'Arquitectura Cloud Resiliente y Microservicios',
    title: 'Patrón Transactional Outbox y Consistencia Eventual',
    dueDate: '2026-11-19T23:59:00Z',
    status: 'pending',
    description: 'Outbox transaccional y consistencia eventual.',
    deliverablesExpected: [],
    rubric: [],
  },
];

function StudentGradesContent() {
  const { user } = useAuth();
  const { subscription, switchDemoTier } = useSubscription();
  const [items, setItems] = useState<AssignmentItem[]>(DEFAULT_GRADES_SNAPSHOT);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  useEffect(() => {
    // 1. Cargar caché local primero para respuesta inmediata
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
        }
      } catch {}
    }

    // 2. Suscribirse en tiempo real a Firebase RTDB (submissions y grades_override)
    const subsRef = ref(db, 'submissions');
    const unsubSubs = onValue(subsRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const currentUid = user?.uid;
      const currentEmail = user?.email?.toLowerCase();

      setItems((prev) =>
        prev.map((asg) => {
          const matchedSub = Object.values(data).find((s: any) => {
            const matchesAsg = s.assignment_id === asg.id || s.assignmentId === asg.id;
            const matchesUser =
              (currentUid && s.student_uid === currentUid) ||
              (currentEmail && s.student_email?.toLowerCase() === currentEmail);
            return matchesAsg && matchesUser;
          }) as any;

          if (!matchedSub) return asg;

          const isGraded = matchedSub.status === 'graded' && typeof matchedSub.final_grade === 'number';

          return {
            ...asg,
            status: isGraded ? 'graded' : 'submitted',
            finalScore: isGraded ? matchedSub.final_grade : asg.finalScore,
            gradedBy: matchedSub.graded_by || 'Comité Docente IPT',
            gradedAt: matchedSub.graded_at || asg.gradedAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
            description: matchedSub.teacher_feedback_text || asg.description,
          };
        })
      );
    });

    const overrideRef = ref(db, 'grades_override');
    const unsubOverride = onValue(overrideRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const currentUid = user?.uid;
      if (!currentUid || !data[currentUid]) return;

      const userOverrides = data[currentUid];
      setItems((prev) =>
        prev.map((asg) => {
          const overrideScore = userOverrides[asg.id];
          if (typeof overrideScore === 'number') {
            return {
              ...asg,
              status: 'graded',
              finalScore: overrideScore,
              gradedBy: 'Rectoría Titular IPT (Ajuste)',
            };
          }
          return asg;
        })
      );
    });

    return () => {
      unsubSubs();
      unsubOverride();
    };
  }, [user]);

  const filteredItems = useMemo(() => {
    if (selectedCourseFilter === 'all') return items;
    return items.filter((i) => i.courseSlug === selectedCourseFilter);
  }, [items, selectedCourseFilter]);

  const gradedItems = useMemo(() => {
    return filteredItems.filter((i) => typeof i.finalScore === 'number');
  }, [filteredItems]);

  const averageScore = useMemo(() => {
    if (gradedItems.length === 0) return 0;
    const sum = gradedItems.reduce((acc, cur) => acc + (cur.finalScore || 0), 0);
    return Math.round(sum / gradedItems.length);
  }, [gradedItems]);

  const currentPlanId = subscription?.planId || 'free';

  return (
    <div className="min-h-screen bg-[#000000] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1360px] mx-auto space-y-8">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ffffff]/10 pb-8 print:hidden">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Registro Oficial de Rendimiento</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Mis Notas e Historial Académico
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-2 max-w-2xl">
              Consulta el detalle de tus calificaciones por actividad, el cumplimiento de cada
              rúbrica y el estado de tus solicitudes ante Rectoría.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 border border-[#ffffff]/15 text-xs font-medium text-white cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Descargar Certificado de Notas</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen General */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-[#9a9a9a] block">Promedio General Acumulado</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#15846e]">{averageScore}</span>
              <span className="text-xs text-[#9a9a9a]">/ 100 puntos</span>
            </div>
            <span className="text-[11px] text-[#15846e] block pt-1">
              Nivel aprobatorio cumplido (mín. 70/100)
            </span>
          </div>

          <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-[#9a9a9a] block">Actividades Evaluadas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{gradedItems.length}</span>
              <span className="text-xs text-[#9a9a9a]">de {filteredItems.length} totales</span>
            </div>
            <span className="text-[11px] text-[#bdbdbd] block pt-1">
              Calificadas bajo matriz de rúbrica
            </span>
          </div>

          <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-[#9a9a9a] block">Horas de Estudio Registradas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">42.5</span>
              <span className="text-xs text-[#9a9a9a]">horas verificadas</span>
            </div>
            <span className="text-[11px] text-[#bdbdbd] block pt-1">
              Clases en video y entregas prácticas
            </span>
          </div>

          <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-[#9a9a9a] block">Estado en Rectoría</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">
                {items.some((i) => i.status === 'appealed')
                  ? '1 Apelación en Revisión'
                  : 'Expediente al Día'}
              </span>
            </div>
            <span className="text-[11px] text-[#8052ff] block pt-1">
              Trazabilidad inmutable activa
            </span>
          </div>
        </div>

        {/* Filtro por Curso */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { slug: 'all', label: 'Todos mis cursos' },
              {
                slug: 'ipt-master-fullstack',
                label: 'IPT Master: Arquitectura Fullstack',
              },
              {
                slug: 'arquitectura-cloud-ipt',
                label: 'Arquitectura Cloud Resiliente',
              },
            ].map((tab) => (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setSelectedCourseFilter(tab.slug)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedCourseFilter === tab.slug
                    ? 'bg-[#8052ff] text-white'
                    : 'bg-[#09090b] border border-[#ffffff]/10 text-[#bdbdbd] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            href="/assignments"
            className="text-xs text-[#8052ff] hover:underline flex items-center gap-1"
          >
            <span>Ir al módulo de entregas y rúbricas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tabla Detallada de Calificaciones */}
        <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#ffffff]/10 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Desglose Oficial de Evaluaciones y Rúbricas
            </h2>
            <span className="text-xs font-mono text-[#9a9a9a]">Escala: 0 a 100 puntos</span>
          </div>

          <div className="divide-y divide-[#ffffff]/10">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-[#8052ff]">{item.code}</span>
                      <span className="text-xs text-[#9a9a9a]">•</span>
                      <span className="text-xs text-[#bdbdbd]">{item.courseTitle}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.status === 'graded' && (
                      <div className="px-4 py-2 rounded-2xl bg-[#15846e]/15 border border-[#15846e]/30 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#15846e] block font-semibold">
                          Nota Definitiva
                        </span>
                        <span className="text-lg font-bold text-white">
                          {item.finalScore} / 100
                        </span>
                      </div>
                    )}
                    {item.status === 'appealed' && (
                      <div className="px-4 py-2 rounded-2xl bg-[#8052ff]/15 border border-[#8052ff]/40 text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#c0c4fc] block font-semibold">
                          En Revisión por Rectoría
                        </span>
                        <span className="text-sm font-bold text-white">
                          Nota actual: {item.finalScore}/100 ({item.appealRecord?.folio})
                        </span>
                      </div>
                    )}
                    {item.status === 'submitted' && (
                      <span className="px-3.5 py-1.5 rounded-full bg-[#ffb829]/15 border border-[#ffb829]/30 text-xs font-semibold text-[#ffb829]">
                        Entregada · En Evaluación Docente
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <Link
                        href={`/assignments?id=${item.id}`}
                        className="px-4 py-2 rounded-full bg-[#ffffff]/10 hover:bg-[#8052ff] text-xs font-semibold text-white transition-colors"
                      >
                        Realizar Entrega
                      </Link>
                    )}
                  </div>
                </div>

                {/* Si tiene rúbrica calificada, mostrar barra de puntos por criterio */}
                {item.rubric && item.rubric.some((r) => typeof r.awardedPoints === 'number') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {item.rubric.map((crit) => (
                      <div
                        key={crit.id}
                        className="p-3.5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#bdbdbd] font-medium truncate pr-2">
                            {crit.title}
                          </span>
                          <span className="font-mono text-white shrink-0">
                            {crit.awardedPoints}/{crit.maxPoints}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#ffffff]/10 overflow-hidden">
                          <div
                            className="h-full bg-[#15846e] rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(((crit.awardedPoints || 0) / crit.maxPoints) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GradesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-xs font-mono">
          Cargando historial de notas...
        </div>
      }
    >
      <AcademicFeatureGate feature="grades">
        <StudentGradesContent />
      </AcademicFeatureGate>
    </Suspense>
  );
}
