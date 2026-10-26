"use client";

import React, { useState, useEffect } from "react";
import {
  Video,
  Play,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  Square,
  Sparkles,
  Send,
  Inbox,
  FileSpreadsheet
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, get } from "firebase/database";

interface EnrolledStudent {
  uid: string;
  name: string;
  email: string;
  availableQuotas: number;
  hasConfirmedHold: boolean;
  quotaDeducted: boolean;
}

interface PreparedResource {
  id: string;
  name: string;
  type: string;
  size: string;
}

export function LiveClassSplitView() {
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [preparedResources, setPreparedResources] = useState<PreparedResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSideTab, setActiveSideTab] = useState<"resources" | "quizzes" | "attendees">("resources");
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [cameraOff, setCameraOff] = useState<boolean>(false);
  const [activeQuizLaunched, setActiveQuizLaunched] = useState<boolean>(false);

  useEffect(() => {
    async function fetchRealLiveSessionData() {
      setLoading(true);
      try {
        // 1. Cargar alumnos inscritos a sesiones en vivo desde RTDB: class_bookings o lms_live_sessions
        const bookingsSnap = await get(ref(rtdb, "class_bookings"));
        const usersSnap = await get(ref(rtdb, "users"));
        const usersVal = usersSnap.exists() ? usersSnap.val() : {};

        if (bookingsSnap.exists()) {
          const val = bookingsSnap.val();
          const list: EnrolledStudent[] = Object.keys(val).map(k => {
            const b = val[k];
            const u = usersVal[b.studentUid] || {};
            return {
              uid: b.studentUid || k,
              name: u.displayName || b.studentName || `Estudiante (${k.substring(0, 6)})`,
              email: u.email || b.studentEmail || "Sin correo",
              availableQuotas: b.availableQuotas ?? 2,
              hasConfirmedHold: b.status === "confirmed",
              quotaDeducted: true
            };
          });
          setEnrolledStudents(list);
        } else {
          setEnrolledStudents([]);
        }

        // 2. Recursos preparados (comienza limpio hasta que el docente adjunte archivos)
        setPreparedResources([]);
      } catch (err) {
        console.warn("No se pudieron cargar datos sincrónicos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRealLiveSessionData();
  }, []);

  const toggleQuotaDeduction = (uid: string) => {
    setEnrolledStudents(prev =>
      prev.map(s => {
        if (s.uid === uid) {
          return { ...s, quotaDeducted: !s.quotaDeducted };
        }
        return s;
      })
    );
  };

  const verifiedCount = enrolledStudents.filter(s => s.quotaDeducted).length;

  const handleStartLive = () => {
    if (verifiedCount === 0) {
      alert("Debes confirmar la asistencia de al menos un estudiante con cupo antes de iniciar la transmisión.");
      return;
    }
    setIsLiveActive(true);
  };

  const handleStopLive = () => {
    if (confirm("¿Deseas finalizar la sesión y cerrar la sala en vivo?")) {
      setIsLiveActive(false);
      setActiveQuizLaunched(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Header Card Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            isLiveActive ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
          }`}>
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Estudio Dividido · Sesión Sincrónica
              </h2>
              {isLiveActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  EN VIVO
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#181820] text-zinc-400 border border-white/10">
                  SALA EN ESPERA
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Control de cupos por clase sincrónica (per-class quota deduction) y visor integrado de recursos docentes.
            </p>
          </div>
        </div>

        <div>
          {!isLiveActive ? (
            <button
              onClick={handleStartLive}
              disabled={verifiedCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-emerald-600/20 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>INICIAR CLASE ({verifiedCount} Cupos Confirmados)</span>
            </button>
          ) : (
            <button
              onClick={handleStopLive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-rose-600/30"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>FINALIZAR TRANSMISIÓN</span>
            </button>
          )}
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Live Call / Quota Verification */}
        <div className="lg:col-span-8 bg-[#0e0e14] rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between text-white relative shadow-lg">
          {!isLiveActive ? (
            <div className="p-6 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-400" />
                      Validación de Cupos para la Hora Programada
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Selecciona a los estudiantes que asisten a la hora acordada. El sistema gastará 1 cupo de su saldo al iniciar.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#181820] text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
                    {verifiedCount} / {enrolledStudents.length} Asistentes
                  </span>
                </div>

                {loading ? (
                  <div className="p-16 text-center text-zinc-500 text-xs">
                    Cargando lista de inscritos...
                  </div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="p-16 text-center text-zinc-500 text-xs">
                    No hay solicitudes de cupo registradas para esta hora.
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {enrolledStudents.map((stu) => (
                      <div
                        key={stu.uid}
                        onClick={() => toggleQuotaDeduction(stu.uid)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          stu.quotaDeducted
                            ? "bg-violet-600/10 border-violet-500 shadow-xs"
                            : "bg-[#14141c] border-white/5 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={stu.quotaDeducted}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{stu.name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{stu.email}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-emerald-400">
                            {stu.availableQuotas} cupos
                          </span>
                          <div className="text-[10px] text-zinc-500">
                            {stu.quotaDeducted ? "Cupo debitado" : "Sin debitar"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 text-xs text-zinc-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Regla de Gobernanza IPT:</strong> La videollamada interactiva no arrancará transmisiones de video ni de pantalla hasta que des clic en "Iniciar Clase en Vivo".
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between p-5">
              <div className="flex-1 bg-black/80 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/30">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Transmisión Activa del Docente</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {verifiedCount} estudiantes conectados en sala sincrónica (Jitsi Meet Bridge)
                    </p>
                  </div>
                </div>

                {activeQuizLaunched && (
                  <div className="absolute top-4 right-4 bg-violet-900/90 border border-violet-400/40 p-4 rounded-xl max-w-xs shadow-xl animate-in zoom-in-95">
                    <span className="text-[10px] font-bold uppercase text-violet-200 block mb-1">
                      Quiz en Vivo Desplegado
                    </span>
                    <p className="text-xs font-bold text-white">
                      ¿Cuál es la fórmula zootécnica de presión de pastoreo en UGM/ha?
                    </p>
                    <span className="text-[10px] text-violet-300 font-mono mt-1 block">
                      Respondido: 3 / {verifiedCount} alumnos
                    </span>
                  </div>
                )}
              </div>

              {/* Call Control Strip */}
              <div className="mt-4 p-3 bg-[#14141c] rounded-xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                      micMuted ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{micMuted ? "Muteado" : "Micrófono"}</span>
                  </button>

                  <button
                    onClick={() => setCameraOff(!cameraOff)}
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                      cameraOff ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {cameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    <span>{cameraOff ? "Cámara Off" : "Cámara"}</span>
                  </button>

                  <button
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartir Pantalla</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono text-zinc-300">REC: 18:42</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Handheld Resources, Quizzes & Attendees */}
        <div className="lg:col-span-4 bg-[#121217] rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex bg-[#181820] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveSideTab("resources")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeSideTab === "resources"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Recursos Docente
              </button>
              <button
                onClick={() => setActiveSideTab("quizzes")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeSideTab === "quizzes"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Quizzes en Vivo
              </button>
              <button
                onClick={() => setActiveSideTab("attendees")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeSideTab === "attendees"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Asistentes ({verifiedCount})
              </button>
            </div>

            {activeSideTab === "resources" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  Archivos Listos para Compartir Pantalla
                </span>
                <div className="space-y-2">
                  {preparedResources.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-[#181820] border border-white/5 flex items-center justify-between text-xs hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {res.type === "xlsx" ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-bold text-white truncate">{res.name}</p>
                          <span className="text-[10px] text-zinc-500 font-mono">{res.size}</span>
                        </div>
                      </div>
                      <button className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-colors shrink-0">
                        Abrir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSideTab === "quizzes" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  Lanzador Interactivo a Mitad de Clase
                </span>
                <div className="p-4 rounded-xl bg-[#181820] border border-white/5 space-y-3">
                  <p className="text-xs font-bold text-white">
                    Quiz de Validación: Fórmulas Zootécnicas de Presión de Pastoreo
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Al activar este quiz, se desplegará instantáneamente en las pantallas de todos los alumnos presentes.
                  </p>
                  <button
                    onClick={() => setActiveQuizLaunched(!activeQuizLaunched)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      activeQuizLaunched
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
                    }`}
                  >
                    {activeQuizLaunched ? "Retirar Quiz de Pantallas" : "Lanzar a Estudiantes en Vivo"}
                  </button>
                </div>
              </div>
            )}

            {activeSideTab === "attendees" && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  Estudiantes con Cupo Consumido
                </span>
                {enrolledStudents.filter(s => s.quotaDeducted).map((stu) => (
                  <div
                    key={stu.uid}
                    className="p-3 rounded-xl bg-[#181820] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{stu.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{stu.email}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
