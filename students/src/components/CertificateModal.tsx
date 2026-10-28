'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  QrCode,
  CreditCard,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Certificate } from '@/types';
import Image from 'next/image';
import { ref, set, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useSubscription } from '@/context/SubscriptionContext';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  courseSlug?: string;
  courseTitle?: string;
  defaultStudentName?: string;
  scoreAverage?: number;
  progressPercent?: number;
  initialCertificate?: Certificate | null;
}

export default function CertificateModal({
  isOpen,
  onClose,
  user,
  courseSlug = '',
  courseTitle = '',
  defaultStudentName,
  scoreAverage = 5.0,
  progressPercent = 100,
  initialCertificate = null,
}: CertificateModalProps) {
  const [cert, setCert] = useState<Certificate | null>(initialCertificate);
  const [studentName, setStudentName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [convertingTrial, setConvertingTrial] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const { containerRef } = useModalA11y({ isOpen, onClose });
  const {
    entitlements,
    convertTrialForCertificate,
    openPricingModal,
  } = useSubscription();

  const issueAndPersistCertificate = useCallback(
    async (computedName: string) => {
      const uid = user?.uid || 'guest_student_local';
      const now = new Date();
      const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newCertId = `IPT-CERT-${cleanUid || 'ST'}-${randomPart}`;

      const months = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      const formattedDate = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;

      const newCertificate: Certificate = {
        id: newCertId,
        userId: uid,
        studentName: computedName,
        studentEmail: user?.email || 'estudiante@ivanperez.tech',
        courseSlug,
        courseTitle,
        instructor: 'Equipo Académico de IPT Academy',
        instructorRole: 'Acreditado formalmente por Ivan Perez Tech (IPT)',
        issueDate: now.toISOString(),
        issueDateFormatted: formattedDate,
        completionHours: 34,
        scoreAverage: scoreAverage || 96,
        progressPercent: progressPercent || 100,
        verificationHash: `IPT-${cleanUid}${Date.now().toString(16).toUpperCase()}`,
        status: 'valid',
      };

      if (user?.uid) {
        await Promise.all([
          set(ref(db, `certificates/${newCertId}`), newCertificate),
          set(ref(db, `users/${user.uid}/certificates/${courseSlug}`), newCertId),
          set(ref(db, `progress/${user.uid}/${courseSlug}/certificateId`), newCertId),
        ]).catch(() => {});
      }

      setCert(newCertificate);
    },
    [user, courseSlug, courseTitle, scoreAverage, progressPercent]
  );

  useEffect(() => {
    if (!isOpen) return;
    setConversionError(null);

    if (initialCertificate) {
      setCert(initialCertificate);
      setStudentName(initialCertificate.studentName);
      return;
    }

    const computedName =
      defaultStudentName ||
      user?.displayName ||
      (user?.email
        ? user.email
            .split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Estudiante Graduado');

    setStudentName(computedName);

    if (user) {
      setLoading(true);
      const userCertRef = ref(db, `users/${user.uid}/certificates/${courseSlug}`);
      get(userCertRef)
        .then(async (snap) => {
          // 1. Si el certificado ya fue emitido antes, SIEMPRE se puede ver (incluso en read_only o Free)
          if (snap.exists()) {
            const certId = snap.val();
            const certSnap = await get(ref(db, `certificates/${certId}`));
            if (certSnap.exists()) {
              const loadedCert = certSnap.val() as Certificate;
              setCert({
                ...loadedCert,
                progressPercent: loadedCert.progressPercent || progressPercent,
              });
              setStudentName(loadedCert.studentName);
              setLoading(false);
              return;
            }
          }

          // 2. Si es una NUEVA emisión, verificar entitlements (canClaimCertificates vs certificateRequiresConversion)
          if (!entitlements.canClaimCertificates) {
            setCert(null);
            setLoading(false);
            return;
          }

          await issueAndPersistCertificate(computedName);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error cargando certificado:', err);
          setLoading(false);
        });
    } else {
      if (entitlements.canClaimCertificates) {
        issueAndPersistCertificate(computedName);
      } else {
        setCert(null);
      }
    }
  }, [
    isOpen,
    user,
    courseSlug,
    initialCertificate,
    defaultStudentName,
    scoreAverage,
    progressPercent,
    entitlements.canClaimCertificates,
    issueAndPersistCertificate,
  ]);

  if (!isOpen) return null;

  const handleEarlyConversionAndIssue = async () => {
    setConversionError(null);
    setConvertingTrial(true);
    try {
      await convertTrialForCertificate();
      await issueAndPersistCertificate(studentName || 'Estudiante IPT');
    } catch (err: any) {
      setConversionError(
        err?.message || 'No se pudo procesar el cobro anticipado. Verifica tu medio de pago.'
      );
    } finally {
      setConvertingTrial(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = () => {
    if (!cert) return;
    navigator.clipboard.writeText(cert.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayedProgress = cert?.progressPercent || progressPercent || 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-5xl bg-[#14151f] border border-[#2a2c3e] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col outline-hidden"
      >
        {/* Barra superior de controles */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-[#1b1d2a] border-b border-[#2e3144]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="certificate-modal-title"
                className="text-sm font-bold text-white flex items-center gap-2"
              >
                <span>Certificado Oficial IPT Academy</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {displayedProgress}% Completado
                </span>
              </h3>
              <p className="text-xs text-[#9194ac]">
                Acreditación Oficial de Formación Técnica · Ivan Perez Tech (IPT)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cert && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Imprimir o Guardar como PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Descargar Certificado (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-2 rounded-xl bg-[#252839] hover:bg-[#2f3349] text-[#c0c4fc] text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#3d425b] cursor-pointer"
                  title="Copiar código de validación"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copiado' : cert?.id || 'Copiar Código'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal de certificado"
              className="p-2 rounded-xl bg-[#252839] hover:bg-[#33374e] text-[#9194ac] hover:text-white transition-all ml-2 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zona del Diploma o Compuerta de Conversión Anticipada en Trial */}
        <div className="p-2 sm:p-4 md:p-8 flex justify-center bg-[#0c0d14] overflow-x-auto w-full">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#9194ac]">
                Verificando acreditación oficial IPT Academy...
              </p>
            </div>
          ) : !cert && entitlements.certificateRequiresConversion ? (
            <div className="max-w-xl w-full my-8 p-6 sm:p-8 rounded-2xl bg-[#1b1d2a] border border-amber-500/40 text-left space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Certificación Anticipada en Periodo de Prueba
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                    ¡Felicitaciones por completar el curso durante tu prueba gratuita!
                  </h4>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#c7c9d9] leading-relaxed">
                Para proteger la validez institucional de los diplomas y evitar emisiones automatizadas sin membresía activa, la expedición del{' '}
                <strong className="text-white">
                  Certificado Oficial verificable con código QR
                </strong>{' '}
                durante los días de prueba requiere liquidar el primer mes de tu suscripción en este momento.
              </p>

              <div className="p-4 rounded-xl bg-[#14151f] border border-[#2e3144] space-y-1.5 text-xs text-[#9194ac]">
                <p className="text-white font-semibold">¿Qué ocurre al confirmar?</p>
                <p>• Se finaliza tu periodo de prueba y comienza de inmediato tu primer ciclo mensual pagado.</p>
                <p>• Tu certificado oficial queda emitido de forma vitalicia (incluso si más adelante decides cancelar).</p>
              </div>

              {conversionError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{conversionError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#252839] hover:bg-[#33374e] text-xs font-semibold text-white cursor-pointer"
                >
                  Seguir en prueba gratuita sin emitir aún
                </button>
                <button
                  type="button"
                  disabled={convertingTrial}
                  onClick={handleEarlyConversionAndIssue}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#14151f] text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {convertingTrial
                      ? 'Procesando pago y emitiendo...'
                      : 'Liquidar primer mes ahora y Emitir Certificado'}
                  </span>
                </button>
              </div>
            </div>
          ) : !cert ? (
            <div className="max-w-lg w-full my-8 p-6 sm:p-8 rounded-2xl bg-[#1b1d2a] border border-[#2e3144] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#252839] flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Emisión de nuevos certificados disponible en Planes Pro y Pro+
              </h4>
              <p className="text-xs text-[#9194ac] leading-relaxed">
                Tus certificados emitidos anteriormente están disponibles para siempre en tu perfil, pero para expedir un nuevo diploma oficial necesitas una suscripción activa.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPricingModal('pro');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-bold cursor-pointer"
                >
                  Ver Planes Pro y Pro+
                </button>
              </div>
            </div>
          ) : (
            <div
              id="printable-diploma"
              className="relative w-full max-w-[900px] bg-[#faf8f2] text-[#1c1c24] rounded-2xl p-4 sm:p-8 md:p-12 shadow-2xl border-[4px] sm:border-[8px] border-[#161c2d] select-none"
              style={{
                boxShadow:
                  '0 25px 60px -15px rgba(0, 0, 0, 0.7), inset 0 0 0 2px #d4af37, inset 0 0 0 5px #f4ebd0, inset 0 0 0 7px #b38728',
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif',
              }}
            >
              {/* Marco Ornamental Clásico en Esquinas */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#b38728]" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#b38728]" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#b38728]" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#b38728]" />

              {/* Marca de agua de fondo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
                <Image
                  src="/logo.png"
                  alt="Marca de Agua"
                  width={420}
                  height={140}
                  className="w-[280px] sm:w-[420px] h-auto object-contain"
                />
              </div>

              {/* Contenido del Diploma */}
              <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
                {/* Cabecera Institucional */}
                <div className="flex flex-col sm:flex-row items-center justify-between w-full border-b border-[#e5dec9] pb-4 sm:pb-5 gap-3 sm:gap-0">
                  <div className="flex items-center gap-3 text-left">
                    <Image
                      src="/logo.png"
                      alt="IPT Academy"
                      width={120}
                      height={40}
                      className="h-8 sm:h-10 w-auto object-contain"
                    />
                    <div>
                      <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-[#065fd4]">
                        IPT Academy
                      </p>
                      <p className="text-[8px] sm:text-[9px] font-semibold text-[#66635a] tracking-wider uppercase">
                        Ivan Perez Tech · Formación Técnica
                      </p>
                    </div>
                  </div>

                  {/* Badge de Progreso Completado */}
                  <div className="text-center px-2 sm:px-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#065fd4]/10 border border-[#065fd4]/30 text-[#065fd4] text-[10px] font-bold tracking-widest uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#065fd4]" />
                      <span>{displayedProgress}% Completado</span>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-[#161c2d]">
                      IPT (Ivan Perez Tech)
                    </p>
                    <p className="text-[8px] sm:text-[9px] font-semibold text-[#66635a] tracking-wider uppercase">
                      Acreditación Oficial
                    </p>
                  </div>
                </div>

                {/* Título Principal */}
                <div className="space-y-1 pt-2">
                  <h1 className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-[#855f13]">
                    Certificado de Acreditación Oficial
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-[#555248] tracking-widest uppercase">
                    Se otorga con pleno reconocimiento a
                  </p>
                </div>

                {/* Nombre del Alumno */}
                <div className="py-2 w-full">
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-[#161c2d] tracking-tight pb-1 border-b-2 border-[#b38728]/40 px-4 sm:px-6 inline-block">
                    {cert?.studentName || studentName}
                  </h2>
                </div>

                {/* Descripción del Logro */}
                <div className="max-w-2xl mx-auto space-y-2 px-2">
                  <p className="text-xs md:text-sm text-[#44423b] leading-relaxed">
                    Por haber superado los módulos de capacitación y las evaluaciones prácticas correspondientes al programa de especialización:
                  </p>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-[#065fd4] leading-snug">
                    {cert?.courseTitle || courseTitle}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#66635a] leading-relaxed pt-1">
                    Certificación oficial expedida por IPT Academy como parte del programa de formación técnica de Ivan Perez Tech (IPT).
                  </p>
                </div>

                {/* Sellos, Firmas y Metadatos */}
                <div className="w-full pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end border-t border-[#e5dec9] mt-6">
                  {/* Firma Directiva de IPT Academy */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className="h-10 flex items-center justify-center">
                      <svg
                        className="w-36 h-9 text-[#161c2d]"
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
                    <div className="w-44 h-[1.5px] bg-[#161c2d]" />
                    <p className="text-[11px] font-bold text-[#161c2d] leading-none">
                      Dirección Académica · IPT
                    </p>
                    <p className="text-[9px] text-[#66635a] font-medium leading-tight">
                      IPT Academy · Acreditación Oficial
                    </p>
                  </div>

                  {/* Sello de Oro IPT */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#997018] via-[#e5c468] to-[#b38728] p-1 shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full border-2 border-dashed border-[#593f0b] flex flex-col items-center justify-center text-center bg-[#b88c2b]/20">
                        <Award className="w-6 h-6 text-[#593f0b] mb-0.5" />
                        <span className="text-[7px] font-black uppercase tracking-wider text-[#3d2a05] leading-none">
                          IPT ACADEMY
                        </span>
                        <span className="text-[6px] font-bold text-[#3d2a05] leading-none mt-0.5">
                          OFICIAL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identificador & QR Escaneable Real */}
                  <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/verify?code=${encodeURIComponent(cert?.id || 'IPT-CERT')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Escanear o hacer clic para verificar validez pública"
                        className="w-12 h-12 bg-white border border-[#d1c8b0] rounded p-1 flex items-center justify-center shadow-xs hover:border-[#065fd4] transition-colors shrink-0"
                      >
                        {cert?.id ? (
                          <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
                              `${
                                typeof window !== 'undefined' ? window.location.origin : ''
                              }/verify?code=${cert.id}`
                            )}`}
                            alt={`QR ${cert.id}`}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <QrCode className="w-8 h-8 text-[#161c2d]" />
                        )}
                      </a>
                      <div className="text-left">
                        <p className="text-[8px] font-mono font-bold text-[#855f13] leading-none">
                          {cert?.id || 'IPT-CERT'}
                        </p>
                        <p className="text-[8px] text-[#66635a] leading-none mt-1">
                          Fecha: {cert?.issueDateFormatted || 'Octubre 2026'}
                        </p>
                        <p className="text-[8px] text-emerald-700 font-bold leading-none mt-1">
                          Calificación: {cert?.scoreAverage || scoreAverage}%
                        </p>
                      </div>
                    </div>
                    <p className="text-[8px] text-[#8c887b] leading-tight max-w-[170px]">
                      Escanea el QR o verifica en{' '}
                      {typeof window !== 'undefined' ? window.location.host : ''}/verify
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie con indicaciones institucionales */}
        <div className="no-print px-6 py-3.5 bg-[#171824] border-t border-[#2e3144] flex flex-wrap items-center justify-between text-xs text-[#9194ac] gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Documento emitido oficialmente por IPT Academy bajo acreditación institucional de Ivan Perez Tech (IPT).
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#252839] hover:bg-[#33374e] text-white font-semibold transition-all cursor-pointer"
          >
            Volver a la plataforma
          </button>
        </div>
      </div>

      {/* Reglas de impresión CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-diploma,
          #printable-diploma * {
            visibility: visible !important;
          }
          #printable-diploma {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 6px solid #161c2d !important;
            padding: 2.5rem !important;
            background-color: #faf8f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
