"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Users,
  MessageSquare,
  Hand,
  Send,
  Check,
  Calendar,
  Clock,
  Search,
  X,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import {
  ref,
  set,
  onValue,
  remove,
  push,
} from "firebase/database";
import {
  generateSessionCode8,
  WEBRTC_ICE_SERVERS,
  createCreditHash,
} from "@/lib/creditLiveSystem/creditHashCore";
import { useAuth } from "@/context/AuthContext";

interface StudentCandidate {
  uid: string;
  name: string;
  email: string;
  bookingId?: string;
  signature?: string;
  bookedSessionId?: string;
}

interface ScheduledClassItem {
  id: string;
  title: string;
  startUtc: string;
  courseTitle: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: "teacher" | "student";
  text: string;
  time: string;
}

interface PeerSession {
  pc: RTCPeerConnection;
  offerId: string;
  remoteDescSet: boolean;
  queuedIce: RTCIceCandidateInit[];
  unsubAnswer: () => void;
  unsubIce: () => void;
}

export function LiveClassSplitView() {
  const { user, operatorProfile } = useAuth();
  const teacherUid = user?.uid || operatorProfile?.uid || "teacher_ipt_001";
  const teacherName = operatorProfile?.displayName || "Docente Titular IPT";

  // Estado de la llamada
  const [isLive, setIsLive] = useState(false);
  const [code8, setCode8] = useState<string | null>(null);
  const [listMode, setListMode] = useState<"fixed" | "manual">("fixed");
  const [classTitle, setClassTitle] = useState("Sesión en Vivo");

  // Próximas clases agendadas y estudiantes
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClassItem[]>([]);
  const [selectedScheduledId, setSelectedScheduledId] = useState<string>("");
  const [allStudents, setAllStudents] = useState<StudentCandidate[]>([]);
  const [bookedStudents, setBookedStudents] = useState<StudentCandidate[]>([]);
  const [manualSelectedUids, setManualSelectedUids] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Estado visual de dispositivos
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // Paneles laterales durante la llamada (Meet style)
  const [sidePanel, setSidePanel] = useState<"none" | "people" | "chat">("none");
  const [connectedViewers, setConnectedViewers] = useState<
    Record<string, { name: string; joinedAt: number }>
  >({});
  const [raisedHands, setRaisedHands] = useState<
    Record<string, { name: string; timestamp: number }>
  >({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Referencias mutables libres de closures obsoletos
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const studentAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  const isLiveRef = useRef<boolean>(false);
  const code8Ref = useRef<string | null>(null);
  const connectedUidsRef = useRef<Set<string>>(new Set());
  const peerSessionsRef = useRef<Map<string, PeerSession>>(new Map());
  const railwayWsRef = useRef<WebSocket | null>(null);

  // Reloj estilo Google Meet
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
    const interval = setInterval(updateClock, 15000);
    return () => clearInterval(interval);
  }, []);

  // Cargar próximas clases agendadas y estudiantes
  useEffect(() => {
    const calRef = ref(rtdb, "lms_calendar");
    const usersRef = ref(rtdb, "users");
    const subsRef = ref(rtdb, "lms_subscriptions");
    const bookingsRef = ref(rtdb, "lms_live_bookings");
    const sigsRef = ref(rtdb, "consumed_credit_signatures");

    let rawUsers: Record<string, any> = {};
    let rawSubs: Record<string, any> = {};
    let rawBookings: Record<string, any> = {};
    let rawSigs: Record<string, string> = {};

    const rebuildLists = () => {
      const candidatesMap = new Map<string, StudentCandidate>();

      const allUids = new Set([...Object.keys(rawUsers), ...Object.keys(rawSubs)]);
      for (const uid of allUids) {
        const u = rawUsers[uid] || {};
        const p = u.profile || {};
        const c = u.legalConsent || {};
        const s = rawSubs[uid] || {};
        const email = (p.email || u.email || c.email || s.userEmail || "").trim();
        if (
          email.toLowerCase().includes("administrator@ivanperez.tech") ||
          email.toLowerCase().includes("rectoria@ivanperez.tech") ||
          email.toLowerCase().includes("docente@")
        ) {
          continue;
        }
        const name =
          p.displayName ||
          u.displayName ||
          u.name ||
          c.displayName ||
          (email ? email.split("@")[0] : `Estudiante ${uid.slice(0, 5)}`);

        candidatesMap.set(uid, {
          uid,
          name,
          email: email || "estudiante@iptapps.com",
        });
      }

      if (!candidatesMap.has("mw0EaGhRIsO3mKJ5yTXi6K9hWI93")) {
        candidatesMap.set("mw0EaGhRIsO3mKJ5yTXi6K9hWI93", {
          uid: "mw0EaGhRIsO3mKJ5yTXi6K9hWI93",
          name: "Estudiante Pro+ IPT",
          email: "estudiante@ivanperez.tech",
        });
      }

      const bookedList: StudentCandidate[] = [];
      for (const [bId, bVal] of Object.entries(rawBookings)) {
        if (!bVal || bVal.status === "cancelled_by_user") continue;
        const sUid = bVal.userId || bVal.studentUid;
        if (!sUid) continue;
        const hashFromSig = rawSigs[bId] || bVal.creditHash || "";
        const existing = candidatesMap.get(sUid);
        const entry: StudentCandidate = {
          uid: sUid,
          name: bVal.studentName || existing?.name || `Estudiante ${sUid.slice(0, 5)}`,
          email: bVal.studentEmail || existing?.email || "",
          bookingId: bId,
          signature: hashFromSig
            ? `${bId}: ${hashFromSig}`
            : bVal.signature || `${bId}: verified`,
          bookedSessionId: bVal.sessionId,
        };
        candidatesMap.set(sUid, entry);
        bookedList.push(entry);
      }

      const fullList = Array.from(candidatesMap.values());
      setAllStudents(fullList);
      setBookedStudents(bookedList.length > 0 ? bookedList : fullList);
      setManualSelectedUids((prev) => {
        if (prev.size > 0) return prev;
        return new Set(fullList.map((s) => s.uid));
      });
    };

    const unsubCal = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val)) as any[];
        const liveItems: ScheduledClassItem[] = arr
          .filter((e) => e && (e.category === "live_class" || e.category === "tutoring"))
          .map((e) => ({
            id: e.id || `cls_${Date.now()}`,
            title: e.title || "Clase en Vivo",
            startUtc: e.startUtc || new Date().toISOString(),
            courseTitle: e.courseTitle || "IPT Academy",
          }))
          .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());

        setScheduledClasses(liveItems);
        if (liveItems.length > 0) {
          setSelectedScheduledId((prev) => prev || liveItems[0].id);
          setClassTitle((prev) => (prev === "Sesión en Vivo" ? liveItems[0].title : prev));
        }
      }
    });

    const unsubUsers = onValue(usersRef, (snap) => {
      rawUsers = snap.exists() ? snap.val() : {};
      rebuildLists();
    });
    const unsubSubs = onValue(subsRef, (snap) => {
      rawSubs = snap.exists() ? snap.val() : {};
      rebuildLists();
    });
    const unsubBookings = onValue(bookingsRef, (snap) => {
      rawBookings = snap.exists() ? snap.val() : {};
      rebuildLists();
    });
    const unsubSigs = onValue(sigsRef, (snap) => {
      rawSigs = snap.exists() ? snap.val() : {};
      rebuildLists();
    });

    return () => {
      unsubCal();
      unsubUsers();
      unsubSubs();
      unsubBookings();
      unsubSigs();
    };
  }, []);

  // Actualizar el visor local <video> con la pista activa (pantalla o cámara)
  const syncLocalVideoPreview = useCallback(() => {
    if (!videoRef.current) return;
    const activeVideoTrack = screenVideoTrackRef.current || camTrackRef.current;
    if (activeVideoTrack && activeVideoTrack.readyState === "live") {
      const previewStream = new MediaStream([activeVideoTrack]);
      videoRef.current.srcObject = previewStream;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    syncLocalVideoPreview();
  }, [isLive, camOn, screenOn, syncLocalVideoPreview]);

  // Publicar estado de medios en RTDB para que el estudiante sepa al instante si hay video/pantalla/audio
  const publishMediaStateToRtdb = useCallback(async () => {
    const activeCode = code8Ref.current;
    if (!isLiveRef.current || !activeCode) return;
    const listKey = `allowed_list_${activeCode}`;
    const hasScreen = Boolean(
      screenVideoTrackRef.current && screenVideoTrackRef.current.readyState === "live"
    );
    const hasCam = Boolean(
      camTrackRef.current && camTrackRef.current.readyState === "live"
    );
    const hasMic = Boolean(
      micTrackRef.current &&
        micTrackRef.current.readyState === "live" &&
        micTrackRef.current.enabled
    );

    await set(ref(rtdb, `allowed_live_students/${listKey}/mediaState`), {
      hasVideo: hasScreen || hasCam,
      hasAudio: hasMic || Boolean(screenAudioTrackRef.current),
      mode: hasScreen ? "screen" : hasCam ? "camera" : "none",
      updatedAt: Date.now(),
    }).catch(() => {});
  }, []);

  // Cerrar sesión WebRTC de un alumno específico
  const closePeerSession = useCallback((studentUid: string) => {
    const existing = peerSessionsRef.current.get(studentUid);
    if (existing) {
      try {
        existing.unsubAnswer();
        existing.unsubIce();
        existing.pc.close();
      } catch {}
      peerSessionsRef.current.delete(studentUid);
    }
  }, []);

  // Crear y negociar una conexión WebRTC limpia con un estudiante (con cola de ICE y offerId único)
  const negotiateWithStudent = useCallback(
    async (studentUid: string) => {
      const activeCode = code8Ref.current;
      if (!isLiveRef.current || !activeCode) return;
      const listKey = `allowed_list_${activeCode}`;

      // Cerrar cualquier negociación anterior con este alumno
      closePeerSession(studentUid);

      const offerId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Limpiar señales previas en RTDB antes de emitir la nueva oferta
      await remove(ref(rtdb, `allowed_live_students/${listKey}/signals/${studentUid}`)).catch(
        () => {}
      );

      const pc = new RTCPeerConnection(WEBRTC_ICE_SERVERS);
      const sessionObj: PeerSession = {
        pc,
        offerId,
        remoteDescSet: false,
        queuedIce: [],
        unsubAnswer: () => {},
        unsubIce: () => {},
      };
      peerSessionsRef.current.set(studentUid, sessionObj);

      // Construir MediaStream con las pistas activas en este instante (leídas directamente de Refs)
      const outboundStream = new MediaStream();
      const activeVideoTrack = screenVideoTrackRef.current || camTrackRef.current;
      const activeAudioTrack = micTrackRef.current || screenAudioTrackRef.current;

      if (activeVideoTrack && activeVideoTrack.readyState === "live") {
        outboundStream.addTrack(activeVideoTrack);
        pc.addTrack(activeVideoTrack, outboundStream);
      } else {
        pc.addTransceiver("video", { direction: "sendrecv" });
      }

      if (activeAudioTrack && activeAudioTrack.readyState === "live") {
        outboundStream.addTrack(activeAudioTrack);
        pc.addTrack(activeAudioTrack, outboundStream);
      } else {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }

      // Si el estudiante activa su micrófono, reproducir su audio en el estudio del profesor
      pc.ontrack = (event) => {
        if (event.track.kind === "audio" && studentAudioContainerRef.current) {
          const audioElId = `stu_audio_${studentUid}`;
          let audioEl = document.getElementById(audioElId) as HTMLAudioElement | null;
          if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = audioElId;
            audioEl.autoplay = true;
            studentAudioContainerRef.current.appendChild(audioEl);
          }
          const incomingStream =
            event.streams && event.streams[0]
              ? event.streams[0]
              : new MediaStream([event.track]);
          audioEl.srcObject = incomingStream;
          audioEl.play().catch(() => {});
        }
      };

      // Enviar candidatos ICE del profesor a RTDB
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const currentSession = peerSessionsRef.current.get(studentUid);
          if (!currentSession || currentSession.offerId !== offerId) return;

          const iceRef = push(
            ref(rtdb, `allowed_live_students/${listKey}/signals/${studentUid}/teacherIce`)
          );
          set(iceRef, {
            offerId,
            candidate: event.candidate.toJSON(),
          }).catch(() => {});
        }
      };

      // Escuchar Answer del estudiante verificando que corresponda a este offerId
      const answerRef = ref(
        rtdb,
        `allowed_live_students/${listKey}/signals/${studentUid}/answer`
      );
      const unsubAnswer = onValue(answerRef, async (snap) => {
        const data = snap.val();
        if (!data || !data.sdp || data.offerId !== offerId) return;
        const currentSession = peerSessionsRef.current.get(studentUid);
        if (!currentSession || currentSession.offerId !== offerId) return;
        if (pc.signalingState !== "have-local-offer") return;

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: data.type || "answer", sdp: data.sdp })
          );
          currentSession.remoteDescSet = true;

          // Vaciar cola de candidatos ICE del estudiante que hayan llegado antes del Answer
          const pending = [...currentSession.queuedIce];
          currentSession.queuedIce = [];
          for (const cand of pending) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
        } catch (err) {
          console.warn("Error aplicando Answer del estudiante:", err);
        }
      });

      // Escuchar candidatos ICE del estudiante (encolando si remoteDescription aún no está listo)
      const studentIceRef = ref(
        rtdb,
        `allowed_live_students/${listKey}/signals/${studentUid}/studentIce`
      );
      const processedIceKeys = new Set<string>();
      const unsubIce = onValue(studentIceRef, (snap) => {
        const val = snap.val();
        if (!val) return;
        const currentSession = peerSessionsRef.current.get(studentUid);
        if (!currentSession || currentSession.offerId !== offerId) return;

        Object.entries(val).forEach(async ([k, item]: [string, any]) => {
          if (processedIceKeys.has(k)) return;
          if (!item || (item.offerId && item.offerId !== offerId)) return;
          processedIceKeys.add(k);

          const candInit: RTCIceCandidateInit = item.candidate
            ? item.candidate
            : typeof item === "string"
            ? JSON.parse(item)
            : item;

          if (currentSession.remoteDescSet && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candInit));
            } catch {}
          } else {
            currentSession.queuedIce.push(candInit);
          }
        });
      });

      sessionObj.unsubAnswer = unsubAnswer;
      sessionObj.unsubIce = unsubIce;

      // Crear y publicar la oferta SDP
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await set(ref(rtdb, `allowed_live_students/${listKey}/signals/${studentUid}/offer`), {
          offerId,
          type: offer.type,
          sdp: offer.sdp,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn("Error creando Offer WebRTC:", err);
      }
    },
    [closePeerSession]
  );

  // Sincronizar cambios de Cámara, Micrófono o Pantalla con todos los estudiantes conectados
  const broadcastMediaUpdateToAllStudents = useCallback(async () => {
    await publishMediaStateToRtdb();
    if (!isLiveRef.current || !code8Ref.current) return;

    const uids = Array.from(connectedUidsRef.current);
    for (const sUid of uids) {
      await negotiateWithStudent(sUid);
    }
  }, [publishMediaStateToRtdb, negotiateWithStudent]);

  // 1. Alternar Cámara
  const toggleCamera = async () => {
    try {
      if (camTrackRef.current) {
        camTrackRef.current.stop();
        camTrackRef.current = null;
        setCamOn(false);
        syncLocalVideoPreview();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          camTrackRef.current = vTrack;
          vTrack.onended = () => {
            camTrackRef.current = null;
            setCamOn(false);
            syncLocalVideoPreview();
            broadcastMediaUpdateToAllStudents();
          };
          setCamOn(true);
          syncLocalVideoPreview();
        }
      }
      await broadcastMediaUpdateToAllStudents();
    } catch (err) {
      console.warn("No se pudo acceder a la cámara:", err);
    }
  };

  // 2. Alternar Micrófono
  const toggleMic = async () => {
    try {
      if (micTrackRef.current) {
        micTrackRef.current.stop();
        micTrackRef.current = null;
        setMicOn(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          micTrackRef.current = aTrack;
          aTrack.onended = () => {
            micTrackRef.current = null;
            setMicOn(false);
            broadcastMediaUpdateToAllStudents();
          };
          setMicOn(true);
        }
      }
      await broadcastMediaUpdateToAllStudents();
    } catch (err) {
      console.warn("No se pudo acceder al micrófono:", err);
    }
  };

  // 3. Alternar Compartir Pantalla
  const toggleScreenShare = async () => {
    try {
      if (screenVideoTrackRef.current) {
        screenVideoTrackRef.current.stop();
        screenVideoTrackRef.current = null;
        if (screenAudioTrackRef.current) {
          screenAudioTrackRef.current.stop();
          screenAudioTrackRef.current = null;
        }
        setScreenOn(false);
        syncLocalVideoPreview();
      } else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
        const sVideoTrack = displayStream.getVideoTracks()[0];
        const sAudioTrack = displayStream.getAudioTracks()[0] || null;

        if (sVideoTrack) {
          screenVideoTrackRef.current = sVideoTrack;
          screenAudioTrackRef.current = sAudioTrack;
          setScreenOn(true);
          syncLocalVideoPreview();

          sVideoTrack.onended = () => {
            screenVideoTrackRef.current = null;
            if (screenAudioTrackRef.current) {
              screenAudioTrackRef.current.stop();
              screenAudioTrackRef.current = null;
            }
            setScreenOn(false);
            syncLocalVideoPreview();
            broadcastMediaUpdateToAllStudents();
          };
        }
      }
      await broadcastMediaUpdateToAllStudents();
    } catch (err) {
      console.warn("Compartir pantalla cancelado:", err);
    }
  };

  // Estudiantes que conformarán la allowed_live_students
  const effectiveAllowedStudents = useMemo(() => {
    if (listMode === "fixed") {
      return bookedStudents.length > 0 ? bookedStudents : allStudents;
    }
    return allStudents.filter((s) => manualSelectedUids.has(s.uid));
  }, [listMode, bookedStudents, allStudents, manualSelectedUids]);

  // Iniciar Clase: Crea {allowed_list_codigode8digitos} en base de datos temporal
  const handleStartClass = async () => {
    const newCode8 = generateSessionCode8();
    const listKey = `allowed_list_${newCode8}`;

    const studentsMap: Record<string, any> = {};
    for (const s of effectiveAllowedStudents) {
      const bId = s.bookingId || `cls_${newCode8.toLowerCase()}_${s.uid.slice(0, 5)}`;
      const hash = s.signature
        ? s.signature.split(": ")[1] || s.signature
        : await createCreditHash(s.uid, bId);
      const signature = `${bId}: ${hash}`;

      studentsMap[s.uid] = {
        uid: s.uid,
        name: s.name,
        email: s.email,
        bookingId: bId,
        creditHash: hash,
        signature,
        admittedAt: Date.now(),
      };

      await set(ref(rtdb, `consumed_credit_signatures/${bId}`), hash).catch(() => {});
    }

    const hasScreen = Boolean(screenVideoTrackRef.current);
    const hasCam = Boolean(camTrackRef.current);
    const hasMic = Boolean(micTrackRef.current);

    const payload = {
      code8: newCode8,
      listKey,
      teacherUid,
      teacherName,
      title: classTitle.trim() || "Sesión en Vivo",
      mode: listMode,
      status: "live",
      startedAt: Date.now(),
      students: studentsMap,
      mediaState: {
        hasVideo: hasScreen || hasCam,
        hasAudio: hasMic,
        mode: hasScreen ? "screen" : hasCam ? "camera" : "none",
        updatedAt: Date.now(),
      },
    };

    await set(ref(rtdb, `allowed_live_students/${listKey}`), payload);

    code8Ref.current = newCode8;
    isLiveRef.current = true;
    setCode8(newCode8);
    setIsLive(true);
  };

  // Escuchar alumnos que entran a la sala (o reconectan), manos alzadas y chat en vivo
  useEffect(() => {
    if (!isLive || !code8) return;
    const listKey = `allowed_list_${code8}`;
    const lastSeenJoinedAt = new Map<string, number>();

    const viewersRef = ref(rtdb, `allowed_live_students/${listKey}/viewers`);
    const unsubViewers = onValue(viewersRef, (snap) => {
      const val = snap.val() || {};
      setConnectedViewers(val);

      const currentUids = new Set(Object.keys(val));
      connectedUidsRef.current = currentUids;

      // Iniciar o renegociar WebRTC para cada alumno que entra o recarga la página (joinedAt nuevo)
      Object.entries(val).forEach(([sUid, info]: [string, any]) => {
        const joinedAt = Number(info?.joinedAt || 0);
        const prevJoinedAt = lastSeenJoinedAt.get(sUid);
        if (prevJoinedAt !== joinedAt || !peerSessionsRef.current.has(sUid)) {
          lastSeenJoinedAt.set(sUid, joinedAt);
          negotiateWithStudent(sUid);
        }
      });

      // Limpiar sesiones de alumnos que salieron
      for (const existingUid of Array.from(peerSessionsRef.current.keys())) {
        if (!currentUids.has(existingUid)) {
          closePeerSession(existingUid);
          lastSeenJoinedAt.delete(existingUid);
        }
      }
    });

    const handsRef = ref(rtdb, `allowed_live_students/${listKey}/raisedHands`);
    const unsubHands = onValue(handsRef, (snap) => {
      setRaisedHands(snap.val() || {});
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
      unsubViewers();
      unsubHands();
      unsubChat();
    };
  }, [isLive, code8, negotiateWithStudent, closePeerSession]);

  // Finalizar Clase
  const handleEndClass = async () => {
    const activeCode = code8Ref.current;
    isLiveRef.current = false;
    code8Ref.current = null;

    if (activeCode) {
      const listKey = `allowed_list_${activeCode}`;
      await remove(ref(rtdb, `allowed_live_students/${listKey}`)).catch(() => {});
    }

    if (railwayWsRef.current) {
      railwayWsRef.current.close();
      railwayWsRef.current = null;
    }

    for (const sUid of Array.from(peerSessionsRef.current.keys())) {
      closePeerSession(sUid);
    }
    connectedUidsRef.current.clear();

    camTrackRef.current?.stop();
    micTrackRef.current?.stop();
    screenVideoTrackRef.current?.stop();
    screenAudioTrackRef.current?.stop();
    camTrackRef.current = null;
    micTrackRef.current = null;
    screenVideoTrackRef.current = null;
    screenAudioTrackRef.current = null;

    setMicOn(false);
    setCamOn(false);
    setScreenOn(false);
    setIsLive(false);
    setCode8(null);
    setConnectedViewers({});
    setRaisedHands({});
    setChatMessages([]);
    setSidePanel("none");
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !code8) return;
    const listKey = `allowed_list_${code8}`;
    const msgRef = push(ref(rtdb, `allowed_live_students/${listKey}/chat`));
    await set(msgRef, {
      senderName: teacherName,
      senderRole: "teacher",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    });
    setChatInput("");
  };

  const toggleManualStudent = (uid: string) => {
    setManualSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const filteredManualStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [allStudents, searchQuery]);

  // ============================================================================
  // VISTA 1: ANTES DE INICIAR CLASE (LOBBY LIMPIO ESTILO GOOGLE MEET)
  // ============================================================================
  if (!isLive) {
    const nextScheduled =
      scheduledClasses.find((c) => c.id === selectedScheduledId) || scheduledClasses[0];

    return (
      <div className="min-h-[calc(100vh-7rem)] bg-[#131314] text-white rounded-3xl border border-white/10 p-6 lg:p-10 flex items-center justify-center">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Previsualización de Cámara y Audio */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-video w-full rounded-2xl bg-[#202124] overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${camOn || screenOn ? "block" : "hidden"}`}
              />

              {!camOn && !screenOn && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 rounded-full bg-[#3c4043] flex items-center justify-center text-2xl font-medium text-white mb-3">
                    {teacherName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm text-zinc-300">La cámara está desactivada</p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 px-3 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs font-medium text-white">
                {teacherName}
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
                  title={micOn ? "Desactivar micrófono" : "Activar micrófono"}
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
                  title={camOn ? "Desactivar cámara" : "Activar cámara"}
                >
                  {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Inicio y Selección de Lista */}
          <div className="lg:col-span-5 bg-[#202124] rounded-2xl border border-white/10 p-6 space-y-5 shadow-xl">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Título de la clase</label>
              <input
                type="text"
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                placeholder="Título de la sesión"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#131314] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8ab4f8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#131314] border border-white/10">
              <button
                type="button"
                onClick={() => setListMode("fixed")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  listMode === "fixed"
                    ? "bg-[#8ab4f8] text-[#202124] font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Próxima agendada
              </button>
              <button
                type="button"
                onClick={() => setListMode("manual")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  listMode === "manual"
                    ? "bg-[#8ab4f8] text-[#202124] font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Seleccionar alumnos
              </button>
            </div>

            {listMode === "fixed" ? (
              <div className="space-y-3">
                {nextScheduled ? (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-white/10 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#8ab4f8] font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(nextScheduled.startUtc).toLocaleDateString("es-CO", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(nextScheduled.startUtc).toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{nextScheduled.title}</p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8ab4f8]" />
                    <span>Horario directo disponible para iniciar ahora</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Estudiantes en lista ({effectiveAllowedStudents.length})</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {effectiveAllowedStudents.map((s) => (
                      <div
                        key={s.uid}
                        className="px-3 py-2 rounded-xl bg-[#131314] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium text-white truncate">{s.name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{s.email}</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#131314] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8ab4f8]"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {filteredManualStudents.map((s) => {
                    const checked = manualSelectedUids.has(s.uid);
                    return (
                      <button
                        key={s.uid}
                        type="button"
                        onClick={() => toggleManualStudent(s.uid)}
                        className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between text-left text-xs transition-all cursor-pointer ${
                          checked
                            ? "bg-[#8ab4f8]/15 border-[#8ab4f8]/40 text-white"
                            : "bg-[#131314] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium text-white truncate">{s.name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{s.email}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                            checked ? "bg-[#8ab4f8] text-[#202124]" : "border border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartClass}
              disabled={effectiveAllowedStudents.length === 0}
              className="w-full py-3 px-6 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] font-semibold text-sm transition-all shadow-lg cursor-pointer disabled:opacity-40"
            >
              Iniciar clase
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 2: EN LLAMADA ACTIVA (100% ESTILO GOOGLE MEET LIMPIO)
  // ============================================================================
  const connectedList = Object.entries(connectedViewers);
  const raisedHandsCount = Object.keys(raisedHands).length;

  return (
    <div className="h-[calc(100vh-5.5rem)] bg-[#202124] text-white rounded-3xl overflow-hidden flex flex-col justify-between select-none relative border border-white/10">
      {/* Contenedor oculto para audio entrante de los alumnos */}
      <div ref={studentAudioContainerRef} className="hidden" />

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="flex-1 relative rounded-2xl bg-[#131314] overflow-hidden flex items-center justify-center border border-white/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${camOn || screenOn ? "block" : "hidden"}`}
          />

          {!camOn && !screenOn && (
            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#3c4043] flex items-center justify-center text-3xl font-medium text-white shadow-inner">
                {teacherName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white">
            {!micOn && <MicOff className="w-3.5 h-3.5 text-[#ea4335]" />}
            <span>{teacherName} (Tú)</span>
          </div>

          {raisedHandsCount > 0 && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fbbc04] text-[#202124] text-xs font-semibold shadow-lg">
              <Hand className="w-4 h-4" />
              <span>{raisedHandsCount} mano(s) levantada(s)</span>
            </div>
          )}

          {connectedList.length > 0 && (
            <div className="absolute top-4 right-4 flex flex-col gap-2 max-w-[180px]">
              {connectedList.slice(0, 4).map(([uid, info]) => {
                const hasHand = Boolean(raisedHands[uid]);
                return (
                  <div
                    key={uid}
                    className="px-3 py-2 rounded-xl bg-[#202124]/90 backdrop-blur-md border border-white/10 flex items-center gap-2.5 shadow-lg"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#8ab4f8] text-[#202124] flex items-center justify-center text-xs font-bold shrink-0">
                      {(info.name || "E").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-white truncate flex-1">
                      {info.name}
                    </span>
                    {hasHand && <Hand className="w-3.5 h-3.5 text-[#fbbc04] shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {raisedHandsCount > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                      Manos levantadas
                    </span>
                    {Object.entries(raisedHands).map(([uid, h]) => (
                      <div
                        key={uid}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs"
                      >
                        <span className="font-medium text-zinc-900">{h.name}</span>
                        <Hand className="w-4 h-4 text-amber-600" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                    En la clase ({connectedList.length + 1})
                  </span>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-semibold">
                        {teacherName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{teacherName} (Tú)</p>
                        <p className="text-[11px] text-zinc-500">Anfitrión</p>
                      </div>
                    </div>
                  </div>

                  {effectiveAllowedStudents.map((s) => {
                    const isOnline = Boolean(connectedViewers[s.uid]);
                    return (
                      <div key={s.uid} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-medium text-zinc-900 truncate">{s.name}</p>
                            <p className="text-[11px] text-zinc-500">
                              {isOnline ? "Conectado" : "Autorizado"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
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
          <span className="truncate max-w-[220px]">{classTitle}</span>
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
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              screenOn
                ? "bg-[#8ab4f8] text-[#202124]"
                : "bg-[#3c4043] hover:bg-[#4a4e51] text-white"
            }`}
            title={screenOn ? "Dejar de presentar" : "Presentar ahora"}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleEndClass}
            className="px-5 h-11 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center gap-2 font-medium text-xs transition-all cursor-pointer"
            title="Finalizar clase"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 min-w-[200px]">
          <button
            type="button"
            onClick={() => setSidePanel((p) => (p === "people" ? "none" : "people"))}
            className={`relative p-2.5 rounded-full transition-colors cursor-pointer ${
              sidePanel === "people"
                ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                : "text-zinc-300 hover:bg-[#3c4043]"
            }`}
            title="Personas"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 rounded-full bg-[#3c4043] text-[10px] font-semibold text-white">
              {connectedList.length + 1}
            </span>
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
  );
}
