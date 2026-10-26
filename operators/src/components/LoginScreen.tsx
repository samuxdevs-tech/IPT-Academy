"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function LoginScreen() {
  const { loginWithEmail, loginWithGoogle, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch {
      // Error manejado en el contexto
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      // Error manejado en el contexto
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-white selection:bg-[#7c3aed] selection:text-white relative overflow-hidden">
      {/* Glow ambiental de fondo sutil */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Tarjeta Pro Studio */}
      <div className="w-full max-w-[420px] rounded-[2rem] bg-[#121217] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-8 sm:p-10 space-y-7 relative z-10">
        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <div className="relative w-44 h-12">
              <Image
                src="/logo-horizontal.png"
                alt="IPT Course"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
              <Sparkles className="w-3 h-3 text-violet-400" />
              Suite de Operaciones
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ingreso Autorizado
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Acceso exclusivo para docentes, instructores y gobernanza de IPT Course.
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Credenciales Incorrectas</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
              Correo Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                placeholder="docente@ipt.com"
                required
                className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="••••••••••••"
                required
                className="w-full bg-[#181820] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{submitting ? "Verificando..." : "Acceder al Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-[#121217] px-3 text-zinc-500 font-semibold">O autentícate con</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#181820] hover:bg-[#20202a] border border-white/10 text-white text-xs font-medium transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Cuenta Google IPT</span>
        </button>

        {/* Footer Criptográfico */}
        <div className="pt-2 border-t border-white/5 text-center flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Firebase Auth TLS 1.3 · Claim Verification</span>
        </div>
      </div>
    </div>
  );
}
