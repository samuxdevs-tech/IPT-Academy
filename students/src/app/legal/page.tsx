'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Globe
} from 'lucide-react';

function LegalCenterContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as LegalSectionId) || 'aviso_legal';
  const [activeTab, setActiveTab] = useState<LegalSectionId>('aviso_legal');

  useEffect(() => {
    if (
      initialTab &&
      ['aviso_legal', 'privacidad', 'terminos', 'retracto_pagos', 'cookies'].includes(initialTab)
    ) {
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
      case 'retracto_pagos':
        return <CreditCard className="w-4 h-4" />;
      case 'cookies':
        return <Cookie className="w-4 h-4" />;
    }
  };

  const currentDoc =
    LEGAL_DOCUMENTS.find((d) => d.id === activeTab) || LEGAL_DOCUMENTS[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col">
      {/* Cabecera Pública */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="IPT Course"
              width={132}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              Centro Legal y Normativo
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl border border-[#cbd5e1] hover:bg-slate-50 text-xs font-bold text-[#0f172a] flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Encabezado de Identificación Corporativa */}
        <section className="bg-[#0f172a] text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Scale className="w-3.5 h-3.5" />
                <span>Marco Legal Colombiano • Versión {CURRENT_LEGAL_VERSION}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Información Legal, Privacidad y Condiciones de Uso
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Documentación oficial de cumplimiento normativo de <strong>{IPT_OWNER_INFO.commercialName}</strong> conforme a la Ley 1581 de 2012 (Habeas Data), Ley 1480 de 2011 (Estatuto del Consumidor) y Ley 23 de 1982 (Derechos de Autor).
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-2 shrink-0">
              <p className="font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>{IPT_OWNER_INFO.legalOwner}</span>
              </p>
              <p className="text-slate-300">{IPT_OWNER_INFO.mercantileRegistry}</p>
              <p className="text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <a
                  href={`mailto:${IPT_OWNER_INFO.officialEmail}`}
                  className="text-blue-300 hover:underline font-semibold"
                >
                  {IPT_OWNER_INFO.officialEmail}
                </a>
              </p>
              <p className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Domicilio: {IPT_OWNER_INFO.domicile}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Navegación de los 5 Bloques Legales */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#e2e8f0] p-3 space-y-1.5 shadow-2xs">
            <p className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
              Documentos Oficiales (5)
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
                      ? 'bg-[#1d4ed8] text-white shadow-xs'
                      : 'text-[#334155] hover:bg-[#f1f5f9]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-[#475569]'
                    }`}
                  >
                    {getSectionIcon(doc.id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold leading-snug">
                      {doc.title}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 truncate ${
                        isSelected ? 'text-blue-100' : 'text-[#64748b]'
                      }`}
                    >
                      {doc.lawReference}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Contenido Detallado de la Sección Activa + Vista Completa */}
          <div className="lg:col-span-8 space-y-6">
            <article className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="border-b border-[#e2e8f0] pb-5 space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-[#1d4ed8] text-xs font-bold">
                  {getSectionIcon(currentDoc.id)}
                  <span>{currentDoc.lawReference}</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a]">
                  {currentDoc.title}
                </h2>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {currentDoc.summary}
                </p>
              </div>

              <div className="space-y-6">
                {currentDoc.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3"
                  >
                    <h3 className="text-base font-extrabold text-[#0f172a]">
                      {clause.heading}
                    </h3>
                    <p className="text-sm text-[#334155] leading-relaxed">
                      {clause.body}
                    </p>
                    {clause.bullets && clause.bullets.length > 0 && (
                      <ul className="space-y-2 pt-1">
                        {clause.bullets.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-[#1e293b]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5" />
                            <span>{b}</span>
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
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LegalCenterContent />
    </Suspense>
  );
}
