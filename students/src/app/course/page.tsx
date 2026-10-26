'use client';

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SafeNavLink from '@/components/navigation/SafeNavLink';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Subtitles,
  Bookmark,
  Search,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  FileCheck2,
  BookOpen,
  Calendar,
  Trash2,
  RotateCcw,
  Settings,
  Maximize,
  ChevronRight,
  Check,
  Shield,
  Video,
  FileText,
  Home,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import {
  ConferenceProvider,
  VideoChapterMarker,
  VideoResolution,
} from '@/types';
import {
  DEFAULT_ABR_VARIANTS,
  formatUtcInTimeZone,
} from '@/lib/lmsData';

function formatSecondsToMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/) ||
    (/^[A-Za-z0-9_-]{11}$/.test(trimmed) ? [trimmed, trimmed] : null);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0`;
  }
  return null;
}

function VideoStudioContent() {
  const searchParams = useSearchParams();
  const requestedSlug = searchParams?.get('course') || searchParams?.get('id') || '';

  const {
    courses,
    liveSessions,
    createLiveSession,
    deleteLiveSession,
    captionsEnabled,
    setCaptionsEnabled,
    timeZone,
  } = useLms();
  const { effectiveIsAdmin } = useAuth();

  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>(requestedSlug);
  const [selectedModIdx, setSelectedModIdx] = useState<number>(0);
  const [selectedLesIdx, setSelectedLesIdx] = useState<number>(0);

  useEffect(() => {
    if (requestedSlug) {
      const match = courses.find((c) => c.slug === requestedSlug);
      if (match) {
        setSelectedCourseSlug(match.slug);
      } else if (courses[0]) {
        setSelectedCourseSlug(courses[0].slug);
      }
    } else if (courses[0]) {
      if (!selectedCourseSlug || !courses.some((c) => c.slug === selectedCourseSlug)) {
        setSelectedCourseSlug(courses[0].slug);
      }
    }
  }, [requestedSlug, courses, selectedCourseSlug]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedCourseSlug) || courses[0],
    [courses, selectedCourseSlug]
  );

  const activeModule = useMemo(
    () => activeCourse?.modules?.[selectedModIdx] || activeCourse?.modules?.[0],
    [activeCourse, selectedModIdx]
  );

  const activeLesson = useMemo(
    () => activeModule?.lessons?.[selectedLesIdx] || activeModule?.lessons?.[0],
    [activeModule, selectedLesIdx]
  );

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(activeLesson?.durationSeconds || 900);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('auto');
  const [captionLang, setCaptionLang] = useState<'es' | 'en'>('es');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSubmenu, setSettingsSubmenu] = useState<'main' | 'quality' | 'speed' | 'captions'>('main');

  const initialChapters = useMemo(
    () => activeLesson?.chapters || [],
    [activeLesson]
  );

  const [chapters, setChapters] = useState<VideoChapterMarker[]>(initialChapters);
  useEffect(() => {
    setChapters(activeLesson?.chapters || []);
    setCurrentTimeSec(0);
    setIsPlaying(false);
  }, [activeLesson]);

  const [chapterSearch, setChapterSearch] = useState('');
  const [newMarkerTitle, setNewMarkerTitle] = useState('');

  const [studentNotes, setStudentNotes] = useState<
    Array<{ id: string; sec: number; text: string }>
  >([]);
  const [noteDraft, setNoteDraft] = useState('');

  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveJoinUrl, setNewLiveJoinUrl] = useState('');
  const [liveCreatedBanner, setLiveCreatedBanner] = useState<string | null>(null);

  const effectiveResolution: Exclude<VideoResolution, 'auto'> =
    selectedResolution === 'auto' ? '720p' : selectedResolution;

  const activeVariant = useMemo(
    () =>
      (activeLesson?.qualityVariants || DEFAULT_ABR_VARIANTS).find(
        (v) => v.resolution === effectiveResolution
      ) || DEFAULT_ABR_VARIANTS[1],
    [activeLesson, effectiveResolution]
  );

  const videoUrlToPlay = useMemo(() => {
    if (activeLesson?.videoUrl && activeLesson.videoUrl.trim()) {
      return activeLesson.videoUrl.trim();
    }
    if (activeVariant?.streamUrl && activeVariant.streamUrl.trim()) {
      return activeVariant.streamUrl.trim();
    }
    return '';
  }, [activeLesson, activeVariant]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!videoUrlToPlay) return null;
    if (
      activeLesson?.videoType === 'youtube' ||
      videoUrlToPlay.includes('youtube.com') ||
      videoUrlToPlay.includes('youtu.be')
    ) {
      return getYouTubeEmbedUrl(videoUrlToPlay);
    }
    return null;
  }, [activeLesson, videoUrlToPlay]);

  const activeChapter = useMemo(() => {
    const sorted = [...chapters].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    let current = sorted[0];
    for (const ch of sorted) {
      if (currentTimeSec >= ch.timestampSeconds) {
        current = ch;
      }
    }
    return current;
  }, [chapters, currentTimeSec]);

  const activeCaptionCue = useMemo(() => {
    const cues = activeLesson?.captions || [];
    return (
      cues.find(
        (c) => currentTimeSec >= c.startSeconds && currentTimeSec <= c.endSeconds
      ) || null
    );
  }, [activeLesson, currentTimeSec]);

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(q) ||
        (ch.slideTitle && ch.slideTitle.toLowerCase().includes(q)) ||
        ch.transcriptExcerpt.toLowerCase().includes(q)
    );
  }, [chapters, chapterSearch]);

  const handleTogglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen?.().catch(() => {});
    }
  };

  const handleSeekToSeconds = (targetSec: number) => {
    setCurrentTimeSec(targetSec);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = Math.min(
          targetSec,
          videoRef.current.duration || targetSec
        );
      } catch {}
    }
  };

  const handleAddChapterMarker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkerTitle.trim()) return;
    const created: VideoChapterMarker = {
      id: `chap-user-${Date.now()}`,
      title: newMarkerTitle.trim(),
      slideTitle: `Marcador · Minuto ${formatSecondsToMmSs(currentTimeSec)}`,
      timestampSeconds: Math.floor(currentTimeSec),
      durationSeconds: 60,
      keyConcept: 'Marcador guardado',
      transcriptExcerpt: `Minuto ${formatSecondsToMmSs(currentTimeSec)}`,
    };
    setChapters((prev) =>
      [...prev, created].sort((a, b) => a.timestampSeconds - b.timestampSeconds)
    );
    setNewMarkerTitle('');
  };

  const handleDeleteCustomMarker = (id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddStudentNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setStudentNotes((prev) => [
      {
        id: `note-${Date.now()}`,
        sec: Math.floor(currentTimeSec),
        text: noteDraft.trim(),
      },
      ...prev,
    ]);
    setNoteDraft('');
  };

  const handleDeleteNote = (id: string) => {
    setStudentNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCreateMeetingLink = (provider: ConferenceProvider) => {
    if (!activeCourse) return;
    const providerNames: Record<ConferenceProvider, string> = {
      ms_teams: 'Microsoft Teams',
      google_meet: 'Google Meet',
      zoom: 'Zoom',
    };
    const urls: Record<ConferenceProvider, string> = {
      ms_teams: 'https://teams.microsoft.com/',
      google_meet: 'https://meet.google.com/',
      zoom: 'https://zoom.us/',
    };

    const sessionTitle =
      newLiveTitle.trim() ||
      `Clase en vivo de ${activeCourse.title} (${providerNames[provider]})`;

    createLiveSession({
      courseSlug: activeCourse.slug,
      moduleId: activeModule?.id || 'mod-1',
      title: sessionTitle,
      instructorName: activeCourse.instructor?.name || 'Profesor IPT',
      provider,
      meetingCode: 'reunion-curso',
      joinUrl: newLiveJoinUrl.trim() || urls[provider],
      startTimeUtc: new Date(Date.now() + 3600 * 1000).toISOString(),
      durationMinutes: 60,
      cloudRecordingState: 'scheduled',
      autoTranscribed: true,
    });

    setNewLiveTitle('');
    setNewLiveJoinUrl('');
    setLiveCreatedBanner(
      `Se agregó la reunión "${sessionTitle}" en tiempo real a la lista y al Calendario.`
    );
  };

  const progressRatio = durationSec > 0 ? Math.min(1, currentTimeSec / durationSec) : 0;

  if (!activeCourse) {
    return (
      <div className="flex-1 bg-[#ffffff] text-[#0f0f0f] flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#065fd4] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#606060]">Cargando aula virtual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main id="main-content" className="max-w-[1400px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold truncate max-w-xs">{activeCourse.title}</span>
        </nav>

        {/* Selector de curso y lección estilo YouTube */}
        <section className="bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#606060]">
                {activeModule?.title || 'Módulo 1'}
              </span>
              <h1 className="text-xl lg:text-2xl font-bold text-[#0f0f0f] leading-snug">
                {activeCourse.title}
              </h1>
              <p className="text-xs text-[#606060]">
                {activeLesson?.title || 'Sin lección seleccionada'} · Instructor: {activeCourse.instructor?.name || 'Ivan Perez Tech (IPT)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label htmlFor="course-switcher" className="text-xs font-semibold text-[#0f0f0f]">
                Curso:
              </label>
              <select
                id="course-switcher"
                name="course-switcher"
                value={activeCourse.slug}
                onChange={(e) => {
                  setSelectedCourseSlug(e.target.value);
                  setSelectedModIdx(0);
                  setSelectedLesIdx(0);
                }}
                className="px-3.5 py-2 rounded-full border border-[#ccc] bg-[#f8f8f8] text-xs font-semibold text-[#0f0f0f]"
              >
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>

              <SafeNavLink
                href={activeCourse?.slug ? `/assignments?course=${encodeURIComponent(activeCourse.slug)}` : '/assignments'}
                className="px-4 py-2 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Ir a las tareas</span>
              </SafeNavLink>
            </div>
          </div>

          {/* Chips de Módulos y Clases estilo YouTube */}
          {(activeCourse.modules || []).length > 0 && (
            <div className="pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center gap-2">
              {(activeCourse.modules || []).map((mod, mIdx) =>
                (mod.lessons || []).map((les, lIdx) => {
                  const isCurrent = mIdx === selectedModIdx && lIdx === selectedLesIdx;
                  return (
                    <button
                      key={les.id || `${mIdx}-${lIdx}`}
                      type="button"
                      onClick={() => {
                        setSelectedModIdx(mIdx);
                        setSelectedLesIdx(lIdx);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-[#0f0f0f] text-white'
                          : 'bg-[#f2f2f2] text-[#0f0f0f] hover:bg-[#e5e5e5]'
                      }`}
                    >
                      {mIdx + 1}.{lIdx + 1} {les.title}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Video estilo YouTube (Izquierda) + Partes del video (Derecha) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna del Video estilo YouTube */}
          <div className="lg:col-span-7 space-y-4">
            <div
              ref={playerContainerRef}
              className="relative bg-[#0f0f0f] aspect-video rounded-xl overflow-hidden select-none group shadow-sm"
            >
              {!videoUrlToPlay ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-white space-y-3">
                  <Video className="w-10 h-10 text-white/50" />
                  <p className="text-sm font-medium">
                    Esta clase aún no tiene un video asignado
                  </p>
                  <p className="text-xs text-white/70 max-w-[45ch]">
                    El video de esta lección estará disponible próximamente.
                  </p>
                </div>
              ) : youtubeEmbedUrl ? (
                <iframe
                  src={youtubeEmbedUrl}
                  title={activeLesson?.title || activeCourse.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrlToPlay}
                    className="w-full h-full object-cover cursor-pointer"
                    muted={isMuted}
                    playsInline
                    onClick={() => {
                      if (isSettingsOpen) {
                        setIsSettingsOpen(false);
                      } else {
                        handleTogglePlay();
                      }
                    }}
                    onTimeUpdate={(e) => {
                      setCurrentTimeSec(e.currentTarget.currentTime);
                    }}
                    onLoadedMetadata={(e) => {
                      if (e.currentTarget.duration && e.currentTarget.duration > 0) {
                        setDurationSec(Math.floor(e.currentTarget.duration));
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Botón central estilo YouTube cuando está en pausa */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      aria-label="Reproducir video"
                      className="absolute inset-0 m-auto w-16 h-11 rounded-[12px] bg-black/75 hover:bg-[#ff0033] text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Play className="w-7 h-7 fill-white ml-0.5" />
                    </button>
                  )}

                  {/* Subtítulos limpios estilo YouTube */}
                  {captionsEnabled && activeCaptionCue && (
                    <div
                      role="region"
                      aria-live="polite"
                      aria-label="Subtítulos del video"
                      className="absolute bottom-14 left-4 right-4 flex justify-center pointer-events-none"
                    >
                      <span className="bg-black/80 text-white px-2.5 py-1 rounded-[4px] text-[14px] text-center max-w-[85%] leading-snug">
                        {captionLang === 'es'
                          ? activeCaptionCue.textEs
                          : activeCaptionCue.textEn || activeCaptionCue.textEs}
                      </span>
                    </div>
                  )}

                  {/* Menú flotante de Configuración (Engranaje estilo YouTube) */}
                  {isSettingsOpen && (
                    <div className="absolute bottom-14 right-3 w-64 bg-[#1f1f1f]/95 text-white rounded-[12px] border border-white/10 py-2 text-[13px] z-30 shadow-xl">
                      {settingsSubmenu === 'main' && (
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('quality')}
                            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/10 cursor-pointer"
                          >
                            <span>Calidad</span>
                            <span className="inline-flex items-center gap-1 text-white/70">
                              {selectedResolution === 'auto' ? `Automática (${effectiveResolution})` : selectedResolution}
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('speed')}
                            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/10 cursor-pointer"
                          >
                            <span>Velocidad de reproducción</span>
                            <span className="inline-flex items-center gap-1 text-white/70">
                              {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('captions')}
                            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/10 cursor-pointer"
                          >
                            <span>Subtítulos</span>
                            <span className="inline-flex items-center gap-1 text-white/70">
                              {!captionsEnabled ? 'Desactivados' : captionLang === 'es' ? 'Español' : 'Inglés'}
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </button>
                        </div>
                      )}

                      {settingsSubmenu === 'quality' && (
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('main')}
                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-white/60 border-b border-white/10 mb-1 hover:text-white cursor-pointer"
                          >
                            ← Calidad de video
                          </button>
                          {(
                            [
                              { id: 'auto', label: 'Automática (recomendada)' },
                              { id: '1080p', label: '1080p HD' },
                              { id: '720p', label: '720p' },
                              { id: '480p', label: '480p' },
                              { id: '360p', label: '360p (Ahorro de datos)' },
                              { id: '240p', label: '240p (Internet lento)' },
                            ] as Array<{ id: VideoResolution; label: string }>
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedResolution(opt.id);
                                setIsSettingsOpen(false);
                                setSettingsSubmenu('main');
                              }}
                              className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-left"
                            >
                              <Check
                                className={`w-4 h-4 ${
                                  selectedResolution === opt.id ? 'opacity-100 text-white' : 'opacity-0'
                                }`}
                              />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {settingsSubmenu === 'speed' && (
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('main')}
                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-white/60 border-b border-white/10 mb-1 hover:text-white cursor-pointer"
                          >
                            ← Velocidad
                          </button>
                          {[
                            { val: 0.75, label: '0.75x (Más lento)' },
                            { val: 1, label: 'Normal' },
                            { val: 1.25, label: '1.25x' },
                            { val: 1.5, label: '1.5x (Rápido)' },
                          ].map((spd) => (
                            <button
                              key={spd.val}
                              type="button"
                              onClick={() => {
                                setPlaybackSpeed(spd.val);
                                if (videoRef.current) videoRef.current.playbackRate = spd.val;
                                setIsSettingsOpen(false);
                                setSettingsSubmenu('main');
                              }}
                              className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-left"
                            >
                              <Check
                                className={`w-4 h-4 ${
                                  playbackSpeed === spd.val ? 'opacity-100 text-white' : 'opacity-0'
                                }`}
                              />
                              <span>{spd.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {settingsSubmenu === 'captions' && (
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setSettingsSubmenu('main')}
                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-white/60 border-b border-white/10 mb-1 hover:text-white cursor-pointer"
                          >
                            ← Subtítulos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCaptionsEnabled(false);
                              setIsSettingsOpen(false);
                              setSettingsSubmenu('main');
                            }}
                            className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-left"
                          >
                            <Check className={`w-4 h-4 ${!captionsEnabled ? 'opacity-100' : 'opacity-0'}`} />
                            <span>Desactivados</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCaptionsEnabled(true);
                              setCaptionLang('es');
                              setIsSettingsOpen(false);
                              setSettingsSubmenu('main');
                            }}
                            className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-left"
                          >
                            <Check
                              className={`w-4 h-4 ${
                                captionsEnabled && captionLang === 'es' ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span>Español</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCaptionsEnabled(true);
                              setCaptionLang('en');
                              setIsSettingsOpen(false);
                              setSettingsSubmenu('main');
                            }}
                            className="w-full px-3.5 py-1.5 flex items-center gap-2.5 hover:bg-white/10 cursor-pointer text-left"
                          >
                            <Check
                              className={`w-4 h-4 ${
                                captionsEnabled && captionLang === 'en' ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span>Inglés</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Barra inferior integrada estilo YouTube */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-2 px-3 flex flex-col gap-1.5">
                    {/* Barra de progreso fina con capítulos estilo YouTube */}
                    <div className="relative h-3 flex items-center cursor-pointer group/scrub">
                      <div className="w-full h-1 group-hover/scrub:h-1.5 bg-white/25 rounded-full overflow-hidden relative transition-all">
                        <div
                          className="h-full bg-[#ff0033] rounded-full"
                          style={{ width: `${progressRatio * 100}%` }}
                        />
                        {chapters.slice(1).map((ch) => {
                          const pct = durationSec > 0 ? (ch.timestampSeconds / durationSec) * 100 : 0;
                          return (
                            <span
                              key={ch.id}
                              style={{ left: `${pct}%` }}
                              className="absolute top-0 bottom-0 w-[2px] bg-black/80"
                            />
                          );
                        })}
                      </div>
                      <span
                        style={{ left: `calc(${progressRatio * 100}% - 6px)` }}
                        className="absolute w-3 h-3 rounded-full bg-[#ff0033] scale-0 group-hover/scrub:scale-100 transition-transform pointer-events-none"
                      />
                      <input
                        id="video-time-slider"
                        name="video-time-slider"
                        type="range"
                        min={0}
                        max={durationSec}
                        value={Math.min(currentTimeSec, durationSec)}
                        onChange={(e) => handleSeekToSeconds(Number(e.target.value))}
                        aria-label="Adelantar o retroceder el video"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>

                    {/* Fila única de iconos estilo YouTube */}
                    <div className="flex items-center justify-between text-white text-[13px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={handleTogglePlay}
                          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                          title={isPlaying ? 'Pausar' : 'Reproducir'}
                          className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                          title={isMuted ? 'Activar sonido' : 'Silenciar'}
                          className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>

                        <span className="text-[12px] text-white/90 tabular-nums shrink-0">
                          {formatSecondsToMmSs(currentTimeSec)} / {formatSecondsToMmSs(durationSec)}
                        </span>

                        {activeChapter && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[12px] text-white/90 truncate max-w-[260px]">
                            <span className="text-white/50">•</span>
                            <span className="truncate">{activeChapter.title}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCaptionsEnabled(!captionsEnabled)}
                          aria-label="Subtítulos"
                          title={captionsEnabled ? 'Ocultar subtítulos' : 'Mostrar subtítulos'}
                          className="p-1.5 hover:bg-white/10 rounded-full relative cursor-pointer"
                        >
                          <Subtitles className="w-5 h-5" />
                          {captionsEnabled && (
                            <span className="absolute bottom-1 left-2 right-2 h-[2px] bg-[#ff0033] rounded-full" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsOpen((v) => !v);
                            setSettingsSubmenu('main');
                          }}
                          aria-label="Configuración de calidad y velocidad"
                          title="Calidad y velocidad"
                          className="p-1.5 hover:bg-white/10 rounded-full relative cursor-pointer"
                        >
                          <Settings className="w-5 h-5" />
                          {(effectiveResolution === '1080p' || effectiveResolution === '720p') && (
                            <span className="absolute top-0.5 right-0.5 px-1 rounded-[3px] bg-[#ff0033] text-[8px] font-bold leading-tight">
                              HD
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleFullscreen}
                          aria-label="Pantalla completa"
                          title="Pantalla completa"
                          className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer"
                        >
                          <Maximize className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Descripción y materiales de la lección configurados en el Admin */}
            {activeLesson && (
              <div className="bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-5 space-y-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[#2a2b3f]">
                    {activeLesson.title}
                  </h2>
                  {activeLesson.description && (
                    <p className="text-[14px] text-[#595c73] mt-1 leading-[1.5]">
                      {activeLesson.description}
                    </p>
                  )}
                </div>

                {(activeLesson.resources || []).length > 0 && (
                  <div className="pt-3 border-t border-[#e9eaf2] space-y-2">
                    <h3 className="text-[14px] font-bold text-[#2a2b3f]">
                      Materiales y recursos de esta clase:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(activeLesson.resources || []).map((res) => (
                        <a
                          key={res.id}
                          href={res.url || '#'}
                          target={res.url ? '_blank' : undefined}
                          rel="noreferrer"
                          className="p-3 rounded-[10px] border border-[#d1d2e0] bg-[#f6f7f9] hover:border-[#6d28d2] flex items-center justify-between gap-2 text-[13px] font-medium text-[#2a2b3f]"
                        >
                          <span className="inline-flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-[#6d28d2] shrink-0" />
                            <span className="truncate">{res.title}</span>
                          </span>
                          {res.url && <ExternalLink className="w-3.5 h-3.5 text-[#6d28d2] shrink-0" />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna Derecha: Marcadores de tiempo de esta clase */}
          <aside className="lg:col-span-5 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
            <div className="border-b border-[#e9eaf2] pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-[#2a2b3f]">
                  Marcadores de esta clase
                </h2>
                <span className="ipt-badge-violet tabular-nums">
                  {chapters.length} marcador(es)
                </span>
              </div>
              <p className="text-[14px] text-[#595c73]">
                Guarda los minutos importantes del video para saltar a ellos con un clic.
              </p>

              {chapters.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-[#595c73] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="chapter-search-input"
                    name="chapter-search-input"
                    type="search"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="Buscar un marcador..."
                    aria-label="Buscar un marcador"
                    className="ipt-input w-full !pl-9 !py-2 !text-[14px]"
                  />
                </div>
              )}
            </div>

            {filteredChapters.length === 0 ? (
              <p className="text-[14px] text-[#595c73] py-4 text-center">
                Aún no hay marcadores guardados en esta clase. Usa el campo de abajo para guardar un minuto del video.
              </p>
            ) : (
              <div className="divide-y divide-[#e9eaf2] max-h-[380px] overflow-y-auto pr-1">
                {filteredChapters.map((chapter) => {
                  const isCurrent = activeChapter?.id === chapter.id;
                  return (
                    <div
                      key={chapter.id}
                      className={`py-3.5 first:pt-0 last:pb-0 transition-colors ${
                        isCurrent ? 'bg-[#f6f7f9] -mx-3 px-3 rounded-[8px]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSeekToSeconds(chapter.timestampSeconds)}
                          className="text-left group flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-[4px] border border-[#6d28d2] text-[#6d28d2] text-[12px] font-medium tabular-nums">
                              Ir al minuto {formatSecondsToMmSs(chapter.timestampSeconds)}
                            </span>
                            <span className="text-[12px] font-medium text-[#595c73]">
                              {chapter.slideTitle}
                            </span>
                          </div>
                          <h3 className="text-[15px] font-medium text-[#2a2b3f] group-hover:text-[#6d28d2]">
                            {chapter.title}
                          </h3>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomMarker(chapter.id)}
                          className="p-1.5 text-[#595c73] hover:text-[#c4710d] cursor-pointer"
                          title="Borrar este marcador"
                          aria-label="Borrar este marcador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Guardar un marcador propio en el minuto actual */}
            <form
              onSubmit={handleAddChapterMarker}
              className="pt-4 border-t border-[#d1d2e0] space-y-3"
            >
              <label
                htmlFor="new-marker-title"
                className="block text-[14px] font-medium text-[#2a2b3f]"
              >
                ¿Quieres guardar este minuto ({formatSecondsToMmSs(currentTimeSec)}) para encontrarlo después?
              </label>
              <input
                id="new-marker-title"
                name="new-marker-title"
                type="text"
                value={newMarkerTitle}
                onChange={(e) => setNewMarkerTitle(e.target.value)}
                placeholder="Escribe un nombre (por ejemplo: Explicación de la tarea)..."
                className="ipt-input w-full !py-2 !text-[14px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="btn-outline-violet flex-1 !py-2 !text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar minuto {formatSecondsToMmSs(currentTimeSec)}</span>
                </button>
                {chapters.length > initialChapters.length && (
                  <button
                    type="button"
                    onClick={() => setChapters(initialChapters)}
                    className="btn-ghost-neutral !py-2 !px-3 !text-[13px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer lista</span>
                  </button>
                )}
              </div>
            </form>
          </aside>
        </section>

        {/* Sección Inferior: Videollamadas en vivo + Tus apuntes personales */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Videollamadas en vivo */}
          <div className="lg:col-span-7 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
            <div className="border-b border-[#e9eaf2] pb-4 space-y-1">
              <h2 className="text-[20px] font-bold text-[#2a2b3f]">
                Clases en vivo por videollamada
              </h2>
              <p className="text-[14px] text-[#595c73]">
                Entra con un clic a las clases en vivo programadas por el profesor.
              </p>
            </div>

            {liveCreatedBanner && (
              <div
                role="status"
                className="p-4 rounded-[8px] bg-[#f6f7f9] border border-[#6d28d2] text-[14px] text-[#2a2b3f] flex items-start justify-between gap-2.5"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#6d28d2] shrink-0 mt-0.5" />
                  <span>{liveCreatedBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLiveCreatedBanner(null)}
                  className="text-[12px] text-[#6d28d2] font-medium hover:underline cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}

            {effectiveIsAdmin && (
              <div className="bg-[#f6f7f9] rounded-[12px] border border-[#d1d2e0] p-4 space-y-3">
                <label
                  htmlFor="live-session-title"
                  className="block text-[14px] font-medium text-[#2a2b3f]"
                >
                  Programar nueva clase en vivo (sincronizada en tiempo real):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    id="live-session-title"
                    name="live-session-title"
                    type="text"
                    value={newLiveTitle}
                    onChange={(e) => setNewLiveTitle(e.target.value)}
                    placeholder="Título de la sesión en vivo..."
                    className="ipt-input w-full !py-2 !text-[14px]"
                  />
                  <input
                    id="live-session-url"
                    name="live-session-url"
                    type="url"
                    value={newLiveJoinUrl}
                    onChange={(e) => setNewLiveJoinUrl(e.target.value)}
                    placeholder="Enlace de reunión (Meet / Zoom / Teams)..."
                    className="ipt-input w-full !py-2 !text-[14px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCreateMeetingLink('google_meet')}
                    className="btn-outline-violet !py-2.5 !px-3 !text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Publicar en Google Meet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateMeetingLink('ms_teams')}
                    className="btn-outline-violet !py-2.5 !px-3 !text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Publicar en Microsoft Teams</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateMeetingLink('zoom')}
                    className="btn-outline-violet !py-2.5 !px-3 !text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Publicar en Zoom</span>
                  </button>
                </div>
              </div>
            )}

            {liveSessions.length === 0 ? (
              <p className="text-[14px] text-[#595c73] py-6 text-center">
                No hay sesiones en vivo programadas actualmente.
              </p>
            ) : (
              <div className="divide-y divide-[#e9eaf2]">
                {liveSessions.map((session) => {
                  const providerName =
                    session.provider === 'ms_teams'
                      ? 'Microsoft Teams'
                      : session.provider === 'google_meet'
                        ? 'Google Meet'
                        : 'Zoom';
                  return (
                    <div key={session.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="ipt-badge-violet">Por {providerName}</span>
                        <span className="text-[13px] text-[#595c73] tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatUtcInTimeZone(session.startTimeUtc, timeZone)}</span>
                        </span>
                      </div>

                      <h3 className="text-[16px] font-medium text-[#2a2b3f]">
                        {session.title}
                      </h3>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-[13px] text-[#595c73]">
                          Profesor: {session.instructorName}
                        </span>

                        <div className="flex items-center gap-2">
                          <a
                            href={session.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline-violet !py-1.5 !px-3 !text-[13px] inline-flex items-center gap-1.5"
                          >
                            <span>Abrir {providerName}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {effectiveIsAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Estás seguro de eliminar la sesión en vivo "${session.title}"?`)) {
                                  deleteLiveSession(session.id);
                                }
                              }}
                              className="p-1.5 text-[#595c73] hover:text-[#c4710d] cursor-pointer"
                              title="Eliminar sesión en vivo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cuaderno de apuntes del estudiante */}
          <div className="lg:col-span-5 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
            <div className="border-b border-[#e9eaf2] pb-4">
              <h2 className="text-[20px] font-bold text-[#2a2b3f] flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#6d28d2]" />
                <span>Tus apuntes de esta clase</span>
              </h2>
              <p className="text-[14px] text-[#595c73] mt-1">
                Escribe aquí lo que quieras recordar. Se guardará junto con el minuto del video para que puedas volver a escucharlo cuando quieras.
              </p>
            </div>

            <form onSubmit={handleAddStudentNote} className="space-y-2.5">
              <label htmlFor="student-note-textarea" className="sr-only">
                Escribir un apunte personal
              </label>
              <textarea
                id="student-note-textarea"
                name="student-note-textarea"
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={`Escribe tu apunte aquí (se guardará en el minuto ${formatSecondsToMmSs(currentTimeSec)})...`}
                className="ipt-input w-full !text-[14px]"
              />
              <button
                type="submit"
                className="btn-solid-dark w-full !py-2.5 !text-[14px] cursor-pointer"
              >
                Guardar apunte en el minuto {formatSecondsToMmSs(currentTimeSec)}
              </button>
            </form>

            {studentNotes.length === 0 ? (
              <p className="text-[13px] text-[#595c73] py-4 text-center">
                Aún no has escrito apuntes en esta clase.
              </p>
            ) : (
              <div className="divide-y divide-[#e9eaf2]">
                {studentNotes.map((note) => (
                  <div key={note.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSeekToSeconds(note.sec)}
                        className="text-[13px] font-medium text-[#6d28d2] hover:underline tabular-nums cursor-pointer"
                      >
                        Ir al minuto {formatSecondsToMmSs(note.sec)} →
                      </button>
                      <p className="text-[14px] text-[#2a2b3f] leading-[1.5]">{note.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-[#595c73] hover:text-[#c4710d] cursor-pointer"
                      title="Borrar este apunte"
                      aria-label="Borrar este apunte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#e9eaf2] flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/calendar"
                className="text-[14px] font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                <span>Ver fechas en el Calendario</span>
              </Link>
              <Link
                href="/grades"
                className="text-[14px] font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span>Ver mis notas</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CoursePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#ffffff] p-8 text-xs text-[#606060]">
          Abriendo la clase en video...
        </div>
      }
    >
      <VideoStudioContent />
    </Suspense>
  );
}
