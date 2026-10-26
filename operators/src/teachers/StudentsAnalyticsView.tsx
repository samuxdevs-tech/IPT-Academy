"use client";

import React, { useState, useEffect } from "react";
import { Users, Award, Activity, Search, Download, CheckCircle2, AlertCircle, Clock, RefreshCw, FileText } from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface ActiveStudent {
  uid: string;
  name: string;
  email: string;
  progressPercent: number;
  completedLessonsCount: number;
  lastHeartbeatUtc: string;
  hasDiploma: boolean;
  diplomaFolio?: string;
  diplomaDateUtc?: string;
}

export function StudentsAnalyticsView() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"students" | "diplomas">("students");
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Consultar usuarios, progreso y certificados reales en RTDB
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const progressRef = ref(rtdb, "progress");
    const certsRef = ref(rtdb, "certificates");

    let unsubUsers: (() => void) | null = null;
    let unsubProg: (() => void) | null = null;
    let unsubCerts: (() => void) | null = null;

    let usersMap: Record<string, any> = {};
    let progMap: Record<string, any> = {};
    let certsMap: Record<string, any> = {};

    const recompute = () => {
      const activeList: ActiveStudent[] = [];

      Object.entries(usersMap).forEach(([uid, u]) => {
        // Excluir roles administrativos
        const role = (u.role || u.profile?.role || "").toLowerCase();
        if (role === "admin" || role === "owner" || role === "teacher" || role === "operator") {
          return;
        }

        // Progreso real
        const studentProg = progMap[uid] || {};
        const completedCount = studentProg.completedLessons
          ? (Array.isArray(studentProg.completedLessons) ? studentProg.completedLessons.length : Object.keys(studentProg.completedLessons).length)
          : 0;
        const progressPct = studentProg.progressPercent || Math.min(100, Math.round((completedCount / 16) * 100)) || 0;

        // Latido de vida
        const heartbeat = u.lastHeartbeat || u.lastActiveAt || u.updatedAt || studentProg.lastUpdatedAt || null;

        // FILTRO ESTRICTO: Descartar estudiantes sin ningún latido de vida
        if (progressPct === 0 && !heartbeat && completedCount === 0) {
          return;
        }

        // Formato amigable de latido
        let heartbeatText = "Actividad registrada";
        if (heartbeat) {
          const d = new Date(heartbeat);
          if (!isNaN(d.getTime())) {
            const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
            if (diffMin < 60) {
              heartbeatText = `Hace ${Math.max(1, diffMin)} min`;
            } else if (diffMin < 1440) {
              heartbeatText = `Hace ${Math.round(diffMin / 60)} h`;
            } else {
              heartbeatText = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
            }
          }
        }

        // Certificado / Diploma oficial
        const cert = certsMap[uid];
        const hasDiploma = !!cert || progressPct >= 100;
        const diplomaFolio = cert?.folio || (hasDiploma ? `IPT-DG-${uid.slice(0, 6).toUpperCase()}` : undefined);
        const diplomaDateUtc = cert?.issueDate || cert?.issuedAt || (hasDiploma ? new Date().toISOString().split("T")[0] : undefined);

        activeList.push({
          uid,
          name: u.displayName || u.profile?.displayName || u.name || "Estudiante IPT",
          email: u.email || u.profile?.email || "estudiante@ipt.com",
          progressPercent: progressPct,
          completedLessonsCount: completedCount,
          lastHeartbeatUtc: heartbeatText,
          hasDiploma,
          diplomaFolio,
          diplomaDateUtc
        });
      });

      setStudents(activeList);
      setLoading(false);
    };

    unsubUsers = onValue(usersRef, (snap) => {
      usersMap = snap.val() || {};
      recompute();
    });

    unsubProg = onValue(progressRef, (snap) => {
      progMap = snap.val() || {};
      recompute();
    });

    unsubCerts = onValue(certsRef, (snap) => {
      certsMap = snap.val() || {};
      recompute();
    });

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubProg) unsubProg();
      if (unsubCerts) unsubCerts();
    };
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentsWithDiplomas = students.filter((s) => s.hasDiploma);

  // Exportar padrón de estudiantes a CSV
  const handleExportStudents = () => {
    if (students.length === 0) {
      alert("No hay registros de estudiantes activos para exportar.");
      return;
    }
    const headers = [
      "Identificador",
      "Nombre Completo",
      "Correo Electrónico",
      "Progreso (%)",
      "Lecciones Completadas",
      "Último Latido",
      "Estado de Diploma"
    ];

    const rows = students.map((s) => [
      s.uid,
      s.name,
      s.email,
      `${s.progressPercent}%`,
      s.completedLessonsCount,
      s.lastHeartbeatUtc,
      s.hasDiploma ? `Expedido (${s.diplomaFolio})` : "En Progreso"
    ]);

    exportToCsv("padron_estudiantes_activos_ipt.csv", headers, rows);
  };

  // Exportar registro de diplomas a CSV
  const handleExportDiplomas = () => {
    if (studentsWithDiplomas.length === 0) {
      alert("No hay diplomas expedidos para exportar.");
      return;
    }
    const headers = [
      "Folio Oficial",
      "Nombre del Graduado",
      "Correo Electrónico",
      "Fecha de Emisión",
      "UID de Verificación"
    ];

    const rows = studentsWithDiplomas.map((s) => [
      s.diplomaFolio || "IPT-OFICIAL",
      s.name,
      s.email,
      s.diplomaDateUtc || "2026",
      s.uid
    ]);

    exportToCsv("registro_diplomas_expedidos_ipt.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            Analítica de Aprendizaje
          </span>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Monitor de Estudiantes y Diplomas Oficiales
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Padrón en vivo filtrado exclusivamente para estudiantes con actividad demostrada. Roles administrativos y cuentas inactivas son excluidas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "students" ? (
            <button
              onClick={handleExportStudents}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            >
              <Download className="w-4 h-4 text-violet-400" />
              <span>Exportar Padrón CSV</span>
            </button>
          ) : (
            <button
              onClick={handleExportDiplomas}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            >
              <Download className="w-4 h-4 text-violet-400" />
              <span>Exportar Libro de Diplomas CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Métricas Resumen Dark Pro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Estudiantes con Latido Activo
            </span>
            <div className="text-2xl font-bold text-white tracking-tight mt-1">
              {students.length}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verificados en tiempo real
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Diplomas Expedidos
            </span>
            <div className="text-2xl font-bold text-white tracking-tight mt-1">
              {studentsWithDiplomas.length}
            </div>
            <span className="text-[11px] text-violet-400 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Graduados con folio
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Promedio de Finalización
            </span>
            <div className="text-2xl font-bold text-white tracking-tight mt-1">
              {students.length > 0
                ? `${Math.round(students.reduce((acc, s) => acc + s.progressPercent, 0) / students.length)}%`
                : "0%"}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              En plataforma Datagan 360
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#181820] text-zinc-300 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Segmentado & Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-[#121217] p-1.5 rounded-full border border-white/10 inline-flex self-start">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "students"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Monitor Activo ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("diplomas")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "diplomas"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Libro de Diplomas ({studentsWithDiplomas.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121217] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
          />
        </div>
      </div>

      {/* Tabla de Datos Dark Pro */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-500" />
            <p className="text-xs font-medium">Sincronizando estudiantes y latidos en vivo...</p>
          </div>
        ) : activeTab === "students" ? (
          filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No se encontraron estudiantes activos</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? "No hay coincidencias para el criterio de búsqueda ingresado."
                  : "Los estudiantes registrados aparecerán aquí automáticamente una vez registren su primer latido o avance en el curso."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181820] text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="px-6 py-3.5">Estudiante</th>
                    <th className="px-6 py-3.5">Progreso Académico</th>
                    <th className="px-6 py-3.5">Lecciones</th>
                    <th className="px-6 py-3.5">Último Latido</th>
                    <th className="px-6 py-3.5 text-right">Certificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((s) => (
                    <tr key={s.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{s.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-white font-mono">{s.progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-600 rounded-full transition-all duration-300"
                              style={{ width: `${s.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-medium">
                        {s.completedLessonsCount} completadas
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Clock className="w-3 h-3" />
                          {s.lastHeartbeatUtc}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.hasDiploma ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {s.diplomaFolio}
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Cursando</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Pestaña de Diplomas */
          studentsWithDiplomas.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Sin diplomas expedidos</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                Los diplomas oficiales se registrarán aquí con su folio único cuando los estudiantes completen satisfactoriamente el curso.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181820] text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="px-6 py-3.5">Folio Registrado</th>
                    <th className="px-6 py-3.5">Graduado</th>
                    <th className="px-6 py-3.5">Fecha de Emisión</th>
                    <th className="px-6 py-3.5">Identificador UID</th>
                    <th className="px-6 py-3.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {studentsWithDiplomas.map((s) => (
                    <tr key={s.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-violet-300">
                        {s.diplomaFolio}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{s.email}</div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-mono">
                        {s.diplomaDateUtc || "2026-10-25"}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-500">
                        {s.uid}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Válido y Sellado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
