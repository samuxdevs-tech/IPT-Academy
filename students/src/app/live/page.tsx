'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, set, update, remove, push, onDisconnect } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  WEBRTC_ICE_SERVERS,
  getCanvasAuthorColorHCL,
  computeNextCharColors,
  groupLineIntoColorRuns,
} from '@/lib/creditLiveSystem/creditHashCore';
import {
  Mic,
  MicOff,
  Hand,
  PhoneOff,
  MessageSquare,
  Users,
  Send,
  Calendar,
  Clock,
  Check,
  X,
  Volume2,
  BarChart3,
  Pin,
  ExternalLink,
  Copy,
  Sparkles,
  Lock,
  Unlock,
  CornerDownRight,
  Maximize2,
  PenTool,
  Undo2,
  Video,
  VideoOff,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  AppWindow,
  Layers,
  Minimize2,
} from 'lucide-react';
import RecordedClassesViewer from '@/components/live/RecordedClassesViewer';

export interface PinnedResource {
  id: string;
  title: string;
  url: string;
  type?: 'pdf' | 'image' | 'doc' | 'link';
  fileName?: string;
  fileSize?: number;
  createdAt: number;
}

export interface ActiveClassResource {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'image' | 'doc' | 'link';
  fileName?: string;
  visible: boolean;
  isFloating?: boolean;
  floatingCorner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  updatedAt: number;
}

interface ActiveMatchedRoom {
  code8: string;
  listKey: string;
  teacherUid: string;
  teacherName: string;
  title: string;
  currentTopic?: string;
  startedAt: number;
  signature: string;
  teacherOnline?: boolean;
  mediaState?: {
    hasVideo: boolean;
    hasScreen?: boolean;
    hasCam?: boolean;
    hasAudio: boolean;
    mode: 'dual' | 'screen' | 'camera' | 'none';
    updatedAt: number;
  };
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  text: string;
  time: string;
}

interface ActivePollData {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  createdAt: number;
  votes?: Record<string, { optionIndex: number; voterName: string }>;
}

interface WhiteboardStroke {
  id: string;
  uid: string;
  name: string;
  role: 'teacher' | 'student';
  colorHex: string;
  width: number;
  points: { x: number; y: number }[];
}

interface LiveCanvasData {
  active: boolean;
  canvasMode: 'text' | 'board';
  content: string;
  charColors?: string[];
  strokes?: WhiteboardStroke[];
  allowStudentEdit: boolean;
  updatedBy: string;
  updatedAt: number;
  studentOrder?: string[];
}

interface ScheduledSessionItem {
  id: string;
  title: string;
  instructor: string;
  startUtc: string;
  category?: string;
  isTutoria?: boolean;
  studentUid?: string;
}

type PipCorner = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';

export default function StudentLivePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    entitlements,
    consumeCreditHashForClass,
    liveBookings,
    openPricingModal,
  } = useSubscription();

  const bookedLiveSessionIds = useMemo(
    () => (Array.isArray(liveBookings) ? liveBookings.map((b) => b.sessionId) : []),
    [liveBookings]
  );

  const studentUid = user?.uid || 'mw0EaGhRIsO3mKJ5yTXi6K9hWI93';
  const studentEmail = (user?.email || 'estudiante@ivanperez.tech').toLowerCase();
  const studentName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Estudiante');

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [matchedRoom, setMatchedRoom] = useState<ActiveMatchedRoom | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'recordings'>('live');
  const [elapsedStr, setElapsedStr] = useState('00:00');

  // Controles de llamada del estudiante (Micrófono y Cámara desde la pantalla previa)
  const [micMuted, setMicMuted] = useState(true);
  const [studentCamOn, setStudentCamOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [floorGrantedBanner, setFloorGrantedBanner] = useState(false);
  const [sidePanel, setSidePanel] = useState<'none' | 'people' | 'chat'>('none');
  const [connectedViewers, setConnectedViewers] = useState<
    Record<string, { name: string; joinedAt: number; micMuted?: boolean; camOn?: boolean }>
  >({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [hasRemotePipTrack, setHasRemotePipTrack] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Escenario y PiP
  const [stageMode, setStageMode] = useState<'video' | 'canvas'>('video');
  const [pipCorner, setPipCorner] = useState<PipCorner>('bottom-right');
  const [swapMainAndPip, setSwapMainAndPip] = useState(false);

  // Lienzo Virtual en Vivo: Solo 2 modos ("text" = Texto manual por carácter, "board" = Pizarrón / Dibujo libre)
  const [liveCanvas, setLiveCanvas] = useState<LiveCanvasData>({
    active: false,
    canvasMode: 'text',
    content: '',
    charColors: [],
    strokes: [],
    allowStudentEdit: false,
    updatedBy: 'Docente',
    updatedAt: Date.now(),
    studentOrder: [],
  });
  const [copiedCanvas, setCopiedCanvas] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [boardTool, setBoardTool] = useState<"pen" | "hand">("pen");
  const [boardPan, setBoardPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boardZoom, setBoardZoom] = useState<number>(1);

  const canvasBackdropRef = useRef<HTMLDivElement | null>(null);
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const boardPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardZoomRef = useRef<number>(1);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  useEffect(() => {
    boardPanRef.current = boardPan;
  }, [boardPan]);

  useEffect(() => {
    boardZoomRef.current = boardZoom;
  }, [boardZoom]);

  // Micro-Encuestas y Recursos Pedagógicos en Vivo
  const [activePoll, setActivePoll] = useState<ActivePollData | null>(null);
  const [pinnedResources, setPinnedResources] = useState<PinnedResource[]>([]);
  const [activeResource, setActiveResource] = useState<ActiveClassResource | null>(null);
  const [showStudentResourceViewer, setShowStudentResourceViewer] = useState<boolean>(true);
  const [imageFloatingMode, setImageFloatingMode] = useState<boolean>(false);
  const [imageFloatingCorner, setImageFloatingCorner] = useState<
    'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  >('top-right');

  // Para agendar cuando no hay sala activa en este segundo
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSessionItem[]>([]);
  const [bookingBusyId, setBookingBusyId] = useState<string | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);

  // Referencias WebRTC y reproducción multimedia
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remotePipVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const studentLobbyVideoRef = useRef<HTMLVideoElement | null>(null);
  const primaryVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const secondaryVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const studentMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const studentCamTrackRef = useRef<MediaStreamTrack | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeOfferIdRef = useRef<string | null>(null);

  // Sincronizar la previsualización de cámara del estudiante en la pantalla previa
  const syncStudentLocalPreview = useCallback(() => {
    const camTrack =
      studentCamTrackRef.current && studentCamTrackRef.current.readyState === 'live'
        ? studentCamTrackRef.current
        : null;
    if (studentLobbyVideoRef.current) {
      if (camTrack) {
        studentLobbyVideoRef.current.srcObject = new MediaStream([camTrack]);
        studentLobbyVideoRef.current.muted = true;
        studentLobbyVideoRef.current.play().catch(() => {});
      } else {
        studentLobbyVideoRef.current.srcObject = null;
      }
    }
  }, []);

  useEffect(() => {
    syncStudentLocalPreview();
  }, [studentCamOn, hasJoinedRoom, matchedRoom?.listKey, syncStudentLocalPreview]);

  // Control de ciclo de vida de sala y reconexión del docente (10s aviso / 5m colgar)
  const wasInLiveRoomRef = useRef<boolean>(false);
  const activeListKeyRef = useRef<string | null>(null);
  const exitingClassRef = useRef<boolean>(false);
  const teacherOfflineSinceRef = useRef<number | null>(null);
  const latestTeacherPresenceRef = useRef<{
    online?: boolean;
    lastSeenAt?: number;
    disconnectedAt?: number | null;
  } | null>(null);
  const [showTeacherConnectivityWarning, setShowTeacherConnectivityWarning] =
    useState(false);
  const [remainingReconnectSecs, setRemainingReconnectSecs] = useState<number>(300);

  // Cortar toda conexión a la clase y sacar al estudiante hacia el campus
  const forceCutAndExitClass = useCallback(
    async (reason: 'ended_by_teacher' | 'timeout_5m' | 'manual_leave') => {
      if (exitingClassRef.current) return;
      exitingClassRef.current = true;

      const listKeyToClean = activeListKeyRef.current;
      activeListKeyRef.current = null;
      wasInLiveRoomRef.current = false;
      teacherOfflineSinceRef.current = null;
      setShowTeacherConnectivityWarning(false);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ipt_student_joined_list_key');
      }

      if (pcRef.current) {
        try {
          pcRef.current.ontrack = null;
          pcRef.current.onicecandidate = null;
          pcRef.current.onconnectionstatechange = null;
          pcRef.current.oniceconnectionstatechange = null;
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }
      activeOfferIdRef.current = null;

      if (studentMicTrackRef.current) {
        try {
          studentMicTrackRef.current.stop();
        } catch {}
        studentMicTrackRef.current = null;
      }
      setMicMuted(true);

      if (studentCamTrackRef.current) {
        try {
          studentCamTrackRef.current.stop();
        } catch {}
        studentCamTrackRef.current = null;
      }
      setStudentCamOn(false);

      primaryVideoTrackRef.current = null;
      secondaryVideoTrackRef.current = null;
      remoteAudioStreamRef.current = null;

      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remotePipVideoRef.current) remotePipVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      if (studentLobbyVideoRef.current) studentLobbyVideoRef.current.srcObject = null;

      setHasRemoteVideoTrack(false);
      setHasRemotePipTrack(false);
      setHasJoinedRoom(false);
      setMatchedRoom(null);

      if (listKeyToClean) {
        if (reason === 'timeout_5m') {
          await remove(ref(db, `allowed_live_students/${listKeyToClean}`)).catch(() => {});
          await remove(ref(db, `allowed_lists/${listKeyToClean}`)).catch(() => {});
        } else if (reason === 'manual_leave') {
          await remove(
            ref(db, `allowed_live_students/${listKeyToClean}/connected_viewers/${studentUid}`)
          ).catch(() => {});
          await remove(
            ref(db, `allowed_live_students/${listKeyToClean}/signals/${studentUid}`)
          ).catch(() => {});
        }
      }

      router.replace('/home');
    },
    [router, studentUid]
  );

  // Cronómetro en vivo de la sesión
  useEffect(() => {
    if (!matchedRoom?.startedAt) {
      setElapsedStr('00:00');
      return;
    }
    const tick = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - matchedRoom.startedAt) / 1000));
      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      if (hrs > 0) {
        setElapsedStr(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setElapsedStr(
          `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matchedRoom?.startedAt]);

  // Sincronizar los elementos <video> principal y PiP del estudiante
  const attachVideoStreams = useCallback(() => {
    const pTrack =
      primaryVideoTrackRef.current && primaryVideoTrackRef.current.readyState === 'live'
        ? primaryVideoTrackRef.current
        : null;
    const sTrack =
      secondaryVideoTrackRef.current && secondaryVideoTrackRef.current.readyState === 'live'
        ? secondaryVideoTrackRef.current
        : null;

    let mainTrack: MediaStreamTrack | null = null;
    let pipTrack: MediaStreamTrack | null = null;

    if (pTrack && sTrack) {
      mainTrack = swapMainAndPip ? sTrack : pTrack;
      pipTrack = swapMainAndPip ? pTrack : sTrack;
    } else {
      mainTrack = pTrack || sTrack;
      pipTrack = null;
    }

    if (remoteVideoRef.current) {
      if (mainTrack) {
        remoteVideoRef.current.srcObject = new MediaStream([mainTrack]);
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play().catch(() => {});
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }

    if (remotePipVideoRef.current) {
      const targetPip = stageMode === 'canvas' ? mainTrack : pipTrack;
      if (targetPip) {
        remotePipVideoRef.current.srcObject = new MediaStream([targetPip]);
        remotePipVideoRef.current.muted = true;
        remotePipVideoRef.current.play().catch(() => {});
      } else {
        remotePipVideoRef.current.srcObject = null;
      }
    }
  }, [stageMode, swapMainAndPip]);

  const attachAudioStream = useCallback(() => {
    if (remoteAudioRef.current && remoteAudioStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteAudioStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
      }
      remoteAudioRef.current
        .play()
        .then(() => {
          setAudioBlocked(false);
        })
        .catch(() => {
          setAudioBlocked(true);
        });
    }
  }, []);

  useEffect(() => {
    attachVideoStreams();
  }, [
    hasRemoteVideoTrack,
    hasRemotePipTrack,
    matchedRoom?.mediaState?.mode,
    stageMode,
    swapMainAndPip,
    attachVideoStreams,
  ]);

  // Renderizar los trazos del Pizarrón en el elemento <canvas> (Tablero Inteligente Infinito)
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pan = boardPanRef.current;
    const zoom = boardZoomRef.current;

    // 1. Limpiar fondo blanco
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Cuadrícula Infinita Inteligente (dot-grid técnico)
    const gridSize = 36;
    const step = gridSize * zoom;
    if (step >= 8) {
      const offsetX = ((pan.x % step) + step) % step;
      const offsetY = ((pan.y % step) + step) % step;
      ctx.fillStyle = '#e2e8f0';
      const dotRadius = Math.max(1, Math.min(2.5, 1.2 * zoom));
      for (let x = offsetX; x < canvas.width; x += step) {
        for (let y = offsetY; y < canvas.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Aplicar Pan y Zoom al espacio infinito
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);

    // 4. Renderizar trazos en el mundo infinito
    const allStrokes = [...(liveCanvas.strokes || [])];
    if (currentStrokeRef.current) {
      allStrokes.push(currentStrokeRef.current);
    }

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = stroke.colorHex || '#000000';
      ctx.fillStyle = stroke.colorHex || '#000000';
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Soporte retrocompatible para trazos legacy normalizados (0..1)
      const isLegacy = stroke.points.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
      const scaleBaseW = isLegacy ? 1280 : 1;
      const scaleBaseH = isLegacy ? 720 : 1;

      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.beginPath();
        ctx.arc(pt.x * scaleBaseW, pt.y * scaleBaseH, (stroke.width || 3) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * scaleBaseW, stroke.points[0].y * scaleBaseH);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * scaleBaseW, stroke.points[i].y * scaleBaseH);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [liveCanvas.strokes, boardPan, boardZoom]);

  useEffect(() => {
    if (stageMode === 'canvas' && liveCanvas.canvasMode === 'board') {
      renderWhiteboardCanvas();
      const handleResize = () => renderWhiteboardCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [stageMode, liveCanvas.canvasMode, liveCanvas.strokes, boardPan, boardZoom, renderWhiteboardCanvas]);

  // Desbloquear audio automáticamente al primer clic
  useEffect(() => {
    const unlockAudio = () => {
      if (remoteAudioRef.current && remoteAudioStreamRef.current) {
        remoteAudioRef.current
          .play()
          .then(() => setAudioBlocked(false))
          .catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // 1. Buscar al estudiante en las listas {allowed_live_students}
  useEffect(() => {
    const allowedRootRef = ref(db, 'allowed_live_students');
    const calRef = ref(db, 'lms_calendar');

    const unsubAllowed = onValue(allowedRootRef, (snap) => {
      if (!snap.exists()) {
        if (wasInLiveRoomRef.current) {
          forceCutAndExitClass('ended_by_teacher');
          return;
        }
        setMatchedRoom(null);
        setCheckingAccess(false);
        return;
      }

      const allLists = snap.val();
      let found: ActiveMatchedRoom | null = null;

      // Ordenar SIEMPRE de la clase más reciente a la más antigua por startedAt descendente
      // (evita que el orden alfabético de llaves conecte a los alumnos a salas viejas)
      const sortedRooms = (Object.entries(allLists) as [string, any][]).sort(
        (a, b) => (b[1]?.startedAt || 0) - (a[1]?.startedAt || 0)
      );

      const seenActiveTeachers = new Set<string>();

      for (const [listKey, listData] of sortedRooms) {
        if (!listData || !listData.active || listData.status === 'ended') {
          remove(ref(db, `allowed_live_students/${listKey}`)).catch(() => {});
          remove(ref(db, `allowed_lists/${listKey}`)).catch(() => {});
          continue;
        }

        // Si ya vimos una sala más reciente del mismo docente, eliminar automáticamente la sala vieja residual
        const tUid = listData.teacherUid || 'teacher_ipt';
        if (seenActiveTeachers.has(tUid)) {
          remove(ref(db, `allowed_live_students/${listKey}`)).catch(() => {});
          remove(ref(db, `allowed_lists/${listKey}`)).catch(() => {});
          continue;
        }

        // Si una sala lleva más de 5 minutos desconectada (teacherPresence.online === false), limpiarla y no entrar
        const discAt = listData.teacherPresence?.disconnectedAt || 0;
        const isOffline = listData.teacherPresence?.online === false;

        if (isOffline && discAt > 0 && Date.now() - discAt >= 5 * 60 * 1000) {
          remove(ref(db, `allowed_live_students/${listKey}`)).catch(() => {});
          remove(ref(db, `allowed_lists/${listKey}`)).catch(() => {});
          continue;
        }

        seenActiveTeachers.add(tUid);

        const studentsMap = listData.students || {};

        let studentRecord = studentsMap[studentUid];
        if (!studentRecord && studentEmail) {
          studentRecord = Object.values(studentsMap).find(
            (s: any) => s && s.email && String(s.email).toLowerCase() === studentEmail
          );
        }

        if (studentRecord && !found) {
          found = {
            code8: listData.code8 || listKey.replace('allowed_list_', ''),
            listKey,
            teacherUid: tUid,
            teacherName: listData.teacherName || 'Docente Titular',
            title: listData.title || 'Sesión en Vivo',
            currentTopic: listData.currentTopic || 'Sesión en Vivo',
            startedAt: listData.startedAt || Date.now(),
            signature: studentRecord.signature || `${studentUid}: verified`,
            teacherOnline: listData.teacherPresence?.online !== false,
            mediaState: listData.mediaState || {
              hasVideo: false,
              hasAudio: false,
              mode: 'none',
              updatedAt: Date.now(),
            },
          };
        }
      }

      if (!found && wasInLiveRoomRef.current) {
        forceCutAndExitClass('ended_by_teacher');
        return;
      }

      if (found) {
        activeListKeyRef.current = found.listKey;
        exitingClassRef.current = false;

        // Si el estudiante ya había pulsado "Entrar a la clase" en esta misma sala (ej. F5), mantenerlo dentro
        const savedJoinedKey =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('ipt_student_joined_list_key')
            : null;
        if (savedJoinedKey === found.listKey) {
          wasInLiveRoomRef.current = true;
          setHasJoinedRoom(true);
        }
      } else {
        setHasJoinedRoom(false);
      }

      setMatchedRoom(found);
      setCheckingAccess(false);
    });

    const unsubCal = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val)) as any[];
        const nowMs = Date.now();
        const liveItems: ScheduledSessionItem[] = arr
          .filter((e) => {
            if (!e) return false;
            if (e.category !== 'live_class' && e.category !== 'tutoring') return false;
            if (
              e.completed === true ||
              e.status === 'completed' ||
              e.status === 'ended' ||
              e.status === 'finished' ||
              e.status === 'cancelled'
            ) {
              return false;
            }
            const endMs = e.endUtc
              ? new Date(e.endUtc).getTime()
              : new Date(e.startUtc).getTime() + 60 * 60 * 1000;
            if (endMs < nowMs - 15 * 60 * 1000) {
              return false;
            }
            const isTut = e.category === 'tutoring' || /tutor[ií]a/i.test(e.title || '');
            if (isTut) {
              const belongsToMe =
                !e.studentUid ||
                (e.studentUid === studentUid) ||
                (e.studentEmail && e.studentEmail.toLowerCase() === studentEmail);
              if (!belongsToMe) return false;
            }
            return true;
          })
          .map((e) => ({
            id: e.id || `cls_${Date.now()}`,
            title: e.title || 'Clase en Vivo',
            instructor: e.instructor || 'Docente IPT',
            startUtc: e.startUtc || new Date().toISOString(),
            category: e.category,
            isTutoria: Boolean(e.category === 'tutoring' || /tutor[ií]a/i.test(e.title || '')),
            studentUid: e.studentUid,
          }))
          .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
        setScheduledSessions(liveItems);
      } else {
        setScheduledSessions([]);
      }
    });

    return () => {
      unsubAllowed();
      unsubCal();
    };
  }, [studentUid, studentEmail, forceCutAndExitClass]);

  // 2. Al entrar a la sala autorizada (después de la pantalla previa), conectar presencia, WebRTC, chat, lienzo, pulsos y controles de voz
  useEffect(() => {
    if (!matchedRoom || !hasJoinedRoom) return;
    const { listKey } = matchedRoom;
    wasInLiveRoomRef.current = true;
    activeListKeyRef.current = listKey;
    exitingClassRef.current = false;
    const joinTimestamp = Date.now();

    const myViewerRef = ref(
      db,
      `allowed_live_students/${listKey}/connected_viewers/${studentUid}`
    );
    const mySignalsRef = ref(
      db,
      `allowed_live_students/${listKey}/signals/${studentUid}`
    );

    const initialMicMuted =
      !studentMicTrackRef.current ||
      studentMicTrackRef.current.readyState !== 'live' ||
      !studentMicTrackRef.current.enabled;

    const initialCamOn = Boolean(
      studentCamTrackRef.current && studentCamTrackRef.current.readyState === 'live'
    );

    // Limpiar señales anteriores antes de pedir renegociación (garantiza que F5 del alumno reconecte siempre)
    remove(mySignalsRef)
      .catch(() => {})
      .finally(() => {
        if (exitingClassRef.current || activeListKeyRef.current !== listKey) return;
        set(myViewerRef, {
          name: studentName,
          joinedAt: joinTimestamp,
          micMuted: initialMicMuted,
          camOn: initialCamOn,
          renegotiateAt: Date.now(),
        }).catch(() => {});
        try {
          onDisconnect(myViewerRef).remove();
        } catch {}
      });

    // Escuchar estado de la sala en caso de que el docente dé "Finalizar"
    const roomRootRef = ref(db, `allowed_live_students/${listKey}`);
    const unsubRoomRoot = onValue(roomRootRef, (snap) => {
      if (activeListKeyRef.current !== listKey) return;
      if (!snap.exists()) {
        forceCutAndExitClass('ended_by_teacher');
        return;
      }
      const rVal = snap.val();
      if (!rVal || rVal.active === false || rVal.status === 'ended') {
        forceCutAndExitClass('ended_by_teacher');
      }
    });

    // Escuchar presencia / conectividad del docente (10s para aviso, 5m para colgar)
    const presenceRef = ref(db, `allowed_live_students/${listKey}/teacherPresence`);
    const unsubPresence = onValue(presenceRef, (snap) => {
      if (!snap.exists()) return;
      const pVal = snap.val();
      latestTeacherPresenceRef.current = pVal;

      if (pVal && pVal.online === false) {
        const discAt = pVal.disconnectedAt || Date.now();
        if (!teacherOfflineSinceRef.current) {
          teacherOfflineSinceRef.current = discAt;
        }
      } else if (pVal && pVal.online === true) {
        const wasOffline = teacherOfflineSinceRef.current !== null;
        teacherOfflineSinceRef.current = null;
        setShowTeacherConnectivityWarning(false);
        setRemainingReconnectSecs(300);

        // Si el docente acaba de volver tras un F5 o corte breve, solicitar nueva oferta WebRTC
        if (wasOffline) {
          update(myViewerRef, { renegotiateAt: Date.now() }).catch(() => {});
        }
      }
    });

    // Evaluador cada segundo para mostrar aviso a los 10s y colgar a los 5m (300s)
    const connectivityInterval = setInterval(() => {
      const pVal = latestTeacherPresenceRef.current;
      const now = Date.now();

      if (pVal) {
        const heartbeatStale =
          typeof pVal.lastSeenAt === 'number' && now - pVal.lastSeenAt > 8000;
        if (pVal.online === false || heartbeatStale) {
          if (!teacherOfflineSinceRef.current) {
            teacherOfflineSinceRef.current =
              pVal.disconnectedAt || pVal.lastSeenAt || now;
          }
        } else {
          teacherOfflineSinceRef.current = null;
          setShowTeacherConnectivityWarning(false);
        }
      }

      if (teacherOfflineSinceRef.current !== null) {
        const elapsedMs = Math.max(0, now - teacherOfflineSinceRef.current);
        if (elapsedMs >= 5 * 60 * 1000) {
          // Pasaron 5 minutos sin recuperar conexión con el docente -> colgar y salir
          forceCutAndExitClass('timeout_5m');
          return;
        } else if (elapsedMs >= 10 * 1000) {
          // Pasaron 10 segundos -> mostrar mensaje de espera
          setShowTeacherConnectivityWarning(true);
          setRemainingReconnectSecs(
            Math.max(0, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000))
          );
        } else {
          setShowTeacherConnectivityWarning(false);
        }
      }
    }, 1000);

    const viewersRef = ref(db, `allowed_live_students/${listKey}/connected_viewers`);
    const unsubViewers = onValue(viewersRef, (snap) => {
      setConnectedViewers(snap.exists() ? snap.val() : {});
    });

    const chatRef = ref(db, `allowed_live_students/${listKey}/chat`);
    const unsubChat = onValue(chatRef, (snap) => {
      if (!snap.exists()) {
        setChatMessages([]);
        return;
      }
      const raw = snap.val();
      setChatMessages(
        Object.keys(raw).map((k) => ({
          id: k,
          ...raw[k],
        }))
      );
    });

    const canvasRef = ref(db, `allowed_live_students/${listKey}/liveCanvas`);
    const unsubCanvas = onValue(canvasRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as LiveCanvasData;
        setLiveCanvas({
          ...data,
          canvasMode: data.canvasMode === 'board' ? 'board' : 'text',
          strokes: Array.isArray(data.strokes) ? data.strokes : [],
        });
        if (data.active) {
          setStageMode('canvas');
        } else {
          setStageMode('video');
        }
      }
    });

    const pollRef = ref(db, `allowed_live_students/${listKey}/activePoll`);
    const unsubPoll = onValue(pollRef, (snap) => {
      if (snap.exists()) {
        setActivePoll(snap.val() as ActivePollData);
      } else {
        setActivePoll(null);
      }
    });

    const pinsRef = ref(db, `allowed_live_students/${listKey}/pinnedResources`);
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

    const activeResourceRef = ref(db, `allowed_live_students/${listKey}/activeResource`);
    const unsubActiveRes = onValue(activeResourceRef, (snap) => {
      if (!snap.exists()) {
        setActiveResource(null);
        return;
      }
      const val = snap.val() as ActiveClassResource;
      setActiveResource(val);
      if (val.visible) {
        setShowStudentResourceViewer(true);
      }
      if (val.isFloating !== undefined) {
        setImageFloatingMode(Boolean(val.isFloating));
      }
      if (val.floatingCorner) {
        setImageFloatingCorner(val.floatingCorner);
      }
    });

    const controlRef = ref(
      db,
      `allowed_live_students/${listKey}/participantControls/${studentUid}`
    );
    const unsubControl = onValue(controlRef, (snap) => {
      if (!snap.exists()) return;
      const ctrl = snap.val();
      if (ctrl.forceMuted) {
        if (studentMicTrackRef.current) {
          studentMicTrackRef.current.enabled = false;
        }
        setMicMuted(true);
        setFloorGrantedBanner(false);
      } else if (ctrl.floorGranted) {
        setHandRaised(false);
        setFloorGrantedBanner(true);
      }
    });

    // Señalización WebRTC con el Docente
    let unsubTeacherIce: (() => void) | null = null;
    const offerRef = ref(
      db,
      `allowed_live_students/${listKey}/signals/${studentUid}/offer`
    );

    const unsubOffer = onValue(offerRef, async (snap) => {
      const offerData = snap.val();
      if (!offerData || !offerData.sdp) return;

      const incomingOfferId = offerData.offerId || `legacy_${offerData.timestamp || 0}`;
      if (activeOfferIdRef.current === incomingOfferId) return;
      activeOfferIdRef.current = incomingOfferId;

      if (unsubTeacherIce) {
        unsubTeacherIce();
        unsubTeacherIce = null;
      }
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(WEBRTC_ICE_SERVERS);
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed'
        ) {
          if (!teacherOfflineSinceRef.current) {
            teacherOfflineSinceRef.current = Date.now();
          }
        } else if (pc.connectionState === 'connected') {
          if (latestTeacherPresenceRef.current?.online !== false) {
            teacherOfflineSinceRef.current = null;
            setShowTeacherConnectivityWarning(false);
          }
        }
      };

      primaryVideoTrackRef.current = null;
      secondaryVideoTrackRef.current = null;
      const audioStream = new MediaStream();
      remoteAudioStreamRef.current = audioStream;
      setHasRemoteVideoTrack(false);
      setHasRemotePipTrack(false);

      let remoteDescReady = false;
      const queuedTeacherIce: RTCIceCandidateInit[] = [];

      pc.ontrack = (event) => {
        if (event.track.kind === 'video') {
          if (!primaryVideoTrackRef.current) {
            primaryVideoTrackRef.current = event.track;
            setHasRemoteVideoTrack(true);
            event.track.onended = () => {
              primaryVideoTrackRef.current = null;
              setHasRemoteVideoTrack(false);
            };
          } else if (primaryVideoTrackRef.current.id !== event.track.id) {
            secondaryVideoTrackRef.current = event.track;
            setHasRemotePipTrack(true);
            event.track.onended = () => {
              secondaryVideoTrackRef.current = null;
              setHasRemotePipTrack(false);
            };
          }
          attachVideoStreams();
        } else if (event.track.kind === 'audio') {
          audioStream.getAudioTracks().forEach((t) => audioStream.removeTrack(t));
          audioStream.addTrack(event.track);
          attachAudioStream();
        }
      };

      pc.onicecandidate = (event) => {
        if (
          event.candidate &&
          activeOfferIdRef.current === incomingOfferId &&
          !exitingClassRef.current &&
          activeListKeyRef.current === listKey
        ) {
          const iceRef = push(
            ref(db, `allowed_live_students/${listKey}/signals/${studentUid}/studentIce`)
          );
          set(iceRef, {
            offerId: incomingOfferId,
            candidate: event.candidate.toJSON(),
          }).catch(() => {});
        }
      };

      const teacherIceRef = ref(
        db,
        `allowed_live_students/${listKey}/signals/${studentUid}/teacherIce`
      );
      const processedKeys = new Set<string>();
      unsubTeacherIce = onValue(teacherIceRef, (iceSnap) => {
        const val = iceSnap.val();
        if (!val || activeOfferIdRef.current !== incomingOfferId) return;

        Object.entries(val).forEach(async ([k, item]: [string, any]) => {
          if (processedKeys.has(k)) return;
          if (!item || (item.offerId && item.offerId !== incomingOfferId)) return;
          processedKeys.add(k);

          const candInit: RTCIceCandidateInit = item.candidate
            ? item.candidate
            : typeof item === 'string'
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

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: offerData.type || 'offer',
            sdp: offerData.sdp,
          })
        );
        remoteDescReady = true;

        if (
          studentMicTrackRef.current &&
          studentMicTrackRef.current.readyState === 'live'
        ) {
          const stuAudioStream = new MediaStream([studentMicTrackRef.current]);
          pc.addTrack(studentMicTrackRef.current, stuAudioStream);
        }

        const pending = [...queuedTeacherIce];
        queuedTeacherIce.length = 0;
        for (const cand of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await set(
          ref(db, `allowed_live_students/${listKey}/signals/${studentUid}/answer`),
          {
            offerId: incomingOfferId,
            type: answer.type,
            sdp: answer.sdp,
            timestamp: Date.now(),
          }
        );
      } catch (err) {
        console.warn('Error respondiendo Offer WebRTC:', err);
      }
    });

    return () => {
      clearInterval(connectivityInterval);
      unsubRoomRoot();
      unsubPresence();
      unsubViewers();
      unsubChat();
      unsubCanvas();
      unsubPoll();
      unsubPins();
      unsubActiveRes();
      unsubControl();
      unsubOffer();
      if (unsubTeacherIce) unsubTeacherIce();
      remove(myViewerRef).catch(() => {});
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }
      activeOfferIdRef.current = null;
    };
  }, [
    matchedRoom?.listKey,
    hasJoinedRoom,
    studentUid,
    studentName,
    attachVideoStreams,
    attachAudioStream,
    forceCutAndExitClass,
  ]);

  // Alternar Micrófono del Estudiante (en pantalla previa o dentro de la sala)
  const handleToggleStudentMic = async () => {
    try {
      if (
        studentMicTrackRef.current &&
        studentMicTrackRef.current.readyState === 'live'
      ) {
        const nextMuted = !micMuted;
        studentMicTrackRef.current.enabled = !nextMuted;
        setMicMuted(nextMuted);
        if (!nextMuted) setFloorGrantedBanner(false);
        if (matchedRoom && hasJoinedRoom) {
          const myViewerRef = ref(
            db,
            `allowed_live_students/${matchedRoom.listKey}/connected_viewers/${studentUid}`
          );
          await update(myViewerRef, { micMuted: nextMuted });
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          studentMicTrackRef.current = aTrack;
          aTrack.onended = () => {
            studentMicTrackRef.current = null;
            setMicMuted(true);
          };
          aTrack.enabled = true;
          setMicMuted(false);
          setFloorGrantedBanner(false);
          if (matchedRoom && hasJoinedRoom) {
            const myViewerRef = ref(
              db,
              `allowed_live_students/${matchedRoom.listKey}/connected_viewers/${studentUid}`
            );
            await update(myViewerRef, {
              micMuted: false,
              renegotiateAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('No se pudo activar el micrófono del estudiante:', err);
    }
  };

  // Alternar Cámara del Estudiante (en pantalla previa o dentro de la sala)
  const handleToggleStudentCam = async () => {
    try {
      if (
        studentCamTrackRef.current &&
        studentCamTrackRef.current.readyState === 'live'
      ) {
        studentCamTrackRef.current.stop();
        studentCamTrackRef.current = null;
        setStudentCamOn(false);
        syncStudentLocalPreview();
        if (matchedRoom && hasJoinedRoom) {
          const myViewerRef = ref(
            db,
            `allowed_live_students/${matchedRoom.listKey}/connected_viewers/${studentUid}`
          );
          await update(myViewerRef, { camOn: false });
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          studentCamTrackRef.current = vTrack;
          vTrack.onended = () => {
            studentCamTrackRef.current = null;
            setStudentCamOn(false);
            syncStudentLocalPreview();
          };
          setStudentCamOn(true);
          syncStudentLocalPreview();
          if (matchedRoom && hasJoinedRoom) {
            const myViewerRef = ref(
              db,
              `allowed_live_students/${matchedRoom.listKey}/connected_viewers/${studentUid}`
            );
            await update(myViewerRef, { camOn: true });
          }
        }
      }
    } catch (err) {
      console.warn('No se pudo activar la cámara del estudiante:', err);
    }
  };

  // Entrar a la clase en vivo desde la pantalla previa
  const handleEnterLiveRoom = () => {
    if (!matchedRoom) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ipt_student_joined_list_key', matchedRoom.listKey);
    }
    wasInLiveRoomRef.current = true;
    activeListKeyRef.current = matchedRoom.listKey;
    exitingClassRef.current = false;
    setHasJoinedRoom(true);
  };

  // Levantar o bajar la mano
  const handleToggleHand = async () => {
    if (!matchedRoom) return;
    const next = !handRaised;
    setHandRaised(next);
    const handRef = ref(
      db,
      `allowed_live_students/${matchedRoom.listKey}/raised_hands/${studentUid}`
    );
    if (next) {
      await set(handRef, { name: studentName, timestamp: Date.now() });
    } else {
      await remove(handRef);
    }
  };

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

  const myStudentIndex = useMemo(() => {
    const idx = studentOrderList.indexOf(studentUid);
    return idx >= 0 ? idx : 0;
  }, [studentOrderList, studentUid]);

  const myHclColor = useMemo(
    () => getCanvasAuthorColorHCL('student', myStudentIndex),
    [myStudentIndex]
  );

  // Editar el Lienzo Virtual en Vivo con color por carácter (cada carácter conserva su autor original)
  const handleStudentEditCanvas = async (newContent: string) => {
    if (!matchedRoom || !liveCanvas.allowStudentEdit) return;

    const currentOrder = [...studentOrderList];
    let sIdx = currentOrder.indexOf(studentUid);
    if (sIdx === -1) {
      currentOrder.push(studentUid);
      sIdx = currentOrder.length - 1;
    }

    const authorHcl = getCanvasAuthorColorHCL('student', sIdx);
    const nextCharColors = computeNextCharColors(
      liveCanvas.content || '',
      liveCanvas.charColors,
      newContent,
      authorHcl.hex
    );

    const updated: LiveCanvasData = {
      ...liveCanvas,
      content: newContent,
      charColors: nextCharColors,
      studentOrder: currentOrder,
      updatedBy: studentName,
      updatedAt: Date.now(),
    };
    setLiveCanvas(updated);
    await set(
      ref(db, `allowed_live_students/${matchedRoom.listKey}/liveCanvas`),
      updated
    ).catch(() => {});
  };

  // Eventos de navegación y dibujo en el Tablero Inteligente Infinito
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();

    // Paneo con botón secundario (derecho = 2), rueda central (= 1) o herramienta Mano
    if (e.button === 1 || e.button === 2 || boardTool === 'hand' || !liveCanvas.allowStudentEdit) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: boardPanRef.current.x,
        initialPanY: boardPanRef.current.y,
      };
      return;
    }

    if (e.button === 0 && boardTool === 'pen' && liveCanvas.allowStudentEdit) {
      const pan = boardPanRef.current;
      const zoom = boardZoomRef.current;
      const wx = (e.clientX - rect.left - pan.x) / zoom;
      const wy = (e.clientY - rect.top - pan.y) / zoom;

      isDrawingRef.current = true;
      currentStrokeRef.current = {
        id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uid: studentUid,
        name: studentName,
        role: 'student',
        colorHex: myHclColor.hex,
        width: strokeWidth,
        points: [{ x: wx, y: wy }],
      };
      renderWhiteboardCanvas();
    }
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const newPan = {
        x: Math.round(panStartRef.current.initialPanX + dx),
        y: Math.round(panStartRef.current.initialPanY + dy),
      };
      boardPanRef.current = newPan;
      setBoardPan(newPan);
      renderWhiteboardCanvas();
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pan = boardPanRef.current;
    const zoom = boardZoomRef.current;
    const wx = (e.clientX - rect.left - pan.x) / zoom;
    const wy = (e.clientY - rect.top - pan.y) / zoom;

    currentStrokeRef.current.points.push({ x: wx, y: wy });
    renderWhiteboardCanvas();
  };

  const handleBoardPointerUp = async () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current || !matchedRoom) return;
    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const currentOrder = [...studentOrderList];
    if (!currentOrder.includes(studentUid)) {
      currentOrder.push(studentUid);
    }

    const nextStrokes = [...(liveCanvas.strokes || []), finishedStroke];
    const updated: LiveCanvasData = {
      ...liveCanvas,
      strokes: nextStrokes,
      studentOrder: currentOrder,
      updatedBy: studentName,
      updatedAt: Date.now(),
    };
    setLiveCanvas(updated);
    await set(
      ref(db, `allowed_live_students/${matchedRoom.listKey}/liveCanvas`),
      updated
    ).catch(() => {});
  };

  const handleBoardWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey || e.altKey || boardTool === 'hand') {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const prevZoom = boardZoomRef.current;
      const nextZoom = Math.min(4.0, Math.max(0.2, Number((prevZoom * zoomFactor).toFixed(2))));
      const prevPan = boardPanRef.current;
      const newPanX = mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom);
      const newPanY = mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom);
      const newPan = { x: Math.round(newPanX), y: Math.round(newPanY) };

      boardZoomRef.current = nextZoom;
      boardPanRef.current = newPan;
      setBoardZoom(nextZoom);
      setBoardPan(newPan);
      renderWhiteboardCanvas();
    } else {
      const prevPan = boardPanRef.current;
      const newPan = {
        x: Math.round(prevPan.x - e.deltaX),
        y: Math.round(prevPan.y - e.deltaY),
      };
      boardPanRef.current = newPan;
      setBoardPan(newPan);
      renderWhiteboardCanvas();
    }
  };

  const handleZoomIn = () => {
    const canvas = boardCanvasRef.current;
    const centerX = canvas ? canvas.width / 2 : 640;
    const centerY = canvas ? canvas.height / 2 : 360;
    const prevZoom = boardZoomRef.current;
    const nextZoom = Math.min(4.0, Number((prevZoom * 1.25).toFixed(2)));
    const prevPan = boardPanRef.current;
    const newPan = {
      x: Math.round(centerX - (centerX - prevPan.x) * (nextZoom / prevZoom)),
      y: Math.round(centerY - (centerY - prevPan.y) * (nextZoom / prevZoom)),
    };
    boardZoomRef.current = nextZoom;
    boardPanRef.current = newPan;
    setBoardZoom(nextZoom);
    setBoardPan(newPan);
    renderWhiteboardCanvas();
  };

  const handleZoomOut = () => {
    const canvas = boardCanvasRef.current;
    const centerX = canvas ? canvas.width / 2 : 640;
    const centerY = canvas ? canvas.height / 2 : 360;
    const prevZoom = boardZoomRef.current;
    const nextZoom = Math.max(0.2, Number((prevZoom / 1.25).toFixed(2)));
    const prevPan = boardPanRef.current;
    const newPan = {
      x: Math.round(centerX - (centerX - prevPan.x) * (nextZoom / prevZoom)),
      y: Math.round(centerY - (centerY - prevPan.y) * (nextZoom / prevZoom)),
    };
    boardZoomRef.current = nextZoom;
    boardPanRef.current = newPan;
    setBoardZoom(nextZoom);
    setBoardPan(newPan);
    renderWhiteboardCanvas();
  };

  const handleResetBoardView = () => {
    boardZoomRef.current = 1;
    boardPanRef.current = { x: 0, y: 0 };
    setBoardZoom(1);
    setBoardPan({ x: 0, y: 0 });
    renderWhiteboardCanvas();
  };

  const handleUndoMyLastStroke = async () => {
    if (!matchedRoom || !liveCanvas.allowStudentEdit) return;
    const allStrokes = [...(liveCanvas.strokes || [])];
    let lastMyIdx = -1;
    for (let i = allStrokes.length - 1; i >= 0; i--) {
      if (allStrokes[i].uid === studentUid) {
        lastMyIdx = i;
        break;
      }
    }
    if (lastMyIdx === -1) return;
    allStrokes.splice(lastMyIdx, 1);
    const updated: LiveCanvasData = {
      ...liveCanvas,
      strokes: allStrokes,
      updatedBy: studentName,
      updatedAt: Date.now(),
    };
    setLiveCanvas(updated);
    await set(
      ref(db, `allowed_live_students/${matchedRoom.listKey}/liveCanvas`),
      updated
    ).catch(() => {});
  };

  const handleCopyCanvas = () => {
    navigator.clipboard.writeText(liveCanvas.content || '');
    setCopiedCanvas(true);
    setTimeout(() => setCopiedCanvas(false), 2000);
  };

  const handleToggleImageFloatingMode = () => {
    const nextFloating = !imageFloatingMode;
    setImageFloatingMode(nextFloating);
    if (nextFloating && stageMode !== 'canvas') {
      setStageMode('canvas');
    }
  };

  const cycleImageFloatingCorner = () => {
    const corners: ('top-right' | 'bottom-right' | 'bottom-left' | 'top-left')[] = [
      'top-right',
      'bottom-right',
      'bottom-left',
      'top-left',
    ];
    const nextIdx = (corners.indexOf(imageFloatingCorner) + 1) % corners.length;
    setImageFloatingCorner(corners[nextIdx]);
  };

  // Votar en el Pulso Rápido en Vivo
  const handleVotePoll = async (optionIndex: number) => {
    if (!matchedRoom || !activePoll) return;
    await set(
      ref(
        db,
        `allowed_live_students/${matchedRoom.listKey}/activePoll/votes/${studentUid}`
      ),
      {
        optionIndex,
        voterName: studentName,
      }
    ).catch(() => {});
  };

  // Enviar mensaje en el chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !matchedRoom) return;
    const msgRef = push(
      ref(db, `allowed_live_students/${matchedRoom.listKey}/chat`)
    );
    await set(msgRef, {
      senderName: studentName,
      senderRole: 'student',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setChatInput('');
  };

  // Reservar una clase programada consumiendo 1 crédito
  const handleBookSession = async (session: ScheduledSessionItem) => {
    if (entitlements.availableLiveCredits <= 0) {
      openPricingModal('pro_plus');
      return;
    }
    setBookingBusyId(session.id);
    setBookingFeedback(null);
    try {
      await consumeCreditHashForClass({
        sessionId: session.id,
        title: session.title,
        startTime: session.startUtc,
      });
      setBookingFeedback('Tu lugar quedó reservado.');
    } catch {
      setBookingFeedback('No se pudo completar la reserva.');
    } finally {
      setBookingBusyId(null);
    }
  };

  const cyclePipCorner = () => {
    const order: PipCorner[] = ['bottom-right', 'top-right', 'top-left', 'bottom-left'];
    const idx = order.indexOf(pipCorner);
    setPipCorner(order[(idx + 1) % order.length]);
  };

  const pipCornerClass = useMemo(() => {
    switch (pipCorner) {
      case 'top-right':
        return 'top-20 right-6';
      case 'top-left':
        return 'top-20 left-6';
      case 'bottom-left':
        return 'bottom-24 left-6';
      default:
        return 'bottom-24 right-6';
    }
  }, [pipCorner]);

  // Calcular líneas con su offset inicial para renderizar color por carácter
  const canvasLinesWithOffsets = useMemo(() => {
    const rawLines = (liveCanvas.content || '').split('\n');
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
        uniqueColors: uniqueColors.length > 0 ? uniqueColors : ['#000000'],
      };
    });
  }, [liveCanvas.content, liveCanvas.charColors]);

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#8052ff] rounded-full animate-spin" />
      </div>
    );
  }

  // Vista de Grabaciones de Clases con Reproductor y Resúmenes IA
  if (viewMode === 'recordings') {
    return <RecordedClassesViewer onBackToLive={() => setViewMode('live')} />;
  }

  // ============================================================================
  // VISTA A: SALA DE ESPERA CUANDO EL DOCENTE AÚN NO HA INICIADO TRANSMISIÓN
  // ============================================================================
  if (!matchedRoom) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-[#8052ff]/[0.07] rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 bg-[#09090b] rounded-[24px] p-10 border border-white/[0.08] flex flex-col items-center justify-center text-center min-h-[340px] shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8052ff]/25 to-[#050507] border border-[#8052ff]/40 flex items-center justify-center text-2xl font-semibold text-white mb-5 shadow-[0_0_40px_rgba(128,82,255,0.25)]">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-normal text-white mb-2">
              Esperando al docente
            </h1>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
              En cuanto el profesor inicie tu clase programada, entrarás automáticamente al escenario en vivo sin necesidad de ingresar códigos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/home')}
                className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Volver al campus
              </button>
              <button
                type="button"
                onClick={() => setViewMode('recordings')}
                className="px-6 py-2.5 rounded-full bg-[#8052ff]/20 hover:bg-[#8052ff]/30 border border-[#8052ff]/40 text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(128,82,255,0.25)]"
              >
                <Video className="w-3.5 h-3.5 text-[#b79aff]" />
                <span>Ver clases grabadas</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#09090b]/90 backdrop-blur-xl rounded-[24px] p-6 border border-white/[0.08] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8052ff]" />
                <span>Próximas sesiones</span>
              </h2>
              <span className="text-xs text-zinc-400">
                Créditos disponibles:{' '}
                <strong className="text-white">
                  {entitlements.availableLiveCredits}
                </strong>
              </span>
            </div>

            {bookingFeedback && (
              <div className="px-3 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-xs text-[#10b981]">
                {bookingFeedback}
              </div>
            )}

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {scheduledSessions.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  No hay sesiones adicionales en agenda por ahora.
                </p>
              ) : (
                scheduledSessions.map((sess) => {
                  const isBooked = Boolean(sess.isTutoria || (sess.studentUid && sess.studentUid === studentUid) || bookedLiveSessionIds.includes(sess.id));
                  return (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-xl bg-[#050507] border border-white/[0.06] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {sess.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-[#8052ff]" />
                          <span>
                            {new Date(sess.startUtc).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>
                      </div>

                      {isBooked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-[11px] font-medium shrink-0">
                          <Check className="w-3 h-3" />
                          Agendada
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={bookingBusyId === sess.id}
                          onClick={() => handleBookSession(sess)}
                          className="px-3.5 py-1.5 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-white text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                        >
                          {bookingBusyId === sess.id ? 'Agendando...' : 'Agendar'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA B: PANTALLA PREVIA A ENTRAR (ANTESALA DEL ESTUDIANTE)
  // ============================================================================
  if (!hasJoinedRoom) {
    const isTeacherConnected = matchedRoom.teacherOnline !== false;

    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[520px] h-[520px] bg-[#8052ff]/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 right-1/4 w-[420px] h-[420px] bg-[#10b981]/[0.04] rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-3xl w-full bg-[#09090b] rounded-[28px] border border-white/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden relative z-10">
          {/* Fila 1: Estado de conexión del docente */}
          <div className="px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isTeacherConnected
                    ? 'bg-[#10b981] animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-sm font-medium text-white">
                {isTeacherConnected
                  ? 'El docente se encuentra actualmente conectado'
                  : 'El docente está reconectando su señal...'}
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {matchedRoom.teacherName} · <strong className="text-zinc-200">{matchedRoom.title}</strong>
            </span>
          </div>

          {/* Fila 2: Tiempo transcurrido desde que empezó la clase */}
          <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#050507]/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-zinc-300">
              <Clock className="w-4 h-4 text-[#8052ff] shrink-0" />
              <span>La clase empezó hace:</span>
              <span className="font-mono font-semibold text-white px-2.5 py-0.5 rounded-lg bg-[#8052ff]/15 border border-[#8052ff]/30">
                {elapsedStr}
              </span>
            </div>
            {matchedRoom.currentTopic && (
              <span className="text-xs text-zinc-400 truncate max-w-xs hidden sm:inline">
                Tema: <span className="text-zinc-200">{matchedRoom.currentTopic}</span>
              </span>
            )}
          </div>

          {/* Cuerpo Principal: Previsualización + Controles de Micrófono y Cámara */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Escenario de previsualización de cámara del estudiante */}
            <div className="relative w-full aspect-video max-h-[340px] bg-[#050507] rounded-[22px] border border-white/[0.08] overflow-hidden flex items-center justify-center shadow-inner">
              <video
                ref={studentLobbyVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  studentCamOn ? 'block' : 'hidden'
                }`}
              />

              {!studentCamOn && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8052ff]/25 to-[#09090b] border border-[#8052ff]/40 flex items-center justify-center text-2xl font-semibold text-white mb-3 shadow-[0_0_40px_rgba(128,82,255,0.2)]">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-white">{studentName}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configura tu micrófono y cámara antes de entrar
                  </p>
                </div>
              )}

              {/* Indicadores de estado sobre la vista previa */}
              <div className="absolute bottom-3.5 left-4 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border ${
                    !micMuted
                      ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
                      : 'bg-black/70 border-white/10 text-zinc-400'
                  }`}
                >
                  {!micMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  <span>{!micMuted ? 'Micrófono activo' : 'Micrófono silenciado'}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border ${
                    studentCamOn
                      ? 'bg-[#8052ff]/20 border-[#8052ff]/40 text-[#b79aff]'
                      : 'bg-black/70 border-white/10 text-zinc-400'
                  }`}
                >
                  {studentCamOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  <span>{studentCamOn ? 'Cámara encendida' : 'Cámara apagada'}</span>
                </span>
              </div>
            </div>

            {/* Fila de Controles: | Micrófono                       Cámara | */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleToggleStudentMic}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  !micMuted
                    ? 'bg-[#10b981]/15 border-[#10b981]/45 text-white shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                    : 'bg-[#050507] hover:bg-white/[0.04] border-white/10 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      !micMuted
                        ? 'bg-[#10b981] text-black'
                        : 'bg-white/[0.06] text-zinc-300'
                    }`}
                  >
                    {!micMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">Micrófono</p>
                    <p className="text-xs text-zinc-400">
                      {!micMuted ? 'Activado para hablar' : 'Entrar en silencio'}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    !micMuted
                      ? 'bg-[#10b981]/20 text-[#10b981]'
                      : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {!micMuted ? 'Activo' : 'Apagado'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleStudentCam}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  studentCamOn
                    ? 'bg-[#8052ff]/15 border-[#8052ff]/50 text-white shadow-[0_0_30px_rgba(128,82,255,0.2)]'
                    : 'bg-[#050507] hover:bg-white/[0.04] border-white/10 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      studentCamOn
                        ? 'bg-[#8052ff] text-white'
                        : 'bg-white/[0.06] text-zinc-300'
                    }`}
                  >
                    {studentCamOn ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <VideoOff className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">Cámara</p>
                    <p className="text-xs text-zinc-400">
                      {studentCamOn ? 'Video activo' : 'Cámara desactivada'}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    studentCamOn
                      ? 'bg-[#8052ff]/25 text-[#b79aff]'
                      : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {studentCamOn ? 'Activa' : 'Apagada'}
                </span>
              </button>
            </div>

            {/* Acciones inferiores: Volver al campus / Ver grabaciones / Entrar a la clase */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => forceCutAndExitClass('manual_leave')}
                  className="px-5 py-3 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Volver al campus
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('recordings')}
                  className="px-4 py-3 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5 text-[#8052ff]" />
                  <span>Grabaciones</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleEnterLiveRoom}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(128,82,255,0.45)] transition-all cursor-pointer"
              >
                <span>Entrar a la clase</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA C: SALA EN VIVO — OBSIDIAN STUDIO & ELECTRIC IRIS
  // ============================================================================
  const viewersCount = Object.keys(connectedViewers).length;
  const showVideoElement =
    hasRemoteVideoTrack || Boolean(matchedRoom.mediaState?.hasVideo);
  const showPipWindow =
    (stageMode === 'canvas' && showVideoElement) ||
    (stageMode === 'video' &&
      (hasRemotePipTrack || matchedRoom.mediaState?.mode === 'dual'));

  const pollTotalVotes = activePoll?.votes ? Object.keys(activePoll.votes).length : 0;
  const myPollVote = activePoll?.votes?.[studentUid]?.optionIndex;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col select-none overflow-hidden">
      {/* Canal de audio dedicado para la voz del docente y audio de pantalla */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

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
          <span className="text-sm font-medium text-zinc-200 truncate hidden sm:inline">
            {matchedRoom.title}
          </span>
        </div>

        {/* Centro: Marcador de Tema Actual en Vivo */}
        <div className="flex items-center justify-center flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#09090b]/90 border border-[#8052ff]/35 max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
            <span className="text-xs text-zinc-400 hidden md:inline">Tema:</span>
            <span className="text-xs font-medium text-white truncate">
              {matchedRoom.currentTopic || matchedRoom.title}
            </span>
          </div>
        </div>

        {/* Derecha: Participantes y Recurso en Vivo */}
        <div className="flex items-center gap-2.5">
          {activeResource && activeResource.visible && (
            <button
              type="button"
              onClick={() => setShowStudentResourceViewer((s) => !s)}
              title={
                showStudentResourceViewer
                  ? "Ocultar recurso de mi vista"
                  : "Ver recurso de la clase"
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                showStudentResourceViewer
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
            >
              {showStudentResourceViewer ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ocultar recurso</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver recurso ({activeResource.title.slice(0, 15)})</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSidePanel((p) => (p === 'people' ? 'none' : 'people'))}
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
          {/* MODO 1: ESCENARIO DE VIDEO / PANTALLA COMPARTIDA */}
          <div
            className={`w-full h-full flex items-center justify-center ${
              stageMode === 'video' ? 'flex' : 'hidden'
            }`}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                showVideoElement ? 'block' : 'hidden'
              }`}
            />

            {!showVideoElement && (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8052ff]/25 to-[#050507] border border-[#8052ff]/40 flex items-center justify-center text-4xl font-semibold text-white mb-4 shadow-[0_0_50px_rgba(128,82,255,0.2)]">
                  {matchedRoom.teacherName.charAt(0).toUpperCase()}
                </div>
                <p className="text-base font-medium text-white">
                  {matchedRoom.teacherName}
                </p>
                <p className="text-xs text-[#10b981] mt-1">En vivo</p>
              </div>
            )}
          </div>

          {/* MODO 2: LIENZO VIRTUAL EN VIVO — SOLO 2 MODOS (Texto manual por carácter / Pizarrón de dibujo libre) */}
          {stageMode === 'canvas' && (
            <div className="w-full h-full flex flex-col bg-[#ffffff] text-[#000000]">
              {/* Barra Superior del Lienzo Virtual */}
              <div className="px-5 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Indicador de la modalidad elegida por el docente */}
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-zinc-300 text-xs font-semibold text-zinc-900">
                    <PenTool className="w-3.5 h-3.5 text-[#0052eb]" />
                    <span>
                      {liveCanvas.canvasMode === 'board'
                        ? 'Pizarrón / Dibujo libre'
                        : 'Texto manual'}
                    </span>
                  </span>

                  {/* Herramientas de trazo para el estudiante cuando está en Pizarrón y tiene permiso de edición */}
                  {liveCanvas.canvasMode === 'board' && liveCanvas.allowStudentEdit && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-300">
                      {([
                        { label: 'Fino', w: 2 },
                        { label: 'Medio', w: 4 },
                        { label: 'Grueso', w: 7 },
                      ] as const).map((item) => (
                        <button
                          key={item.w}
                          type="button"
                          onClick={() => setStrokeWidth(item.w)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            strokeWidth === item.w
                              ? 'bg-zinc-900 text-white'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={handleUndoMyLastStroke}
                        title="Deshacer mi último trazo"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Deshacer</span>
                      </button>
                    </div>
                  )}

                  {/* Leyenda cromática del Lienzo Blanco (SOLO participantes conectados en vivo) */}
                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-300">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200/80 text-[11px] font-medium text-black">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: '#000000' }}
                      />
                      Docente
                    </span>
                    {studentOrderList.map((uid, idx) => {
                      const viewer = connectedViewers[uid];
                      if (!viewer) return null;
                      const hcl = getCanvasAuthorColorHCL('student', idx);
                      const isMe = uid === studentUid;
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-[11px] font-semibold"
                          style={{ color: hcl.hex }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hcl.hex }}
                          />
                          {(viewer.name || 'Estudiante').split(' ')[0]}
                          {isMe ? ' (Tú)' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      liveCanvas.allowStudentEdit
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-600'
                    }`}
                  >
                    {liveCanvas.allowStudentEdit ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>
                          {liveCanvas.canvasMode === 'board'
                            ? 'Puedes dibujar en el pizarrón'
                            : 'Puedes escribir en el lienzo'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Vista en tiempo real</span>
                      </>
                    )}
                  </span>

                  {liveCanvas.canvasMode === 'text' && (
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
              {liveCanvas.canvasMode === 'text' ? (
                <div className="flex-1 flex overflow-hidden font-mono text-sm bg-[#ffffff] relative">
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
                      readOnly={!liveCanvas.allowStudentEdit}
                      onChange={(e) => handleStudentEditCanvas(e.target.value)}
                      onScroll={(e) => {
                        if (canvasBackdropRef.current) {
                          canvasBackdropRef.current.scrollTop = e.currentTarget.scrollTop;
                          canvasBackdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}
                      spellCheck={false}
                      placeholder={
                        liveCanvas.allowStudentEdit
                          ? 'Escribe aquí con tu color asignado...'
                          : 'El docente está escribiendo en el lienzo...'
                      }
                      style={{ caretColor: myHclColor.hex }}
                      className="absolute inset-0 w-full h-full bg-transparent p-4 text-transparent outline-none resize-none leading-6 font-mono text-sm whitespace-pre overflow-auto selection:bg-blue-500/20"
                    />
                  </div>
                </div>
              ) : (
                /* SUB-MODO B: PIZARRÓN / DIBUJO LIBRE SOBRE FONDO BLANCO (TABLERO INTELIGENTE INFINITO) */
                <div className="flex-1 relative bg-[#ffffff] overflow-hidden select-none">
                  <canvas
                    ref={boardCanvasRef}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerUp}
                    onPointerCancel={handleBoardPointerUp}
                    onWheel={handleBoardWheel}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`w-full h-full block touch-none ${
                      boardTool === 'hand'
                        ? 'cursor-grab active:cursor-grabbing'
                        : liveCanvas.allowStudentEdit
                        ? 'cursor-crosshair'
                        : 'cursor-grab active:cursor-grabbing'
                    }`}
                  />

                  {/* HUD FLOTANTE DE CONTROL DEL TABLERO INTELIGENTE (ZOOM Y CENTRADO) */}
                  <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl text-white">
                    {liveCanvas.allowStudentEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => setBoardTool('pen')}
                          title="Lápiz"
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                            boardTool === 'pen'
                              ? 'bg-white text-zinc-900'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardTool('hand')}
                          title="Mano (Mover tablero)"
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                            boardTool === 'hand'
                              ? 'bg-[#8052ff] text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Move className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-5 bg-zinc-700 mx-0.5" />
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleZoomOut}
                      title="Alejar tablero (-)"
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetBoardView}
                      title="Restablecer zoom al 100% y centrar"
                      className="px-2.5 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold flex items-center justify-center transition-colors cursor-pointer min-w-14"
                    >
                      {Math.round(boardZoom * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      title="Acercar tablero (+)"
                      className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-5 bg-zinc-700 mx-0.5" />

                    <button
                      type="button"
                      onClick={handleResetBoardView}
                      title="Centrar tablero en el origen"
                      className="px-2.5 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Centrar</span>
                    </button>
                  </div>

                  {/* MINI BADGE DE ESTADO */}
                  <div className="absolute top-4 right-4 z-10 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-zinc-300/80 text-[11px] font-semibold text-zinc-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Tablero Inteligente Infinito</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISOR DE RECURSO PROYECTADO POR EL DOCENTE (PDF, PNG, JPEG, ETC.) */}
          {activeResource && activeResource.visible && showStudentResourceViewer && (
            activeResource.type === "image" && imageFloatingMode ? (
              /* MODALIDAD FLOTANTE (OPCIONAL): VENTANA FLOTANTE CON LIENZO DE FONDO */
              <div
                className={`absolute z-30 w-72 sm:w-88 md:w-[420px] max-h-[58vh] bg-[#09090b]/95 backdrop-blur-2xl rounded-2xl border border-white/25 shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 group ${
                  imageFloatingCorner === "top-right"
                    ? "top-4 right-4"
                    : imageFloatingCorner === "bottom-right"
                    ? "bottom-4 right-4"
                    : imageFloatingCorner === "bottom-left"
                    ? "bottom-4 left-4"
                    : "top-4 left-4"
                }`}
              >
                {/* Barra superior de la ventana flotante */}
                <div className="px-3.5 py-2 bg-black/85 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#8052ff]/20 text-[#c4adff] border border-[#8052ff]/40 text-[10px] font-bold">
                      <AppWindow className="w-3 h-3" />
                      <span>Flotante</span>
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {activeResource.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={cycleImageFloatingCorner}
                      title="Mover ventana flotante a otra esquina"
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleImageFloatingMode}
                      title="Restaurar a pantalla completa"
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStudentResourceViewer(false)}
                      title="Ocultar de mi vista"
                      className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contenedor compacto de la imagen flotante */}
                <div className="p-2.5 bg-black/50 overflow-hidden flex items-center justify-center max-h-[46vh]">
                  <img
                    src={activeResource.url}
                    alt={activeResource.title}
                    className="max-w-full max-h-[42vh] object-contain rounded-lg shadow-xl select-none"
                  />
                </div>
              </div>
            ) : (
              /* MODALIDAD ESTÁNDAR: VISOR PRINCIPAL SOBRE EL ESCENARIO */
              <div className="absolute inset-4 z-30 bg-[#09090b]/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2.5 bg-black/80 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        activeResource.type === "pdf"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {activeResource.type === "pdf"
                        ? "PDF"
                        : activeResource.type === "image"
                        ? "IMAGEN"
                        : "RECURSO"}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {activeResource.title}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Proyectado en vivo
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Opción NO obligatoria para recursos de imagen: Convertirse en ventana flotante y mostrar lienzo en el fondo */}
                    {activeResource.type === "image" && (
                      <button
                        type="button"
                        onClick={handleToggleImageFloatingMode}
                        title="Convertir en ventana flotante y mostrar lienzo de fondo"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#8052ff]/20 hover:bg-[#8052ff]/35 border border-[#8052ff]/40 text-[#c4adff] hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        <AppWindow className="w-3.5 h-3.5 text-[#b79aff]" />
                        <span>Ventana flotante + Lienzo</span>
                      </button>
                    )}

                    <a
                      href={activeResource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir en pestaña nueva"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowStudentResourceViewer(false)}
                      title="Ocultar de mi vista"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative bg-[#050507] overflow-auto flex items-center justify-center p-2">
                  {activeResource.type === "image" ? (
                    <img
                      src={activeResource.url}
                      alt={activeResource.title}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
                    />
                  ) : (
                    <iframe
                      src={activeResource.url}
                      title={activeResource.title}
                      className="w-full h-full rounded-lg border-0 bg-white"
                    />
                  )}
                </div>
              </div>
            )
          )}

          {/* VENTANA FLOTANTE PiP (Picture-in-Picture Dinámico) */}
          <div
            className={`absolute ${pipCornerClass} z-30 w-60 sm:w-72 aspect-video rounded-2xl bg-[#050507] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden group transition-all ${
              showPipWindow ? 'block' : 'hidden'
            }`}
          >
            <video
              ref={remotePipVideoRef}
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
              {stageMode === 'video' && (
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
              {matchedRoom.teacherName}
            </div>
          </div>

          {/* Aviso de reconexión del docente si pasan 10s sin recuperar conexión (cuelga a los 5m) */}
          {showTeacherConnectivityWarning && (
            <div className="absolute inset-x-0 top-16 z-40 flex justify-center px-4 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-[#09090b]/95 backdrop-blur-2xl border border-amber-500/45 text-white shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-w-xl">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    Hubo un problema de conectividad con el docente, espera un momento...
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5">
                    Esperando reconexión automática ({Math.floor(remainingReconnectSecs / 60)}:
                    {String(remainingReconnectSecs % 60).padStart(2, '0')})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botón flotante si el navegador pausó el audio inicialmente */}
          {audioBlocked && (
            <button
              type="button"
              onClick={() => {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current
                    .play()
                    .then(() => setAudioBlocked(false))
                    .catch(() => {});
                }
              }}
              className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#8052ff] hover:bg-[#6e3ff3] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Activar sonido de la clase</span>
            </button>
          )}

          {/* Invitación flotante cuando el docente le da la palabra al estudiante */}
          {floorGrantedBanner && micMuted && (
            <div className="absolute top-5 left-5 z-30 flex items-center gap-3 bg-[#09090b]/95 backdrop-blur-xl border border-[#10b981]/50 text-white px-4 py-2.5 rounded-2xl shadow-2xl">
              <Volume2 className="w-4 h-4 text-[#10b981] animate-pulse shrink-0" />
              <span className="text-xs font-medium">
                El docente te dio la palabra
              </span>
              <button
                type="button"
                onClick={handleToggleStudentMic}
                className="px-3 py-1 rounded-full bg-[#10b981] text-black text-[11px] font-semibold cursor-pointer"
              >
                Activar micrófono
              </button>
            </div>
          )}

          {/* TARJETA FLOTANTE DE PULSO / ENCUESTA EN VIVO PARA EL ESTUDIANTE */}
          {activePoll && activePoll.active && (
            <div className="absolute top-5 right-5 z-30 w-80 bg-[#09090b]/95 backdrop-blur-2xl border border-[#8052ff]/40 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#b79aff]">
                  <BarChart3 className="w-3.5 h-3.5 text-[#8052ff]" />
                  Pulso en Vivo ({pollTotalVotes} respuestas)
                </span>
              </div>
              <p className="text-xs font-medium text-white mb-3">
                {activePoll.question}
              </p>
              <div className="space-y-2">
                {activePoll.options.map((opt, idx) => {
                  const count = Object.values(activePoll.votes || {}).filter(
                    (v) => v.optionIndex === idx
                  ).length;
                  const pct =
                    pollTotalVotes > 0 ? Math.round((count / pollTotalVotes) * 100) : 0;
                  const isMyChoice = myPollVote === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleVotePoll(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isMyChoice
                          ? 'bg-[#8052ff]/20 border-[#8052ff] text-white'
                          : 'bg-[#050507] border-white/10 hover:border-white/25 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{opt}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-[#8052ff] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etiqueta inferior izquierda del docente */}
          {stageMode === 'video' && (
            <div className="absolute bottom-4 left-5 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-white border border-white/10">
              {matchedRoom.teacherName}
            </div>
          )}
        </div>

        {/* PANEL LATERAL (Participantes o Chat con Recursos Fijados) */}
        {sidePanel !== 'none' && (
          <div className="w-85 bg-[#09090b] text-white rounded-[24px] border border-white/[0.08] flex flex-col overflow-hidden shadow-2xl shrink-0">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                {sidePanel === 'people' ? 'Participantes en la sala' : 'Chat y Recursos'}
              </h3>
              <button
                type="button"
                onClick={() => setSidePanel('none')}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sidePanel === 'people' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black border border-white/20 text-white flex items-center justify-center text-xs font-semibold">
                      {matchedRoom.teacherName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">
                        {matchedRoom.teacherName}
                      </p>
                      <p className="text-[10px] text-[#b79aff]">Docente Titular</p>
                    </div>
                  </div>
                </div>

                {Object.entries(connectedViewers).map(([uid, v], idx) => {
                  const sIdx = Math.max(0, studentOrderList.indexOf(uid));
                  const hcl = getCanvasAuthorColorHCL(
                    'student',
                    sIdx >= 0 ? sIdx : idx
                  );
                  return (
                    <div
                      key={uid}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#050507] border border-white/[0.05]"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ backgroundColor: hcl.hex }}
                        >
                          {(v.name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-white truncate">
                          {v.name} {uid === studentUid ? '(Tú)' : ''}
                        </span>
                      </div>
                      {v.micMuted === false ? (
                        <Mic className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sidePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {pinnedResources.length > 0 && (
                  <div className="p-3.5 bg-[#050507] border-b border-white/[0.08] space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#b79aff]">
                      <Pin className="w-3.5 h-3.5 text-[#8052ff]" />
                      Recursos de la Clase ({pinnedResources.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {pinnedResources.map((pin) => (
                        <div
                          key={pin.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#8052ff]/10 hover:bg-[#8052ff]/20 border border-[#8052ff]/30 text-xs text-white transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {pin.type === 'pdf' ? (
                              <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : pin.type === 'image' ? (
                              <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                            ) : (
                              <ExternalLink className="w-4 h-4 text-[#8052ff] shrink-0" />
                            )}
                            <span className="truncate font-medium">{pin.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {activeResource?.id === pin.id && activeResource.visible && (
                              <button
                                type="button"
                                onClick={() => setShowStudentResourceViewer((s) => !s)}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold cursor-pointer"
                              >
                                {showStudentResourceViewer ? 'Ocultar' : 'Ver'}
                              </button>
                            )}

                            <a
                              href={pin.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir en pestaña nueva"
                              className="p-1 text-zinc-400 hover:text-white"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                        <p className="text-zinc-300 break-words leading-relaxed">
                          {m.text}
                        </p>
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
          </div>
        )}
      </div>

      {/* DOCK FLOTANTE INFERIOR TIPO CÁPSULA DE CRISTAL OSCURO */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#09090b]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={handleToggleStudentMic}
          title={micMuted ? 'Activar micrófono para hablar' : 'Silenciar micrófono'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            !micMuted
              ? 'bg-[#10b981] text-black shadow-[0_0_25px_rgba(16,185,129,0.4)]'
              : 'bg-rose-500/90 hover:bg-rose-500 text-white'
          }`}
        >
          {!micMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleStudentCam}
          title={studentCamOn ? 'Apagar cámara' : 'Encender cámara'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            studentCamOn
              ? 'bg-[#8052ff] text-white shadow-[0_0_25px_rgba(128,82,255,0.45)]'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
        >
          {studentCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleHand}
          title={handRaised ? 'Bajar la mano' : 'Levantar la mano'}
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            handRaised
              ? 'bg-amber-400 text-black font-semibold shadow-[0_0_25px_rgba(251,191,36,0.4)]'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span className="hidden sm:inline">
            {handRaised ? 'Mano levantada' : 'Pedir palabra'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStageMode((m) => (m === 'canvas' ? 'video' : 'canvas'))}
          title="Alternar entre Escenario de Video y Lienzo en Vivo"
          className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
            stageMode === 'canvas'
              ? 'bg-[#8052ff] text-white font-semibold shadow-[0_0_25px_rgba(128,82,255,0.45)]'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span className="hidden md:inline">Lienzo en Vivo</span>
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button
          type="button"
          onClick={() => setSidePanel((p) => (p === 'people' ? 'none' : 'people'))}
          title="Participantes"
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            sidePanel === 'people'
              ? 'bg-[#8052ff] text-white'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          <Users className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setSidePanel((p) => (p === 'chat' ? 'none' : 'chat'))}
          title="Chat y recursos fijados"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            sidePanel === 'chat'
              ? 'bg-[#8052ff] text-white'
              : 'bg-white/10 hover:bg-white/15 text-white'
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
          onClick={() => setViewMode('recordings')}
          title="Ver clases grabadas"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer bg-white/10 hover:bg-white/15 text-white"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => forceCutAndExitClass('manual_leave')}
          title="Salir de la sesión"
          className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 text-xs font-semibold transition-all ml-1 cursor-pointer shadow-[0_0_25px_rgba(225,29,72,0.4)]"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  );
}
