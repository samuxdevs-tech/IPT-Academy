'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  LEGAL_DOCUMENTS,
  IPT_OWNER_INFO,
  CURRENT_LEGAL_VERSION,
  LegalSectionId
} from '@/lib/legalData';
import {
  Scale,
  ShieldCheck,
  FileText,
  CreditCard,
  Cookie,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Mail,
  MapPin,
  Gavel
} from 'lucide-react';

function LegalCenterContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as LegalSectionId;
  const [activeTab, setActiveTab] = useState<LegalSectionId>('aviso_legal');

  const validTabs: LegalSectionId[] = [
    'aviso_legal',
    'privacidad',
    'terminos',
    'litigios',
    'retracto_pagos',
    'cookies'
  ];

  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getSectionIcon = (id: LegalSectionId) => {
    switch (id) {
      case 'aviso_legal':
        return <Building2 className="w-4 h-4" />;
      case 'privacidad':
        return <ShieldCheck className="w-4 h-4" />;
      case 'terminos':
        return <FileText className="w-4 h-4" />;
      case 'litigios':
        return <Gavel className="w-4 h-4" />;
      case 'retracto_pagos':
        return <CreditCard className="w-4 h-4" />;
      case 'cookies':
        return <Cookie className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const currentDoc =
    LEGAL_DOCUMENTS.find((d) => d.id === activeTab) || LEGAL_DOCUMENTS[0];

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col selection:bg-[#8052ff] selection:text-white">
      {/* Cabecera Independiente (Fuera de cualquier sidebar) */}
      <header className="border-b border-[#ffffff]/10 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 transform group-hover:scale-105 transition-transform">
                <polygon points="12,2 22,20 2,20" fill="#8052ff" stroke="#ffffff" strokeWidth="0.8" />
              </svg>
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-white">
                IPT <span className="font-light text-[#bdbdbd]">Course</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#ffffff]/5 text-[#9a9a9a] text-[11px] font-mono border border-[#ffffff]/10">
              Marco Legal y Normativo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-[#ffffff]/15 hover:border-[#ffffff]/30 hover:bg-[#ffffff]/5 text-xs text-[#d1d5db] flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Inicio</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal en su propio Cajón */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Ficha Institucional Obligatoria por Ley */}
        <section className="bg-[#09090b] border border-[#ffffff]/15 rounded-[24px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/15 text-[#8052ff] text-[11px] font-semibold border border-[#8052ff]/30">
                <Scale className="w-3.5 h-3.5" />
                <span>Régimen Mercantil y Legal de Colombia • Edición {CURRENT_LEGAL_VERSION}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-white">
                Centro Normativo y Condiciones Contractuales
              </h1>
              <p className="text-xs sm:text-sm text-[#9a9a9a] leading-relaxed">
                Información oficial en observancia de la Ley 1581 de 2012 (Habeas Data), Ley 1480 de 2011 (Estatuto del Consumidor), Ley 1563 de 2012 (Arbitraje Nacional e Internacional) y Ley 527 de 1999 (Comercio Electrónico).
              </p>
            </div>

            <div className="bg-[#000000] border border-[#ffffff]/10 rounded-2xl p-4 text-xs space-y-2 shrink-0 md:min-w-[280px]">
              <p className="font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#8052ff]" />
                <span>{IPT_OWNER_INFO.legalOwner}</span>
              </p>
              <p className="text-[#9a9a9a] text-[11px] leading-snug">{IPT_OWNER_INFO.mercantileRegistry}</p>
              <p className="text-[#9a9a9a] flex items-center gap-1.5 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-[#8052ff]" />
                <a
                  href={`mailto:${IPT_OWNER_INFO.officialEmail}`}
                  className="text-white hover:underline font-mono"
                >
                  {IPT_OWNER_INFO.officialEmail}
                </a>
              </p>
              <p className="text-[#9a9a9a] flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#15846e]" />
                <span>{IPT_OWNER_INFO.domicile}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Estructura en Dos Columnas: Selector y Documento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Selector de Secciones */}
          <aside className="lg:col-span-4 bg-[#09090b] rounded-[22px] border border-[#ffffff]/15 p-3 space-y-1.5 shadow-lg">
            <p className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[#9a9a9a]">
              Secciones Normativas ({LEGAL_DOCUMENTS.length})
            </p>
            {LEGAL_DOCUMENTS.map((doc) => {
              const isSelected = doc.id === activeTab;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveTab(doc.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.3)]'
                      : 'text-[#d1d5db] hover:bg-[#ffffff]/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#000000] border border-[#ffffff]/10 text-[#9a9a9a]'
                    }`}
                  >
                    {getSectionIcon(doc.id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-snug">
                      {doc.shortTitle}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 truncate ${
                        isSelected ? 'text-white/80' : 'text-[#9a9a9a]'
                      }`}
                    >
                      {doc.lawReference}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Cuerpo del Documento Activo */}
          <div className="lg:col-span-8 space-y-6">
            <article className="bg-[#09090b] rounded-[24px] border border-[#ffffff]/15 p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-[#ffffff]/10 pb-5 space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#8052ff]/15 text-[#8052ff] text-xs font-semibold border border-[#8052ff]/25">
                  {getSectionIcon(currentDoc.id)}
                  <span>{currentDoc.lawReference}</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.01em]">
                  {currentDoc.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#9a9a9a] leading-relaxed">
                  {currentDoc.summary}
                </p>
              </div>

              <div className="space-y-5">
                {currentDoc.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-2.5"
                  >
                    <h3 className="text-sm sm:text-[15px] font-semibold text-white">
                      {clause.heading}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#d1d5db] leading-relaxed font-light">
                      {clause.body}
                    </p>
                    {clause.bullets && clause.bullets.length > 0 && (
                      <ul className="space-y-2 pt-2 border-t border-[#ffffff]/5">
                        {clause.bullets.map((bullet, bIdx) => (
                          <li
                            key={bIdx}
                            className="flex items-start gap-2.5 text-xs text-[#bdbdbd] font-light leading-relaxed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#8052ff] shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#000000] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#8052ff] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LegalCenterContent />
    </Suspense>
  );
}
