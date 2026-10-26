'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
 * SafeNavLink - Enlace híbrido resiliente para Next.js con exportación estática.
 * 1. Utiliza etiqueta semántica <a> con su atributo href nativo para preservar accesibilidad, previsualización y apertura en nueva pestaña.
 * 2. Ejecuta navegación SPA instantánea mediante router.push(href) preservando el estado de WebLLM / audio / reproductor.
 * 3. Incorpora un watchdog/fallback timer de 100ms: si el enrutador cliente de Next.js se bloquea o no procesa la ruta estática,
 *    ejecuta automáticamente navegación nativa mediante window.location.assign(href).
 * 4. Prefetch nativo en background al hacer hover o touchstart.
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
  const router = useRouter();

  const isExternal =
    !href ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    target === '_blank';

  const handleMouseEnter = () => {
    if (!prefetch || isExternal || typeof document === 'undefined') return;
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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick(e);
      }

      if (e.defaultPrevented || isExternal) {
        return;
      }

      // Si ya está exactamente en la misma ruta, no recargar
      const currentPath =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '';

      if (currentPath === href) {
        e.preventDefault();
        return;
      }

      // Prevenir recarga inmediata para intentar SPA
      e.preventDefault();

      let navigated = false;

      // Watchdog Timer (100ms): si en 100ms la URL no ha cambiado a la ruta esperada, forzar navegación nativa
      const fallbackTimer = window.setTimeout(() => {
        if (!navigated && typeof window !== 'undefined') {
          const nowPath = window.location.pathname + window.location.search;
          if (nowPath !== href) {
            window.location.assign(href);
          }
        }
      }, 100);

      try {
        router.push(href);

        const checkInterval = window.setInterval(() => {
          if (typeof window !== 'undefined') {
            const nowPath = window.location.pathname + window.location.search;
            const targetBase = href.split('?')[0];
            if (nowPath === href || nowPath.startsWith(targetBase)) {
              navigated = true;
              clearInterval(checkInterval);
              clearTimeout(fallbackTimer);
            }
          }
        }, 15);

        setTimeout(() => clearInterval(checkInterval), 150);
      } catch {
        clearTimeout(fallbackTimer);
        window.location.assign(href);
      }
    },
    [href, isExternal, onClick, router]
  );

  return (
    <a
      href={href || '#'}
      target={target}
      rel={rel}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      {...rest}
    >
      {children}
    </a>
  );
}
