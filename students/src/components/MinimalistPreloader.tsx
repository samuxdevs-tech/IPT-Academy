'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MinimalistPreloader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Comprobar si ya se mostró en esta pestaña/sesión
    if (sessionStorage.getItem('ipt_preloader_seen_v1') === 'true') {
      return;
    }

    setMounted(true);

    const subpages = [
      '/',
      '/assignments',
      '/calendar',
      '/grades',
      '/course',
      '/scenarios',
      '/verify',
      '/legal',
    ];

    // Precargar todas las rutas de forma asíncrona
    subpages.forEach((p) => {
      try {
        router.prefetch(p);
      } catch {}
    });

    const start = performance.now();
    const duration = 4000; // 4 segundos

    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        sessionStorage.setItem('ipt_preloader_seen_v1', 'true');
        setIsFading(true);
        setTimeout(() => {
          setMounted(false); // Desmontaje completo del DOM
        }, 400);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [router]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        transition: 'opacity 0.4s ease-out',
        opacity: isFading ? 0 : 1,
        pointerEvents: isFading ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <img
          src="/favicon.png"
          alt=""
          style={{ width: '64px', height: '64px', objectFit: 'contain' }}
        />
        <div
          style={{
            width: '220px',
            height: '4px',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #2563eb, #4f46e5, #0284c7)',
              borderRadius: '9999px',
              transition: 'width 0.04s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
