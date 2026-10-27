"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Download,
  Plus,
  CheckCircle2,
  Inbox,
  Edit3,
  Users,
  User,
  Key,
  BookOpen,
  Layers,
} from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb } from "@/lib/firebase";
import { ref, get, set, update, onValue } from "firebase/database";

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
  assignmentTarget?: "course" | "individual" | "batch";
  targetLicenseHash?: string;
  targetStudentUid?: string;
  targetStudentName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
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

interface StudentGroupOption {
  id: string;
  name: string;
  courseSlug: string;
  studentUids?: string[];
}

interface CourseEntry {
  slug: string;
  title: string;
  licenseHash: string;
  modules: { id: string; title: string }[];
}

export function RubricGradeMatrix() {
  const [activeTab, setActiveTab] = useState<"matrix" | "assignments">("matrix");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [activeCourseSlug, setActiveCourseSlug] = useState<string>("ipt-master-fullstack");
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [editingStudentUid, setEditingStudentUid] = useState<string | null>(null);
  const [editC1, setEditC1] = useState<number>(0);
  const [editC2, setEditC2] = useState<number>(0);
  const [editC3, setEditC3] = useState<number>(0);

  // Grupos
  const [studentGroups, setStudentGroups] = useState<StudentGroupOption[]>([]);

  // Modal para crear nueva tarea con rúbrica
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newInstructions, setNewInstructions] = useState<string>("");
  const [newModuleTitle, setNewModuleTitle] = useState<string>("Evaluación Sumativa");
  const [newCutId, setNewCutId] = useState<string>("cut_1");
  const [newWeight, setNewWeight] = useState<number>(20);
  const [newDueDate, setNewDueDate] = useState<string>("");

  // Segmentación / Targeting de la tarea
  const [assignmentTarget, setAssignmentTarget] = useState<"course" | "individual" | "batch">("course");
  const [selectedTargetUid, setSelectedTargetUid] = useState<string>("");
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string>("");

  const activeCourseObj =
    courses.find((c) => c.slug === activeCourseSlug) ||
    courses[0] || {
      slug: "ipt-master-fullstack",
      title: "IPT Master: Arquitectura de Software e IA",
      licenseHash: "LIC-IPT-IPT Course-360-A8F2-99BC",
      modules: [],
    };

  useEffect(() => {
    // 1. Escuchar cursos y sus módulos reales en RTDB
    const coursesRef = ref(rtdb, "courses");
    const unsubCourses = onValue(coursesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const rawList = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
        const parsedCourses: CourseEntry[] = rawList.map((c: any) => {
          const rawMods = Array.isArray(c?.modules)
            ? c.modules.filter(Boolean)
            : c?.modules && typeof c.modules === "object"
            ? Object.values(c.modules)
            : [];
          return {
            slug: c.slug || "ipt-master-fullstack",
            title: c.title || c.slug || "Curso IPT",
            licenseHash: c.licenseHash || `LIC-IPT-${c.slug || "COURSE"}`,
            modules: rawMods.map((m: any, idx: number) => ({
              id: m?.id || `mod-${idx + 1}`,
              title: m?.title || `Módulo ${idx + 1}`,
            })),
          };
        });
        if (parsedCourses.length > 0) {
          setCourses(parsedCourses);
          if (!parsedCourses.some((c) => c.slug === activeCourseSlug)) {
            setActiveCourseSlug(parsedCourses[0].slug);
          }
          if (parsedCourses[0].modules.length > 0) {
            setNewModuleTitle(parsedCourses[0].modules[0].title);
          }
        }
      }
    });

    // 2. Escuchar tareas reales en lms_assignments
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

    // 3. Escuchar grupos de estudiantes en student_groups
    const groupsRef = ref(rtdb, "student_groups");
    const unsubGroups = onValue(groupsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: StudentGroupOption[] = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.keys(val).map((k) => ({ ...val[k], id: val[k].id || k }));
        setStudentGroups(list);
        if (list.length > 0 && !selectedTargetGroupId) {
          setSelectedTargetGroupId(list[0].id);
        }
      } else {
        setStudentGroups([]);
      }
    });

    return () => {
      unsubCourses();
      unsubAssignments();
      unsubGroups();
    };
  }, []);

  // 4. Escuchar en vivo estudiantes reales en users y notas en progress para el curso seleccionado
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const progressRef = ref(rtdb, "progress");

    let usersVal: Record<string, any> = {};
    let progressVal: Record<string, any> = {};

    const recomputeGrades = () => {
      const rows: StudentGradeRow[] = [];

      Object.keys(usersVal).forEach((uid) => {
        const u = usersVal[uid] || {};
        const profile = u.profile || {};
        const consent = u.legalConsent || {};
        const email = profile.email || u.email || consent.email || "";
        if (
          email.toLowerCase().includes("administrator@ivanperez.tech") ||
          email.toLowerCase().includes("docente@")
        ) {
          return;
        }

        const p = progressVal[uid]?.[activeCourseSlug] || progressVal[uid] || {};
        const studentName =
          profile.displayName ||
          u.displayName ||
          u.name ||
          consent.displayName ||
          (email ? email.split("@")[0] : "") ||
          `Estudiante (${uid.substring(0, 6)})`;

        const c1 = Number(p.corte1Grade ?? p.c1 ?? 0);
        const c2 = Number(p.corte2Grade ?? p.c2 ?? 0);
        const c3 = Number(p.corte3Grade ?? p.c3 ?? 0);
        const avg = Number((c1 * 0.3 + c2 * 0.3 + c3 * 0.4).toFixed(2));

        rows.push({
          studentUid: uid,
          studentName,
          email: email || "Sin correo",
          corte1Grade: c1,
          corte2Grade: c2,
          corte3Grade: c3,
          finalAverage: avg,
          status: avg >= 3.0 ? "Aprobado" : avg > 0 ? "En Riesgo" : "Pendiente",
        });
      });

      setGradeRows(rows);
      if (rows.length > 0 && !selectedTargetUid) {
        setSelectedTargetUid(rows[0].studentUid);
      }
      setLoading(false);
    };

    const unsubU = onValue(usersRef, (snap) => {
      usersVal = snap.exists() ? snap.val() : {};
      recomputeGrades();
    });
    const unsubP = onValue(progressRef, (snap) => {
      progressVal = snap.exists() ? snap.val() : {};
      recomputeGrades();
    });

    return () => {
      unsubU();
      unsubP();
    };
  }, [activeCourseSlug]);

  const handleStartEdit = (row: StudentGradeRow) => {
    setEditingStudentUid(row.studentUid);
    setEditC1(row.corte1Grade);
    setEditC2(row.corte2Grade);
    setEditC3(row.corte3Grade);
  };

  const handleSaveInlineGrade = async (studentUid: string) => {
    try {
      const avg = Number((editC1 * 0.3 + editC2 * 0.3 + editC3 * 0.4).toFixed(2));
      const gradePayload = {
        corte1Grade: editC1,
        corte2Grade: editC2,
        corte3Grade: editC3,
        finalGrade: avg,
        updatedAt: new Date().toISOString(),
      };

      await update(ref(rtdb, `progress/${studentUid}/${activeCourseSlug}`), gradePayload);

      setEditingStudentUid(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert("Error al actualizar la calificación del estudiante.");
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDueDate) return;

    const id = `asg-${Date.now()}`;

    let targetLicenseHash: string | undefined = undefined;
    let targetStudentUid: string | undefined = undefined;
    let targetStudentName: string | undefined = undefined;
    let targetGroupId: string | undefined = undefined;
    let targetGroupName: string | undefined = undefined;

    if (assignmentTarget === "course") {
      targetLicenseHash = activeCourseObj.licenseHash;
    } else if (assignmentTarget === "individual") {
      targetStudentUid = selectedTargetUid;
      targetStudentName =
        gradeRows.find((r) => r.studentUid === selectedTargetUid)?.studentName || "Estudiante";
    } else if (assignmentTarget === "batch") {
      targetGroupId = selectedTargetGroupId;
      targetGroupName =
        studentGroups.find((g) => g.id === selectedTargetGroupId)?.name || "Grupo de Estudiantes";
    }

    const newAssignment: AssignmentItem = {
      id,
      courseSlug: activeCourseObj.slug,
      courseTitle: activeCourseObj.title,
      moduleTitle: newModuleTitle || "Evaluación Sumativa",
      cutId: newCutId,
      weightInCutPercent: Number(newWeight),
      title: newTitle,
      instructions: newInstructions || "Instrucciones detalladas de la entrega...",
      dueDateUtc: new Date(newDueDate).toISOString(),
      allowedExtensions: [".pdf", ".docx", ".xlsx", ".zip"],
      maxFileSizeMb: 25,
      status: "pending",
      assignmentTarget,
      targetLicenseHash,
      targetStudentUid,
      targetStudentName,
      targetGroupId,
      targetGroupName,
      rubric: [
        {
          id: "crit-1",
          title: "Calidad Técnica e Implementación",
          description: "Cumplimiento de requerimientos funcionales y buenas prácticas.",
          weightPercent: 60,
          maxPoints: 5.0,
          levels: [
            { id: "l1", label: "Excelente (5.0)", points: 5.0, description: "Solución completa y verificada." },
            { id: "l2", label: "Aceptable (3.5)", points: 3.5, description: "Cumple los requisitos principales." },
            { id: "l3", label: "Por mejorar (2.0)", points: 2.0, description: "Faltan componentes esenciales." },
          ],
        },
        {
          id: "crit-2",
          title: "Documentación y Sustentación",
          description: "Claridad en la explicación arquitectónica y conclusiones.",
          weightPercent: 40,
          maxPoints: 5.0,
          levels: [
            { id: "l1", label: "Excelente (5.0)", points: 5.0, description: "Análisis claro y bien estructurado." },
            { id: "l2", label: "Aceptable (3.5)", points: 3.5, description: "Documentación básica suficiente." },
            { id: "l3", label: "Por mejorar (2.0)", points: 2.0, description: "Sin justificación detallada." },
          ],
        },
      ],
    };

    const nextAssignments = [...assignments, newAssignment];
    await set(ref(rtdb, "lms_assignments"), nextAssignments);

    // Sincronizar con el calendario de estudiantes (lms_calendar)
    const calendarEvent = {
      id: `evt-${Date.now()}`,
      title: `Entrega: ${newAssignment.title}`,
      description: `Fecha límite de entrega (${newAssignment.moduleTitle}) para ${
        assignmentTarget === "individual"
          ? `el estudiante ${targetStudentName}`
          : assignmentTarget === "batch"
          ? `el grupo ${targetGroupName}`
          : activeCourseObj.title
      }.`,
      category: "assignment_due",
      courseSlug: activeCourseObj.slug,
      courseTitle: activeCourseObj.title,
      startUtc: newAssignment.dueDateUtc,
      endUtc: newAssignment.dueDateUtc,
      locationOrUrl: `/assignments?id=${newAssignment.id}`,
      linkedAssignmentId: newAssignment.id,
      createdByRole: "instructor",
      syncedProviders: ["google_calendar", "outlook", "apple_calendar"],
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
      "Curso",
      "Estudiante",
      "Correo",
      "Corte 1 (30%)",
      "Corte 2 (30%)",
      "Corte 3 (40%)",
      "Promedio",
      "Estado",
    ];
    const rows = gradeRows.map((r) => [
      activeCourseObj.slug,
      r.studentName,
      r.email,
      r.corte1Grade,
      r.corte2Grade,
      r.corte3Grade,
      r.finalAverage,
      r.status,
    ]);
    exportToCsv(`Calificaciones_${activeCourseObj.slug}`, headers, rows);
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
              <h3 className="text-sm font-bold text-white tracking-tight">
                Rúbricas & Libro de Calificaciones en Vivo
              </h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Conectado a /users y /courses
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Calificaciones ponderadas (30% / 30% / 40%) vinculadas a los cursos y módulos reales de ipt-course.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {courses.length > 0 && (
            <div className="flex items-center gap-2 bg-[#181820] border border-white/10 rounded-xl px-3 py-1.5">
              <BookOpen className="w-3.5 h-3.5 text-violet-400" />
              <select
                value={activeCourseSlug}
                onChange={(e) => setActiveCourseSlug(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug} className="bg-[#121217]">
                    {c.title} ({c.modules.length} mód.)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportCsv}
            disabled={gradeRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={() => setShowNewAssignmentModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-violet-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Tarea Oficial</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/10 text-xs">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-5 py-3 font-bold border-b-2 transition-all ${
            activeTab === "matrix"
              ? "border-violet-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Matriz de Notas de Alumnos ({gradeRows.length})
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`px-5 py-3 font-bold border-b-2 transition-all ${
            activeTab === "assignments"
              ? "border-violet-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Tareas Publicadas con Rúbrica ({assignments.length})
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Acción sincronizada con éxito en la base de datos de estudiantes!</span>
        </div>
      )}

      {/* Vista de Matriz */}
      {activeTab === "matrix" ? (
        <div className="bg-[#121217] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-16 text-center text-xs text-zinc-500">
              Cargando libro de calificaciones y progreso de estudiantes...
            </div>
          ) : gradeRows.length === 0 ? (
            <div className="p-16 text-center text-xs text-zinc-500 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-zinc-600" />
              <p>No hay estudiantes registrados en este momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#181820] text-zinc-400 font-mono border-b border-white/10 text-[11px]">
                    <th className="py-3 px-4">Estudiante</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4 text-center">Corte 1 (30%)</th>
                    <th className="py-3 px-4 text-center">Corte 2 (30%)</th>
                    <th className="py-3 px-4 text-center">Corte 3 (40%)</th>
                    <th className="py-3 px-4 text-center">Promedio Final</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {gradeRows.map((row) => {
                    const isEditing = editingStudentUid === row.studentUid;
                    return (
                      <tr key={row.studentUid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{row.studentName}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">{row.email}</td>

                        <td className="py-3 px-4 text-center font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC1}
                              onChange={(e) => setEditC1(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-1.5 py-0.5 text-center text-white"
                            />
                          ) : (
                            <span className="font-bold text-zinc-200">{row.corte1Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC2}
                              onChange={(e) => setEditC2(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-1.5 py-0.5 text-center text-white"
                            />
                          ) : (
                            <span className="font-bold text-zinc-200">{row.corte2Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editC3}
                              onChange={(e) => setEditC3(Number(e.target.value))}
                              className="w-16 bg-[#181820] border border-violet-500 rounded px-1.5 py-0.5 text-center text-white"
                            />
                          ) : (
                            <span className="font-bold text-zinc-200">{row.corte3Grade.toFixed(1)}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span
                            className={
                              row.finalAverage >= 3.0
                                ? "text-emerald-400"
                                : row.finalAverage > 0
                                ? "text-rose-400"
                                : "text-zinc-500"
                            }
                          >
                            {row.finalAverage.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === "Aprobado"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : row.status === "En Riesgo"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveInlineGrade(row.studentUid)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingStudentUid(null)}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(row)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1 ml-auto"
                            >
                              <Edit3 className="w-3 h-3" />
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
                <div key={asg.id} className="bg-[#121217] rounded-2xl border border-white/10 p-5 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                          {asg.cutId === "cut_1" ? "Corte 1" : asg.cutId === "cut_2" ? "Corte 2" : "Corte 3"} · Ponderación {asg.weightInCutPercent}%
                        </span>

                        {asg.moduleTitle && (
                          <span className="text-[10px] font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-violet-400" />
                            {asg.moduleTitle}
                          </span>
                        )}

                        {asg.assignmentTarget === "individual" ? (
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Persona: {asg.targetStudentName || asg.targetStudentUid}
                          </span>
                        ) : asg.assignmentTarget === "batch" ? (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Grupo: {asg.targetGroupName || asg.targetGroupId}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            Curso: {asg.courseSlug}
                          </span>
                        )}
                      </div>

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

      {/* Modal para Crear Nueva Tarea Oficial con Selección de Curso y Módulo */}
      {showNewAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-white">Publicar Nueva Tarea Oficial</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vincula la tarea a un curso y módulo real de la base de datos y elige su audiencia.
              </p>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Curso y Módulo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Curso de la Base de Datos
                  </label>
                  <select
                    value={activeCourseSlug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setActiveCourseSlug(slug);
                      const found = courses.find((c) => c.slug === slug);
                      if (found && found.modules.length > 0) {
                        setNewModuleTitle(found.modules[0].title);
                      }
                    }}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Módulo Asociado
                  </label>
                  {activeCourseObj.modules.length > 0 ? (
                    <select
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {activeCourseObj.modules.map((m) => (
                        <option key={m.id} value={m.title}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  )}
                </div>
              </div>

              {/* Selector de Alcance de Asignación */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-300 block">
                  ¿A quién se asigna esta tarea? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentTarget("course")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentTarget === "course"
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-sm"
                        : "bg-[#181820] border-white/5 text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    <span className="text-xs font-bold block">1. Curso Completo</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Por Hash de Licencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentTarget("individual")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentTarget === "individual"
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-sm"
                        : "bg-[#181820] border-white/5 text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    <span className="text-xs font-bold block">2. Persona Específica</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Nivelación / Extra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentTarget("batch")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentTarget === "batch"
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-sm"
                        : "bg-[#181820] border-white/5 text-zinc-400 hover:border-white/10"
                    }`}
                  >
                    <span className="text-xs font-bold block">3. Grupo / Lote</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Grupo Segmentado</span>
                  </button>
                </div>

                {assignmentTarget === "course" && (
                  <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs text-violet-300">
                    <p className="font-semibold">Regla de Licenciamiento:</p>
                    <p className="text-[11px] text-violet-200 mt-0.5">
                      Esta tarea aparecerá a los alumnos inscritos en{" "}
                      <code className="font-mono font-bold">{activeCourseObj.slug}</code> (Hash:{" "}
                      <code className="font-mono font-bold">{activeCourseObj.licenseHash}</code>).
                    </p>
                  </div>
                )}

                {assignmentTarget === "individual" && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#181820] border border-white/5">
                    <label className="text-[11px] font-semibold text-zinc-300 block">
                      Selecciona al Estudiante Destinatario:
                    </label>
                    <select
                      value={selectedTargetUid}
                      onChange={(e) => setSelectedTargetUid(e.target.value)}
                      className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      {gradeRows.map((r) => (
                        <option key={r.studentUid} value={r.studentUid}>
                          {r.studentName} ({r.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignmentTarget === "batch" && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#181820] border border-white/5">
                    <label className="text-[11px] font-semibold text-zinc-300 block">
                      Selecciona el Grupo o Lote Destino:
                    </label>
                    {studentGroups.length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        No hay grupos creados aún. Ve a la pestaña "Grupos & Lotes" para crear uno.
                      </p>
                    ) : (
                      <select
                        value={selectedTargetGroupId}
                        onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                        className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        {studentGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({(g.studentUids || []).length} alumnos)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Diseño de Arquitectura y Despliegue Fullstack"
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Instrucciones Pedagógicas</label>
                <textarea
                  rows={3}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Detalla los entregables esperados y los criterios de revisión..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
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
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Peso en el Corte (%)</label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    min="5"
                    max="100"
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Fecha Límite *</label>
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
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/30"
                >
                  Publicar Tarea & Sincronizar Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
