"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function LoginScreen() {
  const { loginWithEmail, error, clearError } = useAuth();
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

  return (
    <div className="min-h-[100dvh] bg-[#09090b] flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-white selection:bg-rose-600 selection:text-white relative overflow-hidden">
      {/* Sutil halo ambiental Apple */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* Tarjeta de Ingreso Minimalista */}
      <div className="w-full max-w-[400px] rounded-3xl bg-[#121215] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-8 sm:p-9 space-y-7 relative z-10">
        {/* Identidad de Marca */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <div className="relative w-40 h-10">
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
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Suite de Operaciones
            </h1>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Autenticación segura para docentes y administración central.
            </p>
          </div>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario de Acceso Directo */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 block tracking-wide">
              Correo institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                placeholder="usuario@ivanperez.tech"
                required
                autoComplete="email"
                className="w-full bg-[#18181d] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 block tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-[#18181d] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <span>{submitting ? "Verificando..." : "Ingresar"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </form>

        {/* Footer Seguro Criptográfico */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Servidor Seguro IPT · JWT RBAC</span>
        </div>
      </div>
    </div>
  );
}
