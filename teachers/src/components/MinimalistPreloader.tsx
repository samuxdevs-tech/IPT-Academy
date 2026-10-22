'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Lightbulb, Check } from 'lucide-react';

const TEACHER_TIPS = [
  'Desde el panel principal puedes crear nuevos cursos, añadir módulos y publicar clases en cualquier momento.',
  'Al crear una tarea con rúbrica, tus alumnos sabrán con exactitud qué criterios se tendrán en cuenta.',
  'El calendario institucional mantiene a todos tus alumnos informados de las fechas de entrega y tutorías.',
  'Tus alumnos reciben los cambios de inmediato en su pantalla en cuanto publicas una nueva clase.',
  'Puedes calificar las tareas de tus estudiantes y dejarles notas detalladas o sugerencias paso a paso.',
];

const SESSION_KEY = 'ipt_preloader_admin_seen_v2';
const MIN_DISPLAY_MS = 2000;

export default function MinimalistPreloader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isFading, setIsFading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Si ya se mostró en esta sesión/pestaña, no interrumpir la navegación interna
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true') {
      return;
    }

    setMounted(true);
    setTipIndex(Math.floor(Math.random() * TEACHER_TIPS.length));

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

    // 1. Precargar rutas de Next.js en segundo plano
    subpages.forEach((p) => {
      try {
        router.prefetch(p);
      } catch {}
    });

    // 2. Rotación suave de consejos si la conexión es lenta
    const tipInterval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % TEACHER_TIPS.length);
        setTipFading(false);
      }, 250);
    }, 4500);

    // 3. Descargar anticipadamente todos los datos del panel docente
    let progressTimer: NodeJS.Timeout;

    progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + Math.floor(Math.random() * 8 + 4);
      });
    }, 120);

    const loadCloudData = async () => {
      try {
        await Promise.all([
          get(ref(db, 'courses')).catch(() => null),
          get(ref(db, 'lms_assignments')).catch(() => null),
          get(ref(db, 'lms_calendar')).catch(() => null),
          get(ref(db, 'metrics')).catch(() => null),
          get(ref(db, 'missions')).catch(() => null),
          get(ref(db, 'scenarios')).catch(() => null),
        ]);
      } catch (err) {
        console.warn('Precarga del panel administrativo completada con observaciones:', err);
      }
    };

    // Ejecutar precarga real asegurando el tiempo mínimo visual
    Promise.all([
      loadCloudData(),
      new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
    ]).then(() => {
      clearInterval(progressTimer);
      clearInterval(tipInterval);
      setProgress(100);
      setIsReady(true);

      setTimeout(() => {
        try {
          sessionStorage.setItem(SESSION_KEY, 'true');
        } catch {}
        setIsFading(true);
        setTimeout(() => {
          setMounted(false);
        }, 380);
      }, 350);
    });

    return () => {
      clearInterval(progressTimer);
      clearInterval(tipInterval);
    };
  }, [router]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparando el panel de administración"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        transition: 'opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isFading ? 0 : 1,
        pointerEvents: isFading ? 'none' : 'auto',
        userSelect: 'none',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo oficial */}
        <div style={{ position: 'relative', marginBottom: '28px' }}>
          <img
            src="/favicon.png"
            alt="IPT Course Studio"
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 4px 12px rgba(15, 23, 42, 0.08))',
            }}
          />
        </div>

        {/* Barra de progreso minimalista */}
        <div
          style={{
            width: '240px',
            height: '4px',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: isReady ? '#10b981' : '#6d28d2',
              borderRadius: '9999px',
              transition: 'width 0.2s ease-out, background-color 0.3s ease',
            }}
          />
        </div>

        {/* Estado en lenguaje 100% natural */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: isReady ? '#059669' : '#64748b',
            marginBottom: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isReady ? (
            <>
              <Check style={{ width: '13px', height: '13px' }} />
              <span>Todo listo</span>
            </>
          ) : (
            <span>Preparando tu panel docente...</span>
          )}
        </div>

        {/* Tarjeta de consejo útil */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 20px',
            width: '100%',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            opacity: tipFading ? 0 : 1,
            transform: tipFading ? 'translateY(4px)' : 'translateY(0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#6d28d2',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            <Lightbulb style={{ width: '13px', height: '13px' }} />
            <span>Consejo útil</span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: '#334155',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {TEACHER_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
