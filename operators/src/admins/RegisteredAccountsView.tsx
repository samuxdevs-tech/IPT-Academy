"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Search,
  CheckCircle2,
  X,
  RefreshCw,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Mail,
  UserCheck,
  Database,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
} from "lucide-react";
import { rtdb, parseStudentRecordFromRtdb, ParsedIptStudent } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";

interface OperatorAccount {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "teacher";
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://ipt-course-api.vercel.app";

export function RegisteredAccountsView() {
  const [activeViewTab, setActiveViewTab] = useState<"students_rtdb" | "operators_rbac">("students_rtdb");

  // Estados de Estudiantes en Vivo desde Firebase RTDB
  const [rtdbStudents, setRtdbStudents] = useState<ParsedIptStudent[]>([]);
  const [rtdbCourses, setRtdbCourses] = useState<any[]>([]);
  const [rtdbLoading, setRtdbLoading] = useState<boolean>(true);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Estados de Operadores RBAC
  const [users, setUsers] = useState<OperatorAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados del modal de creación
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  // Estados del modal de cambio de contraseña
  const [passwordModalUser, setPasswordModalUser] = useState<OperatorAccount | null>(null);
  const [updatedPassword, setUpdatedPassword] = useState<string>("");
  const [showUpdatedPassword, setShowUpdatedPassword] = useState<boolean>(false);
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);

  // Escuchar en vivo los usuarios, progreso, suscripciones y cursos de ipt-course RTDB
  useEffect(() => {
    let rawUsers: Record<string, any> = {};
    let rawProg: Record<string, any> = {};
    let rawSubs: Record<string, any> = {};
    let rawCerts: Record<string, any> = {};
    let rawCourses: any[] = [];

    const recompute = () => {
      const parsed: ParsedIptStudent[] = Object.keys(rawUsers)
        .map((uid) =>
          parseStudentRecordFromRtdb(
            uid,
            rawUsers[uid],
            rawProg,
            rawSubs,
            rawCerts,
            rawCourses
          )
        )
        .filter((s) => s.email.toLowerCase() !== "administrator@ivanperez.tech");
      setRtdbStudents(parsed);
      setRtdbCourses(rawCourses);
      setRtdbLoading(false);
    };

    const unsubUsers = onValue(ref(rtdb, "users"), (snap) => {
      rawUsers = snap.exists() ? snap.val() : {};
      recompute();
    });
    const unsubProg = onValue(ref(rtdb, "progress"), (snap) => {
      rawProg = snap.exists() ? snap.val() : {};
      recompute();
    });
    const unsubSubs = onValue(ref(rtdb, "lms_subscriptions"), (snap) => {
      rawSubs = snap.exists() ? snap.val() : {};
      recompute();
    });
    const unsubCerts = onValue(ref(rtdb, "certificates"), (snap) => {
      rawCerts = snap.exists() ? snap.val() : {};
      recompute();
    });
    const unsubCourses = onValue(ref(rtdb, "courses"), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        rawCourses = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
      } else {
        rawCourses = [];
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

  // Obtener token activo de sesión
  const getAuthToken = () => {
    return typeof window !== "undefined" ? sessionStorage.getItem("ipt_auth_token") : null;
  };

  // Cargar usuarios operadores desde la API segura
  const fetchUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener la lista de operadores.");
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la API de administración.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Alternar licencia criptográfica de un curso en el perfil de un estudiante en RTDB
  // Cambiar estado de verificación de identidad nacional del estudiante
  const handleToggleIdentityVerification = async (
    stuUid: string,
    stuName: string,
    currentVerified: boolean,
    docType: string = 'CC',
    docNumber: string = '1004892310'
  ) => {
    const nextVerified = !currentVerified;
    const confirmMsg = nextVerified
      ? `¿Aprobar y verificar identidad nacional para ${stuName} (${docType}: ${docNumber})?`
      : `¿Revocar verificación de identidad de ${stuName}? Los certificados generados volverán a mostrar la marca de agua disuasoria.`;

    if (!confirm(confirmMsg)) return;

    try {
      await set(ref(rtdb, `users/${stuUid}/identityVerification`), {
        verified: nextVerified,
        status: nextVerified ? 'verified' : 'unverified',
        docType: docType || 'CC',
        docNumber: docNumber || 'Sin número',
        legalName: stuName,
        verifiedAtIso: nextVerified ? new Date().toISOString() : null,
        verificationMethod: 'ADMIN_MANUAL_REVIEW',
        verifiedBy: 'Rectoría / Administración IPT',
        updatedAtIso: new Date().toISOString(),
      });
      setToastMessage(
        nextVerified
          ? `Identidad de ${stuName} verificada exitosamente.`
          : `Verificación revocada para ${stuName}.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert('Error al actualizar verificación de identidad en Firebase.');
    }
  };

  const handleToggleStudentLicense = async (
    studentUid: string,
    studentName: string,
    licenseHash: string,
    currentlyHasIt: boolean
  ) => {
    try {
      if (currentlyHasIt) {
        await remove(ref(rtdb, `users/${studentUid}/licenses/${licenseHash}`));
        setToastMessage(`Licencia ${licenseHash} revocada para ${studentName}.`);
      } else {
        await set(ref(rtdb, `users/${studentUid}/licenses/${licenseHash}`), true);
        setToastMessage(`Licencia ${licenseHash} activada en vivo para ${studentName}.`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      setErrorMessage("No se pudo actualizar la licencia del estudiante en Firebase RTDB.");
    }
  };

  // Generar contraseña segura aleatoria de 14 caracteres
  const generateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Crear nuevo usuario operador
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;

    setCreating(true);
    setErrorMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          displayName: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: "teacher",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo crear la cuenta en el servidor.");
      }

      setToastMessage(`Cuenta para ${newName} creada exitosamente con credenciales cifradas.`);
      setShowCreateModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      fetchUsers();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo al crear la cuenta.");
    } finally {
      setCreating(false);
    }
  };

  // Actualizar contraseña de un usuario existente
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !updatedPassword) return;

    setUpdatingPassword(true);
    setErrorMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/admin/users/${passwordModalUser.uid}/password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: updatedPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar la contraseña.");
      }

      setToastMessage(`Contraseña actualizada con éxito para ${passwordModalUser.email}.`);
      setPasswordModalUser(null);
      setUpdatedPassword("");
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo al actualizar contraseña.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Eliminar usuario operador
  const handleDeleteUser = async (user: OperatorAccount) => {
    if (user.email === "administrator@ivanperez.tech") {
      alert("Acción protegida: No es posible eliminar al Administrador Principal.");
      return;
    }

    const confirmed = window.confirm(`¿Confirmas la revocación definitiva del acceso para ${user.email}?`);
    if (!confirmed) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/admin/users/${user.uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar el usuario.");
      }

      setToastMessage(`Usuario ${user.email} eliminado del servidor seguro.`);
      fetchUsers();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Fallo al eliminar el usuario.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRtdbStudents = rtdbStudents.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.uid.toLowerCase().includes(q) ||
      s.planId.toLowerCase().includes(q) ||
      s.licenseHashes.some((h) => h.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Selector Principal: estudiantes de IPT Academy (RTDB) vs Operadores Docentes (RBAC) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121217] border border-white/10 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveViewTab("students_rtdb")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === "students_rtdb"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Estudiantes & Licencias en IPT Academy ({rtdbStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab("operators_rbac")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === "operators_rbac"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Operadores & Docentes RBAC ({users.length})</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 px-2">
          Sincronizado con ipt-course-students-default-rtdb
        </span>
      </div>

      {/* Alertas */}
      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeViewTab === "students_rtdb" ? (
        <div className="space-y-5">
          {/* Header de Búsqueda de Estudiantes en RTDB */}
          <div className="bg-[#121217] rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Lectura Activa en Tiempo Real
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Nodo /users + /progress + /lms_subscriptions
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Directorio de Estudiantes Registrados & Hashes de Licencia
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Busca cualquier estudiante de ipt-course, consulta su avance por curso y módulo, y activa o revoca licencias de cursos con un clic.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar estudiante por nombre, email, UID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#181820] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tabla de Estudiantes en Vivo */}
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-lg overflow-hidden">
            {rtdbLoading ? (
              <div className="p-16 text-center text-zinc-400">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-emerald-400" />
                <p className="text-xs font-medium">Conectando con ipt-course-students-default-rtdb...</p>
              </div>
            ) : filteredRtdbStudents.length === 0 ? (
              <div className="p-16 text-center">
                <Users className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No se encontraron estudiantes</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Verifica el término de búsqueda en la base de datos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#181820] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/10">
                      <th className="px-6 py-3.5">Estudiante & UID</th>
                      <th className="px-6 py-3.5">Plan & Suscripción</th>
                      <th className="px-6 py-3.5">Avance en Cursos & Módulos</th>
                      <th className="px-6 py-3.5">Identidad Nacional & Cédula</th>
                      <th className="px-6 py-3.5">Licencias Criptográficas (/users/uid/licenses)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRtdbStudents.map((stu) => (
                      <tr key={stu.uid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">{stu.name}</div>
                          <div className="text-[11px] text-zinc-300 font-mono mt-0.5">{stu.email}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">UID: {stu.uid}</div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            {stu.planId} · {stu.subStatus}
                          </span>
                          <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                            Créditos en vivo: {stu.remainingLiveCredits} · Trial usado: {stu.hasUsedTrial ? "Sí" : "No"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">
                            {stu.completedLessonsCount} lecciones completadas ({stu.progressPercent}%)
                          </div>
                          <div className="space-y-1 mt-1">
                            {stu.coursesProgress.map((cp) => (
                              <div key={cp.courseSlug} className="text-[10px] text-zinc-400 font-mono">
                                <BookOpen className="w-3 h-3 inline mr-1 text-emerald-400" />
                                {cp.courseSlug}: {cp.completedCount} clases · Promedio {cp.finalAverage.toFixed(1)}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {stu.identityVerified ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Verificada</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                <span>Sin Verificar (Con marca de agua)</span>
                              </div>
                            )}

                            <div className="text-[11px] text-zinc-300 font-mono">
                              <span className="text-zinc-500">{stu.identityDocType || 'Doc'}:</span> {stu.identityDocNumber || 'No registrado'}
                            </div>

                            <button
                              onClick={() =>
                                handleToggleIdentityVerification(
                                  stu.uid,
                                  stu.name,
                                  stu.identityVerified,
                                  stu.identityDocType,
                                  stu.identityDocNumber
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                                stu.identityVerified
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>{stu.identityVerified ? 'Revocar Verificación' : 'Aprobar Cédula'}</span>
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {rtdbCourses.map((c: any) => {
                              const hash = c.licenseHash || `LIC-IPT-${c.slug}`;
                              const hasLicense = stu.licenseHashes.includes(hash);
                              return (
                                <button
                                  key={c.slug}
                                  onClick={() =>
                                    handleToggleStudentLicense(stu.uid, stu.name, hash, hasLicense)
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                    hasLicense
                                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300"
                                      : "bg-[#181820] text-zinc-400 border-white/10 hover:border-emerald-500/40 hover:text-white"
                                  }`}
                                  title={
                                    hasLicense
                                      ? "Clic para revocar licencia de este curso"
                                      : "Clic para otorgar licencia de este curso"
                                  }
                                >
                                  <Key className="w-3 h-3" />
                                  <span>{c.slug}</span>
                                  <span>({hasLicense ? "ACTIVA" : "ASIGNAR"})</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vista de Operadores & Docentes RBAC */
        <div className="space-y-6">
          <div className="bg-[#121217] rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                  Control Criptográfico RBAC
                </span>
                <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-mono">
                  JWT HS256 + Bcrypt
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Gobernanza de Operadores y Docentes
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Gestión directa de credenciales para docentes y operadores autorizados en ipt-course-admin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar operador o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#181820] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              <button
                onClick={() => {
                  setNewName("");
                  setNewEmail("");
                  setNewPassword(generateSecurePassword());
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-[0.98] shadow-md shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Crear Operador</span>
              </button>
            </div>
          </div>

          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-zinc-400">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-zinc-400" />
                <p className="text-xs font-medium">Consultando directorio seguro de operadores...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No se encontraron cuentas de operador</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#181820] text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/10">
                      <th className="px-6 py-3.5">Operador</th>
                      <th className="px-6 py-3.5">Rol Criptográfico</th>
                      <th className="px-6 py-3.5">Fecha de Alta</th>
                      <th className="px-6 py-3.5 text-right">Acciones de Seguridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => {
                      const isMasterAdmin = user.email === "administrator@ivanperez.tech";
                      return (
                        <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{user.displayName}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{user.email}</div>
                            <span className="font-mono text-[9px] text-zinc-600 mt-0.5 inline-block">
                              {user.uid}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                user.role === "admin"
                                  ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.role === "admin" ? "bg-rose-400" : "bg-emerald-400"
                                }`}
                              />
                              {user.role === "admin" ? "Administrador" : "Docente"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                            {new Date(user.createdAt).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setPasswordModalUser(user);
                                  setUpdatedPassword(generateSecurePassword());
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-medium transition-all"
                                title="Cambiar contraseña"
                              >
                                <Key className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Contraseña</span>
                              </button>

                              {!isMasterAdmin && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 bg-[#181820] hover:bg-rose-500/20 border border-white/10 text-zinc-400 hover:text-rose-300 rounded-xl transition-all"
                                  title="Revocar acceso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Crear Nuevo Operador */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-white/10 bg-[#16161c] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Alta de Nuevo Operador</h3>
                <p className="text-[11px] text-zinc-400">Generación de credenciales con cifrado Bcrypt</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 block">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Prof. Carlos Mendoza"
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 block">
                  Correo institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="docente@ipt.com"
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-zinc-400">
                    Contraseña segura
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateSecurePassword())}
                    className="text-[10px] text-zinc-400 hover:text-white underline"
                  >
                    Generar aleatoria
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-semibold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Cifrando en Servidor...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-black" />
                      <span>Crear Cuenta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Actualizar Contraseña */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-white/10 bg-[#16161c] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Actualizar Contraseña</h3>
                <p className="text-[11px] text-zinc-400">{passwordModalUser.email}</p>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-zinc-400">
                    Nueva contraseña segura
                  </label>
                  <button
                    type="button"
                    onClick={() => setUpdatedPassword(generateSecurePassword())}
                    className="text-[10px] text-zinc-400 hover:text-white underline"
                  >
                    Generar aleatoria
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showUpdatedPassword ? "text" : "password"}
                    value={updatedPassword}
                    onChange={(e) => setUpdatedPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUpdatedPassword(!showUpdatedPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showUpdatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-semibold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {updatingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-black" />
                      <span>Guardar Nueva Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
