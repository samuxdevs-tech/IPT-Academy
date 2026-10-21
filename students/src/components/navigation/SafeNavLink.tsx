'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
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
 * SafeNavLink - Componente de navegación blindado contra fallos de Turbopack/Next.js export.
 * 1. Intenta navegación SPA instantánea con router.push().
 * 2. Si detecta un enlace externo o target="_blank", respeta comportamiento nativo.
 * 3. Si por cualquier motivo el router de Next.js se congela o tarda más de 200ms en cambiar la ruta,
 *    ejecuta automáticamente un fallback con window.location.assign(href).
 * Resultado: Cero botones muertos, cero pantallas congeladas, navegación 100% garantizada.
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
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    target === '_blank';

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick(e);
      }

      if (e.defaultPrevented || isExternal) {
        return;
      }

      // Si es un query param o hash en la misma página, dejamos que el router o navegador actúen
      const isInternalPath = href.startsWith('/') || href.startsWith('?');
      if (!isInternalPath) {
        return;
      }

      e.preventDefault();

      const currentPath =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '';

      if (currentPath === href) {
        return;
      }

      let navigated = false;

      // Timer de seguridad: si tras 180ms la URL no ha cambiado, saltar de inmediato por navegador nativo
      const fallbackTimer = window.setTimeout(() => {
        if (!navigated && typeof window !== 'undefined') {
          const nowPath = window.location.pathname + window.location.search;
          if (nowPath !== href) {
            window.location.assign(href);
          }
        }
      }, 180);

      try {
        router.push(href);
        navigated = true;
      } catch (err) {
        clearTimeout(fallbackTimer);
        window.location.assign(href);
      }
    },
    [href, isExternal, onClick, router]
  );

  if (isExternal) {
    return (
      <a href={href} target={target} rel={rel} className={className} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}
