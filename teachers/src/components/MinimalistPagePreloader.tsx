'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MinimalistPagePreloader() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Precargar todas las subpáginas docentes en memoria
    const targetSubpages = [
      '/',
      '/assignments',
      '/calendar',
      '/analytics',
      '/metrics',
      '/missions',
      '/roles',
      '/scenarios',
      '/nivel-2',
      '/nivel-3',
      '/nivel-4',
    ];

    targetSubpages.forEach((path) => {
      try {
        router.prefetch(path);
      } catch {
        // Ignorar si el navegador limita prefetch
      }
    });

    // 2. Progreso continuo y orgánico durante ~4.2 segundos
    const startTime = performance.now();
    const totalDuration = 4200; // 4.2 segundos

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const rawProgress = Math.min(100, (elapsed / totalDuration) * 100);

      setProgress(rawProgress);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setIsFading(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 500);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [router]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-99999 flex flex-col items-center justify-center bg-[#0d0f1a] transition-opacity duration-500 ease-out select-none pointer-events-auto ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center space-y-7">
        {/* Logo minimalista con resplandor */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl animate-pulse" />
          <img
            src="/favicon.png"
            alt=""
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain relative z-10"
          />
        </div>

        {/* Barra de progreso con color (Sin texto) */}
        <div className="w-48 sm:w-56 h-1.5 bg-[#1b1e32] rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
