"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, Shield, Key, Search, Edit2, CheckCircle2, X, RefreshCw, Users } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, update } from "firebase/database";

interface RegisteredUser {
  uid: string;
  name: string;
  email: string;
  currentRole: "student" | "teacher" | "operator" | "admin" | "owner";
  activeLicenses: string[];
  registeredDate: string;
}

export function RegisteredAccountsView() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [updating, setUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cargar cuentas reales desde Firebase RTDB: users y roles
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const rolesRef = ref(rtdb, "roles");

    let unsubUsers: (() => void) | null = null;
    let unsubRoles: (() => void) | null = null;

    let usersData: Record<string, any> = {};
    let rolesData: Record<string, any> = {};

    const syncList = () => {
      const list: RegisteredUser[] = [];
      Object.entries(usersData).forEach(([uid, u]: [string, any]) => {
        const roleInRoles = rolesData[uid];
        const assignedRole = (
          typeof roleInRoles === "string"
            ? roleInRoles
            : roleInRoles?.role || u.role || u.profile?.role || "student"
        ).toLowerCase();

        let licenses: string[] = [];
        if (Array.isArray(u.licenses)) {
          licenses = u.licenses;
        } else if (u.licenses && typeof u.licenses === "object") {
          licenses = Object.keys(u.licenses);
        } else {
          licenses = ["datagan-360-certificacion-maestra"];
        }

        list.push({
          uid,
          name: u.displayName || u.profile?.displayName || u.name || "Usuario IPT",
          email: u.email || u.profile?.email || "usuario@ipt.com",
          currentRole: (["student", "teacher", "operator", "admin", "owner"].includes(assignedRole)
            ? assignedRole
            : "student") as any,
          activeLicenses: licenses,
          registeredDate: u.createdAt
            ? new Date(u.createdAt).toISOString().split("T")[0]
            : "2026-10-01"
        });
      });

      if (list.length === 0) {
        list.push({
          uid: "usr-samuxdevs",
          name: "Iván Samuel Pérez Torrenegra",
          email: "samuxdevs@gmail.com",
          currentRole: "owner",
          activeLicenses: ["datagan-360-certificacion-maestra", "ipt-software-ia"],
          registeredDate: "2026-09-01"
        });
      }

      setUsers(list);
      setLoading(false);
    };

    unsubUsers = onValue(usersRef, (snap) => {
      usersData = snap.val() || {};
      syncList();
    });

    unsubRoles = onValue(rolesRef, (snap) => {
      rolesData = snap.val() || {};
      syncList();
    });

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubRoles) unsubRoles();
    };
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEditModal = (user: RegisteredUser) => {
    setEditingUser(user);
    setSelectedRole(user.currentRole);
  };

  const handleSaveRoleChange = async () => {
    if (!editingUser) return;
    setUpdating(true);

    try {
      // 1. Guardar en /roles/{uid}
      const roleRef = ref(rtdb, `roles/${editingUser.uid}`);
      await set(roleRef, {
        role: selectedRole,
        updatedAt: new Date().toISOString(),
        updatedBy: "samuxdevs"
      });

      // 2. Guardar en /users/{uid}/role
      const userRef = ref(rtdb, `users/${editingUser.uid}`);
      await update(userRef, {
        role: selectedRole,
        updatedAt: new Date().toISOString()
      });

      setToastMessage(`Rol de ${editingUser.name} actualizado exitosamente a ${selectedRole.toUpperCase()}.`);
      setEditingUser(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert("Error al actualizar el rol en la base de datos.");
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-rose-500/10 text-rose-300 border border-rose-500/20";
      case "admin":
        return "bg-violet-500/10 text-violet-300 border border-violet-500/20";
      case "teacher":
        return "bg-blue-500/10 text-blue-300 border border-blue-500/20";
      case "operator":
        return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
      default:
        return "bg-[#181820] text-zinc-400 border border-white/5";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Directorio Maestro de Acceso
            </span>
            <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              Control de Licencias
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Cuentas Registradas y Gobernanza de Roles
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Inspección de credenciales, roles asignados y licencias vigentes. Permite reasignar roles de sistema en caliente con sincronización inmediata.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#181820] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
          />
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabla de Cuentas Dark Pro */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-500" />
            <p className="text-xs font-medium">Cargando cuentas registradas de RTDB...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No se encontraron cuentas</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              No hay usuarios que coincidan con los criterios de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#181820] text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                  <th className="px-6 py-3.5">Usuario & Identificador</th>
                  <th className="px-6 py-3.5">Rol de Sistema</th>
                  <th className="px-6 py-3.5">Licencias Activas</th>
                  <th className="px-6 py-3.5">Fecha de Registro</th>
                  <th className="px-6 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-[11px] text-zinc-400">{user.email}</div>
                      <span className="font-mono text-[9px] text-zinc-500 mt-0.5 inline-block">
                        {user.uid}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(
                          user.currentRole
                        )}`}
                      >
                        {user.currentRole}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.activeLicenses.map((lic) => (
                          <span
                            key={lic}
                            className="bg-[#181820] text-zinc-300 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono"
                          >
                            {lic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                      {user.registeredDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-violet-400" />
                        <span>Cambiar Rol</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Plegable para Cambiar Rol Dark Pro */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-white/10 bg-[#181820] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Reasignar Rol de Sistema</h3>
                <p className="text-[11px] text-zinc-400">{editingUser.name}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Selecciona el nuevo nivel de privilegios para esta cuenta. Al confirmar, los permisos se propagarán en tiempo real a Firebase Realtime Database.
              </p>

              <div className="space-y-2">
                {[
                  { id: "student", label: "Estudiante", desc: "Acceso estándar al aula virtual y tareas." },
                  { id: "teacher", label: "Docente / Instructor", desc: "Studio docente, rúbricas, videollamadas y calificaciones." },
                  { id: "operator", label: "Operador Académico", desc: "Gestión de cupos, soporte y directivas asistidas." },
                  { id: "admin", label: "Administrador", desc: "Monitoreo, control de litigios y gobernanza de roles." },
                  { id: "owner", label: "Propietario (IPT Master)", desc: "Privilegios irrestrictos del sistema y facturación." },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedRole === option.id
                        ? "border-violet-500 bg-violet-500/10 shadow-xs"
                        : "border-white/5 bg-[#181820] hover:bg-[#20202c]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleChoice"
                      value={option.id}
                      checked={selectedRole === option.id}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="mt-0.5 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{option.label}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-[#181820] border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoleChange}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Cambio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
