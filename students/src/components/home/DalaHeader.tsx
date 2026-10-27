'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

export default function DalaHeader() {
  const { user, effectiveIsAdmin, userRole, logout } = useAuth();
  const isTeacher = userRole === 'instructor';
  const isOperator = effectiveIsAdmin || userRole === 'owner' || userRole === 'operator';
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#000000]/85 backdrop-blur-md border-b border-[#ffffff]/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Lockup */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <IptLogoIcon className="w-8 h-8" />
          </div>
          <span className="text-white text-[15px] font-semibold tracking-[-0.02em]">
            IPT <span className="font-light text-[#bdbdbd]">Course</span>
          </span>
        </Link>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#catalogo"
            className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors"
          >
            Catálogo
          </a>
          <a
            href="#membresias"
            className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors"
          >
            Membresías
          </a>
          <a
            href="#verificar"
            className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors"
          >
            Verificar Credencial
          </a>
        </nav>

        {/* Dynamic Action Buttons based on Verified Role (RBAC) */}
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              {/* Unauthenticated Visitor: Public Links Only */}
              <Link
                href="/login"
                className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors px-3 py-2"
              >
                Iniciar Sesión
              </Link>
              <a
                href="#curso-liberado"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[13px] font-semibold uppercase tracking-[0.03em] transition-all duration-200 hover:shadow-[0_0_20px_rgba(128,82,255,0.4)]"
              >
                Comenzar Prueba Gratuita
              </a>
            </>
          ) : (
            <>
              {/* Authenticated User: Conditional Role Privileges */}
              {isOperator ? (
                <a
                  href="https://ipt-course-admin-2a354.web.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[24px] bg-[#ffb829] hover:bg-[#e5a420] text-[#000000] text-[12px] font-semibold uppercase tracking-[0.03em] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Sector Administrativo
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : isTeacher ? (
                <a
                  href="https://ipt-course-admin-2a354.web.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[24px] bg-[#15846e] hover:bg-[#126f5d] text-white text-[12px] font-semibold uppercase tracking-[0.03em] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Consola Docente
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ) : (
                <Link
                  href="/course"
                  className="inline-flex items-center justify-center px-5 py-2 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[13px] font-semibold uppercase tracking-[0.03em] transition-all"
                >
                  Entrar al Campus
                </Link>
              )}

              {/* Profile Menu Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="w-9 h-9 rounded-full bg-[#111111] border border-[#ffffff]/15 flex items-center justify-center text-white hover:border-[#8052ff] transition-colors"
                  aria-label="Menú de usuario"
                >
                  <User className="w-4 h-4 text-[#bdbdbd]" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#0a0a0a] border border-[#ffffff]/15 p-2 shadow-2xl z-50">
                    <div className="px-3 py-2 border-b border-[#ffffff]/10">
                      <p className="text-[12px] font-semibold text-white truncate">
                        {user.displayName || 'Estudiante IPT'}
                      </p>
                      <p className="text-[11px] text-[#9a9a9a] truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/course"
                      onClick={() => setProfileOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-[#bdbdbd] hover:text-white hover:bg-[#ffffff]/5 flex items-center gap-2 mt-1"
                    >
                      Mis Cursos
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-[#f43f5e] hover:bg-[#f43f5e]/10 flex items-center gap-2 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
