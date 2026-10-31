"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  PhoneOff,
  Users,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Check,
  Volume2,
  X,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, get, remove, push } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { AcademicFeatureGate } from "@/components/AcademicFeatureGate";
import { WEBRTC_ICE_SERVERS } from "@/lib/creditLiveSystem/creditHashCore";

interface ActiveRoomMatch {
  code8: string;
  listKey: string;
  teacherName: string;
  title: string;
  signature: string;
  matchedStudentKey: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "teacher" | "student";
  text: string;
  time: string;
}

interface UpcomingClassSlot {
  id: string;
  title: string;
  startUtc: string;
  courseTitle: string;
}

export default function StudentLivePage() {
  const { user } = useAuth();
  const {
    subscription,
    entitlements,
    liveBookings,
    consumeCreditHashForClass,
  } = useSubscription();

  const studentUid = user?.uid || "mw0EaGhRIsO3mKJ5yTXi6K9hWI93";
  const studentEmail = (user?.email || "estudiante@ivanperez.tech").toLowerCase();
  const studentName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Estudiante IPT");

  // Sala encontrada en allowed_live_students
  const [matchedRoom, setMatchedRoom] = useState<ActiveRoomMatch | null>(null);
  const [leftManually, setLeftManually] = useState(false);

  // Estado multimedia del estudiante y del profesor
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [hasTeacherVideo, setHasTeacherVideo] = useState(false);
  const [teacherHasVideoFlag, setTeacherHasVideoFlag] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Panel lateral en llamada (Personas / Chat)
  const [sidePanel, setSidePanel] = useState<"none" | "people" | "chat">("none");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [connectedPeers, setConnectedPeers] = useState<Record<string, { name: string }>>({});
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Agenda de próximas clases para solicitar cupo
  const [upcomingSlots, setUpcomingSlots] = useState<UpcomingClassSlot[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingConfirmedMsg, setBookingConfirmedMsg] = useState<string | null>(null);

  // Referencias WebRTC y Multimedia (separando video mudo y audio para evitar bloqueo de Autoplay)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const currentOfferIdRef = useRef<string | null>(null);

  // Reloj en barra inferior
  useEffect(() => {
    const updateClock = () => {
      setCurrentTimeStr(
        new Date().toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // Desbloquear audio automáticamente al primer clic en la página si el navegador lo pausó
  useEffect(() => {
    const unlockAudio = () => {
      if (remoteAudioRef.current && remoteAudioRef.current.paused && remoteAudioRef.current.srcObject) {
        remoteAudioRef.current
          .play()
          .then(() => setAudioBlocked(false))
          .catch(() => {});
      }
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // Cargar próximas clases programadas
  useEffect(() => {
    const calRef = ref(rtdb, "lms_calendar");
    const unsub = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val)) as any[];
        const slots: UpcomingClassSlot[] = arr
          .filter((e) => e && (e.category === "live_class" || e.category === "tutoring"))
          .map((e) => ({
            id: e.id || `slot_${Date.now()}`,
            title: e.title || "Clase en Vivo",
            startUtc: e.startUtc || new Date().toISOString(),
            courseTitle: e.courseTitle || "IPT Academy",
          }))
          .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
        setUpcomingSlots(slots);
      } else {
        setUpcomingSlots([]);
      }
    });
    return () => unsub();
  }, []);

  // Buscar al estudiante en todas las listas activas {allowed_live_students/allowed_list_*}
  useEffect(() => {
    const allowedListsRef = ref(rtdb, "allowed_live_students");
    const unsub = onValue(allowedListsRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setMatchedRoom(null);
        return;
      }

      let found: ActiveRoomMatch | null = null;

      for (const [listKey, roomObj] of Object.entries(data) as [string, any][]) {
        if (!roomObj || roomObj.status !== "live") continue;
        const studentsMap = roomObj.students || {};

        // 1. Coincidencia directa por UID
        if (studentsMap[studentUid]) {
          found = {
            code8: roomObj.code8 || listKey.replace("allowed_list_", ""),
            listKey,
            teacherName: roomObj.teacherName || "Docente Titular",
            title: roomObj.title || "Sesión en Vivo",
            signature: studentsMap[studentUid].signature || "",
            matchedStudentKey: studentUid,
          };
          break;
        }

        // 2. Coincidencia por correo electrónico
        for (const [sKey, sVal] of Object.entries(studentsMap) as [string, any][]) {
          if (
            sVal &&
            sVal.email &&
            studentEmail &&
            sVal.email.toLowerCase() === studentEmail
          ) {
            found = {
              code8: roomObj.code8 || listKey.replace("allowed_list_", ""),
              listKey,
              teacherName: roomObj.teacherName || "Docente Titular",
              title: roomObj.title || "Sesión en Vivo",
              signature: sVal.signature || "",
              matchedStudentKey: sKey,
            };
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        setMatchedRoom((prev) => {
          if (prev && prev.listKey === found!.listKey) return prev;
          setLeftManually(false);
          return found;
        });
      } else {
        setMatchedRoom(null);
        setLeftManually(false);
      }
    });

    return () => unsub();
  }, [studentUid, studentEmail]);

  // Sincronizar vista previa de cámara propia
  const syncLocalPreview = useCallback(() => {
    if (!localVideoRef.current) return;
    if (camTrackRef.current && camTrackRef.current.readyState === "live") {
      localVideoRef.current.srcObject = new MediaStream([camTrackRef.current]);
      localVideoRef.current.play().catch(() => {});
    } else {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    syncLocalPreview();
  }, [camOn, matchedRoom, leftManually, syncLocalPreview]);

  // Conexión WebRTC automática cuando el estudiante es admitido en la lista del profesor
  useEffect(() => {
    if (!matchedRoom || leftManually) {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      currentOfferIdRef.current = null;
      setHasTeacherVideo(false);
      setTeacherHasVideoFlag(false);
      return;
    }

    const { listKey, matchedStudentKey } = matchedRoom;
    let unsubCurrentIce: (() => void) | null = null;

    // Registrar presencia en la sala activa
    const viewerRef = ref(rtdb, `allowed_live_students/${listKey}/viewers/${matchedStudentKey}`);
    set(viewerRef, {
      name: studentName,
      email: studentEmail,
      joinedAt: Date.now(),
    }).catch(() => {});

    // Escuchar estado de medios del docente (para saber si tiene cámara/pantalla encendida)
    const mediaStateRef = ref(rtdb, `allowed_live_students/${listKey}/mediaState`);
    const unsubMediaState = onValue(mediaStateRef, (snap) => {
      const st = snap.val();
      if (st) {
        const activeVid = Boolean(st.hasVideo);
        setTeacherHasVideoFlag(activeVid);
        if (!activeVid) {
          setHasTeacherVideo(false);
        }
      }
    });

    // Escuchar cada nueva Oferta SDP del docente (identificada por offerId)
    const offerRef = ref(
      rtdb,
      `allowed_live_students/${listKey}/signals/${matchedStudentKey}/offer`
    );
    const unsubOffer = onValue(offerRef, async (snap) => {
      const data = snap.val();
      if (!data || !data.sdp) return;

      const incomingOfferId = data.offerId || `legacy_${data.timestamp || 0}`;
      if (incomingOfferId === currentOfferIdRef.current) return;
      currentOfferIdRef.current = incomingOfferId;

      // Limpiar conexión anterior si existía
      if (unsubCurrentIce) {
        unsubCurrentIce();
        unsubCurrentIce = null;
      }
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch {}
        peerConnectionRef.current = null;
      }

      const pc = new RTCPeerConnection(WEBRTC_ICE_SERVERS);
      peerConnectionRef.current = pc;

      let remoteDescReady = false;
      const queuedTeacherIce: RTCIceCandidateInit[] = [];

      // Adjuntar micrófono del alumno si está activo
      if (micTrackRef.current && micTrackRef.current.readyState === "live") {
        const localAudioStream = new MediaStream([micTrackRef.current]);
        pc.addTrack(micTrackRef.current, localAudioStream);
      }

      // Recibir pistas de video/pantalla y audio del docente
      pc.ontrack = (event) => {
        if (event.track.kind === "video") {
          const videoStream = new MediaStream([event.track]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = videoStream;
            remoteVideoRef.current.play().catch(() => {});
          }
          setHasTeacherVideo(true);

          event.track.onunmute = () => {
            setHasTeacherVideo(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = new MediaStream([event.track]);
              remoteVideoRef.current.play().catch(() => {});
            }
          };
          event.track.onended = () => {
            setHasTeacherVideo(false);
          };
        } else if (event.track.kind === "audio") {
          const audioStream = new MediaStream([event.track]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = audioStream;
            remoteAudioRef.current
              .play()
              .then(() => setAudioBlocked(false))
              .catch(() => setAudioBlocked(true));
          }
          event.track.onunmute = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = new MediaStream([event.track]);
              remoteAudioRef.current
                .play()
                .then(() => setAudioBlocked(false))
                .catch(() => setAudioBlocked(true));
            }
          };
        }
      };

      // Enviar candidatos ICE del estudiante con el offerId actual
      pc.onicecandidate = (event) => {
        if (event.candidate && currentOfferIdRef.current === incomingOfferId) {
          const iceRef = push(
            ref(
              rtdb,
              `allowed_live_students/${listKey}/signals/${matchedStudentKey}/studentIce`
            )
          );
          set(iceRef, {
            offerId: incomingOfferId,
            candidate: event.candidate.toJSON(),
          }).catch(() => {});
        }
      };

      // Escuchar candidatos ICE del docente para este offerId
      const teacherIceRef = ref(
        rtdb,
        `allowed_live_students/${listKey}/signals/${matchedStudentKey}/teacherIce`
      );
      const processedKeys = new Set<string>();
      unsubCurrentIce = onValue(teacherIceRef, (iceSnap) => {
        const val = iceSnap.val();
        if (!val || currentOfferIdRef.current !== incomingOfferId) return;

        Object.entries(val).forEach(async ([k, item]: [string, any]) => {
          if (processedKeys.has(k)) return;
          if (!item || (item.offerId && item.offerId !== incomingOfferId)) return;
          processedKeys.add(k);

          const candInit: RTCIceCandidateInit = item.candidate
            ? item.candidate
            : typeof item === "string"
            ? JSON.parse(item)
            : item;

          if (remoteDescReady && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candInit));
            } catch {}
          } else {
            queuedTeacherIce.push(candInit);
          }
        });
      });

      // Aplicar oferta remota, vaciar cola de ICE y enviar Answer
      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: data.type || "offer", sdp: data.sdp })
        );
        remoteDescReady = true;

        while (queuedTeacherIce.length > 0) {
          const c = queuedTeacherIce.shift()!;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await set(
          ref(rtdb, `allowed_live_students/${listKey}/signals/${matchedStudentKey}/answer`),
          {
            offerId: incomingOfferId,
            type: answer.type,
            sdp: answer.sdp,
            timestamp: Date.now(),
          }
        );
      } catch (err) {
        console.warn("Error negociando Answer WebRTC:", err);
      }
    });

    // Escuchar participantes y chat de la sala
    const viewersListRef = ref(rtdb, `allowed_live_students/${listKey}/viewers`);
    const unsubViewers = onValue(viewersListRef, (snap) => {
      setConnectedPeers(snap.val() || {});
    });

    const chatRef = ref(rtdb, `allowed_live_students/${listKey}/chat`);
    const unsubChat = onValue(chatRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setChatMessages([]);
        return;
      }
      const list = Object.entries(val).map(([k, v]: [string, any]) => ({
        id: k,
        senderName: v.senderName || "Participante",
        senderRole: v.senderRole || "student",
        text: v.text || "",
        time: v.time || "",
      }));
      setChatMessages(list);
    });

    return () => {
      unsubMediaState();
      unsubOffer();
      if (unsubCurrentIce) unsubCurrentIce();
      unsubViewers();
      unsubChat();
      remove(viewerRef).catch(() => {});
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch {}
        peerConnectionRef.current = null;
      }
      currentOfferIdRef.current = null;
      setHasTeacherVideo(false);
    };
  }, [matchedRoom, leftManually, studentName, studentEmail]);

  // Alternar Micrófono del estudiante
  const toggleMic = async () => {
    try {
      if (micTrackRef.current) {
        micTrackRef.current.stop();
        micTrackRef.current = null;
        setMicOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          micTrackRef.current = aTrack;
          setMicOn(true);
        }
      }

      // Si ya está en llamada, actualizar sender o solicitar renegociación actualizando joinedAt
      if (matchedRoom && !leftManually) {
        const pc = peerConnectionRef.current;
        const audioSender = pc?.getSenders().find((s) => s.track?.kind === "audio");
        if (audioSender && micTrackRef.current) {
          await audioSender.replaceTrack(micTrackRef.current);
        } else {
          await set(
            ref(
              rtdb,
              `allowed_live_students/${matchedRoom.listKey}/viewers/${matchedRoom.matchedStudentKey}`
            ),
            {
              name: studentName,
              email: studentEmail,
              joinedAt: Date.now(),
            }
          ).catch(() => {});
        }
      }
    } catch {}
  };

  // Alternar Cámara del estudiante
  const toggleCamera = async () => {
    try {
      if (camTrackRef.current) {
        camTrackRef.current.stop();
        camTrackRef.current = null;
        setCamOn(false);
        syncLocalPreview();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
          audio: false,
        });
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          camTrackRef.current = vTrack;
          setCamOn(true);
          syncLocalPreview();
        }
      }
    } catch {}
  };

  // Levantar / Bajar Mano
  const toggleHandRaise = async () => {
    if (!matchedRoom) return;
    const next = !handRaised;
    setHandRaised(next);
    const handRef = ref(
      rtdb,
      `allowed_live_students/${matchedRoom.listKey}/raisedHands/${matchedRoom.matchedStudentKey}`
    );
    if (next) {
      await set(handRef, {
        name: studentName,
        timestamp: Date.now(),
      }).catch(() => {});
    } else {
      await remove(handRef).catch(() => {});
    }
  };

  // Enviar mensaje en chat de la llamada
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !matchedRoom) return;
    const msgRef = push(ref(rtdb, `allowed_live_students/${matchedRoom.listKey}/chat`));
    await set(msgRef, {
      senderName: studentName,
      senderRole: "student",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    });
    setChatInput("");
  };

  // Solicitar / Agendar próxima clase consumiendo 1 crédito criptográfico
  const handleRequestClassSlot = async (slot?: UpcomingClassSlot) => {
    if (bookingBusy) return;
    setBookingBusy(true);
    try {
      const res = await consumeCreditHashForClass({
        sessionId: slot?.id || "next_scheduled",
        title: slot?.title || "Sesión en Vivo",
        startTime: slot?.startUtc || new Date().toISOString(),
      });

      try {
        const snap = await get(ref(rtdb, "allowed_live_students"));
        if (snap.exists()) {
          const allLists = snap.val();
          for (const [lKey, roomObj] of Object.entries(allLists) as [string, any][]) {
            if (roomObj && roomObj.status === "live") {
              await set(ref(rtdb, `allowed_live_students/${lKey}/students/${studentUid}`), {
                uid: studentUid,
                name: studentName,
                email: studentEmail,
                bookingId: res.bookingId,
                creditHash: res.creditHash,
                signature: res.signature,
                admittedAt: Date.now(),
              });
              break;
            }
          }
        }
      } catch {}

      setBookingConfirmedMsg(
        slot
          ? `Tu cupo para "${slot.title}" quedó reservado.`
          : "Tu cupo para la próxima clase quedó reservado."
      );
      setTimeout(() => setBookingConfirmedMsg(null), 5000);
    } catch {
      // Silencioso
    } finally {
      setBookingBusy(false);
    }
  };

  const hasConfirmedBooking = useMemo(
    () => liveBookings.some((b) => b.status === "confirmed"),
    [liveBookings]
  );

  const availableCreditsCount = Math.max(
    0,
    Number(entitlements.availableLiveCredits || subscription?.remainingCredits || 0)
  );

  const showRemoteVideo = hasTeacherVideo && teacherHasVideoFlag;

  return (
    <AcademicFeatureGate feature="live">
      {matchedRoom && !leftManually ? (
        /* ======================================================================
           VISTA EN LLAMADA ACTIVA (GOOGLE MEET LIMPIO)
           ====================================================================== */
        <div className="h-[calc(100vh-4rem)] bg-[#202124] text-white flex flex-col justify-between select-none overflow-hidden">
          {/* Elemento de audio dedicado para la voz/pantalla del docente */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            {/* Escenario Principal del Docente */}
            <div className="flex-1 relative rounded-2xl bg-[#131314] overflow-hidden flex items-center justify-center border border-white/5">
              {/* Video mudo para garantizar Autoplay instantáneo en cualquier navegador */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${showRemoteVideo ? "block" : "hidden"}`}
              />

              {!showRemoteVideo && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="w-24 h-24 rounded-full bg-[#3c4043] flex items-center justify-center text-3xl font-medium text-white mb-3">
                    {matchedRoom.teacherName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-base font-medium text-white">{matchedRoom.teacherName}</p>
                </div>
              )}

              {/* Botón flotante si el navegador pausó el audio por políticas de autoplay */}
              {audioBlocked && (
                <button
                  type="button"
                  onClick={() => {
                    remoteAudioRef.current
                      ?.play()
                      .then(() => setAudioBlocked(false))
                      .catch(() => {});
                  }}
                  className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-[#8ab4f8] text-[#202124] text-xs font-semibold shadow-lg cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Activar sonido</span>
                </button>
              )}

              {/* Etiqueta de nombre del Docente */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white">
                {matchedRoom.teacherName}
              </div>

              {/* Indicador de mano levantada */}
              {handRaised && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fbbc04] text-[#202124] text-xs font-semibold shadow-lg">
                  <Hand className="w-4 h-4" />
                  <span>Mano levantada</span>
                </div>
              )}

              {/* Vista propia en miniatura (PiP) */}
              <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-xl bg-[#202124] border border-white/15 overflow-hidden shadow-2xl flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camOn ? "block" : "hidden"}`}
                />
                {!camOn && (
                  <div className="w-10 h-10 rounded-full bg-[#3c4043] flex items-center justify-center text-sm font-medium text-white">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white drop-shadow">
                  Tú
                </span>
              </div>
            </div>

            {/* Panel Lateral (Personas o Chat) */}
            {sidePanel !== "none" && (
              <div className="w-80 bg-white text-[#202124] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <h3 className="text-base font-medium text-[#202124]">
                    {sidePanel === "people" ? "Personas" : "Mensajes de la llamada"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSidePanel("none")}
                    className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {sidePanel === "people" ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-semibold">
                          {matchedRoom.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-900">
                            {matchedRoom.teacherName}
                          </p>
                          <p className="text-[11px] text-zinc-500">Docente</p>
                        </div>
                      </div>
                    </div>

                    {Object.entries(connectedPeers).map(([uid, p]) => (
                      <div key={uid} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-semibold">
                            {(p.name || "E").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-zinc-900">{p.name}</p>
                            <p className="text-[11px] text-zinc-500">Estudiante</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-xs text-zinc-400 py-10">
                          Los mensajes enviados durante la llamada aparecerán aquí.
                        </div>
                      ) : (
                        chatMessages.map((m) => (
                          <div key={m.id} className="space-y-0.5 text-xs">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-zinc-900">{m.senderName}</span>
                              <span className="text-[10px] text-zinc-400">{m.time}</span>
                            </div>
                            <p className="text-zinc-700 leading-relaxed break-words">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      onSubmit={handleSendChat}
                      className="p-3 border-t border-zinc-200 flex items-center gap-2 bg-zinc-50"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Enviar un mensaje..."
                        className="flex-1 px-3.5 py-2 rounded-full bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-full text-[#1a73e8] hover:bg-blue-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra Inferior Estilo Google Meet */}
          <div className="h-20 px-6 bg-[#202124] flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-3 text-sm font-medium text-white min-w-[200px]">
              <span>{currentTimeStr}</span>
              <span className="text-zinc-500">|</span>
              <span className="truncate max-w-[220px]">{matchedRoom.title}</span>
            </div>

            <div className="flex items-center gap-3 mx-auto">
              <button
                type="button"
                onClick={toggleMic}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  micOn
                    ? "bg-[#3c4043] hover:bg-[#4a4e51] text-white"
                    : "bg-[#ea4335] hover:bg-[#d93025] text-white"
                }`}
                title={micOn ? "Desactivar micrófono" : "Activar micrófono"}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  camOn
                    ? "bg-[#3c4043] hover:bg-[#4a4e51] text-white"
                    : "bg-[#ea4335] hover:bg-[#d93025] text-white"
                }`}
                title={camOn ? "Desactivar cámara" : "Activar cámara"}
              >
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleHandRaise}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  handRaised
                    ? "bg-[#fbbc04] text-[#202124]"
                    : "bg-[#3c4043] hover:bg-[#4a4e51] text-white"
                }`}
                title={handRaised ? "Bajar la mano" : "Levantar la mano"}
              >
                <Hand className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setLeftManually(true)}
                className="px-5 h-11 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center gap-2 font-medium text-xs transition-all cursor-pointer"
                title="Salir de la llamada"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 min-w-[200px]">
              <button
                type="button"
                onClick={() => setSidePanel((p) => (p === "people" ? "none" : "people"))}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  sidePanel === "people"
                    ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                    : "text-zinc-300 hover:bg-[#3c4043]"
                }`}
                title="Personas"
              >
                <Users className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setSidePanel((p) => (p === "chat" ? "none" : "chat"))}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  sidePanel === "chat"
                    ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                    : "text-zinc-300 hover:bg-[#3c4043]"
                }`}
                title="Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================================
           VISTA DE ESPERA / PREPARACIÓN ESTILO GOOGLE MEET LIMPIO
           ====================================================================== */
        <div className="min-h-[calc(100vh-4rem)] bg-[#131314] text-white flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-2xl bg-[#202124] overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camOn ? "block" : "hidden"}`}
                />

                {!camOn && (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-[#3c4043] flex items-center justify-center text-2xl font-medium text-white mb-3">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-zinc-300">La cámara está desactivada</p>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs font-medium text-white">
                  {studentName}
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      micOn
                        ? "bg-[#3c4043]/90 hover:bg-[#4a4e51] text-white border border-white/20"
                        : "bg-[#ea4335] hover:bg-[#d93025] text-white"
                    }`}
                  >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      camOn
                        ? "bg-[#3c4043]/90 hover:bg-[#4a4e51] text-white border border-white/20"
                        : "bg-[#ea4335] hover:bg-[#d93025] text-white"
                    }`}
                  >
                    {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
              {matchedRoom && leftManually ? (
                <div className="space-y-4 w-full">
                  <h1 className="text-2xl font-normal text-white">{matchedRoom.title}</h1>
                  <p className="text-sm text-zinc-400">
                    La sesión está en curso con {matchedRoom.teacherName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLeftManually(false)}
                    className="px-8 py-3 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] font-semibold text-sm transition-all cursor-pointer"
                  >
                    Volver a unirse
                  </button>
                </div>
              ) : (
                <div className="space-y-5 w-full">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-normal text-white">Sala de Clases en Vivo</h1>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Cuando el docente inicie tu clase programada, ingresarás automáticamente a la llamada.
                    </p>
                  </div>

                  {bookingConfirmedMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{bookingConfirmedMsg}</span>
                    </div>
                  )}

                  {upcomingSlots.length > 0 ? (
                    <div className="space-y-2.5 w-full">
                      <span className="text-xs font-medium text-zinc-400 block">
                        Próximos horarios disponibles
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {upcomingSlots.slice(0, 3).map((slot) => (
                          <div
                            key={slot.id}
                            className="p-3.5 rounded-2xl bg-[#202124] border border-white/10 flex items-center justify-between gap-3"
                          >
                            <div className="text-left min-w-0">
                              <p className="text-xs font-medium text-white truncate">{slot.title}</p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                                <Calendar className="w-3 h-3 text-[#8ab4f8]" />
                                <span>
                                  {new Date(slot.startUtc).toLocaleDateString("es-CO", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <Clock className="w-3 h-3 text-[#8ab4f8]" />
                                <span>
                                  {new Date(slot.startUtc).toLocaleTimeString("es-CO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRequestClassSlot(slot)}
                              disabled={bookingBusy}
                              className="px-4 py-2 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] text-xs font-semibold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              Solicitar clase
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleRequestClassSlot()}
                        disabled={bookingBusy || hasConfirmedBooking}
                        className={`px-7 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                          hasConfirmedBooking
                            ? "bg-[#202124] text-emerald-400 border border-emerald-500/30"
                            : "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                        }`}
                      >
                        {hasConfirmedBooking
                          ? "Cupo confirmado para la próxima sesión"
                          : "Solicitar cupo para la próxima clase"}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-zinc-400 pt-2">
                    <span className="w-2 h-2 rounded-full bg-[#8ab4f8] animate-pulse" />
                    <span>
                      En espera del inicio de la sesión • {availableCreditsCount} créditos disponibles
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AcademicFeatureGate>
  );
}
