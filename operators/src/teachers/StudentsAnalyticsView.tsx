"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Award,
  Activity,
  Search,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  BookOpen,
  Layers,
  Video,
  CreditCard,
} from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb, parseStudentRecordFromRtdb, ParsedIptStudent } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

export function StudentsAnalyticsView() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"students" | "modules" | "diplomas">("students");
  const [students, setStudents] = useState<ParsedIptStudent[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Consultar usuarios, progreso, suscripciones, cursos y certificados reales en RTDB
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const progressRef = ref(rtdb, "progress");
    const subsRef = ref(rtdb, "lms_subscriptions");
    const certsRef = ref(rtdb, "certificates");
    const coursesRef = ref(rtdb, "courses");

    let usersMap: Record<string, any> = {};
    let progMap: Record<string, any> = {};
    let subsMap: Record<string, any> = {};
    let certsMap: Record<string, any> = {};
    let coursesList: any[] = [];

    const recompute = () => {
      const list: ParsedIptStudent[] = Object.keys(usersMap)
        .map((uid) =>
          parseStudentRecordFromRtdb(
            uid,
            usersMap[uid],
            progMap,
            subsMap,
            certsMap,
            coursesList
          )
        )
        .filter((s) => s.email.toLowerCase() !== "administrator@ivanperez.tech");

      setStudents(list);
      setCourses(coursesList);
      setLoading(false);
    };

    const unsubUsers = onValue(usersRef, (snap) => {
      usersMap = snap.val() || {};
      recompute();
    });

    const unsubProg = onValue(progressRef, (snap) => {
      progMap = snap.val() || {};
      recompute();
    });

    const unsubSubs = onValue(subsRef, (snap) => {
      subsMap = snap.val() || {};
      recompute();
    });

    const unsubCerts = onValue(certsRef, (snap) => {
      certsMap = snap.val() || {};
      recompute();
    });

    const unsubCourses = onValue(coursesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        coursesList = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
      } else {
        coursesList = [];
      }
      recompute();
    });

    return () => {
      unsubUsers();
      unsubProg();
      unsubSubs();
      unsubCerts();
      unsubCourses();
    };
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.uid.toLowerCase().includes(q) ||
      s.planId.toLowerCase().includes(q) ||
      s.subStatus.toLowerCase().includes(q)
    );
  });

  const filteredCourses = courses.filter((c: any) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const mods = Array.isArray(c?.modules)
      ? c.modules.filter(Boolean)
      : c?.modules && typeof c.modules === "object"
      ? Object.values(c.modules)
      : [];
    return (
      (c.title || "").toLowerCase().includes(q) ||
      (c.slug || "").toLowerCase().includes(q) ||
      mods.some((m: any) => (m?.title || "").toLowerCase().includes(q))
    );
  });

  const studentsWithDiplomas = students.filter((s) => s.hasDiploma);

  const totalModulesCount = courses.reduce((acc, c: any) => {
    const mods = Array.isArray(c?.modules)
      ? c.modules.filter(Boolean)
      : c?.modules && typeof c.modules === "object"
      ? Object.values(c.modules)
      : [];
    return acc + mods.length;
  }, 0);

  // Exportar padrón de estudiantes a CSV
  const handleExportStudents = () => {
    if (students.length === 0) {
      alert("No hay registros de estudiantes para exportar.");
      return;
    }
    const headers = [
      "UID",
      "Nombre Completo",
      "Correo Electrónico",
      "Plan Activo",
      "Estado Membresía",
      "Progreso (%)",
      "Lecciones Completadas",
      "Último Registro",
      "Estado de Diploma",
    ];

    const rows = students.map((s) => [
      s.uid,
      s.name,
      s.email,
      s.planId,
      s.subStatus,
      `${s.progressPercent}%`,
      s.completedLessonsCount,
      s.lastActiveIso || "Registrado",
      s.hasDiploma ? `Expedido (${s.diplomaFolio})` : "En Progreso",
    ]);

    exportToCsv("padron_estudiantes_ipt_course.csv", headers, rows);
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
      "UID de Verificación",
    ];

    const rows = studentsWithDiplomas.map((s) => [
      s.diplomaFolio || "IPT-OFICIAL",
      s.name,
      s.email,
      s.diplomaDateUtc || "2026",
      s.uid,
    ]);

    exportToCsv("registro_diplomas_expedidos_ipt.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            Base de Datos en Vivo · ipt-course-students-default-rtdb
          </span>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Monitor de Estudiantes, Módulos de Cursos y Diplomas Oficiales
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Consulta en tiempo real todos los estudiantes registrados en ipt-course, su suscripción activa, lecciones completadas por curso/módulo y los módulos publicados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "students" && (
            <button
              onClick={handleExportStudents}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            >
              <Download className="w-4 h-4 text-violet-400" />
              <span>Exportar Padrón CSV</span>
            </button>
          )}
          {activeTab === "diplomas" && (
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
              Estudiantes en Base de Datos
            </span>
            <div className="text-2xl font-bold text-white tracking-tight mt-1">
              {students.length}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sincronizados en vivo (/users)
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Cursos & Módulos Activos
            </span>
            <div className="text-2xl font-bold text-white tracking-tight mt-1">
              {courses.length} cursos · {totalModulesCount} mód.
            </div>
            <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Estructura leída de /courses
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
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
              Graduados con folio oficial
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Segmentado & Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-[#121217] p-1.5 rounded-full border border-white/10 inline-flex flex-wrap self-start gap-1">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "students"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Estudiantes en RTDB ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("modules")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "modules"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cursos & Módulos ({courses.length})
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

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar estudiante, correo, UID, curso o módulo..."
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
            <p className="text-xs font-medium">Sincronizando estudiantes y módulos en vivo...</p>
          </div>
        ) : activeTab === "students" ? (
          filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No se encontraron estudiantes</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? "No hay coincidencias para el criterio de búsqueda ingresado."
                  : "Los estudiantes registrados en ipt-course aparecerán aquí automáticamente."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181820] text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="px-6 py-3.5">Estudiante & UID</th>
                    <th className="px-6 py-3.5">Membresía Activa</th>
                    <th className="px-6 py-3.5">Progreso & Cursos</th>
                    <th className="px-6 py-3.5">Lecciones & Notas</th>
                    <th className="px-6 py-3.5 text-right">Certificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((s) => (
                    <tr key={s.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[11px] text-zinc-300 font-mono mt-0.5">{s.email}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">UID: {s.uid}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          <CreditCard className="w-3 h-3" />
                          {s.planId} · {s.subStatus}
                        </span>
                        <div className="text-[10px] text-zinc-400 font-mono mt-1">
                          Créditos en vivo: {s.remainingLiveCredits}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-white font-mono">{s.progressPercent}%</span>
                            <span className="text-[10px] text-zinc-400">
                              {s.completedLessonsCount}/{s.totalLessonsCount} lecc.
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-600 rounded-full transition-all duration-300"
                              style={{ width: `${s.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {s.coursesProgress.map((cp) => (
                            <div key={cp.courseSlug} className="text-[11px] text-zinc-300 font-mono">
                              <span className="text-emerald-400 font-bold">{cp.courseSlug}:</span>{" "}
                              {cp.completedCount} completadas · C1:{cp.corte1Grade} C2:{cp.corte2Grade} C3:{cp.corte3Grade}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.hasDiploma ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {s.diplomaFolio}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <Clock className="w-3 h-3" />
                            Cursando
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "modules" ? (
          /* Pestaña de Cursos y Módulos en Vivo */
          <div className="p-6 space-y-4">
            {filteredCourses.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                No se encontraron cursos o módulos con ese filtro.
              </div>
            ) : (
              filteredCourses.map((c: any, idx: number) => {
                const mods = Array.isArray(c?.modules)
                  ? c.modules.filter(Boolean)
                  : c?.modules && typeof c.modules === "object"
                  ? Object.values(c.modules)
                  : [];
                return (
                  <div
                    key={c.slug || idx}
                    className="rounded-2xl bg-[#181822] border border-white/10 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-violet-400" />
                          <h3 className="text-sm font-bold text-white">{c.title || c.slug}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            {c.courseType || c.courseModality || "dynamic"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Slug: {c.slug} · Licencia: {c.licenseHash || "N/A"} · Progresión: {c.progressionMode || "free"}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {mods.length} Módulos Activos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mods.map((m: any, mIdx: number) => {
                        const lessons = Array.isArray(m?.lessons)
                          ? m.lessons.filter(Boolean)
                          : m?.lessons && typeof m.lessons === "object"
                          ? Object.values(m.lessons)
                          : [];
                        const resources = Array.isArray(m?.resources)
                          ? m.resources.filter(Boolean)
                          : m?.resources && typeof m.resources === "object"
                          ? Object.values(m.resources)
                          : [];
                        return (
                          <div
                            key={m.id || mIdx}
                            className="p-3.5 rounded-xl bg-[#121217] border border-white/5 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white">
                                {m.title || `Módulo ${mIdx + 1}`}
                              </span>
                              <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded">
                                {lessons.length} lecc. · {resources.length} rec.
                              </span>
                            </div>
                            {m.description && (
                              <p className="text-[11px] text-zinc-400">{m.description}</p>
                            )}
                            <div className="space-y-1 pt-1 border-t border-white/5">
                              {lessons.map((l: any, lIdx: number) => (
                                <div
                                  key={l.id || lIdx}
                                  className="flex items-center justify-between text-[11px] text-zinc-300"
                                >
                                  <span className="truncate flex items-center gap-1.5">
                                    <Video className="w-3 h-3 text-emerald-400 shrink-0" />
                                    {l.title || `Lección ${lIdx + 1}`}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                    {l.duration || "10:00"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
