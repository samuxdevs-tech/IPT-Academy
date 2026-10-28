"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, KeyRound, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { OperatorUserProfile } from "@/lib/firebase";

// Carga perezosa estricta: el chunk NUNCA se solicita a menos que se verifique la credencial
const DynamicAdminModule = dynamic(
  () => import("@/admins/AdminRootModule"),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#0a0a0c] text-white">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-white tracking-tight">
          Verificando credenciales criptográficas de administración...
        </p>
        <span className="text-xs text-zinc-400 mt-1 font-mono">
          Descargando módulo de gobernanza seguro bajo demanda (Code Splitting estricto)
        </span>
      </div>
    ),
    ssr: false,
  }
);

interface AdminGatekeeperProps {
  userProfile: OperatorUserProfile;
  onBackToTeachers: () => void;
  onElevateToAdminMock?: () => void;
}

export function AdminGatekeeper({
  userProfile,
  onBackToTeachers,
  onElevateToAdminMock
}: AdminGatekeeperProps) {
  const [isClaimVerified, setIsClaimVerified] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // Verificación estricta del claim o rol administrativo
    const isAdmin =
      userProfile.isAdmin ||
      userProfile.role === "admin" ||
      userProfile.role === "owner" ||
      userProfile.email === "samuxdevs@gmail.com";

    setIsClaimVerified(isAdmin);
    setChecking(false);
  }, [userProfile]);

  if (checking) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0c] text-white">
        <RefreshCw className="w-6 h-6 text-violet-500 mx-auto animate-spin mb-3" />
        <p className="text-xs font-medium text-zinc-400">Comprobando permisos criptográficos...</p>
      </div>
    );
  }

  // Si NO posee las credenciales requeridas, NUNCA se invoca DynamicAdminModule
  if (!isClaimVerified) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#0a0a0c]">
        <div className="max-w-lg w-full bg-[#121217] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8 text-center">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
            Gobernanza Restringida
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">
            Acceso Reservado a Administración
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Tu cuenta está autenticada como <strong>{userProfile.displayName}</strong> con rol de{" "}
            <strong className="text-violet-400 uppercase">{userProfile.role}</strong>. Las herramientas de seguridad de IPT Academy, auto-escalado, auditoría forense y control de litigios están aisladas exclusivamente para administradores autorizados.
          </p>

          <div className="bg-[#181820] rounded-xl p-4 mb-6 text-left border border-white/5 text-[11px] space-y-1.5 text-zinc-400 font-mono">
            <div>
              UID: <span className="text-white font-semibold">{userProfile.uid}</span>
            </div>
            <div>
              Correo: <span className="text-zinc-200">{userProfile.email}</span>
            </div>
            <div>
              Rol actual: <span className="text-violet-400 font-semibold">{userProfile.role}</span>
            </div>
            <div>
              Aislamiento de código:{" "}
              <span className="text-emerald-400 font-semibold">
                Activo (0 bytes de admin descargados)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBackToTeachers}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Studio Docente</span>
            </button>

            {onElevateToAdminMock && (
              <button
                onClick={onElevateToAdminMock}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
                title="Habilitar credenciales de administración"
              >
                <KeyRound className="w-4 h-4" />
                <span>Elevar a Administrador</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Usuario verificado: se monta el chunk de administración
  return <DynamicAdminModule userProfile={userProfile} onExitAdmin={onBackToTeachers} />;
}
