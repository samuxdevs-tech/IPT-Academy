'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MinimalistPreloader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ipt_preloader_admin_seen_v1') === 'true') {
      return;
    }

    setMounted(true);

    const subpages = [
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

    subpages.forEach((p) => {
      try {
        router.prefetch(p);
      } catch {}
    });

    const start = performance.now();
    const duration = 4000;

    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        sessionStorage.setItem('ipt_preloader_admin_seen_v1', 'true');
        setIsFading(true);
        setTimeout(() => {
          setMounted(false);
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
        backgroundColor: '#0f111e',
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
            backgroundColor: '#1e2238',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1, #10b981)',
              borderRadius: '9999px',
              transition: 'width 0.04s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
