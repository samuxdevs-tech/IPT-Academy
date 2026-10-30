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
  Clock,
  ShieldCheck,
  Send,
  RotateCcw,
  BookOpen,
  Radio,
  Calendar,
  Eraser,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { AcademicFeatureGate } from '@/components/AcademicFeatureGate';
import { ref, onValue, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { LiveVirtualSession } from '@/types';

interface LiveChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  timestamp?: number;
}

interface StoredRecording {
  id: string;
  title: string;
  date: string;
  duration?: string;
  instructor?: string;
  videoUrl?: string;
}

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
    openPricingModal,
  } = useSubscription();

  const { liveSessions: rawLiveSessions } = useLms();
  const availableLiveSessions = useMemo<LiveVirtualSession[]>(() => {
    return Array.isArray(rawLiveSessions) ? rawLiveSessions : [];
  }, [rawLiveSessions]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Seleccionar la primera sesión real disponible si existe
  useEffect(() => {
    if (availableLiveSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(availableLiveSessions[0].id);
    }
  }, [availableLiveSessions, selectedSessionId]);

  const activeSession = useMemo<LiveVirtualSession | null>(() => {
    if (!availableLiveSessions.length) return null;
    return availableLiveSessions.find((s) => s.id === selectedSessionId) || availableLiveSessions[0];
  }, [availableLiveSessions, selectedSessionId]);

  const [activeStudioTab, setActiveStudioTab] = useState<'stream' | 'whiteboard' | 'recordings'>('stream');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Controles multimedia locales WebRTC del estudiante
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [camEnabled, setCamEnabled] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [attendanceSeconds, setAttendanceSeconds] = useState<number>(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Chat en tiempo real conectado a Firebase RTDB
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const currentRoomChatId = useMemo(() => {
    if (modeParam === '1on1') {
      return `chat_1on1_${user?.uid || 'guest'}`;
    }
    return activeSession?.id ? `chat_session_${activeSession.id}` : 'chat_general';
  }, [modeParam, user?.uid, activeSession?.id]);

  useEffect(() => {
    const chatRef = ref(db, `lms_live_chat/${currentRoomChatId}`);
    const unsub = onValue(
      chatRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list: LiveChatMessage[] = Object.keys(val).map((k) => ({
            id: k,
            sender: val[k].sender || 'Estudiante',
            text: val[k].text || '',
            time: val[k].time || '',
            timestamp: val[k].timestamp || 0,
          }));
          list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          setChatMessages(list);
        } else {
          setChatMessages([]);
        }
      },
      () => setChatMessages([])
    );
    return () => unsub();
  }, [currentRoomChatId]);

  // Grabaciones almacenadas en Firebase RTDB
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  useEffect(() => {
    const recRef = ref(db, 'lms_recordings');
    const unsub = onValue(
      recRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list: StoredRecording[] = Object.keys(val).map((k) => ({
            id: k,
            title: val[k].title || 'Clase grabada',
            date: val[k].date || '',
            duration: val[k].duration || '',
            instructor: val[k].instructor || 'Docente IPT',
            videoUrl: val[k].videoUrl,
          }));
          setRecordings(list);
        } else {
          setRecordings([]);
        }
      },
      () => setRecordings([])
    );
    return () => unsub();
  }, []);

  // Pizarra HTML5 Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#8052ff');

  // Contador de tiempo en sala
  useEffect(() => {
    const timer = setInterval(() => {
      setAttendanceSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Activar / Desactivar cámara real WebRTC
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
            video: { width: 640, height: 360 },
            audio: false,
          });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setCamEnabled(true);
        } else {
          alert('Tu navegador no cuenta con soporte para cámara WebRTC.');
        }
      } catch {
        alert('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
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

  // Funciones de la Pizarra
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeColor === '#000000' ? 16 : 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvasAsPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `apuntes-clase-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentPlanId = subscription?.planId || 'free';

  const daysUntilRenewal = useMemo(() => {
    if (!subscription) return 30;
    const targetIso = subscription.creditsResetAt || subscription.currentPeriodEnd;
    if (!targetIso) return 30;
    const diffMs = new Date(targetIso).getTime() - Date.now();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const formattedRenewalDate = useMemo(() => {
    if (!subscription) return '';
    const targetIso = subscription.creditsResetAt || subscription.currentPeriodEnd;
    if (!targetIso) return '';
    try {
      return new Date(targetIso).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return '';
    }
  }, [subscription]);

  // Reserva real de cupos
  const isBooked = useMemo(() => {
    if (!activeSession) return false;
    return (liveBookings || []).some(
      (b) => b.sessionId === activeSession.id && b.status === 'confirmed'
    );
  }, [activeSession, liveBookings]);

  const handleReserveSeat = async () => {
    if (!activeSession) return;
    if (entitlements.availableLiveCredits <= 0) {
      if (currentPlanId === 'free' || currentPlanId === 'pro') {
        setStatusMessage('No cuentas con créditos disponibles. Aumenta tu membresía a Plan Pro+ para reservar cupo.');
        openPricingModal('pro_plus');
      } else if (currentPlanId === 'pro_plus') {
        setStatusMessage(`Has consumido tus créditos de este ciclo. Se regenerarán en ${daysUntilRenewal} días o puedes aumentar a Your Plan.`);
        openPricingModal('your_plan');
      } else {
        setStatusMessage(`Has consumido tus créditos de este ciclo. Se regenerarán en ${daysUntilRenewal} días.`);
      }
      return;
    }
    try {
      await bookLiveSession(activeSession.id, {
        courseSlug: activeSession.courseSlug,
        teacherId: activeSession.instructorName || 'docente_ipt',
        title: activeSession.title,
        startTime: activeSession.startTimeUtc,
        durationMinutes: activeSession.durationMinutes || 60,
      });
      setStatusMessage(`Cupo reservado para "${activeSession.title}". Se descontó 1 crédito de tu bolsa.`);
    } catch (err: any) {
      setStatusMessage(err?.message || 'No se pudo completar la reserva.');
    }
  };

  const handleCancelSeat = async () => {
    if (!activeSession) return;
    const booking = (liveBookings || []).find(
      (b) => b.sessionId === activeSession.id && b.status === 'confirmed'
    );
    if (!booking) return;
    try {
      await cancelLiveBooking(booking.id);
      setStatusMessage(`Reserva cancelada con éxito. Tu crédito fue reintegrado a tu cuenta.`);
    } catch (err: any) {
      setStatusMessage(err?.message || 'No se pudo cancelar la reserva.');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const textToSend = chatInput.trim();
    setChatInput('');

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      await push(ref(db, `lms_live_chat/${currentRoomChatId}`), {
        sender: user?.displayName || 'Estudiante',
        text: textToSend,
        time: timeStr,
        timestamp: Date.now(),
      });
    } catch {
      // Local fallback si no hay conexión
      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: user?.displayName || 'Estudiante',
          text: textToSend,
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Barra Superior de Estado */}
        <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {modeParam === '1on1' ? 'Asesoría Individual 1 a 1' : 'Sala de Clases en Vivo'}
                </span>
              </span>
              <span className="text-xs font-mono text-[#9a9a9a]">
                Tiempo en sala: {formatTimer(attendanceSeconds)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              {modeParam === '1on1'
                ? 'Asesoría Individual 1 a 1 con el Docente'
                : activeSession?.title || 'Clase en Vivo'}
            </h1>
          </div>

          {/* Información de Créditos */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-[#000000] border border-[#15846e]/40 flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#15846e]" />
              <div>
                <span className="text-[#9a9a9a] block text-[10px]">
                  Tus créditos disponibles
                </span>
                <span className="font-semibold text-white">
                  {entitlements.availableLiveCredits} de {zeroSumAccounting.issuedCredits} créditos este mes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CASO 1: TIENE CRÉDITOS ACTIVOS (credits > 0) */}
        {entitlements.availableLiveCredits > 0 && (
          (currentPlanId === 'free' || currentPlanId === 'pro') && (
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-[#09090b] to-[#09090b] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Créditos Autorizados por Despacho de Rectoría
                </span>
                <p className="text-xs text-[#d1d5db]">
                  Cuentas con {entitlements.availableLiveCredits} crédito(s) activo(s) para reservar cupos y participar en sesiones en vivo y tutorías.
                </p>
              </div>
            </div>
          )
        )}

        {/* CASO 2: SIN CRÉDITOS (credits <= 0) - VALIDACIÓN POR PLAN */}
        {entitlements.availableLiveCredits <= 0 && (
          <>
            {/* Si es Free o Pro: Banner para aumentar de membresía a Plan Pro+ */}
            {(currentPlanId === 'free' || currentPlanId === 'pro') && (
              <div className="rounded-2xl border border-[#ffb829]/40 bg-gradient-to-r from-[#ffb829]/15 via-[#09090b] to-[#09090b] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ffb829]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Aumentar Membresía · Clases en Vivo y Tutorías 1 a 1</span>
                  </div>
                  <p className="text-xs text-[#d1d5db]">
                    No cuentas con créditos disponibles para clases en vivo. Actualiza a Plan Pro+ para recibir tus créditos mensuales de clase con los profesores y resolución de dudas en tiempo real.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openPricingModal('pro_plus')}
                    className="px-5 py-2.5 rounded-full bg-[#ffb829] hover:bg-[#e5a524] text-black text-xs font-bold cursor-pointer transition-colors shadow-[0_0_15px_rgba(255,184,41,0.3)]"
                  >
                    Aumentar a Plan Pro+
                  </button>
                </div>
              </div>
            )}

            {/* Si es Pro+: Avisar que espere N días para regenerar créditos o aumentar a Your Plan */}
            {currentPlanId === 'pro_plus' && (
              <div className="rounded-2xl border border-[#8052ff]/40 bg-gradient-to-r from-[#8052ff]/15 via-[#09090b] to-[#09090b] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a78bfa]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Créditos de Clase Consumidos · Plan Pro+</span>
                  </div>
                  <p className="text-xs text-[#d1d5db]">
                    Has utilizado tus créditos incluidos en este ciclo. Tus créditos se regenerarán automáticamente en <strong className="text-white font-semibold">{daysUntilRenewal} días</strong>{formattedRenewalDate ? ` (el ${formattedRenewalDate})` : ''}, o puedes aumentar a <strong className="text-[#a78bfa]">Your Plan</strong> para recibir 12 créditos mensuales y temario individual 1 a 1 a la medida.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openPricingModal('your_plan')}
                    className="px-5 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-bold cursor-pointer transition-colors shadow-[0_0_20px_rgba(128,82,255,0.4)]"
                  >
                    Aumentar a Your Plan
                  </button>
                </div>
              </div>
            )}

            {/* Si es Your Plan: Aviso de ciclo */}
            {currentPlanId === 'your_plan' && (
              <div className="rounded-2xl border border-[#15846e]/40 bg-gradient-to-r from-[#15846e]/15 via-[#09090b] to-[#09090b] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34d399]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Créditos del Ciclo Consumidos · Your Plan</span>
                  </div>
                  <p className="text-xs text-[#d1d5db]">
                    Has completado tus sesiones de este ciclo. Tu balance de 12 créditos se regenerará automáticamente en <strong className="text-white font-semibold">{daysUntilRenewal} días</strong>{formattedRenewalDate ? ` (el ${formattedRenewalDate})` : ''}.
                  </p>
                </div>
              </div>
            )}
          </>
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

        {/* Grid Principal: Video/Pizarra Izquierda (8 cols) + Chat y Agenda Derecha (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-5">
            {/* Pestañas de la Sala */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-2">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'stream', label: 'Videollamada en Vivo', icon: Video },
                  { id: 'whiteboard', label: 'Pizarra de Dibujo y Apuntes', icon: PenTool },
                  { id: 'recordings', label: 'Clases Grabadas Anteriores', icon: BookOpen },
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

            {/* PESTAÑA 1: VIDEOLLAMADA */}
            {activeStudioTab === 'stream' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="relative aspect-video bg-[#050507] flex flex-col justify-between p-6">
                  {/* Cabecera sobre video */}
                  <div className="flex items-center justify-between z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#ffffff]/15 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-medium text-white">
                        {activeSession?.instructorName || 'Docente IPT'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {handRaised && (
                        <span className="px-3 py-1 rounded-full bg-[#ffb829]/20 border border-[#ffb829]/50 text-[#ffb829] text-xs font-semibold flex items-center gap-1.5">
                          <Hand className="w-3.5 h-3.5" />
                          <span>Mano levantada</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estado Central de la Sala */}
                  <div className="my-auto max-w-xl mx-auto text-center space-y-3 z-10">
                    <h2 className="text-xl sm:text-2xl font-semibold text-white">
                      {activeSession?.title || 'Sala de Clases en Vivo'}
                    </h2>
                    <p className="text-xs text-[#bdbdbd] max-w-md mx-auto">
                      La videollamada se realiza directamente dentro de la plataforma. Puedes activar tu micrófono o cámara para participar en la clase.
                    </p>
                  </div>

                  {/* Ventana de cámara local del estudiante */}
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

                  {/* Controles de Videollamada */}
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
                            <VideoOff className="w-4 h-4 text-rose-400" />
                            <span>Activar Cámara</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setHandRaised((p) => !p)}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          handRaised
                            ? 'bg-[#ffb829] text-black font-bold'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        <Hand className="w-4 h-4" />
                        <span>{handRaised ? 'Bajar Mano' : 'Levantar la Mano'}</span>
                      </button>
                    </div>

                    {activeSession && (
                      <div>
                        {isBooked ? (
                          <button
                            type="button"
                            onClick={handleCancelSeat}
                            className="px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 cursor-pointer"
                          >
                            Cancelar Mi Reserva (+1 Crédito)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReserveSeat}
                            className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-xs font-semibold text-white cursor-pointer"
                          >
                            Reservar Cupo (1 Crédito)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: PIZARRA */}
            {activeStudioTab === 'whiteboard' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ffffff]/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9a9a9a]">Colores:</span>
                    {['#8052ff', '#15846e', '#ffb829', '#ffffff', '#ef4444'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setStrokeColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          strokeColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                        }`}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setStrokeColor('#000000')}
                      className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 border border-[#ffffff]/20 cursor-pointer ${
                        strokeColor === '#000000' ? 'bg-white text-black' : 'text-white'
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Borrador</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3.5 py-1.5 rounded-full border border-[#ffffff]/15 text-xs text-[#9a9a9a] hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadCanvasAsPng}
                      className="px-3.5 py-1.5 rounded-full bg-[#8052ff] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer hover:bg-[#6d3df5]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Guardar Apunte</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ffffff]/15 bg-black overflow-hidden flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={1000}
                    height={560}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full max-w-full aspect-video cursor-crosshair touch-none"
                  />
                </div>
              </div>
            )}

            {/* PESTAÑA 3: GRABACIONES ANTERIORES */}
            {activeStudioTab === 'recordings' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-4">
                <div className="border-b border-[#ffffff]/10 pb-3">
                  <h3 className="text-base font-semibold text-white">Grabaciones de Clases</h3>
                  <p className="text-xs text-[#9a9a9a]">
                    Accede a las sesiones pasadas para repasar el contenido explicado en clase.
                  </p>
                </div>

                {recordings.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-black border border-white/10 space-y-2">
                    <BookOpen className="w-8 h-8 text-[#9a9a9a] mx-auto opacity-40" />
                    <p className="text-xs text-[#9a9a9a]">
                      Aún no hay grabaciones de clases anteriores disponibles en este curso.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recordings.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-2xl bg-black border border-[#ffffff]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-white">{rec.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-[#9a9a9a]">
                            <span>{rec.instructor}</span>
                            <span>•</span>
                            <span>{rec.date}</span>
                            {rec.duration && (
                              <>
                                <span>•</span>
                                <span>{rec.duration}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {rec.videoUrl && (
                          <a
                            href={rec.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-full bg-[#8052ff] text-xs font-semibold text-white flex items-center gap-2 hover:bg-[#6d3df5]"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Ver Grabación</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Catálogo de Sesiones Programadas */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#ffffff]/10 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Próximas Clases Programadas</h3>
                  <p className="text-xs text-[#9a9a9a]">
                    Horarios publicados por el equipo docente para reservar tu cupo con anticipación.
                  </p>
                </div>
              </div>

              {availableLiveSessions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-black border border-white/10 space-y-2">
                  <Calendar className="w-8 h-8 text-[#9a9a9a] mx-auto opacity-40" />
                  <p className="text-xs text-[#9a9a9a]">
                    No hay clases en vivo programadas para esta semana. El docente anunciará los próximos horarios en el calendario del curso.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableLiveSessions.map((sess) => {
                    const isSelected = sess.id === activeSession?.id;
                    const sessionBooked = (liveBookings || []).some(
                      (b) => b.sessionId === sess.id && b.status === 'confirmed'
                    );

                    return (
                      <div
                        key={sess.id}
                        onClick={() => setSelectedSessionId(sess.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-black border-[#8052ff] shadow-[0_0_15px_rgba(128,82,255,0.2)]'
                            : 'bg-black/50 border-[#ffffff]/10 hover:border-[#ffffff]/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-white">{sess.title}</h4>
                          <p className="text-xs text-[#9a9a9a]">
                            {sess.instructorName} • {sess.durationMinutes} min
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sessionBooked ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-[#15846e]/20 border border-[#15846e]/40 text-xs font-semibold text-emerald-300">
                              Cupo Reservado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSessionId(sess.id);
                                handleReserveSeat();
                              }}
                              className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-xs font-semibold text-white cursor-pointer"
                            >
                              Reservar Cupo (1 Crédito)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha (4 cols): Chat en Vivo Real */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl flex flex-col h-[580px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#ffffff]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#8052ff]" />
                  <span className="text-xs font-semibold text-white">Chat de la Clase</span>
                </div>
                <span className="text-[11px] font-mono text-[#15846e]">En línea</span>
              </div>

              {/* Mensajes del chat */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <MessageSquare className="w-8 h-8 text-[#9a9a9a] opacity-30" />
                    <p className="text-xs text-[#9a9a9a] leading-relaxed">
                      No hay mensajes en este chat aún. Escribe aquí para participar o hacer una pregunta durante la clase.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{msg.sender}</span>
                        <span className="text-[10px] text-[#9a9a9a]">{msg.time}</span>
                      </div>
                      <p className="text-[#d1d5db] leading-relaxed">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Entrada de mensaje */}
              <form
                onSubmit={handleSendChat}
                className="p-3.5 border-t border-[#ffffff]/10 bg-[#000000] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu mensaje o pregunta..."
                  className="flex-1 px-3.5 py-2.5 rounded-full bg-[#09090b] border border-[#ffffff]/15 text-xs text-white placeholder:text-[#9a9a9a]/60 focus:outline-none focus:border-[#8052ff]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] disabled:opacity-40 text-white cursor-pointer"
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
          Cargando sala de clases...
        </div>
      }
    >
      <AcademicFeatureGate feature="live" minPlan="pro_plus">
        <StudentLiveRoomContent />
      </AcademicFeatureGate>
    </Suspense>
  );
}
