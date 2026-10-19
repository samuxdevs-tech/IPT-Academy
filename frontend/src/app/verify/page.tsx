'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Certificate } from '@/types';
import CertificateModal from '@/components/CertificateModal';
import {
  ShieldCheck,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  User as UserIcon,
  BookOpen,
  Eye,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [searchedCode, setSearchedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const verifyCertificateCode = async (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setNotFound(false);
    setSearchedCode(clean);

    try {
      const snap = await get(ref(db, `certificates/${clean}`));
      if (snap.exists()) {
        setCert(snap.val() as Certificate);
        setNotFound(false);
      } else {
        setCert(null);
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error consultando certificado:', err);
      setCert(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      verifyCertificateCode(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCertificateCode(code);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#2a2b3f] flex flex-col">
      {/* Header Público */}
      <header className="bg-white border-b border-[#d1d2e0] px-6 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.webp" alt="TecnoGan" width={144} height={36} className="h-9 w-auto object-contain" priority />
            <div>
              <span className="font-extrabold text-base text-[#2a2b3f] block leading-none">
                TecnoGan Academy
              </span>
              <span className="text-[11px] text-[#595c73] font-medium">
                Portal Oficial de Verificación de Credenciales
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="px-3.5 py-2 rounded-lg border border-[#d1d2e0] text-xs font-bold text-[#2a2b3f] hover:bg-[#f6f7f9] flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir a la Plataforma</span>
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-8">
        <div className="bg-white rounded-2xl border border-[#d1d2e0] shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#6d28d2]/10 border border-[#6d28d2]/20 flex items-center justify-center text-[#6d28d2] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-[#2a2b3f]">
                Verificación Pública de Certificados
              </h1>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Ingresa el código único impreso en el diploma (ej. <span className="font-mono font-bold text-[#2a2b3f]">TG-CERT-...</span>) para confirmar la validez académica y técnica del titular ante empresas e instituciones agropecuarias.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9194ac] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: TG-CERT-8A9F2-X7B1"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#d1d2e0] text-sm font-mono font-bold uppercase focus:outline-none focus:border-[#6d28d2]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {loading ? 'Consultando...' : 'Validar Credencial'}
            </button>
          </form>
        </div>

        {/* Resultado Positivo */}
        {cert && (
          <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider">
                    Credencial Auténtica y Vigente
                  </p>
                  <p className="text-[11px] text-emerald-100">
                    Verificada en el registro oficial de TecnoGan AgroTech
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-mono text-xs font-bold">
                {cert.id}
              </span>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9194ac] flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5" />
                    Titular Acreditado
                  </span>
                  <p className="text-lg font-extrabold text-[#2a2b3f]">
                    {cert.studentName}
                  </p>
                  {cert.studentEmail && (
                    <p className="text-xs text-[#595c73] font-mono">{cert.studentEmail}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9194ac] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Fecha de Emisión Oficial
                  </span>
                  <p className="text-sm font-bold text-[#2a2b3f]">
                    {cert.issueDateFormatted}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold">
                    Calificación Promedio: {cert.scoreAverage || 96}% • {cert.completionHours || 34} Horas Académicas
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#f6f7f9] border border-[#e9eaf2] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6d28d2] flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Programa de Especialización Aprobado
                </span>
                <p className="text-sm font-bold text-[#2a2b3f]">
                  {cert.courseTitle}
                </p>
                <p className="text-xs text-[#595c73]">
                  Expedido por: {cert.instructor || 'Equipo Directivo de TecnoGan'} ({cert.instructorRole || 'Acreditación Institucional'})
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#e9eaf2]">
                <div className="text-[11px] text-[#9194ac] font-mono">
                  Hash criptográfico: <strong className="text-[#595c73]">{cert.verificationHash}</strong>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#202230] hover:bg-black text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Ver Diploma Oficial e Imprimir</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resultado No Encontrado */}
        {notFound && (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#2a2b3f]">
              No se encontró ningún certificado con el código "{searchedCode}"
            </h3>
            <p className="text-xs text-[#595c73] max-w-md mx-auto">
              Verifica que hayas escrito el código completo incluyendo el prefijo <span className="font-mono font-bold">TG-CERT-</span> y los guiones tal como aparece en la esquina inferior derecha del diploma.
            </p>
          </div>
        )}
      </main>

      {cert && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={null}
          initialCertificate={cert}
          defaultStudentName={cert.studentName}
          progressPercent={cert.progressPercent || 100}
          scoreAverage={cert.scoreAverage || 96}
        />
      )}
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyPageInner />
    </Suspense>
  );
}
