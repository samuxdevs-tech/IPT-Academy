'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Radio,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Home,
  Mic,
  Camera,
  CameraOff,
  User,
  ExternalLink,
  Film,
  Lock,
  Users,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { ref, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import { StudentLiveClassItem } from '@/services/liveStudentService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

function StudentLiveRoomContent() {
  const searchParams = useSearchParams();
  const classId = searchParams.get('id') || 'live_default_ipt';

  const { user } = useAuth();
  const {
    entitlements,
    liveBookings,
    openPricingModal,
    bookLiveSession,
    cancelLiveBooking,
  } = useSubscription();

  const [liveClass, setLiveClass] = useState<StudentLiveClassItem | null>(null);
  const [classStatus, setClassStatus] = useState<'scheduled' | 'in_progress' | 'completed'>(
    'scheduled'
  );
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [quorumRequired, setQuorumRequired] = useState<number>(3);
  const [bookedCount, setBookedCount] = useState<number>(2);
  const [maxCapacity, setMaxCapacity] = useState<number>(25);
  const [bookingMsg, setBookingMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [busyBooking, setBusyBooking] = useState(false);

  const [cameraActive] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceCheckPassed, setDeviceCheckPassed] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const currentBooking = useMemo(
    () =>
      liveBookings.find((b) => b.sessionId === classId && b.status === 'confirmed') || null,
    [liveBookings, classId]
  );

  // 1. Cargar datos de la clase desde la API / Firebase
  useEffect(() => {
    if (!classId) return;

    const sessionRef = ref(db, `liveSessions/${classId}`);
    onValue(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.status) setClassStatus(data.status);
        if (data.recordingUrl) setRecordingUrl(data.recordingUrl);
        if (typeof data.quorumRequired === 'number') setQuorumRequired(data.quorumRequired);
        if (typeof data.bookedCount === 'number') setBookedCount(data.bookedCount);
        if (typeof data.maxCapacity === 'number') setMaxCapacity(data.maxCapacity);
      }
    });

    const API_BASE =
      process.env.NEXT_PUBLIC_TASK_API_URL || 'https://ipt-course-api.samuxdevs.workers.dev';
    fetch(`${API_BASE}/api/live/classes/${classId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (json?.success && json.data) {
          setLiveClass(json.data);
          if (json.data.status) {
            setClassStatus(json.data.status);
          }
          if (json.data.recording_drive_url) {
            setRecordingUrl(json.data.recording_drive_url);
          }
        }
      })
      .catch(() => {});

    return () => {
      off(sessionRef);
    };
  }, [classId]);

  // 2. Test local de cámara y micrófono para la sala de espera
  useEffect(() => {
    if (classStatus === 'in_progress' || !entitlements.canJoinLiveClasses) {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
      return;
    }

    let isMounted = true;

    async function initMediaTest() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isMounted) {
          setMediaStream(stream);
          setDeviceCheckPassed(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch {
        // Dispositivos no disponibles en entorno sin cámara
      }
    }

    initMediaTest();

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [classStatus, entitlements.canJoinLiveClasses]);

  // 3. Handshake Instantáneo: Cuando el docente inicia la clase, montar Jitsi Meet
  useEffect(() => {
    if (
      classStatus !== 'in_progress' ||
      !liveClass ||
      !jitsiContainerRef.current ||
      !entitlements.canJoinLiveClasses
    ) {
      return;
    }

    const scriptId = 'jitsi-external-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initJitsiStudent = () => {
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }

      const domain = 'meet.jit.si';
      const options = {
        roomName: liveClass.jitsi_room_name,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName:
            user?.displayName || user?.email?.split('@')[0] || 'Estudiante IPT',
          email: user?.email || 'estudiante@ipt.com',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [
            'microphone',
            'camera',
            'chat',
            'raisehand',
            'fullscreen',
            'tileview',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      };

      jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsiStudent;
      document.body.appendChild(script);
    } else {
      initJitsiStudent();
    }

    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
      }
    };
  }, [classStatus, liveClass, user, entitlements.canJoinLiveClasses]);

  const embedPreviewUrl = useMemo(() => {
    if (!recordingUrl) return null;
    const match = recordingUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return recordingUrl;
  }, [recordingUrl]);

  const handleBookNow = async () => {
    setBookingMsg(null);
    setBusyBooking(true);
    try {
      const defaultFuture = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      await bookLiveSession(classId, {
        courseSlug: liveClass?.course_slug || 'general',
        teacherId: 'teacher_ipt',
        title: liveClass?.title || 'Sesión Técnica en Vivo',
        startTime: (liveClass as any)?.scheduled_at || defaultFuture,
        durationMinutes: liveClass?.duration_minutes || 60,
        quorumRequired,
        maxCapacity,
      });
      setBookedCount((c) => c + 1);
      setBookingMsg({
        type: 'ok',
        text: 'Tu cupo quedó confirmado. Se descontó 1 crédito de tu bolsa mensual.',
      });
    } catch (err: any) {
      setBookingMsg({
        type: 'err',
        text: err?.message || 'No se pudo reservar la sesión.',
      });
    } finally {
      setBusyBooking(false);
    }
  };

  const handleCancelNow = async () => {
    if (!currentBooking) return;
    setBookingMsg(null);
    setBusyBooking(true);
    try {
      await cancelLiveBooking(currentBooking.id);
      setBookedCount((c) => Math.max(0, c - 1));
      setBookingMsg({
        type: 'ok',
        text: 'Reserva cancelada con más de 4 horas de anticipación. Tu crédito fue reembolsado.',
      });
    } catch (err: any) {
      setBookingMsg({
        type: 'err',
        text: err?.message || 'No se pudo cancelar la reserva.',
      });
    } finally {
      setBusyBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#f5f5f7] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Barra superior de navegación */}
      <header className="h-14 bg-[#18181b] border-b border-neutral-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-neutral-700" />
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                classStatus === 'in_progress'
                  ? 'bg-emerald-500 animate-pulse'
                  : classStatus === 'completed'
                  ? 'bg-neutral-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-md">
              {liveClass?.title || 'Sala de Clase en Vivo'}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-800 text-neutral-300 rounded-md">
              {liveClass?.course_title || 'IPT Academy'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-300 font-medium">
              Quórum: {bookedCount} / {quorumRequired} mín. (Cupo máx. {maxCapacity})
            </span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-neutral-300 font-medium">
              Créditos disponibles: {entitlements.availableLiveCredits}
            </span>
          </div>
        </div>
      </header>

      {/* CONTENEDOR CENTRAL */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* COMPUERTA DE SUSCRIPCIÓN SI EL ESTUDIANTE NO TIENE PLAN PRO+ / YOUR PLAN */}
        {!entitlements.canJoinLiveClasses && classStatus !== 'completed' ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-radial from-neutral-900 via-[#0f0f12] to-black">
            <div className="w-full max-w-xl bg-[#1c1c1f] rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Las sesiones en vivo con docentes son exclusivas de Pro+ y Your Plan
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                Con el Plan Pro+ recibes 8 créditos mensuales para reservar mentorías y clases en vivo (y 1 crédito de cortesía durante tus 15 días de prueba gratuita), además de acceso completo a las grabaciones.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/"
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white"
                >
                  Volver al catálogo
                </Link>
                <button
                  type="button"
                  onClick={() => openPricingModal('pro_plus')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Activar Pro+ (15 días de prueba + 1 clase en vivo)</span>
                </button>
              </div>
            </div>
          </div>
        ) : classStatus === 'in_progress' ? (
          <div className="flex-1 w-full h-full bg-black relative">
            <div ref={jitsiContainerRef} className="w-full h-full" />
          </div>
        ) : classStatus === 'scheduled' ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-radial from-neutral-900 via-[#0f0f12] to-black">
            <div className="w-full max-w-2xl bg-[#1c1c1f] rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Estás en el lugar correcto • Conexión en tiempo real activa</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {liveClass?.title || 'Preparando tu clase en vivo...'}
                </h2>
                <p className="text-xs text-neutral-400 max-w-lg mx-auto mt-2">
                  Estamos esperando a que el docente titular inicie la sesión. En cuanto comience, tu pantalla se conectará automáticamente sin recargar la página.
                </p>
              </div>

              {/* Panel de Reserva con Créditos y Quórum */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    Estado de tu reserva y quórum de la sesión
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Inscritos: <strong className="text-white">{bookedCount}</strong> · Quórum mínimo:{' '}
                    <strong className="text-white">{quorumRequired}</strong> · Si no se alcanza el quórum 3 h antes, tu crédito se devuelve automáticamente.
                  </p>
                </div>

                <div className="shrink-0">
                  {currentBooking ? (
                    <button
                      type="button"
                      disabled={busyBooking}
                      onClick={handleCancelNow}
                      className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer"
                    >
                      Cancelar reserva (reembolso hasta 4 h antes)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyBooking || entitlements.availableLiveCredits <= 0}
                      onClick={handleBookNow}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 text-xs font-extrabold cursor-pointer"
                    >
                      Confirmar asistencia (1 crédito)
                    </button>
                  )}
                </div>
              </div>

              {bookingMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    bookingMsg.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {bookingMsg.text}
                </div>
              )}

              {/* Visor de Auto-Prueba de Cámara y Micrófono */}
              <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800/80 max-w-md mx-auto space-y-3">
                <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                  <span>Comprobación de Cámara y Micrófono</span>
                  {deviceCheckPassed ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Listo</span>
                    </span>
                  ) : (
                    <span className="text-amber-400">Verificando...</span>
                  )}
                </div>

                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                      <CameraOff className="w-8 h-8 text-neutral-500" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-3 pt-1">
                  <div className="flex items-center space-x-1 text-xs text-neutral-400">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Micrófono detectado</span>
                  </div>
                  <span className="text-neutral-700">•</span>
                  <div className="flex items-center space-x-1 text-xs text-neutral-400">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cámara lista</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-around gap-4 text-xs text-neutral-400">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    Docente:{' '}
                    <strong className="text-neutral-200">
                      {liveClass?.teacher_name || 'Profesor IPT'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    Duración:{' '}
                    <strong className="text-neutral-200">
                      {liveClass?.duration_minutes || 60} minutos
                    </strong>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Quórum y créditos protegidos</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0f0f12]">
            <div className="w-full max-w-3xl bg-[#1c1c1f] rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-300 flex items-center justify-center mx-auto">
                  <Film className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Esta clase ha finalizado
                </h2>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  {embedPreviewUrl
                    ? 'El docente ha publicado la grabación oficial. Puedes repasarla directamente aquí las veces que necesites.'
                    : 'La sesión en vivo ha terminado. Cuando el docente publique la grabación, aparecerá automáticamente en esta pantalla.'}
                </p>
              </div>

              {!entitlements.canJoinLiveClasses ? (
                <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 text-center space-y-3">
                  <p className="text-xs text-neutral-300">
                    Las grabaciones de sesiones en vivo están incluidas en el Plan Pro+ y Your Plan.
                  </p>
                  <button
                    type="button"
                    onClick={() => openPricingModal('pro_plus')}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold cursor-pointer"
                  >
                    Desbloquear Grabaciones con Pro+
                  </button>
                </div>
              ) : embedPreviewUrl ? (
                <div className="space-y-3">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-neutral-800 bg-black shadow-lg">
                    <iframe
                      src={embedPreviewUrl}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen"
                      title="Grabación de la Clase en Vivo"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 px-2">
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reproducción en alta definición disponible las 24 horas</span>
                    </span>
                    <a
                      href={recordingUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center space-x-1"
                    >
                      <span>Abrir en ventana completa</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
                  Esperando a que el docente vincule la grabación de la sesión...
                </div>
              )}

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-center">
                <Link
                  href="/"
                  className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Volver al Panel Principal
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentLiveRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center text-xs text-neutral-400">
          Cargando Sala de Clase en Vivo...
        </div>
      }
    >
      <StudentLiveRoomContent />
    </Suspense>
  );
}
