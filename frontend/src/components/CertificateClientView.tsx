'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
  Download,
  Share2
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { Certificate } from '@/types';
import { getLocalDatabase } from '@/services/localDatabaseService';
import CertificateCanvasView from '@/components/certificates/CertificateCanvasView';

interface CertificateClientViewProps {
  courseSlug?: string;
}

export default function CertificateClientView({ courseSlug }: CertificateClientViewProps) {
  const { courses, assignments } = useLms();
  const { user } = useAuth();

  const [selectedSlug, setSelectedSlug] = useState<string>(
    courseSlug || courses[0]?.slug || 'datagan-master-pro'
  );
  const [studentName, setStudentName] = useState<string>(
    user?.displayName || 'Iván Samuel Pérez'
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setStudentName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedSlug && courses[0]) {
      setSelectedSlug(courses[0].slug);
    }
  }, [courses, selectedSlug]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || courses[0],
    [courses, selectedSlug]
  );

  const gradedAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (!activeCourse || a.courseSlug === activeCourse.slug) &&
          typeof a.finalGrade === 'number'
      ),
    [assignments, activeCourse]
  );

  const computedGradeAverage = useMemo(() => {
    if (!gradedAssignments.length) return 4.8;
    const sum = gradedAssignments.reduce((acc, a) => acc + (a.finalGrade || 0), 0);
    return Number((sum / gradedAssignments.length).toFixed(1));
  }, [gradedAssignments]);

  // Construir o resolver el certificado activo con microdetalles
  const activeCertificate: Certificate = useMemo(() => {
    const localDb = getLocalDatabase();
    const existing = localDb.certificates?.find(
      (c) => c.courseSlug === (activeCourse?.slug || 'datagan-master-pro')
    );

    const now = new Date();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const formattedDate = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;

    const id = existing?.id || 'IPT-CERT-2026-DATAGAN-PRO';

    return {
      id,
      userId: user?.uid || 'local-student-01',
      studentName: studentName || 'Iván Samuel Pérez',
      studentEmail: user?.email || 'ivan@ipt.local',
      courseSlug: activeCourse?.slug || 'datagan-master-pro',
      courseTitle: activeCourse?.title || 'Arquitectura de Datos y Gestión Operativa con DataGan Pro',
      instructor: 'Iván Samuel Pérez Torrenegra',
      instructorRole: 'Fundador y Director General · Ivan Perez Tech (IPT)',
      issueDate: existing?.issueDate || now.toISOString(),
      issueDateFormatted: existing?.issueDateFormatted || formattedDate,
      completionHours: 20,
      scoreAverage: computedGradeAverage,
      progressPercent: 100,
      verificationHash: `IPT-HASH-7F4A9B1C-2026-SECURE`,
      status: 'valid',
    };
  }, [activeCourse, studentName, user, computedGradeAverage]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCertificate.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      {/* Controles y panel de configuración superior */}
      <main id="main-content" className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="no-print flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] font-medium">
            Inicio
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Descargar Certificado Oficial</span>
        </nav>

        {/* Panel Superior: Selección de curso y botón de descarga directa */}
        <section className="no-print bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 md:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Centro de Emisión y Descarga de Certificados</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#0f0f0f] leading-snug">
                Tu Diploma Oficial Acreditado (Listo para Imprimir / PDF)
              </h1>
              <p className="text-xs text-[#606060] max-w-2xl leading-relaxed">
                Este es el documento descargable con validez académica. Cuenta con código QR activo que dirige a la página pública de verificación (<code>/verify/{activeCertificate.id}</code>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/verify/${encodeURIComponent(activeCertificate.id)}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-[#e5e5e5] hover:bg-[#f8f9fa] text-xs font-bold text-[#0f0f0f] flex items-center gap-2 transition-all cursor-pointer"
                title="Abrir página pública de verificación con todos los metadatos"
              >
                <ExternalLink className="w-4 h-4 text-[#065fd4]" />
                <span>Verificar Online (/verify)</span>
              </Link>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                title="Descargar en PDF o Imprimir Diploma"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir o Guardar en PDF</span>
              </button>
            </div>
          </div>

          {/* Formulario rápido de edición de datos de prueba / personalización */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="cert-course-select" className="block text-xs font-bold text-[#0f0f0f]">
                1. Curso acreditado:
              </label>
              <select
                id="cert-course-select"
                value={activeCourse?.slug || ''}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#0f0f0f] focus:outline-none focus:border-[#065fd4] bg-white cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cert-student-name" className="block text-xs font-bold text-[#0f0f0f]">
                2. Nombre para el diploma:
              </label>
              <input
                id="cert-student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Tu nombre completo..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] text-xs font-semibold text-[#0f0f0f] focus:outline-none focus:border-[#065fd4]"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="block text-xs font-bold text-[#0f0f0f]">
                3. Código único de credencial:
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e5e5e5] text-xs font-mono font-bold text-[#855f13] truncate">
                  {activeCertificate.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2.5 rounded-xl border border-[#e5e5e5] hover:bg-[#f2f2f2] text-xs font-bold text-[#0f0f0f] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Lienzo del Diploma Oficial Renderizado */}
        <section className="flex flex-col items-center justify-center p-2 sm:p-6 bg-[#161822] rounded-3xl border border-[#2b2e42] shadow-xl overflow-x-auto">
          <CertificateCanvasView cert={activeCertificate} isReadOnlyViewer={false} />
        </section>
      </main>

      {/* Estilos CSS obligatorios para impresión impecable a PDF apaisado (Landscape) */}
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
            padding: 2.2rem !important;
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
