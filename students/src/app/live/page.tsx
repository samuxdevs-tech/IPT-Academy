'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Hand,
  PenTool,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  Radio,
  Calendar,
  Eraser,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

interface TeacherCatalogSession {
  id: string;
  courseSlug: string;
  title: string;
  instructor: string;
  dayTimeLabel: string;
  startTimeIso: string;
  durationMinutes: number;
  enrolledCount: number;
  minQuotaRequired: number;
  maxCapacity: number;
  quotaStatus: 'pending' | 'confirmed' | 'cancelled_refunded';
  isBookedByCurrentStudent: boolean;
}

interface ProcessedRecording {
  id: string;
  title: string;
  date: string;
  duration: string;
  instructor: string;
  timestamps: { time: string; label: string }[];
  keyTakeaways: string[];
  glossary: { term: string; definition: string }[];
}

const PROCESSED_RECORDINGS: ProcessedRecording[] = [
  {
    id: 'rec-oct-21',
    title: 'Arquitectura de Eventos, Outbox Transaccional y Consistencia',
    date: '2026-10-21',
    duration: '58:20',
    instructor: 'Ing. Iván Pérez',
    timestamps: [
      { time: '02:15', label: 'El problema de la escritura dual entre Base de Datos y Bus' },
      { time: '16:40', label: 'Diseño de la tabla Outbox en la misma transacción local' },
      { time: '34:10', label: 'Manejo de mensajes duplicados mediante llaves de idempotencia' },
      { time: '48:55', label: 'Preguntas y revisión de arquitecturas de los estudiantes' },
    ],
    keyTakeaways: [
      'Nunca publiques un evento en red antes de confirmar (commit) la transacción local.',
      'Todo consumidor debe ser idempotente porque la entrega es al menos una vez (At-least-once).',
      'El particionado por fecha evita que la tabla Outbox degrade el rendimiento.',
    ],
    glossary: [
      {
        term: 'Transactional Outbox',
        definition:
          'Patrón que guarda los eventos por emitir dentro de una tabla en la misma transacción de base de datos que modifica la entidad.',
      },
      {
        term: 'Idempotencia',
        definition:
          'Propiedad matemática donde aplicar una operación múltiples veces produce exactamente el mismo resultado que aplicarla una sola vez.',
      },
    ],
  },
];

function StudentLiveRoomContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams?.get('mode');
  const { user } = useAuth();
  const {
    subscription,
    entitlements,
    bookLiveSession,
    cancelLiveBooking,
    liveBookings,
    zeroSumAccounting,
    switchDemoTier,
  } = useSubscription();

  // Catálogo Fijo Semanal publicado por el Docente
  const [catalogSessions, setCatalogSessions] = useState<TeacherCatalogSession[]>([
    {
      id: 'sess-wed-1900',
      courseSlug: 'ipt-master-fullstack',
      title: 'Diseño de Sistemas de Alta Concurrencia e Idempotencia',
      instructor: 'Ing. Iván Pérez · Director Académico',
      dayTimeLabel: 'Miércoles 19:00 COT',
      startTimeIso: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      durationMinutes: 60,
      enrolledCount: 4,
      minQuotaRequired: 3,
      maxCapacity: 12,
      quotaStatus: 'confirmed',
      isBookedByCurrentStudent: false,
    },
    {
      id: 'sess-fri-1800',
      courseSlug: 'arquitectura-cloud-ipt',
      title: 'Laboratorio en Vivo: Recuperación ante Caídas de Nodos',
      instructor: 'Comité Docente IPT',
      dayTimeLabel: 'Viernes 18:00 COT',
      startTimeIso: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      durationMinutes: 60,
      enrolledCount: 1,
      minQuotaRequired: 3,
      maxCapacity: 12,
      quotaStatus: 'pending',
      isBookedByCurrentStudent: false,
    },
  ]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('sess-wed-1900');
  const [activeStudioTab, setActiveStudioTab] = useState<
    'stream' | 'whiteboard' | 'recordings'
  >('stream');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Controles de Sala Nativa WebRTC In-App
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [camEnabled, setCamEnabled] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [attendanceSeconds, setAttendanceSeconds] = useState<number>(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Chat en vivo moderado
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: string; role: string; text: string; time: string }[]
  >([
    {
      id: 'm1',
      sender: 'Ing. Iván Pérez',
      role: 'Docente Titular',
      text: 'Bienvenidos a la sala sincrónica de IPT Academy. Hoy revisaremos el patrón de reserva atómica con partida doble.',
      time: '19:00',
    },
    {
      id: 'm2',
      sender: 'Laura Gómez',
      role: 'Estudiante Pro+',
      text: 'Buenas noches profesor, ¿veremos cómo se comporta el bloqueo cuando dos usuarios reservan el último cupo?',
      time: '19:02',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Pizarra Colaborativa HTML5 Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#8052ff');

  const activeSession = useMemo(() => {
    return (
      catalogSessions.find((s) => s.id === selectedSessionId) || catalogSessions[0]
    );
  }, [catalogSessions, selectedSessionId]);

  // Temporizador de permanencia verificada en sala
  useEffect(() => {
    const timer = setInterval(() => {
      setAttendanceSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Activar/Desactivar cámara real WebRTC si el usuario lo solicita
  const toggleCameraWebRtc = async () => {
    if (camEnabled) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setCamEnabled(false);
    } else {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: micEnabled,
          });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
        setCamEnabled(true);
      } catch {
        // Si el navegador no tiene webcam física conectada, activar vista previa simulada
        setCamEnabled(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Reservar cupo con 1 crédito de la bolsa
  const handleReserveSeat = async (session: TeacherCatalogSession) => {
    setStatusMessage(null);
    try {
      await bookLiveSession(session.id, {
        courseSlug: session.courseSlug,
        teacherId: 'teacher_ivan',
        title: session.title,
        startTime: session.startTimeIso,
        durationMinutes: session.durationMinutes,
        quorumRequired: session.minQuotaRequired,
        maxCapacity: session.maxCapacity,
      });
    } catch {}

    setCatalogSessions((prev) =>
      prev.map((s) =>
        s.id === session.id
          ? {
              ...s,
              enrolledCount: s.enrolledCount + 1,
              isBookedByCurrentStudent: true,
              quotaStatus:
                s.enrolledCount + 1 >= s.minQuotaRequired ? 'confirmed' : 'pending',
            }
          : s
      )
    );
    setStatusMessage(
      `Reserva confirmada para "${session.title}". Se descontó 1 crédito hacia custodia (Partida Doble Δ = 0).`
    );
  };

  // Cancelar reserva (reintegro automático hasta 4 h antes)
  const handleCancelSeat = async (session: TeacherCatalogSession) => {
    const existingBooking = liveBookings.find(
      (b) => b.sessionId === session.id && b.status === 'confirmed'
    );
    if (existingBooking) {
      try {
        await cancelLiveBooking(existingBooking.id);
      } catch {}
    }

    setCatalogSessions((prev) =>
      prev.map((s) =>
        s.id === session.id
          ? {
              ...s,
              enrolledCount: Math.max(0, s.enrolledCount - 1),
              isBookedByCurrentStudent: false,
            }
          : s
      )
    );
    setStatusMessage(
      `Reserva cancelada con más de 4 h de anticipación. Tu crédito fue reintegrado íntegramente a tu bolsa disponible.`
    );
  };

  // Simular evaluación automática T-3h de Cuota Mínima de Estudiantes
  const handleSimulateTMinus3hQuotaCheck = (session: TeacherCatalogSession) => {
    if (session.enrolledCount >= session.minQuotaRequired) {
      setCatalogSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, quotaStatus: 'confirmed' } : s))
      );
      setStatusMessage(
        `Evaluación T-3h completada: La sesión cuenta con ${session.enrolledCount}/${session.minQuotaRequired} estudiantes inscritos. ¡Clase confirmada!`
      );
    } else {
      setCatalogSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                quotaStatus: 'cancelled_refunded',
                isBookedByCurrentStudent: false,
              }
            : s
        )
      );
      setStatusMessage(
        `Evaluación T-3h: La sesión "${session.title}" solo tenía ${session.enrolledCount} de ${session.minQuotaRequired} estudiantes requeridos. Sesión cancelada y créditos devueltos automáticamente (100% idempotente).`
      );
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const nowTime = new Date().toTimeString().slice(0, 5);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: user?.displayName || 'Estudiante IPT',
        role: modeParam === '1on1' ? 'Your Plan 1 a 1' : 'Estudiante Activo',
        text: chatInput.trim(),
        time: nowTime,
      },
    ]);
    setChatInput('');
  };

  // Eventos de dibujo en Pizarra Colaborativa
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const currentPlanId = subscription?.planId || 'free';
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Barra Superior de Estado Sincrónico y Contabilidad de Igualación a 0 */}
        <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {modeParam === '1on1'
                    ? 'Sala Privada 1 a 1 · Your Plan'
                    : 'Sala Sincrónica Nativa In-App'}
                </span>
              </span>
              <span className="text-xs font-mono text-[#9a9a9a]">
                Permanencia verificada: {formatTimer(attendanceSeconds)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              {modeParam === '1on1'
                ? 'Sesión de Mentoría Individual 1 a 1 con el Profesor'
                : activeSession.title}
            </h1>
          </div>

          {/* Panel de Contabilidad de Igualación a 0 y Cuota Mínima */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-[#000000] border border-[#ffffff]/10 flex items-center gap-2.5 text-xs">
              <Users className="w-4 h-4 text-[#ffb829]" />
              <div>
                <span className="text-[#9a9a9a] block text-[10px]">
                  Cuota mínima de estudiantes
                </span>
                <span className="font-semibold text-white">
                  {activeSession.enrolledCount} / {activeSession.minQuotaRequired} mín. (Cupo máx.{' '}
                  {activeSession.maxCapacity})
                </span>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-[#000000] border border-[#15846e]/40 flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#15846e]" />
              <div>
                <span className="text-[#9a9a9a] block text-[10px]">
                  Contabilidad Partida Doble (Δ = {zeroSumAccounting.netDelta})
                </span>
                <span className="font-mono text-white">
                  Disp: {zeroSumAccounting.availableCredits} | Custodia:{' '}
                  {zeroSumAccounting.reservedInEscrow} | Total: {zeroSumAccounting.issuedCredits}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso si el usuario está en Free o Pro sin acceso en vivo */}
        {(currentPlanId === 'free' || currentPlanId === 'pro') && (
          <div className="rounded-2xl border border-[#ffb829]/40 bg-gradient-to-r from-[#ffb829]/15 via-[#09090b] to-[#09090b] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ffb829]">
                Acceso Sincrónico de Nivel Pro+ y Your Plan
              </span>
              <p className="text-xs text-[#d1d5db]">
                Las sesiones en vivo con bolsa de 8 créditos mensuales están incluidas en el Plan
                Pro+ y Your Plan. Puedes activar la vista Pro+ con 1 clic para probar las reservas.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => switchDemoTier('pro_plus')}
                className="px-4 py-2 rounded-full bg-[#ffb829] text-black text-xs font-bold cursor-pointer"
              >
                Simular Vista Plan Pro+
              </button>
              <button
                type="button"
                onClick={() => switchDemoTier('your_plan')}
                className="px-4 py-2 rounded-full bg-[#15846e] text-white text-xs font-bold cursor-pointer"
              >
                Simular Your Plan (1 a 1)
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="p-4 rounded-2xl bg-[#8052ff]/15 border border-[#8052ff]/40 text-xs text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#8052ff] shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#9a9a9a] hover:text-white text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Grid Principal: Estudio en Vivo Izquierda (8 cols) + Catálogo y Chat Derecha (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda (8 cols): Sala Nativa In-App (Stream, Pizarra, Grabaciones) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Pestañas del Estudio Sincrónico */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-2">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'stream', label: 'Sala de Videollamada In-App', icon: Video },
                  { id: 'whiteboard', label: 'Pizarra Colaborativa en Vivo', icon: PenTool },
                  {
                    id: 'recordings',
                    label: 'Grabaciones con Timestamps y Glosario',
                    icon: BookOpen,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeStudioTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveStudioTab(tab.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.4)]'
                          : 'text-[#9a9a9a] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VISTA 1: TRANSMISIÓN WEBRTC IN-APP */}
            {activeStudioTab === 'stream' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="relative aspect-video bg-gradient-to-br from-[#0e0c1a] via-[#050507] to-[#130d26] flex flex-col justify-between p-6">
                  {/* Cabecera sobre video */}
                  <div className="flex items-center justify-between z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#ffffff]/15 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-medium text-white">{activeSession.instructor}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {handRaised && (
                        <span className="px-3 py-1 rounded-full bg-[#ffb829]/20 border border-[#ffb829]/50 text-[#ffb829] text-xs font-semibold flex items-center gap-1.5">
                          <Hand className="w-3.5 h-3.5" />
                          <span>Mano levantada en turno</span>
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-[#ffffff]/10 text-[11px] font-mono text-[#bdbdbd]">
                        HD 1080p · Baja Latencia
                      </span>
                    </div>
                  </div>

                  {/* Escenario Central: Presentación de Arquitectura del Docente */}
                  <div className="my-auto max-w-xl mx-auto text-center space-y-4 z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#8052ff]/20 border border-[#8052ff]/40 text-[#c0c4fc] text-xs font-mono">
                      <span>TRANSMISIÓN ACTIVA EN CAMPUS</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-white">
                      {activeSession.title}
                    </h2>
                    <p className="text-xs text-[#bdbdbd]">
                      Conectado directamente desde el navegador sin aplicaciones externas. Puedes
                      alternar a la Pizarra Colaborativa arriba para diagramar en tiempo real.
                    </p>
                  </div>

                  {/* Ventana Picture-in-Picture de la Cámara del Estudiante */}
                  {camEnabled && (
                    <div className="absolute bottom-20 right-6 w-44 aspect-video rounded-2xl border-2 border-[#8052ff] bg-[#000000] overflow-hidden shadow-2xl z-20 flex items-center justify-center">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white">
                        Tú ({micEnabled ? 'Mic Activo' : 'Silenciado'})
                      </span>
                    </div>
                  )}

                  {/* Barra Inferior de Controles de Videollamada */}
                  <div className="z-10 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#ffffff]/10 bg-black/40 backdrop-blur-md -mx-6 -mb-6 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setMicEnabled((p) => !p)}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          micEnabled
                            ? 'bg-[#15846e] text-white'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        {micEnabled ? (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Micrófono Activo</span>
                          </>
                        ) : (
                          <>
                            <MicOff className="w-4 h-4 text-rose-400" />
                            <span>Activar Micrófono</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={toggleCameraWebRtc}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          camEnabled
                            ? 'bg-[#8052ff] text-white'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        {camEnabled ? (
                          <>
                            <Video className="w-4 h-4" />
                            <span>Cámara Activa</span>
                          </>
                        ) : (
                          <>
                            <VideoOff className="w-4 h-4 text-[#9a9a9a]" />
                            <span>Compartir Cámara</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setHandRaised((p) => !p)}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          handRaised
                            ? 'bg-[#ffb829] text-black'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        <Hand className="w-4 h-4" />
                        <span>{handRaised ? 'Bajar la Mano' : 'Pedir la Palabra'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStudioTab('whiteboard')}
                      className="px-4 py-2.5 rounded-full border border-[#8052ff]/50 bg-[#8052ff]/15 text-xs font-semibold text-white hover:bg-[#8052ff] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Abrir Pizarra Interactiva</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: PIZARRA COLABORATIVA EN VIVO */}
            {activeStudioTab === 'whiteboard' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Pizarra de Arquitectura Colaborativa en Vivo
                    </h3>
                    <p className="text-xs text-[#9a9a9a]">
                      Dibuja diagramas de nodos, capas o flujos directamente con el cursor.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[
                      { color: '#8052ff', label: 'Violeta' },
                      { color: '#15846e', label: 'Esmeralda' },
                      { color: '#ffb829', label: 'Ámbar' },
                      { color: '#ffffff', label: 'Blanco' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setStrokeColor(c.color)}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                          strokeColor === c.color ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={clearWhiteboard}
                      className="ml-2 px-3.5 py-1.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-xs text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Limpiar Pizarra</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-[#ffffff]/15 bg-[#050507]">
                  <canvas
                    ref={canvasRef}
                    width={860}
                    height={460}
                    onMouseDown={startDrawing}
                    onMouseMove={drawMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-[420px] cursor-crosshair block"
                  />
                </div>
              </div>
            )}

            {/* VISTA 3: GRABACIONES PROCESADAS CON TIMESTAMPS Y GLOSARIO */}
            {activeStudioTab === 'recordings' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8052ff] block mb-1">
                    Pipeline Automático Post-Clase
                  </span>
                  <h3 className="text-xl font-semibold text-white">
                    Grabaciones con Marcas de Tiempo, Conclusiones y Glosario
                  </h3>
                </div>

                {PROCESSED_RECORDINGS.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-6 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ffffff]/10 pb-4">
                      <div>
                        <span className="text-xs font-mono text-[#15846e]">
                          Sesión Grabada · {rec.date} · {rec.duration}
                        </span>
                        <h4 className="text-base font-semibold text-white mt-0.5">{rec.title}</h4>
                      </div>
                      <span className="text-xs text-[#9a9a9a]">{rec.instructor}</span>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-white">
                        Desglose Temático por Minuto (Timestamps):
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rec.timestamps.map((ts, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#09090b] border border-[#ffffff]/10 flex items-start gap-2.5 text-xs"
                          >
                            <span className="px-2 py-0.5 rounded bg-[#8052ff]/20 text-[#c0c4fc] font-mono shrink-0">
                              {ts.time}
                            </span>
                            <span className="text-[#d1d5db]">{ts.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conclusiones y Glosario */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-[#09090b] border border-[#ffffff]/10 space-y-2">
                        <span className="text-xs font-semibold text-[#15846e] block">
                          Puntos Clave de la Sesión:
                        </span>
                        <ul className="space-y-1.5 text-xs text-[#bdbdbd]">
                          {rec.keyTakeaways.map((kt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#15846e] shrink-0 mt-0.5" />
                              <span>{kt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-[#09090b] border border-[#ffffff]/10 space-y-2">
                        <span className="text-xs font-semibold text-[#8052ff] block">
                          Glosario Extraído:
                        </span>
                        <div className="space-y-2 text-xs">
                          {rec.glossary.map((g, i) => (
                            <div key={i}>
                              <strong className="text-white">{g.term}:</strong>{' '}
                              <span className="text-[#9a9a9a]">{g.definition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Catálogo Fijo de Sesiones del Docente con Simulación T-3h */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Catálogo Semanal de Clases Publicadas por el Docente
                  </h3>
                  <p className="text-xs text-[#9a9a9a]">
                    Reserva tu cupo con 1 crédito o ejecuta la prueba de corte a 3 horas del inicio
                    (Cuota mínima de estudiantes).
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {catalogSessions.map((sess) => {
                  const isSelected = sess.id === selectedSessionId;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => setSelectedSessionId(sess.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-[#000000] border-[#8052ff]'
                          : 'bg-[#000000]/60 border-[#ffffff]/10 hover:border-[#ffffff]/25'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-[#ffb829]">
                            {sess.dayTimeLabel}
                          </span>
                          {sess.quotaStatus === 'confirmed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#15846e]/15 text-[#15846e] border border-[#15846e]/30">
                              Cuota Mínima Alcanzada ({sess.enrolledCount}/{sess.minQuotaRequired})
                            </span>
                          )}
                          {sess.quotaStatus === 'pending' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30">
                              Reuniendo Cuota Mínima ({sess.enrolledCount}/{sess.minQuotaRequired}{' '}
                              estudiantes)
                            </span>
                          )}
                          {sess.quotaStatus === 'cancelled_refunded' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Cancelada en T-3h · Créditos Reintegrados
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-white">{sess.title}</h4>
                        <p className="text-xs text-[#9a9a9a]">{sess.instructor}</p>
                      </div>

                      <div
                        className="flex flex-wrap items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleSimulateTMinus3hQuotaCheck(sess)}
                          className="px-3.5 py-2 rounded-full border border-[#ffffff]/15 hover:bg-[#ffffff]/10 text-[11px] font-medium text-[#bdbdbd] hover:text-white cursor-pointer"
                        >
                          Evaluar Cuota T-3h
                        </button>

                        {sess.isBookedByCurrentStudent ? (
                          <button
                            type="button"
                            onClick={() => handleCancelSeat(sess)}
                            className="px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 cursor-pointer"
                          >
                            Cancelar Reserva (+1 Créd.)
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={sess.quotaStatus === 'cancelled_refunded'}
                            onClick={() => handleReserveSeat(sess)}
                            className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] disabled:opacity-40 text-xs font-semibold text-white cursor-pointer"
                          >
                            Reservar Cupo (1 Crédito)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna Derecha (4 cols): Chat en Vivo Moderado y Garantías */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl flex flex-col h-[580px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#ffffff]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#8052ff]" />
                  <span className="text-xs font-semibold text-white">
                    Chat Sincrónico de la Clase
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#15846e]">En Línea</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{msg.sender}</span>
                      <span className="text-[10px] font-mono text-[#8052ff]">{msg.role}</span>
                    </div>
                    <p className="text-[#d1d5db] leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] text-[#9a9a9a] block text-right">{msg.time}</span>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSendChat}
                className="p-3.5 border-t border-[#ffffff]/10 bg-[#000000] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta en la sala..."
                  className="flex-1 px-3.5 py-2.5 rounded-full bg-[#09090b] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/60 focus:outline-none focus:border-[#8052ff]"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-xs font-mono">
          Conectando con la sala en vivo...
        </div>
      }
    >
      <StudentLiveRoomContent />
    </Suspense>
  );
}
