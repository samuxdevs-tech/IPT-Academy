"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Check, X, Filter, Info, Save, Trash2, RefreshCw } from "lucide-react";
import {
  EXTENSIVE_PERMISSIONS,
  CATEGORY_LABELS,
  INITIAL_ROLES,
  CustomRoleDefinition,
  PermissionItem
} from "@/lib/permissions";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";

export function SecurityRolesMatrix() {
  const [roles, setRoles] = useState<CustomRoleDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreatingRole, setIsCreatingRole] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>("");
  const [newRoleDesc, setNewRoleDesc] = useState<string>("");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Cargar roles desde Firebase RTDB
  useEffect(() => {
    const rolesRef = ref(rtdb, "security_roles");
    const unsubscribe = onValue(
      rolesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (Array.isArray(data)) {
            setRoles(data);
          } else if (typeof data === "object") {
            setRoles(Object.values(data));
          } else {
            setRoles(INITIAL_ROLES);
          }
        } else {
          setRoles(INITIAL_ROLES);
        }
        setLoading(false);
      },
      () => {
        setRoles(INITIAL_ROLES);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const togglePermissionForRole = (roleId: string, permId: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          const has = r.permissions.includes(permId);
          const updatedPerms = has
            ? r.permissions.filter((p) => p !== permId)
            : [...r.permissions, permId];
          return { ...r, permissions: updatedPerms };
        }
        return r;
      })
    );
  };

  const handleSaveRoles = async () => {
    try {
      const rolesRef = ref(rtdb, "security_roles");
      await set(rolesRef, roles);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Error al sincronizar roles en la base de datos.");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      alert("Por favor ingresa un nombre para el nuevo rol.");
      return;
    }

    const created: CustomRoleDefinition = {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || "Rol personalizado definido por administración.",
      badgeColor: "bg-violet-500/10 text-violet-300 border-violet-500/20",
      permissions: newRolePerms
    };

    const updated = [...roles, created];
    setRoles(updated);
    setNewRoleName("");
    setNewRoleDesc("");
    setNewRolePerms([]);
    setIsCreatingRole(false);

    const rolesRef = ref(rtdb, "security_roles");
    await set(rolesRef, updated);
  };

  const filteredPermissions =
    selectedCategory === "all"
      ? EXTENSIVE_PERMISSIONS
      : EXTENSIVE_PERMISSIONS.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Gobernanza de Seguridad
            </span>
            {savedSuccess && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Sincronizado en Firebase
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Seguridad y Matriz Oficial de Roles y Permisos
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Catálogo exhaustivo de {EXTENSIVE_PERMISSIONS.length} permisos funcionales específicos organizados por categoría y matriz oficial de verificación por rol.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveRoles}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios en RTDB</span>
          </button>

          <button
            onClick={() => setIsCreatingRole(!isCreatingRole)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Rol Personalizado</span>
          </button>
        </div>
      </div>

      {/* Formulario de Creación de Rol */}
      {isCreatingRole && (
        <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">
              Nuevo Perfil de Rol y Permisos
            </h3>
            <button
              onClick={() => setIsCreatingRole(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Nombre del Rol
              </label>
              <input
                type="text"
                placeholder="Ej: Supervisor Académico Regional"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full text-xs border border-white/10 rounded-xl p-2.5 bg-[#181820] text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Descripción Funcional
              </label>
              <input
                type="text"
                placeholder="Ej: Acceso de supervisión a rúbricas y analíticas"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="w-full text-xs border border-white/10 rounded-xl p-2.5 bg-[#181820] text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreateRole}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all active:scale-[0.97]"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Añadir a la Matriz</span>
            </button>
          </div>
        </div>
      )}

      {/* Selector de Categorías (Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
              : "bg-[#121217] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          Todos ({EXTENSIVE_PERMISSIONS.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
          const count = EXTENSIVE_PERMISSIONS.filter((p) => p.category === catKey).length;
          const isActive = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "bg-[#121217] text-zinc-400 hover:text-white border border-white/10"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Matriz Oficial Dark Pro */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-500" />
            <p className="text-xs font-medium">Cargando matriz de seguridad de RTDB...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#181820] border-b border-white/10">
                  <th className="px-6 py-4 font-bold text-white w-2/5">
                    Acción en IPT Academy ({filteredPermissions.length})
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-4 py-4 text-center font-bold text-white">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold">{role.name}</span>
                        <span className="text-[10px] text-zinc-400 font-normal max-w-[110px] truncate">
                          {role.description}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPermissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-white">{perm.name}</div>
                      <div className="text-[11px] text-zinc-400">{perm.description}</div>
                      <span className="font-mono text-[9px] text-zinc-500 mt-0.5 inline-block">
                        {perm.id}
                      </span>
                    </td>

                    {roles.map((role) => {
                      const hasPerm = role.permissions.includes(perm.id);
                      return (
                        <td key={`${role.id}-${perm.id}`} className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => togglePermissionForRole(role.id, perm.id)}
                            className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-all ${
                              hasPerm
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-[#181820] text-zinc-600 hover:text-zinc-400 border border-white/5"
                            }`}
                            title={hasPerm ? "Permiso concedido" : "Permiso no concedido"}
                          >
                            {hasPerm ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3 h-3 opacity-40" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
