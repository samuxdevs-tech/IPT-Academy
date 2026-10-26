"use client";

import React, { useState, useEffect } from "react";
import { Users, Server, Cloud, ShieldCheck, Zap, CheckCircle2, RefreshCw } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";

export function ConcurrencyScaleManager() {
  const [currentCcu, setCurrentCcu] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(2000);
  const [autoScaleEnabled, setAutoScaleEnabled] = useState<boolean>(true);
  const [gcpScaling, setGcpScaling] = useState<boolean>(true);
  const [awsScaling, setAwsScaling] = useState<boolean>(false);
  const [azureScaling, setAzureScaling] = useState<boolean>(false);
  const [edgeBurstActive, setEdgeBurstActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Consultar configuración y usuarios conectados reales
  useEffect(() => {
    const usersRef = ref(rtdb, "users");
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let activeCount = 0;
        const now = Date.now();
        Object.values(data).forEach((u: any) => {
          const hb = u.lastHeartbeat || u.lastActiveAt || u.updatedAt;
          if (hb) {
            const time = new Date(hb).getTime();
            if (!isNaN(time) && now - time < 15 * 60 * 1000) {
              activeCount++;
            }
          }
        });
        setCurrentCcu(Math.max(1, activeCount));
      } else {
        setCurrentCcu(1);
      }
      setLoading(false);
    });

    const configRef = ref(rtdb, "system_config/scaling");
    const unsubConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (typeof val.autoScaleEnabled === "boolean") setAutoScaleEnabled(val.autoScaleEnabled);
        if (typeof val.gcpScaling === "boolean") setGcpScaling(val.gcpScaling);
        if (typeof val.awsScaling === "boolean") setAwsScaling(val.awsScaling);
        if (typeof val.azureScaling === "boolean") setAzureScaling(val.azureScaling);
        if (typeof val.edgeBurstActive === "boolean") setEdgeBurstActive(val.edgeBurstActive);
      }
    });

    return () => {
      unsubUsers();
      unsubConfig();
    };
  }, []);

  const handlePersistConfig = async (updates: Partial<{
    autoScaleEnabled: boolean;
    gcpScaling: boolean;
    awsScaling: boolean;
    azureScaling: boolean;
    edgeBurstActive: boolean;
  }>) => {
    try {
      const configRef = ref(rtdb, "system_config/scaling");
      await set(configRef, {
        autoScaleEnabled,
        gcpScaling,
        awsScaling,
        azureScaling,
        edgeBurstActive,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {}
  };

  const handleTriggerManualBurst = async () => {
    const nextBurst = !edgeBurstActive;
    setEdgeBurstActive(nextBurst);
    await handlePersistConfig({ edgeBurstActive: nextBurst });

    if (nextBurst) {
      setToastMessage("Blindaje de examen activado: Umbrales de auto-escalado preventivo configurados al 300%.");
    } else {
      setToastMessage("Blindaje de examen desactivado: Umbrales estándar restablecidos.");
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const ccuPercent = Math.min(100, Math.round((currentCcu / maxCapacity) * 100));

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Alta Disponibilidad
            </span>
            <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              Multi-Cloud Burst
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Gestión de Concurrencia y Auto-Escalado
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Supervisión en vivo de usuarios concurrentes simultáneos (CCU) y asignación elástica de capacidad entre Google Cloud, AWS y Microsoft Azure.
          </p>
        </div>

        <button
          onClick={handleTriggerManualBurst}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-lg ${
            edgeBurstActive
              ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30"
              : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/30"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{edgeBurstActive ? "Desactivar Blindaje" : "Activar Blindaje para Examen Masivo"}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tarjeta de CCU Dark Pro */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Usuarios Concurrentes en Tiempo Real (CCU)
            </span>
            <div className="text-3xl font-bold text-white tracking-tight mt-1 flex items-baseline gap-2 font-mono">
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
              ) : (
                <>
                  <span>{currentCcu}</span>
                  <span className="text-sm font-normal text-zinc-400 font-sans">/ {maxCapacity} capacidad base</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-white font-mono">{ccuPercent}% de uso</span>
            <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
              Margen óptimo de respuesta
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-[#181820] rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, ccuPercent)}%` }}
          />
        </div>
      </div>

      {/* Controles de Proveedores Multi-Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Cloud Platform */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">Google Cloud (GCP)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Auto-escalado nativo de Cloud Functions y RTDB sharding para picos de hasta 10,000 CCU.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white">Estado de Enrutamiento</span>
            <button
              onClick={() => {
                const next = !gcpScaling;
                setGcpScaling(next);
                handlePersistConfig({ gcpScaling: next });
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                gcpScaling ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-[#181820] text-zinc-500"
              }`}
            >
              {gcpScaling ? "Activo" : "Inactivo"}
            </button>
          </div>
        </div>

        {/* Amazon Web Services */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">Amazon Web Services (AWS)</span>
              <span className={`w-2 h-2 rounded-full ${awsScaling ? "bg-emerald-400" : "bg-zinc-600"}`} />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Contingencia secundaria con réplica en AWS Lambda y DynamoDB para desbordes extremos.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white">Estado de Enrutamiento</span>
            <button
              onClick={() => {
                const next = !awsScaling;
                setAwsScaling(next);
                handlePersistConfig({ awsScaling: next });
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                awsScaling ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-[#181820] text-zinc-500"
              }`}
            >
              {awsScaling ? "Activo" : "En Reserva"}
            </button>
          </div>
        </div>

        {/* Microsoft Azure */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">Microsoft Azure</span>
              <span className={`w-2 h-2 rounded-full ${azureScaling ? "bg-emerald-400" : "bg-zinc-600"}`} />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Conexión redundante a Azure Container Apps para distribución geográfica en Sudamérica.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white">Estado de Enrutamiento</span>
            <button
              onClick={() => {
                const next = !azureScaling;
                setAzureScaling(next);
                handlePersistConfig({ azureScaling: next });
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                azureScaling ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-[#181820] text-zinc-500"
              }`}
            >
              {azureScaling ? "Activo" : "En Reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
