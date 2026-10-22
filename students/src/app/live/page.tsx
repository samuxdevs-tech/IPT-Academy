'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Home,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  User,
  BookOpen,
  Calendar,
  ExternalLink,
  RotateCcw,
  Play,
  Film,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { LiveStudentService, StudentLiveClassItem } from '@/services/liveStudentService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

function StudentLiveRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('id');

  const { user } = useAuth();

  const [liveClass, setLiveClass] = useState<StudentLiveClassItem | null>(null);
  const [classStatus, setClassStatus] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  
  // Test local de audio y video
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceCheckPassed, setDeviceCheckPassed] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // 1. Cargar datos de la clase desde la API / Firebase
  useEffect(() => {
    if (!classId) return;

    // Escuchar estado en tiempo real en Firebase Realtime Database
    const sessionRef = ref(db, `liveSessions/${classId}`);
    const unsubscribe = onValue(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.status) {
          setClassStatus(data.status);
        }
        if (data.recordingUrl) {
          setRecordingUrl(data.recordingUrl);
        }
      }
    });

    // Cargar detalles de la clase
    const API_BASE = process.env.NEXT_PUBLIC_TASK_API_URL || 'https://ipt-course-api.samuxdevs.workers.dev';
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
      .catch((err) => {
        console.warn('Error fetching class details:', err);
      });

    return () => {
      off(sessionRef);
    };
  }, [classId]);

  // 2. Test local de cámara y micrófono para la sala de espera
  useEffect(() => {
    if (classStatus === 'in_progress') {
      // Liberar cámara local si la clase ya inició para que Jitsi tome el control
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
      } catch (err) {
        console.warn('No se pudo acceder a dispositivos locales:', err);
      }
    }

    initMediaTest();

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [classStatus]);

  // 3. Handshake Instantáneo: Cuando el docente da "Start", montar Jitsi Meet
  useEffect(() => {
    if (classStatus !== 'in_progress' || !liveClass || !jitsiContainerRef.current) {
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
          displayName: user?.displayName || user?.email?.split('@')[0] || 'Estudiante IPT',
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
  }, [classStatus, liveClass, user]);

  // Convertir URL de Google Drive a /preview embebido ($0 R2)
  const embedPreviewUrl = useMemo(() => {
    if (!recordingUrl) return null;
    const match = recordingUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return recordingUrl;
  }, [recordingUrl]);

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
              {liveClass?.course_title || 'IPT Course'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-neutral-300 font-medium">
              {classStatus === 'in_progress'
                ? 'Sesión en Vivo'
                : classStatus === 'completed'
                ? 'Clase Finalizada'
                : 'Sala de Espera Conectada'}
            </span>
          </div>
        </div>
      </header>

      {/* CONTENEDOR CENTRAL */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* 1. ESTADO: EN CURSO (IN_PROGRESS) => JITSI MEET ACTIVO */}
        {classStatus === 'in_progress' && (
          <div className="flex-1 w-full h-full bg-black relative">
            <div ref={jitsiContainerRef} className="w-full h-full" />
          </div>
        )}

        {/* 2. ESTADO: SALA DE ESPERA REACTIVA (SCHEDULED / WAITING) */}
        {classStatus === 'scheduled' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-radial from-neutral-900 via-[#0f0f12] to-black">
            <div className="w-full max-w-2xl bg-[#1c1c1f] rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
              
              {/* Badge Dinámico de Sala de Espera */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Estás en el lugar correcto • Conexión en tiempo real activa</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {liveClass?.title || 'Preparando tu clase en vivo...'}
                </h2>
                <p className="text-xs text-neutral-400 max-w-lg mx-auto mt-2">
                  Estamos esperando a que el docente titular inicie la sesión en su panel. En el milisegundo en que presione <strong className="text-white">"Start"</strong>, tu pantalla se conectará automáticamente sin que tengas que recargar la página.
                </p>
              </div>

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

              {/* Información de la Clase */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-around gap-4 text-xs text-neutral-400">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Docente: <strong className="text-neutral-200">{liveClass?.teacher_name || 'Profesor'}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Duración: <strong className="text-neutral-200">{liveClass?.duration_minutes || 60} minutos</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cupo Mensual Asegurado</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. ESTADO: CLASE FINALIZADA & REPRODUCTOR EMBEBIDO GOOGLE DRIVE ($0 R2) */}
        {classStatus === 'completed' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0f0f12]">
            <div className="w-full max-w-3xl bg-[#1c1c1f] rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-6">
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-300 flex items-center justify-center mx-auto">
                  <Film className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Esta clase ha finalizado</h2>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  {embedPreviewUrl
                    ? 'El docente ha publicado la grabación oficial en su Google Drive. Puedes repasarla directamente aquí sin límites de tiempo.'
                    : 'La sesión en vivo ha terminado. Si el docente sube la grabación, aparecerá automáticamente en esta pantalla.'}
                </p>
              </div>

              {/* Visor Embebido de Grabación de Google Drive */}
              {embedPreviewUrl ? (
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
                      <span>Transmisión fluida desde Google Drive • $0 costo para IPT</span>
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
