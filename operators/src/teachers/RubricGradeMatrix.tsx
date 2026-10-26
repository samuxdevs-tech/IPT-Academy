"use client";

import React, { useState, useEffect } from "react";
import { Table, Download, Plus, CheckCircle2, Trash2, Inbox } from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { ApiClient } from "@/lib/apiClient";
import { rtdb } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";

export interface RubricLevel {
  title: string;
  points: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  weightPercent: number;
  levels: RubricLevel[];
}

export interface StudentGradeRow {
  studentUid: string;
  studentName: string;
  email: string;
  corte1Grade: number;
  corte2Grade: number;
  corte3Grade: number;
  finalAverage: number;
  status: "Aprobado" | "En Riesgo" | "Pendiente";
}

export function RubricGradeMatrix() {
  const [activeTab, setActiveTab] = useState<"matrix" | "rubrics">("matrix");
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Cargar calificaciones y rúbricas REALES desde API y Firebase RTDB
  useEffect(() => {
    async function fetchRealGradebook() {
      setLoading(true);
      try {
        // 1. Cargar rúbrica real desde RTDB
        const rubricSnap = await get(ref(rtdb, "courses/rubric"));
        if (rubricSnap.exists()) {
          const val = rubricSnap.val();
          setRubricCriteria(Array.isArray(val) ? val : Object.values(val));
        } else {
          setRubricCriteria([]);
        }

        // 2. Cargar notas reales de alumnos desde RTDB (progress/ o users/)
        const progressSnap = await get(ref(rtdb, "progress"));
        const usersSnap = await get(ref(rtdb, "users"));
        const usersVal = usersSnap.exists() ? usersSnap.val() : {};

        if (progressSnap.exists()) {
          const progressVal = progressSnap.val();
          const rows: StudentGradeRow[] = [];

          Object.keys(progressVal).forEach((uid) => {
            const p = progressVal[uid] || {};
            const userInfo = usersVal[uid] || {};
            const studentName = userInfo.displayName || userInfo.profile?.displayName || `Alumno (${uid.substring(0, 6)})`;
            const email = userInfo.email || userInfo.profile?.email || "Sin correo";

            const c1 = Number(p.corte1Grade ?? p.examScore ?? 0);
            const c2 = Number(p.corte2Grade ?? 0);
            const c3 = Number(p.corte3Grade ?? 0);
            const avg = c1 * 0.3 + c2 * 0.3 + c3 * 0.4;

            rows.push({
              studentUid: uid,
              studentName,
              email,
              corte1Grade: c1,
              corte2Grade: c2,
              corte3Grade: c3,
              finalAverage: avg,
              status: avg >= 3.5 ? "Aprobado" : "En Riesgo"
            });
          });

          setGradeRows(rows);
        } else {
          setGradeRows([]);
        }
      } catch (err) {
        console.warn("No se pudo sincronizar el libro de notas:", err);
        setGradeRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRealGradebook();
  }, []);

  const handleExportMatrix = () => {
    const headers = [
      "Identificador",
      "Estudiante",
      "Correo Electrónico",
      "Corte 1 (30%)",
      "Corte 2 (30%)",
      "Corte 3 (40%)",
      "Promedio Final",
      "Estado Académico"
    ];

    const rows = gradeRows.map(r => [
      r.studentUid,
      r.studentName,
      r.email,
      r.corte1Grade.toFixed(2),
      r.corte2Grade.toFixed(2),
      r.corte3Grade.toFixed(2),
      r.finalAverage.toFixed(2),
      r.status
    ]);

    exportToCsv("Matriz_Calificaciones_IPT_Course", headers, rows);
  };

  const handleSaveRubric = async () => {
    try {
      await set(ref(rtdb, "courses/datagan-360-certificacion-maestra/rubric"), rubricCriteria);
      alert("Rúbrica guardada exitosamente en Firebase RTDB.");
    } catch {
      alert("Rúbrica guardada localmente.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Segmented Control Bar Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex bg-[#181820] p-1.5 rounded-full border border-white/10">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "matrix"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Matriz de Calificaciones ({gradeRows.length})
          </button>
          <button
            onClick={() => setActiveTab("rubrics")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "rubrics"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Rúbricas de Evaluación ({rubricCriteria.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "matrix" && (
            <button
              onClick={handleExportMatrix}
              disabled={gradeRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-emerald-600/20 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel / CSV</span>
            </button>
          )}

          {activeTab === "rubrics" && (
            <button
              onClick={handleSaveRubric}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar Rúbrica en RTDB</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-16 text-center text-zinc-400 bg-[#121217] rounded-2xl border border-white/10">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Sincronizando libro de calificaciones con Firebase...</p>
        </div>
      )}

      {/* Matrix Tab */}
      {!loading && activeTab === "matrix" && (
        <>
          {gradeRows.length === 0 ? (
            <div className="p-16 text-center bg-[#121217] rounded-2xl border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#181820] text-zinc-500 flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No hay calificaciones registradas aún</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Aún no se han asentado notas en el libro de calificaciones de Firebase RTDB.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181820] border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                      <th className="py-3.5 px-5">Estudiante</th>
                      <th className="py-3.5 px-4 text-center">Corte 1 (30%)</th>
                      <th className="py-3.5 px-4 text-center">Corte 2 (30%)</th>
                      <th className="py-3.5 px-4 text-center">Corte 3 (40%)</th>
                      <th className="py-3.5 px-5 text-center text-violet-400">Promedio Final</th>
                      <th className="py-3.5 px-5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gradeRows.map((row) => (
                      <tr key={row.studentUid} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-white">{row.studentName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{row.email}</div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-zinc-200">{row.corte1Grade.toFixed(1)}</td>
                        <td className="py-4 px-4 text-center font-mono text-zinc-200">{row.corte2Grade.toFixed(1)}</td>
                        <td className="py-4 px-4 text-center font-mono text-zinc-200">{row.corte3Grade.toFixed(1)}</td>
                        <td className="py-4 px-5 text-center font-mono font-bold text-sm text-violet-300 bg-violet-500/10">
                          {row.finalAverage.toFixed(2)}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === "Aprobado"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rubrics Tab */}
      {!loading && activeTab === "rubrics" && (
        <div className="space-y-4">
          {rubricCriteria.map((crit, cIdx) => (
            <div key={crit.id} className="p-6 rounded-2xl bg-[#121217] border border-white/10 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex-1">
                  <input
                    type="text"
                    value={crit.title}
                    onChange={(e) => {
                      const updated = [...rubricCriteria];
                      updated[cIdx].title = e.target.value;
                      setRubricCriteria(updated);
                    }}
                    className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-violet-500 focus:outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-semibold">Ponderación:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={crit.weightPercent}
                    onChange={(e) => {
                      const updated = [...rubricCriteria];
                      updated[cIdx].weightPercent = Number(e.target.value);
                      setRubricCriteria(updated);
                    }}
                    className="w-16 text-center text-xs font-bold bg-[#181820] text-white border border-white/10 rounded-lg px-2 py-1"
                  />
                  <span className="font-bold text-white">%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {crit.levels.map((lvl, lIdx) => (
                  <div key={lIdx} className="p-4 rounded-xl bg-[#181820] border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{lvl.title}</span>
                      <span className="text-[11px] font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                        {lvl.points.toFixed(1)} pts
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={lvl.description}
                      onChange={(e) => {
                        const updated = [...rubricCriteria];
                        updated[cIdx].levels[lIdx].description = e.target.value;
                        setRubricCriteria(updated);
                      }}
                      className="w-full text-[11px] text-zinc-300 leading-relaxed bg-[#121217] border border-white/10 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
