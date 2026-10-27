"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { ref, set, get, onValue, serverTimestamp } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

const DEFAULT_ADMIN_EMAILS = [
  'admin@datagan.com',
  'admin@tecnogan.com',
  'soporte@tecnogan.com',
  'ivan@ipt.com'
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  simulateStudentMode: boolean;
  effectiveIsAdmin: boolean;
  userLicenses: Record<string, string>;
  toggleSimulateStudentMode: () => Promise<void>;
  grantCourseLicense: (courseSlug: string, licenseToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isOperator: false,
  simulateStudentMode: false,
  effectiveIsAdmin: false,
  userLicenses: {},
  toggleSimulateStudentMode: async () => {},
  grantCourseLicense: async () => {},
  logout: async () => {}
});

// Las únicas rutas públicas que NO requieren cuenta activa son login, registro y verificación pública de diplomas
const PUBLIC_PATHS = ['/login', '/register', '/verify'];
const ACCESS_THROTTLE_MS = 30 * 60 * 1000; // 30 minutos para no saturar RTDB

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [simulateStudentMode, setSimulateStudentMode] = useState(false);
  const [userLicenses, setUserLicenses] = useState<Record<string, string>>({});
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Limpiar listeners anteriores
      unsubs.forEach((u) => u());
      unsubs = [];

      if (!currentUser) {
        setIsAdmin(false);
        setIsOperator(false);
        setUserLicenses({});
        setLoading(false);
      } else {
        // 1. Throttle de acceso
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `datagan_last_access_ping_${currentUser.uid}`;
            const lastPing = Number(localStorage.getItem(storageKey) || '0');
            const now = Date.now();
            if (!sessionStorage.getItem(storageKey) || now - lastPing > ACCESS_THROTTLE_MS) {
              sessionStorage.setItem(storageKey, String(now));
              localStorage.setItem(storageKey, String(now));
              set(ref(db, `last_access/${currentUser.uid}`), serverTimestamp()).catch(() => {});
            }
          } catch (e) {}
        }

        // 2. Verificar Admin y Operator
        try {
          const emailLower = (currentUser.email || '').toLowerCase();
          const isDefaultAdmin = DEFAULT_ADMIN_EMAILS.includes(emailLower);

          const [adminSnap, profileRoleSnap, operatorSnap] = await Promise.all([
            get(ref(db, `admins/${currentUser.uid}`)),
            get(ref(db, `users/${currentUser.uid}/profile/role`)),
            get(ref(db, `operator/${currentUser.uid}`))
          ]);

          const hasAdminNode = adminSnap.exists() && adminSnap.val() === true;
          const hasProfileAdmin = profileRoleSnap.exists() && profileRoleSnap.val() === 'admin';
          const userIsAdmin = isDefaultAdmin || hasAdminNode || hasProfileAdmin;
          const userIsOperator = operatorSnap.exists() && operatorSnap.val() === true;

          setIsAdmin(userIsAdmin);
          setIsOperator(userIsOperator);
        } catch (err) {
          console.error('Error al resolver roles de usuario:', err);
        }

        // 3. Listener en tiempo real de licencias del usuario
        try {
          const licRef = ref(db, `users/${currentUser.uid}/licenses`);
          const unsubLic = onValue(licRef, (snap) => {
            if (snap.exists()) {
              setUserLicenses(snap.val() || {});
            } else {
              setUserLicenses({});
            }
          });
          unsubs.push(unsubLic);
        } catch (e) {}

        // 4. Listener en tiempo real de ajustes de operador (modo simulación de estudiante)
        try {
          const simRef = ref(db, 'operator_settings/simulate_student_mode');
          const unsubSim = onValue(simRef, (snap) => {
            if (snap.exists()) {
              setSimulateStudentMode(Boolean(snap.val()));
            } else {
              setSimulateStudentMode(false);
            }
          });
          unsubs.push(unsubSim);
        } catch (e) {}

        setLoading(false);
      }

      const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

      // Si no tiene cuenta activa y no está en ruta pública, redirigir obligatoriamente a /login
      if (!currentUser && !isPublicPath) {
        router.push('/login');
      } else if (currentUser && (pathname === '/login' || pathname === '/register')) {
        // Si ya tiene sesión activa e ingresa a /login o /register, enviarlo al Home
        router.push('/');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach((u) => u());
    };
  }, [pathname, router]);

  const toggleSimulateStudentMode = useCallback(async () => {
    if (!isOperator) return;
    const nextVal = !simulateStudentMode;
    await set(ref(db, 'operator_settings/simulate_student_mode'), nextVal);
  }, [isOperator, simulateStudentMode]);

  const grantCourseLicense = useCallback(
    async (courseSlug: string, licenseToken: string) => {
      if (!user) return;
      await set(ref(db, `users/${user.uid}/licenses/${courseSlug}`), licenseToken);
    },
    [user]
  );

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const effectiveIsAdmin = isAdmin && !simulateStudentMode;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isOperator,
        simulateStudentMode,
        effectiveIsAdmin,
        userLicenses,
        toggleSimulateStudentMode,
        grantCourseLicense,
        logout
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
