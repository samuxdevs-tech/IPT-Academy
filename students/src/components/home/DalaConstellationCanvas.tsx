'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  // Semillas deterministas
  seed1: number;
  seed2: number;
  seed3: number;
  lobe: number; // -1: Hemisferio Izquierdo, 1: Hemisferio Derecho
  sulcusIdx: number; // Índice de circunvolución cerebral
  perimEdge: number; // 0: Top, 1: Right, 2: Bottom, 3: Left
  perimPos: number; // Posición [0, 1] a lo largo del borde
  faviconGroup: 'leftWing' | 'spine' | 'dot' | 'pWing' | 'tWing';
  faviconNormX: number;
  faviconNormY: number;
}

const DALA_PALETTE = [
  '#8052ff', // Electric Iris
  '#9d78ff', // Soft Lavender
  '#ffb829', // Saffron Spark
  '#15846e', // Deep Verdant
  '#c0c4fc', // Periwinkle Gem
  '#a855f7', // Vivid Violet
  '#38bdf8', // Cyan Stream
];

export default function DalaConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse tracking interactivo
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Cantidad de partículas calibrada
    const PARTICLE_COUNT = width < 768 ? 240 : 420;
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color = DALA_PALETTE[i % DALA_PALETTE.length];
      const baseAlpha = 0.45 + Math.random() * 0.45;
      const seed1 = Math.random();
      const seed2 = Math.random();
      const seed3 = Math.random();

      // Determinación de asignación al Favicon oficial IPT (viewBox 0 0 64 64)
      let faviconGroup: Particle['faviconGroup'] = 'leftWing';
      let fnX = 0;
      let fnY = 0;

      if (i < PARTICLE_COUNT * 0.35) {
        // Ala Izquierda (Libro Abierto)
        faviconGroup = 'leftWing';
        const t = seed2;
        const u = seed3;
        fnX = 6 + t * 20;
        fnY = 20 + t * 10 + u * 26;
      } else if (i < PARTICLE_COUNT * 0.45) {
        // Columna Central 'I'
        faviconGroup = 'spine';
        fnX = 28 + seed2 * 8;
        fnY = 30 + seed3 * 26;
      } else if (i < PARTICLE_COUNT * 0.52) {
        // Punto Cúbico Flotante de la 'I'
        faviconGroup = 'dot';
        fnX = 28 + seed2 * 8;
        fnY = 19 + seed3 * 8;
      } else if (i < PARTICLE_COUNT * 0.78) {
        // Ala Derecha 'P'
        faviconGroup = 'pWing';
        fnX = 38 + seed2 * 9;
        fnY = 18 + seed3 * 36;
      } else {
        // Ala Derecha 'T'
        faviconGroup = 'tWing';
        fnX = 49 + seed2 * 9;
        fnY = 10 + seed3 * 38;
      }

      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        targetAngle: 0,
        size: 2.4 + Math.random() * 2.8,
        color,
        alpha: baseAlpha,
        baseAlpha,
        seed1,
        seed2,
        seed3,
        lobe: i % 2 === 0 ? -1 : 1,
        sulcusIdx: i % 5,
        perimEdge: i % 4,
        perimPos: (i / PARTICLE_COUNT) * 4 % 1,
        faviconGroup,
        faviconNormX: (fnX - 32) / 32, // centrado normalizado [-1, 1]
        faviconNormY: (fnY - 32) / 32,
      });
    }

    let time = 0;

    // Helper: Dibuja flecha/triángulo equilátero con rotación física exacta
    function drawArrowTriangle(
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      r: number,
      rot: number,
      color: string,
      alpha: number
    ) {
      context.save();
      context.translate(cx, cy);
      context.rotate(rot);
      context.beginPath();

      // Triángulo isósceles que actúa como punta de flecha apuntando hacia adelante (rot)
      context.moveTo(r * 1.35, 0); // Vértice frontal (punta de flecha)
      context.lineTo(-r * 0.8, -r * 0.85); // Vértice trasero izquierdo
      context.lineTo(-r * 0.4, 0); // Hendidura trasera
      context.lineTo(-r * 0.8, r * 0.85); // Vértice trasero derecho
      context.closePath();

      context.fillStyle = color;
      context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
      context.fill();

      // Trazo fino de definición
      context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      context.lineWidth = 0.6;
      context.stroke();

      context.restore();
    }

    // Calculador Dinámico Físico: Mide rectángulos en pantalla usando getBoundingClientRect()
    function getElementViewportRect(id: string): DOMRect | null {
      const el = document.getElementById(id);
      if (!el) return null;
      return el.getBoundingClientRect();
    }

    // FASE 1: CEREBRO ANATÓMICO (Hemisferio Izquierdo y Derecho con Circunvoluciones Claras)
    function getBrainCoords(
      p: Particle,
      center: { x: number; y: number; r: number },
      t: number
    ): { x: number; y: number; angle: number } {
      const cx = center.x;
      const cy = center.y;
      const brainR = Math.max(center.r, 120);

      // Separación de hemisferios (Fisura longitudinal)
      const fissureGap = brainR * 0.16;
      const hemiCenterX = cx + p.lobe * (brainR * 0.45 + fissureGap);

      // Circunvoluciones anatómicas (Sulci y Gyri)
      // Un hemisferio se proyecta como una silueta elíptica anatómica:
      // Frontal (arriba), Temporal/Parietal (lados), Occipital (abajo)
      const u = p.seed2; // Parámetro a lo largo del lóbulo
      const theta = u * Math.PI * 2;

      // Forma base del hemisferio
      let rx = brainR * 0.44;
      let ry = brainR * 0.62;

      // Deformación anatómica de la corteza cerebral:
      // Polo frontal más ancho, depresión silviana lateral y polo occipital curvado
      const corticalProfile =
        1.0 +
        0.18 * Math.sin(theta * 2 + p.lobe) +
        0.08 * Math.cos(theta * 4) +
        0.04 * Math.sin(theta * 8 + t * 0.8);

      // 70% de partículas delinean surcos corticales (pliegues de la materia gris)
      if (p.seed1 < 0.72) {
        const sulcusRadius = (0.28 + 0.65 * Math.sqrt(p.seed3)) * corticalProfile;
        const sx = hemiCenterX + p.lobe * (rx * sulcusRadius * Math.sin(theta));
        const sy = cy + ry * sulcusRadius * Math.cos(theta);

        // Sinapsis / Ondulación viva de impulsos
        const wave = Math.sin(t * 1.5 + p.sulcusIdx * 1.2 + p.id * 0.05) * 4;
        const angle = Math.atan2(cy - sy, hemiCenterX - sx) + (p.lobe * Math.PI) / 2 + wave * 0.05;

        return { x: sx, y: sy + wave, angle };
      } else {
        // 30% de partículas recorren la fisura central y el tallo basal
        const depth = (p.seed2 - 0.5) * ry * 1.6;
        const sx = cx + p.lobe * (fissureGap * 0.8 + Math.abs(Math.sin(depth * 0.05)) * 6);
        const sy = cy + depth;
        const angle = p.lobe > 0 ? 0 : Math.PI;

        return { x: sx, y: sy, angle };
      }
    }

    // Helper: Coloca una partícula en el perímetro de un rectángulo y apunta al centro
    function getRectanglePerimeterCoords(
      p: Particle,
      rect: DOMRect,
      expand: number
    ): { x: number; y: number; angle: number } {
      const left = rect.left - expand;
      const top = rect.top - expand;
      const width = rect.width + expand * 2;
      const height = rect.height + expand * 2;
      const right = left + width;
      const bottom = top + height;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let px = left;
      let py = top;

      // Distribuir a lo largo de los 4 bordes
      const pos = p.seed2;
      switch (p.perimEdge) {
        case 0: // Borde Superior
          px = left + pos * width;
          py = top;
          break;
        case 1: // Borde Derecho
          px = right;
          py = top + pos * height;
          break;
        case 2: // Borde Inferior
          px = left + pos * width;
          py = bottom;
          break;
        case 3: // Borde Izquierdo
          px = left;
          py = top + pos * height;
          break;
      }

      // IMPORTANTE: Flechas apuntando físicamente HACIA EL CENTRO del rectángulo imaginario
      const angle = Math.atan2(centerY - py, centerX - px);

      return { x: px, y: py, angle };
    }

    // FASE 4: FAVICON OFICIAL IPT COURSE (Isotipo de libro abierto + 'I' + 'P' + 'T')
    function getFaviconCoords(
      p: Particle,
      anchor: { x: number; y: number; size: number },
      t: number
    ): { x: number; y: number; angle: number } {
      const scale = anchor.size * 0.9;
      const targetX = anchor.x + p.faviconNormX * scale;
      const targetY = anchor.y + p.faviconNormY * scale;

      // Orientación geométrica coordinada con las alas del logotipo
      let angle = 0;
      if (p.faviconGroup === 'leftWing') {
        angle = -Math.PI / 6; // Inclinación isométrica izquierda
      } else if (p.faviconGroup === 'dot') {
        angle = t * 0.8; // Giro suave del punto brillante
      } else if (p.faviconGroup === 'spine') {
        angle = Math.PI / 2; // Vertical hacia arriba
      } else {
        angle = Math.PI / 6; // Inclinación isométrica derecha
      }

      return { x: targetX, y: targetY, angle };
    }

    function smoothStep(val: number): number {
      const c = Math.max(0, Math.min(1, val));
      return c * c * (3 - 2 * c);
    }

    // Bucle Principal de Renderizado Físico
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Medición dinámica en píxeles reales de las secciones ancla
      const heroAnchorRect = getElementViewportRect('hero-brain-anchor');
      const misionRect = getElementViewportRect('mision-card');
      const visionRect = getElementViewportRect('vision-card');
      const pricingRect = getElementViewportRect('pricing-cards-container');
      const cryptoRect = getElementViewportRect('crypto-anchor');

      // Centro del viewport
      const vhHalf = height * 0.5;

      // Ponderación de cercanía de cada sección al centro de la pantalla
      let heroWeight = 0;
      let missionWeight = 0;
      let pricingWeight = 0;
      let cryptoWeight = 0;

      if (heroAnchorRect) {
        const heroMid = heroAnchorRect.top + heroAnchorRect.height / 2;
        const d = Math.abs(heroMid - vhHalf) / (height * 0.85);
        heroWeight = Math.max(0, 1 - d);
      }

      if (misionRect && visionRect) {
        const misMid = (misionRect.top + visionRect.bottom) / 2;
        const d = Math.abs(misMid - vhHalf) / (height * 0.85);
        missionWeight = Math.max(0, 1 - d);
      }

      if (pricingRect) {
        const prMid = pricingRect.top + pricingRect.height / 2;
        const d = Math.abs(prMid - vhHalf) / (height * 0.85);
        pricingWeight = Math.max(0, 1 - d);
      }

      if (cryptoRect) {
        const crMid = cryptoRect.top + cryptoRect.height / 2;
        const d = Math.abs(crMid - vhHalf) / (height * 0.85);
        cryptoWeight = Math.max(0, 1 - d);
      }

      // Si estamos muy arriba (scrollY < 100), hero manda
      if (window.scrollY < 80) {
        heroWeight = 1.0;
        missionWeight = 0;
        pricingWeight = 0;
        cryptoWeight = 0;
      }

      // Si estamos en el fondo absoluto de la página, crypto manda
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 120) {
        cryptoWeight = 1.0;
        pricingWeight = 0;
        missionWeight = 0;
        heroWeight = 0;
      }

      // Normalizar pesos
      const totalW = heroWeight + missionWeight + pricingWeight + cryptoWeight || 1;
      const wHero = heroWeight / totalW;
      const wMission = missionWeight / totalW;
      const wPricing = pricingWeight / totalW;
      const wCrypto = cryptoWeight / totalW;

      // Centro dinámico del cerebro
      const brainCenter = heroAnchorRect
        ? {
            x: heroAnchorRect.left + heroAnchorRect.width * 0.5,
            y: heroAnchorRect.top + heroAnchorRect.height * 0.5,
            r: Math.min(heroAnchorRect.width, heroAnchorRect.height) * 0.44,
          }
        : {
            x: width * 0.72,
            y: height * 0.45,
            r: Math.min(width * 0.22, 170),
          };

      // Centro dinámico del Favicon
      const cryptoCenter = cryptoRect
        ? {
            x: cryptoRect.left + cryptoRect.width * 0.5,
            y: cryptoRect.top + cryptoRect.height * 0.5,
            size: Math.min(cryptoRect.width * 0.8, 110),
          }
        : {
            x: width * 0.5,
            y: height * 0.75,
            size: 90,
          };

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Coordenadas de Cerebro
        const brain = getBrainCoords(p, brainCenter, time);

        // 2. Coordenadas de Misión y Visión (Dos Rectángulos con flechas apuntando al centro)
        let missionX = brain.x;
        let missionY = brain.y;
        let missionAngle = brain.angle;

        if (misionRect && visionRect) {
          const targetCard = p.lobe === -1 ? misionRect : visionRect;
          const rectRes = getRectanglePerimeterCoords(p, targetCard, 14);
          missionX = rectRes.x;
          missionY = rectRes.y;
          missionAngle = rectRes.angle;
        }

        // 3. Coordenadas de Inversión y Membresías (Un solo rectángulo grande que abarca los 4 planes)
        let pricingX = brain.x;
        let pricingY = brain.y;
        let pricingAngle = brain.angle;

        if (pricingRect) {
          const rectRes = getRectanglePerimeterCoords(p, pricingRect, 22);
          pricingX = rectRes.x;
          pricingY = rectRes.y;
          pricingAngle = rectRes.angle;
        }

        // 4. Coordenadas de Certificación Criptográfica (Favicon de IPT Course)
        const crypto = getFaviconCoords(p, cryptoCenter, time);

        // Interpolación ponderada multidimensional
        const finalX =
          brain.x * wHero +
          missionX * wMission +
          pricingX * wPricing +
          crypto.x * wCrypto;

        const finalY =
          brain.y * wHero +
          missionY * wMission +
          pricingY * wPricing +
          crypto.y * wCrypto;

        // Suavizado cinemático
        p.x += (finalX - p.x) * 0.12;
        p.y += (finalY - p.y) * 0.12;

        // Ángulo de orientación dominante
        let targetAngle = brain.angle;
        if (wMission > 0.4) {
          targetAngle = missionAngle;
        } else if (wPricing > 0.4) {
          targetAngle = pricingAngle;
        } else if (wCrypto > 0.4) {
          targetAngle = crypto.angle;
        }

        // Suavizado angular sin salto periódico
        let da = (targetAngle - p.angle) % (Math.PI * 2);
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        p.angle += da * 0.14;

        // Interacción táctica con el cursor (repulsión suave)
        if (mouse.active) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 90 && mdist > 1) {
            const push = (1 - mdist / 90) * 18;
            p.x += (mdx / mdist) * push;
            p.y += (mdy / mdist) * push;
          }
        }

        // Dibujar flecha/triángulo de la partícula
        drawArrowTriangle(
          ctx,
          p.x,
          p.y,
          p.size,
          p.angle,
          p.color,
          p.alpha
        );
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 bg-[#000000]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
