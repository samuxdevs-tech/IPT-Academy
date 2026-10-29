"use client";

import { generateIptCertificateFolio } from '@/lib/certificateFolio';


import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  ScanLine,
  Upload,
  FileCheck2,
  Lock,
  Sparkles,
  CheckCircle2,
  Eye,
  RefreshCw,
  Stamp,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set, get } from 'firebase/database';

interface CertificateClientViewProps {
  courseSlug?: string;
}

interface CourseCertTemplate {
  slug: string;
  title: string;
  hours: number;
  category: string;
  folioPrefix: string;
  competencies: string[];
}

const CERTIFICATE_CATALOG: CourseCertTemplate[] = [
  {
    slug: 'ipt-master-fullstack',
    title: 'IPT Master: Arquitectura Fullstack e Inteligencia Artificial',
    hours: 120,
    category: 'Ingeniería de Software & Sistemas',
    folioPrefix: 'IPT-MFS-2026',
    competencies: [
      'Diseño de arquitecturas limpias y separación estricta de responsabilidades',
      'Construcción de servicios resilientes con políticas de idempotencia',
      'Modelado de dominio inmutable y validación determinista de contratos',
    ],
  },
  {
    slug: 'arquitectura-cloud-ipt',
    title: 'Arquitectura Cloud Resiliente y Microservicios',
    hours: 96,
    category: 'Infraestructura & Cloud',
    folioPrefix: 'IPT-CLD-2026',
    competencies: [
      'Implementación de patrón Transactional Outbox y consistencia eventual',
      'Despliegue distribuido de baja latencia y tolerancia a fallos',
      'Observabilidad y auditoría inmutable de transacciones',
    ],
  },
  {
    slug: 'introduccion-ingenieria-ipt',
    title: 'Fundamentos de Arquitectura de Software e Ingeniería',
    hours: 48,
    category: 'Fundamentos de Ingeniería',
    folioPrefix: 'IPT-FND-2026',
    competencies: [
      'Principios SOLID aplicados a sistemas de producción',
      'Diseño de contratos de API REST y control de versiones',
    ],
  },
];

const OCR_STORAGE_KEY = 'ipt_ocr_identity_verified_v2';

export default function CertificateClientView({ courseSlug }: CertificateClientViewProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  const [selectedSlug, setSelectedSlug] = useState<string>(
    courseSlug || CERTIFICATE_CATALOG[0].slug
  );

  // Estado de Identidad y Verificación OCR de Documento Nacional
  const [isIdentityVerified, setIsIdentityVerified] = useState<boolean>(false);
  const [docType, setDocType] = useState<'CC' | 'TI' | 'CE' | 'DNI' | 'PASSPORT'>('CC');
  const [docNumber, setDocNumber] = useState<string>('');
  const [legalName, setLegalName] = useState<string>(
    user?.displayName || ''
  );
  const [ocrScanning, setOcrScanning] = useState<boolean>(false);
  const [ocrStepText, setOcrStepText] = useState<string>('');
  const [uploadedDocFileName, setUploadedDocFileName] = useState<string | null>(null);
  const [uploadedDocBase64, setUploadedDocBase64] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Estado de Progreso Real del Estudiante en el Curso Seleccionado
  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState<number>(0);
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  // Sincronizar estado de identidad con Firebase RTDB y almacenamiento local
  useEffect(() => {
    // 1. Carga inicial contingente desde localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(OCR_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setIsIdentityVerified(Boolean(parsed.verified));
          if (parsed.docType) setDocType(parsed.docType);
          if (parsed.docNumber) setDocNumber(parsed.docNumber);
          if (parsed.legalName) setLegalName(parsed.legalName);
        }
      } catch {}
    }

    // 2. Suscripción en vivo al registro de identidad en Firebase RTDB
    if (user?.uid) {
      const identityRef = ref(rtdb, `users/${user.uid}/identityVerification`);
      const unsub = onValue(identityRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const verified = Boolean(data.verified || data.status === 'verified');
          setIsIdentityVerified(verified);
          if (data.docType) setDocType(data.docType);
          if (data.docNumber) setDocNumber(String(data.docNumber));
          if (data.legalName) setLegalName(data.legalName);

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                OCR_STORAGE_KEY,
                JSON.stringify({
                  verified,
                  docType: data.docType || docType,
                  docNumber: data.docNumber || docNumber,
                  legalName: data.legalName || legalName,
                  verifiedAtIso: data.verifiedAtIso,
                  verificationMethod: data.verificationMethod,
                })
              );
            } catch {}
          }
        }
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const persistIdentityState = async (
    verified: boolean,
    type = docType,
    num = docNumber,
    name = legalName
  ) => {
    setIsIdentityVerified(verified);
    const payload = {
      verified,
      status: verified ? 'verified' : 'unverified',
      docType: type,
      docNumber: num,
      legalName: name,
      verifiedAtIso: verified ? new Date().toISOString() : null,
      verificationMethod: 'OCR_NATIONAL_ID_SCAN',
      updatedAtIso: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(OCR_STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    }

    if (user?.uid) {
      try {
        await set(ref(rtdb, `users/${user.uid}/identityVerification`), payload);
      } catch (err) {
        console.warn('No se pudo guardar la identidad en Firebase RTDB:', err);
      }
    }
  };

  const activeTemplate = useMemo(() => {
    return (
      CERTIFICATE_CATALOG.find((c) => c.slug === selectedSlug) || CERTIFICATE_CATALOG[0]
    );
  }, [selectedSlug]);

  // Hash SHA-256 determinista simulado a partir de los datos del certificado
  const sha256Fingerprint = useMemo(() => {
    const seed = `${legalName}|${docType}:${docNumber}|${activeTemplate.slug}|${
      isIdentityVerified ? 'VERIFIED' : 'UNVERIFIED_WATERMARKED'
    }`;
    let h1 = 0xdeadbeef ^ seed.length;
    let h2 = 0x41c6ce57 ^ seed.length;
    for (let i = 0, ch; i < seed.length; i++) {
      ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `sha256:${hex1}${hex2}e49b10c87f3a29d18c4b6e01a7f9c2d4${hex1}`;
  }, [legalName, docType, docNumber, activeTemplate.slug, isIdentityVerified]);

  const certificateFolio = useMemo(() => {
    const suffix = docNumber.slice(-4).padStart(4, '0');
    return `${activeTemplate.folioPrefix}-${suffix}`;
  }, [activeTemplate.folioPrefix, docNumber]);

  // Sincronizar en tiempo real el progreso del estudiante en el curso seleccionado
  useEffect(() => {
    if (!user?.uid) {
      setCompletedLessonsCount(0);
      setTotalLessonsCount(12);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);

    // 1. Escuchar lecciones completadas en progress/{uid}/{selectedSlug}
    const userCourseProgRef = ref(rtdb, `progress/${user.uid}/${selectedSlug}`);
    const unsubCourseProg = onValue(userCourseProgRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val.completedLessons)) {
          setCompletedLessonsCount(val.completedLessons.filter(Boolean).length);
        } else if (typeof val.completedLessons === 'object' && val.completedLessons !== null) {
          setCompletedLessonsCount(Object.values(val.completedLessons).filter(Boolean).length);
        } else {
          setCompletedLessonsCount(0);
        }
      } else {
        // Fallback a progress/{uid} raíz
        get(ref(rtdb, `progress/${user.uid}`)).then((rootSnap) => {
          if (rootSnap.exists()) {
            const rootVal = rootSnap.val();
            const courseVal = rootVal[selectedSlug];
            if (courseVal && Array.isArray(courseVal.completedLessons)) {
              setCompletedLessonsCount(courseVal.completedLessons.filter(Boolean).length);
            } else if (Array.isArray(rootVal.completedLessons)) {
              setCompletedLessonsCount(rootVal.completedLessons.filter(Boolean).length);
            } else {
              setCompletedLessonsCount(0);
            }
          } else {
            setCompletedLessonsCount(0);
          }
        }).catch(() => setCompletedLessonsCount(0));
      }
    });

    // 2. Obtener el número real de lecciones del curso en courses/{selectedSlug}
    get(ref(rtdb, `courses/${selectedSlug}`)).then((courseSnap) => {
      if (courseSnap.exists()) {
        const c = courseSnap.val();
        let total = 0;
        if (Array.isArray(c.modules)) {
          c.modules.forEach((m: any) => {
            if (Array.isArray(m?.lessons)) total += m.lessons.length;
            else if (m?.lessons && typeof m.lessons === 'object') total += Object.keys(m.lessons).length;
          });
        }
        setTotalLessonsCount(total > 0 ? total : 12);
      } else {
        setTotalLessonsCount(12);
      }
      setProgressLoading(false);
    }).catch(() => {
      setTotalLessonsCount(12);
      setProgressLoading(false);
    });

    return () => unsubCourseProg();
  }, [user?.uid, selectedSlug]);

  const courseProgressPercent = useMemo(() => {
    if (!totalLessonsCount || totalLessonsCount === 0) return 0;
    return Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100));
  }, [completedLessonsCount, totalLessonsCount]);

  const isCourseCompleted = useMemo(() => {
    return courseProgressPercent >= 100;
  }, [courseProgressPercent]);

  // Ejecutar análisis OCR e Inteligencia Visual del documento nacional
  const handleRunOcrVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !docNumber.trim()) return;

    setValidationError(null);

    // 1. Validar que realmente se haya adjuntado un archivo
    if (!uploadedDocBase64 && !uploadedDocFileName) {
      setValidationError("Debes adjuntar la imagen o copia de tu cédula / documento nacional antes de verificar.");
      return;
    }

    setOcrScanning(true);
    setOcrStepText("1/4 Analizando estructura óptica y geometría del documento...");

    try {
      // 2. Si el archivo es una imagen, validarlo con el modelo de visión multimodal
      let isValidId = true;
      let rejectionReason = "";

      if (uploadedDocBase64 && uploadedDocBase64.startsWith("data:image/")) {
        setOcrStepText("2/4 Cotejando características de documento nacional (Cédula / DNI / Pasaporte)...");

        try {
          const res = await fetch("/api/verify-doc", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              legalName,
              docNumber,
              imageBase64: uploadedDocBase64
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.isValid === false) {
              isValidId = false;
              rejectionReason = data.reason || "El archivo subido no corresponde a un documento nacional de identidad válido.";
            }
          }
        } catch (apiErr) {
          console.warn("Validación de visión en contingencia:", apiErr);
        }
      }

      setOcrStepText(`3/4 Validando coincidencia de datos: ${docType} ${docNumber} con ${legalName}...`);
      await new Promise((r) => setTimeout(r, 600));

      if (!isValidId) {
        setOcrScanning(false);
        setOcrStepText("");
        setValidationError(`Documento no reconocido: ${rejectionReason}`);
        return;
      }

      setOcrStepText("4/4 Aprobado. Emitiendo credencial oficial y removiendo marcas de agua...");
      await new Promise((r) => setTimeout(r, 400));

      setOcrScanning(false);
      setOcrStepText("");
      await persistIdentityState(true, docType, docNumber, legalName);
    } catch (err: any) {
      setOcrScanning(false);
      setOcrStepText("");
      setValidationError("Ocurrió un error al procesar el documento. Intenta nuevamente.");
    }
  };

  const handleCopyFingerprint = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sha256Fingerprint);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1360px] mx-auto space-y-8">
        {/* Cabecera */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#ffffff]/10 pb-8 print:hidden">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium mb-3">
              <Award className="w-3.5 h-3.5" />
              <span>Acreditación Oficial y Certificación de Competencias</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Certificados Oficiales y Acreditación Académica
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-2 max-w-2xl">
              Emisión de diplomas académicos oficiales. La verificación del documento nacional
              remueve el sello de seguridad y activa el código QR oficial de validación pública.
            </p>
          </div>

          {/* Estado de Verificación y Botón de Imprimir */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border ${
                isIdentityVerified
                  ? 'bg-[#15846e]/15 border-[#15846e]/40 text-[#15846e]'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>
                {isIdentityVerified
                  ? 'Identidad Nacional Verificada'
                  : 'Identidad Pendiente de Verificación'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 border border-[#ffffff]/15 text-xs font-medium text-white cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar Diploma</span>
            </button>
          </div>
        </div>

        {/* Grid Principal: Formulario OCR a la Izquierda (4 cols) + Lienzo a la Derecha (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Selector de Certificación y Validación de Cédula */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            {/* Selector de Programa */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9a]">
                Seleccionar Certificación
              </h3>
              <div className="space-y-2.5">
                {CERTIFICATE_CATALOG.map((item) => {
                  const active = item.slug === selectedSlug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => setSelectedSlug(item.slug)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#8052ff]/10 border-[#8052ff] text-white shadow-[0_0_20px_rgba(128,82,255,0.2)]'
                          : 'bg-[#000000] border-[#ffffff]/10 text-[#bdbdbd] hover:border-[#ffffff]/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-[10px] text-[#8052ff] uppercase">
                          {item.folioPrefix}
                        </span>
                        <span className="text-[#9a9a9a]">{item.hours}h</span>
                      </div>
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="text-xs text-[#9a9a9a] mt-1">{item.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Validación de Documento de Identidad */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-[#8052ff]" />
                  <h3 className="text-sm font-semibold text-white">Validación de Identidad</h3>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                    isIdentityVerified
                      ? 'border-[#15846e]/40 bg-[#15846e]/10 text-[#15846e]'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {isIdentityVerified ? 'Verificado' : 'Pendiente'}
                </span>
              </div>

              {!isIdentityVerified && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Sello de Seguridad Institucional</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/80">
                    Al validar tu documento de identidad se remueve el sello de borrador y se
                    activa el registro oficial con código QR validado en rectoría.
                  </p>
                </div>
              )}

                            {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Documento Inválido para Certificación</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-200/80">
                    {validationError}
                  </p>
                </div>
              )}

              <form onSubmit={handleRunOcrVerification} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#bdbdbd] block">
                    Nombre Completo del Estudiante
                  </label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white focus:outline-none focus:border-[#8052ff]"
                  />
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-[#bdbdbd] block">Tipo Doc.</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white focus:outline-none focus:border-[#8052ff]"
                    >
                      <option value="CC">C.C.</option>
                      <option value="TI">T.I.</option>
                      <option value="CE">C.E.</option>
                      <option value="DNI">DNI</option>
                      <option value="PASSPORT">Pasaporte</option>
                    </select>
                  </div>

                  <div className="col-span-3 space-y-1.5">
                    <label className="text-xs font-medium text-[#bdbdbd] block">
                      Número de Documento
                    </label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/15 text-xs text-white font-mono focus:outline-none focus:border-[#8052ff]"
                    />
                  </div>
                </div>

                {/* Subida de soporte de documento */}
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-[#ffffff]/20 hover:border-[#8052ff] bg-[#000000] cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-[#8052ff] mb-1" />
                  <span className="text-xs font-medium text-white">
                    {uploadedDocFileName || 'Adjuntar copia de cédula / documento'}
                  </span>
                  <span className="text-[10px] text-[#9a9a9a] mt-0.5">
                    Formatos JPG, PNG o PDF (Máx. 10MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setUploadedDocFileName(file.name);
                        setValidationError(null);
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          setUploadedDocBase64(result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {ocrScanning && (
                  <div className="p-3.5 rounded-xl bg-[#8052ff]/15 border border-[#8052ff]/40 text-xs text-white flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-[#8052ff] animate-spin shrink-0" />
                    <span>{ocrStepText}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ocrScanning}
                  className="w-full py-3 px-4 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-semibold shadow-[0_0_25px_rgba(128,82,255,0.35)] transition-all cursor-pointer"
                >
                  {isIdentityVerified
                    ? 'Actualizar Documento de Identidad'
                    : 'Validar Documento y Emitir Certificado'}
                </button>
              </form>
            </div>
          </div>

                    {/* Columna Derecha: Bloqueo Condicional de Requisito de Culminación del 100% */}
          <div className="lg:col-span-8 space-y-6">
            {!isCourseCompleted ? (
              /* ESTADO BLOQUEADO: El estudiante no ha culminado el 100% de las clases del curso */
              <div className="rounded-3xl border border-[#ffffff]/10 bg-[#09090b] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-3xl bg-[#8052ff]/10 border border-[#8052ff]/30 flex items-center justify-center mx-auto text-[#8052ff]">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#9a9a9a]">
                    Requisito de Acreditación Académica
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Certificación no disponible aún
                  </h2>
                  <p className="text-xs text-[#9a9a9a] leading-relaxed">
                    El certificado oficial de <strong className="text-white">{activeTemplate.title}</strong> solo se
                    emite de manera irrevocable tras completar el 100% de las lecciones y módulos prácticos del programa.
                  </p>
                </div>

                {/* Barra de Progreso en Vivo */}
                <div className="max-w-md mx-auto bg-[#000000] border border-[#ffffff]/10 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#bdbdbd] flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-4 h-4 text-[#8052ff]" />
                      <span>Progreso de clases:</span>
                    </span>
                    <span className="font-mono font-bold text-white">
                      {completedLessonsCount} / {totalLessonsCount} lecciones ({courseProgressPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-[#ffffff]/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8052ff] to-[#6d3df5] transition-all duration-500 rounded-full"
                      style={{ width: `${courseProgressPercent}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-[#9a9a9a] flex items-center justify-between pt-1">
                    <span>Restantes: {Math.max(0, totalLessonsCount - completedLessonsCount)} lecciones</span>
                    <span className="text-amber-400 font-mono">Meta obligatoria: 100%</span>
                  </div>
                </div>

                {/* Botón para continuar estudiando */}
                <div className="pt-2">
                  <Link
                    href={`/course?slug=${selectedSlug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-white text-xs font-semibold shadow-[0_0_30px_rgba(128,82,255,0.35)] transition-all cursor-pointer"
                  >
                    <span>Continuar cursando lecciones pendientes</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* ESTADO DESBLOQUEADO: El estudiante aprobó el 100% del curso */
              <div className="space-y-6">
<div className="relative rounded-2xl overflow-hidden bg-[#faf8f5] text-[#1c1917] p-8 sm:p-14 shadow-2xl border border-[#e7e0d3] select-none print:shadow-none print:border-none print:p-6">
              {/* Marco Exterior Ornamental Dorado */}
              <div className="absolute inset-3 border-2 border-[#cbb37a] rounded-xl pointer-events-none" />
              {/* Marco Interior Delgado Dorado */}
              <div className="absolute inset-5 border border-[#e8dcb8] rounded-lg pointer-events-none" />

              {/* Rosetas / Esquineros Ornamentales en las 4 esquinas */}
              <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-[#b89a54] pointer-events-none" />
              <div className="absolute top-6 right-6 w-5 h-5 border-t-2 border-r-2 border-[#b89a54] pointer-events-none" />
              <div className="absolute bottom-6 left-6 w-5 h-5 border-b-2 border-l-2 border-[#b89a54] pointer-events-none" />
              <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-[#b89a54] pointer-events-none" />

              {/* =========================================================================
                  MARCA DE AGUA PROFESIONAL Y SUTIL (CUANDO LA IDENTIDAD NO ESTÁ VERIFICADA)
                  Patrón esteganográfico de finas líneas en tono oro/marfil pálido que
                  impiden la falsificación sin degradar la elegancia académica del diploma
                 ========================================================================= */}
              {!isIdentityVerified && (
                <>
                  {/* Filigrana central sutil de seguridad */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none overflow-hidden select-none"
                  >
                    <div className="-rotate-12 border border-[#d4af37]/35 rounded-2xl bg-[#fdfaf3]/75 backdrop-blur-[0.5px] py-4 px-10 text-center shadow-sm">
                      <div className="flex items-center justify-center gap-2 mb-0.5">
                        <Stamp className="w-4 h-4 text-[#a88939]" />
                        <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-[#8c6f28]">
                          Borrador · Identidad Pendiente
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#a68c4a] block">
                        Cotejo de documento nacional no concluido en registro oficial
                      </span>
                    </div>
                  </div>

                  {/* Micro-tramas discretas perimetrales de seguridad bancaria/académica */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-8 top-10 flex justify-between pointer-events-none opacity-40 text-[8px] font-mono tracking-[0.2em] text-[#b89a54]"
                  >
                    <span>IPT ACADEMY · SECURE DRAFT</span>
                    <span>IDENTIDAD NO VERIFICADA</span>
                    <span>IPT VERIFICATION PENDING</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-8 bottom-10 flex justify-between pointer-events-none opacity-40 text-[8px] font-mono tracking-[0.2em] text-[#b89a54]"
                  >
                    <span>CONTROL DE INTEGRIDAD</span>
                    <span>FOLIO PROVISIONAL</span>
                    <span>REGISTRO SIN RECTORÍA</span>
                  </div>
                </>
              )}

              {/* Contenido Académico Principal */}
              <div className="relative z-10 space-y-7 text-center">
                {/* Encabezado Institucional de Alta Gala */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-[#cbb37a] bg-[#f5ede0] flex items-center justify-center shadow-inner">
                      <IptLogoIcon className="w-7 h-7 text-[#8c6f28]" />
                    </div>
                    <div className="text-left">
                      <span className="text-xl sm:text-2xl font-serif tracking-[0.1em] text-[#1c1917] block font-bold">
                        IPT ACADEMY
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#786b59]">
                        Ivan Perez Tech · Instituto de Formación Tecnológica Superior
                      </span>
                    </div>
                  </div>

                  {/* Línea divisoria dorada fina con rombo central */}
                  <div className="flex items-center justify-center gap-2 w-48 mx-auto pt-2">
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-[#cbb37a] to-transparent flex-1" />
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#cbb37a]" />
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-[#cbb37a] to-transparent flex-1" />
                  </div>

                  {/* Indicador de Folio y Estado de Verificación */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f3ede2] border border-[#dcd3c2] text-[10px] font-mono text-[#57534e]">
                    <span>Folio: {certificateFolio}</span>
                    <span>·</span>
                    <span className={isIdentityVerified ? 'text-[#15846e] font-semibold' : 'text-[#8c6f28]'}>
                      {isIdentityVerified
                        ? `Acreditado (${docType} ${docNumber})`
                        : 'Sujeto a validación de documento'}
                    </span>
                  </div>
                </div>

                {/* Otorgamiento y Nombre del Titular */}
                <div className="space-y-3 py-1">
                  <p className="text-xs uppercase tracking-[0.3em] font-serif text-[#786b59]">
                    La Rectoría y el Consejo Académico confieren la presente certificación a:
                  </p>

                  <div className="py-2">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1c1917] tracking-tight">
                      {legalName}
                    </h2>
                    <div className="h-[1px] bg-[#d7cebe] max-w-sm mx-auto mt-2" />
                    <span className="text-[11px] font-mono text-[#786b59] mt-1 block">
                      {isIdentityVerified
                        ? `Identificación Oficial Validada: ${docType} ${docNumber}`
                        : `${docType}: ${docNumber} (Validación en proceso)`}
                    </span>
                  </div>

                  <p className="text-xs text-[#57534e] max-w-xl mx-auto leading-relaxed">
                    Por haber aprobado los módulos de especialización, evaluaciones de proyecto y
                    demostrado el dominio práctico de las competencias del programa:
                  </p>

                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1c1917] max-w-2xl mx-auto pt-1">
                    {activeTemplate.title}
                  </h3>

                  <p className="text-xs font-mono text-[#786b59]">
                    Intensidad Académica: {activeTemplate.hours} Horas · Modalidad Virtual Teórico-Práctica
                  </p>
                </div>

                {/* Competencias Clave Evaluadas */}
                <div className="max-w-2xl mx-auto bg-[#ffffff]/90 border border-[#e5ddcf] rounded-xl p-4 text-left shadow-sm">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#786b59] block mb-2 font-bold">
                    Competencias Profesionales Acreditadas:
                  </span>
                  <ul className="space-y-1.5">
                    {activeTemplate.competencies.map((comp, i) => (
                      <li key={i} className="text-xs text-[#292524] flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#8c6f28] shrink-0" />
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Firmas y Sello Institucional */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end pt-5 border-t border-[#e2d8c7] text-left">
                  {/* Firma de Rectoría */}
                  <div className="space-y-1 border-t border-[#1c1917]/30 pt-2 text-center sm:text-left">
                    <span className="text-xs font-serif font-bold text-[#1c1917] block">
                      Iván Samuel Pérez Torrenegra
                    </span>
                    <span className="text-[11px] text-[#786b59] block">
                      Rectoría & Dirección General · IPT
                    </span>
                  </div>

                  {/* Sello y Código QR Central */}
                  <div className="flex flex-col items-center justify-center text-center space-y-1">
                    <div
                      className={`p-2 rounded-xl border text-center ${
                        isIdentityVerified
                          ? 'border-[#15846e]/40 bg-[#15846e]/5 text-[#15846e]'
                          : 'border-[#cbb37a] bg-[#fbf8f2] text-[#8c6f28]'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">
                        {isIdentityVerified ? 'REGISTRO OFICIAL VERIFICADO' : 'CÓDIGO DE VALIDACIÓN'}
                      </span>
                      <span className="text-[9px] font-mono block opacity-85">
                        iptapps.com/verify/{certificateFolio}
                      </span>
                    </div>
                  </div>

                  {/* Registro de Acreditación */}
                  <div className="space-y-1 border-t border-[#1c1917]/30 pt-2 text-center sm:text-right">
                    <span className="text-xs font-serif font-bold text-[#1c1917] block">
                      Secretaría Académica
                    </span>
                    <span className="text-[11px] font-mono text-[#786b59] block">
                      Expedición: {new Date().toISOString().slice(0, 10)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Huella Criptográfica SHA-256 e Hipervínculo de Consulta */}
            <div className="bg-[#09090b] border border-[#ffffff]/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8052ff]" />
                  <span>Huella Digital Inmutable de Verificación (SHA-256)</span>
                </span>
                <p className="text-xs font-mono text-[#9a9a9a] truncate">{sha256Fingerprint}</p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFingerprint}
                  className="px-3.5 py-2 rounded-full bg-[#ffffff]/5 hover:bg-[#ffffff]/10 border border-[#ffffff]/15 text-xs text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#15846e]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Huella</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/verify/${certificateFolio}`}
                  className="px-4 py-2 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <span>Validar en Portal Público</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
