'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Radio,
  BookOpen,
  FileCheck2,
  Users,
  FileText,
  Clock,
  Play,
  Square,
  ChevronRight,
  ChevronLeft,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Home,
  Mic,
  MicOff,
  VideoOff,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import { ref, get, set, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import { LiveClassesService, LiveClassItem, ClassBookingItem } from '@/services/liveClassesService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

function TeacherLiveStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get('id');

  const { user } = useAuth();
  const { courses, assignments } = useLms();

  const [liveClass, setLiveClass] = useState<LiveClassItem | null>(null);
  const [bookings, setBookings] = useState<ClassBookingItem[]>([]);
  const [classStatus, setClassStatus] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');
  const [activeSideTab, setActiveSideTab] = useState<'lessons' | 'assignments' | 'students' | 'notes'>('lessons');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  
  // Notas rápidas
  const [quickNotes, setQuickNotes] = useState('');
  
  // Temporizador de sesión
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Grabación en Google Drive Modal
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [savingRecording, setSavingRecording] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // 1. Cargar datos de la clase desde la API / Cache
  useEffect(() => {
    if (!classId) return;

    LiveClassesService.fetchClassDetails(classId).then((res) => {
      if (res?.classItem) {
        setLiveClass(res.classItem);
        setBookings(res.bookings || []);
      }
    });

    // Escuchar estado en tiempo real en Firebase para sincronización con alumnos
    const statusRef = ref(db, `liveSessions/${classId}/status`);
    const unsubscribe = onValue(statusRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setClassStatus(val);
        if (val === 'in_progress') {
          setIsTimerRunning(true);
        } else if (val === 'completed') {
          setIsTimerRunning(false);
        }
      }
    });

    return () => {
      off(statusRef);
    };
  }, [classId]);

  // 2. Temporizador de clase
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // 3. Inicializar Jitsi Meet Script y Sala
  useEffect(() => {
    if (!liveClass || !jitsiContainerRef.current) return;

    const scriptId = 'jitsi-external-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initJitsi = () => {
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

      // Limpiar instancia previa si existe
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
          displayName: user?.displayName || 'Docente Titular',
          email: user?.email || 'docente@ipt.com',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'chat',
            'raisehand',
            'videoquality',
            'filmstrip',
            'tileview',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Estudiante',
        },
      };

      jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
      }
    };
  }, [liveClass, user]);

  // Iniciar la clase (Start)
  const handleStartClass = async () => {
    if (!classId) return;
    try {
      await set(ref(db, `liveSessions/${classId}/status`), 'in_progress');
      await set(ref(db, `liveSessions/${classId}/startedAt`), new Date().toISOString());
      setClassStatus('in_progress');
      setIsTimerRunning(true);
    } catch (err) {
      console.warn('Error iniciando clase:', err);
    }
  };

  // Finalizar la clase
  const handleEndClass = async () => {
    if (!classId) return;
    const confirm = window.confirm('¿Deseas finalizar la sesión en vivo para todos los estudiantes?');
    if (!confirm) return;

    try {
      await set(ref(db, `liveSessions/${classId}/status`), 'completed');
      await set(ref(db, `liveSessions/${classId}/endedAt`), new Date().toISOString());
      setClassStatus('completed');
      setIsTimerRunning(false);
      setShowRecordingModal(true);
    } catch (err) {
      console.warn('Error finalizando clase:', err);
    }
  };

  // Guardar enlace de Google Drive
  const handleSaveRecordingUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !recordingUrl.trim()) return;

    setSavingRecording(true);
    try {
      // Guardar en Firebase para que los alumnos lo vean de inmediato
      await set(ref(db, `liveSessions/${classId}/recordingUrl`), recordingUrl.trim());
      alert('Enlace de grabación guardado con éxito. Los estudiantes ya tienen acceso desde su portal.');
      setShowRecordingModal(false);
    } catch (err) {
      alert('Error guardando grabación.');
    } finally {
      setSavingRecording(false);
    }
  };

  const currentCourse = courses.find((c) => c.slug === liveClass?.course_slug) || courses[0];
  const courseAssignments = assignments.filter((a) => a.courseSlug === liveClass?.course_slug);

  return (
    <div className="flex flex-col h-screen bg-[#111113] text-[#f5f5f7] overflow-hidden select-none">
      
      {/* 1. BARRA SUPERIOR DE CONTROL (ESTUDIO DOCENTE) */}
      <header className="h-14 bg-[#1c1c1e] border-b border-neutral-800 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-neutral-700" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-md">
                {liveClass?.title || 'Sala de Clase en Vivo'}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-800 text-neutral-300 rounded-md">
                {liveClass?.course_title || 'IPT Course'}
              </span>
            </div>
          </div>
        </div>

        {/* Cronómetro y Controles Maestros de Estado */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 border border-neutral-700 rounded-xl text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span className={isTimerRunning ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
              {formattedTimer}
            </span>
          </div>

          {classStatus !== 'in_progress' ? (
            <button
              onClick={handleStartClass}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Clase (Start)</span>
            </button>
          ) : (
            <button
              onClick={handleEndClass}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finalizar Clase</span>
            </button>
          )}

          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              isSidePanelOpen
                ? 'bg-neutral-800 border-neutral-600 text-white'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span>Material a la Mano</span>
            {isSidePanelOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. LAYOUT DIVIDIDO APPLE STUDIO */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ÁREA DE VIDEOLLAMADA (JITSI MEET EMBEBIDO $0) */}
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
          <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>

        {/* 3. PANEL LATERAL PLEGABLE: "MATERIAL A LA MANO" */}
        {isSidePanelOpen && (
          <aside className="w-80 sm:w-96 bg-[#1c1c1e] border-l border-neutral-800 flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            
            {/* Pestañas del Panel Lateral */}
            <div className="p-2 border-b border-neutral-800 flex items-center space-x-1 bg-neutral-900/60">
              <button
                onClick={() => setActiveSideTab('lessons')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                  activeSideTab === 'lessons'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lecciones</span>
              </button>

              <button
                onClick={() => setActiveSideTab('assignments')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                  activeSideTab === 'assignments'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Tareas</span>
              </button>

              <button
                onClick={() => setActiveSideTab('students')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 relative ${
                  activeSideTab === 'students'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Alumnos ({bookings.filter((b) => b.status === 'confirmed').length})</span>
              </button>

              <button
                onClick={() => setActiveSideTab('notes')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                  activeSideTab === 'notes'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notas</span>
              </button>
            </div>

            {/* Contenido de la pestaña activa */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* TAB 1: LECCIONES Y DIAPOSITIVAS DEL CURSO */}
              {activeSideTab === 'lessons' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {currentCourse?.title || 'Contenido del Curso'}
                  </div>
                  
                  {currentCourse?.modules?.length ? (
                    currentCourse.modules.map((m, mIdx) => (
                      <div key={m.id || mIdx} className="bg-neutral-900 rounded-xl p-3 border border-neutral-800">
                        <h4 className="text-xs font-bold text-neutral-200 mb-2">{m.title}</h4>
                        <div className="space-y-1.5">
                          {m.lessons?.map((l, lIdx) => (
                            <div
                              key={l.id || lIdx}
                              className="p-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                            >
                              <div className="truncate pr-2">
                                <span className="font-medium text-neutral-300 block truncate">{l.title}</span>
                                <span className="text-[10px] text-neutral-500">{l.duration || '10 min'}</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      No hay lecciones registradas para este curso.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TAREAS PARA PROYECTAR / LANZAR EN VIVO */}
              {activeSideTab === 'assignments' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Ejercicios y Evaluaciones del Curso
                  </div>

                  {courseAssignments.length ? (
                    courseAssignments.map((a) => (
                      <div key={a.id} className="bg-neutral-900 rounded-xl p-3.5 border border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-200">{a.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                            {a.weightInCutPercent || 20}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2">{a.instructions}</p>
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (jitsiApiRef.current) {
                                jitsiApiRef.current.executeCommand(
                                  'sendEndpointTextMessage',
                                  '',
                                  `Ejercicio en vivo: ${a.title}`
                                );
                                alert(`Ejercicio "${a.title}" proyectado al chat de la sala.`);
                              }
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Proyectar en el chat</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      No hay tareas registradas para este curso.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASISTENCIA Y PARTICIPANTES EN SALA */}
              {activeSideTab === 'students' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                    <span>Inscritos Confirmados</span>
                    <span className="text-emerald-400">
                      {bookings.filter((b) => b.status === 'confirmed').length} alumnos
                    </span>
                  </div>

                  {bookings.filter((b) => b.status === 'confirmed').length ? (
                    bookings
                      .filter((b) => b.status === 'confirmed')
                      .map((b) => (
                        <div
                          key={b.id}
                          className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center justify-between"
                        >
                          <div className="truncate">
                            <span className="text-xs font-bold text-neutral-200 block truncate">{b.student_name}</span>
                            <span className="text-[11px] text-neutral-500 truncate block">{b.student_email}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md">
                              Presente
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      Aún no hay estudiantes con cupo confirmado en esta clase.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BLOC DE NOTAS RÁPIDAS DEL DOCENTE */}
              {activeSideTab === 'notes' && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Apuntes de la Sesión
                  </div>
                  <textarea
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder="Escribe notas, dudas de estudiantes o puntos a repasar en la siguiente clase..."
                    className="flex-1 w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 resize-none"
                    rows={12}
                  />
                  <span className="text-[10px] text-neutral-500">
                    Tus notas se preservan localmente durante la sesión.
                  </span>
                </div>
              )}

            </div>
          </aside>
        )}
      </div>

      {/* MODAL POST-CLASE: VINCULACIÓN DE GRABACIÓN EN GOOGLE DRIVE */}
      {showRecordingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1c1c1e] border border-neutral-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Clase Finalizada con Éxito</h3>
                <p className="text-xs text-neutral-400">Vincula la grabación a tu Google Drive personal ($0 en R2)</p>
              </div>
            </div>

            <form onSubmit={handleSaveRecordingUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Enlace de Grabación de Google Drive
                </label>
                <input
                  type="url"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  required
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="block text-[11px] text-neutral-400 mt-1">
                  Asegúrate de configurar el archivo con "Cualquier persona con el enlace puede ver". IPT Course lo transformará automáticamente en visor embebido sin salir de la plataforma.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordingModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-xl text-neutral-300"
                >
                  Omitir por ahora
                </button>
                <button
                  type="submit"
                  disabled={savingRecording}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white shadow-sm"
                >
                  {savingRecording ? 'Guardando...' : 'Publicar Grabación para Alumnos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TeacherLiveStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#111113] flex items-center justify-center text-xs text-neutral-400">
          Cargando Estudio de Videollamada IPT...
        </div>
      }
    >
      <TeacherLiveStudioContent />
    </Suspense>
  );
}
