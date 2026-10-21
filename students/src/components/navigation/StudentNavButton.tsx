'use client';

import React from 'react';
import { StudentResolvedNavItem } from '@/services/studentNavigationService';

export type StudentNavButtonVariant =
  | 'desktop-expanded'
  | 'desktop-collapsed'
  | 'mobile-drawer'
  | 'mobile-bottom-bar';

interface StudentNavButtonProps {
  item: StudentResolvedNavItem;
  variant: StudentNavButtonVariant;
  onNavigate?: () => void;
  className?: string;
}

export default function StudentNavButton({
  item,
  variant,
  onNavigate,
  className = '',
}: StudentNavButtonProps) {
  const Icon = item.icon;
  const { isActive, badge, href, label, shortLabel, description } = item;

  // 1. Variante: Barra Lateral Escritorio Expandida (w-56)
  if (variant === 'desktop-expanded') {
    return (
      <a
        href={href}
        onClick={onNavigate}
        title={description}
        aria-current={isActive ? 'page' : undefined}
        className={`group flex items-center gap-4 px-3.5 py-2.5 rounded-xl text-sm transition-all select-none cursor-pointer ${
          isActive
            ? 'bg-[#f2f2f2] font-bold text-[#0f0f0f] shadow-2xs'
            : 'font-normal text-[#0f0f0f] hover:bg-[#f5f5f5] active:bg-[#ebebeb]'
        } ${className}`}
      >
        <Icon
          className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
            isActive ? 'text-[#065fd4]' : 'text-[#2a2a2a]'
          }`}
        />
        <span className="truncate flex-1 text-[13px] leading-tight">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#cc0000] text-white shrink-0 shadow-xs">
            {badge}
          </span>
        )}
      </a>
    );
  }

  // 2. Variante: Barra Lateral Escritorio Colapsada (w-[72px])
  if (variant === 'desktop-collapsed') {
    return (
      <a
        href={href}
        onClick={onNavigate}
        title={`${label}: ${description}`}
        aria-current={isActive ? 'page' : undefined}
        className={`group flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all select-none cursor-pointer relative ${
          isActive
            ? 'bg-[#f2f2f2] font-bold text-[#0f0f0f]'
            : 'font-normal text-[#0f0f0f] hover:bg-[#f5f5f5] active:bg-[#ebebeb]'
        } ${className}`}
      >
        <div className="relative">
          <Icon
            className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
              isActive ? 'text-[#065fd4]' : 'text-[#2a2a2a]'
            }`}
          />
          {badge && (
            <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#cc0000] text-white shadow-xs">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[10px] truncate max-w-full text-center mt-1 leading-tight font-medium">
          {shortLabel}
        </span>
      </a>
    );
  }

  // 3. Variante: Menú Lateral Desplegable Móvil (Drawer)
  if (variant === 'mobile-drawer') {
    return (
      <a
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] cursor-pointer select-none ${
          isActive
            ? 'bg-[#f2f2f2] text-[#0f0f0f] font-bold shadow-2xs'
            : 'text-[#0f0f0f] hover:bg-[#f8f8f8] active:bg-[#f0f0f0]'
        } ${className}`}
      >
        <Icon
          className={`w-5 h-5 shrink-0 pointer-events-none ${
            isActive ? 'text-[#065fd4]' : 'text-[#606060]'
          }`}
        />
        <span className="flex-1 truncate pointer-events-none">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#cc0000] text-white pointer-events-none">
            {badge}
          </span>
        )}
      </a>
    );
  }

  // 4. Variante: Barra Inferior Fija para Móviles
  return (
    <a
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`min-h-[52px] flex flex-col items-center justify-center rounded-xl px-1 py-1 text-[11px] active:bg-[#f2f2f2] transition-colors cursor-pointer relative ${
        isActive ? 'font-bold text-[#0f0f0f]' : 'font-normal text-[#606060]'
      } ${className}`}
    >
      <div className="relative pointer-events-none">
        <Icon
          className={`w-5 h-5 mb-0.5 shrink-0 ${
            isActive ? 'text-[#065fd4]' : 'text-[#606060]'
          }`}
        />
        {badge && (
          <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#cc0000] text-white shadow-xs">
            {badge}
          </span>
        )}
      </div>
      <span className="truncate max-w-full text-center leading-tight pointer-events-none text-[11px]">
        {shortLabel}
      </span>
    </a>
  );
}
