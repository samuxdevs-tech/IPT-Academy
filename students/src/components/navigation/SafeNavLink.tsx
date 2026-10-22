'use client';

import React from 'react';
import Link from 'next/link';

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
 * SafeNavLink - Enlace SPA instantáneo (<50ms) sin recargar la página.
 * Mantiene montado el árbol de componentes (IA Tutor, reproductor, estados de usuario)
 * eliminando recargas completas del navegador.
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
    !href ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    target === '_blank';

  if (isExternal) {
    return (
      <a
        href={href || '#'}
        target={target}
        rel={rel}
        className={className}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Link>
  );
}
