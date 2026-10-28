'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Sparkles, ExternalLink, ShieldCheck, BookOpen } from 'lucide-react';

export default function DalaHeader() {
  const { user, effectiveIsAdmin, userRole, logout } = useAuth();
  const isTeacher = userRole === 'instructor';
  const isOperator = effectiveIsAdmin;

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#000000]/85 backdrop-blur-md border-b border-[#ffffff]/10 shadow-2xl'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Lockup Oficial */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <IptLogoIcon className="w-8 h-8" />
          </div>
          <span className="text-white text-[15px] font-semibold tracking-[-0.02em]">
            IPT <span className="font-light text-[#bdbdbd]">Academy</span>
          </span>
        </Link>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/home"
            className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#8052ff] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Campus</span>
          </Link>
          <a
            href="#mision-vision"
            className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors"
          >
            Misión y Visión
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

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link
                href="/login"
                className="text-[13px] uppercase tracking-[0.03em] font-semibold text-[#9a9a9a] hover:text-white transition-colors px-3 py-2"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/home"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[13px] font-semibold uppercase tracking-[0.03em] transition-all duration-200 hover:shadow-[0_0_20px_rgba(128,82,255,0.4)] cursor-pointer"
              >
                Entrar al Campus
              </Link>
            </>
          ) : (
            <>
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
                  href="/home"
                  className="inline-flex items-center justify-center px-5 py-2 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] text-white text-[13px] font-semibold uppercase tracking-[0.03em] transition-all shadow-[0_0_15px_rgba(128,82,255,0.4)]"
                >
                  Panel de Estudio
                </Link>
              )}

              {/* Botón de Salir */}
              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-full border border-[#ffffff]/15 hover:border-[#ffffff]/30 text-[#9a9a9a] hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
