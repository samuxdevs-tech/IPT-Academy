"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  Save,
  X,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";

export interface StudentGroup {
  id: string;
  name: string;
  description: string;
  courseSlug: string;
  courseTitle: string;
  studentUids: string[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface StudentUser {
  uid: string;
  name: string;
  email: string;
  licenseHashes?: string[];
}

interface CourseOption {
  slug: string;
  title: string;
  licenseHash?: string;
}

export function StudentGroupsManager() {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal de creación / edición de grupo
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [groupDescription, setGroupDescription] = useState<string>("");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>("");
  const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  // Escuchar grupos, estudiantes y cursos desde Firebase RTDB
  useEffect(() => {
    const groupsRef = ref(rtdb, "student_groups");
    const usersRef = ref(rtdb, "users");
    const coursesRef = ref(rtdb, "courses");

    const unsubGroups = onValue(groupsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: StudentGroup[] = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.keys(val).map((k) => ({
              ...val[k],
              id: val[k].id || k,
              studentUids: Array.isArray(val[k].studentUids) ? val[k].studentUids : [],
            }));
        setGroups(list);
      } else {
        setGroups([]);
      }
      setLoading(false);
    });

    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: StudentUser[] = Object.keys(val)
          .map((k) => {
            const u = val[k] || {};
            const profile = u.profile || {};
            const consent = u.legalConsent || {};
            const email =
              profile.email || u.email || consent.email || "";
            const name =
              profile.displayName ||
              u.displayName ||
              u.name ||
              consent.displayName ||
              (email ? email.split("@")[0] : "") ||
              `Estudiante (${k.slice(0, 6)})`;
            const rawLicenses = u.licenses || {};
            const licenseHashes = Array.isArray(rawLicenses)
              ? rawLicenses
              : typeof rawLicenses === "object"
              ? Object.keys(rawLicenses)
              : [];

            return {
              uid: k,
              name,
              email: email || "Sin correo",
              licenseHashes,
            };
          })
          .filter(
            (s) =>
              !s.email.toLowerCase().includes("administrator@ivanperez.tech") &&
              !s.email.toLowerCase().includes("docente@")
          );
        setStudents(list);
      } else {
        setStudents([]);
      }
    });

    const unsubCourses = onValue(coursesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: CourseOption[] = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val)).map(
          (c: any) => ({
            slug: c.slug || "curso",
            title: c.title || "Curso IPT",
            licenseHash: c.licenseHash,
          })
        );
        setCourses(list);
        if (list.length > 0 && !selectedCourseSlug) {
          setSelectedCourseSlug(list[0].slug);
        }
      } else {
        setCourses([
          {
            slug: "ipt-master-fullstack",
            title: "IPT Master: Arquitectura de Software e IA",
            licenseHash: "LIC-IPT-IPT Academy-360",
          },
        ]);
        setSelectedCourseSlug("ipt-master-fullstack");
      }
    });

    return () => {
      unsubGroups();
      unsubUsers();
      unsubCourses();
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingGroupId(null);
    setGroupName("");
    setGroupDescription("");
    setSelectedCourseSlug(courses[0]?.slug || "ipt-master-fullstack");
    setSelectedStudentUids([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: StudentGroup) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setSelectedCourseSlug(group.courseSlug);
    setSelectedStudentUids(group.studentUids || []);
    setIsModalOpen(true);
  };

  const handleToggleStudent = (uid: string) => {
    setSelectedStudentUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentUids.length === students.length) {
      setSelectedStudentUids([]);
    } else {
      setSelectedStudentUids(students.map((s) => s.uid));
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      alert("Por favor ingresa un nombre para el grupo o lote.");
      return;
    }

    setSaving(true);
    try {
      const groupId = editingGroupId || `grp-${Date.now()}`;
      const matchedCourse = courses.find((c) => c.slug === selectedCourseSlug);

      const groupPayload: StudentGroup = {
        id: groupId,
        name: groupName.trim(),
        description: groupDescription.trim(),
        courseSlug: selectedCourseSlug,
        courseTitle: matchedCourse?.title || "Curso IPT",
        studentUids: selectedStudentUids,
        createdAtUtc: editingGroupId
          ? groups.find((g) => g.id === editingGroupId)?.createdAtUtc || new Date().toISOString()
          : new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };

      await set(ref(rtdb, `student_groups/${groupId}`), groupPayload);

      for (const student of students) {
        const isMember = selectedStudentUids.includes(student.uid);
        if (isMember) {
          await set(ref(rtdb, `users/${student.uid}/groups/${groupId}`), true);
        } else if (editingGroupId) {
          await remove(ref(rtdb, `users/${student.uid}/groups/${groupId}`)).catch(() => {});
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error guardando grupo:", err);
      alert("Hubo un error al guardar el grupo en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el grupo "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await remove(ref(rtdb, `student_groups/${groupId}`));
        for (const s of students) {
          await remove(ref(rtdb, `users/${s.uid}/groups/${groupId}`)).catch(() => {});
        }
      } catch (err) {
        console.error("Error eliminando grupo:", err);
        alert("No se pudo eliminar el grupo.");
      }
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Grupos & Lotes de Estudiantes
              </h3>
              <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                Segmentación Dinámica
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Organiza a los alumnos de IPT Academy por grupos para asignar tareas diferenciadas, clases y tutorías.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-violet-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Grupo / Lote</span>
        </button>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex items-center justify-between gap-4 bg-[#121217] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar grupo por nombre o curso..."
            className="w-full bg-[#181820] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="text-xs font-mono text-zinc-400">
          <span>{groups.length} grupos registrados</span>
          <span className="mx-2">•</span>
          <span>{students.length} estudiantes en RTDB</span>
        </div>
      </div>

      {/* Lista de Grupos */}
      {loading ? (
        <div className="p-16 text-center text-zinc-500 text-xs bg-[#121217] rounded-2xl border border-white/10">
          Cargando grupos desde la base de datos...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-16 text-center text-zinc-400 text-xs bg-[#121217] rounded-2xl border border-dashed border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/20">
            <Users className="w-6 h-6" />
          </div>
          <p className="font-bold text-white text-sm">No hay grupos creados todavía</p>
          <p className="max-w-md mx-auto text-zinc-400 text-xs">
            Crea tu primer grupo para segmentar estudiantes de IPT Academy y asignarles tareas personalizadas de forma grupal.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Grupo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const memberCount = (group.studentUids || []).length;
            return (
              <div
                key={group.id}
                className="bg-[#121217] border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 block truncate">
                        {group.courseTitle}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight mt-0.5 truncate">
                        {group.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(group)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Editar integrantes"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2">{group.description}</p>
                  )}

                  <div className="p-3 rounded-xl bg-[#181820] border border-white/5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Estudiantes asignados:</span>
                    <span className="font-bold text-white font-mono bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/30">
                      {memberCount} alumnos
                    </span>
                  </div>

                  {/* Vista previa de estudiantes del grupo */}
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {memberCount === 0 ? (
                      <p className="text-[11px] text-zinc-500 italic">Sin integrantes aún.</p>
                    ) : (
                      (group.studentUids || []).slice(0, 4).map((uid) => {
                        const stu = students.find((s) => s.uid === uid);
                        return (
                          <div
                            key={uid}
                            className="text-[11px] text-zinc-300 flex items-center gap-1.5 truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{stu ? `${stu.name} (${stu.email})` : uid}</span>
                          </div>
                        );
                      })
                    )}
                    {memberCount > 4 && (
                      <span className="text-[10px] text-zinc-500 font-mono block pt-1">
                        + {memberCount - 4} estudiantes más en el grupo
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>ID: {group.id.slice(0, 12)}</span>
                  <span>Actualizado: {new Date(group.updatedAtUtc).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición de Grupo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {editingGroupId ? "Editar Grupo de Estudiantes" : "Nuevo Grupo de Estudiantes"}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Segmenta a tus alumnos de IPT Academy para asignar tareas y evaluar por grupo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Grupo Ingeniería Fullstack 2026-A"
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Curso Asociado *
                </label>
                <select
                  value={selectedCourseSlug}
                  onChange={(e) => setSelectedCourseSlug(e.target.value)}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {courses.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Descripción pedagógica / Propósito
                </label>
                <textarea
                  rows={2}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Ej. Estudiantes matriculados con sesiones los sábados..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Selector de Estudiantes Integrantes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Estudiantes Integrantes ({selectedStudentUids.length} seleccionados)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-medium"
                  >
                    {selectedStudentUids.length === students.length
                      ? "Deseleccionar todos"
                      : "Seleccionar todos"}
                  </button>
                </div>

                <div className="bg-[#181820] border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                  {students.length === 0 ? (
                    <div className="text-center py-4 text-zinc-500 text-xs">
                      No hay estudiantes registrados en la plataforma.
                    </div>
                  ) : (
                    students.map((stu) => {
                      const isChecked = selectedStudentUids.includes(stu.uid);
                      return (
                        <div
                          key={stu.uid}
                          onClick={() => handleToggleStudent(stu.uid)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? "bg-violet-600/15 border-violet-500/50"
                              : "bg-[#14141c] border-white/5 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-0 cursor-pointer"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{stu.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono truncate">{stu.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {stu.licenseHashes && stu.licenseHashes.length > 0
                              ? `${stu.licenseHashes.length} licencias`
                              : "Inscrito"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Guardando..." : "Guardar Grupo"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
