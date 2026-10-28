'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  LEGAL_DOCUMENTS,
  IPT_OWNER_INFO,
  LegalSectionId,
  recordUserLegalAcceptance
} from '@/lib/legalData';
import {
  Scale,
  Cookie,
  X,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

const COOKIE_STORAGE_KEY = 'ipt_cookie_consent_v1';

export default function LegalComplianceSystem() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Estado del banner de Cookies
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showCookieConfig, setShowCookieConfig] = useState(false);
  const [analyticsCookies, setAnalyticsCookies] = useState(true);

  // Modal de lectura rápida de cualquiera de las 5 secciones legales
  const [modalSection, setModalSection] = useState<LegalSectionId | null>(null);

  // 1. Verificar preferencia de Cookies al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!saved) {
      setShowCookieBanner(true);
    } else {
      setAnalyticsCookies(saved === 'all');
    }
  }, []);

  

  const handleSaveCookieChoice = (choice: 'all' | 'essential_only') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_STORAGE_KEY, choice);
    }
    setAnalyticsCookies(choice === 'all');
    setShowCookieBanner(false);
    setShowCookieConfig(false);
  };

  

  const activeDoc = modalSection
    ? LEGAL_DOCUMENTS.find((d) => d.id === modalSection) || LEGAL_DOCUMENTS[0]
    : null;

  // No duplicar el footer completo dentro del workspace de administración (/admin)
  const isInsideAdmin = pathname?.startsWith('/admin');

  return (
    <>
{/* BANNER Y CONFIGURADOR DE COOKIES (Punto 5 Legal) */}
      {showCookieBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-[85] bg-[#0f172a] text-white rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  Aviso de Cookies y Almacenamiento Local
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ley 1581 de 2012 y Estándares de Privacidad
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCookieBanner(false)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              aria-label="Cerrar aviso de cookies"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Utilizamos almacenamiento técnico indispensable para iniciar sesión, recordar tu progreso académico y guardar tu progreso académico y preferencias, además de cookies analíticas opcionales para optimizar la experiencia de estudio.{' '}
            <button
              type="button"
              onClick={() => setModalSection('cookies')}
              className="text-blue-400 hover:underline font-bold cursor-pointer"
            >
              Ver Política de Cookies
            </button>
          </p>

          {showCookieConfig && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Cookies Técnicas y de Sesión (Obligatorias)</p>
                  <p className="text-[11px] text-slate-400">Autenticación segura, notas y caché de estudio.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Siempre activas
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <p className="font-bold text-white">Cookies de Análisis Académico (Opcionales)</p>
                  <p className="text-[11px] text-slate-400">Estadísticas anónimas de calidad de video.</p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsCookies}
                  onChange={(e) => setAnalyticsCookies(e.target.checked)}
                  className="w-4 h-4 accent-[#1d4ed8] cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {!showCookieConfig ? (
              <button
                type="button"
                onClick={() => setShowCookieConfig(true)}
                className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configurar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSaveCookieChoice(analyticsCookies ? 'all' : 'essential_only')
                }
                className="px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-bold text-blue-300 cursor-pointer"
              >
                Guardar selección
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSaveCookieChoice('essential_only')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={() => handleSaveCookieChoice('all')}
              className="px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-xs font-bold text-white shadow-xs cursor-pointer"
            >
              Aceptar todas
            </button>
          </div>
        </div>
      )}

      {/* MODAL LECTOR DE DOCUMENTOS LEGALES */}
      {activeDoc && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#cbd5e1] shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
            <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <Scale className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base truncate">
                    {activeDoc.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeDoc.lawReference}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSection(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas rápidas dentro del modal */}
            <div className="bg-[#f1f5f9] px-4 py-2 border-b border-[#e2e8f0] flex items-center gap-1.5 overflow-x-auto">
              {LEGAL_DOCUMENTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setModalSection(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    d.id === activeDoc.id
                      ? 'bg-[#1d4ed8] text-white'
                      : 'bg-white text-[#334155] hover:bg-slate-200'
                  }`}
                >
                  {d.number}. {d.shortTitle}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-left">
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl">
                {activeDoc.summary}
              </p>

              {activeDoc.clauses.map((clause, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-sm font-extrabold text-[#0f172a]">
                    {clause.heading}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                    {clause.body}
                  </p>
                  {clause.bullets && (
                    <ul className="space-y-1.5 pl-1 pt-1">
                      {clause.bullets.map((b, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2 text-xs text-[#1e293b]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between">
              <Link
                href={`/legal?tab=${activeDoc.id}`}
                onClick={() => setModalSection(null)}
                className="text-xs font-bold text-[#1d4ed8] hover:underline"
              >
                Ver página legal completa →
              </Link>
              <button
                type="button"
                onClick={() => setModalSection(null)}
                className="px-4 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      </>
  );
}
