"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, Key, Search, Download, Filter, Info, RefreshCw, FileText } from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface AuditLogEntry {
  id: string;
  timestampUtc: string;
  eventType: "auth_failure" | "suspicious_access" | "critical_change" | "system_error";
  severity: "critical" | "warning" | "info";
  actorUid: string;
  actorEmail: string;
  actionDescription: string;
  ipAddress: string;
  location: string;
}

export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Cargar logs reales de auditoría desde Firebase RTDB
  useEffect(() => {
    const logsRef = ref(rtdb, "audit_logs");
    const unsubscribe = onValue(
      logsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: AuditLogEntry[] = [];
          Object.entries(data).forEach(([id, item]: [string, any]) => {
            list.push({
              id,
              timestampUtc: item.timestampUtc || item.timestamp || new Date().toISOString(),
              eventType: item.eventType || "system_error",
              severity: item.severity || "info",
              actorUid: item.actorUid || item.uid || "system",
              actorEmail: item.actorEmail || item.email || "sistema@ipt.com",
              actionDescription: item.actionDescription || item.message || "Evento registrado",
              ipAddress: item.ipAddress || "127.0.0.1",
              location: item.location || "Colombia"
            });
          });
          setLogs(list.reverse()); // Más recientes primero
        } else {
          setLogs([]);
        }
        setLoading(false);
      },
      () => {
        setLogs([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actionDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);

    const matchesType = selectedType === "all" || log.eventType === selectedType;

    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert("No hay registros de auditoría para exportar.");
      return;
    }

    const headers = [
      "ID Registro",
      "Fecha UTC",
      "Tipo de Evento",
      "Severidad",
      "Actor UID",
      "Correo Electrónico",
      "Descripción de la Acción",
      "Dirección IP",
      "Ubicación Geográfica"
    ];

    const rows = logs.map((l) => [
      l.id,
      l.timestampUtc,
      l.eventType,
      l.severity,
      l.actorUid,
      l.actorEmail,
      l.actionDescription,
      l.ipAddress,
      l.location
    ]);

    exportToCsv("ipt_academy_logs_auditoria_forense.csv", headers, rows);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "auth_failure":
        return <Key className="w-3.5 h-3.5 text-amber-400" />;
      case "suspicious_access":
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case "critical_change":
        return <Info className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Dark Pro */}
      <div className="bg-[#121217] rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
              Seguridad & Forense
            </span>
            <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
              Registro Centralizado
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Logs y Auditoría de Seguridad
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-xl">
            Trazabilidad exhaustiva de fallos de autenticación, cambios críticos de permisos, accesos simultáneos y eventos del sistema.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-white/10 text-white rounded-xl text-xs font-medium border border-white/10 transition-all active:scale-[0.97]"
        >
          <Download className="w-4 h-4 text-violet-400" />
          Exportar Logs CSV
        </button>
      </div>

      {/* Filtros Segmentados y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-[#0e0e12] p-1 rounded-xl border border-white/10 inline-flex self-start overflow-x-auto max-w-full">
          {[
            { id: "all", label: `Todos (${logs.length})` },
            { id: "auth_failure", label: "Fallos Auth" },
            { id: "suspicious_access", label: "Sospechosos" },
            { id: "critical_change", label: "Cambios Críticos" },
            { id: "system_error", label: "Errores" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedType === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descripción, correo o IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121217] border border-white/10 rounded-xl text-xs text-white placeholder-[#a1a1aa]/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40"
          />
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#a1a1aa]">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-400" />
            <p className="text-xs font-medium">Sincronizando bitácora de auditoría de RTDB...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181820] border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#a1a1aa]">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Sin eventos anómalos registrados</h3>
            <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto mt-1">
              El sistema se encuentra operando bajo parámetros normales. Todos los eventos de seguridad se consolidarán aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0e0e12] text-[#a1a1aa] font-medium border-b border-white/10">
                  <th className="px-6 py-3.5">Severidad & Tipo</th>
                  <th className="px-6 py-3.5">Descripción de la Acción</th>
                  <th className="px-6 py-3.5">Actor & Credencial</th>
                  <th className="px-6 py-3.5">IP & Ubicación</th>
                  <th className="px-6 py-3.5 text-right">Fecha UTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#181820]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.eventType)}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-white leading-snug">
                        {log.actionDescription}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{log.actorEmail}</div>
                      <span className="font-mono text-[10px] text-[#a1a1aa]">{log.actorUid}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-[11px] text-[#a1a1aa]">{log.ipAddress}</div>
                      <span className="text-[11px] text-[#a1a1aa]/70">{log.location}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[11px] text-[#a1a1aa]">
                      {log.timestampUtc.replace("T", " ").replace("Z", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
