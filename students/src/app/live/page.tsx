'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Play,
  Users,
  MessageSquare,
  Hand,
  PenTool,
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
  Volume2,
  HelpCircle,
  Monitor,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { AcademicFeatureGate } from '@/components/AcademicFeatureGate';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { LiveVirtualSession } from '@/types';
import {
  WebRtcViewerSubscriber,
  HostLiveState,
  WhiteboardStroke,
} from '@/lib/liveClassWebRtc';

interface LiveChatMessage {
  id: string;
  sender: string;
  role?: 'teacher' | 'student';
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

interface ActiveLiveQuizData {
  active: boolean;
  sessionId?: string;
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
  launchedAt?: string;
}

function StudentLiveRoomContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    subscription,
    entitlements,
    bookLiveSession,
    cancelLiveBooking,
    liveBookings,
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

  // WebRTC Subscriber y Transmisión del Docente
  const [hostState, setHostState] = useState<HostLiveState | null>(null);
  const [isReceivingStream, setIsReceivingStream] = useState<boolean>(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const subscriberRef = useRef<WebRtcViewerSubscriber | null>(null);

  // Participación: Mano levantada y Asistencia
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [attendanceSeconds, setAttendanceSeconds] = useState<number>(0);

  // Chat en tiempo real conectado a Firebase RTDB
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Pizarra Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokeColor, setStrokeColor] = useState<string>('#8052ff');
  const [isDrawing, setIsDrawing] = useState(false);

  // Quiz en Vivo
  const [activeQuiz, setActiveQuiz] = useState<ActiveLiveQuizData | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Grabaciones Anteriores
  const [recordings] = useState<StoredRecording[]>([
    {
      id: 'rec-01',
      title: 'Taller Magistral: Interpretación de Aforos e Índice UGM',
      date: '24 de Octubre, 2026',
      duration: '52 min',
      instructor: 'Ing. Iván Samuel Pérez Torrenegra',
      videoUrl: 'https://academy.iptapps.com/videos/datagan-promo.mp4',
    },
    {
      id: 'rec-02',
      title: 'Cátedra en Vivo: Gobernanza de Lotes y Registros ICA',
      date: '17 de Octubre, 2026',
      duration: '45 min',
      instructor: 'Equipo Zootécnico DataGan',
      videoUrl: 'https://academy.iptapps.com/videos/datagan-promo.mp4',
    },
  ]);

  // 1. Conexión WebRTC de Espectador cuando hay una sesión seleccionada
  useEffect(() => {
    if (!selectedSessionId || !user) return;

    const studentUid = user.uid;
    const studentName = user.displayName || user.email?.split('@')[0] || 'Estudiante';

    const subscriber = new WebRtcViewerSubscriber(selectedSessionId, studentUid, studentName);
    subscriberRef.current = subscriber;

    subscriber.join({
      onStream: (stream) => {
        setIsReceivingStream(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onHostState: (state) => {
        setHostState(state);
        if (!state?.isLive) {
          setIsReceivingStream(false);
        }
      },
      onWhiteboardStroke: (stroke: WhiteboardStroke) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      },
      onWhiteboardClear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    });

    return () => {
      subscriber.leave();
      subscriberRef.current = null;
      setIsReceivingStream(false);
    };
  }, [selectedSessionId, user]);

  // 2. Escuchar Chat en Vivo en Firebase RTDB
  useEffect(() => {
    if (!selectedSessionId) return;
    const chatRef = ref(db, `live_rooms/${selectedSessionId}/chat`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: LiveChatMessage[] = Array.isArray(data)
          ? data.filter(Boolean)
          : Object.keys(data).map((k) => ({ id: k, ...data[k] }));
        setChatMessages(list);
      } else {
        setChatMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedSessionId]);

  // 3. Escuchar Quizzes en Vivo en RTDB
  useEffect(() => {
    const quizRef = ref(db, 'active_live_quiz');
    const unsubscribe = onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as ActiveLiveQuizData;
        if (val.active) {
          setActiveQuiz(val);
          setQuizSubmitted(false);
          setSelectedQuizOption(null);
        } else {
          setActiveQuiz(null);
        }
      } else {
        setActiveQuiz(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 4. Contador de Asistencia acumulada en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setAttendanceSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 5. Alternar Mano Levantada
  const toggleHandRaise = async () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (subscriberRef.current) {
      await subscriberRef.current.setHandRaised(nextState);
    }
  };

  // 6. Enviar Respuesta al Quiz en Vivo
  const handleSubmitQuiz = async () => {
    if (selectedQuizOption === null || !user) return;
    try {
      const studentName = user.displayName || user.email?.split('@')[0] || 'Estudiante';
      await set(ref(db, `active_live_quiz/responses/${user.uid}`), {
        studentName,
        optionIndex: selectedQuizOption,
        answeredAt: new Date().toISOString(),
      });
      setQuizSubmitted(true);
    } catch (err) {
      console.warn('Error enviando respuesta del quiz:', err);
    }
  };

  // 7. Enviar Mensaje al Chat de la Clase
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedSessionId) return;

    try {
      const chatRef = push(ref(db, `live_rooms/${selectedSessionId}/chat`));
      await set(chatRef, {
        sender: user?.displayName || user?.email?.split('@')[0] || 'Estudiante',
        role: 'student',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      });
      setChatInput('');
    } catch (err) {
      console.warn('Error enviando mensaje al chat:', err);
    }
  };

  // Funciones de la Pizarra de Apuntes
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    ctx.lineTo(x, y);
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
      } else {
        setStatusMessage('Has consumido tus créditos de este ciclo. Se regenerarán en tu próxima fecha de corte.');
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

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#8052ff] selection:text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#ffffff]/10">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Aula de Clases en Vivo
              </h1>
              {hostState?.isLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-600 text-white animate-pulse">
                  <Radio className="w-3.5 h-3.5 animate-ping" />
                  <span>TRANSMISIÓN EN DIRECTO</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ffffff]/10 text-[#9a9a9a]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>SALA EN ESPERA</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#9a9a9a] mt-1">
              Sesiones sincrónicas magistrales en directo con el docente, pizarra en tiempo real y quizzes interactivos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-[#09090b] border border-[#ffffff]/10 flex items-center gap-3 text-xs font-mono">
              <span className="text-[#9a9a9a]">Permanencia:</span>
              <span className="text-emerald-400 font-bold">{formatTimer(attendanceSeconds)}</span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-[#09090b] border border-[#ffffff]/10 flex items-center gap-2 text-xs">
              <span className="text-[#9a9a9a]">Cupos Disponibles:</span>
              <span className="font-bold text-[#8052ff]">{entitlements.availableLiveCredits}</span>
            </div>
          </div>
        </div>

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

        {/* Modal / Card Interactivo de Quiz en Vivo */}
        {activeQuiz && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-violet-950/80 via-black to-[#09090b] border-2 border-[#8052ff] shadow-2xl space-y-4 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8052ff] animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  Pregunta en Vivo del Profesor
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-600/30 text-violet-300 text-[11px] font-mono">
                Evaluación Instantánea
              </span>
            </div>

            <h3 className="text-base font-bold text-white">{activeQuiz.question}</h3>

            {!quizSubmitted ? (
              <div className="space-y-2">
                {activeQuiz.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedQuizOption(idx)}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      selectedQuizOption === idx
                        ? 'bg-[#8052ff] border-white text-white shadow-lg'
                        : 'bg-black/40 border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                    <span className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center text-[10px]">
                      {selectedQuizOption === idx && '✓'}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={selectedQuizOption === null}
                  className="w-full mt-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  Enviar Mi Respuesta al Profesor
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-300">¡Tu respuesta ha sido registrada con éxito!</p>
                <p className="text-[11px] text-zinc-400">El profesor compartirá los resultados en pantalla al cerrar la votación.</p>
              </div>
            )}
          </div>
        )}

        {/* Grid Principal: Video/Pizarra Izquierda (8 cols) + Chat Derecha (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-5">
            {/* Pestañas de la Sala */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-2">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'stream', label: 'Transmisión en Vivo', icon: Video },
                  { id: 'whiteboard', label: 'Pizarra de Apuntes', icon: PenTool },
                  { id: 'recordings', label: 'Grabaciones Anteriores', icon: BookOpen },
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

              {hostState?.isLive && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black border border-white/10 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-300">
                    Modo: {hostState.streamMode === 'screen' ? 'Pantalla Compartida' : hostState.streamMode === 'whiteboard' ? 'Pizarra Digital' : 'Cámara'}
                  </span>
                </div>
              )}
            </div>

            {/* PESTAÑA 1: VIDEOLLAMADA / STREAM MAGISTRAL */}
            {activeStudioTab === 'stream' && (
              <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="relative aspect-video bg-[#050507] flex flex-col justify-between overflow-hidden">
                  {/* Elemento de Video Remoto del Profesor */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    controls={false}
                    className={`w-full h-full object-contain ${isReceivingStream ? 'block' : 'hidden'}`}
                  />

                  {/* Estado si el profesor no está transmitiendo video aún */}
                  {!isReceivingStream && (
                    <div className="my-auto max-w-xl mx-auto text-center space-y-4 p-8 z-10">
                      <div className="w-16 h-16 rounded-3xl bg-violet-600/15 border border-violet-500/30 text-[#8052ff] flex items-center justify-center mx-auto shadow-lg shadow-violet-600/20">
                        <Video className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-white">
                          {activeSession?.title || 'Sala de Clases en Vivo'}
                        </h2>
                        <p className="text-xs text-[#9a9a9a] max-w-md mx-auto mt-2 leading-relaxed">
                          {hostState?.isLive
                            ? 'Conectando con la transmisión en directo del profesor...'
                            : 'La sala virtual está lista. El docente iniciará la transmisión en los horarios programados.'}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Profesor: {activeSession?.instructorName || 'Docente IPT'}</span>
                      </div>
                    </div>
                  )}

                  {/* Barra Flotante Superior */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-[#ffffff]/15 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-medium text-white">
                        {activeSession?.instructorName || 'Docente IPT'}
                      </span>
                    </div>

                    {handRaised && (
                      <span className="px-3 py-1 rounded-full bg-[#ffb829]/20 border border-[#ffb829]/50 text-[#ffb829] text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                        <Hand className="w-3.5 h-3.5" />
                        <span>Mano Levantada</span>
                      </span>
                    )}
                  </div>

                  {/* Controles de Participación Inferiores */}
                  <div className="z-10 flex flex-wrap items-center justify-between gap-4 p-4 border-t border-[#ffffff]/10 bg-black/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleHandRaise}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          handRaised
                            ? 'bg-[#ffb829] text-black font-bold shadow-lg'
                            : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-white'
                        }`}
                      >
                        <Hand className="w-4 h-4" />
                        <span>{handRaised ? 'Bajar la Mano' : 'Levantar la Mano'}</span>
                      </button>
                    </div>

                    {activeSession && (
                      <div className="flex items-center gap-2">
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
                            className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-xs font-semibold text-white cursor-pointer shadow-md shadow-[#8052ff]/30"
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

            {/* PESTAÑA 2: PIZARRA DE APUNTES Y DIBUJO */}
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
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl flex flex-col h-[580px] overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-[#ffffff]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#8052ff]" />
                  <span className="text-xs font-semibold text-white">Chat de la Clase</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">En vivo</span>
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
                      className={`p-3.5 rounded-2xl border space-y-1 text-xs ${
                        msg.role === 'teacher'
                          ? 'bg-violet-600/20 border-violet-500/40 text-white shadow-sm'
                          : 'bg-[#000000] border-[#ffffff]/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold ${msg.role === 'teacher' ? 'text-violet-300' : 'text-white'}`}>
                          {msg.sender} {msg.role === 'teacher' && '(Docente)'}
                        </span>
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
