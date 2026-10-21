'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  useAuth,
  DEFAULT_OWNER_UIDS,
  encodeEmailKey,
} from '@/context/AuthContext';
import {
  UserRole,
  ROLE_DEFINITIONS,
  RBAC_MATRIX_TABLE,
  normalizeUserRole,
} from '@/lib/rbac';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Sparkles,
  BookOpen,
  UserPlus,
  Trash2,
  Home,
} from 'lucide-react';
import Link from 'next/link';

interface ManagedUserItem {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  licenses: Record<string, string>;
  legalAccepted: boolean;
}

interface PreassignedEmailItem {
  emailKey: string;
  email: string;
  role: UserRole;
  updatedAt: number;
}

interface CourseSummaryItem {
  slug: string;
  title: string;
}

export default function AdminRolesPage() {
  const { user, userRole } = useAuth();
  const [rawUsers, setRawUsers] = useState<Record<string, any>>({});
  const [rawRoles, setRawRoles] = useState<Record<string, string>>({});
  const [rawAdmins, setRawAdmins] = useState<Record<string, boolean>>({});
  const [preassignedList, setPreassignedList] = useState<PreassignedEmailItem[]>([]);
  const [coursesList, setCoursesList] = useState<CourseSummaryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulario para asignar rol directo por UID o por Correo
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('owner');
  const [assigningDirect, setAssigningDirect] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const rolesRef = ref(db, 'roles');
    const adminsRef = ref(db, 'admins');
    const preassignedRef = ref(db, 'preassigned_roles');
    const coursesRef = ref(db, 'courses');

    const unsubUsers = onValue(usersRef, (snap) => {
      setRawUsers(snap.exists() ? snap.val() || {} : {});
    });

    const unsubRoles = onValue(rolesRef, (snap) => {
      setRawRoles(snap.exists() ? snap.val() || {} : {});
    });

    const unsubAdmins = onValue(adminsRef, (snap) => {
      setRawAdmins(snap.exists() ? snap.val() || {} : {});
    });

    const unsubPreassigned = onValue(preassignedRef, (snap) => {
      if (!snap.exists()) {
        setPreassignedList([]);
        return;
      }
      const data = snap.val();
      const items: PreassignedEmailItem[] = Object.keys(data).map((k) => ({
        emailKey: k,
        email: data[k]?.email || k,
        role: normalizeUserRole(data[k]?.role || data[k]),
        updatedAt: data[k]?.updatedAt || 0,
      }));
      setPreassignedList(items.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    const unsubCourses = onValue(coursesRef, (snap) => {
      if (!snap.exists()) {
        setCoursesList([]);
        return;
      }
      const data = snap.val();
      const list: CourseSummaryItem[] = Object.keys(data).map((slug) => ({
        slug,
        title: data[slug]?.title || slug,
      }));
      setCoursesList(list);
    });

    return () => {
      unsubUsers();
      unsubRoles();
      unsubAdmins();
      unsubPreassigned();
      unsubCourses();
    };
  }, []);

  // ÚNICA FUENTE DE VERDAD PARA ROLES DE TODAS LAS CUENTAS (Cero doble validación)
  const usersList: ManagedUserItem[] = React.useMemo(() => {
    const allUids = Array.from(
      new Set([
        ...DEFAULT_OWNER_UIDS,
        ...Object.keys(rawUsers),
        ...Object.keys(rawRoles),
        ...Object.keys(rawAdmins),
      ])
    );

    const parsed: ManagedUserItem[] = allUids.map((uid) => {
      const node = rawUsers[uid] || {};
      const prof = node.profile || {};
      const info = node.info || {};
      const legal = node.legal || {};
      // El Owner inmutable solo aplica a los UIDs maestros oficiales predefinidos
      const isMaster = DEFAULT_OWNER_UIDS.includes(uid);
      const isCurrent = user?.uid === uid;

      const resolvedEmail =
        prof.email ||
        legal.email ||
        info.email ||
        (isCurrent ? user?.email || '' : '');

      const fullName =
        (prof.firstName && prof.lastName
          ? `${prof.firstName} ${prof.lastName}`
          : '') ||
        prof.displayName ||
        legal.displayName ||
        info.username ||
        (isCurrent ? user?.displayName || '' : '') ||
        (resolvedEmail ? resolvedEmail.split('@')[0] : '') ||
        'Usuario Registrado';

      // Priorizar el rol real explícito de RTDB (/roles/$uid)
      const explicitRole = rawRoles[uid] || prof.role;
      const resolvedRole: UserRole = isMaster
        ? 'owner'
        : explicitRole
        ? normalizeUserRole(explicitRole)
        : rawAdmins[uid] === true
        ? 'owner'
        : 'student';

      return {
        uid,
        fullName,
        email: resolvedEmail,
        role: resolvedRole,
        licenses: node.licenses || {},
        legalAccepted: Boolean(legal.accepted),
      };
    });

    return parsed.sort((a, b) => {
      const levelDiff =
        ROLE_DEFINITIONS[b.role].level - ROLE_DEFINITIONS[a.role].level;
      if (levelDiff !== 0) return levelDiff;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [rawUsers, rawRoles, rawAdmins, user]);

  // Identificación sin fisuras: si es UID de dueño o tiene rol owner, es Nivel 4 completo
  const isMasterOwner =
    Boolean(user?.uid && DEFAULT_OWNER_UIDS.includes(user.uid)) ||
    userRole === 'owner';

  const myRow = usersList.find((u) => u.uid === user?.uid);
  const effectiveCurrentRole: UserRole = isMasterOwner
    ? 'owner'
    : myRow?.role || userRole;

  const canManageRoles = isMasterOwner || effectiveCurrentRole === 'owner';
  const canManageLicenses =
    isMasterOwner ||
    effectiveCurrentRole === 'owner' ||
    effectiveCurrentRole === 'operator';

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleRoleChange = async (targetUser: ManagedUserItem, nextRole: UserRole) => {
    if (!canManageRoles) return;
    if (targetUser.uid === user?.uid || DEFAULT_OWNER_UIDS.includes(targetUser.uid)) {
      showNotice('El Propietario (Nivel 4) no puede cambiar su propio rol.');
      return;
    }
    setSavingUid(targetUser.uid);
    try {
      // 1. Asignar rol en /roles (clave para RBAC)
      await set(ref(db, `roles/${targetUser.uid}`), nextRole);

      // 2. Actualizar perfil de usuario
      await update(ref(db, `users/${targetUser.uid}/profile`), {
        role: nextRole,
        displayName: targetUser.fullName,
        email: targetUser.email || '',
        updatedAt: Date.now(),
      }).catch((e) => console.warn('Advertencia actualizando perfil:', e));

      // 3. Nodos complementarios
      if (nextRole === 'owner') {
        await set(ref(db, `admins/${targetUser.uid}`), true).catch(() => {});
        await set(ref(db, `operator/${targetUser.uid}`), true).catch(() => {});
      } else if (nextRole === 'operator') {
        await remove(ref(db, `admins/${targetUser.uid}`)).catch(() => {});
        await set(ref(db, `operator/${targetUser.uid}`), true).catch(() => {});
      } else {
        await remove(ref(db, `admins/${targetUser.uid}`)).catch(() => {});
        await remove(ref(db, `operator/${targetUser.uid}`)).catch(() => {});
      }

      showNotice(
        `Rol de ${targetUser.fullName} actualizado a ${ROLE_DEFINITIONS[nextRole].label}`
      );
    } catch (err: any) {
      console.error('Error al actualizar rol:', err);
      showNotice(`Error al actualizar rol: ${err?.message || 'Permiso denegado'}`);
    } finally {
      setSavingUid(null);
    }
  };

  const handleDirectAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRoles) return;
    const cleanInput = targetIdentifier.trim();
    if (!cleanInput) return;

    if (
      cleanInput === user?.uid ||
      DEFAULT_OWNER_UIDS.includes(cleanInput) ||
      (user?.email && cleanInput.toLowerCase() === user.email.toLowerCase())
    ) {
      showNotice('El Propietario (Nivel 4) no puede cambiar su propio rol.');
      return;
    }

    setAssigningDirect(true);
    try {
      if (cleanInput.includes('@')) {
        const emailLower = cleanInput.toLowerCase();
        const emailKey = encodeEmailKey(emailLower);
        const matchingUser = usersList.find(
          (u) => u.email.toLowerCase() === emailLower
        );

        const promises: Promise<any>[] = [
          set(ref(db, `preassigned_roles/${emailKey}`), {
            email: emailLower,
            role: targetRole,
            updatedAt: Date.now(),
          }),
        ];

        if (matchingUser) {
          promises.push(handleRoleChange(matchingUser, targetRole));
        }

        await Promise.all(promises);
        showNotice(
          `Correo ${emailLower} asignado a ${ROLE_DEFINITIONS[targetRole].label}`
        );
      } else {
        const uid = cleanInput;
        await set(ref(db, `roles/${uid}`), targetRole);
        await update(ref(db, `users/${uid}/profile`), {
          role: targetRole,
          updatedAt: Date.now(),
        }).catch((e) => console.warn('Perfil warning:', e));

        if (targetRole === 'owner') {
          await set(ref(db, `admins/${uid}`), true).catch(() => {});
          await set(ref(db, `operator/${uid}`), true).catch(() => {});
        } else if (targetRole === 'operator') {
          await remove(ref(db, `admins/${uid}`)).catch(() => {});
          await set(ref(db, `operator/${uid}`), true).catch(() => {});
        } else {
          await remove(ref(db, `admins/${uid}`)).catch(() => {});
          await remove(ref(db, `operator/${uid}`)).catch(() => {});
        }

        showNotice(
          `Identificador ${uid} asignado directamente a ${ROLE_DEFINITIONS[targetRole].label}`
        );
      }
      setTargetIdentifier('');
    } catch (err: any) {
      console.error('Error al asignar rol directo:', err);
      showNotice(`Error al asignar rol: ${err?.message || 'Permiso denegado'}`);
    } finally {
      setAssigningDirect(false);
    }
  };

  const handleRemovePreassigned = async (emailKey: string) => {
    if (!canManageRoles) return;
    await remove(ref(db, `preassigned_roles/${emailKey}`));
    showNotice('Pre-asignación por correo eliminada.');
  };

  const handleToggleCourseLicense = async (
    targetUser: ManagedUserItem,
    courseSlug: string
  ) => {
    if (!canManageLicenses) return;
    setSavingUid(targetUser.uid);
    const hasLicense = Boolean(targetUser.licenses?.[courseSlug]);
    try {
      if (hasLicense) {
        await remove(ref(db, `users/${targetUser.uid}/licenses/${courseSlug}`));
        showNotice(`Licencia de "${courseSlug}" revocada para ${targetUser.fullName}`);
      } else {
        const token = `LIC-${courseSlug.toUpperCase().slice(0, 6)}-${Date.now()
          .toString(36)
          .toUpperCase()}`;
        await set(ref(db, `users/${targetUser.uid}/licenses/${courseSlug}`), token);
        showNotice(`Licencia de "${courseSlug}" activada para ${targetUser.fullName}`);
      }
    } catch (err: any) {
      console.error('Error al modificar licencia:', err);
      showNotice(`Error al modificar licencia: ${err?.message || 'Permiso denegado'}`);
    } finally {
      setSavingUid(null);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="flex-1 bg-[#f4f5f9] text-[#2a2b3f] font-sans pb-20">
      {/* Encabezado sincronizado con la misma validación de la tabla */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#595c73] mb-1">
            <Link href="/" className="hover:text-[#2a2b3f] flex items-center gap-1 font-medium">
              <Home className="w-3.5 h-3.5" />
              <span>Panel Principal</span>
            </Link>
            <span>/</span>
            <span className="text-[#2a2b3f] font-semibold">Roles y Permisos</span>
          </nav>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
            Gestión de Accesos y Roles (4 Niveles de Permisos)
          </span>
          <h1 className="text-base font-extrabold text-[#2a2b3f]">
            Gestión de Roles, Permisos y Licencias de Usuarios
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#595c73]">Tu nivel actual:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${ROLE_DEFINITIONS[effectiveCurrentRole].badgeClass}`}
          >
            {ROLE_DEFINITIONS[effectiveCurrentRole].label}
          </span>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f0f0f] text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-10">
        {/* SECCIÓN ESPECIAL NIVEL 4: ASIGNAR ROL DIRECTO POR IDENTIFICADOR O CORREO */}
        {canManageRoles && (
          <section className="bg-white border border-[#d1d2e0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#6d28d2]" />
                <div>
                  <h2 className="text-sm font-extrabold text-[#2a2b3f]">
                    Dar Rol a otra Cuenta por Identificador o por Correo Electrónico
                  </h2>
                  <p className="text-xs text-[#595c73]">
                    Pega el identificador de cualquier cuenta o su correo electrónico y asígnale su nivel jerárquico al instante.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleDirectAssignRole}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
            >
              <div className="md:col-span-6">
                <input
                  type="text"
                  value={targetIdentifier}
                  onChange={(e) => setTargetIdentifier(e.target.value)}
                  placeholder="Ingresa el identificador o correo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] text-xs font-mono focus:outline-hidden focus:border-[#6d28d2]"
                  required
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] bg-white text-xs font-bold text-[#2a2b3f] focus:outline-hidden focus:border-[#6d28d2]"
                >
                  <option value="owner">Nivel 4 · Propietario (Control Total)</option>
                  <option value="operator">Nivel 3 · Operador (Licencias y Soporte)</option>
                  <option value="instructor">Nivel 2 · Instructor (Cursos y Notas)</option>
                  <option value="student">Nivel 1 · Estudiante</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={assigningDirect}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {assigningDirect ? 'Guardando...' : 'Asignar Nivel'}
                </button>
              </div>
            </form>

            {preassignedList.length > 0 && (
              <div className="pt-3 border-t border-[#f0f1f7] space-y-2">
                <p className="text-[11px] font-bold text-[#595c73]">
                  Correos pre-autorizados (recibirán su rol automáticamente al iniciar sesión):
                </p>
                <div className="flex flex-wrap gap-2">
                  {preassignedList.map((item) => (
                    <div
                      key={item.emailKey}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f6f7f9] border border-[#e2e4f0] text-xs"
                    >
                      <span className="font-mono font-semibold text-[#2a2b3f]">
                        {item.email}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_DEFINITIONS[item.role].badgeClass}`}
                      >
                        {ROLE_DEFINITIONS[item.role].shortLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreassigned(item.emailKey)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Eliminar pre-asignación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECCIÓN 1: TARJETAS DE LOS 4 NIVELES DE JERARQUÍA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e9eaf2] pb-3">
            <ShieldCheck className="w-5 h-5 text-[#6d28d2]" />
            <h2 className="text-lg font-extrabold text-[#2a2b3f]">
              Jerarquía de 4 Niveles de IPT Course
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['student', 'instructor', 'operator', 'owner'] as UserRole[]).map((rKey) => {
              const def = ROLE_DEFINITIONS[rKey];
              const count = usersList.filter((u) => u.role === rKey).length;
              return (
                <div
                  key={rKey}
                  className="bg-white border border-[#d1d2e0] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${def.badgeClass}`}
                      >
                        {def.label}
                      </span>
                      <span className="text-xs font-bold text-[#595c73]">{count} cuentas</span>
                    </div>
                    <p className="text-xs text-[#595c73] leading-relaxed">{def.description}</p>
                  </div>
                  <div className="pt-2 border-t border-[#f0f1f7] flex items-center justify-between text-[11px] text-[#7e8299]">
                    <span>Código RBAC:</span>
                    <code className="font-mono font-bold text-[#2a2b3f]">{def.id}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECCIÓN 2: MATRIZ DE PERMISOS POR ROL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e9eaf2] pb-3">
            <Sparkles className="w-5 h-5 text-[#1d4ed8]" />
            <h2 className="text-lg font-extrabold text-[#2a2b3f]">
              Matriz Oficial de Permisos (4 Niveles)
            </h2>
          </div>

          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Módulo / Acción en IPT Course</th>
                  <th className="px-4 py-3.5 font-bold text-center">1. Estudiante</th>
                  <th className="px-4 py-3.5 font-bold text-center">2. Instructor</th>
                  <th className="px-4 py-3.5 font-bold text-center">3. Operador</th>
                  <th className="px-4 py-3.5 font-bold text-center">4. Propietario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {RBAC_MATRIX_TABLE.map((row) => (
                  <tr key={row.permission} className="hover:bg-[#fcfdff]">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-xs text-[#2a2b3f]">{row.moduleName}</p>
                      <p className="text-[11px] text-[#595c73]">{row.description}</p>
                    </td>
                    {(['student', 'instructor', 'operator', 'owner'] as const).map((col) => (
                      <td key={col} className="px-4 py-3.5 text-center">
                        {row[col] ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 3: GESTOR EN TIEMPO REAL DE USUARIOS, ROLES Y LICENCIAS */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6d28d2]" />
              <h2 className="text-lg font-extrabold text-[#2a2b3f]">
                Cuentas Registradas, Nivel RBAC y Licencias ({filteredUsers.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7e8299] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o identificador..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-[#d1d2e0] rounded-xl text-xs focus:outline-hidden focus:border-[#6d28d2]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#d1d2e0] rounded-xl text-xs font-semibold text-[#2a2b3f]"
              >
                <option value="all">Todos los niveles</option>
                <option value="owner">Nivel 4 · Propietario</option>
                <option value="operator">Nivel 3 · Operador</option>
                <option value="instructor">Nivel 2 · Instructor</option>
                <option value="student">Nivel 1 · Estudiante</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[#d1d2e0] rounded-2xl shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f7f9] border-b border-[#e9eaf2] text-[#595c73] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Nombre / Identificador</th>
                  <th className="px-5 py-3.5 font-bold">Nivel Jerárquico Actual</th>
                  <th className="px-5 py-3.5 font-bold">Licencias de Cursos Activas</th>
                  <th className="px-5 py-3.5 font-bold text-right">Asignar Nivel de Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaf2]">
                {filteredUsers.map((u) => {
                  const roleDef = ROLE_DEFINITIONS[u.role];
                  const isCurrentUser = user?.uid === u.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-[#fcfdff]">
                      {/* Columna 1: Únicamente Nombre arriba e ID abajo */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-[#2a2b3f]">{u.fullName}</p>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold">
                              Tú
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#595c73] font-mono mt-0.5">
                          ID: {u.uid}
                        </p>
                      </td>

                      {/* Columna 2: Nivel Actual */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${roleDef.badgeClass}`}
                        >
                          {roleDef.label}
                        </span>
                      </td>

                      {/* Columna 3: Licencias de Cursos */}
                      <td className="px-5 py-4">
                        {coursesList.length === 0 ? (
                          <span className="text-xs text-[#9194ac]">
                            Aún no hay cursos creados en el catálogo
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {coursesList.map((course) => {
                              const active = Boolean(u.licenses?.[course.slug]);
                              return (
                                <button
                                  key={course.slug}
                                  type="button"
                                  disabled={!canManageLicenses || savingUid === u.uid}
                                  onClick={() => handleToggleCourseLicense(u, course.slug)}
                                  title={
                                    canManageLicenses
                                      ? active
                                        ? 'Clic para revocar licencia de este curso'
                                        : 'Clic para activar licencia de este curso'
                                      : 'Solo Operador o Propietario pueden cambiar licencias'
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors ${
                                    active
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-[#f6f7f9] text-[#606060] border-[#e2e4f0] hover:bg-[#ebedf5]'
                                  } ${
                                    canManageLicenses
                                      ? 'cursor-pointer'
                                      : 'opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>{course.title}</span>
                                  <span>{active ? '✓' : '+'}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Columna 4: Selector RBAC (bloqueado para el propio Owner) */}
                      <td className="px-5 py-4 text-right">
                        {isCurrentUser || DEFAULT_OWNER_UIDS.includes(u.uid) ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] font-extrabold text-[#6d28d2]"
                            title="El Propietario (Nivel 4) no puede cambiar su propio rol"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Rol fijo (Tu cuenta Owner)</span>
                          </span>
                        ) : canManageRoles ? (
                          <select
                            value={u.role}
                            disabled={savingUid === u.uid}
                            onChange={(e) =>
                              handleRoleChange(u, e.target.value as UserRole)
                            }
                            className="px-3 py-1.5 rounded-xl border border-[#d1d2e0] bg-white text-xs font-bold text-[#2a2b3f] focus:outline-hidden focus:border-[#6d28d2] cursor-pointer shadow-2xs"
                          >
                            <option value="student">Nivel 1 · Estudiante</option>
                            <option value="instructor">Nivel 2 · Instructor</option>
                            <option value="operator">Nivel 3 · Operador</option>
                            <option value="owner">Nivel 4 · Propietario</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#7e8299] font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>Exclusivo Propietario</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-[#595c73]">
                      No se encontraron usuarios registrados con ese criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
