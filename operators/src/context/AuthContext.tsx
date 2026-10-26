"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  IdTokenResult
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, rtdb, OperatorUserProfile } from "@/lib/firebase";

export const OWNER_UIDS = [
  "fIBITLfS50bRxE72fqgzC5nnArX2",
];

export const OWNER_EMAILS = [
  "samuxdevs@gmail.com",
  "ivanpereztech13@gmail.com",
  "admin@ipt.com",
  "admin@iptapps.com",
  "ivan@ipt.edu.co",
];

export type OperatorUser = OperatorUserProfile;

interface AuthContextType {
  user: User | null;
  operatorProfile: OperatorUser | null;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  operatorProfile: null,
  loading: true,
  error: null,
  loginWithEmail: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setOperatorProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        // 1. Verificar si es Owner por UID o Email
        const isOwner =
          OWNER_UIDS.includes(firebaseUser.uid) ||
          (firebaseUser.email && OWNER_EMAILS.includes(firebaseUser.email.toLowerCase()));

        // 2. Leer Claims criptográficas
        const tokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
        const claims = tokenResult.claims;

        // 3. Consultar rol en Firebase Realtime Database
        let rtdbRole: string | null = null;
        try {
          const roleSnap = await get(ref(rtdb, `roles/${firebaseUser.uid}`));
          if (roleSnap.exists()) {
            rtdbRole = roleSnap.val();
          }
        } catch (dbErr) {
          console.warn("No se pudo consultar roles en RTDB:", dbErr);
        }

        // Determinar rol efectivo
        let effectiveRole: OperatorUser["role"] = "student";

        if (isOwner) {
          effectiveRole = "owner";
        } else if (claims.admin === true || rtdbRole === "admin" || rtdbRole === "owner") {
          effectiveRole = "admin";
        } else if (rtdbRole === "teacher" || rtdbRole === "instructor") {
          effectiveRole = "teacher";
        } else if (rtdbRole === "operator") {
          effectiveRole = "operator";
        } else if (rtdbRole === "student") {
          effectiveRole = "student";
        } else {
          // Si no tiene rol asignado en RTDB, consultar si está en admins/
          try {
            const adminSnap = await get(ref(rtdb, `admins/${firebaseUser.uid}`));
            if (adminSnap.exists() && adminSnap.val() === true) {
              effectiveRole = "admin";
            }
          } catch {}
        }

        const isAdmin = effectiveRole === "admin" || effectiveRole === "owner";
        const isTeacher = effectiveRole === "teacher" || isAdmin || effectiveRole === "operator";

        setOperatorProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Operador IPT",
          role: effectiveRole,
          isAdmin,
          isTeacher,
          photoURL: firebaseUser.photoURL,
        });
      } catch (err: any) {
        console.error("Error resolviendo perfil de operador:", err);
        setError("Error validando permisos de acceso.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error("Fallo al iniciar sesión:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Inténtalo de nuevo más tarde.");
      } else {
        setError(err.message || "Error al autenticar con el servidor de IPT.");
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("No se pudo completar el acceso con Google.");
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setOperatorProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        operatorProfile,
        loading,
        error,
        loginWithEmail,
        loginWithGoogle,
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
