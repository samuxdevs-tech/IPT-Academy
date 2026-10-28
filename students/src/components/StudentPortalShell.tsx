'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Sparkles,
  Video,
  CheckCircle2,
  BookOpen,
  FileCheck2,
  Award,
  Calendar,
  GraduationCap,
  Layers,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { IptLogoIcon } from '@/components/IptLogoIcon';

export default function StudentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const {
    subscription,
    entitlements,
    notifications,
    openPricingModal,
    markNotificationRead,
    switchDemoTier,
    zeroSumAccounting,
  } = useSubscription();

  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setNotifOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Rutas que tienen su propio encabezado autónomo completo
  const isStandalone =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/verify') ||
    pathname === '/' ||
    pathname === '/course' ||
    pathname.startsWith('/course/') ||
    pathname === '/free' ||
    pathname.startsWith('/free/');

  const currentPlanId = useMemo<'free' | 'pro' | 'pro_plus' | 'your_plan'>(() => {
    if (!subscription || !subscription.planId) {
      if (entitlements.campusTheme === 'campus-pro-plus') return 'pro_plus';
      if (entitlements.campusTheme === 'campus-pro') return 'pro';
      if (entitlements.campusTheme === 'campus-enterprise') return 'your_plan';
      return 'free';
    }
    return subscription.planId;
  }, [subscription, entitlements.campusTheme]);

  if (isStandalone) {
    return <>{children}</>;
  }

  const unreadNotifs = notifications.filter((n) => !n.read);

  const navItems = [
    {
      href: '/home',
      label: 'Campus',
      icon: Layers,
      visible: true,
    },
    {
      href: '/course',
      label: 'Aula de Clases',
      icon: BookOpen,
      visible: true,
    },
    {
      href: '/assignments',
      label: 'Tareas y Rúbricas',
      icon: FileCheck2,
      visible: currentPlanId !== 'free',
    },
    {
      href: '/grades',
      label: 'Mis Notas',
      icon: GraduationCap,
      visible: currentPlanId !== 'free',
    },
    {
      href: '/live',
      label: 'Sala en Vivo',
      icon: Video,
      visible: currentPlanId === 'pro_plus' || currentPlanId === 'your_plan',
      badge:
        currentPlanId === 'pro_plus' || currentPlanId === 'your_plan'
          ? `${entitlements.availableLiveCredits} créd.`
          : undefined,
    },
    {
      href: '/calendar',
      label: 'Calendario',
      icon: Calendar,
      visible: currentPlanId !== 'free',
    },
    {
      href: '/certificate',
      label: 'Certificados',
      icon: Award,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#ffffff] font-sans selection:bg-[#8052ff] selection:text-white">
      {/* Barra Superior Unificada Dala Dark Void D1 */}
      <header className="sticky top-0 z-50 h-16 border-b border-[#ffffff]/10 bg-[#000000]/90 backdrop-blur-md print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Izquierda: Logo + Marca */}
          <div className="flex items-center gap-6">
            <Link href="/home" className="flex items-center gap-2.5 group shrink-0">
              <IptLogoIcon className="w-7 h-7 transition-transform group-hover:scale-105" />
              <span className="text-white text-sm font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#9a9a9a]">Academy</span>
              </span>
            </Link>

            {/* Navegación Horizontal de Estudiante */}
            <nav className="hidden xl:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.4)]'
                        : 'text-[#bdbdbd] hover:text-white hover:bg-[#ffffff]/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-black/30 text-white'
                            : 'bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Derecha: Conmutador de Nivel en Tiempo Real + Contabilidad + Notificaciones */}
          <div className="flex items-center gap-3">
            {/* Selector Rápido de Nivel de Estudiante */}
            <div className="hidden md:flex items-center bg-[#09090b] border border-[#ffffff]/15 rounded-full p-1 gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] px-2.5 font-medium">
                Nivel:
              </span>
              {(
                [
                  { id: 'free', label: 'Free' },
                  { id: 'pro', label: 'Pro' },
                  { id: 'pro_plus', label: 'Pro+' },
                  { id: 'your_plan', label: 'Your Plan' },
                ] as const
              ).map((tier) => {
                const active = currentPlanId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => switchDemoTier(tier.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      active
                        ? tier.id === 'pro_plus'
                          ? 'bg-[#ffb829] text-black shadow-[0_0_12px_rgba(255,184,41,0.4)]'
                          : tier.id === 'your_plan'
                          ? 'bg-[#15846e] text-white shadow-[0_0_12px_rgba(21,132,110,0.4)]'
                          : tier.id === 'pro'
                          ? 'bg-[#8052ff] text-white shadow-[0_0_12px_rgba(128,82,255,0.4)]'
                          : 'bg-[#ffffff]/20 text-white'
                        : 'text-[#9a9a9a] hover:text-white'
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>

            {/* Indicador de Partida Doble = 0 (Para planes con créditos) */}
            {(currentPlanId === 'pro_plus' || currentPlanId === 'your_plan') && (
              <div
                title={`Contabilidad Partida Doble: Emitidos (${zeroSumAccounting.issuedCredits}) = Disponibles (${zeroSumAccounting.availableCredits}) + Reservados (${zeroSumAccounting.reservedInEscrow}) + Consumidos (${zeroSumAccounting.consumedCredits}) | Δ = ${zeroSumAccounting.netDelta}`}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#15846e]/10 border border-[#15846e]/30 text-[11px] text-[#15846e] font-mono"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Δ=0 ({zeroSumAccounting.availableCredits}/{zeroSumAccounting.issuedCredits})</span>
              </div>
            )}

            {/* Campana de Notificaciones */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((p) => !p)}
                className="relative p-2 rounded-full border border-[#ffffff]/10 bg-[#09090b] hover:border-[#ffffff]/25 text-[#bdbdbd] hover:text-white transition-colors cursor-pointer"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#8052ff] text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#09090b] border border-[#ffffff]/15 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#ffffff]/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Notificaciones del Campus
                    </span>
                    <span className="text-[10px] font-mono text-[#9a9a9a]">
                      {unreadNotifs.length} nuevas
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#ffffff]/10">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#9a9a9a]">
                        No tienes notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-3.5 text-xs cursor-pointer hover:bg-[#ffffff]/5 transition-colors ${
                            !n.read ? 'bg-[#8052ff]/5' : ''
                          }`}
                        >
                          <div className="font-semibold text-white">{n.title}</div>
                          <p className="text-[#9a9a9a] mt-0.5 text-[11px] leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Planes */}
            <button
              type="button"
              onClick={() => openPricingModal('pro_plus')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 border border-[#ffffff]/15 text-white text-xs font-medium transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ffb829]" />
              <span>Planes</span>
            </button>

            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="xl:hidden p-2 rounded-full border border-[#ffffff]/10 bg-[#09090b] text-white"
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Drawer Móvil y Tablet */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-[#ffffff]/10 bg-[#09090b] px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-[#ffffff]/10">
              <span className="text-[11px] text-[#9a9a9a] mr-2">Vista de Nivel:</span>
              {(
                [
                  { id: 'free', label: 'Free' },
                  { id: 'pro', label: 'Pro' },
                  { id: 'pro_plus', label: 'Pro+' },
                  { id: 'your_plan', label: 'Your Plan' },
                ] as const
              ).map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => switchDemoTier(tier.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    currentPlanId === tier.id
                      ? 'bg-[#8052ff] text-white'
                      : 'bg-[#ffffff]/5 text-[#9a9a9a]'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#8052ff] text-white'
                        : 'bg-[#ffffff]/5 text-[#bdbdbd] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col bg-[#000000]">{children}</main>
    </div>
  );
}
