"use client";

import React, { useState, useEffect } from "react";
import {
  Video,
  Play,
  Users,
  AlertCircle,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  Square,
  Radio,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, update, onValue } from "firebase/database";

interface EnrolledStudent {
  uid: string;
  name: string;
  email: string;
  planId: string;
  availableQuotas: number;
  hasConfirmedHold: boolean;
  quotaDeducted: boolean;
}

interface LiveVirtualSession {
  id: string;
  title: string;
  courseSlug: string;
  moduleId?: string;
  instructorName: string;
  provider: "zoom" | "teams" | "google_meet" | "jitsi";
  joinUrl: string;
  startTimeUtc: string;
  durationMinutes: number;
  cloudRecordingUrl?: string;
  cloudRecordingState?: "processing" | "ready" | "none" | "scheduled";
}

export function LiveClassSplitView() {
  const [sessions, setSessions] = useState<LiveVirtualSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSideTab, setActiveSideTab] = useState<"resources" | "quizzes" | "attendees">("resources");
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [cameraOff, setCameraOff] = useState<boolean>(false);
  const [activeQuizLaunched, setActiveQuizLaunched] = useState<boolean>(false);
  const [quizQuestion, setQuizQuestion] = useState<string>("¿Cuál es el criterio principal de validación para esta lección?");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Escuchar sesiones en vivo, usuarios y suscripciones reales de RTDB
  useEffect(() => {
    const sessionsRef = ref(rtdb, "lms_live_sessions");
    const usersRef = ref(rtdb, "users");
    const subsRef = ref(rtdb, "lms_subscriptions");

    let rawUsers: Record<string, any> = {};
    let rawSubs: Record<string, any> = {};

    const recomputeStudents = () => {
      const list: EnrolledStudent[] = Object.keys(rawUsers)
        .map((k) => {
          const u = rawUsers[k] || {};
          const profile = u.profile || {};
          const consent = u.legalConsent || {};
          const sub = rawSubs[k] || {};
          const userEmail = profile.email || u.email || consent.email || "";
          const userName =
            profile.displayName ||
            u.displayName ||
            u.name ||
            consent.displayName ||
            (userEmail ? userEmail.split("@")[0] : "") ||
            `Estudiante (${k.slice(0, 6)})`;

          return {
            uid: k,
            name: userName,
            email: userEmail || "Sin correo",
            planId: sub.planId || "free",
            availableQuotas: Number(sub.remainingCredits ?? u.availableQuotas ?? 1),
            hasConfirmedHold: true,
            quotaDeducted: true,
          };
        })
        .filter(
          (s) =>
            !s.email.toLowerCase().includes("administrator@ivanperez.tech") &&
            !s.email.toLowerCase().includes("docente@")
        );

      setEnrolledStudents(list);
      setLoading(false);
    };

    const unsubSessions = onValue(sessionsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: LiveVirtualSession[] = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.keys(val).map((k) => ({ ...val[k], id: val[k].id || k }));
        setSessions(list);
        if (list.length > 0 && !selectedSessionId) {
          setSelectedSessionId(list[0].id);
        }
      } else {
        setSessions([]);
      }
    });

    const unsubUsers = onValue(usersRef, (snap) => {
      rawUsers = snap.exists() ? snap.val() : {};
      recomputeStudents();
    });

    const unsubSubs = onValue(subsRef, (snap) => {
      rawSubs = snap.exists() ? snap.val() : {};
      recomputeStudents();
    });

    return () => {
      unsubSessions();
      unsubUsers();
      unsubSubs();
    };
  }, []);

  // Timer de transmisión activa
  useEffect(() => {
    let timer: any;
    if (isLiveActive) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isLiveActive]);

  const toggleQuotaDeduction = (uid: string) => {
    setEnrolledStudents((prev) =>
      prev.map((s) => {
        if (s.uid === uid) {
          return { ...s, quotaDeducted: !s.quotaDeducted };
        }
        return s;
      })
    );
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const verifiedCount = enrolledStudents.filter((s) => s.quotaDeducted).length;

  const handleStartLive = async () => {
    if (verifiedCount === 0 && enrolledStudents.length > 0) {
      alert("Debes confirmar la asistencia de al menos un estudiante con cupo antes de iniciar la transmisión.");
      return;
    }

    if (selectedSessionId) {
      try {
        await update(ref(rtdb, `lms_live_sessions/${selectedSessionId}`), {
          cloudRecordingState: "processing",
        });
      } catch (err) {
        console.warn("No se pudo actualizar estado de sesión en RTDB:", err);
      }
    }

    setIsLiveActive(true);
  };

  const handleStopLive = async () => {
    if (confirm("¿Deseas finalizar la sesión y cerrar la sala en vivo?")) {
      setIsLiveActive(false);
      setActiveQuizLaunched(false);

      if (selectedSessionId) {
        try {
          await update(ref(rtdb, `lms_live_sessions/${selectedSessionId}`), {
            cloudRecordingState: "ready",
          });
        } catch (err) {
          console.warn("No se pudo actualizar estado de sesión finalizada:", err);
        }
      }
    }
  };

  const handleToggleQuiz = async () => {
    const nextState = !activeQuizLaunched;
    setActiveQuizLaunched(nextState);

    try {
      if (nextState) {
        await set(ref(rtdb, "active_live_quiz"), {
          active: true,
          sessionId: selectedSessionId,
          question: quizQuestion,
          launchedAt: new Date().toISOString(),
        });
      } else {
        await set(ref(rtdb, "active_live_quiz"), {
          active: false,
        });
      }
    } catch (err) {
      console.warn("No se pudo sincronizar el quiz en vivo:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Header Card Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isLiveActive
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
            }`}
          >
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Estudio Dividido · Sesión Sincrónica
              </h2>
              {isLiveActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  <Radio className="w-3 h-3 animate-ping" />
                  EN VIVO
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#181820] text-zinc-400 border border-white/10">
                  SALA EN ESPERA
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Control de cupos por clase sincrónica, visor de asistentes reales de ipt-course y lanzamiento de quizzes en vivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessions.length > 0 && !isLiveActive && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 bg-[#181820] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.provider})
                </option>
              ))}
            </select>
          )}

          {!isLiveActive ? (
            <button
              onClick={handleStartLive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>INICIAR CLASE ({verifiedCount} Asistentes)</span>
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
                      Validación de Asistencia de Estudiantes en Base de Datos
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Verifica a los alumnos que participarán en esta sesión. Los datos se leen en vivo de /users y /lms_subscriptions.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#181820] text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
                    {verifiedCount} / {enrolledStudents.length} Asistentes
                  </span>
                </div>

                {loading ? (
                  <div className="p-16 text-center text-zinc-500 text-xs">
                    Cargando lista de estudiantes de IPT Academy...
                  </div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="p-16 text-center text-zinc-500 text-xs">
                    No hay estudiantes registrados en la plataforma en este momento.
                  </div>
                ) : (
                  <div className="mt-5 space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                          <span className="text-xs font-bold text-emerald-400 uppercase">
                            Plan {stu.planId} · {stu.availableQuotas} créditos
                          </span>
                          <div className="text-[10px] text-zinc-500">
                            {stu.quotaDeducted ? "Confirmado" : "Sin confirmar"}
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
                  <strong>Sesión Conectada:</strong> Al iniciar, el estado en tiempo real cambiará en la plataforma estudiantil para permitir el ingreso inmediato.
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between p-5">
              <div className="flex-1 bg-black/80 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden min-h-[420px]">
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 animate-pulse">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Transmisión Activa del Docente</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {selectedSession ? selectedSession.title : "Sesión Sincrónica en Directo"}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {verifiedCount} estudiantes con acceso autorizado
                    </p>
                  </div>

                  {selectedSession?.joinUrl && (
                    <a
                      href={selectedSession.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                    >
                      Abrir Sala Virtual ({selectedSession.provider})
                    </a>
                  )}
                </div>

                {activeQuizLaunched && (
                  <div className="absolute top-4 right-4 bg-violet-950/90 border border-violet-400/40 p-4 rounded-xl max-w-xs shadow-xl animate-in zoom-in-95">
                    <span className="text-[10px] font-bold uppercase text-violet-200 block mb-1">
                      Quiz en Vivo Desplegado
                    </span>
                    <p className="text-xs font-bold text-white">{quizQuestion}</p>
                    <span className="text-[10px] text-violet-300 font-mono mt-1 block">
                      Enviado a {verifiedCount} estudiantes
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

                  <button className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span>Compartir Pantalla</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono text-zinc-300">REC: {formatTimer(elapsedSeconds)}</span>
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
                Recursos
              </button>
              <button
                onClick={() => setActiveSideTab("quizzes")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  activeSideTab === "quizzes"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Quizzes
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
                  Material y Referencias Docente
                </span>
                <div className="p-4 rounded-xl bg-[#181820] border border-white/5 space-y-3 text-xs">
                  <p className="text-zinc-400">
                    Sube o enlaza recursos para acompañar la clase en vivo. Todos los enlaces se comparten automáticamente con los estudiantes en sesión.
                  </p>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="font-medium text-white truncate">Guía de Prácticas y Metodología IPT</span>
                    <span className="text-[10px] text-zinc-500 font-mono">PDF</span>
                  </div>
                </div>
              </div>
            )}

            {activeSideTab === "quizzes" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  Lanzador Interactivo en Vivo
                </span>
                <div className="p-4 rounded-xl bg-[#181820] border border-white/5 space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Pregunta del Quiz en Vivo:</label>
                    <input
                      type="text"
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Al activar este quiz, se desplegará instantáneamente en las pantallas de todos los alumnos presentes.
                  </p>
                  <button
                    onClick={handleToggleQuiz}
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
                  Estudiantes con Acceso Confirmado
                </span>
                <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
                  {enrolledStudents
                    .filter((s) => s.quotaDeducted)
                    .map((stu) => (
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
