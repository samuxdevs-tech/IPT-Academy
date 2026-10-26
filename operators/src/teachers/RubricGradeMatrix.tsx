"use client";

import React, { useState, useEffect } from "react";
import { Table, Download, Plus, CheckCircle2, Trash2, Inbox, Save, Edit3, Award, Sparkles } from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb } from "@/lib/firebase";
import { ref, get, set, onValue } from "firebase/database";

export interface RubricLevel {
  id?: string;
  label: string;
  points: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  weightPercent: number;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface AssignmentItem {
  id: string;
  courseSlug: string;
  courseTitle: string;
  moduleTitle: string;
  cutId: string;
  weightInCutPercent: number;
  title: string;
  instructions: string;
  dueDateUtc: string;
  allowedExtensions: string[];
  maxFileSizeMb: number;
  status: "pending" | "submitted" | "graded";
  rubric: RubricCriterion[];
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
  const [activeTab, setActiveTab] = useState<"matrix" | "assignments">("matrix");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [editingStudentUid, setEditingStudentUid] = useState<string | null>(null);
  const [editC1, setEditC1] = useState<number>(0);
  const [editC2, setEditC2] = useState<number>(0);
  const [editC3, setEditC3] = useState<number>(0);

  // Modal para crear nueva tarea con rúbrica
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newInstructions, setNewInstructions] = useState<string>("");
  const [newCutId, setNewCutId] = useState<string>("cut_1");
  const [newWeight, setNewWeight] = useState<number>(20);
  const [newDueDate, setNewDueDate] = useState<string>("");

  const activeCourseSlug = "datagan-360-certificacion-maestra";

  useEffect(() => {
    // 1. Escuchar tareas reales en lms_assignments
    const assignRef = ref(rtdb, "lms_assignments");
    const unsubAssignments = onValue(assignRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: AssignmentItem[] = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.values(val);
        setAssignments(list);
      } else {
        setAssignments([]);
      }
    });

    // 2. Escuchar estudiantes reales en users y notas en progress
    const usersRef = ref(rtdb, "users");
    const progressRef = ref(rtdb, "progress");

    const syncGrades = async () => {
      try {
        const [usersSnap, progressSnap] = await Promise.all([
          get(usersRef),
          get(progressRef)
        ]);

        const usersVal = usersSnap.exists() ? usersSnap.val() : {};
        const progressVal = progressSnap.exists() ? progressSnap.val() : {};

        const rows: StudentGradeRow[] = [];

        Object.keys(usersVal).forEach((uid) => {
          const u = usersVal[uid] || {};
          const role = u.role || u.profile?.role || "student";
          if (role !== "student" && role !== "alumno") return;

          const p = progressVal[uid]?.[activeCourseSlug] || progressVal[uid] || {};
          const studentName = u.displayName || u.profile?.displayName || `Estudiante (${uid.substring(0, 6)})`;
          const email = u.email || u.profile?.email || "estudiante@correo.com";

          const c1 = Number(p.corte1Grade ?? p.c1 ?? 0);
          const c2 = Number(p.corte2Grade ?? p.c2 ?? 0);
          const c3 = Number(p.corte3Grade ?? p.c3 ?? 0);
          const avg = Number(((c1 * 0.3) + (c2 * 0.3) + (c3 * 0.4)).toFixed(2));

          rows.push({
            studentUid: uid,
            studentName,
            email,
            corte1Grade: c1,
            corte2Grade: c2,
            corte3Grade: c3,
            finalAverage: avg,
            status: avg >= 3.0 ? "Aprobado" : avg > 0 ? "En Riesgo" : "Pendiente"
          });
        });

        setGradeRows(rows);
      } catch (err) {
        console.warn("Error cargando notas de estudiantes:", err);
      } finally {
        setLoading(false);
      }
    };

    syncGrades();

    return () => {
      unsubAssignments();
    };
  }, []);

  const handleSaveStudentGrade = async (studentUid: string) => {
    try {
      const avg = Number(((editC1 * 0.3) + (editC2 * 0.3) + (editC3 * 0.4)).toFixed(2));
      const gradePayload = {
        corte1Grade: editC1,
        corte2Grade: editC2,
        corte3Grade: editC3,
        finalGrade: avg,
        updatedAt: new Date().toISOString()
      };

      await set(ref(rtdb, `progress/${studentUid}/${activeCourseSlug}`), gradePayload);

      setGradeRows((prev) =>
        prev.map((r) =>
          r.studentUid === studentUid
            ? {
                ...r,
                corte1Grade: editC1,
                corte2Grade: editC2,
                corte3Grade: editC3,
                finalAverage: avg,
                status: avg >= 3.0 ? "Aprobado" : "En Riesgo"
              }
            : r
        )
      );

      setEditingStudentUid(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Error al actualizar la calificación del estudiante.");
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDueDate) return;

    const id = `asg-${Date.now()}`;
    const newAssignment: AssignmentItem = {
      id,
      courseSlug: activeCourseSlug,
      courseTitle: "Datagan 360: Certificación Maestra",
      moduleTitle: "Evaluación Sumativa",
      cutId: newCutId,
      weightInCutPercent: Number(newWeight),
      title: newTitle,
      instructions: newInstructions || "Instrucciones detalladas de la tarea...",
      dueDateUtc: new Date(newDueDate).toISOString(),
      allowedExtensions: [".pdf", ".docx", ".xlsx"],
      maxFileSizeMb: 25,
      status: "pending",
      rubric: [
        {
          id: `crit-1`,
          title: "Calidad Técnica y Rigor de Datos",
          description: "Precisión en los cálculos de pesaje y trazabilidad ganadera.",
          weightPercent: 60,
          maxPoints: 5.0,
          levels: [
            { id: "l1", label: "Excelente (5.0)", points: 5.0, description: "Cálculos exactos sin margen de error." },
            { id: "l2", label: "Aceptable (3.5)", points: 3.5, description: "Cálculos adecuados con leves discrepancias." },
            { id: "l3", label: "Deficiente (2.0)", points: 2.0, description: "Errores estructurales en el pesaje." }
          ]
        },
        {
          id: `crit-2`,
          title: "Análisis y Toma de Decisiones",
          description: "Justificación zootécnica de las recomendaciones para el lote.",
          weightPercent: 40,
          maxPoints: 5.0,
          levels: [
            { id: "l1", label: "Excelente (5.0)", points: 5.0, description: "Análisis estratégico profundo." },
            { id: "l2", label: "Aceptable (3.5)", points: 3.5, description: "Análisis básico con justificación elemental." },
            { id: "l3", label: "Deficiente (2.0)", points: 2.0, description: "Sin justificación técnica." }
          ]
        }
      ]
    };

    const nextAssignments = [...assignments, newAssignment];
    await set(ref(rtdb, "lms_assignments"), nextAssignments);

    // Sincronizar simultáneamente con el calendario de estudiantes (lms_calendar)
    const calendarEvent = {
      id: `evt-${Date.now()}`,
      title: `Entrega: ${newAssignment.title}`,
      description: `Fecha límite de entrega para la tarea de ${newAssignment.courseTitle}.`,
      category: "assignment_due",
      courseSlug: activeCourseSlug,
      courseTitle: "Datagan 360",
      startUtc: newAssignment.dueDateUtc,
      endUtc: newAssignment.dueDateUtc,
      locationOrUrl: `/assignments?id=${newAssignment.id}`,
      linkedAssignmentId: newAssignment.id,
      createdByRole: "instructor",
      syncedProviders: ["google_calendar", "outlook", "apple_calendar"]
    };

    const calSnap = await get(ref(rtdb, "lms_calendar"));
    const currentCal = calSnap.exists()
      ? Array.isArray(calSnap.val())
        ? calSnap.val()
        : Object.values(calSnap.val())
      : [];
    await set(ref(rtdb, "lms_calendar"), [...currentCal, calendarEvent]);

    setShowNewAssignmentModal(false);
    setNewTitle("");
    setNewInstructions("");
    setNewDueDate("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportCsv = () => {
    const headers = [
      "Estudiante",
      "Correo",
      "Corte 1 (30%)",
      "Corte 2 (30%)",
      "Corte 3 (40%)",
      "Promedio",
      "Estado",
    ];
    const rows = gradeRows.map((r) => [
      r.studentName,
      r.email,
      r.corte1Grade,
      r.corte2Grade,
      r.corte3Grade,
      r.finalAverage,
      r.status,
    ]);
    exportToCsv("Libro_de_Calificaciones_IPT_Course", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Rúbricas & Matriz de Calificaciones</h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Sincronizado con Alumnos
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Administra las tareas oficiales en lms_assignments y califica directamente el padrón de estudiantes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === "matrix" ? "assignments" : "matrix")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <span>{activeTab === "matrix" ? "Ver Tareas & Rúbricas" : "Ver Matriz de Notas"}</span>
          </button>

          {activeTab === "matrix" ? (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          ) : (
            <button
              onClick={() => setShowNewAssignmentModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-violet-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Tarea Oficial</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>¡Datos sincronizados exitosamente con ipt-course-students!</span>
        </div>
      )}

      {/* Vista de Matriz de Calificaciones */}
      {activeTab === "matrix" ? (
        <div className="bg-[#121217] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Libro Mayor de Calificaciones (Escala 0.0 - 5.0)
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Corte 1 (30%) · Corte 2 (30%) · Corte 3 (40%)
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {gradeRows.length} alumnos registrados
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500">Cargando notas de estudiantes...</div>
          ) : gradeRows.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              No hay estudiantes inscritos aún en la base de datos de ipt-course-students.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181820] text-zinc-400 font-semibold uppercase text-[10px] border-b border-white/10">
                    <th className="px-5 py-3">Estudiante</th>
                    <th className="px-5 py-3 text-center">Corte 1 (30%)</th>
                    <th className="px-5 py-3 text-center">Corte 2 (30%)</th>
                    <th className="px-5 py-3 text-center">Corte 3 (40%)</th>
                    <th className="px-5 py-3 text-center">Nota Final</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {gradeRows.map((row) => {
                    const isEditing = editingStudentUid === row.studentUid;
                    return (
                      <tr key={row.studentUid} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{row.studentName}</div>
                          <div className="text-[11px] text-zinc-500">{row.email}</div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC1}
                              onChange={(e) => setEditC1(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-2 py-1 text-center text-white"
                            />
                          ) : (
                            <span className="font-mono text-zinc-200">{row.corte1Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC2}
                              onChange={(e) => setEditC2(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-2 py-1 text-center text-white"
                            />
                          ) : (
                            <span className="font-mono text-zinc-200">{row.corte2Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC3}
                              onChange={(e) => setEditC3(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-2 py-1 text-center text-white"
                            />
                          ) : (
                            <span className="font-mono text-zinc-200">{row.corte3Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center font-mono font-bold text-white">
                          {row.finalAverage.toFixed(2)}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              row.status === "Aprobado"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : row.status === "En Riesgo"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-white/5 text-zinc-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveStudentGrade(row.studentUid)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingStudentUid(null)}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 rounded text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStudentUid(row.studentUid);
                                setEditC1(row.corte1Grade);
                                setEditC2(row.corte2Grade);
                                setEditC3(row.corte3Grade);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#181820] hover:bg-[#22222d] border border-white/10 rounded text-[11px] text-zinc-300 hover:text-white"
                            >
                              <Edit3 className="w-3 h-3 text-violet-400" />
                              <span>Calificar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Vista de Tareas y Rúbricas */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.length === 0 ? (
              <div className="col-span-2 bg-[#121217] rounded-2xl border border-white/10 p-12 text-center text-xs text-zinc-500">
                No hay tareas configuradas en lms_assignments. Haz clic en "Nueva Tarea Oficial" para crear la primera.
              </div>
            ) : (
              assignments.map((asg) => (
                <div key={asg.id} className="bg-[#121217] rounded-2xl border border-white/10 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                        {asg.cutId === "cut_1" ? "Corte 1" : asg.cutId === "cut_2" ? "Corte 2" : "Corte 3"} · Ponderación {asg.weightInCutPercent}%
                      </span>
                      <h4 className="text-sm font-bold text-white mt-2">{asg.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{asg.instructions}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Límite: {new Date(asg.dueDateUtc).toLocaleDateString("es-ES")}</span>
                    <span>{asg.rubric?.length || 0} criterios de rúbrica</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Tarea Oficial */}
      {showNewAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Publicar Nueva Tarea Oficial</h3>
            <p className="text-xs text-zinc-400">
              Se creará la tarea en <code className="text-violet-400">lms_assignments</code> y se agendará automáticamente en el calendario de los estudiantes.
            </p>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Título de la Tarea</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Análisis de Trazabilidad y Ganancia Diaria de Peso"
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Instrucciones</label>
                <textarea
                  rows={3}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Detalla los entregables, formato y criterios de evaluación..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Corte Académico</label>
                  <select
                    value={newCutId}
                    onChange={(e) => setNewCutId(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="cut_1">Corte 1 (30%)</option>
                    <option value="cut_2">Corte 2 (30%)</option>
                    <option value="cut_3">Corte 3 (40%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Peso en Corte (%)</label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewAssignmentModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                >
                  Publicar en Base de Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
