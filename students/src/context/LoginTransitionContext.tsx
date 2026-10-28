'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { IptLogoIcon } from '@/components/IptLogoIcon';

interface LoginTransitionContextType {
  isTransitioning: boolean;
  navigateToLogin: (redirectUrl?: string) => void;
  handleAuthAction: (destinationIfLoggedIn: string, redirectIfLoggedOut?: string) => void;
}

const LoginTransitionContext = createContext<LoginTransitionContextType>({
  isTransitioning: false,
  navigateToLogin: () => {},
  handleAuthAction: () => {},
});

export function LoginTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Navegación suave hacia /login con animación cinematográfica
  const navigateToLogin = useCallback((redirectUrl?: string) => {
    setIsTransitioning(true);

    const target = redirectUrl
      ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
      : '/login';

    // Precargar la ruta en Next.js para navegación instantánea
    try {
      router.prefetch('/login');
    } catch {}

    // Tiempo armónico (220ms) alineado con estándares de movimiento (Emil Kowalski / animate)
    // Permite que el desenfoque suave cubra el cambio de ruta sin demoras perceptibles
    const timer = setTimeout(() => {
      router.push(target);
    }, 220);

    return () => clearTimeout(timer);
  }, [router]);

  // Si el usuario está autenticado navega directo; si no, ejecuta la transición suave al login
  const handleAuthAction = useCallback((destinationIfLoggedIn: string, redirectIfLoggedOut?: string) => {
    if (user) {
      router.push(destinationIfLoggedIn);
    } else {
      const target = redirectIfLoggedOut || destinationIfLoggedIn;
      navigateToLogin(target);
    }
  }, [user, router, navigateToLogin]);

  // Desvanecer el overlay cuando se alcanza la página de login o cambia la ruta
  useEffect(() => {
    if (pathname === '/login') {
      const dissolveTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 180);
      return () => clearTimeout(dissolveTimer);
    } else {
      setIsTransitioning(false);
    }
  }, [pathname]);

  // Freno de seguridad para no dejar la pantalla bloqueada ante cualquier eventualidad
  useEffect(() => {
    if (!isTransitioning) return;
    const safetyTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, [isTransitioning]);

  return (
    <LoginTransitionContext.Provider
      value={{
        isTransitioning,
        navigateToLogin,
        handleAuthAction,
      }}
    >
      {children}

      {/* Overlay de Transición Suave / -> /login */}
      {isTransitioning && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Cargando portal de acceso..."
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000000]/70 backdrop-blur-md animate-overlay-in select-none pointer-events-auto transition-opacity duration-200"
        >
          <div className="relative flex flex-col items-center gap-4 p-8 rounded-[28px] bg-[#09090b]/90 border border-[#ffffff]/15 shadow-[0_0_50px_rgba(128,82,255,0.25)] animate-login-card">
            {/* Logo y halo luminoso */}
            <div className="relative flex items-center justify-center w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-[#8052ff]/30 blur-lg animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-[#8052ff]/20 border-t-[#8052ff] animate-spin" />
              <IptLogoIcon className="w-7 h-7 relative z-10" />
            </div>

            {/* Identidad y estado */}
            <div className="flex flex-col items-center text-center space-y-1">
              <span className="text-white text-[15px] font-medium tracking-tight">
                IPT <span className="font-light text-[#bdbdbd]">Academy</span>
              </span>
              <span className="text-[12px] text-[#9a9a9a] font-light">
                Iniciando acceso al portal...
              </span>
            </div>
          </div>
        </div>
      )}
    </LoginTransitionContext.Provider>
  );
}

export function useLoginTransition() {
  const context = useContext(LoginTransitionContext);
  if (!context) {
    throw new Error('useLoginTransition debe usarse dentro de un LoginTransitionProvider');
  }
  return context;
}
