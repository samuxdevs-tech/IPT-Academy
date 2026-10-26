"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface OperatorUser {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "teacher";
  isAdmin: boolean;
  isTeacher: boolean;
  photoURL?: string | null;
}

export type OperatorUserProfile = OperatorUser;

interface AuthContextType {
  user: OperatorUser | null;
  operatorProfile: OperatorUser | null;
  viewMode: "teacher" | "admin" | null;
  setViewMode: (mode: "teacher" | "admin" | null) => void;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  operatorProfile: null,
  viewMode: null,
  setViewMode: () => {},
  loading: true,
  error: null,
  loginWithEmail: async () => {},
  logout: async () => {},
  clearError: () => {},
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://ipt-course-api.vercel.app";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorUser | null>(null);
  const [viewMode, setViewModeState] = useState<"teacher" | "admin" | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Restaurar sesión desde JWT almacenado o Cookie de servidor
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("ipt_auth_token") : null;
      const savedViewMode = typeof window !== "undefined" ? (sessionStorage.getItem("ipt_view_mode") as "teacher" | "admin" | null) : null;

      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Sesión inválida o expirada");
        }

        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          const isAdmin = u.role === "admin";
          const profile: OperatorUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || (isAdmin ? "Iván Pérez" : "Docente IPT"),
            role: u.role,
            isAdmin,
            isTeacher: true,
          };

          if (mounted) {
            setUser(profile);
            setOperatorProfile(profile);

            // Docente entra directo a teacher; Admin respeta viewMode persistido o null
            if (u.role === "teacher") {
              setViewModeState("teacher");
            } else if (savedViewMode === "teacher" || savedViewMode === "admin") {
              setViewModeState(savedViewMode);
            } else {
              setViewModeState(null);
            }
          }
        } else {
          throw new Error("Respuesta de sesión no exitosa");
        }
      } catch (err) {
        if (mounted) {
          sessionStorage.removeItem("ipt_auth_token");
          sessionStorage.removeItem("ipt_view_mode");
          setUser(null);
          setOperatorProfile(null);
          setViewModeState(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Control de vista persistente para el Administrador
  const setViewMode = (mode: "teacher" | "admin" | null) => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      if (mode) {
        sessionStorage.setItem("ipt_view_mode", mode);
      } else {
        sessionStorage.removeItem("ipt_view_mode");
      }
    }
  };

  // 3. Inicio de sesión mediante JWT en /api/auth/login
  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciales incorrectas o cuenta no autorizada.");
      }

      const u = data.user;
      const isAdmin = u.role === "admin";
      const profile: OperatorUser = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || (isAdmin ? "Iván Pérez" : "Docente IPT"),
        role: u.role,
        isAdmin,
        isTeacher: true,
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem("ipt_auth_token", data.token);
      }

      setUser(profile);
      setOperatorProfile(profile);

      // Si es docente entra directo en teacher; si es admin va a la pantalla de selección
      if (u.role === "teacher") {
        setViewMode("teacher");
      } else {
        setViewMode(null);
      }
    } catch (err: any) {
      setError(err.message || "Fallo en la comunicación con el servidor seguro.");
      throw err;
    }
  };

  // 4. Cierre de sesión seguro
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ipt_auth_token");
      sessionStorage.removeItem("ipt_view_mode");
    }

    setUser(null);
    setOperatorProfile(null);
    setViewModeState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        operatorProfile,
        viewMode,
        setViewMode,
        loading,
        error,
        loginWithEmail,
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
