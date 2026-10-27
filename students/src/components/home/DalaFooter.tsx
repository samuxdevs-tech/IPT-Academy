'use client';

import React from 'react';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import Link from 'next/link';

export default function DalaFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-16 px-6 z-10 border-t border-[#ffffff]/10 bg-[#000000]">
      <div className="max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-[#ffffff]/10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <IptLogoIcon className="w-7 h-7 shrink-0" />
              <span className="text-white text-[15px] font-semibold tracking-[-0.02em]">
                IPT <span className="font-light text-[#bdbdbd]">Course</span>
              </span>
            </div>
            <p className="text-[14px] font-extralight text-[#9a9a9a] leading-relaxed max-w-[380px] mb-6">
              Plataforma de formación técnica y arquitectura de software de Ivan Perez Tech (IPT).
              Diseñada para la formación de alto nivel basada en simulación y software operativo real.
            </p>
            <div className="text-[12px] font-mono text-[#9a9a9a]/70">
              Cámara de Comercio Municipal · Matrícula Formal IPT
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <span className="text-[12px] uppercase tracking-[0.05em] font-semibold text-white block mb-4">
                Plataforma
              </span>
              <ul className="space-y-2.5 text-[13px] text-[#9a9a9a] font-extralight">
                <li>
                  <a href="#curso-liberado" className="hover:text-white transition-colors">
                    Curso de Prueba
                  </a>
                </li>
                <li>
                  <a href="#catalogo" className="hover:text-white transition-colors">
                    Especializaciones
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
              <span className="text-[12px] uppercase tracking-[0.05em] font-semibold text-white block mb-4">
                Ecosistema IPT
              </span>
              <ul className="space-y-2.5 text-[13px] text-[#9a9a9a] font-extralight">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Acceso a Alumnos
                  </Link>
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
                <li>
                  <a
                    href="https://ivanperez.tech"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Ivan Perez Tech
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[12px] uppercase tracking-[0.05em] font-semibold text-white block mb-4">
                Transparencia
              </span>
              <ul className="space-y-2.5 text-[13px] text-[#9a9a9a] font-extralight">
                <li>
                  <Link href="/legal" className="hover:text-white transition-colors">
                    Términos de Servicio
                  </Link>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-white transition-colors">
                    Privacidad y Datos
                  </Link>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-white transition-colors">
                    Condiciones de Membresía
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#9a9a9a] font-light">
          <div>
            © {currentYear} IPT (Ivan Perez Tech). Todos los derechos reservados.
          </div>
          <div className="flex items-center gap-6">
            <span>Infraestructura Segura</span>
            <span>Certificación Criptográfica</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
