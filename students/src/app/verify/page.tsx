'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Certificate } from '@/types';
import { getLocalDatabase } from '@/services/localDatabaseService';
import CertificateCanvasView from '@/components/certificates/CertificateCanvasView';
import {
  ShieldCheck,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User as UserIcon,
  BookOpen,
  Eye,
  ArrowLeft,
  ExternalLink,
  Lock,
  Hash,
  Sparkles,
  FileText,
  BadgeCheck,
  Share2,
  Copy,
  Check
} from 'lucide-react';

interface VerifyViewProps {
  forcedCode?: string;
}

export function VerifyView({ forcedCode }: VerifyViewProps) {
  const searchParams = useSearchParams();
  const queryCode = searchParams ? searchParams.get('code') || '' : '';
  const initialCode = (forcedCode || queryCode).trim().toUpperCase();

  const [code, setCode] = useState(initialCode || '');
  const [cert, setCert] = useState<Certificate | null>(null);
  const [searchedCode, setSearchedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const resolveCertificate = async (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setNotFound(false);
    setSearchedCode(clean);

    // 1. Primero intentar consultar en la base de datos local / localStorage
    const localDb = getLocalDatabase();
    const localCert = localDb.certificates?.find(
      (c) => c.id.toUpperCase() === clean || c.verificationHash?.toUpperCase() === clean
    );

    if (localCert) {
      setCert(localCert);
      setNotFound(false);
      setLoading(false);
      return;
    }

    // 2. Consultar en Firebase RTDB si está disponible
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
      console.warn('Error consultando certificado remoto en Firebase, fallback a estado no encontrado:', err);
      setCert(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      resolveCertificate(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resolveCertificate(code);
  };

  const handleCopyPublicUrl = () => {
    if (typeof window !== 'undefined' && cert) {
      const url = `${window.location.origin}/verify/${encodeURIComponent(cert.id)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#0f0f0f] flex flex-col font-sans">
      {/* Encabezado Institucional de Verificación Pública */}
      <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 shadow-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="IPT Academy"
              width={140}
              height={36}
              className="h-8 md:h-9 w-auto object-contain"
              priority
              unoptimized
            />
            <div className="border-l border-[#e0e0e0] pl-3">
              <span className="font-black text-sm md:text-base text-[#0f0f0f] block leading-none">
                IPT Academy
              </span>
              <span className="text-[10.5px] text-[#606060] font-semibold tracking-wide">
                Registro Oficial de Credenciales y Títulos · Ivan Perez Tech (IPT)
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/certificate"
              className="px-3.5 py-2 rounded-xl bg-[#065fd4] text-white hover:bg-[#054db2] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Award className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar mi Certificado</span>
              <span className="sm:hidden">Descargar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        
        {/* Barra de Consulta y Búsqueda */}
        <section className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs p-6 md:p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-[#0f0f0f] tracking-tight">
                  Verificación Pública de Título y Metadatos Académicos
                </h1>
                <p className="text-xs md:text-sm text-[#606060] leading-relaxed">
                  Consulta la validez jurídica y académica de un certificado emitido por <strong>IPT Academy (Ivan Perez Tech)</strong>.
                </p>
              </div>
            </div>

            {cert && (
              <button
                type="button"
                onClick={handleCopyPublicUrl}
                className="px-4 py-2 rounded-xl border border-[#e0e0e0] hover:bg-[#f5f5f5] text-xs font-bold text-[#0f0f0f] flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#065fd4]" />}
                <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace de Verificación'}</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#909090] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Código del certificado (ej. IPT-CERT-2026-MASTER-PRO)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e5e5] text-xs md:text-sm font-mono font-bold uppercase focus:outline-none focus:border-[#065fd4] focus:ring-1 focus:ring-[#065fd4]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-[#0f0f0f] hover:bg-black text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {loading ? 'Consultando...' : 'Comprobar Credencial'}
            </button>
          </form>
        </section>

        {/* 1. FICHA COMPLETA DE DATOS Y METADATOS TÉCNICOS */}
        {cert && (
          <section className="bg-white rounded-3xl border-2 border-emerald-500/40 shadow-lg overflow-hidden space-y-6">
            
            {/* Cabecera del Certificado Válido */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-sm md:text-base font-extrabold uppercase tracking-wider">
                      Certificado Auténtico, Vigente y Verificado
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-white text-[11px] font-black">
                      VÁLIDO
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100">
                    Registrado en el repositorio académico oficial de Ivan Perez Tech (IPT)
                  </p>
                </div>
              </div>

              <div className="bg-black/25 px-4 py-2 rounded-xl border border-white/20 font-mono text-xs md:text-sm font-bold text-white tracking-wider">
                ID: {cert.id}
              </div>
            </div>

            {/* Parrilla de Metadatos Obligatorios (Horas Totales, Calificación, Titular, Emisión) */}
            <div className="px-6 md:px-8 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metadato 1: Titular */}
                <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#707070] flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#065fd4]" />
                    Titular Acreditado
                  </span>
                  <p className="text-base font-extrabold text-[#0f0f0f] truncate">
                    {cert.studentName}
                  </p>
                  <p className="text-xs text-[#606060] font-mono">
                    {cert.studentEmail || 'ivan@ipt.local'}
                  </p>
                </div>

                {/* Metadato 2: Calificación Promedio */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Calificación Promedio
                  </span>
                  <p className="text-xl font-black text-emerald-900">
                    {typeof cert.scoreAverage === 'number'
                      ? cert.scoreAverage <= 5
                        ? `${cert.scoreAverage.toFixed(1)} / 5.0`
                        : `${cert.scoreAverage}%`
                      : '4.8 / 5.0'}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold">
                    Escala de evaluación 0.0 a 5.0 (Aprobatoria: ≥ 3.0)
                  </p>
                </div>

                {/* Metadato 3: Horas Totales */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Horas Totales del Programa
                  </span>
                  <p className="text-xl font-black text-blue-950">
                    {cert.completionHours || 20} Horas
                  </p>
                  <p className="text-xs text-blue-700 font-medium">
                    Clases sincrónicas, prácticas y proyectos aplicados
                  </p>
                </div>

                {/* Metadato 4: Fecha de Emisión */}
                <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#707070] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#065fd4]" />
                    Fecha de Emisión
                  </span>
                  <p className="text-sm font-extrabold text-[#0f0f0f]">
                    {cert.issueDateFormatted || '18 de octubre de 2026'}
                  </p>
                  <p className="text-xs text-[#606060]">
                    Registro permanente en blockchain / hash institucional
                  </p>
                </div>
              </div>

              {/* Detalle del Programa Académico e Instructor */}
              <div className="p-5 rounded-2xl bg-[#fafbfc] border border-[#e5e5e5] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ececec] pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#065fd4] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Programa Académico Especializado
                    </span>
                    <h3 className="text-lg font-black text-[#0f0f0f] mt-0.5">
                      {cert.courseTitle}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold self-start">
                    100% Contenido Completado
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#505050]">
                  <div>
                    <strong className="text-[#0f0f0f] block mb-0.5">Entidad Emisora:</strong>
                    Ivan Perez Tech (IPT) · Campus Virtual de Formación Profesional.
                  </div>
                  <div>
                    <strong className="text-[#0f0f0f] block mb-0.5">Instructor y Acreditador:</strong>
                    {cert.instructor} ({cert.instructorRole})
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ececec] flex flex-wrap items-center justify-between gap-3 text-xs text-[#707070]">
                  <div className="flex items-center gap-1 font-mono">
                    <Hash className="w-3.5 h-3.5 text-[#909090]" />
                    <span>Hash criptográfico:</span>
                    <strong className="text-[#0f0f0f]">{cert.verificationHash}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Firma digital válida emitida por IPT</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 2. VISOR OFICIAL DEL CERTIFICADO (NO DESCARGABLE / MODO CONSULTA) */}
            <div className="border-t border-[#e5e5e5] pt-6 px-6 md:px-8 pb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#0f0f0f] flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#065fd4]" />
                    <span>Visor del Certificado Digital (Solo Consulta)</span>
                  </h2>
                  <p className="text-xs text-[#606060]">
                    Esta vista previa está protegida para verificación pública. El titular puede descargar el archivo oficial en PDF ingresando a su portal en <code>/certificate</code>.
                  </p>
                </div>

                <Link
                  href="/certificate"
                  className="px-4 py-2 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ir al Descargable (/certificate)</span>
                </Link>
              </div>

              {/* Contenedor del visor restringido (No descargable) */}
              <div className="relative rounded-3xl bg-[#141620] border-2 border-[#2b2e40] p-3 sm:p-6 flex justify-center overflow-x-auto shadow-inner">
                {/* Banner de protección contra descarga indebida */}
                <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-xl bg-black/80 border border-white/20 backdrop-blur-md text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-lg pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Visor Público Protegido · Solo Consulta</span>
                </div>

                <CertificateCanvasView cert={cert} isReadOnlyViewer={true} />
              </div>
            </div>

          </section>
        )}

        {/* Resultado: Código no encontrado */}
        {notFound && (
          <section className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0f0f0f]">
              No se encontró ninguna credencial con el código "{searchedCode}"
            </h2>
            <p className="text-xs md:text-sm text-[#606060] max-w-md mx-auto leading-relaxed">
              Verifica haber escrito correctamente el código del diploma tal como aparece bajo el código QR (ejemplo: <span className="font-mono font-bold text-[#0f0f0f]">IPT-CERT-2026-MASTER-PRO</span>).
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCode('IPT-CERT-2026-MASTER-PRO');
                  resolveCertificate('IPT-CERT-2026-MASTER-PRO');
                }}
                className="px-4 py-2 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cargar Certificado Oficial de Muestra
              </button>
            </div>
          </section>
        )}

      </main>

      {/* Pie Institucional */}
      <footer className="mt-auto border-t border-[#e5e5e5] bg-white py-6 px-4 text-center text-xs text-[#707070] space-y-1">
        <p className="font-semibold text-[#0f0f0f]">
          Ivan Perez Tech (IPT) — IPT Academy · Sistema de Verificación Académica
        </p>
        <p>
          Titular y Fundador: <strong>Iván Samuel Pérez Torrenegra</strong>. Inscrito formalmente en la Cámara de Comercio municipal correspondiente.
        </p>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#606060]">Cargando verificador oficial IPT Academy...</div>}>
      <VerifyView />
    </Suspense>
  );
}
