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
  PenTool,
  Type,
  Undo2,
  Eraser,
  Disc,
  Pause,
  Play,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import {
  uploadRecordedVideo,
  generateClassSummaryWithOpenRouter,
  saveRecordedClassRecord,
  SubtitleCue,
  RecordedClassData,
} from "@/lib/classRecordingPipeline";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  push,
  get,
  onDisconnect,
} from "firebase/database";
import {
  generateSessionCode8,
  WEBRTC_ICE_SERVERS,
  createCreditHash,
  getCanvasAuthorColorHCL,
  computeNextCharColors,
  groupLineIntoColorRuns,
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
  endUtc?: string;
  courseTitle: string;
  category?: string;
  completed?: boolean;
  status?: string;
  studentName?: string;
  studentUid?: string;
  bookedCount?: number;
  quorumRequired?: number;
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

export interface WhiteboardStroke {
  id: string;
  uid: string;
  name: string;
  role: "teacher" | "student";
  colorHex: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface LiveCanvasData {
  active: boolean;
  canvasMode: "text" | "board";
  content: string;
  charColors?: string[];
  strokes?: WhiteboardStroke[];
  allowStudentEdit: boolean;
  updatedBy: string;
  updatedAt: number;
  studentOrder?: string[];
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

const INITIAL_CANVAS_TEXT =
  "Notas y apuntes en vivo — IPT Academy\nEscribe aquí o cambia a Pizarrón para dibujar libremente.\n";

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

  // Modal posterior al finalizar clase y sincronización de calendario
  const [showPostClassModal, setShowPostClassModal] = useState<boolean>(false);
  const [classEndedInfo, setClassEndedInfo] = useState<{ id: string; title: string } | null>(null);
  const [autoMarkCalendarPref, setAutoMarkCalendarPref] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ipt_auto_mark_calendar_completed") === "true";
    }
    return false;
  });

  // Estado visual de dispositivos
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // Escenario y PiP
  const [stageMode, setStageMode] = useState<"video" | "canvas">("video");
  const [pipCorner, setPipCorner] = useState<PipCorner>("bottom-right");
  const [swapMainAndPip, setSwapMainAndPip] = useState(false);

  // Lienzo Virtual en Vivo: Solo 2 modos ("text" = Texto manual por carácter, "board" = Pizarrón / Dibujo libre)
  const [liveCanvas, setLiveCanvas] = useState<LiveCanvasData>({
    active: false,
    canvasMode: "text",
    content: INITIAL_CANVAS_TEXT,
    charColors: Array(INITIAL_CANVAS_TEXT.length).fill("#000000"),
    strokes: [],
    allowStudentEdit: false,
    updatedBy: teacherName,
    updatedAt: Date.now(),
    studentOrder: [],
  });
  const [copiedCanvas, setCopiedCanvas] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const canvasBackdropRef = useRef<HTMLDivElement | null>(null);
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);

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

  // Estados y referencias para grabación de video y transcripción Web Speech en vivo
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [savingStatusMessage, setSavingStatusMessage] = useState<string | null>(null);
  const [recordedSubtitlesCount, setRecordedSubtitlesCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedVideoChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const speechRecognitionActiveRef = useRef<boolean>(false);
  const recordedSubtitlesRef = useRef<SubtitleCue[]>([]);
  const classStartTimeRef = useRef<number>(Date.now());
  const recordingCanvasIntervalRef = useRef<any>(null);

  // ── Web Audio API Master Mixer (Mezclador Profesional para Grabación en Vivo) ──
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const screenAudioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenGainNodeRef = useRef<GainNode | null>(null);
  const studentGainNodesRef = useRef<Map<string, { source: MediaStreamAudioSourceNode; gain: GainNode }>>(new Map());

  const ensureAudioMixer = useCallback((): MediaStreamAudioDestinationNode | null => {
    try {
      if (typeof window === "undefined") return null;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (!audioDestinationRef.current) {
        const dest = ctx.createMediaStreamDestination();
        audioDestinationRef.current = dest;

        // Canal de ganancia maestro para el micrófono del docente
        const micGain = ctx.createGain();
        micGain.gain.value = 1;
        micGain.connect(dest);
        micGainNodeRef.current = micGain;

        // Canal de ganancia maestro para el audio del sistema / pantalla
        const screenGain = ctx.createGain();
        screenGain.gain.value = 1;
        screenGain.connect(dest);
        screenGainNodeRef.current = screenGain;
      }
      return audioDestinationRef.current;
    } catch (err) {
      console.warn("No se pudo inicializar AudioContext Mixer:", err);
      return null;
    }
  }, []);

  const attachMicToMixer = useCallback((stream: MediaStream) => {
    try {
      const dest = ensureAudioMixer();
      const ctx = audioContextRef.current;
      if (!ctx || !dest || !micGainNodeRef.current) return;

      if (micSourceNodeRef.current) {
        try { micSourceNodeRef.current.disconnect(); } catch {}
        micSourceNodeRef.current = null;
      }

      if (stream.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(stream);
        src.connect(micGainNodeRef.current);
        micSourceNodeRef.current = src;
        micGainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime);
      }
    } catch (err) {
      console.warn("Error al conectar micrófono al mezclador:", err);
    }
  }, [ensureAudioMixer]);

  const attachScreenAudioToMixer = useCallback((stream: MediaStream) => {
    try {
      const dest = ensureAudioMixer();
      const ctx = audioContextRef.current;
      if (!ctx || !dest || !screenGainNodeRef.current) return;

      if (screenAudioSourceNodeRef.current) {
        try { screenAudioSourceNodeRef.current.disconnect(); } catch {}
        screenAudioSourceNodeRef.current = null;
      }

      if (stream.getAudioTracks().length > 0) {
        const src = ctx.createMediaStreamSource(stream);
        src.connect(screenGainNodeRef.current);
        screenAudioSourceNodeRef.current = src;
        screenGainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime);
      }
    } catch (err) {
      console.warn("Error al conectar audio de pantalla:", err);
    }
  }, [ensureAudioMixer]);

  const detachScreenAudioFromMixer = useCallback(() => {
    if (screenAudioSourceNodeRef.current) {
      try { screenAudioSourceNodeRef.current.disconnect(); } catch {}
      screenAudioSourceNodeRef.current = null;
    }
  }, []);

  // Transcriptor nativo de voz en tiempo real con Web Speech API
  const startWebSpeechTranscriber = useCallback((startTimeMs: number) => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API no disponible en este navegador");
      return;
    }

    try {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.abort(); } catch {}
        speechRecognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-CO";

      recognition.onresult = (event: any) => {
        const now = Date.now();
        const relativeSeconds = Math.max(0, Math.floor((now - startTimeMs) / 1000));

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const phrase = event.results[i][0].transcript.trim();
            if (phrase.length > 0) {
              const startSec = Math.max(0, relativeSeconds - 3);
              const endSec = relativeSeconds;
              const cue: SubtitleCue = {
                id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                start: startSec,
                end: Math.max(startSec + 1, endSec),
                text: phrase,
              };
              recordedSubtitlesRef.current.push(cue);
              setRecordedSubtitlesCount(recordedSubtitlesRef.current.length);
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("SpeechRecognition error:", e.error);
        }
      };

      recognition.onend = () => {
        if (speechRecognitionActiveRef.current && isLiveRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      speechRecognitionActiveRef.current = true;
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn("No se pudo iniciar Web Speech API:", err);
    }
  }, []);

  // Iniciar MediaRecorder capturando el flujo de video y audio activo del docente
  const startMediaRecording = useCallback(() => {
    try {
      recordedVideoChunksRef.current = [];
      const tracks: MediaStreamTrack[] = [];

      const vTrack = screenVideoTrackRef.current || camTrackRef.current;
      if (vTrack && vTrack.readyState === "live") {
        tracks.push(vTrack);
      } else {
        // Generar flujo continuo de video a 25 fps con lienzo animado para evitar archivos WebM vacíos o congelados
        const recCanvas = document.createElement("canvas");
        recCanvas.width = 1280;
        recCanvas.height = 720;
        const ctx = recCanvas.getContext("2d");
        let tick = 0;

        if (recordingCanvasIntervalRef.current) {
          clearInterval(recordingCanvasIntervalRef.current);
        }

        recordingCanvasIntervalRef.current = setInterval(() => {
          if (!ctx) return;
          tick++;
          ctx.fillStyle = "#09090b";
          ctx.fillRect(0, 0, 1280, 720);

          const grad = ctx.createRadialGradient(640, 360, 40, 640, 360, 520);
          grad.addColorStop(0, "rgba(128, 82, 255, 0.18)");
          grad.addColorStop(1, "rgba(9, 9, 11, 1)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1280, 720);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 38px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("IPT Course · Clase en Vivo", 640, 320);

          ctx.fillStyle = "#8052ff";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText("Docente: " + (teacherName || "IPT Master"), 640, 375);

          const totalSecs = Math.floor(tick / 25);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
          ctx.fillStyle = "#a1a1aa";
          ctx.font = "16px monospace";
          ctx.fillText("Grabando sesión: " + timeStr, 640, 420);
        }, 40);

        const canvasStream = recCanvas.captureStream(25);
        const dummyVTrack = canvasStream.getVideoTracks()[0];
        if (dummyVTrack) tracks.push(dummyVTrack);
      }

      // Obtener el canal de audio maestro unificado desde el mezclador Web Audio
      const mixerDest = ensureAudioMixer();
      if (mixerDest && mixerDest.stream.getAudioTracks().length > 0) {
        const mixedAudioTrack = mixerDest.stream.getAudioTracks()[0];
        tracks.push(mixedAudioTrack);
      } else {
        if (micTrackRef.current && micTrackRef.current.readyState === "live") {
          tracks.push(micTrackRef.current);
        }
        if (screenAudioTrackRef.current && screenAudioTrackRef.current.readyState === "live") {
          tracks.push(screenAudioTrackRef.current);
        }
      }

      const combinedStream = new MediaStream(tracks);
      let mimeType = "video/webm;codecs=vp9,opus";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8,opus";
      }
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedVideoChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsRecordingPaused(false);
    } catch (err) {
      console.warn("No se pudo iniciar MediaRecorder:", err);
    }
  }, [teacherName]);

  const toggleRecordingPause = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    if (isRecordingPaused) {
      try { mediaRecorderRef.current.resume(); } catch {}
      setIsRecordingPaused(false);
      if (speechRecognitionRef.current) {
        speechRecognitionActiveRef.current = true;
        try { speechRecognitionRef.current.start(); } catch {}
      }
    } else {
      try { mediaRecorderRef.current.pause(); } catch {}
      setIsRecordingPaused(true);
      if (speechRecognitionRef.current) {
        speechRecognitionActiveRef.current = false;
        try { speechRecognitionRef.current.stop(); } catch {}
      }
    }
  };

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
            endUtc: e.endUtc,
            courseTitle: e.courseTitle || "IPT Academy",
            category: e.category,
            completed: Boolean(e.completed || e.status === "completed"),
            status: e.status || "confirmed",
            studentName: e.studentName,
            studentUid: e.studentUid,
            bookedCount: e.bookedCount,
            quorumRequired: e.quorumRequired,
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

  // Ventana de visibilidad de clases agendadas: 1 hora antes hasta 24 horas después
  const visibleScheduledClasses = useMemo(() => {
    const now = Date.now();
    const oneHourBefore = now - 60 * 60 * 1000;
    const twentyFourHoursAfter = now + 24 * 60 * 60 * 1000;
    return scheduledClasses.filter((cls) => {
      const t = new Date(cls.startUtc).getTime();
      return t >= oneHourBefore && t <= twentyFourHoursAfter;
    });
  }, [scheduledClasses]);

  useEffect(() => {
    if (visibleScheduledClasses.length > 0) {
      if (!selectedScheduledId || !visibleScheduledClasses.some((c) => c.id === selectedScheduledId)) {
        setSelectedScheduledId(visibleScheduledClasses[0].id);
        setClassTitle(visibleScheduledClasses[0].title);
      }
    }
  }, [visibleScheduledClasses, selectedScheduledId]);

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

  // Renderizar los trazos del Pizarrón en el elemento <canvas>
  const renderWhiteboardCanvas = useCallback(() => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...(liveCanvas.strokes || [])];
    if (currentStrokeRef.current) {
      allStrokes.push(currentStrokeRef.current);
    }

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = stroke.colorHex || "#000000";
      ctx.fillStyle = stroke.colorHex || "#000000";
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, (stroke.width || 3) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [liveCanvas.strokes]);

  useEffect(() => {
    if (stageMode === "canvas" && liveCanvas.canvasMode === "board") {
      renderWhiteboardCanvas();
      const handleResize = () => renderWhiteboardCanvas();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [stageMode, liveCanvas.canvasMode, liveCanvas.strokes, renderWhiteboardCanvas]);

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

  // Crear y negociar una conexión WebRTC limpia con un estudiante
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
        if (event.track.kind === "audio") {
          if (studentAudioContainerRef.current) {
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

          // Mezclar el audio del estudiante en la grabación oficial de la clase
          try {
            const dest = ensureAudioMixer();
            const ctx = audioContextRef.current;
            if (ctx && dest) {
              const studentStream =
                event.streams && event.streams[0]
                  ? event.streams[0]
                  : new MediaStream([event.track]);
              const existing = studentGainNodesRef.current.get(studentUid);
              if (existing) {
                try { existing.source.disconnect(); } catch {}
              }
              const src = ctx.createMediaStreamSource(studentStream);
              const gain = ctx.createGain();
              gain.gain.value = 1;
              src.connect(gain);
              gain.connect(dest);
              studentGainNodesRef.current.set(studentUid, { source: src, gain });
            }
          } catch (mixErr) {
            console.warn("Error al mezclar audio del estudiante:", mixErr);
          }
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
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ipt_live_cam_on", "0");
        }
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
            if (typeof window !== "undefined") {
              sessionStorage.setItem("ipt_live_cam_on", "0");
            }
            syncLocalVideoPreview();
            broadcastMediaUpdateToAllStudents();
          };
          setCamOn(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("ipt_live_cam_on", "1");
          }
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
      if (micTrackRef.current && micOn) {
        // Silenciar (Mute) sin destruir la pista para no romper WebRTC ni la grabación de MediaRecorder
        micTrackRef.current.enabled = false;
        setMicOn(false);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ipt_live_mic_on", "0");
        }
        if (micGainNodeRef.current && audioContextRef.current) {
          micGainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        }
      } else if (micTrackRef.current && !micOn && micTrackRef.current.readyState === "live") {
        // Reactivar (Unmute) la pista viva existente
        micTrackRef.current.enabled = true;
        setMicOn(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ipt_live_mic_on", "1");
        }
        if (micGainNodeRef.current && audioContextRef.current) {
          micGainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        }
      } else {
        // Solicitar acceso inicial si aún no se había capturado
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          micTrackRef.current = aTrack;
          aTrack.enabled = true;
          aTrack.onended = () => {
            micTrackRef.current = null;
            setMicOn(false);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("ipt_live_mic_on", "0");
            }
            broadcastMediaUpdateToAllStudents();
          };
          setMicOn(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("ipt_live_mic_on", "1");
          }
          attachMicToMixer(stream);
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
        detachScreenAudioFromMixer();
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
          if (sAudioTrack) {
            attachScreenAudioToMixer(new MediaStream([sAudioTrack]));
          }

          sVideoTrack.onended = () => {
            screenVideoTrackRef.current = null;
            if (screenAudioTrackRef.current) {
              screenAudioTrackRef.current.stop();
              screenAudioTrackRef.current = null;
            }
            detachScreenAudioFromMixer();
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

  // Restaurar automáticamente la clase en vivo si el docente presiona F5 (recargar página)
  useEffect(() => {
    let cancelled = false;

    const tryRestoreActiveTeacherSession = async () => {
      if (isLiveRef.current) return;
      try {
        const savedCode =
          typeof window !== "undefined"
            ? sessionStorage.getItem("ipt_active_live_code8") ||
              localStorage.getItem("ipt_active_live_code8")
            : null;

        const snap = await get(ref(rtdb, "allowed_live_students"));
        if (cancelled || !snap.exists()) return;

        const allRooms = snap.val() as Record<string, any>;
        let matchedKey: string | null = null;
        let matchedData: any = null;

        // Ordenar SIEMPRE de la más reciente a la más antigua por startedAt descendente
        const sortedRooms = Object.entries(allRooms).sort(
          (a, b) => (b[1]?.startedAt || 0) - (a[1]?.startedAt || 0)
        );

        for (const [k, room] of sortedRooms) {
          if (!room || !room.active || room.status === "ended") {
            await remove(ref(rtdb, `allowed_live_students/${k}`)).catch(() => {});
            await remove(ref(rtdb, `allowed_lists/${k}`)).catch(() => {});
            continue;
          }

          if (room.teacherUid === teacherUid || (savedCode && k === `allowed_list_${savedCode}`)) {
            if (!matchedData) {
              matchedKey = k;
              matchedData = room;
            } else {
              // Sala vieja duplicada del mismo docente -> limpiarla de inmediato
              await remove(ref(rtdb, `allowed_live_students/${k}`)).catch(() => {});
              await remove(ref(rtdb, `allowed_lists/${k}`)).catch(() => {});
            }
          }
        }

        if (!matchedKey || !matchedData) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("ipt_active_live_code8");
            localStorage.removeItem("ipt_active_live_code8");
          }
          return;
        }

        // Si estuvo desconectado más de 5 minutos, cerrar la sesión huérfana y no reanudar
        const discAt = matchedData.teacherPresence?.disconnectedAt || 0;
        const isOffline = matchedData.teacherPresence?.online === false;
        if (isOffline && discAt > 0 && Date.now() - discAt >= 5 * 60 * 1000) {
          await remove(ref(rtdb, `allowed_live_students/${matchedKey}`)).catch(() => {});
          await remove(ref(rtdb, `allowed_lists/${matchedKey}`)).catch(() => {});
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("ipt_active_live_code8");
            localStorage.removeItem("ipt_active_live_code8");
          }
          return;
        }

        const restoredCode =
          matchedData.code8 || matchedKey.replace("allowed_list_", "");

        code8Ref.current = restoredCode;
        isLiveRef.current = true;
        setCode8(restoredCode);
        setIsLive(true);
        setStartedAtMs(matchedData.startedAt || Date.now());
        if (matchedData.title) setClassTitle(matchedData.title);
        if (matchedData.currentTopic) {
          setCurrentTopic(matchedData.currentTopic);
          setTopicDraft(matchedData.currentTopic);
        }
        if (matchedData.liveCanvas) {
          setLiveCanvas({
            ...matchedData.liveCanvas,
            canvasMode: matchedData.liveCanvas.canvasMode === "board" ? "board" : "text",
            strokes: Array.isArray(matchedData.liveCanvas.strokes)
              ? matchedData.liveCanvas.strokes
              : [],
          });
          if (matchedData.liveCanvas.active) {
            setStageMode("canvas");
          }
        }

        if (typeof window !== "undefined") {
          sessionStorage.setItem("ipt_active_live_code8", restoredCode);
          localStorage.setItem("ipt_active_live_code8", restoredCode);
        }

        // Marcar presencia inmediatamente como online tras el F5
        await set(ref(rtdb, `allowed_live_students/${matchedKey}/teacherPresence`), {
          online: true,
          lastSeenAt: Date.now(),
          disconnectedAt: null,
        }).catch(() => {});

        // Si el docente tenía cámara o micrófono encendidos antes de recargar (F5), reactivarlos automáticamente
        const wantCam =
          typeof window !== "undefined" &&
          sessionStorage.getItem("ipt_live_cam_on") === "1";
        const wantMic =
          typeof window !== "undefined" &&
          sessionStorage.getItem("ipt_live_mic_on") === "1";

        if (wantCam && !camTrackRef.current) {
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
            const vTrack = camStream.getVideoTracks()[0];
            if (vTrack) {
              camTrackRef.current = vTrack;
              setCamOn(true);
            }
          } catch {}
        }

        if (wantMic && !micTrackRef.current) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            const aTrack = micStream.getAudioTracks()[0];
            if (aTrack) {
              micTrackRef.current = aTrack;
              setMicOn(true);
              attachMicToMixer(micStream);
            }
          } catch {}
        }

        syncLocalVideoPreview();
        await broadcastMediaUpdateToAllStudents();
      } catch (err) {
        console.warn("Error restaurando sesión tras F5:", err);
      }
    };

    tryRestoreActiveTeacherSession();
    return () => {
      cancelled = true;
    };
  }, [teacherUid, syncLocalVideoPreview, broadcastMediaUpdateToAllStudents]);

  // Iniciar Clase
  const handleStartLiveClass = async () => {
    const generatedCode = generateSessionCode8();
    const listKey = `allowed_list_${generatedCode}`;
    const nowMs = Date.now();

    // Limpiar cualquier sala anterior huérfana de este docente antes de abrir la nueva
    try {
      const existingSnap = await get(ref(rtdb, "allowed_live_students"));
      if (existingSnap.exists()) {
        const allLists = existingSnap.val() as Record<string, any>;
        const selectedUids = new Set(effectiveAllowedStudents.map((s) => s.uid));
        for (const [oldKey, oldRoom] of Object.entries(allLists)) {
          const sharesStudents =
            oldRoom?.students &&
            Object.keys(oldRoom.students).some((u) => selectedUids.has(u));
          if (
            !oldRoom ||
            oldRoom.teacherUid === teacherUid ||
            !oldRoom.active ||
            !oldRoom.startedAt ||
            sharesStudents
          ) {
            await remove(ref(rtdb, `allowed_live_students/${oldKey}`)).catch(() => {});
            await remove(ref(rtdb, `allowed_lists/${oldKey}`)).catch(() => {});
          }
        }
      }
    } catch {}

    code8Ref.current = generatedCode;
    isLiveRef.current = true;
    setStartedAtMs(nowMs);

    if (typeof window !== "undefined") {
      sessionStorage.setItem("ipt_active_live_code8", generatedCode);
      localStorage.setItem("ipt_active_live_code8", generatedCode);
    }

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

    // Asegurar que el micrófono esté solicitado/conectado al mezclador antes de iniciar
    if (!micTrackRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          micTrackRef.current = aTrack;
          aTrack.enabled = true;
          aTrack.onended = () => {
            micTrackRef.current = null;
            setMicOn(false);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("ipt_live_mic_on", "0");
            }
            broadcastMediaUpdateToAllStudents();
          };
          setMicOn(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("ipt_live_mic_on", "1");
          }
          attachMicToMixer(stream);
        }
      } catch (micErr) {
        console.warn("Docente inició transmisión sin micrófono:", micErr);
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

    const initialText = liveCanvas.content || INITIAL_CANVAS_TEXT;
    const initialCanvas: LiveCanvasData = {
      ...liveCanvas,
      active: false,
      canvasMode: "text",
      content: initialText,
      charColors: Array(initialText.length).fill("#000000"),
      strokes: [],
      updatedBy: teacherName,
      updatedAt: nowMs,
      studentOrder: [],
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
      teacherPresence: {
        online: true,
        lastSeenAt: nowMs,
        disconnectedAt: null,
      },
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

    // Iniciar grabación de video y transcripción Web Speech en vivo
    classStartTimeRef.current = nowMs;
    recordedSubtitlesRef.current = [];
    setRecordedSubtitlesCount(0);
    startMediaRecording();
    startWebSpeechTranscriber(nowMs);
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
        setLiveCanvas({
          ...data,
          canvasMode: data.canvasMode === "board" ? "board" : "text",
          strokes: Array.isArray(data.strokes) ? data.strokes : [],
        });
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

  // Heartbeat de presencia del docente + detección inmediata de F5 / caída de red
  useEffect(() => {
    if (!isLive || !code8) return;
    const listKey = `allowed_list_${code8}`;
    const presenceRef = ref(rtdb, `allowed_live_students/${listKey}/teacherPresence`);

    const pushHeartbeat = () => {
      if (!isLiveRef.current || code8Ref.current !== code8) return;
      const now = Date.now();
      update(presenceRef, {
        online: true,
        lastSeenAt: now,
        disconnectedAt: null,
      }).catch(() => {});

      try {
        onDisconnect(presenceRef).update({
          online: false,
          disconnectedAt: now,
        });
      } catch {}
    };

    pushHeartbeat();
    const hbInterval = setInterval(pushHeartbeat, 3000);

    const handlePageUnload = () => {
      if (!isLiveRef.current || code8Ref.current !== code8) return;
      // Al recargar con F5 o cerrar pestaña sin dar "Finalizar", no se borra la sala:
      // se marca offline con timestamp exacto para que a los 10s avise al alumno y a los 5m cuelgue.
      update(presenceRef, {
        online: false,
        disconnectedAt: Date.now(),
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handlePageUnload);
    window.addEventListener("pagehide", handlePageUnload);

    return () => {
      clearInterval(hbInterval);
      window.removeEventListener("beforeunload", handlePageUnload);
      window.removeEventListener("pagehide", handlePageUnload);
    };
  }, [isLive, code8]);

  // Marcar clase como vista en el calendario y subsistemas vinculados
  const markClassCompleted = async (classId: string, title?: string) => {
    try {
      const nowIso = new Date().toISOString();

      // 1. Actualizar en lms_calendar
      const calSnap = await get(ref(rtdb, "lms_calendar"));
      if (calSnap.exists()) {
        const val = calSnap.val();
        let eventsList: any[] = Array.isArray(val) ? [...val] : Object.values(val);
        let updated = false;
        eventsList = eventsList.map((ev) => {
          if (ev && (ev.id === classId || (title && ev.title === title))) {
            updated = true;
            return {
              ...ev,
              completed: true,
              status: "completed",
              attendanceStatus: "attended",
              completedAtUtc: nowIso,
            };
          }
          return ev;
        });
        if (updated) {
          await set(ref(rtdb, "lms_calendar"), eventsList);
        }
      }

      // 2. Actualizar en lms_live_sessions
      const liveSnap = await get(ref(rtdb, "lms_live_sessions"));
      if (liveSnap.exists()) {
        const val = liveSnap.val();
        let liveList: any[] = Array.isArray(val) ? [...val] : Object.values(val);
        liveList = liveList.map((ls) => {
          if (ls && (ls.id === classId || (title && ls.title === title))) {
            return {
              ...ls,
              completed: true,
              cloudRecordingState: "finished",
              completedAtUtc: nowIso,
            };
          }
          return ls;
        });
        await set(ref(rtdb, "lms_live_sessions"), liveList);
      }

      // 3. Actualizar tutoria_sessions si aplica
      await update(ref(rtdb, `tutoria_sessions/${classId}`), {
        status: "completed",
        completed: true,
        completedAtUtc: nowIso,
      }).catch(() => {});

      // 4. Actualizar bookings vinculados
      const bookingsSnap = await get(ref(rtdb, "lms_live_bookings"));
      if (bookingsSnap.exists()) {
        const bookings = bookingsSnap.val();
        for (const [bId, bVal] of Object.entries(bookings as Record<string, any>)) {
          if (bVal && (bVal.sessionId === classId || bId === classId)) {
            await update(ref(rtdb, `lms_live_bookings/${bId}`), {
              status: "attended",
              attendedAtUtc: nowIso,
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("Error marking class completed in calendar:", err);
    }
  };

  // Finalizar clase y limpiar listas efímeras (expulsa y desconecta a todos los estudiantes)
  const handleEndLiveClass = async () => {
    const activeCode = code8Ref.current || code8;
    const finalScheduledId = selectedScheduledId;
    const finalClassTitle = classTitle;
    const sessionDurationSec = startedAtMs
      ? Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000))
      : 60;

    setIsSavingRecording(true);
    setSavingStatusMessage("Finalizando grabación y preparando archivo...");

    // 1. Detener MediaRecorder y SpeechRecognition
    if (recordingCanvasIntervalRef.current) {
      clearInterval(recordingCanvasIntervalRef.current);
      recordingCanvasIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (speechRecognitionRef.current) {
      speechRecognitionActiveRef.current = false;
      try { speechRecognitionRef.current.stop(); } catch {}
    }

    // Pequeño tiempo de espera para que se emitan todos los fragmentos
    await new Promise((r) => setTimeout(r, 600));

    // 2. Subir video a Firebase Storage si se capturaron fragmentos
    let downloadVideoUrl = "";
    if (activeCode && recordedVideoChunksRef.current.length > 0) {
      try {
        setSavingStatusMessage("Subiendo video de la clase a la nube...");
        const actualMime = mediaRecorderRef.current?.mimeType || "video/webm";
        const videoBlob = new Blob(recordedVideoChunksRef.current, { type: actualMime });
        downloadVideoUrl = await uploadRecordedVideo(videoBlob, activeCode);
      } catch (err) {
        console.warn("No se pudo subir el video a Storage:", err);
      }
    }

    // 3. Generar resumen pedagógico y puntos clave con OpenRouter (modelo Free)
    if (activeCode) {
      try {
        setSavingStatusMessage("Generando resumen y puntos clave con IA...");
        const compiledTranscript = recordedSubtitlesRef.current.map((c) => c.text).join(" ");
        const aiResult = await generateClassSummaryWithOpenRouter(
          compiledTranscript,
          currentTopic,
          classTitle,
          sessionDurationSec
        );

        setSavingStatusMessage("Publicando clase para los estudiantes...");

        // Construir mapa de acceso { [student.id]: true } para los estudiantes autorizados y conectados
        const allowedStudentsMap: Record<string, boolean> = {};
        const allowedEmailsMap: Record<string, boolean> = {};

        for (const s of effectiveAllowedStudents) {
          if (s.uid) allowedStudentsMap[s.uid] = true;
          if (s.email) {
            const cleanEm = s.email.toLowerCase().replace(/[.#$\[\]]/g, "_");
            allowedEmailsMap[cleanEm] = true;
          }
        }
        for (const u of Array.from(connectedUidsRef.current)) {
          if (u) allowedStudentsMap[u] = true;
        }

        const classRecord: RecordedClassData = {
          id: activeCode,
          code8: activeCode,
          title: classTitle,
          topic: currentTopic,
          teacherName,
          teacherUid,
          startedAt: startedAtMs || Date.now() - sessionDurationSec * 1000,
          endedAt: Date.now(),
          durationSeconds: sessionDurationSec,
          videoUrl: downloadVideoUrl,
          allowed_students: allowedStudentsMap,
          allowed_emails: allowedEmailsMap,
          subtitles: recordedSubtitlesRef.current,
          summary: aiResult.summary,
          keyPoints: aiResult.keyPoints,
          chapters: aiResult.chapters,
          createdAt: Date.now(),
        };

        await saveRecordedClassRecord(classRecord);
      } catch (saveErr) {
        console.warn("Error guardando el registro de clase grabada:", saveErr);
      }
    }

    setIsSavingRecording(false);
    setSavingStatusMessage(null);

    isLiveRef.current = false;
    code8Ref.current = null;
    connectedUidsRef.current.clear();
    peerRenegotiateStampRef.current.clear();

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ipt_active_live_code8");
      localStorage.removeItem("ipt_active_live_code8");
      sessionStorage.removeItem("ipt_live_cam_on");
      sessionStorage.removeItem("ipt_live_mic_on");
    }

    if (activeCode) {
      const listKey = `allowed_list_${activeCode}`;
      const presenceRef = ref(rtdb, `allowed_live_students/${listKey}/teacherPresence`);
      try {
        await onDisconnect(presenceRef).cancel();
      } catch {}

      // Notificar estado "ended" inmediato y luego eliminar la sala y cualquier otra sala residual del docente
      await update(ref(rtdb, `allowed_live_students/${listKey}`), {
        active: false,
        status: "ended",
        endedAt: Date.now(),
      }).catch(() => {});

      await remove(ref(rtdb, `allowed_live_students/${listKey}`)).catch(() => {});
      await remove(ref(rtdb, `allowed_lists/${listKey}`)).catch(() => {});
    }

    try {
      const allSnap = await get(ref(rtdb, "allowed_live_students"));
      if (allSnap.exists()) {
        const allLists = allSnap.val() as Record<string, any>;
        for (const [k, room] of Object.entries(allLists)) {
          if (
            !room ||
            room.teacherUid === teacherUid ||
            !room.active ||
            !room.startedAt
          ) {
            await remove(ref(rtdb, `allowed_live_students/${k}`)).catch(() => {});
            await remove(ref(rtdb, `allowed_lists/${k}`)).catch(() => {});
          }
        }
      }
    } catch {}

    if (activeCode) {
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

    if (camTrackRef.current) {
      camTrackRef.current.stop();
      camTrackRef.current = null;
    }
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }
    if (screenVideoTrackRef.current) {
      screenVideoTrackRef.current.stop();
      screenVideoTrackRef.current = null;
    }
    if (screenAudioTrackRef.current) {
      screenAudioTrackRef.current.stop();
      screenAudioTrackRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
      audioDestinationRef.current = null;
      micSourceNodeRef.current = null;
      micGainNodeRef.current = null;
      screenAudioSourceNodeRef.current = null;
      screenGainNodeRef.current = null;
      studentGainNodesRef.current.clear();
    }
    setCamOn(false);
    setMicOn(false);
    setScreenOn(false);
    setIsLive(false);
    setCode8(null);
    setStartedAtMs(null);
    setSidePanel("none");
    setStageMode("video");
    syncLocalVideoPreview();

    // Sincronización posterior de la clase en el calendario
    const pref = typeof window !== "undefined" ? localStorage.getItem("ipt_auto_mark_calendar_completed") : null;
    if (pref === "true") {
      if (finalScheduledId) {
        await markClassCompleted(finalScheduledId, finalClassTitle);
      }
    } else {
      setClassEndedInfo({
        id: finalScheduledId || `session_${Date.now()}`,
        title: finalClassTitle || "Sesión en Vivo",
      });
      setShowPostClassModal(true);
    }
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

  // Alternar Escenario de Lienzo en Vivo
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

  // Actualizar Lienzo en Vivo con color por carácter (Docente = Negro fijo #000000)
  const updateLiveCanvas = async (partial: Partial<LiveCanvasData>) => {
    let nextCharColors = liveCanvas.charColors || [];

    if (typeof partial.content === "string") {
      nextCharColors = computeNextCharColors(
        liveCanvas.content || "",
        liveCanvas.charColors,
        partial.content,
        "#000000" // Negro fijo para cada carácter escrito por el docente
      );
    }

    const updated: LiveCanvasData = {
      ...liveCanvas,
      ...partial,
      charColors: nextCharColors,
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

  // Eventos de dibujo libre en el Pizarrón (Docente dibuja en Negro fijo #000000)
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: teacherUid,
      name: teacherName,
      role: "teacher",
      colorHex: "#000000",
      width: strokeWidth,
      points: [{ x: nx, y: ny }],
    };
    renderWhiteboardCanvas();
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentStrokeRef.current.points.push({ x: nx, y: ny });
    renderWhiteboardCanvas();
  };

  const handleBoardPointerUp = async () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const nextStrokes = [...(liveCanvas.strokes || []), finishedStroke];
    await updateLiveCanvas({ strokes: nextStrokes });
  };

  const handleUndoBoardStroke = async () => {
    const currentStrokes = liveCanvas.strokes || [];
    if (currentStrokes.length === 0) return;
    await updateLiveCanvas({ strokes: currentStrokes.slice(0, -1) });
  };

  const handleClearBoard = async () => {
    await updateLiveCanvas({ strokes: [] });
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

  // Calcular líneas con su offset inicial para renderizar color por carácter
  const canvasLinesWithOffsets = useMemo(() => {
    const rawLines = (liveCanvas.content || "").split("\n");
    let offset = 0;
    return rawLines.map((lineText, idx) => {
      const startOffset = offset;
      offset += lineText.length + 1;
      const runs = groupLineIntoColorRuns(lineText, liveCanvas.charColors, startOffset);
      const uniqueColors = Array.from(new Set(runs.map((r) => r.color)));
      return {
        idx,
        lineText,
        startOffset,
        runs,
        uniqueColors: uniqueColors.length > 0 ? uniqueColors : ["#000000"],
      };
    });
  }, [liveCanvas.content, liveCanvas.charColors]);

  // Orden estrictamente validado por presencia en vivo (connectedViewers):
  // El 1° estudiante conectado siempre recibe índice 0 (Azul #0052eb) y los siguientes avanzan por Razón Áurea
  const studentOrderList = useMemo(() => {
    const fromOrder = (liveCanvas.studentOrder || []).filter((u) =>
      Boolean(connectedViewers[u])
    );
    const remainingConnected = Object.entries(connectedViewers)
      .sort((a, b) => (a[1]?.joinedAt || 0) - (b[1]?.joinedAt || 0))
      .map(([u]) => u)
      .filter((u) => !fromOrder.includes(u));
    return [...fromOrder, ...remainingConnected];
  }, [liveCanvas.studentOrder, connectedViewers]);

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
                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                    <span className="font-semibold text-zinc-300">
                      Clases en Agenda (1h antes hasta 24h después)
                    </span>
                    <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-mono">
                      {visibleScheduledClasses.length} en ventana
                    </span>
                  </div>

                  {visibleScheduledClasses.length > 0 ? (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {visibleScheduledClasses.map((cls) => {
                        const start = new Date(cls.startUtc);
                        const end = cls.endUtc ? new Date(cls.endUtc) : new Date(start.getTime() + 60 * 60000);
                        const diffMinutes = Math.round((start.getTime() - Date.now()) / 60000);
                        const isVeryEarly = diffMinutes > 10;
                        const isDelayed = diffMinutes < -10;
                        const isOptimal = Math.abs(diffMinutes) <= 10;
                        const isSelected = selectedScheduledId === cls.id;

                        const today = new Date();
                        const isToday =
                          start.getDate() === today.getDate() &&
                          start.getMonth() === today.getMonth() &&
                          start.getFullYear() === today.getFullYear();
                        const dateBadgeText = isToday
                          ? "Hoy"
                          : start.toLocaleDateString("es-CO", { day: "numeric", month: "short" });

                        return (
                          <div
                            key={cls.id}
                            onClick={() => {
                              setSelectedScheduledId(cls.id);
                              setClassTitle(cls.title);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? "bg-gradient-to-br from-[#1c162e] to-[#12121a] border-violet-500 shadow-[0_0_30px_rgba(128,82,255,0.3)] ring-1 ring-violet-500/50"
                                : "bg-[#0c0c12] hover:bg-[#14141c] border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                  {dateBadgeText}
                                </span>
                                <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                                  {start.toLocaleTimeString("es-CO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  –{" "}
                                  {end.toLocaleTimeString("es-CO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {cls.category === "tutoring" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                                    Tutoría 1-1
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                                    Clase en Vivo
                                  </span>
                                )}
                                {cls.completed && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-white/5">
                                    Vista
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-white leading-snug mb-1">
                              {cls.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 mb-3">
                              {cls.studentName ? (
                                <span>
                                  Estudiante asignado: <strong className="text-zinc-200">{cls.studentName}</strong>
                                </span>
                              ) : (
                                <span>{cls.courseTitle}</span>
                              )}
                            </p>

                            {/* Alerta de Tolerancia de Puntualidad (±10m) y Botón de Inicio */}
                            {isVeryEarly ? (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-semibold text-amber-300 block">
                                      Entrada muy anticipada ({diffMinutes} min antes)
                                    </span>
                                    <span className="text-[10px] text-amber-200/70">
                                      Estás fuera de la ventana óptima reglamentaria (±10m).
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedScheduledId(cls.id);
                                    setClassTitle(cls.title);
                                    handleStartLiveClass();
                                  }}
                                  disabled={effectiveAllowedStudents.length === 0}
                                  className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer text-center"
                                >
                                  Entrar forzadamente
                                </button>
                              </div>
                            ) : isDelayed ? (
                              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-semibold text-rose-300 block">
                                      Inicio con retraso ({Math.abs(diffMinutes)} min tarde)
                                    </span>
                                    <span className="text-[10px] text-rose-200/70">
                                      La sesión presenta más de 10 minutos de retraso.
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedScheduledId(cls.id);
                                    setClassTitle(cls.title);
                                    handleStartLiveClass();
                                  }}
                                  disabled={effectiveAllowedStudents.length === 0}
                                  className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer text-center"
                                >
                                  Entrar forzadamente
                                </button>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                  <div>
                                    <span className="text-xs font-semibold text-emerald-300 block">
                                      Ventana puntual óptima (±10m)
                                    </span>
                                    <span className="text-[10px] text-emerald-200/70">
                                      Puntualidad en regla. Listo para iniciar.
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedScheduledId(cls.id);
                                    setClassTitle(cls.title);
                                    handleStartLiveClass();
                                  }}
                                  disabled={effectiveAllowedStudents.length === 0}
                                  className="py-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/30 shrink-0 cursor-pointer text-center"
                                >
                                  Iniciar Clase Puntual
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#0c0c12] border border-white/10 text-center space-y-2">
                      <Clock className="w-6 h-6 text-[#8052ff] mx-auto" />
                      <p className="text-xs font-semibold text-white">
                        No hay clases agendadas en las próximas 24 horas
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                        Puedes transmitir una sesión inmediata con los estudiantes actualmente habilitados o agendar desde el calendario.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                    <span>Estudiantes autorizados para entrar</span>
                    <span className="text-white font-medium">
                      {effectiveAllowedStudents.length}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {effectiveAllowedStudents.map((stu) => (
                      <div
                        key={stu.uid}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#050507] border border-white/[0.05] text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-6 h-6 rounded-full bg-white/10 text-zinc-200 flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {stu.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-zinc-200 truncate">{stu.name}</span>
                        </div>
                        <span className="text-[10px] text-[#10b981] font-medium">
                          Acceso listo
                        </span>
                      </div>
                    ))}
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

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col select-none overflow-hidden">
      {/* Contenedor oculto para reproducir el audio de los estudiantes */}
      <div ref={studentAudioContainerRef} className="hidden" />

      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#8052ff]/[0.05] rounded-full blur-[150px] pointer-events-none" />

      {/* CABECERA SUPERIOR */}
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

          {/* Indicador de Grabación y Transcripción STT */}
          <div className="flex items-center gap-1.5">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                isRecordingPaused
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecordingPaused ? "bg-amber-400" : "bg-rose-500 animate-pulse"
                }`}
              />
              <span className="hidden md:inline">{isRecordingPaused ? "PAUSADO" : "REC"}</span>
              <span className="text-[11px] font-mono text-zinc-300 border-l border-white/10 pl-2">
                {recordedSubtitlesCount} subtítulos
              </span>
            </div>

            <button
              type="button"
              onClick={toggleRecordingPause}
              title={
                isRecordingPaused
                  ? "Reanudar grabación y transcripción"
                  : "Pausar grabación y transcripción"
              }
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors cursor-pointer"
            >
              {isRecordingPaused ? (
                <Play className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
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

      {/* CUERPO PRINCIPAL */}
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

          {/* MODO 2: LIENZO VIRTUAL EN VIVO — SOLO 2 MODOS (Texto manual por carácter / Pizarrón de dibujo libre) */}
          {stageMode === "canvas" && (
            <div className="w-full h-full flex flex-col bg-[#ffffff] text-[#000000]">
              {/* Barra Superior del Lienzo Virtual */}
              <div className="px-5 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Selector exclusivo de las 2 modalidades solicitadas: Texto manual vs Pizarrón / Dibujo libre */}
                  <select
                    value={liveCanvas.canvasMode || "text"}
                    onChange={(e) =>
                      updateLiveCanvas({
                        canvasMode: e.target.value as "text" | "board",
                      })
                    }
                    className="bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-semibold outline-none focus:border-[#0052eb] cursor-pointer shadow-xs"
                  >
                    <option value="text">Texto manual</option>
                    <option value="board">Pizarrón / Dibujo libre</option>
                  </select>

                  {/* Herramientas de trazo cuando está en modo Pizarrón */}
                  {liveCanvas.canvasMode === "board" && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-300">
                      {([
                        { label: "Fino", w: 2 },
                        { label: "Medio", w: 4 },
                        { label: "Grueso", w: 7 },
                      ] as const).map((item) => (
                        <button
                          key={item.w}
                          type="button"
                          onClick={() => setStrokeWidth(item.w)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            strokeWidth === item.w
                              ? "bg-zinc-900 text-white"
                              : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={handleUndoBoardStroke}
                        title="Deshacer último trazo"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Deshacer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearBoard}
                        title="Limpiar pizarrón"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[11px] font-medium text-rose-700 cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  )}

                  {/* Leyenda cromática activa: Docente Negro fijo (#000000) + SOLO Estudiantes conectados en vivo */}
                  <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-zinc-300">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200/80 text-[11px] font-medium text-black">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: "#000000" }}
                      />
                      Docente
                    </span>
                    {studentOrderList.map((uid, idx) => {
                      const viewer = connectedViewers[uid];
                      if (!viewer) return null;
                      const hcl = getCanvasAuthorColorHCL("student", idx);
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-[11px] font-medium"
                          style={{ color: hcl.hex }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hcl.hex }}
                          />
                          {(viewer.name || "Estudiante").split(" ")[0]}
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

                  {liveCanvas.canvasMode === "text" && (
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
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* SUB-MODO A: TEXTO MANUAL CON COLOR POR CARÁCTER */}
              {liveCanvas.canvasMode === "text" ? (
                <div className="flex-1 flex overflow-hidden font-mono text-sm bg-[#ffffff] relative">
                  {/* Columna de numeración de líneas + puntos de todos los colores presentes en esa línea */}
                  <div className="w-16 py-4 bg-zinc-50 border-r border-zinc-200 text-right pr-3 select-none text-zinc-400 text-xs leading-6 shrink-0">
                    {canvasLinesWithOffsets.map((row) => (
                      <div
                        key={row.idx}
                        className="flex items-center justify-end gap-1 h-6"
                      >
                        <div className="flex items-center gap-0.5">
                          {row.uniqueColors.slice(0, 3).map((cHex, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cHex }}
                            />
                          ))}
                        </div>
                        <span>{row.idx + 1}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contenedor superpuesto: Capa de renderizado HCL por carácter + Textarea interactivo */}
                  <div className="flex-1 relative overflow-hidden bg-[#ffffff]">
                    <div
                      ref={canvasBackdropRef}
                      aria-hidden="true"
                      className="absolute inset-0 p-4 overflow-hidden pointer-events-none font-mono text-sm leading-6 whitespace-pre"
                    >
                      {canvasLinesWithOffsets.map((row) => (
                        <div key={row.idx} className="h-6">
                          {row.runs.length === 0 ? (
                            <span> </span>
                          ) : (
                            row.runs.map((run, rIdx) => (
                              <span key={rIdx} style={{ color: run.color }}>
                                {run.text}
                              </span>
                            ))
                          )}
                        </div>
                      ))}
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
                      placeholder="Escribe texto manual aquí..."
                      style={{ caretColor: "#000000" }}
                      className="absolute inset-0 w-full h-full bg-transparent p-4 text-transparent outline-none resize-none leading-6 font-mono text-sm whitespace-pre overflow-auto selection:bg-blue-500/20"
                    />
                  </div>
                </div>
              ) : (
                /* SUB-MODO B: PIZARRÓN / DIBUJO LIBRE SOBRE FONDO BLANCO */
                <div className="flex-1 relative bg-[#ffffff] overflow-hidden">
                  <canvas
                    ref={boardCanvasRef}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerUp}
                    onPointerCancel={handleBoardPointerUp}
                    className="w-full h-full block cursor-crosshair touch-none"
                  />
                </div>
              )}
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

        {/* PANEL LATERAL */}
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
          title="Abrir o cerrar Notas y Pizarrón en Vivo"
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            stageMode === "canvas"
              ? "bg-[#8052ff] text-white font-semibold shadow-[0_0_25px_rgba(128,82,255,0.45)]"
              : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
          }`}
        >
          <PenTool className="w-4 h-4" />
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

      {/* Overlay de procesamiento al finalizar clase */}
      {isSavingRecording && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#8052ff]/20 border border-[#8052ff]/40 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(128,82,255,0.35)]">
            <Sparkles className="w-8 h-8 text-[#b79aff] animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Procesando Clase y Resumen con IA
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            {savingStatusMessage || "Guardando persistencia de la clase..."}
          </p>
          <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#8052ff] via-[#b79aff] to-[#10b981] animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Modal Posterior al Colgar/Finalizar Clase: Sincronización en Calendario */}
      {showPostClassModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">¡La clase ha acabado!</h3>
              <p className="text-sm text-zinc-300 mt-1.5 font-medium">
                ¿Desea dar la clase por vista en el calendario?
              </p>
              {classEndedInfo?.title && (
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {classEndedInfo.title}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (classEndedInfo?.id) {
                    await markClassCompleted(classEndedInfo.id, classEndedInfo.title);
                  }
                  setShowPostClassModal(false);
                  setClassEndedInfo(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                Si
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPostClassModal(false);
                  setClassEndedInfo(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-xs transition-all border border-white/5 cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("ipt_auto_mark_calendar_completed", "true");
                    setAutoMarkCalendarPref(true);
                  }
                  if (classEndedInfo?.id) {
                    await markClassCompleted(classEndedInfo.id, classEndedInfo.title);
                  }
                  setShowPostClassModal(false);
                  setClassEndedInfo(null);
                }}
                className="w-full py-2 px-4 rounded-xl text-xs text-zinc-400 hover:text-violet-300 font-medium transition-all hover:bg-violet-500/10 cursor-pointer"
              >
                Si y no volver a preguntar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
