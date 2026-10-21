'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MinimalistPagePreloader() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Precalentar y precargar en segundo plano todas las subpáginas para navegación 100% instantánea
    const targetSubpages = [
      '/',
      '/assignments',
      '/calendar',
      '/grades',
      '/course',
      '/scenarios',
      '/verify',
      '/legal',
    ];

    targetSubpages.forEach((path) => {
      try {
        router.prefetch(path);
      } catch {
        // Ignorar si el navegador limita prefetch
      }
    });

    // 2. Progreso continuo y orgánico durante ~4.2 segundos (4000ms a 4500ms)
    const startTime = performance.now();
    const totalDuration = 4200; // 4.2 segundos exactos

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const rawProgress = Math.min(100, (elapsed / totalDuration) * 100);

      // Curva de aceleración/desaceleración suave
      setProgress(rawProgress);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setIsFading(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 500); // 500ms para fade out suave
      }
    }, 30);

    return () => clearInterval(timer);
  }, [router]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-99999 flex flex-col items-center justify-center bg-[#ffffff] transition-opacity duration-500 ease-out select-none pointer-events-auto ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center space-y-7">
        {/* Logo minimalista con pulso sutil */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-xl animate-pulse" />
          <img
            src="/favicon.png"
            alt=""
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain relative z-10 transition-transform duration-700 ease-out"
          />
        </div>

        {/* Barra de progreso minimalista con color (Estilo Big Tech, Cero texto) */}
        <div className="w-48 sm:w-56 h-1.5 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
