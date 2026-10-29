'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Lightbulb, Check } from 'lucide-react';

const HELPFUL_TIPS = [
  'En el Calendario puedes ver siempre la fecha y hora de tus próximas clases y entregas.',
  'Puedes enviar tus tareas en PDF o Word y ver las notas y comentarios que te deje tu profesor.',
  'Tu avance se guarda de forma automática para que continúes tus clases justo donde las dejaste.',
  'Al completar todas tus clases y aprobar tus tareas, podrás consultar y descargar tu diploma oficial.',
  'Si necesitas ayuda con un tema, el tutor de la plataforma está disponible en la esquina inferior.',
  'En cualquier momento puedes aumentar el tamaño de letra desde la esquina superior para leer más cómodo.',
];

const SESSION_KEY = 'ipt_preloader_student_seen_v2';
const MIN_DISPLAY_MS = 300; // Transición armónica sin retardo artificial

export default function MinimalistPreloader() {
  const router = useRouter();
  const pathname = usePathname();
  const isStudyPanel = pathname?.startsWith('/course');
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isFading, setIsFading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // La pantalla de carga solo debe existir para el panel de estudio (/course)
    if (!isStudyPanel) return;

    // Si ya se cargó en esta sesión/pestaña, no interrumpir la navegación interna
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true') {
      return;
    }

    setMounted(true);
    // Seleccionar un consejo inicial aleatorio
    setTipIndex(Math.floor(Math.random() * HELPFUL_TIPS.length));

    const subpages = [
      '/',
      '/assignments',
      '/calendar',
      '/grades',
      '/course',
      '/scenarios',
      '/certificate',
      '/verify',
      '/legal',
    ];

    // 1. Precargar rutas de Next.js en segundo plano
    subpages.forEach((p) => {
      try {
        router.prefetch(p);
      } catch {}
    });

    // 2. Rotación suave de consejos si la conexión tarda más
    const tipInterval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % HELPFUL_TIPS.length);
        setTipFading(false);
      }, 250);
    }, 4500);

    // 3. Descargar anticipadamente todos los datos del aula desde la nube
    const startTime = Date.now();
    let progressTimer: NodeJS.Timeout;

    // Simulación de avance suave hacia el 85% mientras la nube responde
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
          get(ref(db, 'lms_live_sessions')).catch(() => null),
          fetch('https://ipt-course-api.samuxdevs.workers.dev/api/assignments').catch(() => null),
        ]);
      } catch (err) {
        console.warn('Precarga de datos en segundo plano completada con observaciones:', err);
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

      // Cierre con desvanecimiento elegante
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
  }, [router, isStudyPanel]);

  if (!isStudyPanel || !mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparando el aula virtual"
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
            alt="IPT Academy"
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
              backgroundColor: isReady ? '#10b981' : '#0f0f0f',
              borderRadius: '9999px',
              transition: 'width 0.2s ease-out, background-color 0.3s ease',
            }}
          />
        </div>

        {/* Estado en lenguaje 100% natural y comprensible */}
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
            <span>Preparando tu aula virtual...</span>
          )}
        </div>

        {/* Tarjeta de consejo útil / Tooltip en lenguaje claro */}
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
              color: '#0284c7',
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
            {HELPFUL_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
