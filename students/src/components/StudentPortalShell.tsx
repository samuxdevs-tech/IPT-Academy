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
    zeroSumAccounting,
  } = useSubscription();

  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setNotifOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

    // Rutas que tienen su propio encabezado autónomo completo (login, registro, legal, landing pública)
  const isStandalone =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/verify') ||
    pathname === '/';

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

  const unreadNotifs = Array.isArray(notifications) ? notifications.filter((n) => !n.read) : [];

  const navItems = [
    {
      href: '/home',
      label: 'Academia',
      icon: GraduationCap,
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
      visible: true,
      badge: currentPlanId === 'free' ? 'Pro' : undefined,
    },
    {
      href: '/grades',
      label: 'Mis Notas',
      icon: GraduationCap,
      visible: true,
      badge: currentPlanId === 'free' ? 'Pro' : undefined,
    },
    {
      href: '/live',
      label: 'Sala en Vivo',
      icon: Video,
      visible: true,
      badge:
        currentPlanId === 'pro_plus' || currentPlanId === 'your_plan'
          ? `${entitlements.availableLiveCredits} créd.`
          : 'Pro+',
    },
    {
      href: '/calendar',
      label: 'Calendario',
      icon: Calendar,
      visible: true,
      badge: currentPlanId === 'free' ? 'Pro' : undefined,
    },
    {
      href: '/certificate',
      label: 'Certificados',
      icon: Award,
      visible: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#ffffff] font-sans selection:bg-[#8052ff] selection:text-white">
      {/* Barra Superior Unificada Dala Dark Void D1 */}
      <header className="sticky top-0 z-50 h-16 border-b border-[#ffffff]/10 bg-[#000000]/90 backdrop-blur-md print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Izquierda: Logo + Marca */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <IptLogoIcon className="w-7 h-7 transition-transform group-hover:scale-105" />
              <span className="text-white text-sm font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#9a9a9a]">Academy</span>
              </span>
            </Link>

            {/* Navegación Horizontal de Estudiante */}
            <nav className="hidden lg:flex items-center gap-1">
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

          {/* Derecha: Estado de Suscripción Real + Contabilidad + Notificaciones */}
          <div className="flex items-center gap-3">
            {/* Indicador de Nivel Real del Estudiante */}
            <div className="hidden sm:flex items-center bg-[#09090b] border border-[#ffffff]/15 rounded-full px-3 py-1 gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentPlanId === 'your_plan'
                    ? 'bg-[#15846e]'
                    : currentPlanId === 'pro_plus'
                    ? 'bg-[#ffb829]'
                    : currentPlanId === 'pro'
                    ? 'bg-[#8052ff]'
                    : 'bg-[#9a9a9a]'
                }`}
              />
              <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] font-medium">
                Membresía:
              </span>
              <span
                className={`text-xs font-semibold ${
                  currentPlanId === 'your_plan'
                    ? 'text-[#15846e]'
                    : currentPlanId === 'pro_plus'
                    ? 'text-[#ffb829]'
                    : currentPlanId === 'pro'
                    ? 'text-[#8052ff]'
                    : 'text-white'
                }`}
              >
                {currentPlanId === 'your_plan'
                  ? 'Your Plan'
                  : currentPlanId === 'pro_plus'
                  ? 'Plan Pro+'
                  : currentPlanId === 'pro'
                  ? 'Plan Pro'
                  : 'Acceso Inicial (Free)'}
              </span>
            </div>

            {/* Créditos disponibles para clases */}
            {(currentPlanId === 'pro_plus' || currentPlanId === 'your_plan') && (
              <div
                title="Créditos disponibles para clases en vivo este mes"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15846e]/10 border border-[#15846e]/30 text-xs text-emerald-400 font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{entitlements.availableLiveCredits} créditos de clase</span>
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
                    {!Array.isArray(notifications) || notifications.length === 0 ? (
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
              className="lg:hidden p-2 rounded-full border border-[#ffffff]/10 bg-[#09090b] text-white"
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Drawer Móvil y Tablet */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#ffffff]/10 bg-[#09090b] px-4 py-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#ffffff]/10">
              <span className="text-[11px] text-[#9a9a9a]">Membresía actual:</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                  currentPlanId === 'your_plan'
                    ? 'bg-[#15846e]/20 text-[#15846e] border border-[#15846e]/40'
                    : currentPlanId === 'pro_plus'
                    ? 'bg-[#ffb829]/20 text-[#ffb829] border border-[#ffb829]/40'
                    : currentPlanId === 'pro'
                    ? 'bg-[#8052ff]/20 text-[#8052ff] border border-[#8052ff]/40'
                    : 'bg-white/10 text-white'
                }`}
              >
                {currentPlanId === 'your_plan'
                  ? 'Your Plan'
                  : currentPlanId === 'pro_plus'
                  ? 'Plan Pro+'
                  : currentPlanId === 'pro'
                  ? 'Plan Pro'
                  : 'Acceso Inicial (Free)'}
              </span>
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
