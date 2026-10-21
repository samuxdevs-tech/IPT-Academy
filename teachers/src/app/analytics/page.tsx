'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Award,
  Eye,
  Download,
  Users,
  CheckCircle2,
  Scale,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Certificate } from '@/types';
import CertificateModal from '@/components/CertificateModal';
import { useAuth } from '@/context/AuthContext';
import { LegalAcceptanceRecord } from '@/lib/legalData';

interface ErrorStat {
  questionId: string;
  lessonId: string;
  type: string;
  totalAttempts: number;
  errorRate: number;
}

interface HeatmapBucket {
  [bucket: string]: number;
}

interface LessonHeatmap {
  dropoffs: HeatmapBucket;
  repeats: HeatmapBucket;
}

interface StudentReportRow {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  certificateId: string;
  legalAccepted: boolean;
  legalVersion: string;
  legalAcceptedAtIso: string;
  legalAuthMethod: string;
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [errorRanking] = useState<ErrorStat[]>([]);
  const [heatmap] = useState<Record<string, LessonHeatmap>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [studentRows, setStudentRows] = useState<StudentReportRow[]>([]);
  const [legalConsents, setLegalConsents] = useState<LegalAcceptanceRecord[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAnalytics = async () => {
      try {
        const [certSnap, usersSnap, progressSnap, coursesSnap, legalSnap] = await Promise.all([
          get(ref(db, 'certificates')).catch(() => null),
          get(ref(db, 'users')).catch(() => null),
          get(ref(db, 'progress')).catch(() => null),
          get(ref(db, 'courses')).catch(() => null),
          get(ref(db, 'legal_consents')).catch(() => null)
        ]);

        // Total de lecciones de todos los cursos publicados en la plataforma
        let totalLessons = 0;
        if (coursesSnap && coursesSnap.exists()) {
          const coursesData = coursesSnap.val();
          Object.keys(coursesData).forEach((slug) => {
            const cData = coursesData[slug];
            if (cData.modules && Array.isArray(cData.modules)) {
              cData.modules.forEach((m: any) => {
                if (m.lessons && Array.isArray(m.lessons)) {
                  totalLessons += m.lessons.length;
                }
              });
            }
          });
        }

        // 1. Certificados
        const certList: Certificate[] = [];
        if (certSnap && certSnap.exists()) {
          const data = certSnap.val();
          Object.keys(data).forEach((k) => {
            certList.push({
              ...data[k],
              id: k
            });
          });
          setCertificates(certList);
        }

        // 2. Registros de aceptación legal y Habeas Data
        const legalMap: Record<string, LegalAcceptanceRecord> =
          legalSnap && legalSnap.exists() ? legalSnap.val() : {};

        // 3. Construir tabla consolidada de estudiantes, su avance y su estado legal
        const usersMap = usersSnap && usersSnap.exists() ? usersSnap.val() : {};
        const progressMap = progressSnap && progressSnap.exists() ? progressSnap.val() : {};
        const allUids = Array.from(
          new Set([
            ...Object.keys(usersMap),
            ...Object.keys(progressMap),
            ...Object.keys(legalMap)
          ])
        );

        const consolidatedConsents: LegalAcceptanceRecord[] = [];

        const rows: StudentReportRow[] = allUids.map((uid) => {
          const uNode = usersMap[uid] || {};
          const prof = uNode.profile || {};
          const userCourseProgress = progressMap[uid] || {};
          let completedCount = 0;
          let firstCertId = '';
          Object.keys(userCourseProgress).forEach((slug) => {
            const pNode = userCourseProgress[slug] || {};
            if (Array.isArray(pNode.completedLessons)) {
              completedCount += pNode.completedLessons.length;
            }
            if (pNode.certificateId && !firstCertId) {
              firstCertId = pNode.certificateId;
            }
          });
          const pct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

          const matchingCert = certList.find((c) => c.userId === uid);
          const certId = firstCertId || matchingCert?.id || '';

          const consentNode: LegalAcceptanceRecord | undefined =
            uNode.legalConsent || legalMap[uid];

          if (consentNode && consentNode.accepted) {
            consolidatedConsents.push(consentNode);
          }

          const fullName =
            prof.firstName && prof.lastName
              ? `${prof.firstName} ${prof.lastName}`
              : prof.displayName ||
                consentNode?.displayName ||
                matchingCert?.studentName ||
                'Estudiante Registrado';

          return {
            uid,
            fullName,
            email: prof.email || consentNode?.email || matchingCert?.studentEmail || uid,
            role: prof.role === 'admin' ? 'Administrador' : 'Estudiante',
            completedLessons: completedCount,
            totalLessons,
            progressPercent: pct,
            certificateId: certId,
            legalAccepted: Boolean(consentNode?.accepted),
            legalVersion: consentNode?.policyVersion || 'Pendiente',
            legalAcceptedAtIso: consentNode?.acceptedAtIso || '',
            legalAuthMethod: consentNode?.authMethod || ''
          };
        });

        setLegalConsents(
          consolidatedConsents.sort((a, b) =>
            (b.acceptedAtIso || '').localeCompare(a.acceptedAtIso || '')
          )
        );
        setStudentRows(rows.sort((a, b) => b.progressPercent - a.progressPercent));
      } catch (e) {
        console.error('Error cargando analítica:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAnalytics();
  }, []);

  // Exportar tabla de Certificados a CSV compatible con Excel (UTF-8 BOM)
  const handleExportCertificatesCSV = () => {
    const headers = [
      'Codigo_Certificado',
      'Nombre_Estudiante',
      'Correo_Electronico',
      'Curso',
      'Fecha_Emision',
      'Calificacion_Promedio',
      'Avance_Porcentaje',
      'Estado',
      'URL_Verificacion'
    ];

    const rows = certificates.map((c) => [
      c.id,
      `"${(c.studentName || '').replace(/"/g, '""')}"`,
      `"${(c.studentEmail || '').replace(/"/g, '""')}"`,
      `"${(c.courseTitle || 'IPT Course').replace(/"/g, '""')}"`,
      `"${(c.issueDateFormatted || c.issueDate || '').replace(/"/g, '""')}"`,
      `${c.scoreAverage || 96}%`,
      `${c.progressPercent || 100}%`,
      c.status || 'valid',
      `${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${c.id}`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graduados_ipt_course_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar tabla completa de Estudiantes, Progreso y Aceptación Legal a CSV compatible con Excel
  const handleExportStudentsCSV = () => {
    const headers = [
      'UID',
      'Nombre_Completo',
      'Correo_Electronico',
      'Rol',
      'Lecciones_Completadas',
      'Total_Lecciones',
      'Porcentaje_Avance',
      'Certificado_Emitido',
      'Aceptacion_Legal_Habeas_Data',
      'Version_Legal',
      'Fecha_Aceptacion_ISO',
      'Metodo_Autenticacion'
    ];

    const rows = studentRows.map((s) => [
      s.uid,
      `"${(s.fullName || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      s.role,
      s.completedLessons,
      s.totalLessons,
      `${s.progressPercent}%`,
      s.certificateId || 'Pendiente',
      s.legalAccepted ? 'Aceptado' : 'Pendiente',
      s.legalVersion,
      s.legalAcceptedAtIso || 'N/A',
      s.legalAuthMethod || 'N/A'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estudiantes_y_consentimiento_legal_ipt_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f4f5f9] text-[#2a2b3f] font-sans pb-20">
      {/* Breadcrumb de navegación */}
      <div className="bg-white px-6 pt-3 pb-1 border-b border-[#f0f1f7]">
        <nav className="flex items-center gap-2 text-xs text-[#595c73]" aria-label="Migas de pan">
          <Link href="/" className="hover:text-[#6d28d2] font-semibold transition-colors">
            Panel Principal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#a0a3bd]" />
          <span className="text-[#2a2b3f] font-bold">Estudiantes y Certificados</span>
        </nav>
      </div>

      <div className="bg-white border-b border-[#e2e4f0] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
            Auditoría Académica, Legal y Registro de Graduados
          </span>
          <h1 className="text-base font-extrabold text-[#2a2b3f]">
            Analítica de Estudiantes, Consentimiento Legal (Habeas Data) y Certificaciones
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportStudentsCSV}
            className="px-3.5 py-2 rounded-xl border border-[#d1d2e0] bg-white hover:bg-[#f8f9fc] text-xs font-bold text-[#2a2b3f] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6d28d2]" />
            <span>Exportar Alumnos y Registro Legal CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCertificatesCSV}
            className="px-3.5 py-2 rounded-xl bg-[#6d28d2] hover:bg-[#5b21b6] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Certificados CSV</span>
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-10">
        
        {/* SECCIÓN 1: REGISTRO HISTÓRICO Y CERTIFICACIONES EMITIDAS */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-extrabold text-[#2a2b3f]">Acreditaciones Emitidas y Certificados</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#855f13] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {certificates.length} Acreditaciones Emitidas
              </span>
              <button
                onClick={handleExportCertificatesCSV}
                disabled={certificates.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-[#6d28d2] hover:bg-[#591fb0] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Graduados (Excel / CSV)</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-[#595c73]">
            Registro oficial de diplomas expedidos por IPT Course. Haz clic en <strong>Ver Certificado</strong> para proyectar la acreditación o descárgala en Excel/CSV.
          </p>

          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Código Acreditación</th>
                  <th className="px-6 py-4 font-bold">Estudiante Titular</th>
                  <th className="px-6 py-4 font-bold">Programa</th>
                  <th className="px-6 py-4 font-bold text-center">Fecha Emisión</th>
                  <th className="px-6 py-4 font-bold text-center">Promedio</th>
                  <th className="px-6 py-4 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fcfdff] transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-[#855f13]">
                      {c.id}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#2a2b3f] text-xs">{c.studentName}</p>
                      <p className="text-[11px] text-[#595c73] font-mono">{c.studentEmail || c.userId}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#595c73] max-w-xs truncate">
                      {c.courseTitle || 'IPT Course'}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-[#595c73]">
                      {c.issueDateFormatted || 'Reciente'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-extrabold text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {c.scoreAverage || 96}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedCert(c);
                          setIsCertModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Certificado</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {certificates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center space-y-3">
                      <Award className="w-8 h-8 text-amber-400 mx-auto opacity-40" />
                      <p className="text-sm font-semibold text-[#595c73]">
                        No se han emitido certificados aún.
                      </p>
                      <p className="text-xs text-[#9194ac]">
                        Los diplomas aparecerán registrados automáticamente una vez los estudiantes alcancen los requisitos del curso.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 2: SEGUIMIENTO DE ESTUDIANTES, PROGRESO Y CONSENTIMIENTO LEGAL */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6d28d2]" />
              <h2 className="text-xl font-extrabold text-[#2a2b3f]">Base de Estudiantes, Avance y Aceptación Legal</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#6d28d2] bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                {studentRows.length} Usuarios Registrados
              </span>
              <button
                onClick={handleExportStudentsCSV}
                disabled={studentRows.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-[#6d28d2] hover:bg-[#591fb0] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Estudiantes y Consentimientos (CSV)</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-[#595c73]">
            Consolidado de usuarios inscritos, lecciones superadas, prueba de aceptación de Habeas Data / Términos Legales y estado de certificación.
          </p>

          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Estudiante</th>
                  <th className="px-6 py-4 font-bold">Rol</th>
                  <th className="px-6 py-4 font-bold text-center">Lecciones</th>
                  <th className="px-6 py-4 font-bold">Avance General</th>
                  <th className="px-6 py-4 font-bold text-center">Consentimiento Legal</th>
                  <th className="px-6 py-4 font-bold text-right">Estado Acreditación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {studentRows.map((row) => (
                  <tr key={row.uid} className="hover:bg-[#fcfdff] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#2a2b3f] text-xs">{row.fullName}</p>
                      <p className="text-[11px] text-[#595c73] font-mono">{row.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.role === 'Administrador'
                            ? 'bg-purple-50 text-[#6d28d2] border border-purple-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-[#2a2b3f]">
                      {row.completedLessons} / {row.totalLessons}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5 max-w-[180px]">
                        <div className="flex-1 bg-[#e9eaf2] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6d28d2] rounded-full transition-all"
                            style={{ width: `${row.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#2a2b3f] w-9 text-right">
                          {row.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.legalAccepted ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Aceptado ({row.legalVersion})
                          </span>
                          {row.legalAcceptedAtIso && (
                            <span className="text-[10px] text-[#606060] mt-0.5 font-mono">
                              {new Date(row.legalAcceptedAtIso).toLocaleDateString('es-CO')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                          Se solicitará al iniciar sesión
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.certificateId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {row.certificateId}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9194ac] font-medium">En formación</span>
                      )}
                    </td>
                  </tr>
                ))}
                {studentRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#595c73] text-xs">
                      Aún no hay registros de progreso de estudiantes en la base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 3: LIBRO DE AUDITORÍA DE ACEPTACIÓN LEGAL (LEY 1581 DE 2012 Y LEY 1480 DE 2011) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-extrabold text-[#2a2b3f]">
                Registro de Aceptación Legal y Habeas Data (Al momento del Login)
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {legalConsents.length} Firmas Digitales Registradas
            </span>
          </div>
          <p className="text-sm text-[#595c73]">
            Prueba auditable de autorización previa, expresa e informada (Ley 1581 de 2012, Estatuto del Consumidor Ley 1480 de 2011, Aviso Legal, Términos y Cookies) generada al momento de iniciar sesión o crear cuenta.
          </p>

          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Titular de los Datos</th>
                  <th className="px-6 py-4 font-bold">Versión Legal</th>
                  <th className="px-6 py-4 font-bold">Vía de Aceptación</th>
                  <th className="px-6 py-4 font-bold">Documentos Aceptados</th>
                  <th className="px-6 py-4 font-bold text-right">Fecha y Hora Exacta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {legalConsents.map((item) => (
                  <tr key={item.uid} className="hover:bg-[#fcfdff] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#2a2b3f] text-xs">{item.displayName}</p>
                      <p className="text-[11px] text-[#595c73] font-mono">{item.email}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-700">
                      {item.policyVersion}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#595c73]">
                      {item.authMethod === 'email_login'
                        ? 'Login con Correo'
                        : item.authMethod === 'google_login'
                        ? 'Login con Google'
                        : item.authMethod === 'email_register'
                        ? 'Registro con Correo'
                        : item.authMethod === 'google_register'
                        ? 'Registro con Google'
                        : 'Verificación de Sesión'}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#595c73]">
                      Aviso Legal · Habeas Data · T&C · Retracto y Reversión · Cookies
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-[#2a2b3f]">
                      {item.acceptedAtIso
                        ? new Date(item.acceptedAtIso).toLocaleString('es-CO')
                        : 'Registrado'}
                    </td>
                  </tr>
                ))}
                {legalConsents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#595c73] text-xs">
                      Los registros de aceptación legal aparecerán automáticamente en cuanto los usuarios inicien sesión o se registren.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección: Preguntas Críticas */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e9eaf2] pb-3">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-extrabold text-[#2a2b3f]">Ranking de Dificultad Académica</h2>
          </div>
          <p className="text-sm text-[#595c73]">Preguntas de quizzes y checkpoints con mayor porcentaje de fallos. Analiza si es un problema de redacción o si los alumnos necesitan refuerzo.</p>
          
          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Lección</th>
                  <th className="px-6 py-4 font-bold">Tipo</th>
                  <th className="px-6 py-4 font-bold text-center">Intentos Totales</th>
                  <th className="px-6 py-4 font-bold text-right">Tasa de Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {errorRanking.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-[#fcfdff] transition-colors">
                    <td className="px-6 py-4 font-semibold font-mono text-xs">{stat.lessonId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${stat.type === 'module_quiz' ? 'bg-[#6d28d2]/10 text-[#6d28d2]' : 'bg-slate-100 text-slate-600'}`}>
                        {stat.type ? stat.type.replace('_', ' ') : 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#595c73]">{stat.totalAttempts}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-extrabold text-base ${stat.errorRate > 50 ? 'text-rose-600' : stat.errorRate > 30 ? 'text-[#c4710d]' : 'text-emerald-600'}`}>
                        {stat.errorRate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {errorRanking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#595c73]">No hay suficientes datos de intentos recolectados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección: Mapa de Calor (Drop-offs y Seeks) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e9eaf2] pb-3">
            <Flame className="w-5 h-5 text-[#c4710d]" />
            <h2 className="text-xl font-extrabold text-[#2a2b3f]">Heatmap de Atención de Video (por lección)</h2>
          </div>
          <p className="text-sm text-[#595c73]">Zonas del video donde los alumnos retroceden para repetir (franjas calientes) o donde pausan y abandonan la sesión (drop-offs). Muestreo en bloques de 10 segundos.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(heatmap).map(([lessonId, data]) => {
              const allBuckets = Array.from(new Set([...Object.keys(data.repeats), ...Object.keys(data.dropoffs)])).map(Number).sort((a,b)=>a-b);
              
              return (
                <div key={lessonId} className="bg-white border border-[#d1d2e0] rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="font-bold text-[#2a2b3f] text-sm font-mono border-b border-[#e9eaf2] pb-2">{lessonId}</h3>
                  {allBuckets.length === 0 ? (
                    <p className="text-xs text-[#9194ac]">No hay telemetría de reproducción aún.</p>
                  ) : (
                    <div className="space-y-3">
                      {allBuckets.map(bucket => {
                        const repeats = data.repeats[bucket] || 0;
                        const dropoffs = data.dropoffs[bucket] || 0;
                        return (
                          <div key={bucket} className="flex items-center gap-4 text-xs">
                            <span className="font-mono font-semibold text-[#595c73] w-12">{bucket}s</span>
                            <div className="flex-1 h-3 flex overflow-hidden rounded-full bg-[#f6f7f9] border border-[#e9eaf2]">
                              <div className="bg-[#c4710d]" style={{ width: `${Math.min(100, repeats * 10)}%` }} title={`${repeats} repeticiones`} />
                              <div className="bg-rose-600" style={{ width: `${Math.min(100, dropoffs * 10)}%` }} title={`${dropoffs} abandonos`} />
                            </div>
                            <div className="flex items-center gap-2 w-24 justify-end text-[10px] font-bold">
                              {repeats > 0 && <span className="text-[#c4710d] flex items-center gap-0.5"><Clock className="w-3 h-3"/> {repeats}</span>}
                              {dropoffs > 0 && <span className="text-rose-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3"/> {dropoffs}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(heatmap).length === 0 && (
              <div className="col-span-full py-8 text-center text-[#595c73] bg-white rounded-2xl border border-[#e9eaf2]">
                No hay suficientes datos de reproducción recolectados.
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Modal de Reconstrucción de Diploma */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => {
          setIsCertModalOpen(false);
          setSelectedCert(null);
        }}
        user={user}
        initialCertificate={selectedCert}
      />
    </div>
  );
}
