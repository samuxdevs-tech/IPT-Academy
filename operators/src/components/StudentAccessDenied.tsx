"use client";

import React from "react";
import Image from "next/image";
import { ShieldAlert, ArrowLeft, LogOut, ExternalLink, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function StudentAccessDenied() {
  const { user, operatorProfile, logout } = useAuth();

  const handleGoToStudentPortal = () => {
    window.location.href = "https://ipt-course-students.web.app";
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-white relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[460px] rounded-[2rem] bg-[#121217] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-8 sm:p-10 space-y-6 text-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400 block mb-1">
            Restricción de Perfil
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Acceso Exclusivo para Operadores
          </h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Tu cuenta actual (<strong>{user?.email}</strong>) está registrada con el rol de{" "}
            <span className="text-violet-300 font-semibold uppercase">Estudiante</span>. El entorno de operadores está reservado para docentes, instructores y gobernanza de IPT Academy.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#181820] border border-white/5 text-left text-[11px] font-mono text-zinc-400 space-y-1">
          <div>UID: <span className="text-zinc-200">{user?.uid}</span></div>
          <div>Rol Asignado: <span className="text-violet-400 font-semibold">{operatorProfile?.role || "student"}</span></div>
          <div>Acceso a /operators: <span className="text-rose-400 font-semibold">Denegado por Aislamiento de Código</span></div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleGoToStudentPortal}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-violet-600/25"
          >
            <span>Ir a Mi Aula de Estudiante</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#181820] hover:bg-[#20202a] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
