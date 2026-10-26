"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Scale,
  Users,
  Activity,
  Server,
  FileText,
  ArrowLeft,
  Lock,
  Menu,
  X,
  LogOut,
  Sparkles
} from "lucide-react";
import { LegalComplianceAdmin } from "./LegalComplianceAdmin";
import { SecurityRolesMatrix } from "./SecurityRolesMatrix";
import { RegisteredAccountsView } from "./RegisteredAccountsView";
import { SystemLoadMonitor } from "./SystemLoadMonitor";
import { ConcurrencyScaleManager } from "./ConcurrencyScaleManager";
import { AuditLogsViewer } from "./AuditLogsViewer";
import { OperatorUserProfile } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export type AdminTab =
  | "roles"
  | "users"
  | "legal"
  | "telemetry"
  | "scale"
  | "audit";

export default function AdminRootModule({
  userProfile,
  onExitAdmin
}: {
  userProfile: OperatorUserProfile;
  onExitAdmin: () => void;
}) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("roles");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const adminNavItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: "roles", label: "Seguridad y Roles (>50)", icon: ShieldCheck },
    { id: "users", label: "Cuentas Registradas", icon: Users },
    { id: "legal", label: "Litigios y Consentimientos", icon: Scale },
    { id: "telemetry", label: "Carga en Tiempo Real", icon: Activity },
    { id: "scale", label: "Concurrencia (CCU) y Escala", icon: Server },
    { id: "audit", label: "Auditoría Forense y Logs", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col font-sans text-white">
      {/* Barra Superior Dark Pro */}
      <header className="bg-[#0e0e12]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center p-1.5 shadow-sm shadow-violet-600/30">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">IPT Course</span>
                  <span className="text-[10px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">
                    Gobernanza Admin
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">Control Maestro del Sistema</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#181820] hover:bg-[#20202c] border border-white/10 rounded-full transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Studio Docente</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-full transition-all active:scale-[0.97]"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Barra de Pestañas Segmentada Pro */}
        <div className="hidden lg:block border-t border-white/5 bg-[#121217]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-2 overflow-x-auto">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#121217] border-b border-white/10 p-4 space-y-1 shadow-xl">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "roles" && <SecurityRolesMatrix />}
        {activeTab === "users" && <RegisteredAccountsView />}
        {activeTab === "legal" && <LegalComplianceAdmin />}
        {activeTab === "telemetry" && <SystemLoadMonitor />}
        {activeTab === "scale" && <ConcurrencyScaleManager />}
        {activeTab === "audit" && <AuditLogsViewer />}
      </main>
    </div>
  );
}
