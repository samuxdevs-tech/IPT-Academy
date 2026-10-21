'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  LEGAL_DOCUMENTS,
  IPT_OWNER_INFO,
  CURRENT_LEGAL_VERSION,
  LegalSectionId,
  recordUserLegalAcceptance
} from '@/lib/legalData';
import {
  Scale,
  ShieldCheck,
  Cookie,
  X,
  CheckCircle2,
  Building2,
  Mail,
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

  // Modal de aceptación obligatoria para sesiones activas que aún no tengan registro en Firebase
  const [needsSessionConsent, setNeedsSessionConsent] = useState(false);
  const [sessionCheckbox, setSessionCheckbox] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

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

  // 2. Verificar que todo usuario autenticado tenga su registro de aceptación legal en Firebase RTDB
  useEffect(() => {
    if (!user || user.uid.startsWith('local-')) {
      setNeedsSessionConsent(false);
      return;
    }

    const checkUserLegalConsent = async () => {
      try {
        // Primero revisar caché local inmediata escrita durante login/registro
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`ipt_legal_accepted_${user.uid}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.policyVersion === CURRENT_LEGAL_VERSION && parsed?.accepted) {
              setNeedsSessionConsent(false);
              return;
            }
          }
        }

        const snap = await get(ref(db, `users/${user.uid}/legalConsent`));
        if (snap.exists() && snap.val()?.policyVersion === CURRENT_LEGAL_VERSION && snap.val()?.accepted) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ipt_legal_accepted_${user.uid}`, JSON.stringify(snap.val()));
          }
          setNeedsSessionConsent(false);
        } else {
          setNeedsSessionConsent(true);
        }
      } catch {
        setNeedsSessionConsent(false);
      }
    };

    checkUserLegalConsent();
  }, [user]);

  const handleSaveCookieChoice = (choice: 'all' | 'essential_only') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_STORAGE_KEY, choice);
    }
    setAnalyticsCookies(choice === 'all');
    setShowCookieBanner(false);
    setShowCookieConfig(false);
  };

  const handleConfirmSessionLegalConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sessionCheckbox) return;
    setSavingConsent(true);
    try {
      await recordUserLegalAcceptance(user, 'session_gate');
      setNeedsSessionConsent(false);
    } finally {
      setSavingConsent(false);
    }
  };

  const activeDoc = modalSection
    ? LEGAL_DOCUMENTS.find((d) => d.id === modalSection) || LEGAL_DOCUMENTS[0]
    : null;

  // No duplicar el footer completo dentro del workspace de administración (/admin)
  const isInsideAdmin = pathname?.startsWith('/admin');

  return (
    <>
      {/* PIE DE PÁGINA LEGAL OFICIAL DE IPT COURSE */}
      {!isInsideAdmin && (
        <footer className="bg-[#0f172a] text-slate-300 border-t border-slate-800 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
              {/* Columna 1: Identificación Legal del Propietario */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
                    <Image
                      src="/favicon.png"
                      alt="IPT Course"
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-extrabold text-white text-base tracking-tight">
                    {IPT_OWNER_INFO.commercialName}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                  Plataforma de formación en línea, clases en video, gestión de entregas y certificación académica propiedad de Ivan Perez Tech (IPT).
                </p>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      <strong className="text-slate-200">Propietario:</strong> {IPT_OWNER_INFO.legalOwner}
                    </span>
                  </p>
                  <p>
                    <strong className="text-slate-200">Registro Mercantil:</strong> {IPT_OWNER_INFO.mercantileRegistry} ({IPT_OWNER_INFO.domicile})
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      <strong className="text-slate-200">Contacto Legal y Habeas Data:</strong>{' '}
                      <a
                        href={`mailto:${IPT_OWNER_INFO.officialEmail}`}
                        className="text-blue-400 hover:underline font-semibold"
                      >
                        {IPT_OWNER_INFO.officialEmail}
                      </a>
                    </span>
                  </p>
                </div>
              </div>

              {/* Columna 2: Los 5 Pilares Legales Obligatorios */}
              <div className="md:col-span-4 space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Marco Legal y Normativo (Colombia)
                </h3>
                <ul className="space-y-2 text-xs">
                  {LEGAL_DOCUMENTS.map((doc) => (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => setModalSection(doc.id)}
                        className="text-slate-300 hover:text-white hover:underline transition-colors text-left flex items-center justify-between w-full gap-2 cursor-pointer"
                      >
                        <span>{doc.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna 3: Accesos Rápidos y Configuración de Cookies */}
              <div className="md:col-span-3 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Derechos del Usuario
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Consulta nuestras políticas completas o ajusta tus preferencias de privacidad y almacenamiento en cualquier momento.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="/legal"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5 text-blue-400" />
                    <span>Abrir Centro Legal Completo</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCookieBanner(true);
                      setShowCookieConfig(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Cookie className="w-3.5 h-3.5 text-amber-400" />
                    <span>Configurar Cookies</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
              <p>
                © {new Date().getFullYear()} {IPT_OWNER_INFO.commercialName} ({IPT_OWNER_INFO.legalOwner}). Todos los derechos reservados.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/legal?tab=aviso_legal" className="hover:text-white">
                  Aviso Legal
                </Link>
                <Link href="/legal?tab=privacidad" className="hover:text-white">
                  Habeas Data (Ley 1581)
                </Link>
                <Link href="/legal?tab=terminos" className="hover:text-white">
                  Términos
                </Link>
                <Link href="/legal?tab=retracto_pagos" className="hover:text-white">
                  Retracto y Reversión (Ley 1480)
                </Link>
                <Link href="/legal?tab=cookies" className="hover:text-white">
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* BANNER Y CONFIGURADOR DE COOKIES (Punto 5 Legal) */}
      {showCookieBanner && (
        <div className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto md:max-w-lg z-[85] bg-[#0f172a] text-white rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
            Utilizamos almacenamiento técnico indispensable para iniciar sesión, recordar tu progreso académico y ejecutar el TutorIA local en tu navegador, así como cookies opcionales de análisis para mejorar las clases.{' '}
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

      {/* REGISTRO DE ACEPTACIÓN OBLIGATORIA PARA SESIONES PREVIAS SIN CONSTANCIA */}
      {needsSessionConsent && user && pathname !== '/login' && pathname !== '/register' && !pathname?.startsWith('/legal') && (
        <div className="fixed inset-0 z-[125] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#cbd5e1] shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-[#1d4ed8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded">
                  Requisito Legal Obligatorio ({CURRENT_LEGAL_VERSION})
                </span>
                <h3 className="text-lg font-extrabold text-[#0f172a] mt-1">
                  Actualización y Registro de Aceptación Legal
                </h3>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  En cumplimiento de la Ley 1581 de 2012 (Habeas Data) y la Ley 1480 de 2011 de Colombia, requerimos registrar la constancia expresa de aceptación para tu cuenta (<strong>{user.email}</strong>).
                </p>
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-bold text-[#0f172a]">Documentos incluidos en tu aceptación:</p>
              <div className="flex flex-wrap gap-1.5">
                {LEGAL_DOCUMENTS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setModalSection(doc.id)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#cbd5e1] hover:border-[#1d4ed8] text-[#1d4ed8] font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    {doc.number}. {doc.shortTitle}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleConfirmSessionLegalConsent} className="space-y-4">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#cbd5e1] bg-white cursor-pointer hover:border-[#1d4ed8]">
                <input
                  type="checkbox"
                  checked={sessionCheckbox}
                  onChange={(e) => setSessionCheckbox(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#1d4ed8] shrink-0 cursor-pointer"
                  required
                />
                <span className="text-xs text-[#1e293b] leading-relaxed">
                  Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la <strong>Política de Privacidad (Habeas Data - Ley 1581 de 2012)</strong> y acepto el <strong>Aviso Legal</strong>, los <strong>Términos y Condiciones</strong>, las <strong>Condiciones de Compra, Retracto y Reversión de Pago</strong> y la <strong>Política de Cookies</strong> de IPT Course.
                </span>
              </label>

              <button
                type="submit"
                disabled={!sessionCheckbox || savingConsent}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-40 text-white text-xs font-extrabold transition-all cursor-pointer"
              >
                {savingConsent
                  ? 'Registrando aceptación legal...'
                  : 'Confirmar y Guardar Aceptación Legal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
