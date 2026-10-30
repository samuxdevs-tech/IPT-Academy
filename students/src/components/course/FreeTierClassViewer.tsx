'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ref, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Clock,
  RotateCcw
} from 'lucide-react';

export interface LessonItem {
  id: string;
  code: string;
  title: string;
  duration: string;
  durationSec: number;
  videoUrl?: string;
  summary: string;
  keyTakeaways: string[];
  resources: { name: string; url: string; tag: string }[];
}

export interface ModuleItem {
  id: string;
  number: number;
  title: string;
  lessons: LessonItem[];
}

function extractYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=0&rel=0`;
  }
  return null;
}

export default function FreeTierClassViewer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const requestedSlug = searchParams?.get('slug') || searchParams?.get('course') || '';
  const initialLessonCode = searchParams?.get('code') || searchParams?.get('lesson') || '1.1';

  const [courseData, setCourseData] = useState<any | null>(null);
  const [loadingCourse, setLoadingCourse] = useState<boolean>(true);

  // Sincronización dinámica de cursos en tiempo real desde Firebase RTDB (courses/)
  useEffect(() => {
    setLoadingCourse(true);
    const coursesRef = ref(db, 'courses');
    const unsub = onValue(
      coursesRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          let target: any = null;
          if (requestedSlug && val[requestedSlug]) {
            target = val[requestedSlug];
          } else {
            const entries = Object.entries(val);
            const published = entries.find(([_, c]: [string, any]) => c && c.published !== false);
            target = published ? published[1] : entries[0]?.[1];
          }
          setCourseData(target);
        } else {
          setCourseData(null);
        }
        setLoadingCourse(false);
      },
      (err) => {
        console.warn('Error cargando curso de RTDB:', err);
        setLoadingCourse(false);
      }
    );

    return () => unsub();
  }, [requestedSlug]);

  // Módulos y lecciones dinámicas normalizadas
  const courseModules = useMemo<ModuleItem[]>(() => {
    if (!courseData || !Array.isArray(courseData.modules)) return [];
    return courseData.modules.map((m: any, mIdx: number) => {
      const rawLessons = Array.isArray(m.lessons)
        ? m.lessons
        : typeof m.lessons === 'object' && m.lessons !== null
        ? Object.values(m.lessons)
        : [];

      const rawResources = Array.isArray(m.resources)
        ? m.resources
        : typeof m.resources === 'object' && m.resources !== null
        ? Object.values(m.resources)
        : [];

      return {
        id: m.id || `mod-${mIdx + 1}`,
        number: m.order || mIdx + 1,
        title: m.title || `Módulo ${mIdx + 1}`,
        lessons: rawLessons.map((l: any, lIdx: number) => ({
          id: l.id || `les-${mIdx + 1}-${lIdx + 1}`,
          code: `${mIdx + 1}.${l.order || lIdx + 1}`,
          title: l.title || `Lección ${lIdx + 1}`,
          duration: l.duration || '15:00',
          durationSec: 900,
          videoUrl: l.videoUrl || '',
          summary: l.description || '',
          keyTakeaways: Array.isArray(l.inVideoCheckpoints)
            ? l.inVideoCheckpoints.map((cp: any) => cp.prompt)
            : [],
          resources: rawResources.map((r: any) => ({
            name: r.title || 'Recurso didáctico',
            url: r.url || '#',
            tag: r.type || 'Documento',
          })),
        })),
      };
    });
  }, [courseData]);

  // Progreso guardado localmente en el navegador
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ipt_free_course_progress');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Sincronizar en tiempo real el progreso del estudiante con Firebase RTDB (progress/{uid})
  useEffect(() => {
    if (!user?.uid) return;
    const progressRef = ref(db, `progress/${user.uid}/completedLessons`);
    const unsub = onValue(progressRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val)) {
          setCompletedLessons(val);
          try {
            localStorage.setItem('ipt_free_course_progress', JSON.stringify(val));
          } catch {}
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Todas las lecciones aplanadas para navegación secuencial sencilla
  const allLessons = useMemo(() => {
    return courseModules.flatMap((m) => m.lessons);
  }, [courseModules]);

  // Encontrar la lección actual
  const [activeLessonCode, setActiveLessonCode] = useState<string>('1.1');

  useEffect(() => {
    if (allLessons.length > 0) {
      const match = allLessons.find((l) => l.code === initialLessonCode || l.id === initialLessonCode);
      setActiveLessonCode(match ? match.code : allLessons[0].code);
    }
  }, [allLessons, initialLessonCode]);

  const activeLesson = useMemo<LessonItem | null>(() => {
    if (allLessons.length === 0) return null;
    return (
      allLessons.find((l) => l.code === activeLessonCode || l.id === activeLessonCode) ||
      allLessons[0]
    );
  }, [allLessons, activeLessonCode]);

  const activeIndex = useMemo(() => {
    if (!activeLesson) return 0;
    return allLessons.findIndex((l) => l.id === activeLesson.id);
  }, [allLessons, activeLesson]);

  // Estado del reproductor
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'resources'>('info');

  // Módulos desplegados en el acordeón de la barra lateral
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (courseModules.length > 0) {
      const map: Record<string, boolean> = {};
      courseModules.forEach((m, idx) => {
        map[m.id] = idx === 0;
      });
      setExpandedModules(map);
    }
  }, [courseModules]);

  // Toggle de completitud de la lección con persistencia viva en RTDB
  const toggleLessonCompleted = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ipt_free_course_progress', JSON.stringify(next));
        } catch {}
      }
      if (user?.uid) {
        set(ref(db, `progress/${user.uid}/completedLessons`), next).catch(() => {});
        set(ref(db, `progress/${user.uid}/lastActiveLesson`), lessonId).catch(() => {});
        set(ref(db, `progress/${user.uid}/updatedAt`), new Date().toISOString()).catch(() => {});
      }
      return next;
    });
  };

  const isCurrentCompleted = activeLesson ? completedLessons.includes(activeLesson.id) : false;

  // Navegar a lección anterior / siguiente
  const handleNextLesson = () => {
    if (activeIndex < allLessons.length - 1) {
      const next = allLessons[activeIndex + 1];
      setActiveLessonCode(next.code);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  const handlePrevLesson = () => {
    if (activeIndex > 0) {
      const prev = allLessons[activeIndex - 1];
      setActiveLessonCode(prev.code);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  // Simulación suave de reproducción si no hay video embebido
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeLesson) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= activeLesson.durationSec) {
            setIsPlaying(false);
            if (!completedLessons.includes(activeLesson.id)) {
              toggleLessonCompleted(activeLesson.id);
            }
            return activeLesson.durationSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeLesson, completedLessons]);

  const progressPercent = allLessons.length > 0
    ? Math.round((completedLessons.length / allLessons.length) * 100)
    : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Estado de Carga
  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white/50 space-y-4">
        <div className="w-8 h-8 border-2 border-[#8052ff] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Cargando aula virtual desde base de datos...</span>
      </div>
    );
  }

  // 2. Estado Virgen / Vacío (Si no hay cursos o lecciones configuradas en Administración)
  if (!courseData || courseModules.length === 0 || allLessons.length === 0 || !activeLesson) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Barra superior de navegación */}
        <div className="border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Campus</span>
          </Link>
          <a
            href="https://ac-administrator.iptapps.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-zinc-300 hover:text-white transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ir a Administración</span>
          </a>
        </div>

        {/* Pantalla Virgen */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] flex items-center justify-center shadow-[0_0_30px_rgba(128,82,255,0.2)]">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">No hay cursos publicados todavía</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El aula virtual se encuentra en estado virgen. El contenido académico, módulos y videos deben configurarse y publicarse dinámicamente desde el panel de <strong className="text-white">Administración</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <a
              href="https://ac-administrator.iptapps.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#8052ff] hover:bg-[#6e3df0] text-white text-xs font-semibold shadow-lg shadow-[#8052ff]/25 transition-all"
            >
              Configurar Cursos en Administración
            </a>
            <Link
              href="/home"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium transition-all"
            >
              Ir al Campus
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const youTubeEmbedUrl = extractYouTubeEmbedUrl(activeLesson.videoUrl);

  // 3. Render Dinámico del Curso Oficial
  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#8052ff] selection:text-white flex flex-col">
      {/* Sub-barra Contextual Dinámica del Curso */}
      <div className="border-b border-[#ffffff]/10 bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/home"
            className="flex items-center gap-1.5 text-xs text-[#9a9a9a] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Campus</span>
          </Link>

          <div className="h-3.5 w-[1px] bg-[#ffffff]/15 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-medium text-white truncate">
              {courseData?.title || 'Especialización Oficial IPT'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#15846e]/15 border border-[#15846e]/30 text-[#15846e] text-[10px] font-semibold uppercase tracking-wider shrink-0 hidden md:inline">
              {courseData?.category || 'Oficial'}
            </span>
          </div>
        </div>

        {/* Avance del Estudiante */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#9a9a9a]">
            <span className="text-[11px]">{completedLessons.length}/{allLessons.length} lecciones</span>
            <div className="w-16 sm:w-24 h-1.5 rounded-full bg-[#ffffff]/10 overflow-hidden">
              <div
                className="h-full bg-[#15846e] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#15846e] font-bold">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Contenedor del Visor: Reproductor + Temario Lateral */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Columna Principal Izquierda: Reproductor y Detalle */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6">
            {/* Pantalla del Reproductor de Video */}
            <div className="relative aspect-video w-full rounded-[24px] bg-[#09090b] border border-[#ffffff]/15 shadow-2xl overflow-hidden flex flex-col justify-between group">
              {youTubeEmbedUrl ? (
                <iframe
                  src={youTubeEmbedUrl}
                  title={activeLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  {/* Fondo Cinematográfico Abstracto */}
                  <div className="absolute inset-0 bg-radial from-[#8052ff]/20 via-transparent to-transparent opacity-40 pointer-events-none" />

                  {/* Botón Central de Play/Pause */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-18 h-18 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-white flex items-center justify-center shadow-[0_0_35px_rgba(128,82,255,0.6)] transform group-hover:scale-105 transition-all cursor-pointer"
                      aria-label={isPlaying ? 'Pausar video' : 'Reproducir video'}
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 fill-white" />
                      ) : (
                        <Play className="w-8 h-8 fill-white ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Marca de Agua / Título Superior */}
                  <div className="relative z-10 p-6 flex items-center justify-between text-xs text-[#9a9a9a]">
                    <span className="font-mono text-white/80">
                      Lección {activeLesson.code} · {activeLesson.duration}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-[#bdbdbd] backdrop-blur-md">
                      1080p HD
                    </span>
                  </div>

                  {/* Barra de Control Inferior */}
                  <div className="relative z-10 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-3">
                    {/* Línea de tiempo interactiva */}
                    <div
                      className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const fraction = clickX / rect.width;
                        setCurrentTimeSec(Math.floor(fraction * activeLesson.durationSec));
                      }}
                    >
                      <div
                        className="h-full bg-[#8052ff] transition-all duration-150"
                        style={{
                          width: `${(currentTimeSec / activeLesson.durationSec) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#bdbdbd]">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="hover:text-white transition-colors cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          className="hover:text-white transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <span className="font-mono text-[11px]">
                          {formatTime(currentTimeSec)} / {activeLesson.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCurrentTimeSec(0)}
                          title="Reiniciar video"
                          className="hover:text-white transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <span className="font-mono text-[11px] text-[#9a9a9a]">Velocidad 1.0x</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fila de Acciones Rápidas de Navegación */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-[20px] bg-[#09090b] border border-[#ffffff]/10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleLessonCompleted(activeLesson.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                    isCurrentCompleted
                      ? 'bg-[#15846e]/20 border-[#15846e]/50 text-[#15846e]'
                      : 'bg-[#ffffff]/5 border-[#ffffff]/15 hover:border-[#ffffff]/30 text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${isCurrentCompleted ? 'text-[#15846e]' : 'text-[#9a9a9a]'}`} />
                  <span>{isCurrentCompleted ? 'Lección completada' : 'Marcar como completada'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevLesson}
                  disabled={activeIndex === 0}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[#ffffff]/15 hover:border-[#ffffff]/30 disabled:opacity-30 disabled:pointer-events-none text-[#bdbdbd] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextLesson}
                  disabled={activeIndex === allLessons.length - 1}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#8052ff] hover:bg-[#6e3df0] text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(128,82,255,0.4)] cursor-pointer"
                >
                  <span>Siguiente Lección</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pestañas de Información de la Lección */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 border-b border-[#ffffff]/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`text-xs uppercase tracking-wider font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'info'
                      ? 'border-[#8052ff] text-white'
                      : 'border-transparent text-[#9a9a9a] hover:text-white'
                  }`}
                >
                  Sobre esta clase
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('resources')}
                  className={`text-xs uppercase tracking-wider font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'resources'
                      ? 'border-[#8052ff] text-white'
                      : 'border-transparent text-[#9a9a9a] hover:text-white'
                  }`}
                >
                  Recursos ({(activeLesson.resources || []).length})
                </button>
              </div>

              {activeTab === 'info' ? (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-normal text-white tracking-tight mb-2">
                      {activeLesson.code} {activeLesson.title}
                    </h1>
                    <p className="text-sm font-extralight text-[#bdbdbd] leading-relaxed">
                      {activeLesson.summary}
                    </p>
                  </div>

                  {activeLesson.keyTakeaways && activeLesson.keyTakeaways.length > 0 && (
                    <div className="p-5 rounded-2xl bg-[#09090b] border border-[#ffffff]/10 space-y-3">
                      <span className="text-xs uppercase tracking-wider font-semibold text-white block">
                        Conceptos Clave de la Lección:
                      </span>
                      <ul className="space-y-2 text-xs text-[#9a9a9a] font-light">
                        {activeLesson.keyTakeaways.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#8052ff] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(!activeLesson.resources || activeLesson.resources.length === 0) && (
                    <div className="p-6 rounded-2xl bg-[#09090b] border border-[#ffffff]/10 text-center text-xs text-zinc-500">
                      No hay recursos adjuntos para esta lección.
                    </div>
                  )}
                  {(activeLesson.resources || []).map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 rounded-xl bg-[#09090b] border border-[#ffffff]/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8052ff]/15 text-[#8052ff] border border-[#8052ff]/30">
                          {res.tag}
                        </span>
                        <span className="text-xs text-white font-medium">{res.name}</span>
                      </div>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#8052ff] hover:underline flex items-center gap-1"
                      >
                        <span>Ver recurso</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Lateral Derecha: Temario de Módulos y Lecciones */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#ffffff]/10 bg-[#09090b]/80 backdrop-blur-md flex flex-col h-auto lg:h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-[#ffffff]/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Temario del Curso
              </h2>
              <p className="text-[11px] text-[#9a9a9a] font-light">
                {courseModules.length} Módulos · {allLessons.length} Lecciones
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#15846e]/15 text-[#15846e] text-[10px] font-mono font-semibold">
              {progressPercent}%
            </span>
          </div>

          {/* Lista Acordeón de Módulos Dinámicos */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#ffffff]/5">
            {courseModules.map((mod) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              return (
                <div key={mod.id} className="py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedModules((prev) => ({
                        ...prev,
                        [mod.id]: !prev[mod.id],
                      }))
                    }
                    className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-[#ffffff]/5 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-[#8052ff] block">
                        Módulo {mod.number}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {mod.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#9a9a9a]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#9a9a9a]" />
                    )}
                  </button>

                  {/* Lecciones del Módulo */}
                  {isExpanded && (
                    <div className="space-y-1 px-2 pt-1">
                      {mod.lessons.map((les) => {
                        const isSelected = les.id === activeLesson.id;
                        const isDone = completedLessons.includes(les.id);
                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => {
                              setActiveLessonCode(les.code);
                              setCurrentTimeSec(0);
                            }}
                            className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#8052ff]/15 border border-[#8052ff]/40 text-white shadow-[0_0_15px_rgba(128,82,255,0.2)]'
                                : 'hover:bg-[#ffffff]/5 text-[#bdbdbd] border border-transparent'
                            }`}
                          >
                            <div className="shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#15846e]" />
                              ) : isSelected ? (
                                <Play className="w-4 h-4 text-[#8052ff] fill-[#8052ff]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#ffffff]/20" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono text-[#9a9a9a] block">
                                {les.code}
                              </span>
                              <span className="text-xs font-medium truncate block">
                                {les.title}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-[#9a9a9a] shrink-0">
                              {les.duration}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
