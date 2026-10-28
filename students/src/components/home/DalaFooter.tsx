'use client';

import React from 'react';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import Link from 'next/link';
import { useLoginTransition } from '@/context/LoginTransitionContext';

export default function DalaFooter() {
  const { navigateToLogin, handleAuthAction } = useLoginTransition();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[#ffffff]/10 bg-[#000000] text-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto w-full px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#ffffff]/10">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <IptLogoIcon className="w-7 h-7 shrink-0" />
              <span className="text-white text-[15px] font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#bdbdbd]">Academy</span>
              </span>
            </div>
            <p className="text-[13px] font-extralight text-[#9a9a9a] leading-relaxed max-w-[380px]">
              Plataforma de formación técnica y arquitectura de software de Ivan Perez (IPT).
              Diseñada para la formación práctica mediante simulación y software operativo real.
            </p>
            <div className="text-[11px] font-mono text-[#9a9a9a]/80 space-y-1">
              <p>Inscrito en la Cámara de Comercio de Montería · Matrícula Mercantil Formal</p>
              <p>
                Portal oficial:{' '}
                <a
                  href="https://iptapps.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8052ff] hover:underline"
                >
                  iptapps.com
                </a>
              </p>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-white block mb-3 font-mono">
                Plataforma
              </span>
              <ul className="space-y-2 text-[12px] text-[#9a9a9a] font-light">
                <li>
                  <button
                    type="button"
                    onClick={() => handleAuthAction('/home')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Campus Estudiantil
                  </button>
                </li>
                <li>
                  <a href="#mision-vision" className="hover:text-white transition-colors">
                    Misión y Visión
                  </a>
                </li>
                <li>
                  <a href="#membresias" className="hover:text-white transition-colors">
                    Planes de Acceso
                  </a>
                </li>
                <li>
                  <a href="#verificar" className="hover:text-white transition-colors">
                    Verificar Credencial
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-white block mb-3 font-mono">
                Ecosistema IPT
              </span>
              <ul className="space-y-2 text-[12px] text-[#9a9a9a] font-light">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLogin('/home')}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Acceso a Alumnos
                  </button>
                </li>
                <li>
                  <a
                    href="https://iptapps.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    iptapps.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://ipt-course-admin-2a354.web.app"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Portal Docente
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-white block mb-3 font-mono">
                Marco Legal
              </span>
              <ul className="space-y-2 text-[12px] text-[#9a9a9a] font-light">
                <li>
                  <Link href="/legal?tab=aviso_legal" className="hover:text-white transition-colors">
                    Aviso Legal (Montería)
                  </Link>
                </li>
                <li>
                  <Link href="/legal?tab=privacidad" className="hover:text-white transition-colors">
                    Privacidad y Datos
                  </Link>
                </li>
                <li>
                  <Link href="/legal?tab=litigios" className="hover:text-white transition-colors">
                    Litigios y Arbitraje
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#9a9a9a] font-light">
          <div>
            © {currentYear} IPT · Ivan Perez. Todos los derechos reservados.
          </div>
          <div className="flex items-center gap-5 text-[#9a9a9a]/90">
            <span>Montería, Colombia</span>
            <span>Certificación Criptográfica</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
