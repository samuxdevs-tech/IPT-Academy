'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  seed1: number;
  seed2: number;
  seed3: number;
  lobe: number;
  pillarIdx: number;
  ringIdx: number;
  sealAngle: number;
  sealRadiusNorm: number;
}

const DALA_PALETTE = [
  '#8052ff', // Electric Iris (Primary brand)
  '#8052ff', // Electric Iris (Weighted)
  '#ffb829', // Saffron Spark (Accent)
  '#15846e', // Deep Verdant
  '#a855f7', // Vivid Violet
  '#38bdf8', // Cyan Stream
  '#ec4899', // Magenta Spark
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

    // Mouse tracking
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

    // Resize handling with HiDPI
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

    // Particle Generation: Balanced for elegance and zero visual noise
    const PARTICLE_COUNT = width < 768 ? 260 : 480;
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color = DALA_PALETTE[i % DALA_PALETTE.length];
      const baseAlpha = 0.35 + Math.random() * 0.5;
      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.015,
        size: 2.2 + Math.random() * 2.8,
        color,
        alpha: baseAlpha,
        baseAlpha,
        seed1: Math.random(),
        seed2: Math.random(),
        seed3: Math.random(),
        lobe: i % 2 === 0 ? -1 : 1,
        pillarIdx: i % 4,
        ringIdx: i % 3,
        sealAngle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.15,
        sealRadiusNorm: Math.random(),
      });
    }

    // Scroll progress tracker
    let currentScrollProgress = 0;
    let targetScrollProgress = 0;

    const handleScroll = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      targetScrollProgress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    let time = 0;

    // Helper: Draw Outlined Equilateral Triangle
    function drawTriangle(
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
      const a0 = 0;
      const a1 = (2 * Math.PI) / 3;
      const a2 = (4 * Math.PI) / 3;
      context.moveTo(r * Math.cos(a0), r * Math.sin(a0));
      context.lineTo(r * Math.cos(a1), r * Math.sin(a1));
      context.lineTo(r * Math.cos(a2), r * Math.sin(a2));
      context.closePath();

      context.strokeStyle = color;
      context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
      context.lineWidth = 1.0;
      context.stroke();
      context.restore();
    }

    // Target 1: The Dala Brain & Neural Constellation (Hero: Right Column)
    function getBrainTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      const isMobile = w < 1024;
      const cx = isMobile ? w * 0.5 : w * 0.74;
      const cy = isMobile ? h * 0.35 : h * 0.48;
      const maxR = Math.min(w * 0.22, h * 0.36, 210);

      // Ambient scattering (low opacity)
      if (p.seed1 < 0.16) {
        return {
          x: w * 0.08 + p.seed2 * (w * 0.84) + Math.sin(t * 0.5 + p.id) * 15,
          y: h * 0.08 + p.seed3 * (h * 0.84) + Math.cos(t * 0.4 + p.id) * 15,
        };
      }

      const lobeOffsetX = p.lobe * (maxR * 0.42);
      const theta = p.seed2 * Math.PI * 2;
      const contour =
        1 +
        0.2 * Math.sin(3 * theta + p.lobe) +
        0.12 * Math.cos(5 * theta) +
        0.06 * Math.sin(7 * theta + t * 0.7);
      const rad = Math.sqrt(p.seed3) * maxR * 0.56 * contour;

      const lx = lobeOffsetX + rad * Math.cos(theta) * 0.9;
      const ly = rad * Math.sin(theta) * 1.15;
      const breathe = 1 + 0.035 * Math.sin(t * 1.4 + p.id * 0.05);

      return {
        x: cx + lx * breathe + Math.sin(t * 0.8 + p.id) * 3,
        y: cy + ly * breathe + Math.cos(t * 0.7 + p.id) * 3,
      };
    }

    // Target 2: Knowledge Orbit & Planetary Rings (Catalog: Floating on the Right or Top Spatial Clearing)
    function getOrbitTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      const isMobile = w < 1024;
      // Positioned cleanly on the right half or top aura so it NEVER collides with left-aligned course cards
      const cx = isMobile ? w * 0.5 : w * 0.78;
      const cy = isMobile ? h * 0.3 : h * 0.45;
      const minDim = Math.min(w, h);

      if (p.seed1 < 0.15) {
        // Orbit core
        const rad = p.seed2 * (minDim * 0.08);
        const ang = p.seed3 * Math.PI * 2 + t * 0.5;
        return {
          x: cx + rad * Math.cos(ang),
          y: cy + rad * Math.sin(ang) * 0.7,
        };
      }

      // 3 Elliptical orbits cleanly tilted
      const orbitRadii = [minDim * 0.16, minDim * 0.26, minDim * 0.36];
      const orbitSpeeds = [0.22, -0.15, 0.1];
      const baseR = orbitRadii[p.ringIdx];
      const speed = orbitSpeeds[p.ringIdx];

      const angle = p.sealAngle + t * speed;
      const tilt = 0.42;
      const rx = baseR + (p.seed2 - 0.5) * 25;
      const ry = rx * tilt + (p.seed3 - 0.5) * 15;

      return {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      };
    }

    // Target 3: Crystalline Geometric Canopy (Pricing: Framing ABOVE and AROUND the cards, not inside them)
    function getPillarsTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      // Form an architectural crystal canopy / constellation crest in the upper region of the viewport (y ≈ 0.12 - 0.32)
      // and ethereal flanking pillars on the outer margins (x < 0.10 or x > 0.90) so cards remain 100% uncluttered!
      const isMargin = p.seed1 < 0.28;

      if (isMargin) {
        // Outer flank streams
        const isLeft = p.lobe === -1;
        const fx = isLeft ? w * (0.04 + p.seed2 * 0.08) : w * (0.88 + p.seed2 * 0.08);
        const fy = h * 0.15 + p.seed3 * (h * 0.75);
        return {
          x: fx + Math.sin(t * 1.5 + p.id) * 5,
          y: fy + Math.cos(t * 1.2 + p.id) * 5,
        };
      }

      // Upper Arch / Crystalline Crest above the pricing cards
      const archX = w * (0.15 + p.seed2 * 0.7);
      const normDist = (archX - w * 0.5) / (w * 0.35); // -1 to 1
      const archY = h * 0.16 + (normDist * normDist) * (h * 0.08) + (p.seed3 - 0.5) * 35;

      return {
        x: archX + Math.sin(t * 1.8 + p.id) * 4,
        y: archY + Math.cos(t * 1.4 + p.id) * 3,
      };
    }

    // Target 4: Cryptographic Seal & Medallion (Verification: Left Column, balancing the card on the right)
    function getSealTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      const isMobile = w < 1024;
      const cx = isMobile ? w * 0.5 : w * 0.28;
      const cy = h * 0.5;
      const maxR = Math.min(w * 0.3, h * 0.38, 240);

      if (p.seed1 < 0.4) {
        // Outer rotating gear ring with discrete teeth
        const teeth = 36;
        const toothIdx = Math.floor(p.seed2 * teeth);
        const theta = (toothIdx / teeth) * Math.PI * 2 + t * 0.18;
        const toothR = maxR * (0.92 + (toothIdx % 2 === 0 ? 0.08 : 0));
        return {
          x: cx + toothR * Math.cos(theta),
          y: cy + toothR * Math.sin(theta),
        };
      } else if (p.seed1 < 0.75) {
        // Concentric verification halo
        const theta = p.sealAngle - t * 0.22;
        const rad = maxR * (0.52 + p.seed2 * 0.22);
        return {
          x: cx + rad * Math.cos(theta),
          y: cy + rad * Math.sin(theta),
        };
      } else {
        // Central diamond core
        const prog = p.seed2 * 4;
        const edge = Math.floor(prog);
        const frac = prog - edge;
        const dSize = maxR * 0.28;
        let dx = 0;
        let dy = 0;
        if (edge === 0) {
          dx = frac * dSize;
          dy = -(1 - frac) * dSize;
        } else if (edge === 1) {
          dx = (1 - frac) * dSize;
          dy = frac * dSize;
        } else if (edge === 2) {
          dx = -frac * dSize;
          dy = (1 - frac) * dSize;
        } else {
          dx = -(1 - frac) * dSize;
          dy = -frac * dSize;
        }
        return {
          x: cx + dx + Math.sin(t * 1.5 + p.id) * 3,
          y: cy + dy + Math.cos(t * 1.5 + p.id) * 3,
        };
      }
    }

    function smoothStep(val: number): number {
      const clamped = Math.max(0, Math.min(1, val));
      return clamped * clamped * (3 - 2 * clamped);
    }

    // Animation Loop
    const render = () => {
      time += 0.016;
      currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const s = currentScrollProgress;

      let t1: { x: number; y: number };
      let t2: { x: number; y: number };
      let blend = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (s <= 0.28) {
          const u = smoothStep(s / 0.28);
          t1 = getBrainTarget(p, width, height, time);
          t2 = getOrbitTarget(p, width, height, time);
          blend = u;
        } else if (s <= 0.65) {
          const u = smoothStep((s - 0.28) / (0.65 - 0.28));
          t1 = getOrbitTarget(p, width, height, time);
          t2 = getPillarsTarget(p, width, height, time);
          blend = u;
        } else {
          const u = smoothStep((s - 0.65) / (1.0 - 0.65));
          t1 = getPillarsTarget(p, width, height, time);
          t2 = getSealTarget(p, width, height, time);
          blend = u;
        }

        const targetX = t1.x + (t2.x - t1.x) * blend;
        const targetY = t1.y + (t2.y - t1.y) * blend;

        p.x += (targetX - p.x) * 0.07;
        p.y += (targetY - p.y) * 0.07;

        // Proximity cursor physics
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 110;
          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist) * 32;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        p.angle += p.vAngle;

        drawTriangle(
          ctx,
          p.x,
          p.y,
          p.size,
          p.angle,
          p.color,
          p.alpha * (0.85 + 0.15 * Math.sin(time * 2 + p.id))
        );
      }

      // Connecting filaments (delicate and restrained)
      ctx.lineWidth = 0.5;
      const step = width < 768 ? 14 : 8;
      for (let i = 0; i < particles.length; i += step) {
        const p1 = particles[i];
        for (let j = i + 1; j < Math.min(i + 10, particles.length); j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 55) {
            const lineAlpha = (1 - dist / 55) * 0.12;
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = lineAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
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
