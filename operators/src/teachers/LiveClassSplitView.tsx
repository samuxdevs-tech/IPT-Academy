"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  PenTool,
  Download,
  Trash2,
  Hand,
  CheckCircle2,
  MessageSquare,
  Send,
  HelpCircle,
  Monitor,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  push,
} from "firebase/database";
import {
  WebRtcHostBroadcaster,
  WhiteboardStroke,
} from "@/lib/liveClassWebRtc";

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

interface LiveChatMessage {
  id: string;
  sender: string;
  role: "teacher" | "student";
  text: string;
  time: string;
}

interface RaisedHandInfo {
  uid: string;
  name: string;
  raisedAt: string;
}

export function LiveClassSplitView() {
  const [sessions, setSessions] = useState<LiveVirtualSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "quizzes" | "attendees" | "resources">("chat");

  // Transmisión Multimedia y Hardware
  const [streamMode, setStreamMode] = useState<"camera" | "screen" | "whiteboard">("camera");
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [cameraOff, setCameraOff] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Referencias a hardware y WebRTC
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const broadcasterRef = useRef<WebRtcHostBroadcaster | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Pizarra Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokeColor, setStrokeColor] = useState<string>("#8052ff");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const currentStrokePoints = useRef<Array<{ x: number; y: number }>>([]);

  // Quizzes en Vivo
  const [activeQuizLaunched, setActiveQuizLaunched] = useState<boolean>(false);
  const [quizQuestion, setQuizQuestion] = useState<string>("¿Cuál es el criterio principal de validación zootécnica para esta lección?");
  const [quizOptions, setQuizOptions] = useState<string[]>([
    "Ganancia diaria de peso (GDP) en gramos/día",
    "Aforo de praderas por encima del 40%",
    "Capacidad de carga UGM por hectárea",
    "Registro obligatorio de chapeta y microchip",
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [quizResponses, setQuizResponses] = useState<Record<string, { studentName: string; optionIndex: number }>>({});

  // Participación y Asistentes
  const [raisedHands, setRaisedHands] = useState<RaisedHandInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeViewersCount, setActiveViewersCount] = useState<number>(0);

  // 1. Escuchar sesiones en vivo, usuarios y suscripciones reales de RTDB
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

  // 2. Escuchar manos levantadas, chat y respuestas del quiz en RTDB
  useEffect(() => {
    if (!selectedSessionId) return;

    // Escuchar Manos Levantadas
    const handsRef = ref(rtdb, `live_rooms/${selectedSessionId}/hands`);
    const unsubHands = onValue(handsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: RaisedHandInfo[] = Object.keys(data).map((k) => ({
          uid: k,
          name: data[k].name || "Estudiante",
          raisedAt: data[k].raisedAt,
        }));
        setRaisedHands(list);
      } else {
        setRaisedHands([]);
      }
    });

    // Escuchar Chat en Vivo
    const chatRef = ref(rtdb, `live_rooms/${selectedSessionId}/chat`);
    const unsubChat = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: LiveChatMessage[] = Array.isArray(data)
          ? data.filter(Boolean)
          : Object.keys(data).map((k) => ({ id: k, ...data[k] }));
        setChatMessages(list);
      } else {
        setChatMessages([]);
      }
    });

    // Escuchar Respuestas del Quiz en Vivo
    const quizRespRef = ref(rtdb, `active_live_quiz/responses`);
    const unsubQuizResp = onValue(quizRespRef, (snap) => {
      if (snap.exists()) {
        setQuizResponses(snap.val() || {});
      } else {
        setQuizResponses({});
      }
    });

    return () => {
      unsubHands();
      unsubChat();
      unsubQuizResp();
    };
  }, [selectedSessionId]);

  // 3. Timer de transmisión activa
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

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const verifiedCount = enrolledStudents.filter((s) => s.quotaDeducted).length;

  // 4. Iniciar Transmisión Magistral WebRTC
  const handleStartLive = async () => {
    if (!selectedSessionId) {
      alert("Por favor selecciona una sesión válida.");
      return;
    }

    try {
      // 1. Obtener captura de Hardware (Cámara + Micrófono)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }

      // 2. Inicializar Broadcaster WebRTC
      const broadcaster = new WebRtcHostBroadcaster(selectedSessionId);
      broadcaster.setStream(stream);
      broadcaster.listenForViewers((viewers) => {
        const count = Object.values(viewers).filter((v: any) => v?.status === "active").length;
        setActiveViewersCount(count);
      });

      await broadcaster.publishHostState({
        isLive: true,
        sessionId: selectedSessionId,
        sessionTitle: selectedSession?.title || "Clase Magistral IPT",
        instructorName: selectedSession?.instructorName || "Docente IPT",
        streamMode: "camera",
        micMuted: false,
        cameraOff: false,
        viewerCount: 0,
        startedAt: new Date().toISOString(),
      });

      broadcasterRef.current = broadcaster;

      // 3. Inicializar MediaRecorder para grabación local si el navegador lo soporta
      try {
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          setRecordedChunks(chunks);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (recErr) {
        console.warn("MediaRecorder no soportado en esta resolución o navegador:", recErr);
      }

      // 4. Actualizar estado de la sesión en RTDB
      await update(ref(rtdb, `lms_live_sessions/${selectedSessionId}`), {
        cloudRecordingState: "processing",
        isLiveNow: true,
      });

      setIsLiveActive(true);
      setStreamMode("camera");
    } catch (err: any) {
      console.error("Error al iniciar transmisión WebRTC:", err);
      alert(`No se pudo acceder a la cámara o micrófono: ${err.message || err}`);
    }
  };

  // 5. Finalizar Transmisión y Limpieza
  const handleStopLive = async () => {
    if (!confirm("¿Deseas finalizar la sesión magistral y cerrar la sala en vivo?")) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (broadcasterRef.current) {
      await broadcasterRef.current.cleanup();
      broadcasterRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (selectedSessionId) {
      try {
        await update(ref(rtdb, `lms_live_sessions/${selectedSessionId}`), {
          cloudRecordingState: "ready",
          isLiveNow: false,
        });
        await update(ref(rtdb, `live_rooms/${selectedSessionId}/host`), {
          isLive: false,
        });
        await set(ref(rtdb, "active_live_quiz"), { active: false });
      } catch (err) {
        console.warn("Error al actualizar fin de sesión en RTDB:", err);
      }
    }

    setIsLiveActive(false);
    setActiveQuizLaunched(false);
  };

  // 6. Conmutar a Compartir Pantalla
  const handleSwitchToScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      // Conservar el audio del micrófono si existe
      if (mediaStreamRef.current) {
        const audioTracks = mediaStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0 && screenStream.getAudioTracks().length === 0) {
          screenStream.addTrack(audioTracks[0]);
        }
      }

      mediaStreamRef.current = screenStream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = screenStream;
      }

      if (broadcasterRef.current) {
        broadcasterRef.current.setStream(screenStream);
        await broadcasterRef.current.publishHostState({ streamMode: "screen" });
      }

      setStreamMode("screen");

      // Si el docente detiene el screen share desde la barra del navegador
      screenStream.getVideoTracks()[0].onended = () => {
        handleSwitchToCamera();
      };
    } catch (err) {
      console.warn("Pantalla compartida cancelada:", err);
    }
  };

  // 7. Conmutar a Cámara
  const handleSwitchToCamera = async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      mediaStreamRef.current = camStream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = camStream;
      }

      if (broadcasterRef.current) {
        broadcasterRef.current.setStream(camStream);
        await broadcasterRef.current.publishHostState({ streamMode: "camera" });
      }

      setStreamMode("camera");
    } catch (err) {
      console.warn("Error al conmutar a cámara:", err);
    }
  };

  // 8. Conmutar a Modo Pizarra Digital
  const handleSwitchToWhiteboard = async () => {
    setStreamMode("whiteboard");
    if (broadcasterRef.current) {
      await broadcasterRef.current.publishHostState({ streamMode: "whiteboard" });
    }
  };

  // 9. Alternar Micrófono
  const toggleMic = () => {
    if (!mediaStreamRef.current) return;
    const nextState = !micMuted;
    mediaStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextState;
    });
    setMicMuted(nextState);
    if (broadcasterRef.current) {
      broadcasterRef.current.publishHostState({ micMuted: nextState });
    }
  };

  // 10. Alternar Video Cámara
  const toggleCamera = () => {
    if (!mediaStreamRef.current) return;
    const nextState = !cameraOff;
    mediaStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextState;
    });
    setCameraOff(nextState);
    if (broadcasterRef.current) {
      broadcasterRef.current.publishHostState({ cameraOff: nextState });
    }
  };

  // 11. Descargar Grabación de la Sesión
  const handleDownloadRecording = () => {
    if (recordedChunks.length === 0) {
      alert("No hay fragmentos grabados disponibles aún.");
      return;
    }
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clase-en-vivo-ipt-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 12. Pizarra: Dibujo y Sincronización en Tiempo Real
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    currentStrokePoints.current = [{ x, y }];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.strokeStyle = strokeColor === "eraser" ? "#0a0a0f" : strokeColor;
    ctx.lineWidth = strokeColor === "eraser" ? 24 : strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    currentStrokePoints.current.push({ x, y });
  };

  const stopDrawing = () => {
    if (isDrawing && currentStrokePoints.current.length > 1 && broadcasterRef.current) {
      broadcasterRef.current.broadcastWhiteboardStroke({
        color: strokeColor === "eraser" ? "#0a0a0f" : strokeColor,
        width: strokeColor === "eraser" ? 24 : strokeWidth,
        points: currentStrokePoints.current,
      });
    }
    setIsDrawing(false);
    currentStrokePoints.current = [];
  };

  const handleClearWhiteboard = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (broadcasterRef.current) {
      await broadcasterRef.current.clearWhiteboard();
    }
  };

  // 13. Lanzador y Gestión de Quizzes en Vivo
  const handleToggleQuiz = async () => {
    const nextState = !activeQuizLaunched;
    setActiveQuizLaunched(nextState);

    try {
      if (nextState) {
        await set(ref(rtdb, "active_live_quiz"), {
          active: true,
          sessionId: selectedSessionId,
          question: quizQuestion,
          options: quizOptions,
          correctOptionIndex,
          launchedAt: new Date().toISOString(),
        });
        await remove(ref(rtdb, "active_live_quiz/responses"));
      } else {
        await set(ref(rtdb, "active_live_quiz"), {
          active: false,
        });
      }
    } catch (err) {
      console.warn("No se pudo sincronizar el quiz en vivo:", err);
    }
  };

  // 14. Bajar Manos Levantadas
  const handleClearHands = async () => {
    if (!selectedSessionId) return;
    try {
      await remove(ref(rtdb, `live_rooms/${selectedSessionId}/hands`));
    } catch (err) {
      console.warn("Error clearing hands:", err);
    }
  };

  // 15. Enviar Mensaje de Chat Docente
  const handleSendTeacherChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedSessionId) return;

    try {
      const chatRef = push(ref(rtdb, `live_rooms/${selectedSessionId}/chat`));
      await set(chatRef, {
        sender: selectedSession?.instructorName || "Docente IPT",
        role: "teacher",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
      });
      setChatInput("");
    } catch (err) {
      console.warn("Error enviando mensaje docente:", err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Cálculo de votos del quiz en vivo
  const totalQuizVotes = Object.keys(quizResponses).length;
  const quizVoteCounts = useMemo(() => {
    const counts = [0, 0, 0, 0];
    Object.values(quizResponses).forEach((r) => {
      if (typeof r.optionIndex === "number" && r.optionIndex >= 0 && r.optionIndex < 4) {
        counts[r.optionIndex]++;
      }
    });
    return counts;
  }, [quizResponses]);

  return (
    <div className="space-y-6">
      {/* Session Header Card Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isLiveActive
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
            }`}
          >
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Estudio Dividido · Sala Magistral WebRTC
              </h2>
              {isLiveActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  <Radio className="w-3 h-3 animate-ping" />
                  EN VIVO ({activeViewersCount} Alumnos Conectados)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#181820] text-zinc-400 border border-white/10">
                  SALA EN ESPERA
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Transmisión P2P en alta definición desde tu navegador con pizarra digital, quizzes en vivo y control de cupos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessions.length > 0 && !isLiveActive && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 bg-[#181820] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}

          {!isLiveActive ? (
            <button
              onClick={handleStartLive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>INICIAR TRANSMISIÓN EN VIVO</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {recordedChunks.length > 0 && (
                <button
                  onClick={handleDownloadRecording}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all"
                  title="Descargar grabación de la clase en video"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Video</span>
                </button>
              )}
              <button
                onClick={handleStopLive}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>FINALIZAR CLASE</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column: Live Video Canvas & Transmission Controls */}
        <div className="lg:col-span-8 bg-[#0a0a0f] rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between text-white relative shadow-xl">
          {!isLiveActive ? (
            <div className="p-6 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-400" />
                      Validación de Estudiantes Matriculados y Reserva de Cupos
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Verifica los alumnos habilitados para ingresar a la sala. Los créditos se descuentan de forma transparente.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#181820] text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
                    {verifiedCount} / {enrolledStudents.length} Alumnos Listos
                  </span>
                </div>

                {loading ? (
                  <div className="p-16 text-center text-zinc-500 text-xs">
                    Cargando nómina de estudiantes en vivo...
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
                        className="p-4 rounded-xl border border-white/5 bg-[#14141c] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-xs font-bold text-white">{stu.name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{stu.email}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-emerald-400 uppercase">
                            Plan {stu.planId} · {stu.availableQuotas} créditos
                          </span>
                          <div className="text-[10px] text-zinc-500">Acceso Autorizado</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 text-xs text-zinc-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>Transmisión Directa:</strong> Al hacer clic en <em>Iniciar Transmisión</em>, tu cámara y micrófono comenzarán a emitirse en tiempo real. Los estudiantes verán el indicador de transmisión en su portal sin requerir enlaces externos.
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between p-5 space-y-4">
              {/* Barra de Modos de Transmisión */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14141c] p-2 rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSwitchToCamera}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      streamMode === "camera"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Cámara Web</span>
                  </button>

                  <button
                    onClick={handleSwitchToScreenShare}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      streamMode === "screen"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Compartir Pantalla</span>
                  </button>

                  <button
                    onClick={handleSwitchToWhiteboard}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      streamMode === "whiteboard"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Pizarra Digital</span>
                  </button>
                </div>

                {raisedHands.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-bold animate-pulse">
                    <Hand className="w-4 h-4" />
                    <span>{raisedHands.length} Alumno(s) con la mano levantada</span>
                    <button
                      onClick={handleClearHands}
                      className="ml-2 text-[10px] underline text-amber-200 hover:text-white cursor-pointer"
                    >
                      Bajar
                    </button>
                  </div>
                )}
              </div>

              {/* Visor Central: Video Stream o Pizarra */}
              <div className="flex-1 bg-black rounded-xl border border-white/10 relative overflow-hidden min-h-[440px] flex items-center justify-center">
                {streamMode !== "whiteboard" ? (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-between p-3 bg-[#09090e]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <PenTool className="w-4 h-4 text-violet-400" />
                        <span>Pizarra Sincronizada en Tiempo Real (Tus trazos se replican en los alumnos)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {["#ffffff", "#8052ff", "#ffb829", "#10b981"].map((color) => (
                          <button
                            key={color}
                            onClick={() => setStrokeColor(color)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              strokeColor === color ? "scale-125 border-white" : "border-transparent opacity-80"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <button
                          onClick={() => setStrokeColor("eraser")}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                            strokeColor === "eraser"
                              ? "bg-rose-600 text-white border-rose-500"
                              : "bg-white/10 text-zinc-400 border-white/10"
                          }`}
                        >
                          Borrador
                        </button>
                        <button
                          onClick={handleClearWhiteboard}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-white/10 hover:bg-rose-600/30 text-rose-300 border border-white/10 cursor-pointer"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full h-full bg-[#0d0d14] rounded-lg border border-white/5 cursor-crosshair touch-none"
                    />
                  </div>
                )}

                {/* Badge Flotante del Quiz Activo */}
                {activeQuizLaunched && (
                  <div className="absolute top-4 right-4 bg-violet-950/95 border border-violet-400/50 p-4 rounded-2xl max-w-sm shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        Quiz Activo en Pantallas
                      </span>
                      <span className="text-[10px] font-mono bg-violet-900/60 px-2 py-0.5 rounded text-violet-200">
                        {totalQuizVotes} Votos
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mb-3">{quizQuestion}</p>

                    <div className="space-y-1.5">
                      {quizOptions.map((opt, idx) => {
                        const count = quizVoteCounts[idx] || 0;
                        const pct = totalQuizVotes > 0 ? Math.round((count / totalQuizVotes) * 100) : 0;
                        const isCorrect = idx === correctOptionIndex;
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between text-[10px]">
                              <span className={isCorrect ? "font-bold text-emerald-300" : "text-zinc-300"}>
                                {String.fromCharCode(65 + idx)}. {opt}
                              </span>
                              <span className="font-mono text-zinc-400">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCorrect ? "bg-emerald-500" : "bg-violet-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tira Inferior de Controles Multimedia */}
              <div className="p-3.5 bg-[#14141c] rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={toggleMic}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      micMuted ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{micMuted ? "Micrófono Silenciado" : "Micrófono Activo"}</span>
                  </button>

                  <button
                    onClick={toggleCamera}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      cameraOff ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {cameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    <span>{cameraOff ? "Cámara Pausada" : "Cámara Transmitiendo"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  {isRecording && (
                    <div className="flex items-center gap-2 bg-rose-600/20 border border-rose-500/30 px-3 py-1 rounded-lg text-rose-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>GRABANDO: {formatTimer(elapsedSeconds)}</span>
                    </div>
                  )}
                  <span className="text-zinc-400">Espectadores: {activeViewersCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat en Vivo, Quizzes, Asistentes y Recursos */}
        <div className="lg:col-span-4 bg-[#121217] rounded-2xl border border-white/10 p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Pestañas Laterales */}
            <div className="grid grid-cols-4 bg-[#181820] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveSideTab("chat")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === "chat"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveSideTab("quizzes")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === "quizzes"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Quiz</span>
              </button>
              <button
                onClick={() => setActiveSideTab("attendees")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === "attendees"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Alumnos</span>
              </button>
              <button
                onClick={() => setActiveSideTab("resources")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSideTab === "resources"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Guías</span>
              </button>
            </div>

            {/* PESTAÑA 1: CHAT EN VIVO MAGISTRAL */}
            {activeSideTab === "chat" && (
              <div className="flex-1 flex flex-col justify-between space-y-3 min-h-[360px]">
                <div className="flex-1 max-h-[420px] overflow-y-auto space-y-2 pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">
                      El chat de la clase está listo. Los mensajes y preguntas de los alumnos aparecerán aquí en vivo.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl border text-xs ${
                          msg.role === "teacher"
                            ? "bg-violet-600/15 border-violet-500/30 text-white"
                            : "bg-[#181820] border-white/5 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                          <span className={`font-bold ${msg.role === "teacher" ? "text-violet-300" : "text-white"}`}>
                            {msg.sender} {msg.role === "teacher" && "(Docente)"}
                          </span>
                          <span className="font-mono">{msg.time}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendTeacherChat} className="flex gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe una indicación a los alumnos..."
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* PESTAÑA 2: QUIZZES EN VIVO */}
            {activeSideTab === "quizzes" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Configurador de Quiz Interactivo
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Pregunta:</label>
                    <input
                      type="text"
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-zinc-400 block">Opciones (Marca la correcta):</label>
                    {quizOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={correctOptionIndex === idx}
                          onChange={() => setCorrectOptionIndex(idx)}
                          className="text-violet-600 focus:ring-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...quizOptions];
                            updated[idx] = e.target.value;
                            setQuizOptions(updated);
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleToggleQuiz}
                    disabled={!isLiveActive}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isLiveActive
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : activeQuizLaunched
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
                    }`}
                  >
                    {!isLiveActive
                      ? "Inicia la clase para lanzar el quiz"
                      : activeQuizLaunched
                      ? "Retirar Quiz de las Pantallas"
                      : "Lanzar Quiz a Estudiantes Ahora"}
                  </button>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: ASISTENTES REALES */}
            {activeSideTab === "attendees" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Conectados ({activeViewersCount})
                  </span>
                  {raisedHands.length > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      {raisedHands.length} Manos Levantadas
                    </span>
                  )}
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                  {enrolledStudents.map((stu) => {
                    const isHandRaised = raisedHands.some((h) => h.uid === stu.uid);
                    return (
                      <div
                        key={stu.uid}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isHandRaised
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                            : "bg-[#181820] border-white/5 text-zinc-300"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {stu.name}
                            {isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">{stu.email}</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PESTAÑA 4: GUÍAS Y RECURSOS */}
            {activeSideTab === "resources" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Material y Referencias Docente
                </span>
                <div className="p-4 rounded-xl bg-[#181820] border border-white/5 space-y-3 text-xs">
                  <p className="text-zinc-400">
                    Recursos oficiales sincronizados para acompañar la cátedra magistral en vivo:
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                      <span className="font-medium text-white truncate">Guía Zootécnica DataGan 360</span>
                      <span className="text-[10px] text-zinc-400 font-mono">DOCX</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                      <span className="font-medium text-white truncate">Calculadora de Aforo y UGM</span>
                      <span className="text-[10px] text-zinc-400 font-mono">XLSX</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
