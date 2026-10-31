'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, set, update, remove, push } from 'firebase/database';
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
} from 'lucide-react';

interface ActiveMatchedRoom {
  code8: string;
  listKey: string;
  teacherUid: string;
  teacherName: string;
  title: string;
  currentTopic?: string;
  startedAt: number;
  signature: string;
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
  const [elapsedStr, setElapsedStr] = useState('00:00');

  // Controles de llamada del estudiante
  const [micMuted, setMicMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [floorGrantedBanner, setFloorGrantedBanner] = useState(false);
  const [sidePanel, setSidePanel] = useState<'none' | 'people' | 'chat'>('none');
  const [connectedViewers, setConnectedViewers] = useState<
    Record<string, { name: string; joinedAt: number; micMuted?: boolean }>
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
  const canvasBackdropRef = useRef<HTMLDivElement | null>(null);
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);

  // Micro-Encuestas y Recursos Fijados
  const [activePoll, setActivePoll] = useState<ActivePollData | null>(null);
  const [pinnedResources, setPinnedResources] = useState<PinnedResource[]>([]);

  // Para agendar cuando no hay sala activa en este segundo
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSessionItem[]>([]);
  const [bookingBusyId, setBookingBusyId] = useState<string | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);

  // Referencias WebRTC y reproducción multimedia
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remotePipVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const primaryVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const secondaryVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const studentMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeOfferIdRef = useRef<string | null>(null);

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    if (stageMode === 'canvas' && liveCanvas.canvasMode === 'board') {
      renderWhiteboardCanvas();
      const handleResize = () => renderWhiteboardCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [stageMode, liveCanvas.canvasMode, liveCanvas.strokes, renderWhiteboardCanvas]);

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
        setMatchedRoom(null);
        setCheckingAccess(false);
        return;
      }

      const allLists = snap.val();
      let found: ActiveMatchedRoom | null = null;

      for (const [listKey, listData] of Object.entries(allLists) as [string, any][]) {
        if (!listData || !listData.active) continue;
        const studentsMap = listData.students || {};

        let studentRecord = studentsMap[studentUid];
        if (!studentRecord && studentEmail) {
          studentRecord = Object.values(studentsMap).find(
            (s: any) => s && s.email && String(s.email).toLowerCase() === studentEmail
          );
        }

        if (studentRecord) {
          found = {
            code8: listData.code8 || listKey.replace('allowed_list_', ''),
            listKey,
            teacherUid: listData.teacherUid || 'teacher_ipt',
            teacherName: listData.teacherName || 'Docente Titular',
            title: listData.title || 'Sesión en Vivo',
            currentTopic: listData.currentTopic || 'Sesión en Vivo',
            startedAt: listData.startedAt || Date.now(),
            signature: studentRecord.signature || `${studentUid}: verified`,
            mediaState: listData.mediaState || {
              hasVideo: false,
              hasAudio: false,
              mode: 'none',
              updatedAt: Date.now(),
            },
          };
          break;
        }
      }

      setMatchedRoom(found);
      setCheckingAccess(false);
    });

    const unsubCal = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val)) as any[];
        const liveItems: ScheduledSessionItem[] = arr
          .filter((e) => e && (e.category === 'live_class' || e.category === 'tutoring'))
          .map((e) => ({
            id: e.id || `cls_${Date.now()}`,
            title: e.title || 'Clase en Vivo',
            instructor: e.instructor || 'Docente IPT',
            startUtc: e.startUtc || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
        setScheduledSessions(liveItems);
      }
    });

    return () => {
      unsubAllowed();
      unsubCal();
    };
  }, [studentUid, studentEmail]);

  // 2. Al entrar a la sala autorizada, conectar presencia, WebRTC, chat, lienzo, pulsos y controles de voz
  useEffect(() => {
    if (!matchedRoom) return;
    const { listKey } = matchedRoom;

    const myViewerRef = ref(
      db,
      `allowed_live_students/${listKey}/connected_viewers/${studentUid}`
    );
    set(myViewerRef, {
      name: studentName,
      joinedAt: Date.now(),
      micMuted: true,
      renegotiateAt: 0,
    });

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
        if (event.candidate && activeOfferIdRef.current === incomingOfferId) {
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
      unsubViewers();
      unsubChat();
      unsubCanvas();
      unsubPoll();
      unsubPins();
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
  }, [matchedRoom?.listKey, studentUid, studentName, attachVideoStreams, attachAudioStream]);

  // Alternar Micrófono Bidireccional del Estudiante
  const handleToggleStudentMic = async () => {
    if (!matchedRoom) return;
    const { listKey } = matchedRoom;
    const myViewerRef = ref(
      db,
      `allowed_live_students/${listKey}/connected_viewers/${studentUid}`
    );

    try {
      if (
        studentMicTrackRef.current &&
        studentMicTrackRef.current.readyState === 'live'
      ) {
        const nextMuted = !micMuted;
        studentMicTrackRef.current.enabled = !nextMuted;
        setMicMuted(nextMuted);
        if (!nextMuted) setFloorGrantedBanner(false);
        await update(myViewerRef, { micMuted: nextMuted });
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
          aTrack.enabled = true;
          setMicMuted(false);
          setFloorGrantedBanner(false);
          await update(myViewerRef, {
            micMuted: false,
            renegotiateAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.warn('No se pudo activar el micrófono del estudiante:', err);
    }
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

  // Mi índice de estudiante y mi color en el espacio HCL con Razón Áurea (1° en Azul #0052eb)
  const myStudentIndex = useMemo(() => {
    const order = liveCanvas.studentOrder || [];
    const idx = order.indexOf(studentUid);
    if (idx >= 0) return idx;
    return order.length;
  }, [liveCanvas.studentOrder, studentUid]);

  const myHclColor = useMemo(
    () => getCanvasAuthorColorHCL('student', myStudentIndex),
    [myStudentIndex]
  );

  // Editar el Lienzo Virtual en Vivo con color por carácter (cada carácter conserva su autor original)
  const handleStudentEditCanvas = async (newContent: string) => {
    if (!matchedRoom || !liveCanvas.allowStudentEdit) return;

    const currentOrder = Array.isArray(liveCanvas.studentOrder)
      ? [...liveCanvas.studentOrder]
      : [];
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

  // Dibujo libre del estudiante en el Pizarrón (usando su color HCL Razón Áurea)
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!matchedRoom || !liveCanvas.allowStudentEdit) return;
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uid: studentUid,
      name: studentName,
      role: 'student',
      colorHex: myHclColor.hex,
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
    if (!isDrawingRef.current || !currentStrokeRef.current || !matchedRoom) return;
    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const currentOrder = Array.isArray(liveCanvas.studentOrder)
      ? [...liveCanvas.studentOrder]
      : [];
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
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Volver al campus
            </button>
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
                  const isBooked = bookedLiveSessionIds.includes(sess.id);
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
  // VISTA B: SALA EN VIVO — OBSIDIAN STUDIO & ELECTRIC IRIS
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
  const studentOrderList = liveCanvas.studentOrder || [];

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

        {/* Derecha: Participantes */}
        <div className="flex items-center gap-2.5">
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

                  {/* Leyenda cromática del Lienzo Blanco */}
                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-300">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200/80 text-[11px] font-medium text-black">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: '#000000' }}
                      />
                      Docente
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-[11px] font-semibold"
                      style={{ color: myHclColor.hex }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: myHclColor.hex }}
                      />
                      Tu color ({studentName.split(' ')[0]})
                    </span>
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
                /* SUB-MODO B: PIZARRÓN / DIBUJO LIBRE SOBRE FONDO BLANCO */
                <div className="flex-1 relative bg-[#ffffff] overflow-hidden">
                  <canvas
                    ref={boardCanvasRef}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerUp}
                    onPointerCancel={handleBoardPointerUp}
                    className={`w-full h-full block touch-none ${
                      liveCanvas.allowStudentEdit ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  />
                </div>
              )}
            </div>
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
                      Recursos Fijados por el Docente
                    </span>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {pinnedResources.map((pin) => (
                        <a
                          key={pin.id}
                          href={pin.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#8052ff]/10 hover:bg-[#8052ff]/20 border border-[#8052ff]/30 text-xs text-white font-medium transition-colors"
                        >
                          <span className="truncate">{pin.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
                        </a>
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
          onClick={() => router.push('/home')}
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
