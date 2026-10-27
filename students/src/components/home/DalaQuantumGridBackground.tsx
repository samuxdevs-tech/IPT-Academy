'use client';

import React, { useEffect, useRef } from 'react';

export default function DalaQuantumGridBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    let targetX = window.innerWidth * 0.5;
    let targetY = 300;
    let currentX = targetX;
    let currentY = targetY;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const updatePhysics = () => {
      // Suavizado cinemático lerp del haz de luz
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      container.style.setProperty('--spotlight-x', `${currentX}px`);
      container.style.setProperty('--spotlight-y', `${currentY}px`);

      rafId = requestAnimationFrame(updatePhysics);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]"
      style={
        {
          '--spotlight-x': '50vw',
          '--spotlight-y': '300px',
        } as React.CSSProperties
      }
    >
      {/* 1. Haz de Luz Violeta Ambiental Superior (Ambient Crown) */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#8052ff]/20 via-[#8052ff]/5 to-transparent rounded-full blur-[140px] opacity-70" />

      {/* 2. Haz Secundario Esmeralda Verdant (Equilibrio de Temperatura Dala) */}
      <div className="absolute top-[200px] right-[-100px] w-[600px] h-[600px] bg-[#15846e]/10 rounded-full blur-[160px] opacity-40" />

      {/* 3. Malla Topológica de Grid Cuántico (Patrón SVG de micro-retícula 32x32) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.14] stroke-[#ffffff]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="quantumGridPattern"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="0.8"
            />
            {/* Micro-puntos de intersección arquitectónica */}
            <circle cx="36" cy="36" r="1" fill="#8052ff" />
          </pattern>

          {/* Máscara de desvanecimiento hacia los bordes y el fondo */}
          <radialGradient id="gridVignette" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridVignette)" />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="url(#quantumGridPattern)"
          mask="url(#gridMask)"
        />
      </svg>

      {/* 4. Foco Interactivo Especular que sigue al ratón suavemente */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-opacity duration-500 opacity-60"
        style={{
          left: 'var(--spotlight-x)',
          top: 'var(--spotlight-y)',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(128, 82, 255, 0.15) 0%, rgba(128, 82, 255, 0.04) 40%, transparent 70%)',
        }}
      />

      {/* 5. Línea de horizonte topológico sutil con desvanecimiento inferior absoluto */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#000000]/40 to-[#000000] pointer-events-none" />
    </div>
  );
}
