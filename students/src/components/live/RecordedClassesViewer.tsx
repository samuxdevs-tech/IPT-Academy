'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Sparkles,
  Subtitles,
  Clock,
  Calendar,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Search,
  ArrowLeft,
  Video,
} from 'lucide-react';

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface ClassChapter {
  time: string;
  seconds: number;
  title: string;
}

export interface RecordedClassData {
  id: string;
  code8: string;
  title: string;
  topic: string;
  teacherName: string;
  teacherUid: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  videoUrl: string;
  allowed_students?: Record<string, boolean>;
  allowed_emails?: Record<string, boolean>;
  subtitles?: SubtitleCue[];
  summary?: string;
  keyPoints?: string[];
  chapters?: ClassChapter[];
  createdAt: number;
}

interface RecordedClassesViewerProps {
  onBackToLive?: () => void;
}

export default function RecordedClassesViewer({ onBackToLive }: RecordedClassesViewerProps) {
  const { user } = useAuth();
  const studentUid = user?.uid || 'mw0EaGhRIsO3mKJ5yTXi6K9hWI93';
  const studentEmail = (user?.email || '').toLowerCase().trim();
  const studentEmailKey = studentEmail.replace(/[.#$\[\]]/g, '_');

  const [recordings, setRecordings] = useState<RecordedClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<RecordedClassData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados del reproductor
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  // Cargar grabaciones desde Realtime Database
  useEffect(() => {
    const recsRef = ref(db, 'recorded_classes');
    const unsub = onValue(recsRef, (snap) => {
      setLoading(false);
      if (!snap.exists()) {
        setRecordings([]);
        return;
      }
      const raw = snap.val() as Record<string, RecordedClassData>;
      const list = Object.values(raw).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      setRecordings(list);
    });

    return () => unsub();
  }, []);

  // Subtítulo activo en el segundo actual del video
  const activeSubtitle = useMemo(() => {
    if (!selectedClass?.subtitles || !showSubtitles) return null;
    return selectedClass.subtitles.find(
      (cue) => currentTime >= cue.start && currentTime <= cue.end + 0.5
    );
  }, [selectedClass?.subtitles, showSubtitles, currentTime]);

  // Controles de reproducción
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || selectedClass?.durationSeconds || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleJumpToSecond = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  // Filtrar grabaciones estrictamente autorizadas para este estudiante
  const authorizedRecordings = useMemo(() => {
    return recordings.filter((r) => {
      // 1. Si no tiene restricción (clase pública de la academia), permitir
      if (!r.allowed_students && !r.allowed_emails) return true;
      // 2. Si el student.id está explícitamente en el mapa { [student.id]: true }
      if (r.allowed_students && r.allowed_students[studentUid] === true) return true;
      // 3. Si el email está en allowed_emails
      if (studentEmailKey && r.allowed_emails && r.allowed_emails[studentEmailKey] === true) return true;
      return false;
    });
  }, [recordings, studentUid, studentEmailKey]);

  // Filtrado por buscador sobre las grabaciones autorizadas
  const displayRecordings = useMemo(() => {
    if (!searchQuery.trim()) return authorizedRecordings;
    const q = searchQuery.toLowerCase();
    return authorizedRecordings.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.topic && r.topic.toLowerCase().includes(q)) ||
        (r.teacherName && r.teacherName.toLowerCase().includes(q))
    );
  }, [authorizedRecordings, searchQuery]);

  function formatSec(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Fondo degradado sutil */}
      <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-[#8052ff]/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* Cabecera de la sección */}
      <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 z-10">
        <div className="flex items-center gap-3">
          {selectedClass ? (
            <button
              type="button"
              onClick={() => setSelectedClass(null)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : onBackToLive ? (
            <button
              type="button"
              onClick={onBackToLive}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Volver al escenario en vivo"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}

          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <span>Grabaciones de Clases</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#8052ff]/15 border border-[#8052ff]/30 text-[#b79aff] font-medium">
                IA & Subtítulos STT
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Revive tus sesiones, navega por capítulos temáticos y repasa con resúmenes inteligentes
            </p>
          </div>
        </div>

        {!selectedClass && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema o docente..."
              className="w-full bg-[#09090b] border border-white/10 focus:border-[#8052ff] rounded-full pl-10 pr-4 py-2 text-xs text-white outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* VISTA 1: LISTADO DE GRABACIONES */}
      {!selectedClass && (
        <div className="max-w-7xl w-full mx-auto z-10 flex-1">
          {loading ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-[#8052ff] rounded-full animate-spin" />
            </div>
          ) : displayRecordings.length === 0 ? (
            <div className="min-h-[350px] bg-[#09090b] rounded-[24px] border border-white/[0.08] flex flex-col items-center justify-center text-center p-8 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-4">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-base font-medium text-white mb-1">
                Aún no hay grabaciones disponibles
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Cuando finalice tu próxima clase en vivo, el video y su resumen inteligente aparecerán automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayRecordings.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedClass(rec)}
                  className="group bg-[#09090b] rounded-[22px] border border-white/[0.08] hover:border-[#8052ff]/50 overflow-hidden shadow-xl transition-all duration-300 hover:shadow-[0_15px_40px_rgba(128,82,255,0.15)] flex flex-col cursor-pointer"
                >
                  {/* Miniatura representativa */}
                  <div className="relative aspect-video bg-[#050507] flex items-center justify-center border-b border-white/[0.06] overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-[#8052ff]/20 border border-[#8052ff]/40 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_25px_rgba(128,82,255,0.3)]">
                      <Play className="w-5 h-5 ml-0.5 text-[#b79aff]" />
                    </div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-semibold text-zinc-200 border border-white/10">
                      <Clock className="w-3 h-3 text-[#8052ff]" />
                      <span>{formatSec(rec.durationSeconds || 0)}</span>
                    </div>

                    {rec.subtitles && rec.subtitles.length > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10b981]/20 backdrop-blur-md text-[10px] font-semibold text-[#10b981] border border-[#10b981]/30">
                        <Subtitles className="w-3 h-3" />
                        <span>Subtítulos</span>
                      </div>
                    )}
                  </div>

                  {/* Información de la sesión */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-2">
                        <Calendar className="w-3 h-3 text-[#8052ff]" />
                        <span>
                          {new Date(rec.startedAt || rec.createdAt).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span>·</span>
                        <span>{rec.teacherName}</span>
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-[#b79aff] transition-colors line-clamp-1 mb-1">
                        {rec.title}
                      </h3>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {rec.topic || 'Sesión grabada con resumen interactivo'}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#b79aff] font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ver clase & resumen</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: REPRODUCTOR INTERACTIVO & PANELES DE RESUMEN Y SUBTÍTULOS */}
      {selectedClass && (
        <div className="max-w-7xl w-full mx-auto z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Reproductor de Video con Subtítulos */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-[#09090b] rounded-[24px] border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between group">
              {/* Elemento Video */}
              <video
                ref={videoRef}
                src={selectedClass.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Capa de Subtítulo Activo (CC) sincronizado con el segundo actual */}
              {activeSubtitle && (
                <div className="absolute inset-x-6 bottom-16 flex justify-center pointer-events-none z-20">
                  <span className="px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm font-medium text-center shadow-2xl max-w-xl leading-relaxed">
                    {activeSubtitle.text}
                  </span>
                </div>
              )}

              {/* Controles del Reproductor (Aparecen al pasar el mouse) */}
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-30 transition-opacity">
                {/* Barra de progreso / Scrubbing */}
                <input
                  type="range"
                  min="0"
                  max={duration || selectedClass.durationSeconds || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8052ff]"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="text-xs font-mono text-zinc-300">
                      {formatSec(currentTime)} / {formatSec(duration || selectedClass.durationSeconds || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubtitles((s) => !s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        showSubtitles
                          ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}
                    >
                      CC
                    </button>

                    <button
                      type="button"
                      onClick={cycleSpeed}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
                    >
                      {playbackSpeed}x
                    </button>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadatos de la clase seleccionada */}
            <div className="bg-[#09090b] rounded-[22px] p-5 border border-white/[0.08] shadow-xl">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                {selectedClass.title}
              </h2>
              <p className="text-xs text-zinc-400 mb-3">
                {selectedClass.topic || 'Sesión en vivo grabada'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-3 border-t border-white/[0.06]">
                <span>Docente: <strong className="text-zinc-200">{selectedClass.teacherName}</strong></span>
                <span>·</span>
                <span>Duración: <strong className="text-zinc-200">{formatSec(selectedClass.durationSeconds)}</strong></span>
                <span>·</span>
                <span>
                  {new Date(selectedClass.startedAt || selectedClass.createdAt).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Pestañas de Resumen Inteligente y Transcripción */}
          <div className="lg:col-span-5 bg-[#09090b] rounded-[24px] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
            {/* Selector de pestañas */}
            <div className="p-3 border-b border-white/[0.08] flex items-center gap-1.5 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.35)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resumen y Puntos Clave</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('transcript')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.35)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Transcripción Sincronizada</span>
              </button>
            </div>

            {/* PESTAÑA A: RESUMEN Y PUNTOS CLAVE POR IA */}
            {activeTab === 'summary' && (
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[580px]">
                {/* Resumen Ejecutivo */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#b79aff] flex items-center gap-1.5 mb-2.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Resumen Ejecutivo</span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                    {selectedClass.summary || 'Resumen no disponible para esta sesión.'}
                  </p>
                </div>

                {/* Puntos Clave */}
                {selectedClass.keyPoints && selectedClass.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#10b981] flex items-center gap-1.5 mb-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Puntos Clave y Conceptos</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedClass.keyPoints.map((pt, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0 mt-1.5" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Capítulos Temáticos con Salto Directo */}
                {selectedClass.chapters && selectedClass.chapters.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 mb-2.5">
                      <Clock className="w-3.5 h-3.5 text-[#8052ff]" />
                      <span>Capítulos y Momentos Clave</span>
                    </h4>
                    <div className="space-y-1.5">
                      {selectedClass.chapters.map((ch, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleJumpToSecond(ch.seconds)}
                          className="w-full text-left p-3 rounded-xl bg-[#050507] hover:bg-[#8052ff]/10 border border-white/[0.06] hover:border-[#8052ff]/40 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-white">
                            {ch.title}
                          </span>
                          <span className="text-[11px] font-mono text-[#b79aff] bg-[#8052ff]/15 px-2 py-0.5 rounded-md shrink-0">
                            {ch.time}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA B: TRANSCRIPCIÓN SINCRONIZADA */}
            {activeTab === 'transcript' && (
              <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 max-h-[580px]">
                {!selectedClass.subtitles || selectedClass.subtitles.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10">
                    No hay subtítulos registrados para esta sesión.
                  </p>
                ) : (
                  selectedClass.subtitles.map((cue) => {
                    const isCurrent =
                      currentTime >= cue.start && currentTime <= cue.end + 0.5;
                    return (
                      <div
                        key={cue.id}
                        onClick={() => handleJumpToSecond(cue.start)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex items-start gap-3 ${
                          isCurrent
                            ? 'bg-[#8052ff]/20 border-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.2)]'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-zinc-300'
                        }`}
                      >
                        <span className="font-mono text-[11px] text-[#b79aff] shrink-0 mt-0.5">
                          {formatSec(cue.start)}
                        </span>
                        <p className="leading-relaxed flex-1">{cue.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
