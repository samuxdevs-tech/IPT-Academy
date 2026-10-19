'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface LockToastProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export default function LockToast({
  message,
  onClose,
  durationMs = 4200
}: LockToastProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(durationMs);
  const startTimeRef = useRef<number>(Date.now());

  // Iniciar la transición de salida suave
  const triggerExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    // Duración de la animación de salida suave (450ms cubic-bezier)
    exitTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 450);
  }, [isExiting, onClose]);

  // Medir dimensiones del toast con ResizeObserver para trazar la línea LED exacta
  useEffect(() => {
    if (!containerRef.current) return;
    setIsMounted(true);
    setIsExiting(false);
    remainingTimeRef.current = durationMs;
    startTimeRef.current = Date.now();

    const updateBounds = () => {
      if (containerRef.current) {
        setBounds({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateBounds();
    const ro = new ResizeObserver(updateBounds);
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [message, durationMs]);

  // Temporizador para activar la salida suave cuando termine el tiempo
  useEffect(() => {
    if (!message || isExiting) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      autoCloseTimerRef.current = setTimeout(() => {
        triggerExit();
      }, remainingTimeRef.current);
    } else {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(remainingTimeRef.current - elapsed, 200);
    }

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [isPaused, message, isExiting, triggerExit]);

  if (!message) return null;

  return (
    <aside
      aria-label="Notificación de lección"
      className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        role="status"
        aria-live="polite"
        className={`relative overflow-hidden rounded-2xl bg-[#1e202e] text-white p-3.5 sm:p-4 shadow-[0_12px_45px_-8px_rgba(0,0,0,0.7),0_0_25px_rgba(245,158,11,0.2)] flex items-center gap-3.5 select-none transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExiting
            ? 'opacity-0 translate-y-4 scale-[0.96] pointer-events-none'
            : isMounted
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-95'
        }`}
      >
        {/* SVG de la Línea LED que rodea el perímetro del Toast */}
        {bounds.width > 0 && bounds.height > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-2xl"
            style={{
              filter: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 14px rgba(245, 158, 11, 0.45))'
            }}
          >
            <defs>
              <linearGradient id="led-toast-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="85%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>

            {/* Pista base sutil de fondo del borde */}
            <rect
              x="1.5"
              y="1.5"
              width={Math.max(bounds.width - 3, 0)}
              height={Math.max(bounds.height - 3, 0)}
              rx="15"
              fill="none"
              stroke="rgba(245, 158, 11, 0.22)"
              strokeWidth="1.5"
            />

            {/* Línea LED activa que rodea todo el perímetro */}
            <rect
              x="1.5"
              y="1.5"
              width={Math.max(bounds.width - 3, 0)}
              height={Math.max(bounds.height - 3, 0)}
              rx="15"
              fill="none"
              stroke="url(#led-toast-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="100"
              style={{
                strokeDasharray: '100',
                strokeDashoffset: '100',
                animation: `led-stroke-fill ${durationMs}ms linear forwards`,
                animationPlayState: isPaused ? 'paused' : 'running'
              }}
            />

            {/* Cabezal de luz LED (haz luminoso delantero blanco-dorado) */}
            <rect
              x="1.5"
              y="1.5"
              width={Math.max(bounds.width - 3, 0)}
              height={Math.max(bounds.height - 3, 0)}
              rx="15"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength="100"
              style={{
                strokeDasharray: '5 95',
                strokeDashoffset: '100',
                animation: `led-stroke-fill ${durationMs}ms linear forwards`,
                animationPlayState: isPaused ? 'paused' : 'running',
                filter: 'drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 12px #fbbf24)'
              }}
            />
          </svg>
        )}

        {/* Resplandor ambiental interior tenue */}
        <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none rounded-2xl" />

        {/* Ícono de Alerta con Insignia Ámbar */}
        <div className="relative z-10 w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
          <AlertCircle className="w-5 h-5" />
        </div>

        {/* Texto del Mensaje */}
        <div className="relative z-10 flex-1 text-xs sm:text-[13px] leading-relaxed text-[#f3f4f8] font-medium pr-1">
          {message}
        </div>

        {/* Botón de Cierre Manual Accesible */}
        <button
          type="button"
          onClick={triggerExit}
          className="relative z-10 p-1.5 rounded-lg text-[#9194ac] hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Cerrar notificación"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
