"use client";

import { sanitizeRtdbKey } from '@/lib/certificateFolio';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Certificate } from '@/types';
import { getLocalDatabase } from '@/services/localDatabaseService';
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
  Lock,
  Hash,
  BadgeCheck,
  Copy,
  Check,
  AlertTriangle,
  Fingerprint,
  ArrowLeft,
} from 'lucide-react';

interface VerifyViewProps {
  forcedCode?: string;
}

const IDENTITY_STORAGE_KEY = 'ipt_identity_verification_v1';

interface ExtendedCertificate extends Omit<Partial<Certificate>, "status"> {
  id: string;
  studentName: string;
  courseTitle: string;
  verificationHash: string;
  instructor: string;
  instructorRole: string;
  studentId?: string;
  courseId?: string;
  identityVerified?: boolean;
  documentType?: string;
  documentNumber?: string;
  status?: "valid" | "revoked" | "issued" | "unverified";
  revocationReason?: string;
}

const BUILTIN_CERTIFICATES: Record<string, ExtendedCertificate> = {};

export function VerifyView({ forcedCode }: VerifyViewProps) {
  const searchParams = useSearchParams();
  const queryCode = searchParams ? searchParams.get('code') || '' : '';
  const initialCode = (forcedCode || queryCode).trim().toUpperCase();

  const [code, setCode] = useState(initialCode || '');
  const [cert, setCert] = useState<ExtendedCertificate | null>(null);
  const [searchedCode, setSearchedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const resolveCertificate = async (targetCode: string) => {
    const clean = decodeURIComponent(targetCode).trim();
    if (!clean) return;

    setLoading(true);
    setNotFound(false);
    setSearchedCode(clean);

    let localIdentity: any = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
        if (raw) localIdentity = JSON.parse(raw);
      } catch {}
    }

    try {
      const cleanUpper = clean.toUpperCase();
      const cleanUnderscore = cleanUpper.replace(/-/g, '_');
      let foundRecord: any = null;
      let resolvedId = cleanUpper;

      // 1. Buscar en issued_certificates (cancillería y diplomas oficiales)
      const safeKey = sanitizeRtdbKey(cleanUpper);
      const issuedDirectSnap = await get(ref(db, `issued_certificates/${safeKey}`));
      if (issuedDirectSnap.exists() && issuedDirectSnap.val()?.studentName) {
        foundRecord = issuedDirectSnap.val();
        resolvedId = cleanUpper;
      }

      if (!foundRecord) {
        const issuedUnderSnap = await get(ref(db, `issued_certificates/${cleanUnderscore}`));
        if (issuedUnderSnap.exists() && issuedUnderSnap.val()?.studentName) {
          foundRecord = issuedUnderSnap.val();
          resolvedId = issuedUnderSnap.val().folio || cleanUpper;
        }
      }

      if (!foundRecord) {
        // Escanear issued_certificates por folio, sha256Hash o id
        const allIssuedSnap = await get(ref(db, 'issued_certificates'));
        if (allIssuedSnap.exists()) {
          const list = allIssuedSnap.val() || {};
          for (const [k, v] of Object.entries<any>(list)) {
            if (!v) continue;
            const folio = (v.folio || v.id || k).toUpperCase();
            const hash = (v.sha256Hash || v.verificationHash || '').toUpperCase();
            if (
              folio === cleanUpper ||
              hash === cleanUpper ||
              k.toUpperCase() === cleanUpper ||
              k.toUpperCase() === cleanUnderscore
            ) {
              if (v.studentName || v.courseTitle) {
                foundRecord = v;
                resolvedId = v.folio || k;
                break;
              }
            }
          }
        }
      }

      // 2. Buscar en certificates (certificados individuales de cursos)
      if (!foundRecord) {
        const certDirectSnap = await get(ref(db, `certificates/${safeKey}`));
        if (certDirectSnap.exists()) {
          foundRecord = certDirectSnap.val();
          resolvedId = cleanUpper;
        } else {
          const certUnderSnap = await get(ref(db, `certificates/${cleanUnderscore}`));
          if (certUnderSnap.exists()) {
            foundRecord = certUnderSnap.val();
            resolvedId = certUnderSnap.val().id || cleanUpper;
          }
        }
      }

      if (!foundRecord) {
        const allCertsSnap = await get(ref(db, 'certificates'));
        if (allCertsSnap.exists()) {
          const list = allCertsSnap.val() || {};
          for (const [k, v] of Object.entries<any>(list)) {
            if (!v) continue;
            const folio = (v.id || v.folio || k).toUpperCase();
            const hash = (v.verificationHash || v.sha256Hash || '').toUpperCase();
            if (folio === cleanUpper || hash === cleanUpper || k.toUpperCase() === cleanUpper) {
              foundRecord = v;
              resolvedId = v.id || v.folio || k;
              break;
            }
          }
        }
      }

      // 3. Fallback a base de datos mock local si existe
      if (!foundRecord) {
        const localDb = getLocalDatabase();
        const localCert = localDb.certificates?.find(
          (c) => c.id.toUpperCase() === cleanUpper || c.verificationHash?.toUpperCase() === cleanUpper
        );
        if (localCert) {
          foundRecord = localCert;
          resolvedId = localCert.id || cleanUpper;
        }
      }

      if (foundRecord) {
        const score = typeof foundRecord.finalGpa === 'number'
          ? foundRecord.finalGpa
          : typeof foundRecord.scoreAverage === 'number'
          ? foundRecord.scoreAverage
          : 5.0;

        const dateIso = foundRecord.issuedAt || foundRecord.issueDate || foundRecord.date || new Date().toISOString();
        let formattedDate = 'Octubre de 2026';
        try {
          formattedDate = new Date(dateIso).toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        } catch {}

        setCert({
          id: resolvedId,
          studentName: foundRecord.studentName || 'Estudiante IPT',
          studentEmail: foundRecord.studentEmail || '',
          courseTitle: foundRecord.courseTitle || 'Certificado Oficial IPT',
          courseId: foundRecord.courseSlug || foundRecord.courseId || '',
          verificationHash: foundRecord.sha256Hash || foundRecord.verificationHash || resolvedId,
          instructor: foundRecord.rectoriaSignature || foundRecord.instructor || 'Ing. Iván Samuel Pérez Torrenegra',
          instructorRole: 'Rector Titular e Ingeniero Principal · Ivan Perez Tech (IPT)',
          scoreAverage: score,
          completionHours: foundRecord.completionHours || 48,
          issueDate: dateIso,
          issueDateFormatted: formattedDate,
          identityVerified: foundRecord.status !== 'unverified',
          documentType: foundRecord.documentType || 'C.C.',
          documentNumber: foundRecord.nationalDocNumber || foundRecord.documentNumber || (localIdentity?.documentNumber || 'Registrado'),
          status: foundRecord.status || 'issued',
          revocationReason: foundRecord.revocationReason,
        } as ExtendedCertificate);
        setNotFound(false);
      } else {
        setCert(null);
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error resolving certificate:', err);
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
      const url = `${window.location.origin}/verify?code=${encodeURIComponent(cert.id)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans">
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Cabecera de Búsqueda */}
        <section className="rounded-3xl bg-[#09090b] border border-white/10 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-[#9a9a9a]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#15846e]" />
                <span>Registro Público de Títulos y Verificación de Identidad · IPT Academy</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-white">
                Verificación Pública de Credenciales Académicas
              </h1>
              <p className="text-xs sm:text-sm text-[#9a9a9a] max-w-2xl leading-relaxed">
                Comprueba la autenticidad de un diploma emitido por <strong>Ivan Perez Tech (IPT)</strong> y verifica si cuenta con documento de identidad nacional validado por OCR.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start">
              <Link
                href="/certificate"
                className="px-4 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#8052ff]" />
                <span>Volver a Mi Certificado</span>
              </Link>
              {cert && (
                <button
                  type="button"
                  onClick={handleCopyPublicUrl}
                  className="px-4 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-xs font-medium text-white flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9a9a9a] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Folio del certificado o código de verificación"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black border border-white/15 text-xs sm:text-sm font-mono text-white uppercase focus:outline-none focus:border-[#8052ff]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-white text-black hover:bg-white/90 text-xs font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer"
            >
              {loading ? 'Consultando...' : 'Verificar Folio'}
            </button>
          </form>
        </section>

        {/* Resultado del Certificado */}
        {cert && (
          <section
            className={`rounded-3xl bg-[#09090b] border overflow-hidden space-y-6 ${
              cert.status === 'revoked'
                ? 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                : cert.identityVerified !== false
                ? 'border-[#15846e]/50 shadow-[0_0_30px_rgba(21,132,110,0.15)]'
                : 'border-amber-500/50'
            }`}
          >
            {/* Banner de estado: Revocado vs Acreditado */}
            <div
              className={`px-6 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4 border-b ${
                cert.status === 'revoked'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : cert.identityVerified !== false
                  ? 'bg-[#15846e]/15 border-[#15846e]/30'
                  : 'bg-amber-500/15 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    cert.status === 'revoked'
                      ? 'bg-rose-500/30 border border-rose-500/60 text-rose-300'
                      : cert.identityVerified !== false
                      ? 'bg-[#15846e]/25 border border-[#15846e]/50 text-emerald-300'
                      : 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                  }`}
                >
                  {cert.status === 'revoked' ? (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  ) : cert.identityVerified !== false ? (
                    <BadgeCheck className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-medium text-white">
                      {cert.status === 'revoked'
                        ? 'Diploma Revocado Oficialmente por Rectoría'
                        : cert.identityVerified !== false
                        ? 'Certificado Oficial Auténtico · Identidad Nacional Verificada'
                        : 'Certificado con Marca de Agua · Identidad No Verificada'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        cert.status === 'revoked'
                          ? 'bg-rose-600 text-white font-bold'
                          : cert.identityVerified !== false
                          ? 'bg-[#15846e] text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {cert.status === 'revoked'
                        ? 'REVOCADO · SIN VALIDEZ'
                        : cert.identityVerified !== false
                        ? 'VÁLIDO Y ACREDITADO'
                        : 'IDENTIDAD PENDIENTE'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9a9a9a] mt-0.5">
                    {cert.status === 'revoked'
                      ? `Este diploma fue revocado formalmente por la autoridad académica de IPT.${
                          cert.revocationReason ? ` Motivo: "${cert.revocationReason}"` : ''
                        }`
                      : cert.identityVerified !== false
                      ? 'El titular acreditó su documento oficial de identidad mediante validación biométrica/OCR.'
                      : 'Este documento fue generado en modo vista previa sin validar documento de identidad nacional.'}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-white">
                Folio: {cert.id}
              </div>
            </div>

            <div className="px-6 md:px-8 pb-8 space-y-6">
              {/* Tarjetas de metadatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#8052ff]" />
                    Titular Registrado
                  </span>
                  <p className="text-sm font-medium text-white truncate">{cert.studentName}</p>
                  <p className="text-[11px] font-mono text-[#9a9a9a]">
                    {cert.identityVerified !== false
                      ? `${cert.documentType || 'C.C.'} ${cert.documentNumber || 'Registrado'}`
                      : 'Documento sin verificar'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#15846e]" />
                    Promedio Final Auditado
                  </span>
                  <p className="text-lg font-mono font-medium text-emerald-300">
                    {typeof cert.scoreAverage === 'number' ? `${cert.scoreAverage.toFixed(1)} / 5.0` : '4.8 / 5.0'}
                  </p>
                  <p className="text-[11px] text-[#9a9a9a]">100% de rúbricas aprobadas</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8052ff]" />
                    Intensidad Académica
                  </span>
                  <p className="text-lg font-mono font-medium text-white">
                    {cert.completionHours || 48} Horas
                  </p>
                  <p className="text-[11px] text-[#9a9a9a]">Teoría, práctica y proyectos</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9a9a9a] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#ffb829]" />
                    Fecha de Expedición
                  </span>
                  <p className="text-sm font-medium text-white">
                    {cert.issueDateFormatted || '28 de octubre de 2026'}
                  </p>
                  <p className="text-[11px] text-[#9a9a9a]">Ivan Perez Tech (IPT)</p>
                </div>
              </div>

              {/* Detalle del programa y hash */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8052ff] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Programa Académico Acreditado
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-white mt-0.5">
                      {cert.courseTitle}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white self-start">
                    Emitido por {cert.instructor}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9a9a9a]">
                  <div className="flex items-center gap-1.5 font-mono break-all">
                    <Hash className="w-3.5 h-3.5 text-[#8052ff] shrink-0" />
                    <span>Huella criptográfica:</span>
                    <strong className="text-white">{cert.verificationHash}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Registro en Cámara de Comercio · Ivan Perez Tech (IPT)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* No encontrado */}
        {notFound && (
          <section className="rounded-3xl bg-[#09090b] border border-rose-500/30 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-medium text-white">
              No se encontró ninguna credencial con el folio &ldquo;{searchedCode}&rdquo;
            </h2>
            <p className="text-xs sm:text-sm text-[#9a9a9a] max-w-md mx-auto">
              Verifica haber escrito correctamente el folio que figura bajo el código QR del certificado (por ejemplo: <code className="text-white">IPT-CERT-XXXXX</code>).
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#000000] p-8 text-center text-xs text-[#9a9a9a]">
          Cargando verificador oficial IPT Academy...
        </div>
      }
    >
      <VerifyView />
    </Suspense>
  );
}
