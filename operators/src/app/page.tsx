"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { TeacherStudioWorkspace } from "@/teachers/TeacherStudioWorkspace";
import { AdminGatekeeper } from "@/guards/AdminGatekeeper";
import { RectoriaDeskWorkspace } from "@/rectoria/RectoriaDeskWorkspace";
import {
  ShieldCheck,
  GraduationCap,
  Crown,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

export default function OperatorsRootPage() {
  const router = useRouter();
  const { user, operatorProfile, viewMode, setViewMode, loading, logout } = useAuth();

  // 1. Pantalla de Carga Apple Minimalista
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center p-6 text-center antialiased text-white">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <div className="relative w-36 h-8 mb-2">
          <Image
            src="/logo-horizontal.png"
            alt="IPT Academy"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[11px] font-medium text-zinc-500 tracking-wide">
          Verificando credenciales de acceso...
        </span>
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, renderizar obligatoriamente pantalla de Login
  if (!user || !operatorProfile) {
    return <LoginScreen />;
  }

  const handleOpenPreview = () => {
    router.push("/preview?preview=true");
  };

  const isAdmin = operatorProfile.role === "admin";
  const firstName = operatorProfile.displayName
    ? operatorProfile.displayName.split(" ")[0]
    : "Operador";

  // 3. Si el usuario es Administrador y NO ha elegido vista, mostrar Homepage de Selección Minimalista
  if (isAdmin && !viewMode) {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] text-white antialiased flex flex-col selection:bg-rose-600 selection:text-white relative overflow-hidden">
        {/* Sutil halo ambiental de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />

        {/* Barra Superior Minimalista */}
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-8">
              <Image
                src="/logo-horizontal.png"
                alt="IPT Academy"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Modo Alumno</span>
            </button>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">{operatorProfile.email}</span>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Contenido Principal: Homepage de Bienvenida y Selección */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative z-10 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-3 mb-10">
            <span className="inline-block text-[11px] font-semibold text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Administración Central
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Bienvenido, {firstName}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 font-normal">
              Defina el perfil al que va a ingresar
            </p>
          </div>

          {/* Tarjetas de Selección de Perfil */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
            {/* Opción 1: Perfil Docente */}
            <div
              onClick={() => setViewMode("teacher")}
              className="group cursor-pointer rounded-3xl bg-[#121217] border border-white/10 hover:border-emerald-500/40 p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/20 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight flex items-center justify-between">
                    <span>Docente</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Teachers Studio: creación de cursos, rúbricas de evaluación, dictado de clases en vivo y directivas de TutorIA.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 group-hover:text-emerald-300 font-medium">
                <span>Ingresar como Docente</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Opción 2: Perfil Administrador */}
            <div
              onClick={() => setViewMode("admin")}
              className="group cursor-pointer rounded-3xl bg-[#121217] border border-white/10 hover:border-rose-500/40 p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-950/20 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight flex items-center justify-between">
                    <span>Administrador</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Admin Governance: infraestructura técnica, auto-escalado de concurrencia, bitácora de auditoría y cuentas.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 group-hover:text-rose-300 font-medium">
                <span>Ingresar como Administrador</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
            </div>

            {/* Opción 3: Perfil Rectoría */}
            <div
              onClick={() => setViewMode("rectoria")}
              className="group cursor-pointer rounded-3xl bg-[#121217] border border-white/10 hover:border-[#f59e0b]/50 p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#f59e0b]/10 relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] group-hover:scale-105 transition-transform">
                  <Crown className="w-6 h-6 text-[#f59e0b]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight flex items-center justify-between">
                    <span>Rectoría</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#f59e0b] group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Despacho Rectoral: control de ofertas/becas en RTDB, tribunal de apelaciones, cancillería de títulos y planes DevOps.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 group-hover:text-[#f59e0b] font-medium">
                <span>Ingresar a Rectoría</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 4. Si el usuario es Docente (o un Admin que seleccionó vista 'teacher')
  // Nota: Si es docente, viewMode se fuerza automáticamente a 'teacher'.
  const activeView = viewMode || "teacher";

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white antialiased flex flex-col selection:bg-rose-600 selection:text-white relative">
      {/* Barra Superior Pro */}
      <header className="sticky top-0 z-40 bg-[#0e0e12]/90 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-8">
              <Image
                src="/logo-horizontal.png"
                alt="IPT Academy"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 border-l border-white/10 pl-3">
              <span>Suite Operativa</span>
              <span className="text-zinc-600">/</span>
              <span className="font-semibold text-white tracking-tight flex items-center gap-1.5">
                {activeView === "teacher" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Teachers Studio
                  </>
                ) : activeView === "admin" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Admin Governance
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    Despacho de Rectoría
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-all"
              title="Abre la experiencia del curso con Estudiante Mock"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Modo Alumno</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-white leading-tight">
                  {operatorProfile.displayName || "Operador IPT"}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {operatorProfile.role.toUpperCase()}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Área de Trabajo según Perfil Activo */}
      <main className="flex-1 flex flex-col">
        {activeView === "teacher" ? (
          <TeacherStudioWorkspace
            userProfile={operatorProfile}
            onGoToAdmin={() => {
              if (isAdmin) setViewMode("admin");
            }}
            onOpenPreview={handleOpenPreview}
          />
        ) : activeView === "admin" ? (
          <AdminGatekeeper
            userProfile={operatorProfile}
            onBackToTeachers={() => setViewMode("teacher")}
          />
        ) : (
          <RectoriaDeskWorkspace
            userProfile={operatorProfile}
            onGoToTeacher={() => setViewMode("teacher")}
            onGoToAdmin={() => setViewMode("admin")}
          />
        )}
      </main>

      {/* Botón Flotante Inferior Izquierdo: Para volver al Selector de Perfil Tripartito */}
      {isAdmin && (
        <button
          onClick={() => setViewMode(null)}
          className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white shadow-xl shadow-black/60 border border-white/20 transition-all hover:scale-105 active:scale-95 group font-medium text-xs backdrop-blur-md cursor-pointer"
          title="Volver a selección de perfil"
          aria-label="Volver a selección de perfil"
        >
          <ArrowLeft className="w-4 h-4 text-white transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Cambiar Perfil (Docente / Admin / Rectoría)</span>
        </button>
      )}
    </div>
  );
}
