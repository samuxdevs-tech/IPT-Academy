'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  // Current coordinates
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Rotation
  angle: number;
  vAngle: number;
  // Size & Appearance
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  // Parametric seeds
  seed1: number;
  seed2: number;
  seed3: number;
  lobe: number; // -1 for left lobe, 1 for right lobe
  pillarIdx: number; // 0, 1, 2, 3
  ringIdx: number; // 0, 1, 2
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

    // Mouse tracking with soft decay
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

    // Resize handling with HiDPI support
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

    // Particle Generation (550 - 650 particles for silky 60+ fps)
    const PARTICLE_COUNT = width < 768 ? 320 : 580;
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color = DALA_PALETTE[i % DALA_PALETTE.length];
      const baseAlpha = 0.35 + Math.random() * 0.55;
      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.02,
        size: 3 + Math.random() * 3.5,
        color,
        alpha: baseAlpha,
        baseAlpha,
        seed1: Math.random(),
        seed2: Math.random(),
        seed3: Math.random(),
        lobe: i % 2 === 0 ? -1 : 1,
        pillarIdx: i % 4,
        ringIdx: i % 3,
        sealAngle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        sealRadiusNorm: Math.random(),
      });
    }

    // Scroll progress smooth tracker
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

    // Helper: Draw Outlined Equilateral Triangle (Dala Signature Glyph)
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
      // 3 vertices of equilateral triangle
      const a0 = 0;
      const a1 = (2 * Math.PI) / 3;
      const a2 = (4 * Math.PI) / 3;
      context.moveTo(r * Math.cos(a0), r * Math.sin(a0));
      context.lineTo(r * Math.cos(a1), r * Math.sin(a1));
      context.lineTo(r * Math.cos(a2), r * Math.sin(a2));
      context.closePath();

      context.strokeStyle = color;
      context.globalAlpha = Math.min(Math.max(alpha, 0), 1);
      context.lineWidth = 1.25;
      context.stroke();
      context.restore();
    }

    // Target position generators based on current section shapes
    function getBrainTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      const isMobile = w < 1024;
      const cx = isMobile ? w * 0.5 : w * 0.72;
      const cy = isMobile ? h * 0.38 : h * 0.5;
      const maxR = Math.min(w * 0.24, h * 0.38, 220);

      // If ambient particle (18% of particles scatter freely)
      if (p.seed1 < 0.18) {
        const spreadW = w * 0.9;
        const spreadH = h * 0.9;
        return {
          x: w * 0.05 + p.seed2 * spreadW + Math.sin(t * 0.5 + p.id) * 20,
          y: h * 0.05 + p.seed3 * spreadH + Math.cos(t * 0.4 + p.id) * 20,
        };
      }

      // Bilateral brain lobes
      const lobeOffsetX = p.lobe * (maxR * 0.45);
      const theta = p.seed2 * Math.PI * 2;
      // Organic brain contour with harmonics
      const contour =
        1 +
        0.22 * Math.sin(3 * theta + p.lobe) +
        0.14 * Math.cos(5 * theta) +
        0.08 * Math.sin(7 * theta + t * 0.8);
      const rad = Math.sqrt(p.seed3) * maxR * 0.58 * contour;

      const lx = lobeOffsetX + rad * Math.cos(theta) * 0.9;
      const ly = rad * Math.sin(theta) * 1.15;

      // Subtle breathing wave
      const breathe = 1 + 0.04 * Math.sin(t * 1.5 + p.id * 0.05);

      return {
        x: cx + lx * breathe + Math.sin(t * 0.8 + p.id) * 4,
        y: cy + ly * breathe + Math.cos(t * 0.7 + p.id) * 4,
      };
    }

    function getOrbitTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      // Catalog section: Concentric Knowledge Rings & Planetary Course Orbit
      const cx = w * 0.5;
      const cy = h * 0.5;
      const minDim = Math.min(w, h);

      if (p.seed1 < 0.15) {
        // Core nucleus
        const rad = p.seed2 * (minDim * 0.1);
        const ang = p.seed3 * Math.PI * 2 + t * 0.6;
        return {
          x: cx + rad * Math.cos(ang),
          y: cy + rad * Math.sin(ang) * 0.8,
        };
      }

      // 3 Orbital levels
      const orbitRadii = [minDim * 0.22, minDim * 0.36, minDim * 0.48];
      const orbitSpeeds = [0.25, -0.18, 0.12];
      const baseR = orbitRadii[p.ringIdx];
      const speed = orbitSpeeds[p.ringIdx];

      const angle = p.sealAngle + t * speed;
      const tilt = 0.45; // Elliptical inclination
      const rx = baseR + (p.seed2 - 0.5) * 35;
      const ry = rx * tilt + (p.seed3 - 0.5) * 20;

      return {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      };
    }

    function getPillarsTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      // Pricing Section: 4 Crystalline Tier Monoliths (Free, Pro, Pro+, Corporativo)
      const colXCoords = [w * 0.18, w * 0.39, w * 0.61, w * 0.82];
      const colHeights = [h * 0.35, h * 0.45, h * 0.56, h * 0.65];
      const pillarX = colXCoords[p.pillarIdx];
      const pillarH = colHeights[p.pillarIdx];
      const baseY = h * 0.78;

      if (p.seed1 < 0.2) {
        // Apex crown particles
        const topY = baseY - pillarH;
        return {
          x: pillarX + (p.seed2 - 0.5) * 80 + Math.sin(t * 2 + p.id) * 8,
          y: topY - p.seed3 * 40 - Math.abs(Math.sin(t * 1.5 + p.pillarIdx)) * 15,
        };
      }

      // Vertical shaft of the monolith
      const shaftWidth = Math.min(w * 0.12, 110);
      const normH = p.seed2;
      const py = baseY - normH * pillarH;
      const px = pillarX + (p.seed3 - 0.5) * shaftWidth * (1 - normH * 0.3);

      return {
        x: px + Math.sin(t + py * 0.02) * 3,
        y: py,
      };
    }

    function getSealTarget(p: Particle, w: number, h: number, t: number): { x: number; y: number } {
      // Verification Section: Cryptographic Credential Seal
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.min(w * 0.4, h * 0.42, 320);

      if (p.seed1 < 0.35) {
        // Outer gear / credential ring with discrete teeth
        const teeth = 48;
        const toothIdx = Math.floor(p.seed2 * teeth);
        const theta = (toothIdx / teeth) * Math.PI * 2 + t * 0.15;
        const toothR = maxR * (0.92 + (toothIdx % 2 === 0 ? 0.08 : 0));
        return {
          x: cx + toothR * Math.cos(theta),
          y: cy + toothR * Math.sin(theta),
        };
      } else if (p.seed1 < 0.75) {
        // Middle verification aura
        const theta = p.sealAngle - t * 0.25;
        const rad = maxR * (0.55 + p.seed2 * 0.25);
        return {
          x: cx + rad * Math.cos(theta),
          y: cy + rad * Math.sin(theta),
        };
      } else {
        // Center cryptographic diamond/shield
        const prog = p.seed2 * 4;
        const edge = Math.floor(prog);
        const frac = prog - edge;
        const dSize = maxR * 0.32;
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

    // Cubic smoothstep easing for fluid morph transitions
    function smoothStep(val: number): number {
      const clamped = Math.max(0, Math.min(1, val));
      return clamped * clamped * (3 - 2 * clamped);
    }

    // Animation Loop
    const render = () => {
      time += 0.016;

      // Smooth lag on scroll progress
      currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const s = currentScrollProgress;

      // Morph segmentation:
      // s in [0.00, 0.28] -> Brain to Orbit
      // s in [0.28, 0.65] -> Orbit to Pillars
      // s in [0.65, 1.00] -> Pillars to Seal
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

        // Position easing towards target
        p.x += (targetX - p.x) * 0.07;
        p.y += (targetY - p.y) * 0.07;

        // Cursor deflection physics
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130;
          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist) * 36;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // Particle rotation
        p.angle += p.vAngle;

        // Draw individual outlined triangle glyph
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

      // Draw subtle synaptic connector lines between neighboring particles
      ctx.lineWidth = 0.6;
      const step = width < 768 ? 16 : 9;
      for (let i = 0; i < particles.length; i += step) {
        const p1 = particles[i];
        for (let j = i + 1; j < Math.min(i + 14, particles.length); j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 65) {
            const lineAlpha = (1 - dist / 65) * 0.14;
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
