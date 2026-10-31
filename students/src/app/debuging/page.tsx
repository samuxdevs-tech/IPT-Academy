"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Sparkles,
  Hand,
  Mic,
  MicOff,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, remove, get, push } from "firebase/database";
import { createCreditHash, CreditToken } from "@/lib/creditLiveSystem/creditHashCore";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export default function StudentLiveDebuggingPage() {
  const [studentUid] = useState("student-ivan-samuel");
  const [studentName] = useState("Iván Samuel Pérez");

  // Credit Tokens Vault
  const [credits, setCredits] = useState<CreditToken[]>([]);
  const [activeSignature, setActiveSignature] = useState<string | null>(null);

  // Active Live Session matched (Primitives to prevent re-render loops)
  const [matchedSessionCode, setMatchedSessionCode] = useState<string | null>(null);
  const [teacherMeta, setTeacherMeta] = useState<{ teacherName: string; courseTitle: string }>({
    teacherName: "Docente IPT",
    courseTitle: "Clase Magistral En Vivo",
  });
  const [isAllowedInSession, setIsAllowedInSession] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Live Interaction States
  const [handRaised, setHandRaised] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // WebRTC Refs
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Generate initial cryptographic credits for this student
  useEffect(() => {
    let mounted = true;
    async function initCredits() {
      const cred1Hash = await createCreditHash(studentUid, "CRD_001");
      const cred2Hash = await createCreditHash(studentUid, "CRD_002");
      const cred3Hash = await createCreditHash(studentUid, "CRD_003");

      if (mounted) {
        setCredits([
          { serial: "CRD_001", hash: cred1Hash, studentUid, createdAt: Date.now(), consumed: false },
          { serial: "CRD_002", hash: cred2Hash, studentUid, createdAt: Date.now(), consumed: false },
          { serial: "CRD_003", hash: cred3Hash, studentUid, createdAt: Date.now(), consumed: false },
        ]);
      }
    }
    initCredits();
    return () => {
      mounted = false;
    };
  }, [studentUid]);

  // Real-time listener: Scan active sessions in RTDB for studentUid inclusion
  useEffect(() => {
    const liveSessionsRef = ref(rtdb, "liveSessions");
    const unsubscribe = onValue(liveSessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMatchedSessionCode(null);
        setIsAllowedInSession(false);
        return;
      }

      // Buscar si alguna sesión 'live' tiene a este alumno en allowed_live_students
      let foundCode: string | null = null;
      let foundTeacher = "Docente IPT";
      let foundCourse = "Clase Magistral En Vivo";
      let foundSignature: string | null = null;

      for (const [code8, session] of Object.entries(data) as [string, any][]) {
        if (session && session.status === "live") {
          const allowedMap = session.allowed_live_students || {};
          if (allowedMap[studentUid]) {
            foundCode = code8;
            foundTeacher = session.teacherName || "Docente IPT";
            foundCourse = session.courseTitle || "Clase Magistral En Vivo";
            foundSignature = allowedMap[studentUid].signature;
            break;
          }
        }
      }

      if (foundCode) {
        setMatchedSessionCode((prev) => (prev !== foundCode ? foundCode : prev));
        setTeacherMeta({ teacherName: foundTeacher, courseTitle: foundCourse });
        setIsAllowedInSession(true);
        if (foundSignature) {
          setActiveSignature(foundSignature);
        }
      } else {
        setMatchedSessionCode(null);
        setIsAllowedInSession(false);
      }
    });

    return () => unsubscribe();
  }, [studentUid]);

  // WebRTC Client Connection when allowed in session
  useEffect(() => {
    if (!isAllowedInSession || !matchedSessionCode) {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setHasRemoteVideo(false);
      return;
    }

    // Protect against duplicate RTCPeerConnection instantiations
    if (peerConnectionRef.current) return;

    const code8 = matchedSessionCode;

    // Register as viewer in RTDB
    const viewerRef = ref(rtdb, `liveSessions/${code8}/viewers/${studentUid}`);
    set(viewerRef, {
      studentName,
      joinedAt: Date.now(),
    });

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Handle incoming remote media tracks (Teacher Camera/Screen)
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasRemoteVideo(true);
        }
      }
    };

    // Send local student ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const iceRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/studentIce`);
        push(iceRef, JSON.stringify(event.candidate));
      }
    };

    // Listen for Teacher Offer
    const offerRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/offer`);
    const unsubOffer = onValue(offerRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.sdp && pc.signalingState !== "closed") {
        try {
          if (pc.signalingState === "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            const answerRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/answer`);
            await set(answerRef, {
              type: answer.type,
              sdp: answer.sdp,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.warn("Error processing teacher offer:", err);
        }
      }
    });

    // Listen for Teacher ICE Candidates
    const teacherIceRef = ref(rtdb, `liveSessions/${code8}/signals/${studentUid}/teacherIce`);
    const unsubIce = onValue(teacherIceRef, (snapshot) => {
      const candidates = snapshot.val();
      if (candidates && pc.signalingState !== "closed") {
        Object.values(candidates).forEach(async (candStr: any) => {
          try {
            const candidate = JSON.parse(candStr);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            // Ignore duplicate/early candidates
          }
        });
      }
    });

    return () => {
      unsubOffer();
      unsubIce();
      remove(viewerRef);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setHasRemoteVideo(false);
    };
  }, [isAllowedInSession, matchedSessionCode, studentUid, studentName]);

  // Consumir Crédito Criptográfico y Firmar en Base de Datos
  const consumeCreditForClass = async (token: CreditToken) => {
    if (token.consumed) return;

    // Generar firma inmutable {id}: {Hash del credito consumido}
    const bookingId = `book_${Math.random().toString(36).substring(2, 8)}`;
    const signature = `${bookingId}: ${token.hash}`;

    // Marcar crédito consumido localmente
    setCredits((prev) =>
      prev.map((c) => (c.serial === token.serial ? { ...c, consumed: true, signature } : c))
    );
    setActiveSignature(signature);

    // Si hay alguna sesión activa, agregarse a la allowed_live_students con la firma
    const liveSessionsSnapshot = await get(ref(rtdb, "liveSessions"));
    const data = liveSessionsSnapshot.val();
    if (data) {
      for (const [code8, session] of Object.entries(data) as [string, any][]) {
        if (session && session.status === "live") {
          await set(ref(rtdb, `liveSessions/${code8}/allowed_live_students/${studentUid}`), {
            studentName,
            signature,
            registeredAt: Date.now(),
          });
          break;
        }
      }
    }
  };

  // Toggle Hand Raise
  const toggleHandRaise = async () => {
    if (!matchedSessionCode) return;
    const next = !handRaised;
    setHandRaised(next);

    const handRef = ref(
      rtdb,
      `liveSessions/${matchedSessionCode}/raisedHands/${studentUid}`
    );
    if (next) {
      await set(handRef, {
        name: studentName,
        timestamp: Date.now(),
      });
    } else {
      await remove(handRef);
    }
  };

  // Toggle Student Mic
  const toggleMic = async () => {
    try {
      if (micActive) {
        localStreamRef.current?.getAudioTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setMicActive(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        if (peerConnectionRef.current) {
          stream.getAudioTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, stream);
          });
        }
        setMicActive(true);
      }
    } catch (err) {
      console.warn("Error activando micro del alumno:", err);
    }
  };

  const copyHash = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 p-6 font-sans select-none">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg">
            <Radio className="w-5 h-5 text-zinc-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">IPT Course — Campus Student</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                academy.iptapps.com /live
              </span>
            </div>
            <p className="text-xs text-zinc-400">{studentName} ({studentUid})</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isAllowedInSession ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
            }`}
          />
          <span>{isAllowedInSession ? "Autorizado en Sesión En Vivo" : "Sin Sesión Activa"}</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column: Live Screen or Gatekeeper */}
        <section className="lg:col-span-2 space-y-4">
          {isAllowedInSession && matchedSessionCode ? (
            /* ALLOWED LIVE CLASS SCREEN */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative aspect-video w-full rounded-3xl bg-zinc-950 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-2xl">
                {/* Live Video from Teacher */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${hasRemoteVideo ? "block" : "hidden"}`}
                />

                {!hasRemoteVideo && (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl mb-3">
                      {teacherMeta.teacherName.charAt(0)}
                    </div>
                    <h3 className="text-base font-semibold text-white">{teacherMeta.teacherName}</h3>
                    <span className="text-xs text-blue-400 font-medium">{teacherMeta.courseTitle}</span>

                    <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Conexión WebRTC Autorizada por Firma</span>
                    </div>
                  </div>
                )}

                {/* Hand Raised Banner */}
                {handRaised && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold shadow-lg animate-bounce">
                    <Hand className="w-4 h-4" />
                    <span>Tu mano está alzada</span>
                  </div>
                )}

                {/* Session Pill */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[10px] text-zinc-300">
                  <span>Código de aislamiento:</span>
                  <span className="font-mono text-emerald-400 font-bold">{matchedSessionCode}</span>
                </div>
              </div>

              {/* Student Controls Bar */}
              <div className="flex items-center justify-between p-4 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMic}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      micActive
                        ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(48,209,88,0.5)]"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={toggleHandRaise}
                    className={`px-4 h-11 rounded-full flex items-center gap-2 transition-all ${
                      handRaised
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                        : "bg-zinc-800 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <Hand className="w-4 h-4" />
                    <span className="text-xs">{handRaised ? "Bajar mano" : "Alzar mano"}</span>
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block">Firma en vivo activa</span>
                  <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[200px] block">
                    {activeSignature || "Validada por RTDB"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* GATEKEEPER WAITING SCREEN */
            <div className="aspect-video w-full rounded-3xl bg-zinc-950/80 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4 text-zinc-500">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Puerta Ciega de Acceso (/live)</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed">
                No existen enlaces públicos de sala. Para ingresar a una clase magistral, el sistema debe encontrar tu
                firma criptográfica de crédito en la lista <strong className="text-white">allowed_live_students</strong> del docente.
              </p>
              <div className="mt-4 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Escaneando namespaces de docentes en tiempo real...</span>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Cryptographic Credit Vault */}
        <aside className="space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Bóveda de Créditos Criptográficos</span>
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono">
                {credits.filter((c) => !c.consumed).length} Disponibles
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cada crédito es un token criptográfico SHA-256 único e irrepetible. Al consumirlo, se estampa una firma
              inmutable <code className="text-emerald-400">{"{id}: {Hash}"}</code> que te autoriza en la sesión del profesor.
            </p>

            {/* Tokens List */}
            <div className="space-y-2.5">
              {credits.map((c) => (
                <div
                  key={c.serial}
                  className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                    c.consumed
                      ? "bg-zinc-950/60 border-white/5 opacity-60"
                      : "bg-white/[0.03] border-white/10 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{c.serial}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        c.consumed ? "bg-zinc-800 text-zinc-500" : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {c.consumed ? "Consumido" : "Activo"}
                    </span>
                  </div>

                  {/* Hash display */}
                  <div className="flex items-center justify-between bg-black/40 p-1.5 rounded-lg text-[9px] font-mono text-zinc-400">
                    <span className="truncate max-w-[200px]">{c.hash}</span>
                    <button onClick={() => copyHash(c.hash)} className="hover:text-white ml-1">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  {!c.consumed ? (
                    <button
                      onClick={() => consumeCreditForClass(c)}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Consumir y Firmar Reserva</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      Firma: {c.signature}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
