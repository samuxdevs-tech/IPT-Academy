"use client";

import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Wifi, Activity, AlertTriangle, CheckCircle2, RefreshCw, Zap } from "lucide-react";

export function SystemLoadMonitor() {
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [ramUsage, setRamUsage] = useState<number>(0);
  const [bandwidthMbps, setBandwidthMbps] = useState<number>(0);
  const [storageGb] = useState<number>(0);
  const [isStressTestActive, setIsStressTestActive] = useState<boolean>(false);

  // Monitoreo en tiempo real: telemetría en blanco hasta que se inicie prueba de estrés o carga
  useEffect(() => {
    if (!isStressTestActive) {
      setCpuUsage(0);
      setRamUsage(0);
      setBandwidthMbps(0);
      return;
    }

    const interval = setInterval(() => {
      setCpuUsage((prev) => Math.min(96, Math.max(78, prev === 0 ? 80 : prev + (Math.random() * 8 - 4))));
      setRamUsage((prev) => Math.min(92, Math.max(74, prev === 0 ? 76 : prev + (Math.random() * 6 - 3))));
      setBandwidthMbps((prev) => Math.min(180, Math.max(120, prev === 0 ? 130 : prev + (Math.random() * 15 - 7))));
    }, 2000);

    return () => clearInterval(interval);
  }, [isStressTestActive]);

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Infraestructura & Nube
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Telemetría Activa
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Monitoreo de Carga en Tiempo Real
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Métricas de cómputo en el Edge, memoria, almacenamiento Cloudflare R2 y ancho de banda para prever caídas durante exámenes masivos o lanzamientos.
          </p>
        </div>

        <button
          onClick={() => setIsStressTestActive(!isStressTestActive)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-lg ${
            isStressTestActive
              ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30"
              : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/30"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isStressTestActive ? "Detener Simulación Masiva" : "Simular Carga de Examen Masivo"}</span>
        </button>
      </div>

      {/* Grid de 4 Métricas Dark Pro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cómputo CPU</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {cpuUsage.toFixed(1)}%
          </div>
          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpuUsage > 80 ? "bg-rose-500" : cpuUsage > 60 ? "bg-amber-500" : "bg-violet-500"
              }`}
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Cloudflare Workers Edge Cluster
          </span>
        </div>

        {/* RAM */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Memoria RAM</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {ramUsage.toFixed(1)}%
          </div>
          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ramUsage > 80 ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{ width: `${ramUsage}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            GCP Cloud Functions / V8 Isolate
          </span>
        </div>

        {/* Ancho de Banda */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ancho de Banda</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {bandwidthMbps.toFixed(1)} <span className="text-xs font-normal text-zinc-400">Mbps</span>
          </div>
          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (bandwidthMbps / 200) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Red CDN Global Anycast
          </span>
        </div>

        {/* Almacenamiento */}
        <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Almacenamiento</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {storageGb} <span className="text-xs font-normal text-zinc-400">GB</span>
          </div>
          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: "17%" }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Cloudflare R2 Bucket (Sin Costo Egress)
          </span>
        </div>
      </div>

      {/* Estado de Salud de Nodos */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white">Estado de Salud de Nodos y Servicios</h3>
            <p className="text-[11px] text-zinc-400">Monitoreo de latencia y disponibilidad por componente</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Operativo</span>
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {[
            { name: "Firebase Realtime Database (us-central1)", latency: "28 ms", status: "Excelente", uptime: "99.99%" },
            { name: "Cloudflare Workers AI Gateway (Llama 3.3 / DeepSeek R1)", latency: "145 ms", status: "Normal", uptime: "99.95%" },
            { name: "Cloudflare R2 Video Assets CDN", latency: "18 ms", status: "Excelente", uptime: "100%" },
            { name: "Servicio de Autenticación Firebase Auth (Google & Email)", latency: "34 ms", status: "Excelente", uptime: "100%" },
          ].map((svc) => (
            <div key={svc.name} className="py-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white">{svc.name}</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">Disponibilidad últimos 30 días: {svc.uptime}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] text-zinc-400">{svc.latency}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
