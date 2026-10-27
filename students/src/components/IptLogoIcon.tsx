import React from 'react';

interface IptLogoIconProps {
  className?: string;
  size?: number;
}

/**
 * Isotipo Oficial de IPT Course inspirado en el favicon (logo-mark.svg)
 * Representa la 'I', 'P', 'T' entrelazadas en perspectiva isométrica
 * simulando un libro abierto de arquitectura técnica de software.
 */
export const IptLogoIcon: React.FC<IptLogoIconProps> = ({
  className = 'w-7 h-7',
  size
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="IPT Logo"
    >
      <defs>
        {/* Gradiente Ala Izquierda (Libro y Perspectiva) */}
        <linearGradient id="iptLeftWingGrad" x1="6" y1="20" x2="26" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9065ff" />
          <stop offset="100%" stopColor="#591fb0" />
        </linearGradient>

        {/* Gradiente Ala Superior Izquierda */}
        <linearGradient id="iptLeftTopGrad" x1="13" y1="14" x2="26" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d2" />
        </linearGradient>

        {/* Gradiente de la Columna Central 'I' */}
        <linearGradient id="iptSpineGrad" x1="28" y1="30" x2="36" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2a2c3d" />
          <stop offset="100%" stopColor="#12131a" />
        </linearGradient>

        {/* Brillo del Punto 'I' (Periwinkle Luminoso) */}
        <linearGradient id="iptDotGrad" x1="28" y1="20" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#c0c4fc" />
          <stop offset="100%" stopColor="#8052ff" />
        </linearGradient>

        {/* Gradiente de las Siluetas 'P' y 'T' */}
        <linearGradient id="iptRightModulesGrad" x1="38" y1="10" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="45%" stopColor="#8052ff" />
          <stop offset="100%" stopColor="#591fb0" />
        </linearGradient>

        {/* Sombra sutil de profundidad */}
        <filter id="iptIconGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8052ff" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#iptIconGlow)">
        {/* Ala Izquierda: Libro Abierto */}
        <polygon
          points="6,20 26,30 26,56 6,46"
          fill="url(#iptLeftWingGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
        />
        <polygon
          points="13,14 26,27 13,21"
          fill="url(#iptLeftTopGrad)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.8"
        />

        {/* Columna Central 'I' */}
        <rect
          x="28"
          y="30"
          width="8"
          height="26"
          rx="1.5"
          fill="url(#iptSpineGrad)"
          stroke="rgba(192,196,252,0.3)"
          strokeWidth="0.8"
        />

        {/* Punto Superior de la 'I' (Periwinkle Gem) */}
        <rect
          x="28"
          y="19"
          width="8"
          height="8"
          rx="1.8"
          fill="url(#iptDotGrad)"
          stroke="#ffffff"
          strokeWidth="0.6"
        />

        {/* Siluetas Modulares 'P' y 'T' (Ala Derecha Ascendente) */}
        <polygon
          points="38,18 47,18 47,26 38,30"
          fill="url(#iptRightModulesGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
        />
        <polygon
          points="49,10 58,10 58,21 49,25"
          fill="url(#iptRightModulesGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
        />

        {/* Letra 'P' (Página interior y contorno) */}
        <path
          d="M38 33 L47 29 L47 43 L41 46 L41 54 L38 56 Z M41 35 L41 40 L44 38.5 L44 33.5 Z"
          fill="url(#iptRightModulesGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.8"
        />

        {/* Letra 'T' (Eje final y barra de remate) */}
        <path
          d="M49 28 L58 24 L58 29 L55 30.5 L55 46 L51.5 48 L51.5 32 L49 33 Z"
          fill="url(#iptRightModulesGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
};

export default IptLogoIcon;
