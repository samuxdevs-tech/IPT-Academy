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
  Code2,
  BarChart3,
  Pin,
  ExternalLink,
  Copy,
  Sparkles,
  Edit3,
  Lock,
  Unlock,
  Maximize2,
  CornerDownRight,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Radio,
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
  generateSessionCode8,
  WEBRTC_ICE_SERVERS,
  createCreditHash,
  getCanvasAuthorColorHCL,
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

interface PinnedResource {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

interface ActivePollData {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  createdAt: number;
  votes?: Record<string, { optionIndex: number; voterName: string }>;
}

export interface CanvasLineAuthor {
  uid: string;
  name: string;
  role: "teacher" | "student";
  colorHex: string;
  studentIndex: number;
}

export interface LiveCanvasData {
  active: boolean;
  language: "typescript" | "python" | "sql" | "html" | "notes";
  content: string;
  allowStudentEdit: boolean;
  updatedBy: string;
  updatedAt: number;
  studentOrder?: string[];
  lineAuthors?: Record<number, CanvasLineAuthor>;
}

interface PeerSession {
  pc: RTCPeerConnection;
  offerId: string;
  remoteDescSet: boolean;
  queuedIce: RTCIceCandidateInit[];
  unsubAnswer: () => void;
  unsubIce: () => void;
}

type PipCorner = "bottom-right" | "top-right" | "bottom-left" | "top-left";

export function LiveClassSplitView() {
  const { user, operatorProfile } = useAuth();
  const teacherUid = user?.uid || operatorProfile?.uid || "teacher_ipt_001";
  const teacherName = operatorProfile?.displayName || "Docente Titular IPT";

  // Estado de la sesión
  const [isLive, setIsLive] = useState(false);
  const [code8, setCode8] = useState<string | null>(null);
  const [listMode, setListMode] = useState<"fixed" | "manual">("fixed");
  const [classTitle, setClassTitle] = useState("Sesión en Vivo");
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [elapsedStr, setElapsedStr] = useState("00:00");

  // Marcador de Tema Actual en Cabecera
  const [currentTopic, setCurrentTopic] = useState("Introducción y objetivos de la sesión");
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState("Introducción y objetivos de la sesión");

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

  // Escenario y PiP
  const [stageMode, setStageMode] = useState<"video" | "canvas">("video");
  const [pipCorner, setPipCorner] = useState<PipCorner>("bottom-right");
  const [swapMainAndPip, setSwapMainAndPip] = useState(false);

  // Lienzo de Código y Notas en Vivo (Fondo blanco #FFFFFF, Docente Negro fijo #000000, Estudiantes HCL Razón Áurea empezando en Azul)
  const [liveCanvas, setLiveCanvas] = useState<LiveCanvasData>({
    active: false,
    language: "typescript",
    content:
      "// Lienzo Virtual — IPT Academy\n// Docente escribe en negro fijo (#000000) sobre fondo blanco.\n// Estudiantes escriben con muestreo HCL por razón áurea (1° en Azul).\n\nexport async function ejecutarCasoDeUso() {\n  console.log('Listo para comenzar');\n}\n",
    allowStudentEdit: false,
    updatedBy: teacherName,
    updatedAt: Date.now(),
    studentOrder: [],
    lineAuthors: {},
  });
  const [copiedCanvas, setCopiedCanvas] = useState(false);
  const canvasBackdropRef = useRef<HTMLDivElement | null>(null);

  // Micro-Encuestas / Pulso Rápido en Vivo
  const [activePoll, setActivePoll] = useState<ActivePollData | null>(null);
  const [customPollQuestion, setCustomPollQuestion] = useState("");
  const [customPollOptions, setCustomPollOptions] = useState(
    "Sí, todo claro\nTengo una duda\nRepitamos el ejemplo"
  );

  // Recursos Fijados (Pin) en el Chat
  const [pinnedResources, setPinnedResources] = useState<PinnedResource[]>([]);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinTitle, setPinTitle] = useState("");
  const [pinUrl, setPinUrl] = useState("");

  // Paneles laterales durante la sesión
  const [sidePanel, setSidePanel] = useState<"none" | "people" | "chat" | "polls">("none");
  const [connectedViewers, setConnectedViewers] = useState<
    Record<
      string,
      {
        name: string;
        joinedAt: number;
        micMuted?: boolean;
        renegotiateAt?: number;
      }
    >
  >({});
  const [raisedHands, setRaisedHands] = useState<
    Record<string, { name: string; timestamp: number }>
  >({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Referencias mutables libres de closures obsoletos
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const studentAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  const isLiveRef = useRef<boolean>(false);
  const code8Ref = useRef<string | null>(null);
  const connectedUidsRef = useRef<Set<string>>(new Set());
  const peerRenegotiateStampRef = useRef<Map<string, number>>(new Map());
  const peerSessionsRef = useRef<Map<string, PeerSession>>(new Map());
  const railwayWsRef = useRef<WebSocket | null>(null);

  // Cronómetro en vivo de la sesión
  useEffect(() => {
    if (!isLive || !startedAtMs) {
      setElapsedStr("00:00");
      return;
    }
    const tick = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      if (hrs > 0) {
        setElapsedStr(
          `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      } else {
        setElapsedStr(
          `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLive, startedAtMs]);

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

  // Sincronizar vistas previas de video local (Principal + PiP)
  const syncLocalVideoPreview = useCallback(() => {
    const sTrack =
      screenVideoTrackRef.current && screenVideoTrackRef.current.readyState === "live"
        ? screenVideoTrackRef.current
        : null;
    const cTrack =
      camTrackRef.current && camTrackRef.current.readyState === "live"
        ? camTrackRef.current
        : null;

    let mainTrack: MediaStreamTrack | null = null;
    let secondaryTrack: MediaStreamTrack | null = null;

    if (sTrack && cTrack) {
      mainTrack = swapMainAndPip ? cTrack : sTrack;
      secondaryTrack = swapMainAndPip ? sTrack : cTrack;
    } else {
      mainTrack = sTrack || cTrack;
      secondaryTrack = null;
    }

    if (videoRef.current) {
      if (mainTrack) {
        videoRef.current.srcObject = new MediaStream([mainTrack]);
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.srcObject = null;
      }
    }

    if (pipVideoRef.current) {
      const pipTarget = stageMode === "canvas" ? mainTrack : secondaryTrack;
      if (pipTarget) {
        pipVideoRef.current.srcObject = new MediaStream([pipTarget]);
        pipVideoRef.current.play().catch(() => {});
      } else {
        pipVideoRef.current.srcObject = null;
      }
    }
  }, [stageMode, swapMainAndPip]);

  useEffect(() => {
    syncLocalVideoPreview();
  }, [isLive, camOn, screenOn, stageMode, swapMainAndPip, syncLocalVideoPreview]);

  // Publicar estado de medios en RTDB
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
      hasScreen,
      hasCam,
      hasAudio: hasMic || Boolean(screenAudioTrackRef.current),
      mode: hasScreen && hasCam ? "dual" : hasScreen ? "screen" : hasCam ? "camera" : "none",
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

  // Crear y negociar una conexión WebRTC limpia con un estudiante (soporta Dual Video + Audio Bidireccional)
  const negotiateWithStudent = useCallback(
    async (studentUid: string) => {
      const activeCode = code8Ref.current;
      if (!isLiveRef.current || !activeCode) return;
      const listKey = `allowed_list_${activeCode}`;

      closePeerSession(studentUid);

      const offerId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

      const sTrack =
        screenVideoTrackRef.current && screenVideoTrackRef.current.readyState === "live"
          ? screenVideoTrackRef.current
          : null;
      const cTrack =
        camTrackRef.current && camTrackRef.current.readyState === "live"
          ? camTrackRef.current
          : null;
      const activeAudioTrack = micTrackRef.current || screenAudioTrackRef.current;

      const primaryStream = new MediaStream();
      const primaryVideoTrack = sTrack || cTrack;

      if (primaryVideoTrack) {
        primaryStream.addTrack(primaryVideoTrack);
        pc.addTrack(primaryVideoTrack, primaryStream);
      } else {
        pc.addTransceiver("video", { direction: "sendrecv" });
      }

      if (activeAudioTrack && activeAudioTrack.readyState === "live") {
        primaryStream.addTrack(activeAudioTrack);
        pc.addTrack(activeAudioTrack, primaryStream);
      } else {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }

      if (sTrack && cTrack) {
        const pipStream = new MediaStream([cTrack]);
        pc.addTrack(cTrack, pipStream);
      }

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

  // Sincronizar cambios de medios con todos los estudiantes conectados
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
        await broadcastMediaUpdateToAllStudents();
      } else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });
        const sVideoTrack = displayStream.getVideoTracks()[0];
        const sAudioTrack = displayStream.getAudioTracks()[0] || null;

        if (sVideoTrack) {
          screenVideoTrackRef.current = sVideoTrack;
          screenAudioTrackRef.current = sAudioTrack;

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

          setScreenOn(true);
          syncLocalVideoPreview();
          await broadcastMediaUpdateToAllStudents();
        }
      }
    } catch (err) {
      console.warn("Compartir pantalla cancelado:", err);
    }
  };

  // Lista efectiva de estudiantes que conformarán {allowed_live_students}
  const effectiveAllowedStudents = useMemo<StudentCandidate[]>(() => {
    if (listMode === "fixed") {
      if (selectedScheduledId) {
        const filtered = bookedStudents.filter(
          (b) => !b.bookedSessionId || b.bookedSessionId === selectedScheduledId
        );
        if (filtered.length > 0) return filtered;
      }
      return bookedStudents.length > 0 ? bookedStudents : allStudents;
    } else {
      return allStudents.filter((s) => manualSelectedUids.has(s.uid));
    }
  }, [listMode, selectedScheduledId, bookedStudents, allStudents, manualSelectedUids]);

  // Iniciar Clase
  const handleStartLiveClass = async () => {
    const generatedCode = generateSessionCode8();
    const listKey = `allowed_list_${generatedCode}`;
    const nowMs = Date.now();

    code8Ref.current = generatedCode;
    isLiveRef.current = true;
    setStartedAtMs(nowMs);

    const studentsMap: Record<
      string,
      {
        uid: string;
        name: string;
        email: string;
        signature: string;
      }
    > = {};

    const signaturesUpdates: Record<string, string> = {};

    for (const s of effectiveAllowedStudents) {
      const bookingId = s.bookingId || `bk_${generatedCode}_${s.uid.slice(0, 6)}`;
      let sig = s.signature;
      if (!sig) {
        const fallbackHash = await createCreditHash(s.uid, 0, generatedCode);
        sig = `${bookingId}: ${fallbackHash}`;
        signaturesUpdates[bookingId] = fallbackHash;
      } else {
        const parts = sig.split(":");
        if (parts.length >= 2) {
          signaturesUpdates[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      }

      studentsMap[s.uid] = {
        uid: s.uid,
        name: s.name,
        email: s.email,
        signature: sig,
      };
    }

    if (Object.keys(signaturesUpdates).length > 0) {
      for (const [bId, hVal] of Object.entries(signaturesUpdates)) {
        await set(ref(rtdb, `consumed_credit_signatures/${bId}`), hVal);
      }
    }

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

    const initialLines = (liveCanvas.content || "").split("\n");
    const initialLineAuthors: Record<number, CanvasLineAuthor> = {};
    initialLines.forEach((_, idx) => {
      initialLineAuthors[idx] = {
        uid: teacherUid,
        name: teacherName,
        role: "teacher",
        colorHex: "#000000",
        studentIndex: -1,
      };
    });

    const initialCanvas: LiveCanvasData = {
      ...liveCanvas,
      active: false,
      updatedBy: teacherName,
      updatedAt: nowMs,
      studentOrder: effectiveAllowedStudents.map((s) => s.uid),
      lineAuthors: initialLineAuthors,
    };

    const payload = {
      code8: generatedCode,
      listKey,
      active: true,
      mode: listMode,
      teacherUid,
      teacherName,
      title: classTitle,
      currentTopic,
      startedAt: nowMs,
      mediaState: {
        hasVideo: hasScreen || hasCam,
        hasScreen,
        hasCam,
        hasAudio: hasMic || Boolean(screenAudioTrackRef.current),
        mode: hasScreen && hasCam ? "dual" : hasScreen ? "screen" : hasCam ? "camera" : "none",
        updatedAt: nowMs,
      },
      liveCanvas: initialCanvas,
      students: studentsMap,
    };

    await set(ref(rtdb, `allowed_live_students/${listKey}`), payload);
    await set(ref(rtdb, `allowed_lists/${listKey}`), payload);

    const railwayHttpUrl = process.env.NEXT_PUBLIC_RAILWAY_WEBRTC_HTTP_URL || "";
    const railwayWsUrl = process.env.NEXT_PUBLIC_RAILWAY_WEBRTC_URL || "";

    if (railwayHttpUrl) {
      fetch(`${railwayHttpUrl.replace(/\/$/, "")}/api/rooms/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code8: generatedCode,
          teacherUid,
          teacherName,
          title: classTitle,
          mode: listMode,
          students: Object.values(studentsMap),
        }),
      }).catch(() => {});
    }

    if (railwayWsUrl) {
      try {
        const ws = new WebSocket(railwayWsUrl);
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "join-room",
              code8: generatedCode,
              uid: teacherUid,
              name: teacherName,
              role: "teacher",
              payload: {
                title: classTitle,
                mode: listMode,
                allowedStudents: Object.values(studentsMap),
              },
            })
          );
        };
        railwayWsRef.current = ws;
      } catch {}
    }

    setCode8(generatedCode);
    setIsLive(true);
    setTimeout(() => syncLocalVideoPreview(), 50);
  };

  // Escuchar espectadores conectados, manos levantadas, chat, lienzo y encuestas
  useEffect(() => {
    if (!isLive || !code8) return;
    const listKey = `allowed_list_${code8}`;

    const viewersRef = ref(rtdb, `allowed_live_students/${listKey}/connected_viewers`);
    const handsRef = ref(rtdb, `allowed_live_students/${listKey}/raised_hands`);
    const chatRef = ref(rtdb, `allowed_live_students/${listKey}/chat`);
    const canvasRef = ref(rtdb, `allowed_live_students/${listKey}/liveCanvas`);
    const pollRef = ref(rtdb, `allowed_live_students/${listKey}/activePoll`);
    const pinsRef = ref(rtdb, `allowed_live_students/${listKey}/pinnedResources`);

    const unsubViewers = onValue(viewersRef, (snap) => {
      const val = snap.exists() ? snap.val() : {};
      setConnectedViewers(val);

      const currentUids = Object.keys(val);
      connectedUidsRef.current = new Set(currentUids);

      currentUids.forEach((sUid) => {
        const viewerData = val[sUid] || {};
        const reqStamp = viewerData.renegotiateAt || 0;
        const lastStamp = peerRenegotiateStampRef.current.get(sUid) || 0;

        if (!peerSessionsRef.current.has(sUid) || reqStamp > lastStamp) {
          peerRenegotiateStampRef.current.set(sUid, reqStamp);
          negotiateWithStudent(sUid);
        }
      });

      for (const existingUid of Array.from(peerSessionsRef.current.keys())) {
        if (!val[existingUid]) {
          closePeerSession(existingUid);
        }
      }
    });

    const unsubHands = onValue(handsRef, (snap) => {
      setRaisedHands(snap.exists() ? snap.val() : {});
    });

    const unsubChat = onValue(chatRef, (snap) => {
      if (!snap.exists()) {
        setChatMessages([]);
        return;
      }
      const raw = snap.val();
      const list: ChatMessage[] = Object.keys(raw).map((k) => ({
        id: k,
        ...raw[k],
      }));
      setChatMessages(list);
    });

    const unsubCanvas = onValue(canvasRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as LiveCanvasData;
        setLiveCanvas(data);
      }
    });

    const unsubPoll = onValue(pollRef, (snap) => {
      if (snap.exists()) {
        setActivePoll(snap.val() as ActivePollData);
      } else {
        setActivePoll(null);
      }
    });

    const unsubPins = onValue(pinsRef, (snap) => {
      if (!snap.exists()) {
        setPinnedResources([]);
        return;
      }
      const raw = snap.val();
      const arr: PinnedResource[] = Object.keys(raw)
        .map((k) => ({ id: k, ...raw[k] }))
        .sort((a, b) => b.createdAt - a.createdAt);
      setPinnedResources(arr);
    });

    return () => {
      unsubViewers();
      unsubHands();
      unsubChat();
      unsubCanvas();
      unsubPoll();
      unsubPins();
    };
  }, [isLive, code8, negotiateWithStudent, closePeerSession]);

  // Finalizar clase y limpiar listas efímeras
  const handleEndLiveClass = async () => {
    const activeCode = code8Ref.current || code8;
    isLiveRef.current = false;
    code8Ref.current = null;
    connectedUidsRef.current.clear();
    peerRenegotiateStampRef.current.clear();

    if (activeCode) {
      const listKey = `allowed_list_${activeCode}`;
      await remove(ref(rtdb, `allowed_live_students/${listKey}`)).catch(() => {});
      await remove(ref(rtdb, `allowed_lists/${listKey}`)).catch(() => {});

      const railwayHttpUrl = process.env.NEXT_PUBLIC_RAILWAY_WEBRTC_HTTP_URL || "";
      if (railwayHttpUrl) {
        fetch(`${railwayHttpUrl.replace(/\/$/, "")}/api/rooms/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code8: activeCode }),
        }).catch(() => {});
      }
    }

    if (railwayWsRef.current) {
      railwayWsRef.current.close();
      railwayWsRef.current = null;
    }

    for (const sUid of Array.from(peerSessionsRef.current.keys())) {
      closePeerSession(sUid);
    }

    if (screenVideoTrackRef.current) {
      screenVideoTrackRef.current.stop();
      screenVideoTrackRef.current = null;
    }
    if (screenAudioTrackRef.current) {
      screenAudioTrackRef.current.stop();
      screenAudioTrackRef.current = null;
    }
    setScreenOn(false);
    setIsLive(false);
    setCode8(null);
    setStartedAtMs(null);
    setSidePanel("none");
    setStageMode("video");
    syncLocalVideoPreview();
  };

  // Actualizar Tema Actual en Vivo
  const handleSaveTopic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = topicDraft.trim() || "Sesión en Vivo";
    setCurrentTopic(clean);
    setEditingTopic(false);
    if (isLive && code8) {
      const listKey = `allowed_list_${code8}`;
      await set(ref(rtdb, `allowed_live_students/${listKey}/currentTopic`), clean).catch(() => {});
    }
  };

  // Alternar Escenario de Código en Vivo
  const handleToggleStageCanvas = async () => {
    const nextMode = stageMode === "canvas" ? "video" : "canvas";
    setStageMode(nextMode);
    const updated: LiveCanvasData = {
      ...liveCanvas,
      active: nextMode === "canvas",
      updatedBy: teacherName,
      updatedAt: Date.now(),
    };
    setLiveCanvas(updated);
    if (isLive && code8) {
      await set(ref(rtdb, `allowed_live_students/allowed_list_${code8}/liveCanvas`), updated).catch(
        () => {}
      );
    }
  };

  // Actualizar Contenido / Idioma / Permisos del Lienzo en Vivo (Docente siempre escribe en Negro fijo #000000)
  const updateLiveCanvas = async (partial: Partial<LiveCanvasData>) => {
    const nextLineAuthors: Record<number, CanvasLineAuthor> = {
      ...(liveCanvas.lineAuthors || {}),
    };

    if (typeof partial.content === "string") {
      const prevLines = (liveCanvas.content || "").split("\n");
      const nextLines = partial.content.split("\n");
      nextLines.forEach((lineText, idx) => {
        if (lineText !== prevLines[idx] || !nextLineAuthors[idx]) {
          nextLineAuthors[idx] = {
            uid: teacherUid,
            name: teacherName,
            role: "teacher",
            colorHex: "#000000", // Negro fijo para el docente sobre fondo blanco
            studentIndex: -1,
          };
        }
      });
    }

    const updated: LiveCanvasData = {
      ...liveCanvas,
      ...partial,
      lineAuthors: nextLineAuthors,
      updatedBy: teacherName,
      updatedAt: Date.now(),
    };
    setLiveCanvas(updated);
    if (isLive && code8) {
      await set(ref(rtdb, `allowed_live_students/allowed_list_${code8}/liveCanvas`), updated).catch(
        () => {}
      );
    }
  };

  const handleCopyCanvas = () => {
    navigator.clipboard.writeText(liveCanvas.content || "");
    setCopiedCanvas(true);
    setTimeout(() => setCopiedCanvas(false), 2000);
  };

  // Lanzar Micro-Encuesta / Pulso Rápido en Vivo
  const launchQuickPoll = async (question: string, options: string[]) => {
    if (!isLive || !code8) return;
    const pollData: ActivePollData = {
      id: `poll_${Date.now()}`,
      question,
      options,
      active: true,
      createdAt: Date.now(),
      votes: {},
    };
    setActivePoll(pollData);
    await set(
      ref(rtdb, `allowed_live_students/allowed_list_${code8}/activePoll`),
      pollData
    ).catch(() => {});
  };

  const handleClosePoll = async () => {
    if (!isLive || !code8) return;
    await remove(ref(rtdb, `allowed_live_students/allowed_list_${code8}/activePoll`)).catch(
      () => {}
    );
    setActivePoll(null);
  };

  // Fijar un Recurso / Enlace arriba del Chat
  const handlePinResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTitle.trim() || !pinUrl.trim() || !isLive || !code8) return;
    const normalizedUrl = pinUrl.trim().startsWith("http")
      ? pinUrl.trim()
      : `https://${pinUrl.trim()}`;
    const pinRef = push(
      ref(rtdb, `allowed_live_students/allowed_list_${code8}/pinnedResources`)
    );
    await set(pinRef, {
      title: pinTitle.trim(),
      url: normalizedUrl,
      createdAt: Date.now(),
    });
    setPinTitle("");
    setPinUrl("");
    setShowPinForm(false);
  };

  const handleRemovePin = async (pinId: string) => {
    if (!isLive || !code8) return;
    await remove(
      ref(rtdb, `allowed_live_students/allowed_list_${code8}/pinnedResources/${pinId}`)
    ).catch(() => {});
  };

  // Control de Voz del Docente sobre Estudiantes ("Dar la palabra" / "Silenciar")
  const handleGrantFloorToStudent = async (studentUid: string) => {
    if (!isLive || !code8) return;
    const listKey = `allowed_list_${code8}`;
    await remove(ref(rtdb, `allowed_live_students/${listKey}/raised_hands/${studentUid}`)).catch(
      () => {}
    );
    await set(
      ref(rtdb, `allowed_live_students/${listKey}/participantControls/${studentUid}`),
      {
        floorGranted: true,
        forceMuted: false,
        updatedAt: Date.now(),
      }
    ).catch(() => {});
  };

  const handleMuteStudentRemotely = async (studentUid: string) => {
    if (!isLive || !code8) return;
    const listKey = `allowed_list_${code8}`;
    await set(
      ref(rtdb, `allowed_live_students/${listKey}/participantControls/${studentUid}`),
      {
        floorGranted: false,
        forceMuted: true,
        updatedAt: Date.now(),
      }
    ).catch(() => {});
    await update(
      ref(rtdb, `allowed_live_students/${listKey}/connected_viewers/${studentUid}`),
      { micMuted: true }
    ).catch(() => {});
  };

  // Enviar mensaje al chat de la sala
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !code8) return;
    const listKey = `allowed_list_${code8}`;
    const msgRef = push(ref(rtdb, `allowed_live_students/${listKey}/chat`));
    await set(msgRef, {
      senderName: teacherName,
      senderRole: "teacher",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setChatInput("");
  };

  const toggleManualStudent = (uid: string) => {
    setManualSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const cyclePipCorner = () => {
    const order: PipCorner[] = ["bottom-right", "top-right", "top-left", "bottom-left"];
    const idx = order.indexOf(pipCorner);
    setPipCorner(order[(idx + 1) % order.length]);
  };

  const pipCornerClass = useMemo(() => {
    switch (pipCorner) {
      case "top-right":
        return "top-20 right-6";
      case "top-left":
        return "top-20 left-6";
      case "bottom-left":
        return "bottom-24 left-6";
      default:
        return "bottom-24 right-6";
    }
  }, [pipCorner]);

  const filteredManualStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [allStudents, searchQuery]);

  // ============================================================================
  // VISTA 1: ANTESALA DE PREPARACIÓN (Obsidian Studio & Electric Iris)
  // ============================================================================
  if (!isLive) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#050507] text-white flex items-center justify-center p-6 rounded-[28px] border border-white/[0.07] relative overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[520px] h-[520px] bg-[#8052ff]/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 right-1/4 w-[420px] h-[420px] bg-[#10b981]/[0.04] rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Previsualización de Cámara / Escenario (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-[#09090b] rounded-[24px] overflow-hidden border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  camOn || screenOn ? "block" : "hidden"
                }`}
              />

              {!camOn && !screenOn && (
                <div className="flex flex-col items-center justify-center text-center px-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8052ff]/25 to-[#09090b] border border-[#8052ff]/40 flex items-center justify-center text-3xl font-semibold text-white mb-4 shadow-[0_0_40px_rgba(128,82,255,0.25)]">
                    {teacherName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-white">
                    Estudio listo para transmitir
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Activa tu cámara o micrófono cuando quieras comenzar
                  </p>
                </div>
              )}

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#050507]/85 backdrop-blur-md border border-white/10 text-[11px] font-medium text-zinc-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      camOn || micOn ? "bg-[#10b981]" : "bg-zinc-500"
                    }`}
                  />
                  {teacherName}
                </span>
              </div>

              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#050507]/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
                <button
                  type="button"
                  onClick={toggleMic}
                  title={micOn ? "Desactivar micrófono" : "Activar micrófono"}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    micOn
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      : "bg-rose-500/90 hover:bg-rose-500 text-white"
                  }`}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  title={camOn ? "Desactivar cámara" : "Activar cámara"}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    camOn
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      : "bg-rose-500/90 hover:bg-rose-500 text-white"
                  }`}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Configuración de Sesión y Asistentes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-[#09090b]/90 backdrop-blur-xl rounded-[24px] p-6 sm:p-7 border border-white/[0.08] shadow-[0_25px_70px_rgba(0,0,0,0.75)]">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#8052ff]/15 border border-[#8052ff]/30 text-[#b79aff] text-[11px] font-medium mb-3">
              <Radio className="w-3.5 h-3.5 text-[#8052ff]" />
              <span>Estudio en Vivo IPT Academy</span>
            </div>

            <h2 className="text-2xl font-normal text-white tracking-tight mb-1">
              Preparar transmisión
            </h2>
            <p className="text-xs text-zinc-400 mb-5">
              Define el tema inicial y confirma los estudiantes convocados a esta sesión.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Tema actual en cabecera
              </label>
              <input
                type="text"
                value={topicDraft}
                onChange={(e) => {
                  setTopicDraft(e.target.value);
                  setCurrentTopic(e.target.value);
                }}
                placeholder="Ej. Arquitectura de Microservicios en Tiempo Real"
                className="w-full bg-[#050507] border border-white/10 focus:border-[#8052ff] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050507] rounded-xl mb-4 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setListMode("fixed")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  listMode === "fixed"
                    ? "bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.35)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Próxima agendada</span>
              </button>
              <button
                type="button"
                onClick={() => setListMode("manual")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  listMode === "manual"
                    ? "bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.35)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Escoger alumnos</span>
              </button>
            </div>

            {listMode === "fixed" ? (
              <div className="space-y-4 mb-6">
                {scheduledClasses.length > 0 ? (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                      Horario programado
                    </label>
                    <select
                      value={selectedScheduledId}
                      onChange={(e) => {
                        setSelectedScheduledId(e.target.value);
                        const found = scheduledClasses.find((c) => c.id === e.target.value);
                        if (found) setClassTitle(found.title);
                      }}
                      className="w-full bg-[#050507] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#8052ff]"
                    >
                      {scheduledClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.title} —{" "}
                          {new Date(cls.startUtc).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#050507] border border-white/[0.06] flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#8052ff] shrink-0" />
                    <div className="text-xs text-zinc-300">
                      Sesión inmediata con los estudiantes inscritos hoy.
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                    <span>Estudiantes autorizados para entrar</span>
                    <span className="text-white font-medium">
                      {effectiveAllowedStudents.length}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {effectiveAllowedStudents.map((stu, idx) => {
                      const hclColor = getCanvasAuthorColorHCL("student", idx);
                      return (
                        <div
                          key={stu.uid}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#050507] border border-white/[0.05] text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-semibold shrink-0"
                              style={{ backgroundColor: hclColor.hex }}
                            >
                              {stu.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-zinc-200 truncate">{stu.name}</span>
                          </div>
                          <span className="text-[10px] text-[#10b981] font-medium">
                            Acceso listo
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full bg-[#050507] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#8052ff]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredManualStudents.map((stu) => {
                    const selected = manualSelectedUids.has(stu.uid);
                    return (
                      <button
                        key={stu.uid}
                        type="button"
                        onClick={() => toggleManualStudent(stu.uid)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                          selected
                            ? "bg-[#8052ff]/15 border-[#8052ff]/50 text-white"
                            : "bg-[#050507] border-white/[0.05] text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{stu.name}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center ${
                            selected ? "bg-[#8052ff] text-white" : "border border-zinc-600"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartLiveClass}
              disabled={effectiveAllowedStudents.length === 0}
              className="w-full py-3.5 px-6 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] disabled:opacity-40 text-white font-semibold text-sm transition-all shadow-[0_0_35px_rgba(128,82,255,0.4)] cursor-pointer"
            >
              Iniciar clase en vivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 2: SALA EN VIVO — OBSIDIAN STUDIO & ELECTRIC IRIS
  // ============================================================================
  const viewersCount = Object.keys(connectedViewers).length;
  const handsList = Object.entries(raisedHands);
  const showPipWindow =
    (stageMode === "canvas" && (camOn || screenOn)) ||
    (stageMode === "video" && camOn && screenOn);

  const pollTotalVotes = activePoll?.votes ? Object.keys(activePoll.votes).length : 0;
  const canvasLines = (liveCanvas.content || "").split("\n");
  const studentOrderList =
    liveCanvas.studentOrder && liveCanvas.studentOrder.length > 0
      ? liveCanvas.studentOrder
      : effectiveAllowedStudents.map((s) => s.uid);

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col select-none overflow-hidden">
      {/* Contenedor oculto para reproducir el audio de los estudiantes */}
      <div ref={studentAudioContainerRef} className="hidden" />

      {/* Resplandor ambiental sutil */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#8052ff]/[0.05] rounded-full blur-[150px] pointer-events-none" />

      {/* CABECERA SUPERIOR: Cronómetro + Marcador de Tema Actual + Estado de Sala */}
      <header className="h-16 px-6 flex items-center justify-between gap-4 relative z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/30">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#10b981]">
              EN VIVO
            </span>
            <span className="text-xs font-mono text-white pl-1 border-l border-[#10b981]/30">
              {elapsedStr}
            </span>
          </div>

          <span className="text-sm font-medium text-zinc-200 truncate hidden sm:inline">
            {classTitle}
          </span>
        </div>

        {/* Centro: Píldora Interactiva de Tema Actual */}
        <div className="flex items-center justify-center flex-1 max-w-xl">
          {editingTopic ? (
            <form
              onSubmit={handleSaveTopic}
              className="flex items-center gap-2 w-full bg-[#09090b] border border-[#8052ff] rounded-full px-3.5 py-1 shadow-[0_0_25px_rgba(128,82,255,0.25)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
              <input
                type="text"
                autoFocus
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onBlur={() => handleSaveTopic()}
                placeholder="Escribe el tema que estás explicando..."
                className="w-full bg-transparent text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="text-[11px] font-semibold text-[#8052ff] hover:text-white px-2 py-0.5 cursor-pointer"
              >
                Guardar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTopicDraft(currentTopic);
                setEditingTopic(true);
              }}
              title="Haz clic para cambiar el tema actual en vivo"
              className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#09090b]/90 hover:bg-[#09090b] border border-white/10 hover:border-[#8052ff]/50 transition-all max-w-full cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
              <span className="text-xs text-zinc-400 hidden md:inline">Tema:</span>
              <span className="text-xs font-medium text-white truncate">
                {currentTopic}
              </span>
              <Edit3 className="w-3 h-3 text-zinc-500 group-hover:text-[#8052ff] shrink-0 transition-colors" />
            </button>
          )}
        </div>

        {/* Derecha: Contador de Conectados */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidePanel((p) => (p === "people" ? "none" : "people"))}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#09090b] border border-white/10 hover:border-white/25 text-xs font-medium text-zinc-200 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#8052ff]" />
            <span>{viewersCount + 1} en sala</span>
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL: ESCENARIO 24PX + PIP + PANEL LATERAL */}
      <div className="flex-1 flex px-6 pb-24 gap-4 overflow-hidden relative z-10">
        {/* Escenario Principal (Bordes 24px) */}
        <div className="flex-1 bg-[#09090b] rounded-[24px] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden relative flex items-center justify-center">
          {/* MODO 1: ESCENARIO DE VIDEO / PANTALLA */}
          <div
            className={`w-full h-full flex items-center justify-center ${
              stageMode === "video" ? "flex" : "hidden"
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                camOn || screenOn ? "block" : "hidden"
              }`}
            />

            {!camOn && !screenOn && (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8052ff]/25 to-[#050507] border border-[#8052ff]/40 flex items-center justify-center text-4xl font-semibold text-white mb-4 shadow-[0_0_50px_rgba(128,82,255,0.2)]">
                  {teacherName.charAt(0).toUpperCase()}
                </div>
                <p className="text-base font-medium text-white">{teacherName}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Puedes activar tu cámara, compartir pantalla o abrir el Lienzo en Vivo
                </p>
              </div>
            )}
          </div>

          {/* MODO 2: LIENZO VIRTUAL EN VIVO — FONDO BLANCO (#FFFFFF), DOCENTE NEGRO FIJO (#000000), ESTUDIANTES HCL RAZÓN ÁUREA (1° EN AZUL) */}
          {stageMode === "canvas" && (
            <div className="w-full h-full flex flex-col bg-[#ffffff] text-[#000000]">
              {/* Barra Superior del Lienzo Virtual */}
              <div className="px-5 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-900">
                    <Code2 className="w-4 h-4 text-[#0052eb]" />
                    <span>Lienzo Virtual</span>
                  </div>

                  <select
                    value={liveCanvas.language}
                    onChange={(e) =>
                      updateLiveCanvas({
                        language: e.target.value as LiveCanvasData["language"],
                      })
                    }
                    className="bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs text-zinc-900 font-medium outline-none focus:border-[#0052eb]"
                  >
                    <option value="typescript">TypeScript / JS</option>
                    <option value="python">Python</option>
                    <option value="sql">SQL</option>
                    <option value="html">HTML / CSS</option>
                    <option value="notes">Notas y Arquitectura</option>
                  </select>

                  {/* Leyenda cromática activa: Docente Negro fijo (#000000) + Estudiantes HCL Razón Áurea empezando en Azul */}
                  <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-zinc-300">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200/80 text-[11px] font-medium text-black">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: "#000000" }}
                      />
                      Docente
                    </span>
                    {effectiveAllowedStudents.slice(0, 4).map((stu, idx) => {
                      const sIdx = Math.max(0, studentOrderList.indexOf(stu.uid));
                      const hcl = getCanvasAuthorColorHCL(
                        "student",
                        sIdx >= 0 ? sIdx : idx
                      );
                      return (
                        <span
                          key={stu.uid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-[11px] font-medium"
                          style={{ color: hcl.hex }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hcl.hex }}
                          />
                          {stu.name.split(" ")[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateLiveCanvas({
                        allowStudentEdit: !liveCanvas.allowStudentEdit,
                      })
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      liveCanvas.allowStudentEdit
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {liveCanvas.allowStudentEdit ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Edición de alumnos: Activa</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Solo lectura para alumnos</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCanvas}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-all cursor-pointer"
                  >
                    {copiedCanvas ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar todo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cuerpo del Lienzo Blanco con Coloreado por Autor (Docente = #000000, Estudiantes = HCL Razón Áurea) */}
              <div className="flex-1 flex overflow-hidden font-mono text-sm bg-[#ffffff] relative">
                {/* Columna de numeración de líneas e indicador cromático del autor */}
                <div className="w-14 py-4 bg-zinc-50 border-r border-zinc-200 text-right pr-3 select-none text-zinc-400 text-xs leading-6 shrink-0">
                  {canvasLines.map((_, idx) => {
                    const lineAuth = liveCanvas.lineAuthors?.[idx];
                    const dotColor = lineAuth?.colorHex || "#000000";
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-end gap-1.5 h-6"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span>{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Contenedor superpuesto: Capa de renderizado HCL por línea + Textarea interactivo */}
                <div className="flex-1 relative overflow-hidden bg-[#ffffff]">
                  <div
                    ref={canvasBackdropRef}
                    aria-hidden="true"
                    className="absolute inset-0 p-4 overflow-hidden pointer-events-none font-mono text-sm leading-6 whitespace-pre"
                  >
                    {canvasLines.map((lineText, idx) => {
                      const lineAuth = liveCanvas.lineAuthors?.[idx];
                      const lineColor = lineAuth?.colorHex || "#000000";
                      return (
                        <div
                          key={idx}
                          className="h-6 flex items-center justify-between pr-4"
                          style={{ color: lineColor }}
                        >
                          <span>{lineText || " "}</span>
                          {lineAuth && lineText.trim().length > 0 && (
                            <span
                              className="text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded bg-zinc-100/90 ml-4 shrink-0"
                              style={{ color: lineColor }}
                            >
                              {lineAuth.name.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <textarea
                    value={liveCanvas.content}
                    onChange={(e) => updateLiveCanvas({ content: e.target.value })}
                    onScroll={(e) => {
                      if (canvasBackdropRef.current) {
                        canvasBackdropRef.current.scrollTop = e.currentTarget.scrollTop;
                        canvasBackdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
                      }
                    }}
                    spellCheck={false}
                    placeholder="Escribe en el lienzo..."
                    style={{ caretColor: "#000000" }}
                    className="absolute inset-0 w-full h-full bg-transparent p-4 text-transparent outline-none resize-none leading-6 font-mono text-sm whitespace-pre overflow-auto selection:bg-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VENTANA FLOTANTE PiP (Picture-in-Picture Dinámico) */}
          <div
            className={`absolute ${pipCornerClass} z-30 w-60 sm:w-72 aspect-video rounded-2xl bg-[#050507] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden group transition-all ${
              showPipWindow ? "block" : "hidden"
            }`}
          >
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 top-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent">
              <button
                type="button"
                onClick={cyclePipCorner}
                title="Cambiar esquina de la miniatura"
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white border border-white/10 cursor-pointer"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
              </button>
              {stageMode === "video" && camOn && screenOn && (
                <button
                  type="button"
                  onClick={() => setSwapMainAndPip((s) => !s)}
                  title="Intercambiar con el escenario principal"
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white border border-white/10 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-medium text-zinc-200">
              {stageMode === "canvas" ? "Vista de cámara / pantalla" : "Cámara Docente"}
            </div>
          </div>

          {/* NOTIFICACIÓN FLOTANTE DE MANOS LEVANTADAS */}
          {handsList.length > 0 && (
            <div className="absolute top-5 left-5 z-30 flex flex-col gap-2">
              {handsList.map(([sUid, h]) => (
                <div
                  key={sUid}
                  className="flex items-center gap-3 bg-[#09090b]/95 backdrop-blur-xl border border-amber-400/40 text-white px-4 py-2.5 rounded-2xl shadow-2xl"
                >
                  <Hand className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                  <span className="text-xs font-medium">
                    <strong>{h.name}</strong> levantó la mano
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGrantFloorToStudent(sUid)}
                    className="px-2.5 py-1 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  >
                    Dar la palabra
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TARJETA FLOTANTE DE PULSO / ENCUESTA EN VIVO */}
          {activePoll && activePoll.active && (
            <div className="absolute top-5 right-5 z-30 w-80 bg-[#09090b]/95 backdrop-blur-2xl border border-[#8052ff]/40 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#b79aff]">
                  <BarChart3 className="w-3.5 h-3.5 text-[#8052ff]" />
                  Pulso en Vivo ({pollTotalVotes} votos)
                </span>
                <button
                  type="button"
                  onClick={handleClosePoll}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  Cerrar pulso
                </button>
              </div>
              <p className="text-xs font-medium text-white mb-3">{activePoll.question}</p>
              <div className="space-y-2">
                {activePoll.options.map((opt, idx) => {
                  const count = Object.values(activePoll.votes || {}).filter(
                    (v) => v.optionIndex === idx
                  ).length;
                  const pct =
                    pollTotalVotes > 0 ? Math.round((count / pollTotalVotes) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-200">{opt}</span>
                        <span className="text-zinc-400 font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-[#8052ff] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etiqueta inferior izquierda del docente */}
          {stageMode === "video" && (
            <div className="absolute bottom-4 left-5 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-2 border border-white/10">
              <span>{teacherName}</span>
              {!micOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
            </div>
          )}
        </div>

        {/* PANEL LATERAL (Participantes, Chat con Recursos Fijados o Creador de Pulsos) */}
        {sidePanel !== "none" && (
          <div className="w-85 bg-[#09090b] text-white rounded-[24px] border border-white/[0.08] flex flex-col overflow-hidden shadow-2xl shrink-0">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                {sidePanel === "people"
                  ? "Participantes y Control de Voz"
                  : sidePanel === "chat"
                  ? "Chat y Recursos Fijados"
                  : "Lanzar Pulso en Vivo"}
              </h3>
              <button
                type="button"
                onClick={() => setSidePanel("none")}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sidePanel === "people" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Conectados ahora ({viewersCount + 1})
                </div>

                {/* Docente */}
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black border border-white/20 text-white flex items-center justify-center text-xs font-semibold">
                      {teacherName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{teacherName} (Tú)</p>
                      <p className="text-[10px] text-zinc-400">
                        Color en lienzo: Negro fijo (#000000)
                      </p>
                    </div>
                  </div>
                  {micOn ? (
                    <Mic className="w-4 h-4 text-[#10b981]" />
                  ) : (
                    <MicOff className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                {/* Estudiantes conectados con controles de voz y color HCL asignado */}
                {Object.entries(connectedViewers).map(([uid, v], idx) => {
                  const hasHand = Boolean(raisedHands[uid]);
                  const studentMicActive = v.micMuted === false;
                  const sIdx = Math.max(0, studentOrderList.indexOf(uid));
                  const hclColor = getCanvasAuthorColorHCL(
                    "student",
                    sIdx >= 0 ? sIdx : idx
                  );
                  return (
                    <div
                      key={uid}
                      className="p-3 rounded-xl bg-[#050507] border border-white/[0.06] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{ backgroundColor: hclColor.hex }}
                          >
                            {(v.name || "E").charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-medium text-white truncate">
                              {v.name}
                            </p>
                            <p className="text-[10px] text-[#10b981]">
                              {studentMicActive ? "Micrófono abierto" : "En línea"} ·{" "}
                              <span style={{ color: hclColor.hex }}>{hclColor.hex}</span>
                            </p>
                          </div>
                        </div>
                        {hasHand && <Hand className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleGrantFloorToStudent(uid)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#8052ff]/20 hover:bg-[#8052ff]/30 border border-[#8052ff]/40 text-[11px] font-medium text-[#c4adff] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Dar la palabra</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMuteStudentRemotely(uid)}
                          className="py-1.5 px-2.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-[11px] font-medium text-zinc-300 hover:text-rose-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Silenciar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-white/[0.08]">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Autorizados en esta lista ({effectiveAllowedStudents.length})
                  </div>
                  <div className="space-y-1.5">
                    {effectiveAllowedStudents.map((stu, idx) => {
                      const isOnline = Boolean(connectedViewers[stu.uid]);
                      const hcl = getCanvasAuthorColorHCL("student", idx);
                      return (
                        <div
                          key={stu.uid}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: hcl.hex }}
                            />
                            <span className="text-zinc-300 truncate">{stu.name}</span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isOnline
                                ? "bg-[#10b981]/15 text-[#10b981]"
                                : "bg-white/[0.05] text-zinc-500"
                            }`}
                          >
                            {isOnline ? "Conectado" : "Pendiente"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {sidePanel === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3.5 bg-[#050507] border-b border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#b79aff]">
                      <Pin className="w-3.5 h-3.5 text-[#8052ff]" />
                      Recursos Fijados ({pinnedResources.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPinForm((s) => !s)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8052ff] hover:text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fijar enlace</span>
                    </button>
                  </div>

                  {showPinForm && (
                    <form onSubmit={handlePinResource} className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={pinTitle}
                        onChange={(e) => setPinTitle(e.target.value)}
                        placeholder="Título (ej. Repositorio de la clase)"
                        className="w-full bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#8052ff]"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={pinUrl}
                          onChange={(e) => setPinUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-[#09090b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#8052ff]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-[#8052ff] text-white text-xs font-semibold cursor-pointer"
                        >
                          Fijar
                        </button>
                      </div>
                    </form>
                  )}

                  {pinnedResources.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {pinnedResources.map((pin) => (
                        <div
                          key={pin.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#8052ff]/10 border border-[#8052ff]/30 text-xs"
                        >
                          <a
                            href={pin.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-white hover:text-[#b79aff] truncate font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
                            <span className="truncate">{pin.title}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemovePin(pin.id)}
                            className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8">
                      Los mensajes enviados durante la sesión aparecerán aquí.
                    </p>
                  ) : (
                    chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className="text-xs bg-[#050507] border border-white/[0.05] rounded-xl p-3"
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-semibold text-white">{m.senderName}</span>
                          <span className="text-[10px] text-zinc-500">{m.time}</span>
                        </div>
                        <p className="text-zinc-300 break-words leading-relaxed">{m.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={handleSendChat}
                  className="p-3 border-t border-white/[0.08] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Enviar un mensaje a la sala..."
                    className="flex-1 bg-[#050507] border border-white/10 rounded-full px-4 py-2 text-xs text-white outline-none focus:border-[#8052ff]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-white cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {sidePanel === "polls" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Lanza un pulso rápido con 1 clic para medir la comprensión de la sala en tiempo real:
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        launchQuickPoll("¿Quedó claro este concepto?", [
                          "Sí, todo claro",
                          "Tengo una pregunta puntual",
                          "Repitamos el ejemplo",
                        ])
                      }
                      className="w-full text-left p-3.5 rounded-2xl bg-[#050507] hover:bg-[#8052ff]/15 border border-white/10 hover:border-[#8052ff]/50 transition-all cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-white">
                        ¿Quedó claro este concepto?
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Sí, todo claro · Tengo una pregunta · Repitamos el ejemplo
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        launchQuickPoll("¿Cómo vas con el ejercicio práctico?", [
                          "Ya lo completé",
                          "Estoy avanzando bien",
                          "Necesito ayuda del docente",
                        ])
                      }
                      className="w-full text-left p-3.5 rounded-2xl bg-[#050507] hover:bg-[#8052ff]/15 border border-white/10 hover:border-[#8052ff]/50 transition-all cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-white">
                        ¿Cómo vas con el ejercicio práctico?
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Ya lo completé · Estoy avanzando · Necesito ayuda
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <p className="text-xs font-semibold text-white">
                    O escribe una pregunta personalizada
                  </p>
                  <input
                    type="text"
                    value={customPollQuestion}
                    onChange={(e) => setCustomPollQuestion(e.target.value)}
                    placeholder="Pregunta para los estudiantes..."
                    className="w-full bg-[#050507] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#8052ff]"
                  />
                  <textarea
                    rows={3}
                    value={customPollOptions}
                    onChange={(e) => setCustomPollOptions(e.target.value)}
                    placeholder="Una opción por línea..."
                    className="w-full bg-[#050507] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#8052ff]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const opts = customPollOptions
                        .split("\n")
                        .map((o) => o.trim())
                        .filter(Boolean);
                      if (customPollQuestion.trim() && opts.length >= 2) {
                        launchQuickPoll(customPollQuestion.trim(), opts);
                      }
                    }}
                    className="w-full py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    Publicar pulso en pantalla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DOCK FLOTANTE INFERIOR TIPO CÁPSULA DE CRISTAL OSCURO */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#09090b]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={toggleMic}
          title={micOn ? "Desactivar micrófono" : "Activar micrófono"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            micOn
              ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
              : "bg-rose-500/90 hover:bg-rose-500 text-white"
          }`}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          title={camOn ? "Desactivar cámara" : "Activar cámara"}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            camOn
              ? "bg-white/10 hover:bg-white/15 text-white border border-white/15"
              : "bg-rose-500/90 hover:bg-rose-500 text-white"
          }`}
        >
          {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={toggleScreenShare}
          title="Compartir pantalla"
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            screenOn
              ? "bg-[#10b981] text-black font-semibold shadow-[0_0_25px_rgba(16,185,129,0.4)]"
              : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
          }`}
        >
          <MonitorUp className="w-4 h-4" />
          <span className="hidden md:inline">
            {screenOn ? "Compartiendo" : "Pantalla"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleStageCanvas}
          title="Abrir o cerrar Pizarra de Código y Notas en Vivo"
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            stageMode === "canvas"
              ? "bg-[#8052ff] text-white font-semibold shadow-[0_0_25px_rgba(128,82,255,0.45)]"
              : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span className="hidden md:inline">Lienzo en Vivo</span>
        </button>

        <button
          type="button"
          onClick={() => setSidePanel((p) => (p === "polls" ? "none" : "polls"))}
          title="Lanzar pulso o pregunta rápida"
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            sidePanel === "polls" || (activePoll && activePoll.active)
              ? "bg-[#8052ff]/25 border border-[#8052ff] text-[#c4adff]"
              : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline">Pulso</span>
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => setSidePanel((p) => (p === "people" ? "none" : "people"))}
          title="Participantes y control de voz"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            sidePanel === "people"
              ? "bg-[#8052ff] text-white"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          {handsList.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">
              {handsList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSidePanel((p) => (p === "chat" ? "none" : "chat"))}
          title="Chat y recursos fijados"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            sidePanel === "chat"
              ? "bg-[#8052ff] text-white"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {pinnedResources.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#8052ff] text-white text-[10px] font-bold flex items-center justify-center">
              {pinnedResources.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleEndLiveClass}
          title="Finalizar clase para todos"
          className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 text-xs font-semibold transition-all ml-1 cursor-pointer shadow-[0_0_25px_rgba(225,29,72,0.4)]"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Finalizar</span>
        </button>
      </div>
    </div>
  );
}
