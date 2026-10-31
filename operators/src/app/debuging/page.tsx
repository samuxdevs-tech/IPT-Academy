"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Radio,
  Users,
  Play,
  Square,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  Hand,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, update, onValue, push } from "firebase/database";
import { generateSessionCode8 } from "@/lib/creditLiveSystem/creditHashCore";

interface AllowedStudent {
  studentUid: string;
  studentName: string;
  signature: string; // {id}: {Hash}
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export default function OperatorLiveDebuggingPage() {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [sessionMode, setSessionMode] = useState<"fixed" | "manual">("fixed");
  const [copied, setCopied] = useState(false);

  // List of allowed students
  const [allowedStudents, setAllowedStudents] = useState<AllowedStudent[]>([
    {
      studentUid: "student-ivan-samuel",
      studentName: "Iván Samuel Pérez",
      signature: "cls_live_01: a7f8c9b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
    },
    {
      studentUid: "student-demo-guest",
      studentName: "Estudiante Invitado IPT",
      signature: "cls_live_02: 9b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0a7f8c",
    },
  ]);
  const [manualInputUid, setManualInputUid] = useState("");
  const [manualInputName, setManualInputName] = useState("");

  // Connected students & Raised hands
  const [connectedStudents, setConnectedStudents] = useState<string[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, { name: string; timestamp: number }>>({});

  // Media States
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const unsubViewersRef = useRef<(() => void) | null>(null);

  // Helper to establish WebRTC with student
  const connectToStudent = useCallback(
    async (studentUid: string, code8: string) => {
      if (peerConnections.current.has(studentUid)) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(studentUid, pc);

      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Send local ICE candidates to RTDB
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const iceRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/teacherIce`);
          push(iceRef, JSON.stringify(event.candidate));
        }
      };

      // Create Offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const offerRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/offer`);
        await set(offerRef, {
          type: offer.type,
          sdp: offer.sdp,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("Error creating WebRTC offer for student:", studentUid, err);
      }

      // Listen for Answer
      const answerRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/answer`);
      const unsubAnswer = onValue(answerRef, async (snapshot) => {
        const data = snapshot.val();
        if (data && data.sdp && pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
          } catch (err) {
            console.warn("Error setting remote description from answer:", err);
          }
        }
      });

      // Listen for Student ICE Candidates
      const studentIceRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/studentIce`);
      const unsubIce = onValue(studentIceRef, (snapshot) => {
        const candidates = snapshot.val();
        if (candidates) {
          Object.values(candidates).forEach(async (candidateStr: any) => {
            try {
              const candidate = JSON.parse(candidateStr);
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              // Ignore duplicate/early candidates
            }
          });
        }
      });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          unsubAnswer();
          unsubIce();
          peerConnections.current.delete(studentUid);
        }
      };
    },
    []
  );

  // Iniciar Clase -> Genera el Código de 8 Dígitos y Namespace Temporal
  const startLiveClass = async () => {
    const code8 = generateSessionCode8();
    setSessionCode(code8);
    setIsLive(true);

    const sessionRef = ref(rtdb, `liveSessions/${code8}`);
    await set(sessionRef, {
      sessionCode8: code8,
      teacherUid: "teacher-main-admin",
      teacherName: "Docente IPT (Administrador)",
      courseTitle: "IPT Course — Clase Magistral En Vivo",
      mode: sessionMode,
      status: "live",
      startedAt: Date.now(),
      allowed_live_students: allowedStudents.reduce((acc, curr) => {
        acc[curr.studentUid] = {
          studentName: curr.studentName,
          signature: curr.signature,
          allowedAt: Date.now(),
        };
        return acc;
      }, {} as Record<string, any>),
    });

    console.log(`[Operators Live] Sesión creada con namespace: liveSessions/${code8}`);
  };

  // Finalizar Clase
  const endLiveClass = async () => {
    if (!sessionCode) return;
    if (confirm("¿Estás seguro de finalizar la clase? Se destruirá el namespace temporal.")) {
      const sessionRef = ref(rtdb, `liveSessions/${sessionCode}`);
      await update(sessionRef, { status: "ended", endedAt: Date.now() });

      // Clean media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setMicActive(false);
      setCameraActive(false);
      setScreenActive(false);
      setIsLive(false);
      setSessionCode(null);
      setConnectedStudents([]);
      setRaisedHands({});
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
    }
  };

  // Listeners de señalización y manos alzadas cuando está en vivo
  useEffect(() => {
    if (!isLive || !sessionCode) return;

    // Escuchar manos alzadas
    const handsRef = ref(rtdb, `liveSessions/${sessionCode}/raisedHands`);
    const unsubHands = onValue(handsRef, (snapshot) => {
      const val = snapshot.val();
      setRaisedHands(val || {});
    });

    // Escuchar alumnos conectados y conectar WebRTC automáticamente
    const viewersRef = ref(rtdb, `liveSessions/${sessionCode}/viewers`);
    const unsubViewers = onValue(viewersRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const uids = Object.keys(val);
        setConnectedStudents(uids);
        uids.forEach((uid) => connectToStudent(uid, sessionCode));
      } else {
        setConnectedStudents([]);
      }
    });
    unsubViewersRef.current = unsubViewers;

    return () => {
      unsubHands();
      unsubViewers();
    };
  }, [isLive, sessionCode, connectToStudent]);

  // Actualizar tracks en todos los peers cuando cambia el stream local
  const updateTracksInPeers = (newStream: MediaStream) => {
    peerConnections.current.forEach((pc) => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track);
        } else {
          pc.addTrack(track, newStream);
        }
      });
    });
  };

  // Toggle Camera
  const toggleCamera = async () => {
    try {
      if (cameraActive) {
        localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
        setCameraActive(false);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: micActive,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraActive(true);
        updateTracksInPeers(stream);
      }
    } catch (err) {
      console.warn("Error con la cámara:", err);
      alert("No se pudo iniciar la cámara en el navegador.");
    }
  };

  // Toggle Mic
  const toggleMic = async () => {
    try {
      if (micActive) {
        localStreamRef.current?.getAudioTracks().forEach((t) => t.stop());
        setMicActive(false);
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (localStreamRef.current) {
          audioStream.getAudioTracks().forEach((track) => {
            localStreamRef.current?.addTrack(track);
          });
          updateTracksInPeers(localStreamRef.current);
        } else {
          localStreamRef.current = audioStream;
          updateTracksInPeers(audioStream);
        }
        setMicActive(true);
      }
    } catch (err) {
      console.warn("Error con el micrófono:", err);
    }
  };

  // Toggle Screen
  const toggleScreen = async () => {
    try {
      if (screenActive) {
        localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
        setScreenActive(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setScreenActive(true);
        updateTracksInPeers(stream);
        stream.getVideoTracks()[0].onended = () => {
          setScreenActive(false);
        };
      }
    } catch (err) {
      console.warn("Error compartiendo pantalla:", err);
    }
  };

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addManualStudent = () => {
    if (!manualInputUid.trim()) return;
    const newStud: AllowedStudent = {
      studentUid: manualInputUid.trim(),
      studentName: manualInputName.trim() || manualInputUid.trim(),
      signature: `manual_grant_${Date.now()}: sha256_operator_authorized`,
    };
    setAllowedStudents((prev) => [...prev, newStud]);
    setManualInputUid("");
    setManualInputName("");
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 p-6 font-sans">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">IPT Course — Teacher Studio</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ac-administrator /debuging
              </span>
            </div>
            <p className="text-xs text-zinc-400">Canal de emisión WebRTC y orquestador protegido por firmas de crédito</p>
          </div>
        </div>

        {isLive && sessionCode && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>EN VIVO</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs">
              <span className="text-zinc-500">Namespace:</span>
              <span className="font-mono text-blue-400 font-bold">{sessionCode}</span>
              <button onClick={copyCode} className="text-zinc-400 hover:text-white ml-1">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column: Video Stage / Broadcaster */}
        <section className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video w-full rounded-3xl bg-zinc-950/80 border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive || screenActive ? "block" : "hidden"}`}
            />

            {!cameraActive && !screenActive && (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-3">
                  <Radio className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {isLive ? "Transmisión en espera de cámara o pantalla" : "Estudio de Emisión Inactivo"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  {isLive
                    ? "Activa tu cámara o comparte tu pantalla con los controles inferiores."
                    : "Presiona 'Iniciar Clase' para generar el código de sesión de 8 dígitos y abrir el namespace."}
                </p>
              </div>
            )}

            {/* Live Indicator overlay */}
            {isLive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-white border border-white/10">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{connectedStudents.length} estudiantes conectados</span>
              </div>
            )}

            {/* Raised Hand alert pill inside stage */}
            {Object.keys(raisedHands).length > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold shadow-lg animate-bounce">
                <Hand className="w-3.5 h-3.5" />
                <span>{Object.keys(raisedHands).length} mano(s) alzada(s)</span>
              </div>
            )}
          </div>

          {/* Broadcaster Controls Bar */}
          <div className="flex items-center justify-between p-4 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMic}
                disabled={!isLive}
                title={micActive ? "Silenciar micrófono" : "Activar micrófono"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  micActive
                    ? "bg-zinc-800 text-white hover:bg-zinc-700"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                } disabled:opacity-40`}
              >
                {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCamera}
                disabled={!isLive}
                title={cameraActive ? "Apagar cámara" : "Prender cámara"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  cameraActive
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(0,113,227,0.5)]"
                    : "bg-zinc-800 text-zinc-300 hover:text-white"
                } disabled:opacity-40`}
              >
                {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleScreen}
                disabled={!isLive}
                title={screenActive ? "Dejar de compartir pantalla" : "Compartir pantalla"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  screenActive
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(0,113,227,0.5)]"
                    : "bg-zinc-800 text-zinc-300 hover:text-white"
                } disabled:opacity-40`}
              >
                {screenActive ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
              </button>
            </div>

            {/* Launch / End Button */}
            <div>
              {!isLive ? (
                <button
                  onClick={startLiveClass}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Clase (Código 8 Dígitos)</span>
                </button>
              ) : (
                <button
                  onClick={endLiveClass}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Finalizar Clase y Cerrar Sala</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Allowed Students & Security Gate */}
        <aside className="space-y-4">
          {/* Mode Selector */}
          <div className="p-4 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Modo de Allowed List</span>
              </span>
              <span className="text-[10px] text-zinc-500">Cero Enlaces Públicos</span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-950/60 border border-white/5">
              <button
                onClick={() => setSessionMode("fixed")}
                disabled={isLive}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                  sessionMode === "fixed" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-white"
                } disabled:opacity-50`}
              >
                Fija (Agendada)
              </button>
              <button
                onClick={() => setSessionMode("manual")}
                disabled={isLive}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                  sessionMode === "manual" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-white"
                } disabled:opacity-50`}
              >
                Manual (Escoger)
              </button>
            </div>
          </div>

          {/* List of Allowed Students with Signatures */}
          <div className="p-4 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Estudiantes Autorizados ({allowedStudents.length})</span>
              </h3>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {allowedStudents.map((stud) => (
                <div
                  key={stud.studentUid}
                  className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{stud.studentName}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Firma Válida
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{stud.signature}</div>
                </div>
              ))}
            </div>

            {/* Add manual student */}
            {sessionMode === "manual" && !isLive && (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <input
                  type="text"
                  placeholder="UID del Estudiante"
                  value={manualInputUid}
                  onChange={(e) => setManualInputUid(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Nombre Visible"
                  value={manualInputName}
                  onChange={(e) => setManualInputName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
                <button
                  onClick={addManualStudent}
                  className="w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
                >
                  + Agregar a Allowed List
                </button>
              </div>
            )}
          </div>

          {/* Hands Raised Panel */}
          {Object.keys(raisedHands).length > 0 && (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Hand className="w-4 h-4" />
                <span>Manos Alzadas en Directo</span>
              </h4>
              <div className="space-y-1.5">
                {Object.entries(raisedHands).map(([uid, data]) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 text-xs text-white"
                  >
                    <span>{data.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
