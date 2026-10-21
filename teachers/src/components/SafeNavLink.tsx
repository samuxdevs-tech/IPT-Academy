'use client';

import React from 'react';

export interface SafeNavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  title?: string;
  target?: string;
  rel?: string;
}

/**
 * SafeNavLink - Arquitectura MPA Nativa Ultra-Rápida a prueba de fallos.
 * Utiliza enlaces nativos del navegador (<a>).
 * - Cero dependencia del router interno de Next.js/Turbopack.
 * - Cero bloqueos de streaming RSC o chunks de hidratación.
 * - Soporta prefetch silencioso en background mediante <link rel="prefetch"> al hacer hover.
 * - Funciona el 100% de las veces en cualquier dispositivo, móvil o navegador.
 */
export default function SafeNavLink({
  href,
  children,
  prefetch = true,
  className = '',
  onClick,
  target,
  rel,
  ...rest
}: SafeNavLinkProps) {
  const isExternal =
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    target === '_blank';

  const handleMouseEnter = () => {
    if (!prefetch || isExternal || typeof document === 'undefined') return;
    // Prefetch nativo del HTML en background al pasar el cursor o tocar
    const cleanHref = href.split('?')[0];
    const existing = document.querySelector(`link[rel="prefetch"][href="${cleanHref}"]`);
    if (!existing && cleanHref.startsWith('/')) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = cleanHref;
      link.as = 'document';
      document.head.appendChild(link);
    }
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      {...rest}
    >
      {children}
    </a>
  );
}
