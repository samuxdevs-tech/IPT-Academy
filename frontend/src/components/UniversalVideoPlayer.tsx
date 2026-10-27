'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Video,
  PlaySquare,
  EyeOff,
  Sparkles,
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Subtitles,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { InVideoCheckpoint } from '@/types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface QuestionStateItem {
  id: string;
  timestampSeconds: number;
  status: 'armed' | 'shown' | 'answered';
  raw: InVideoCheckpoint;
}

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

interface UniversalVideoPlayerProps {
  videoType: 'youtube' | 'local';
  videoUrl: string;
  durationSeconds?: number;
  inVideoCheckpoints?: InVideoCheckpoint[];
  passedCheckpoints?: string[];
  initialTime?: number;
  seekToTime?: number;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  onTriggerCheckpoint?: (checkpoint: InVideoCheckpoint) => void;
  onHeartbeat?: (range: [number, number], currentSec: number, durationSec: number) => void;
  isPausedByModal?: boolean;
  onTelemetryEvent?: (eventType: 'video_started' | 'video_paused' | 'video_ended' | 'seek', timeSec: number) => void;
}

// Extractor robusto de YouTube ID
function getYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : '';
}

export default function UniversalVideoPlayer({
  videoType,
  videoUrl,
  durationSeconds = 900,
  inVideoCheckpoints = [],
  passedCheckpoints = [],
  initialTime = 0,
  seekToTime,
  onEnded,
  onTimeUpdate,
  onTriggerCheckpoint,
  onHeartbeat,
  isPausedByModal = false,
  onTelemetryEvent
}: UniversalVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Variables de control de tiempo y cruce de umbral
  const lastTimeRef = useRef<number>(initialTime);
  const maxWatchedRef = useRef<number>(initialTime);
  const lastHeartbeatRef = useRef<number>(initialTime);

  // Estado de las preguntas: 'armed' -> 'shown' -> 'answered'
  const questionsStateRef = useRef<QuestionStateItem[]>([]);

  // Estados visuales y de control
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDisplaySec, setCurrentDisplaySec] = useState(initialTime);
  const [actualDuration, setActualDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [blurredPause, setBlurredPause] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtítulos
  // Requisito estricto: botón de subtítulos en default: show=false
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [subtitlesMap, setSubtitlesMap] = useState<Record<string, SubtitleSegment[]>>({});
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Hover y visibilidad de controles
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoverSeekSec, setHoverSeekSec] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number | null>(null);

  // Identificador de clave de video para subtítulos
  const videoKey = useMemo(() => {
    if (!videoUrl) return '';
    const clean = videoUrl.split('?')[0].split('#')[0];
    const base = clean.split('/').pop() || '';
    return base.replace(/\.(mp4|webm|mkv|mov)$/i, '');
  }, [videoUrl]);

  // Cargar base de datos de subtítulos desde /subtitles/subtitles.json
  useEffect(() => {
    let isMounted = true;
    fetch('/subtitles/subtitles.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar subtitles.json');
        return res.json();
      })
      .then((data) => {
        if (isMounted && data) {
          setSubtitlesMap(data);
        }
      })
      .catch((err) => {
        console.warn('Subtítulos no disponibles localmente:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Buscar subtítulo activo en el segundo actual
  useEffect(() => {
    if (!showSubtitles || !videoKey) {
      setActiveSubtitle('');
      return;
    }
    const currentSubs = subtitlesMap[videoKey] || [];
    if (!currentSubs.length) {
      setActiveSubtitle('');
      return;
    }

    const cur = currentDisplaySec;
    const match = currentSubs.find((s) => cur >= s.start && cur <= s.end);
    setActiveSubtitle(match ? match.text : '');
  }, [currentDisplaySec, showSubtitles, videoKey, subtitlesMap]);

  // Mantener callbacks y props actualizados sin re-montar el reproductor
  const propsRef = useRef({
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent,
    passedCheckpoints
  });

  propsRef.current = {
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent,
    passedCheckpoints
  };

  // Inicializar o sincronizar el estado de las preguntas
  useEffect(() => {
    questionsStateRef.current = inVideoCheckpoints.map((cp) => ({
      id: cp.id,
      timestampSeconds: cp.timestampSeconds,
      status: passedCheckpoints.includes(cp.id) ? 'answered' : 'armed',
      raw: cp
    }));
  }, [inVideoCheckpoints, passedCheckpoints]);

  // Inferencia infalible del tipo de video (YouTube vs Directo/R2/MP4)
  const isYouTubeUrl = !!getYouTubeId(videoUrl);
  const resolvedVideoType: 'youtube' | 'local' =
    videoType === 'local' || (!isYouTubeUrl && Boolean(videoUrl && videoUrl.trim()))
      ? 'local'
      : 'youtube';

  const ytId = resolvedVideoType === 'youtube' ? getYouTubeId(videoUrl) : '';

  // Pausar y reanudar video de forma unificada
  const pauseVideo = useCallback(() => {
    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.pauseVideo) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
      } catch (e) {}
    }
    setIsPlaying(false);
  }, [resolvedVideoType]);

  const playVideo = useCallback(() => {
    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.playVideo) {
      try {
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      try {
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
    setIsPlaying(true);
  }, [resolvedVideoType]);

  const togglePlay = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  // Escuchar comandos de seek desde el padre
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(seekToTime, true);
        } catch (e) {}
      } else if (resolvedVideoType === 'local' && videoRef.current) {
        videoRef.current.currentTime = seekToTime;
      }
      setCurrentDisplaySec(seekToTime);
      lastTimeRef.current = seekToTime;
    }
  }, [seekToTime, resolvedVideoType]);

  // Si el modal está abierto, pausar estrictamente
  const prevModalRef = useRef(isPausedByModal);
  useEffect(() => {
    if (isPausedByModal) {
      pauseVideo();
    } else if (prevModalRef.current && !isPausedByModal) {
      questionsStateRef.current.forEach((q) => {
        if (q.status === 'shown' && !propsRef.current.passedCheckpoints.includes(q.id)) {
          q.status = 'armed';
        }
      });
      playVideo();
    }
    prevModalRef.current = isPausedByModal;
  }, [isPausedByModal, pauseVideo, playVideo]);

  // =========================================================================
  // MOTOR DE TICKING & CRUCE DE UMBRAL (Regla: last < q.at && now >= q.at)
  // =========================================================================
  const tick = useCallback(() => {
    let now = 0;
    let rate = 1;

    if (resolvedVideoType === 'youtube') {
      if (!ytPlayerRef.current?.getCurrentTime) return;
      try {
        now = ytPlayerRef.current.getCurrentTime();
        rate = ytPlayerRef.current.getPlaybackRate ? ytPlayerRef.current.getPlaybackRate() : 1;
        const dur = ytPlayerRef.current.getDuration ? ytPlayerRef.current.getDuration() : 0;
        if (dur > 0 && dur !== actualDuration) setActualDuration(dur);
      } catch (e) {
        return;
      }
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      now = videoRef.current.currentTime;
      rate = videoRef.current.playbackRate || 1;
      const dur = videoRef.current.duration;
      if (dur > 0 && !isNaN(dur) && dur !== actualDuration) setActualDuration(dur);
    }

    const last = lastTimeRef.current;
    const delta = now - last;
    const isSeek = delta < 0 || delta > 1.5 * rate;

    // Si es reproducción legítima, acumular tiempo máximo visto
    if (!isSeek) {
      maxWatchedRef.current = Math.max(maxWatchedRef.current, now);

      // Heartbeat cada 5 segundos acumulados
      if (now - lastHeartbeatRef.current >= 5) {
        if (propsRef.current.onHeartbeat) {
          propsRef.current.onHeartbeat(
            [lastHeartbeatRef.current, now],
            now,
            propsRef.current.durationSeconds
          );
        }
        lastHeartbeatRef.current = now;
      }
    }

    // DISPARO DE CHECKPOINTS:
    // REGLA CLAVE: "cuando responde el checkpoint esa bolita se llena y no se vuelve a mostrar automaticamente mas nunca,
    // solo se muestra si se le da click de nuevo manualmente"
    for (const q of questionsStateRef.current) {
      const isAlreadyPassed = propsRef.current.passedCheckpoints.includes(q.id) || q.status === 'answered';

      // Si ya fue respondido, NUNCA se muestra automáticamente de nuevo
      if (isAlreadyPassed) {
        q.status = 'answered';
        continue;
      }

      if (q.status !== 'armed') continue;

      if (now >= q.timestampSeconds) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        pauseVideo();
        q.status = 'shown';

        if (now > q.timestampSeconds + 0.5) {
          if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.seekTo) {
            try {
              ytPlayerRef.current.seekTo(q.timestampSeconds, true);
            } catch (e) {}
          } else if (resolvedVideoType === 'local' && videoRef.current) {
            videoRef.current.currentTime = q.timestampSeconds;
          }
          now = q.timestampSeconds;
        }

        if (propsRef.current.onTriggerCheckpoint) {
          propsRef.current.onTriggerCheckpoint(q.raw);
        }
        break;
      }
    }

    lastTimeRef.current = now;
    const roundedSec = Math.floor(now);
    setCurrentDisplaySec(roundedSec);
    if (propsRef.current.onTimeUpdate) {
      propsRef.current.onTimeUpdate(roundedSec);
    }
  }, [resolvedVideoType, pauseVideo, actualDuration]);

  // Click manual en un círculo de checkpoint:
  // "solo se muestra si se le da click de nuevo manualmente"
  const handleCheckpointDotClick = (cp: InVideoCheckpoint, e: React.MouseEvent) => {
    e.stopPropagation();
    pauseVideo();

    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(cp.timestampSeconds, true);
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      videoRef.current.currentTime = cp.timestampSeconds;
    }

    setCurrentDisplaySec(cp.timestampSeconds);
    lastTimeRef.current = cp.timestampSeconds;

    if (propsRef.current.onTriggerCheckpoint) {
      propsRef.current.onTriggerCheckpoint(cp);
    }
  };

  // =========================================================================
  // INTEGRACIÓN CON YOUTUBE IFRAME PLAYER API
  // =========================================================================
  useEffect(() => {
    if (resolvedVideoType !== 'youtube' || !ytId) return;

    let isSubscribed = true;

    const cleanup = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.destroy === 'function') {
            ytPlayerRef.current.destroy();
          }
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };

    cleanup();

    const initYT = () => {
      if (!isSubscribed || !window.YT || !window.YT.Player || !iframeRef.current) return;

      try {
        ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              if (initialTime > 0) {
                try {
                  event.target.seekTo(initialTime, true);
                } catch (e) {}
                lastTimeRef.current = initialTime;
                lastHeartbeatRef.current = initialTime;
              }
              const d = event.target.getDuration ? event.target.getDuration() : 0;
              if (d > 0) setActualDuration(d);
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;

              // PLAYING (event.data === 1)
              if (event.data === 1) {
                setIsPlaying(true);
                if (propsRef.current.onTelemetryEvent) {
                  try {
                    propsRef.current.onTelemetryEvent('video_started', ytPlayerRef.current?.getCurrentTime?.() || 0);
                  } catch (e) {}
                }

                const hasModalOpen =
                  questionsStateRef.current.some(
                    (q) => q.status === 'shown' && !propsRef.current.passedCheckpoints.includes(q.id)
                  ) || propsRef.current.isPausedByModal;

                if (hasModalOpen) {
                  try {
                    event.target.pauseVideo();
                  } catch (e) {}
                  return;
                }

                if (ytPlayerRef.current?.getCurrentTime) {
                  try {
                    lastTimeRef.current = ytPlayerRef.current.getCurrentTime();
                  } catch (e) {}
                }

                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(tick, 250);
                tick();
              } else {
                setIsPlaying(false);
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }

                // ENDED (event.data === 0)
                if (event.data === 0) {
                  const pendingQ = questionsStateRef.current.find(
                    (q) => q.status === 'armed' && !propsRef.current.passedCheckpoints.includes(q.id)
                  );
                  if (pendingQ) {
                    pendingQ.status = 'shown';
                    if (propsRef.current.onTriggerCheckpoint) {
                      propsRef.current.onTriggerCheckpoint(pendingQ.raw);
                    }
                  } else {
                    if (propsRef.current.onTelemetryEvent) {
                      try {
                        propsRef.current.onTelemetryEvent('video_ended', ytPlayerRef.current?.getCurrentTime?.() || 0);
                      } catch (e) {}
                    }
                    if (propsRef.current.onEnded) propsRef.current.onEnded();
                  }
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('Error inicializando YouTube Player API:', err);
      }
    };

    if (!window.YT || !window.YT.Player) {
      const scriptId = 'youtube-iframe-api';
      let tag = document.getElementById(scriptId) as HTMLScriptElement;
      if (!tag) {
        tag = document.createElement('script');
        tag.id = scriptId;
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(tag, firstScript);
      }
      const oldReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (oldReady) oldReady();
        if (isSubscribed) initYT();
      };
    } else {
      initYT();
    }

    return () => {
      isSubscribed = false;
      cleanup();
    };
  }, [resolvedVideoType, ytId, initialTime, tick]);

  // Manejo de Tolerancia de 15 segundos al perder foco o pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = setTimeout(() => {
          pauseVideo();
          setBlurredPause(true);
        }, 15000);
      } else {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [pauseVideo]);

  const handleResumeFromBlur = () => {
    setBlurredPause(false);
    playVideo();
  };

  const toggleContainerFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(newVol * 100);
        if (newVol === 0) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange(volume > 0 ? volume : 1);
    } else {
      setIsMuted(true);
      if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.mute) {
        try {
          ytPlayerRef.current.mute();
        } catch (e) {}
      } else if (resolvedVideoType === 'local' && videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  };

  const handleSeekFromBar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = clickX / rect.width;
    const targetSec = pct * effectiveDuration;

    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(targetSec, true);
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      videoRef.current.currentTime = targetSec;
    }

    setCurrentDisplaySec(Math.floor(targetSec));
    lastTimeRef.current = targetSec;
  };

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = clickX / rect.width;
    setHoverSeekSec(Math.floor(pct * effectiveDuration));
    setHoverSeekPos(clickX);
  };

  const handleMouseLeaveProgress = () => {
    setHoverSeekSec(null);
    setHoverSeekPos(null);
  };

  const handleMouseMoveContainer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (resolvedVideoType === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
      try {
        ytPlayerRef.current.setPlaybackRate(nextRate);
      } catch (e) {}
    } else if (resolvedVideoType === 'local' && videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const formatSeconds = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = Math.max(1, actualDuration || durationSeconds || 1);
  const progressPercent = Math.min(100, Math.max(0, (currentDisplaySec / effectiveDuration) * 100));

  if (!videoUrl || (resolvedVideoType === 'youtube' && !ytId)) {
    return (
      <div className="w-full aspect-video bg-[#202230] rounded-xl flex flex-col items-center justify-center text-[#9194ac] p-6">
        <Video className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-base font-medium">Esta lección aún no tiene un video configurado.</p>
        <p className="text-xs text-[#595c73] mt-1">
          Puedes agregar un video local o de YouTube desde el panel de administración.
        </p>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const localStreamSrc =
    videoUrl.startsWith('http') ||
    videoUrl.startsWith('blob:') ||
    videoUrl.startsWith('data:') ||
    videoUrl.startsWith('/')
      ? videoUrl
      : `http://localhost:4000${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;

  const nextArmedQuestion = questionsStateRef.current.find(
    (q) => q.status === 'armed' && !passedCheckpoints.includes(q.id)
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMoveContainer}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#101010] shadow-2xl flex flex-col justify-between group select-none"
    >
      {/* Video Container */}
      <div className="absolute inset-0 z-0" onClick={togglePlay}>
        {resolvedVideoType === 'youtube' ? (
          <iframe
            key={ytId}
            ref={iframeRef}
            id={`datagan-yt-${ytId}`}
            src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&modestbranding=1&playsinline=1&controls=0`}
            title="Datagan Course Video Player"
            className="w-full h-full border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={localStreamSrc}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
            onPlay={() => {
              setIsPlaying(true);
              lastTimeRef.current = videoRef.current?.currentTime || 0;
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(tick, 250);
            }}
            onPause={() => {
              setIsPlaying(false);
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (timerRef.current) clearInterval(timerRef.current);
              if (propsRef.current.onEnded) propsRef.current.onEnded();
            }}
          >
            Tu navegador no soporta el tag de video HTML5.
          </video>
        )}
      </div>

      {/* Pill Superior Discreto de Sincronización y Checkpoint */}
      <div
        className={`relative z-20 p-3 flex items-center justify-between pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-[#202230]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2.5 text-[11px] text-[#e9eaf2] border border-[#3d4055] shadow-lg pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">Seguimiento Sincronizado</span>
          <span className="text-[#8e92a8] font-mono">{formatSeconds(currentDisplaySec)}</span>
          {nextArmedQuestion && (
            <>
              <span className="text-[#3d4055]">•</span>
              <span className="text-[#c0c4fc] text-[10px] flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-[#a374f9]" />
                Checkpoint a los {formatSeconds(nextArmedQuestion.timestampSeconds)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#202230]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] text-[#e9eaf2] border border-[#3d4055] shadow-lg">
            {resolvedVideoType === 'youtube' ? (
              <>
                <PlaySquare className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-[#6d28d2]" />
                <span>Cloudflare R2</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SUBTÍTULOS EN PANTALLA */}
      {/* Botón de subtítulos default: show=false; cuando se activa se renderiza el texto */}
      {showSubtitles && activeSubtitle && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[85%] text-center animate-in fade-in duration-100">
          <span className="inline-block bg-black/85 backdrop-blur-xs text-white text-xs sm:text-sm md:text-base font-semibold px-4 py-1.5 rounded-lg border border-white/10 shadow-2xl leading-relaxed">
            {activeSubtitle}
          </span>
        </div>
      )}

      {/* CONTROLES PERSONALIZADOS INFERIORES */}
      <div
        className={`relative z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-3 pt-6 flex flex-col gap-2 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* BARRA DE AVANCE CON CIRCULITOS DE CHECKPOINT */}
        <div
          ref={progressBarRef}
          onClick={handleSeekFromBar}
          onMouseMove={handleMouseMoveProgress}
          onMouseLeave={handleMouseLeaveProgress}
          className="relative w-full h-2.5 hover:h-3.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all flex items-center group/bar"
        >
          {/* Barra de progreso reproducido */}
          <div
            className="h-full bg-gradient-to-r from-[#6d28d2] via-[#8b5cf6] to-[#a374f9] rounded-full relative pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Cabezal de arrastre (Thumb) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-0 group-hover/bar:opacity-100 transition-opacity" />
          </div>

          {/* Tooltip de previsualización al pasar el mouse por la barra */}
          {hoverSeekSec !== null && hoverSeekPos !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-[#1b1d2a] text-[10px] text-white px-2 py-0.5 rounded border border-[#3d4055] font-mono shadow-md pointer-events-none"
              style={{ left: `${hoverSeekPos}px` }}
            >
              {formatSeconds(hoverSeekSec)}
            </div>
          )}

          {/* BOLITAS DE LOS CHECKPOINTS */}
          {/* Regla: pequeño círculo vacío en el segundo exacto. Al responderse se llena y no se muestra automáticamente más nunca. Solo al dar clic manual. */}
          {inVideoCheckpoints.map((cp) => {
            const isAnswered = passedCheckpoints.includes(cp.id);
            const cpPct = Math.min(100, Math.max(0, (cp.timestampSeconds / effectiveDuration) * 100));

            return (
              <div
                key={cp.id}
                onClick={(e) => handleCheckpointDotClick(cp, e)}
                style={{ left: `${cpPct}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 group/checkpoint cursor-pointer p-1"
                title={`Checkpoint a los ${formatSeconds(cp.timestampSeconds)} (${
                  isAnswered ? 'Respondido' : 'Pendiente'
                })`}
              >
                {isAnswered ? (
                  /* BOLITA LLENA (Completada/Respondida) */
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#101010] shadow-[0_0_8px_rgba(52,211,153,0.9)] transition-transform group-hover/checkpoint:scale-130 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                ) : (
                  /* PEQUEÑO CÍRCULO VACÍO (Pendiente) */
                  <div className="w-3.5 h-3.5 rounded-full bg-[#1b1d2a] border-2 border-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] transition-transform group-hover/checkpoint:scale-130" />
                )}

                {/* Tooltip flotante al pasar mouse sobre el circulito */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#202230] text-[10px] text-white px-2 py-1 rounded border border-[#3d4055] whitespace-nowrap shadow-xl opacity-0 group-hover/checkpoint:opacity-100 pointer-events-none transition-opacity flex items-center gap-1.5 z-40">
                  {isAnswered ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  )}
                  <span className="font-semibold">{formatSeconds(cp.timestampSeconds)}</span>
                  <span className="text-[#8e92a8]">
                    {isAnswered ? '(Respondido - Clic para ver)' : '(Pendiente)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* FILA DE BOTONES DE CONTROL */}
        <div className="flex items-center justify-between text-white pt-1">
          {/* Izquierda: Play/Pause, Volumen, Tiempos */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Volumen */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded-md hover:bg-white/10 text-white transition-colors cursor-pointer"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/30 rounded-lg accent-[#a374f9] cursor-pointer opacity-80 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>

            {/* Temporizador */}
            <div className="text-[12px] text-[#b7b9cd] font-mono tracking-tight ml-1">
              <span className="text-white font-semibold">{formatSeconds(currentDisplaySec)}</span>
              <span className="text-[#595c73] mx-1">/</span>
              <span>{formatSeconds(effectiveDuration)}</span>
            </div>
          </div>

          {/* Derecha: Botón de Subtítulos (default: show=false), Velocidad, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* BOTÓN DE SUBTÍTULOS (default: show=false) */}
            <button
              type="button"
              onClick={() => setShowSubtitles((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                showSubtitles
                  ? 'bg-[#6d28d2] text-white border-[#8b5cf6] shadow-[0_0_10px_rgba(109,40,210,0.6)]'
                  : 'bg-white/5 text-[#8e92a8] border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title={`Subtítulos (CC): ${showSubtitles ? 'Activados' : 'Desactivados'}`}
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span className="text-[11px]">CC</span>
            </button>

            {/* Selector de Velocidad */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-[#b7b9cd] hover:text-white transition-colors cursor-pointer"
              title="Velocidad de reproducción"
            >
              {playbackRate}x
            </button>

            {/* Botón de Pantalla Completa */}
            <button
              type="button"
              onClick={toggleContainerFullscreen}
              className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Tolerancia de 15s Superada */}
      {blurredPause && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 z-30">
          <div className="w-12 h-12 rounded-full bg-[#3d4055] flex items-center justify-center text-[#c0c4fc] mb-3 border border-[#4d516c]">
            <EyeOff className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Seguimiento Pausado por Inactividad</h4>
          <p className="text-xs text-[#b7b9cd] max-w-sm mb-4 leading-relaxed">
            El video se pausó tras permanecer más de 15 segundos fuera de la ventana.
          </p>
          <button
            type="button"
            onClick={handleResumeFromBlur}
            className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#6d28d2] hover:bg-[#591fb0] text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
          >
            <span>Continuar clase</span>
          </button>
        </div>
      )}
    </div>
  );
}
