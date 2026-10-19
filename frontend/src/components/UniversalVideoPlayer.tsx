'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, PlaySquare, EyeOff, Sparkles, Maximize, Minimize } from 'lucide-react';
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

  // Variables de control de tiempo y cruce de umbral
  const lastTimeRef = useRef<number>(initialTime);
  const maxWatchedRef = useRef<number>(initialTime);
  const lastHeartbeatRef = useRef<number>(initialTime);

  // Estado de las preguntas: 'armed' -> 'shown' -> 'answered'
  const questionsStateRef = useRef<QuestionStateItem[]>([]);

  // Estados visuales del reproductor
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDisplaySec, setCurrentDisplaySec] = useState(initialTime);
  const [blurredPause, setBlurredPause] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mantener callbacks y props actualizados sin re-montar el reproductor
  const propsRef = useRef({
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent
  });

  propsRef.current = {
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent
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

  const ytId = videoType === 'youtube' ? getYouTubeId(videoUrl) : '';

  // Pausar y reanudar video de forma unificada
  const pauseVideo = useCallback(() => {
    if (videoType === 'youtube' && ytPlayerRef.current?.pauseVideo) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {}
    } else if (videoType === 'local' && videoRef.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
      } catch (e) {}
    }
  }, [videoType]);

  const playVideo = useCallback(() => {
    if (videoType === 'youtube' && ytPlayerRef.current?.playVideo) {
      try {
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    } else if (videoType === 'local' && videoRef.current) {
      try {
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
  }, [videoType]);

  // Escuchar comandos de seek desde el padre
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      if (videoType === 'youtube' && ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(seekToTime, true);
        } catch (e) {}
      } else if (videoType === 'local' && videoRef.current) {
        videoRef.current.currentTime = seekToTime;
      }
    }
  }, [seekToTime, videoType]);

  // Si el modal está abierto, garantizar que no se pueda reproducir por debajo
  const prevModalRef = useRef(isPausedByModal);
  useEffect(() => {
    if (isPausedByModal) {
      pauseVideo();
    } else if (prevModalRef.current && !isPausedByModal) {
      questionsStateRef.current.forEach((q) => {
        if (q.status === 'shown' && !passedCheckpoints.includes(q.id)) {
          q.status = 'armed';
        }
      });
      playVideo();
    }
    prevModalRef.current = isPausedByModal;
  }, [isPausedByModal, pauseVideo, playVideo, passedCheckpoints]);

  // =========================================================================
  // MOTOR DE TICKING & CRUCE DE UMBRAL (Regla: last < q.at && now >= q.at)
  // =========================================================================
  const tick = useCallback(() => {
    let now = 0;
    let rate = 1;

    if (videoType === 'youtube') {
      if (!ytPlayerRef.current?.getCurrentTime) return;
      try {
        now = ytPlayerRef.current.getCurrentTime();
        rate = ytPlayerRef.current.getPlaybackRate ? ytPlayerRef.current.getPlaybackRate() : 1;
      } catch (e) {
        return;
      }
    } else if (videoType === 'local' && videoRef.current) {
      now = videoRef.current.currentTime;
      rate = videoRef.current.playbackRate || 1;
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

    // Si el tiempo actual alcanzó o sobrepasó una pregunta pendiente (armed), disparar
    for (const q of questionsStateRef.current) {
      if (q.status !== 'armed') continue;

      if (now >= q.timestampSeconds) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        pauseVideo();
        q.status = 'shown';

        if (now > q.timestampSeconds + 0.5) {
          if (videoType === 'youtube' && ytPlayerRef.current?.seekTo) {
            try {
              ytPlayerRef.current.seekTo(q.timestampSeconds, true);
            } catch (e) {}
          } else if (videoType === 'local' && videoRef.current) {
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
  }, [videoType, pauseVideo]);

  // =========================================================================
  // INTEGRACIÓN CON YOUTUBE IFRAME PLAYER API
  // =========================================================================
  useEffect(() => {
    if (videoType !== 'youtube' || !ytId) return;

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
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;

              // PLAYING (event.data === 1)
              if (event.data === 1) {
                if (propsRef.current.onTelemetryEvent) {
                  try {
                    propsRef.current.onTelemetryEvent('video_started', ytPlayerRef.current?.getCurrentTime?.() || 0);
                  } catch (e) {}
                }

                const hasModalOpen = questionsStateRef.current.some((q) => q.status === 'shown') || propsRef.current.isPausedByModal;
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
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }

                // ENDED (event.data === 0)
                if (event.data === 0) {
                  const pendingQ = questionsStateRef.current.find((q) => q.status === 'armed');
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
  }, [videoType, ytId, initialTime, tick]);

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

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl || (videoType === 'youtube' && !ytId)) {
    return (
      <div className="w-full aspect-video bg-[#202230] rounded-xl flex flex-col items-center justify-center text-[#9194ac] p-6">
        <Video className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-base font-medium">Esta lección aún no tiene un video configurado.</p>
        <p className="text-xs text-[#595c73] mt-1">Puedes agregar un video local o de YouTube desde el panel de administración.</p>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const localStreamSrc = 
    videoUrl.startsWith('http') || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:') || videoUrl.startsWith('/')
      ? videoUrl 
      : `http://localhost:4000${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;

  const nextArmedQuestion = questionsStateRef.current.find((q) => q.status === 'armed');

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#101010] shadow-2xl flex flex-col justify-between group"
    >
      {/* Video Container */}
      <div className="absolute inset-0 z-0">
        {videoType === 'youtube' ? (
          <iframe
            key={ytId}
            ref={iframeRef}
            id={`datagan-yt-${ytId}`}
            src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&modestbranding=1&playsinline=1`}
            title="Datagan Course Video Player"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={localStreamSrc}
            controls
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => {
              lastTimeRef.current = videoRef.current?.currentTime || 0;
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(tick, 250);
            }}
            onPause={() => {
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            onEnded={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (propsRef.current.onEnded) propsRef.current.onEnded();
            }}
          >
            Tu navegador no soporta el tag de video HTML5.
          </video>
        )}
      </div>

      {/* Pill Superior Discreto de Sincronización y Checkpoint */}
      <div className="relative z-10 p-3 flex items-center justify-between pointer-events-none">
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
          <button
            type="button"
            onClick={toggleContainerFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="bg-[#202230]/90 backdrop-blur-md min-w-[44px] min-h-[44px] p-2.5 rounded-full text-[#b7b9cd] hover:text-white border border-[#3d4055] shadow-lg transition-colors cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <div className="bg-[#202230]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] text-[#e9eaf2] border border-[#3d4055] shadow-lg">
            {videoType === 'youtube' ? (
              <>
                <PlaySquare className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-[#6d28d2]" />
                <span>Video Local</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Tolerancia de 15s Superada */}
      {blurredPause && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 z-30">
          <div className="w-12 h-12 rounded-full bg-[#3d4055] flex items-center justify-center text-[#c0c4fc] mb-3 border border-[#4d516c]">
            <EyeOff className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">
            Seguimiento Pausado por Inactividad
          </h4>
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
