"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { ref, set, get, update, onValue, serverTimestamp } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import {
  UserRole,
  PermissionKey,
  normalizeUserRole,
  hasRolePermission,
  ROLE_DEFINITIONS,
} from '@/lib/rbac';
import { WorkspaceMode } from '@/types';

export const DEFAULT_OWNER_UIDS = [
  'fIBITLfS50bRxE72fqgzC5nnArX2',
];

export const DEFAULT_OWNER_EMAILS = [
  'ivanpereztech13@gmail.com',
  'admin@ipt.com',
  'admin@iptapps.com',
  'ivan@ipt.com',
  'ivan@iptapps.com',
  'ivan@ipt.edu.co',
  'ivan.perez@ipt.edu.co',
  'admin@datagan.com',
  'admin@tecnogan.com',
  'soporte@tecnogan.com',
];

export function encodeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[.#$[\]/]/g, '_');
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole;
  userLevel: number;
  workspace: WorkspaceMode | null;
  setWorkspace: (ws: WorkspaceMode | null) => void;
  isAdmin: boolean;
  isOperator: boolean;
  simulateStudentMode: boolean;
  effectiveIsAdmin: boolean;
  userLicenses: Record<string, string>;
  can: (permission: PermissionKey) => boolean;
  toggleSimulateStudentMode: () => Promise<void>;
  grantCourseLicense: (courseSlug: string, licenseToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: 'student',
  userLevel: 1,
  workspace: null,
  setWorkspace: () => {},
  isAdmin: false,
  isOperator: false,
  simulateStudentMode: false,
  effectiveIsAdmin: false,
  userLicenses: {},
  can: () => false,
  toggleSimulateStudentMode: async () => {},
  grantCourseLicense: async () => {},
  logout: async () => {},
});

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/legal'];
const ACCESS_THROTTLE_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [simulateStudentMode, setSimulateStudentMode] = useState(false);
  const [userLicenses, setUserLicenses] = useState<Record<string, string>>({});
  const [workspace, setWorkspaceState] = useState<WorkspaceMode | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Cargar espacio de trabajo guardado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ipt_studio_workspace') as WorkspaceMode | null;
      if (saved === 'teacher' || saved === 'admin') {
        setWorkspaceState(saved);
      }
    }
  }, []);

  const setWorkspace = useCallback((ws: WorkspaceMode | null) => {
    setWorkspaceState(ws);
    if (typeof window !== 'undefined') {
      if (ws) {
        localStorage.setItem('ipt_studio_workspace', ws);
      } else {
        localStorage.removeItem('ipt_studio_workspace');
      }
      window.dispatchEvent(new CustomEvent('ipt_workspace_changed', { detail: ws }));
    }
  }, []);

  // 1. Suscripción a Firebase Auth y carga de datos iniciales (SOLO al montar el proveedor)
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      unsubs.forEach((u) => u());
      unsubs = [];

      if (!currentUser) {
        setUserRole('student');
        setIsAdmin(false);
        setIsOperator(false);
        setUserLicenses({});
        setLoading(false);
      } else {
        const emailLower = (currentUser.email || '').toLowerCase();
        const emailKey = emailLower ? encodeEmailKey(emailLower) : '';
        const isMasterUid = DEFAULT_OWNER_UIDS.includes(currentUser.uid);
        const isDefaultOwner = isMasterUid || DEFAULT_OWNER_EMAILS.includes(emailLower);

        // Si es cuenta propietaria pre-autorizada por UID o correo, asignar Nivel 4 de inmediato
        if (isDefaultOwner) {
          setUserRole('owner');
          setIsAdmin(true);
          setIsOperator(true);
        }

        if (typeof window !== 'undefined') {
          try {
            const storageKey = `ipt_last_access_ping_${currentUser.uid}`;
            const lastPing = Number(localStorage.getItem(storageKey) || '0');
            const now = Date.now();
            if (!sessionStorage.getItem(storageKey) || now - lastPing > ACCESS_THROTTLE_MS) {
              sessionStorage.setItem(storageKey, String(now));
              localStorage.setItem(storageKey, String(now));
              set(ref(db, `last_access/${currentUser.uid}`), serverTimestamp()).catch(() => {});
            }
          } catch {}
        }

        try {
          const [
            allAdminsSnap,
            adminSnap,
            profileSnap,
            operatorSnap,
            rbacRoleSnap,
            preassignedSnap,
          ] = await Promise.all([
            get(ref(db, 'admins')).catch(() => null),
            get(ref(db, `admins/${currentUser.uid}`)).catch(() => null),
            get(ref(db, `users/${currentUser.uid}/profile`)).catch(() => null),
            get(ref(db, `operator/${currentUser.uid}`)).catch(() => null),
            get(ref(db, `roles/${currentUser.uid}`)).catch(() => null),
            emailKey
              ? get(ref(db, `preassigned_roles/${emailKey}`)).catch(() => null)
              : Promise.resolve(null),
          ]);

          const isFirstUserInBlankDb = allAdminsSnap ? !allAdminsSnap.exists() : false;
          const hasAdminNode = Boolean(adminSnap && adminSnap.exists() && adminSnap.val() === true);
          const profileVal = profileSnap && profileSnap.exists() ? profileSnap.val() : {};
          const preassignedRole =
            preassignedSnap && preassignedSnap.exists()
              ? String(preassignedSnap.val()?.role || preassignedSnap.val() || '')
              : '';

          const rawRole =
            rbacRoleSnap && rbacRoleSnap.exists()
              ? String(rbacRoleSnap.val())
              : profileVal?.role
              ? String(profileVal.role)
              : preassignedRole;

          let resolvedRole: UserRole = normalizeUserRole(rawRole);

          if (isFirstUserInBlankDb || isDefaultOwner || hasAdminNode) {
            resolvedRole = 'owner';
          } else if (preassignedRole && resolvedRole === 'student') {
            resolvedRole = normalizeUserRole(preassignedRole);
          } else if (
            resolvedRole === 'student' &&
            operatorSnap &&
            operatorSnap.exists() &&
            operatorSnap.val() === true
          ) {
            resolvedRole = 'operator';
          }

          // Asegurar que el nombre y correo reales del usuario autenticado queden sincronizados en su perfil
          const resolvedDisplayName =
            profileVal?.displayName ||
            (profileVal?.firstName && profileVal?.lastName
              ? `${profileVal.firstName} ${profileVal.lastName}`
              : '') ||
            currentUser.displayName ||
            (currentUser.email ? currentUser.email.split('@')[0] : 'Usuario IPT');

          const profileUpdates: Record<string, any> = {
            role: resolvedRole,
            updatedAt: Date.now(),
          };
          if (!profileVal?.displayName && resolvedDisplayName) {
            profileUpdates.displayName = resolvedDisplayName;
          }
          if (!profileVal?.email && currentUser.email) {
            profileUpdates.email = currentUser.email;
          }
          update(ref(db, `users/${currentUser.uid}/profile`), profileUpdates).catch(() => {});

          if (isFirstUserInBlankDb || isDefaultOwner || resolvedRole === 'owner') {
            set(ref(db, `admins/${currentUser.uid}`), true).catch(() => {});
            set(ref(db, `operator/${currentUser.uid}`), true).catch(() => {});
            set(ref(db, `roles/${currentUser.uid}`), 'owner').catch(() => {});
          } else if (preassignedRole && !(rbacRoleSnap && rbacRoleSnap.exists())) {
            set(ref(db, `roles/${currentUser.uid}`), resolvedRole).catch(() => {});
          }

          setUserRole(resolvedRole);
          setIsAdmin(resolvedRole === 'owner' || resolvedRole === 'instructor');
          setIsOperator(resolvedRole === 'owner' || resolvedRole === 'operator');

          // Escuchar cambios de rol en tiempo real sin recrear en cada navegación
          const roleRef = ref(db, `roles/${currentUser.uid}`);
          const unsubRole = onValue(roleRef, (snap) => {
            if (!snap.exists()) return;
            const liveRole =
              isDefaultOwner || isFirstUserInBlankDb
                ? 'owner'
                : normalizeUserRole(String(snap.val()));
            setUserRole(liveRole);
            setIsAdmin(liveRole === 'owner' || liveRole === 'instructor');
            setIsOperator(liveRole === 'owner' || liveRole === 'operator');
          });
          unsubs.push(unsubRole);
        } catch (err) {
          console.error('Error al verificar permisos de usuario:', err);
        }

        try {
          const licRef = ref(db, `users/${currentUser.uid}/licenses`);
          const unsubLic = onValue(licRef, (snap) => {
            setUserLicenses(snap.exists() ? snap.val() || {} : {});
          });
          unsubs.push(unsubLic);
        } catch {}

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach((u) => u());
    };
  }, []);

  // 2. Protección de rutas ligera y no bloqueante (NUNCA altera loading ni hace llamadas a Firebase)
  useEffect(() => {
    if (loading) return;

    const isPublicPath = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname?.startsWith(`${p}/`)
    );

    if (!user && !isPublicPath) {
      router.push('/login');
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.push('/');
    }
  }, [pathname, user, loading, router]);

  const toggleSimulateStudentMode = useCallback(async () => {
    setSimulateStudentMode(false);
  }, []);

  const grantCourseLicense = useCallback(
    async (courseSlug: string, licenseToken: string) => {
      if (!user) return;
      await set(ref(db, `users/${user.uid}/licenses/${courseSlug}`), licenseToken);
    },
    [user]
  );

  const can = useCallback(
    (permission: PermissionKey) => {
      const isMaster = user?.uid ? DEFAULT_OWNER_UIDS.includes(user.uid) : false;
      const effectiveRole: UserRole = isMaster ? 'owner' : userRole;
      return hasRolePermission(effectiveRole, permission);
    },
    [user, userRole]
  );

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    router.push('/login');
  };

  const effectiveIsAdmin =
    isAdmin || (user?.uid ? DEFAULT_OWNER_UIDS.includes(user.uid) : false);

  const effectiveRole = user?.uid && DEFAULT_OWNER_UIDS.includes(user.uid) ? 'owner' : userRole;
  const userLevel = ROLE_DEFINITIONS[effectiveRole]?.level ?? 1;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole: effectiveRole,
        userLevel,
        workspace,
        setWorkspace,
        isAdmin: effectiveIsAdmin,
        isOperator: isOperator || effectiveIsAdmin,
        simulateStudentMode: false,
        effectiveIsAdmin,
        userLicenses,
        can,
        toggleSimulateStudentMode,
        grantCourseLicense,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
