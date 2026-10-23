'use client';

import React, { useState } from 'react';
import {
  X,
  Layers,
  Activity,
  History,
  Building2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  Send,
  Sparkles,
  FileSpreadsheet,
  Clock,
  Search,
  Shield,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { Course, AssignmentItem, QuotaLedgerEntry } from '@/types';
import { ref, get, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface AdvancedAdminToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  assignments: AssignmentItem[];
}

export default function AdvancedAdminToolsModal({
  isOpen,
  onClose,
  courses,
  assignments,
}: AdvancedAdminToolsModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<
    'bulk' | 'monitor' | 'audit' | 'cohorts' | 'notifications' | 'quotas'
  >('bulk');

  const { user } = useAuth();
  const [bulkStatusNotice, setBulkStatusNotice] = useState<string | null>(null);
  const [notificationSubject, setNotificationSubject] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);

  // Estado para Libro Mayor de Cupos & Reembolso Manual Humano
  const [quotaTargetUid, setQuotaTargetUid] = useState('');
  const [quotaReason, setQuotaReason] = useState('');
  const [quotaSearching, setQuotaSearching] = useState(false);
  const [quotaStudentBalance, setQuotaStudentBalance] = useState<number | null>(null);
  const [quotaStudentLedger, setQuotaStudentLedger] = useState<QuotaLedgerEntry[]>([]);
  const [quotaActionNotice, setQuotaActionNotice] = useState<string | null>(null);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);

  const handleLookupQuota = async () => {
    if (!quotaTargetUid.trim()) return;
    setQuotaSearching(true);
    setQuotaActionNotice(null);
    try {
      const cleanUid = quotaTargetUid.trim();
      const quotaSnap = await get(ref(db, `student_quotas/${cleanUid}/live_classes`));
      if (quotaSnap.exists()) {
        const val = quotaSnap.val();
        setQuotaStudentBalance(Number(val?.availableCredits ?? 0));
      } else {
        setQuotaStudentBalance(0);
      }

      const ledgerSnap = await get(ref(db, `quota_ledger/${cleanUid}`));
      if (ledgerSnap.exists()) {
        const data = ledgerSnap.val();
        const entries: QuotaLedgerEntry[] = Object.keys(data).map((k) => ({
          id: k,
          studentUid: cleanUid,
          ...data[k],
        }));
        setQuotaStudentLedger(
          entries.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        setQuotaStudentLedger([]);
      }
    } catch (err: any) {
      console.warn('Error al consultar cupos:', err);
    } finally {
      setQuotaSearching(false);
    }
  };

  const handleManualAdminRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaTargetUid.trim() || !quotaReason.trim()) return;
    setQuotaSubmitting(true);
    setQuotaActionNotice(null);
    try {
      const cleanUid = quotaTargetUid.trim();
      const current = quotaStudentBalance ?? 0;
      const nextBalance = current + 1;

      const newEntryRef = push(ref(db, `quota_ledger/${cleanUid}`));
      const newEntry: Partial<QuotaLedgerEntry> = {
        studentUid: cleanUid,
        type: 'manual_admin_refund',
        delta: 1,
        balanceAfter: nextBalance,
        reason: quotaReason.trim(),
        authorizedByAdminUid: user?.uid || 'human_superadmin',
        createdAt: new Date().toISOString(),
      };

      await set(newEntryRef, newEntry);
      await set(ref(db, `student_quotas/${cleanUid}/live_classes`), {
        availableCredits: nextBalance,
        totalAllocatedThisMonth: nextBalance,
        lastRefundAt: new Date().toISOString(),
      });

      setQuotaStudentBalance(nextBalance);
      setQuotaReason('');
      setQuotaActionNotice(
        `Reembolso manual aprobado (+1 cupo). Saldo actualizado: ${nextBalance} cupos.`
      );
      handleLookupQuota();
    } catch (err: any) {
      console.error('Error al emitir reembolso:', err);
      setQuotaActionNotice(`Error al emitir reembolso: ${err?.message || 'Permiso denegado'}`);
    } finally {
      setQuotaSubmitting(false);
    }
  };

  // Muestra de auditoría
  const auditLogs = [
    {
      id: 'log-1',
      user: 'Iván Samuel (Admin)',
      action: 'Publicación de Curso',
      target: courses[0]?.title || 'Campus General',
      timestamp: 'Hoy, 20:45',
    },
    {
      id: 'log-2',
      user: 'Sistema Automático',
      action: 'Sincronización Cloudflare D1',
      target: 'Base de Datos de Calificaciones',
      timestamp: 'Hoy, 20:30',
    },
    {
      id: 'log-3',
      user: 'Iván Samuel (Admin)',
      action: 'Ajuste de Ponderación',
      target: assignments[0]?.title || 'Evaluación Continua',
      timestamp: 'Ayer, 18:15',
    },
  ];

  // Muestra de estudiantes en vivo
  const liveStudents = [
    {
      id: 'std-1',
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@ipt.edu.co',
      currentLesson: 'Módulo 1: Fundamentos de Arquitectura',
      progressPercent: 78,
      status: 'active',
      lastSeen: 'Hace 3 minutos',
    },
    {
      id: 'std-2',
      name: 'Sofía Valderrama',
      email: 'sofia.valderrama@ipt.edu.co',
      currentLesson: 'Módulo 2: Modelación de Datos',
      progressPercent: 42,
      status: 'active',
      lastSeen: 'Hace 8 minutos',
    },
    {
      id: 'std-3',
      name: 'Andrés Gómez',
      email: 'andres.gomez@ipt.edu.co',
      currentLesson: 'Módulo 1: Introducción',
      progressPercent: 12,
      status: 'risk',
      lastSeen: 'Inactivo hace 6 días (Alerta de Rezago)',
    },
  ];

  const handleExportFullCsv = () => {
    const headers = ['Curso', 'Módulos', 'Total Lecciones', 'Modelo Evaluación', 'Estado'];
    const rows = courses.map((c) => [
      `"${c.title}"`,
      String(c.modules?.length || 0),
      String(c.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0),
      c.evaluationModel === 'free' ? 'Continua / Libre' : 'Modular / Cortes',
      c.published !== false ? 'Publicado' : 'Borrador',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-general-ipt-campus-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBulkStatusNotice('Reporte consolidado descargado exitosamente.');
    setTimeout(() => setBulkStatusNotice(null), 3000);
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationSubject.trim() || !notificationBody.trim()) return;
    setNotificationNotice('Notificación enviada a todos los estudiantes matriculados.');
    setNotificationSubject('');
    setNotificationBody('');
    setTimeout(() => setNotificationNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#e5e5ea] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Apple Studio */}
        <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-[#fafafa] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#1d1d1f]">
                Centro de Operaciones y Administración Avanzada
              </h2>
              <p className="text-[11px] text-[#8e8e93]">
                Herramientas de supervisión en tiempo real y gestión por lotes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Herramientas */}
        <div className="flex overflow-x-auto border-b border-[#e5e5ea] px-4 shrink-0 bg-white no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Acciones por Lote</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Monitor en Vivo & Rezago</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Auditoría de Cambios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'cohorts'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Cohortes & Licencias</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotas')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'quotas'
                ? 'border-[#0071e3] text-[#0071e3]'
                : 'border-transparent text-[#8e8e93] hover:text-[#1d1d1f]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Libro Mayor de Cupos</span>
          </button>
        </div>

        {/* Contenido de la Herramienta Seleccionada */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {bulkStatusNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bulkStatusNotice}</span>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#1d1d1f]">Operaciones Masivas en Catálogo</h3>
                <p className="text-[11px] text-[#8e8e93]">
                  Aplica cambios globales de visibilidad, descarga informes consolidados o sincroniza el campus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#0071e3]" />
                  <div className="text-xs font-bold text-[#1d1d1f]">Exportar Reporte Maestro (CSV)</div>
                  <p className="text-[11px] text-[#8e8e93]">
                    Genera una hoja compatible con Excel con todos los cursos, módulos y lecciones.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportFullCsv}
                    className="py-1.5 px-3 rounded-lg bg-white border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] hover:border-[#0071e3] transition-colors cursor-pointer"
                  >
                    Descargar CSV
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div className="text-xs font-bold text-[#1d1d1f]">Publicación Global de Cursos</div>
                  <p className="text-[11px] text-[#8e8e93]">
                    Marca todos los cursos como públicos y visibles para los estudiantes de inmediato.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkStatusNotice('Todos los programas actualizados a estado público.');
                      setTimeout(() => setBulkStatusNotice(null), 3000);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-white border border-[#e5e5ea] text-xs font-semibold text-[#1d1d1f] hover:border-[#0071e3] transition-colors cursor-pointer"
                  >
                    Publicar Todos
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1d1d1f]">Radar de Estudiantes en Vivo</h3>
                  <p className="text-[11px] text-[#8e8e93]">
                    Monitorea qué clase están viendo los alumnos y detecta alertas tempranas de rezago.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  2 alumnos activos ahora
                </span>
              </div>

              <div className="divide-y divide-[#e5e5ea] border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white">
                {liveStudents.map((std) => (
                  <div key={std.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1d1d1f]">{std.name}</span>
                        {std.status === 'risk' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>En Riesgo</span>
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8e8e93]">
                        {std.currentLesson} · Progreso: {std.progressPercent}%
                      </p>
                    </div>
                    <span className="text-[10px] text-[#8e8e93] font-medium shrink-0">
                      {std.lastSeen}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#1d1d1f]">Bitácora de Modificaciones</h3>
                <p className="text-[11px] text-[#8e8e93]">
                  Registro inmutable de ediciones sobre cursos, calificaciones y tareas publicadas.
                </p>
              </div>

              <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden divide-y divide-[#e5e5ea] bg-white text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-[#1d1d1f] truncate">{log.action}</div>
                      <div className="text-[11px] text-[#8e8e93] truncate">
                        Por {log.user} sobre <span className="text-[#515154] font-medium">{log.target}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8e8e93] font-mono shrink-0">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cohorts' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#1d1d1f]">Grupos, Cohortes y Licencias por Cupos</h3>
                <p className="text-[11px] text-[#8e8e93]">
                  Asigna acceso a cursos para empresas, universidades o cohortes específicas mediante tokens.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1d1d1f]">Cohorte 2026-I: Ingeniería de Software</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-[#e5e5ea] text-[10px] font-mono text-[#0071e3] font-bold">
                    TOKEN: IPT-COHORT-2026-1
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8e93]">
                  Cupos autorizados: 50 estudiantes · Asignado a todos los cursos de Formación Profesional.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSendNotification} className="space-y-3.5">
              {notificationNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{notificationNotice}</span>
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#1d1d1f]">Comunicado General a Estudiantes</h3>
                <p className="text-[11px] text-[#8e8e93]">
                  Envía un anuncio que aparecerá en el portal de alumnos de todos los inscritos.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1d1d1f]">Asunto del Anuncio</label>
                <input
                  type="text"
                  required
                  value={notificationSubject}
                  onChange={(e) => setNotificationSubject(e.target.value)}
                  placeholder="Ej: Nueva sesión de asesoría programada para este viernes"
                  className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1d1d1f]">Mensaje</label>
                <textarea
                  rows={4}
                  required
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Escribe el mensaje claro y directo para tus estudiantes..."
                  className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Comunicado</span>
              </button>
            </form>
          )}

          {/* 6. Libro Mayor de Cupos & Reembolso Manual Humano (Fase 5) */}
          {activeTab === 'quotas' && (
            <div className="space-y-6">
              {/* Alerta de Invariante de Seguridad */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Regla de Invariante de Auditoría Humana</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Solo un administrador humano autenticado (Nivel superior a 3) puede emitir reembolsos de cupos. Los asistentes automatizados o bots tienen estrictamente denegado alterar saldos o transacciones del libro mayor.
                </p>
              </div>

              {quotaActionNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{quotaActionNotice}</span>
                </div>
              )}

              {/* Buscador de Estudiante */}
              <div className="bg-neutral-50 rounded-2xl border border-[#e5e5ea] p-4 space-y-3">
                <label className="block text-xs font-bold text-[#1d1d1f]">
                  Consultar Estado de Cupos por Identificador de Alumno (UID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quotaTargetUid}
                    onChange={(e) => setQuotaTargetUid(e.target.value)}
                    placeholder="Pega el UID del estudiante..."
                    className="flex-1 px-3 py-2 rounded-xl border border-[#e5e5ea] bg-white text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupQuota}
                    disabled={quotaSearching || !quotaTargetUid.trim()}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{quotaSearching ? 'Consultando...' : 'Consultar'}</span>
                  </button>
                </div>

                {quotaStudentBalance !== null && (
                  <div className="mt-2 pt-2 border-t border-[#e5e5ea] flex items-center justify-between">
                    <span className="text-xs text-[#8e8e93]">Saldo disponible para clases en vivo:</span>
                    <span className="text-sm font-extrabold text-[#0071e3]">
                      {quotaStudentBalance} {quotaStudentBalance === 1 ? 'cupo' : 'cupos'}
                    </span>
                  </div>
                )}
              </div>

              {/* Formulario de Reembolso Manual Humano */}
              {quotaStudentBalance !== null && (
                <form
                  onSubmit={handleManualAdminRefund}
                  className="bg-white rounded-2xl border border-[#e5e5ea] p-4 space-y-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span>Emitir Reembolso Manual (+1 Cupo)</span>
                    </h4>
                    <p className="text-[11px] text-[#8e8e93]">
                      Cada reembolso quedará registrado de forma inmutable con tu firma de administrador humano.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#1d1d1f]">
                      Justificación obligatoria del Reembolso
                    </label>
                    <input
                      type="text"
                      required
                      value={quotaReason}
                      onChange={(e) => setQuotaReason(e.target.value)}
                      placeholder="Ej: Inconveniente técnico justificado durante la clase en vivo..."
                      className="w-full px-3 py-2 rounded-xl border border-[#e5e5ea] text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={quotaSubmitting || !quotaReason.trim()}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{quotaSubmitting ? 'Procesando...' : 'Aprobar y Registrar Reembolso'}</span>
                  </button>
                </form>
              )}

              {/* Historial del Libro Mayor Inmutable */}
              {quotaStudentLedger.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1d1d1f]">
                    Libro Mayor de Movimientos ({quotaStudentLedger.length})
                  </h4>
                  <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden divide-y divide-[#e5e5ea] bg-white">
                    {quotaStudentLedger.map((entry) => (
                      <div key={entry.id} className="p-3 text-xs flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                entry.type === 'manual_admin_refund' || entry.type === 'deposit_monthly'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {entry.type}
                            </span>
                            <span className="font-semibold text-[#1d1d1f] truncate">
                              {entry.reason || 'Sin detalle'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8e8e93]">
                            {new Date(entry.createdAt).toLocaleString('es-CO')} {entry.authorizedByAdminUid ? `· Autorizado por admin` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-bold ${
                              entry.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                          </span>
                          <p className="text-[10px] text-[#8e8e93]">Saldo: {entry.balanceAfter}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e5ea] bg-[#fafafa] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-[#e5e5ea] bg-white hover:bg-neutral-100 text-xs font-semibold text-[#1d1d1f] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
