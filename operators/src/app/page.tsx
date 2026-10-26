"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { StudentAccessDenied } from "@/components/StudentAccessDenied";
import { TeacherStudioWorkspace } from "@/teachers/TeacherStudioWorkspace";
import { AdminGatekeeper } from "@/guards/AdminGatekeeper";
import { Shield, Eye, LogOut, Lock, UserCircle, Sparkles } from "lucide-react";

export default function OperatorsRootPage() {
  const router = useRouter();
  const { user, operatorProfile, loading, logout } = useAuth();
  const [activeArea, setActiveArea] = useState<"teachers" | "admin">("teachers");

  // 1. Pantalla de Carga Dark Pro
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center antialiased text-white">
        <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="relative w-36 h-9 mb-2">
          <Image
            src="/logo-horizontal.png"
            alt="IPT Course"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Comprobando Credenciales Firebase Auth
        </span>
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, renderizar obligatoriamente pantalla de Login
  if (!user || !operatorProfile) {
    return <LoginScreen />;
  }

  // 3. Si el usuario autenticado tiene rol de estudiante, denegar acceso a operadores
  if (operatorProfile.role === "student") {
    return <StudentAccessDenied />;
  }

  const handleOpenPreview = () => {
    router.push("/preview?preview=true");
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-white antialiased selection:bg-violet-600 selection:text-white flex flex-col">
      {/* Top Floating Pro Bar */}
      <header className="sticky top-0 z-40 bg-[#0e0e12]/90 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between text-xs">
          {/* Logo & Section Identity */}
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-8">
              <Image
                src="/logo-horizontal.png"
                alt="IPT Course"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 border-l border-white/10 pl-3">
              <span>Suite Operativa</span>
              <span className="text-zinc-600">/</span>
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                {activeArea === "teachers" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Teachers Studio
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Admin Governance
                  </>
                )}
              </span>
            </div>
          </div>

          {/* User Session & Navigation Pills */}
          <div className="flex items-center gap-2.5">
            {/* Modo Alumno */}
            <button
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold transition-all active:scale-[0.97]"
              title="Abre la experiencia del curso con Estudiante Mock para comprobar bloqueos"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modo Alumno</span>
              <span className="font-mono text-[10px] text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded-full">?preview=true</span>
            </button>

            {/* Alternador de Área (Teachers / Admin) */}
            {activeArea === "teachers" ? (
              <button
                onClick={() => setActiveArea("admin")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181822] hover:bg-[#222230] text-zinc-200 border border-white/10 text-xs font-semibold transition-all active:scale-[0.97]"
              >
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span>Gobernanza Admin</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveArea("teachers")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all active:scale-[0.97] shadow-sm shadow-violet-600/25"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Volver a Docentes</span>
              </button>
            )}

            {/* User Profile Pill & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">
                  {operatorProfile.displayName || "Docente IPT"}
                </span>
                <span className="text-[10px] text-violet-400 font-mono font-medium">
                  {operatorProfile.role.toUpperCase()}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Renderizado de Área */}
      <main className="flex-1 flex flex-col">
        {activeArea === "teachers" ? (
          <TeacherStudioWorkspace
            userProfile={operatorProfile}
            onGoToAdmin={() => setActiveArea("admin")}
            onOpenPreview={handleOpenPreview}
          />
        ) : (
          <AdminGatekeeper
            userProfile={operatorProfile}
            onBackToTeachers={() => setActiveArea("teachers")}
          />
        )}
      </main>
    </div>
  );
}
