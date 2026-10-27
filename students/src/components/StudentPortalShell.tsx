'use client';

import React, { useState, useEffect } from 'react';
import SafeNavLink from '@/components/navigation/SafeNavLink';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  Bell,
  Sparkles,
  Video,
  AlertCircle,
  Archive,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import UserProfileMenu from '@/components/UserProfileMenu';
import StudentSidebar from '@/components/navigation/StudentSidebar';
import StudentMobileDrawer from '@/components/navigation/StudentMobileDrawer';
import StudentMobileBottomBar from '@/components/navigation/StudentMobileBottomBar';

export default function StudentPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user } = useAuth();
  const {
    subscription,
    entitlements,
    notifications,
    openPricingModal,
    markNotificationRead,
  } = useSubscription();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [headerSearch, setHeaderSearch] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const isAuthOrStandalone =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/legal') ||
    pathname === '/';

  if (isAuthOrStandalone) {
    return <>{children}</>;
  }

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerSearch.trim();
    if (!q) {
      router.push('/');
      return;
    }
    router.push(`/?q=${encodeURIComponent(q)}`);
  };

  const toggleSidebarOrDrawer = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const unreadNotifs = notifications.filter((n) => !n.read);

  // Emblema institucional según el Campus activo
  const campusLogoSrc =
    entitlements.campusTheme === 'campus-pro-plus'
      ? '/logo-pro-plus.svg'
      : entitlements.campusTheme === 'campus-pro'
      ? '/logo-pro.svg'
      : entitlements.campusTheme === 'campus-enterprise'
      ? '/logo-your-plan.svg'
      : '/logo.png';

  const isPremiumTheme =
    entitlements.campusTheme === 'campus-pro' ||
    entitlements.campusTheme === 'campus-pro-plus' ||
    entitlements.campusTheme === 'campus-enterprise';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${
        isPremiumTheme ? 'bg-[#f6f7f9] text-[#2a2b3f]' : 'bg-[#ffffff] text-[#0f0f0f]'
      }`}
    >
      <StudentMobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Banner de Modo Archivo / Solo Lectura o Mora (Past Due) */}
      {entitlements.isReadOnly && (
        <div className="bg-[#202230] text-[#ffffff] px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-[#3d4055] print:hidden">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#c4710d] shrink-0" />
            <span>
              <strong>Modo Consulta (Archivo):</strong> Tu suscripción ha finalizado (
              {entitlements.readOnlyReason === 'trial_ended_cancelled'
                ? 'periodo de prueba cancelado'
                : entitlements.readOnlyReason === 'past_due_grace_ended'
                ? 'periodo de gracia vencido'
                : 'ciclo vencido'}
              ). Conservas acceso vitalicio a tus certificados obtenidos y calificaciones históricas.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SafeNavLink
              href="/certificate"
              className="px-3 py-1 rounded-md bg-[#33364a] hover:bg-[#3d4055] text-[#ffffff] font-medium"
            >
              Ver mis certificados
            </SafeNavLink>
            <button
              type="button"
              onClick={() => openPricingModal('pro_plus')}
              className="px-3 py-1 rounded-md bg-[#ffffff] text-[#202230] font-bold cursor-pointer"
            >
              Reactivar Suscripción
            </button>
          </div>
        </div>
      )}

      {subscription?.status === 'past_due' && !entitlements.isReadOnly && (
        <div className="bg-amber-50 text-amber-950 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Aviso de pago pendiente:</strong> No pudimos procesar tu último cobro. Mantienes acceso completo durante tu ventana de gracia mientras reintentamos en los días 1, 3 y 5.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openPricingModal()}
            className="px-3 py-1 rounded-md bg-amber-900 text-white font-semibold cursor-pointer"
          >
            Actualizar tarjeta
          </button>
        </div>
      )}

      {/* Barra superior institucional adaptada al Campus */}
      <header
        className={`sticky top-0 z-40 h-14 px-4 flex items-center justify-between gap-4 border-b print:hidden select-none ${
          isPremiumTheme
            ? 'bg-[#ffffff] border-[#d1d2e0]'
            : 'bg-[#ffffff] border-[#e5e5e5]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSidebarOrDrawer}
            className="p-2 rounded-full hover:bg-[#f2f2f2] text-[#202230] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Mostrar u ocultar menú lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <SafeNavLink href="/" prefetch={true} className="flex items-center gap-2 shrink-0">
            <img
              src={campusLogoSrc}
              alt="IPT Course"
              className="h-8 w-auto object-contain"
            />
          </SafeNavLink>
        </div>

        {/* Buscador central */}
        <form
          onSubmit={handleGlobalSearch}
          className="flex-1 max-w-[540px] hidden md:flex items-center"
        >
          <div className="flex w-full items-center border border-[#d1d2e0] rounded-full overflow-hidden focus-within:border-[#6d28d2] bg-[#ffffff]">
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Buscar cursos estáticos, cursos dinámicos o sesiones..."
              className="w-full h-9 pl-4 pr-3 text-xs text-[#202230] placeholder-[#595c73] focus:outline-hidden"
            />
            <button
              type="submit"
              className="h-9 px-4 bg-[#f6f7f9] hover:bg-[#e9eaf2] border-l border-[#d1d2e0] flex items-center justify-center text-[#202230] cursor-pointer"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Controles de Suscripción, Créditos En Vivo, Notificaciones y Perfil */}
        <div className="flex items-center gap-2">
          {/* Indicador de Créditos en Vivo para Pro+ y Your Plan */}
          {entitlements.canJoinLiveClasses && (
            <SafeNavLink
              href="/live"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202230] text-[#ffffff] text-xs font-semibold hover:bg-[#33364a]"
            >
              <Video className="w-3.5 h-3.5 text-[#c0c4fc]" />
              <span>{entitlements.availableLiveCredits} créditos en vivo</span>
            </SafeNavLink>
          )}

          {/* Indicador de Curso Dinámico en Pro */}
          {entitlements.maxDynamicCourses > 0 && !entitlements.canJoinLiveClasses && (
            <SafeNavLink
              href="/assignments"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d2e0] bg-[#f6f7f9] text-[#202230] text-xs font-semibold"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#6d28d2]" />
              <span>
                {entitlements.effectiveActiveCourseSlugs.length}/{entitlements.maxDynamicCourses} curso dinámico
              </span>
            </SafeNavLink>
          )}

          {/* Botón de Planes / Suscripción */}
          <button
            type="button"
            onClick={() => openPricingModal()}
            className="px-3.5 py-1.5 rounded-lg border-[1.5px] border-[#6d28d2] text-[#6d28d2] hover:bg-[#f6f7f9] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer min-h-[38px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {!subscription || subscription.planId === 'free'
                ? 'Probar Pro / Pro+'
                : subscription.status === 'trial'
                ? `En Prueba (${subscription.planId.toUpperCase()})`
                : `Plan ${subscription.planId.toUpperCase()}`}
            </span>
          </button>

          {/* Campana de Notificaciones Transaccionales In-App */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="p-2 rounded-full hover:bg-[#f2f2f2] text-[#202230] relative cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6d28d2]" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#ffffff] border border-[#d1d2e0] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 bg-[#f6f7f9] border-b border-[#e9eaf2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#202230]">
                    Avisos y Notificaciones ({unreadNotifs.length})
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#e9eaf2]">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-[#595c73] text-center">
                      No tienes notificaciones pendientes.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3.5 text-xs cursor-pointer hover:bg-[#f6f7f9] ${
                          !n.read ? 'bg-[#f6f7f9]/60 font-medium' : 'text-[#595c73]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-[#202230]">{n.title}</span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6d28d2] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#595c73] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <UserProfileMenu />
          ) : (
            <a
              href="/login"
              className="px-3.5 py-1.5 rounded-lg border border-[#d1d2e0] hover:bg-[#f6f7f9] text-xs font-semibold text-[#202230] transition-colors min-h-[38px] inline-flex items-center justify-center"
            >
              Iniciar sesión
            </a>
          )}
        </div>
      </header>

      {/* Estructura principal con Sidebar y área de Campus */}
      <div className="flex-1 flex min-h-0">
        <StudentSidebar isOpen={sidebarOpen} />

        <div
          className={`flex-1 min-w-0 flex flex-col pb-20 md:pb-0 ${
            isPremiumTheme ? 'bg-[#f6f7f9]' : 'bg-[#ffffff]'
          }`}
        >
          {children}
        </div>
      </div>

      <StudentMobileBottomBar
        isDrawerOpen={mobileDrawerOpen}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
      />
    </div>
  );
}
