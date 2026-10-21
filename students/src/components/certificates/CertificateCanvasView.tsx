'use client';

import React from 'react';
import Image from 'next/image';
import { Award, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { Certificate } from '@/types';

interface CertificateCanvasViewProps {
  cert: Certificate;
  /**
   * Si es true, activa la marca de agua 'SOLO CONSULTA / NO DESCARGABLE'
   * y desactiva eventos de menú contextual y selección de texto.
   */
  isReadOnlyViewer?: boolean;
}

export default function CertificateCanvasView({
  cert,
  isReadOnlyViewer = false,
}: CertificateCanvasViewProps) {
  const displayedProgress = cert.progressPercent || 100;
  const qrVerificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${encodeURIComponent(cert.id)}`
    : `https://ipt-course.web.app/verify/${encodeURIComponent(cert.id)}`;

  return (
    <div
      id="printable-diploma"
      onContextMenu={isReadOnlyViewer ? (e) => e.preventDefault() : undefined}
      className={`relative w-full max-w-[960px] bg-[#faf8f2] text-[#1c1c24] rounded-2xl p-5 sm:p-9 md:p-12 shadow-2xl border-[4px] sm:border-[8px] border-[#161c2d] select-none transition-all ${
        isReadOnlyViewer ? 'pointer-events-none select-none' : ''
      }`}
      style={{
        boxShadow:
          '0 25px 60px -15px rgba(0, 0, 0, 0.7), inset 0 0 0 2px #d4af37, inset 0 0 0 5px #f4ebd0, inset 0 0 0 7px #b38728',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif',
      }}
    >
      {/* Marco Ornamental Clásico en Esquinas */}
      <div className="absolute top-3.5 left-3.5 w-9 h-9 border-t-2 border-l-2 border-[#b38728]" />
      <div className="absolute top-3.5 right-3.5 w-9 h-9 border-t-2 border-r-2 border-[#b38728]" />
      <div className="absolute bottom-3.5 left-3.5 w-9 h-9 border-b-2 border-l-2 border-[#b38728]" />
      <div className="absolute bottom-3.5 right-3.5 w-9 h-9 border-b-2 border-r-2 border-[#b38728]" />

      {/* Marca de agua de fondo institucional */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
        <Image
          src="/logo.png"
          alt="Marca de Agua Institucional"
          width={440}
          height={140}
          className="w-[300px] sm:w-[440px] h-auto object-contain"
          unoptimized
        />
      </div>

      {/* Marca de agua flotante de seguridad para visor de solo consulta (NO descargable) */}
      {isReadOnlyViewer && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="rotate-[-24deg] border-4 border-dashed border-amber-800/25 bg-amber-500/5 px-8 py-4 rounded-3xl backdrop-blur-[1px] text-center space-y-1">
            <span className="text-xl sm:text-3xl font-black uppercase tracking-[0.35em] text-amber-900/40 block leading-tight">
              COPIA DE CONSULTA
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-900/50 block">
              Documento digital autenticado en línea · IPT Course
            </span>
          </div>
        </div>
      )}

      {/* Contenido Estructurado del Diploma */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
        {/* 1. Cabecera Institucional */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full border-b border-[#e5dec9] pb-4 sm:pb-5 gap-3 sm:gap-0">
          <div className="flex items-center gap-3 text-left">
            <Image
              src="/logo.png"
              alt="IPT Course"
              width={120}
              height={40}
              className="h-8 sm:h-10 w-auto object-contain"
              unoptimized
            />
            <div>
              <p className="text-[11px] sm:text-[13px] font-black uppercase tracking-[0.2em] text-[#065fd4]">
                IPT Course
              </p>
              <p className="text-[8px] sm:text-[9.5px] font-semibold text-[#66635a] tracking-wider uppercase">
                Ivan Perez Tech · Acreditación Técnica
              </p>
            </div>
          </div>

          {/* Badge de Progreso y Horas */}
          <div className="text-center px-2 sm:px-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#065fd4]/10 border border-[#065fd4]/30 text-[#065fd4] text-[10px] sm:text-[11px] font-bold tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#065fd4]" />
              <span>{displayedProgress}% Completado</span>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-[11px] sm:text-[13px] font-black uppercase tracking-[0.2em] text-[#161c2d]">
              TecnoGan & IPT
            </p>
            <p className="text-[8px] sm:text-[9.5px] font-semibold text-[#66635a] tracking-wider uppercase">
              Certificación Oficial
            </p>
          </div>
        </div>

        {/* 2. Título Protocolario */}
        <div className="space-y-1 pt-1 sm:pt-2">
          <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-[0.3em] uppercase text-[#855f13]">
            Certificado de Acreditación Oficial
          </h1>
          <p className="text-[9.5px] sm:text-[11px] text-[#555248] tracking-widest uppercase">
            Se otorga con pleno reconocimiento a
          </p>
        </div>

        {/* 3. Nombre del Alumno */}
        <div className="py-1 sm:py-2 w-full">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-[#161c2d] tracking-tight pb-1.5 border-b-2 border-[#b38728]/45 px-4 sm:px-8 inline-block">
            {cert.studentName}
          </h2>
        </div>

        {/* 4. Descripción del Logro Académico */}
        <div className="max-w-2xl mx-auto space-y-2 px-2">
          <p className="text-xs sm:text-sm text-[#44423b] leading-relaxed">
            Por haber superado los módulos de capacitación, proyectos aplicados y las evaluaciones prácticas correspondientes al programa de especialización:
          </p>
          <p className="text-base sm:text-lg md:text-xl font-extrabold text-[#065fd4] leading-snug">
            {cert.courseTitle}
          </p>
          <p className="text-[10px] sm:text-[11.5px] text-[#66635a] leading-relaxed pt-1">
            Certificación técnica expedida conjuntamente por IPT Course y TecnoGan como parte del programa oficial de formación técnica y zootécnica de Ivan Perez Tech (IPT).
          </p>
        </div>

        {/* 5. Criterios de Calificación y Rendimiento */}
        <div className="w-full max-w-xl mx-auto py-2 px-4 rounded-xl bg-[#f4ecd8]/60 border border-[#dfd4ba] grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[8.5px] sm:text-[10px] uppercase font-bold text-[#755512] block">
              Dedicación Total
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[#161c2d]">
              {cert.completionHours || 20} Horas
            </span>
          </div>
          <div className="border-x border-[#dfd4ba]">
            <span className="text-[8.5px] sm:text-[10px] uppercase font-bold text-[#755512] block">
              Nota Obtenida
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-800">
              {typeof cert.scoreAverage === 'number'
                ? cert.scoreAverage <= 5
                  ? `${cert.scoreAverage.toFixed(1)} / 5.0`
                  : `${cert.scoreAverage}%`
                : '4.8 / 5.0'}
            </span>
          </div>
          <div>
            <span className="text-[8.5px] sm:text-[10px] uppercase font-bold text-[#755512] block">
              Condición Final
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aprobado</span>
            </span>
          </div>
        </div>

        {/* 6. Sellos, Firmas y Verificación QR */}
        <div className="w-full pt-5 sm:pt-7 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end border-t border-[#e5dec9] mt-4 sm:mt-6">
          {/* Firma Directiva IPT */}
          <div className="flex flex-col items-center text-center space-y-1">
            <div className="h-10 flex items-center justify-center">
              <svg
                className="w-40 h-10 text-[#161c2d]"
                viewBox="0 0 150 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 25 C 28 8, 42 32, 65 14 C 82 -2, 78 32, 105 18 C 122 8, 138 22, 144 16" />
                <path d="M30 24 L 95 24" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>
            <div className="w-48 h-[1.5px] bg-[#161c2d]" />
            <p className="text-[11.5px] font-bold text-[#161c2d] leading-none">
              Iván Samuel Pérez Torrenegra
            </p>
            <p className="text-[9px] text-[#66635a] font-medium leading-tight">
              Dirección General · Ivan Perez Tech (IPT)
            </p>
          </div>

          {/* Sello Dorado Clásico de IPT */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#997018] via-[#e5c468] to-[#b38728] p-1 shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-full border-2 border-dashed border-[#593f0b] flex flex-col items-center justify-center text-center bg-[#b88c2b]/20">
                <Award className="w-6 h-6 text-[#593f0b] mb-0.5" />
                <span className="text-[7.5px] font-black uppercase tracking-wider text-[#3d2a05] leading-none">
                  IPT COURSE
                </span>
                <span className="text-[6.5px] font-bold text-[#3d2a05] leading-none mt-0.5">
                  OFICIAL
                </span>
              </div>
            </div>
          </div>

          {/* QR de Validación Oficial */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-13 h-13 bg-white border border-[#d1c8b0] rounded-lg p-1 flex items-center justify-center shadow-xs">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(
                    qrVerificationUrl
                  )}`}
                  alt={`QR Verificación ${cert.id}`}
                  width={52}
                  height={52}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-mono font-black text-[#855f13] leading-none">
                  {cert.id}
                </p>
                <p className="text-[8.5px] text-[#66635a] leading-none mt-1">
                  Fecha: {cert.issueDateFormatted || 'Octubre de 2026'}
                </p>
                <p className="text-[8px] font-mono text-[#8a8679] leading-none mt-1">
                  Hash: {cert.verificationHash?.slice(0, 16) || 'IPT-VALID'}...
                </p>
              </div>
            </div>
            <p className="text-[8px] text-[#8c887b] leading-tight max-w-[190px]">
              Escanea el QR o verifica en {typeof window !== 'undefined' ? window.location.host : 'ipt-course'}/verify/{cert.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
