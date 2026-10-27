'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Course, Certificate, UserProfile } from '@/types';
import UserProfileMenu from '@/components/UserProfileMenu';
import CertificateModal from '@/components/CertificateModal';
import {
  Award,
  CheckCircle2,
  Download,
  Share2,
  Clock,
  Calendar,
  Lock,
  ArrowLeft,
  Star,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Eye,
  FileText
} from 'lucide-react';
import { formatExactIssueTime } from '@/lib/licenseUtils';

interface CertificateClientViewProps {
  courseSlug?: string;
}

function CertificateViewInner({ courseSlug: initialCourseSlug }: CertificateClientViewProps) {
  const searchParams = useSearchParams();
  const rawParamSlug = searchParams.get('course');
  const targetSlug = initialCourseSlug || rawParamSlug || 'datagan-master-pro';

  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Detección de Modo Muestra / Ejemplo (?123321)
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [samplePercentage, setSamplePercentage] = useState<number>(95);
  const [showPercentageBadge, setShowPercentageBadge] = useState<boolean>(true);

  // Progreso y Certificación
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState(6);
  const [certificateData, setCertificateData] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detectar parámetro ?123321 en la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const has123321 =
        window.location.search.includes('123321') ||
        searchParams.has('123321') ||
        searchParams.get('demo') === 'true';

      if (has123321) {
        setIsSampleMode(true);
      }
    }
  }, [searchParams]);

  // Cargar perfil del usuario
  useEffect(() => {
    if (!user) return;
    get(ref(db, `users/${user.uid}/profile`)).then((snap) => {
      if (snap.exists()) {
        setUserProfile(snap.val());
      }
    }).catch(err => console.error(err));
  }, [user]);

  // Cargar catálogo de cursos
  useEffect(() => {
    get(ref(db, 'courses')).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Course[] = Object.keys(data).map(key => data[key]);
        setCourses(list);
        const match = list.find(c => c.slug === targetSlug) || list[0];
        if (match) setSelectedCourse(match);
      }
    }).catch(err => console.error(err));
  }, [targetSlug]);

  // Cargar progreso del curso actual
  useEffect(() => {
    if (!selectedCourse) return;

    let total = 0;
    if (selectedCourse.modules) {
      selectedCourse.modules.forEach(m => {
        if (m.lessons) total += m.lessons.length;
      });
    }
    setTotalLessonsCount(total || 6);

    if (isSampleMode) {
      // En modo muestra, simular datos ya aprobados
      setCompletedLessonsCount(total || 6);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const progressRef = ref(db, `progress/${user.uid}/${selectedCourse.slug}`);
    get(progressRef).then(async (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.completedLessons && Array.isArray(val.completedLessons)) {
          setCompletedLessonsCount(val.completedLessons.length);
        }
      }

      // Verificar si ya existe certificado
      const certRef = ref(db, `users/${user.uid}/certificates/${selectedCourse.slug}`);
      const certSnap = await get(certRef);
      if (certSnap.exists()) {
        const cId = certSnap.val();
        const fullSnap = await get(ref(db, `certificates/${cId}`));
        if (fullSnap.exists()) {
          setCertificateData(fullSnap.val());
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user, selectedCourse, isSampleMode]);

  // Cálculo de porcentaje
  const realProgressPercent = Math.min(100, Math.round((completedLessonsCount / (totalLessonsCount || 1)) * 100));
  const activePercent = isSampleMode ? samplePercentage : realProgressPercent;
  const isEligibleForCertificate = isSampleMode || activePercent >= 80;

  // Datos del alumno (si es modo muestra, usar los datos reales del ejemplo de referencia)
  const sampleStudentName = 'Andrés Felipe García Pérez';
  const sampleAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80';

  const studentFullName = isSampleMode
    ? sampleStudentName
    : (userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userProfile?.displayName || user?.displayName || user?.email?.split('@')[0]) || 'Estudiante';

  const studentAvatar = isSampleMode
    ? sampleAvatarUrl
    : (userProfile?.photoURL || user?.photoURL || '');

  // Fecha formateada
  const formattedDate = isSampleMode
    ? '30 de septiembre de 2026'
    : certificateData?.issueDateFormatted || (() => {
        const d = new Date();
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
      })();

  const issueIsoString = isSampleMode
    ? '2026-09-30T14:35:10.000Z'
    : certificateData?.issueDate || (certificateData?.createdAt ? new Date(certificateData.createdAt).toISOString() : new Date().toISOString());

  const formattedTime = formatExactIssueTime(issueIsoString);

  const approxHours = selectedCourse?.approxHours || '34 horas (aproximadamente)';
  const scoreAverage = isSampleMode ? 97.49 : (certificateData?.scoreAverage || 98.0);
  const certId = isSampleMode ? 'TG-CERT-123321' : (certificateData?.id || 'TG-CERT-OFICIAL');

  const defaultOutcomes = [
    'Dominio de las 73 métricas zootécnicas de producción de leche, ceba y reproducción.',
    'Modelación y simulación de hatos ganaderos en entorno interactivo sin riesgo operativo.',
    'Interpretación de curvas de lactancia, pesajes periódicos y ganancias diarias de peso (GDP).',
    'Toma de decisiones agronómicas y zootécnicas alineadas con buenas prácticas ganaderas.'
  ];
  const learningOutcomes = selectedCourse?.whatYouWillLearn && selectedCourse.whatYouWillLearn.length > 0
    ? selectedCourse.whatYouWillLearn
    : defaultOutcomes;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    setIsModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#2a2b3f] font-sans flex flex-col">
      {/* Barra superior de navegación */}
      <header className="bg-white border-b border-[#e9eaf2] px-6 py-3.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Cursos</span>
          </Link>
          <div className="h-4 w-px bg-[#d1d2e0]" />
          <div className="flex items-center gap-2.5">
            <Image src="/logo.webp" alt="TecnoGan" width={84} height={28} className="h-7 w-auto object-contain" />
            <span className="font-extrabold text-base text-[#2a2b3f] tracking-tight">TecnoGan</span>
            <span className="px-2 py-0.5 rounded-md bg-[#6d28d2]/10 text-[#6d28d2] text-xs font-bold">
              Acreditaciones
            </span>
          </div>
        </div>

        {/* Selector de Cursos si hay varios */}
        {courses.length > 1 && (
          <div className="hidden md:flex items-center gap-2 bg-[#f6f7f9] p-1 rounded-xl border border-[#d1d2e0]">
            {courses.map((c) => (
              <button
                key={c.slug}
                onClick={() => setSelectedCourse(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCourse?.slug === c.slug
                    ? 'bg-[#6d28d2] text-white shadow-xs'
                    : 'text-[#595c73] hover:text-[#2a2b3f] hover:bg-white'
                }`}
              >
                {c.title.split(':')[0]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <UserProfileMenu courseSlug={selectedCourse?.slug || targetSlug} />
        </div>
      </header>


      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* COLUMNA IZQUIERDA: Metadatos del Certificado y Alumno */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Tarjeta de Acreditación del Estudiante */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#d1d2e0] shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#6d28d2] bg-[#202230] flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
                    {studentAvatar ? (
                      <Image
                        src={studentAvatar}
                        alt={studentFullName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span>{studentFullName ? studentFullName[0].toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  {isEligibleForCertificate && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-[#2a2b3f] leading-tight">
                    Completado por {studentFullName}
                  </h1>
                  <p className="text-xs text-[#595c73] mt-1">Acreditación Académica y Operativa</p>
                </div>
              </div>

              {/* Lista de Metadatos Formativa */}
              <div className="space-y-3 pt-2 border-t border-[#e9eaf2] text-sm">
                <div className="flex items-center gap-3 text-[#2a2b3f]">
                  <Calendar className="w-4 h-4 text-[#6d28d2] shrink-0" />
                  <span className="font-semibold">{formattedDate}</span>
                </div>

                <div className="flex items-center gap-3 text-[#2a2b3f]">
                  <Clock className="w-4 h-4 text-[#6d28d2] shrink-0" />
                  <span>
                    Hora exacta de emisión: <strong className="font-semibold text-[#2a2b3f]">{formattedTime}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[#2a2b3f]">
                  <FileText className="w-4 h-4 text-[#6d28d2] shrink-0" />
                  <span>{approxHours}</span>
                </div>

                <div className="flex items-center gap-3 text-[#2a2b3f]">
                  <Award className="w-4 h-4 text-[#6d28d2] shrink-0" />
                  <span>
                    Calificación obtenida: <strong className="text-emerald-700">{scoreAverage}%</strong>
                  </span>
                </div>
              </div>

              {/* Mensaje de Autenticidad */}
              <p className="text-xs text-[#595c73] leading-relaxed pt-2 border-t border-[#e9eaf2]">
                Se ha verificado la identidad y el progreso del titular de la cuenta. <strong>TecnoGan</strong> certifica la aprobación con mérito del programa formativo.
              </p>
            </div>

            {/* Mini Tarjeta del Curso */}
            {selectedCourse && (
              <div className="bg-white rounded-3xl p-6 border border-[#d1d2e0] shadow-sm space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#6d28d2]/10 flex items-center justify-center shrink-0 border border-[#6d28d2]/20">
                    <Image src="/logo.webp" alt="TecnoGan" width={28} height={28} className="w-7 h-7 object-contain" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-[#2a2b3f] leading-snug">
                      {selectedCourse.title}
                    </h3>
                    <p className="text-xs text-[#595c73]">TecnoGan AgroTech</p>
                    <div className="flex items-center gap-3 text-xs text-[#595c73] pt-1">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                        {selectedCourse.rating || 4.9}
                      </span>
                      <span>({selectedCourse.ratingsCount || 357} calificaciones)</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{totalLessonsCount} lecciones</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/course?id=${selectedCourse.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6d28d2] hover:underline"
                  >
                    <span>Ir al aula virtual</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Sección: ¿Qué aprendió? (Editable desde admin) */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#d1d2e0] shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-[#2a2b3f] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>¿Qué aprendió?</span>
              </h2>
              <p className="text-xs text-[#595c73]">
                Competencias técnicas y operativas verificadas durante el desarrollo del curso:
              </p>

              <div className="space-y-3 pt-2">
                {learningOutcomes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs text-[#2a2b3f] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: Visualización y Descarga del Certificado */}
          <div className="lg:col-span-7 space-y-6">
            
            {isEligibleForCertificate ? (
              /* ESTADO DESBLOQUEADO (>= 80% de avance o modo muestra) */
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Visualizador de Previsualización en Cuadro */}
                <div className="relative rounded-3xl bg-[#0c0d14] p-4 md:p-8 shadow-xl border border-[#2a2c3e] overflow-hidden group">
                  
                  {/* Badge flotante de porcentaje completado */}
                  {showPercentageBadge && (
                    <div className="absolute top-6 right-6 z-20">
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#6d28d2] text-white shadow-md flex items-center gap-1.5 border border-emerald-400/30">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{activePercent}% Completado</span>
                      </span>
                    </div>
                  )}

                  {/* Render del Diploma Estilo Cuadro */}
                  <div
                    className="relative w-full bg-[#faf8f2] text-[#1c1c24] rounded-2xl p-6 md:p-10 shadow-2xl border-[6px] border-[#161c2d] select-none"
                    style={{
                      boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.6), inset 0 0 0 2px #d4af37, inset 0 0 0 4px #f4ebd0, inset 0 0 0 6px #b38728',
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif',
                    }}
                  >
                    {/* Esquinas ornamentales */}
                    <div className="absolute top-2.5 left-2.5 w-6 h-6 border-t-2 border-l-2 border-[#b38728]" />
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 border-t-2 border-r-2 border-[#b38728]" />
                    <div className="absolute bottom-2.5 left-2.5 w-6 h-6 border-b-2 border-l-2 border-[#b38728]" />
                    <div className="absolute bottom-2.5 right-2.5 w-6 h-6 border-b-2 border-r-2 border-[#b38728]" />

                    {/* Contenido Diploma */}
                    <div className="flex flex-col items-center text-center space-y-5">
                      <div className="flex items-center justify-between w-full border-b border-[#e5dec9] pb-4">
                        <div className="flex items-center gap-2">
                          <Image src="/logo.webp" alt="TecnoGan" width={96} height={32} className="h-8 w-auto object-contain" />
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6d28d2]">
                              TecnoGan
                            </p>
                            <p className="text-[8px] font-semibold text-[#66635a] uppercase">
                              Academia Oficial
                            </p>
                          </div>
                        </div>

                        {showPercentageBadge && (
                          <span className="text-[9px] font-bold text-[#6d28d2] uppercase tracking-wider bg-[#6d28d2]/10 px-2.5 py-0.5 rounded-full border border-[#6d28d2]/20">
                            {activePercent}% Completado
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#855f13]">
                          Certificado de Acreditación Oficial
                        </h4>
                        <p className="text-[9px] text-[#555248] uppercase tracking-widest">
                          Concedido con mérito académico a
                        </p>
                      </div>

                      <h3 className="text-xl md:text-2xl font-extrabold text-[#161c2d] tracking-tight pb-1 border-b-2 border-[#b38728]/40 px-4">
                        {studentFullName}
                      </h3>

                      <div className="max-w-md space-y-1">
                        <p className="text-[11px] text-[#44423b]">
                          Por haber culminado con éxito el programa de especialización:
                        </p>
                        <p className="text-xs md:text-sm font-bold text-[#6d28d2]">
                          {selectedCourse?.title}
                        </p>
                      </div>

                      <div className="w-full pt-4 grid grid-cols-2 gap-4 items-end border-t border-[#e5dec9]">
                        <div className="text-center space-y-0.5">
                          <div className="h-6 flex items-center justify-center">
                            <svg className="w-24 h-6 text-[#161c2d]" viewBox="0 0 150 40" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 25 C 28 8, 42 32, 65 14 C 82 -2, 78 32, 105 18 C 122 8, 138 22, 144 16" />
                            </svg>
                          </div>
                          <div className="w-28 mx-auto h-[1px] bg-[#161c2d]" />
                          <p className="text-[9px] font-bold text-[#161c2d]">
                            Equipo Directivo TecnoGan
                          </p>
                          <p className="text-[8px] text-[#66635a]">
                            Acreditado por el equipo directivo de TecnoGan
                          </p>
                        </div>

                        <div className="text-right space-y-0.5">
                          <p className="text-[8px] font-mono font-bold text-[#855f13]">
                            {certId}
                          </p>
                          <p className="text-[8px] text-[#66635a]">
                            {formattedDate}
                          </p>
                          <p className="text-[8px] text-emerald-700 font-bold">
                            Calificación: {scoreAverage}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handlePrint}
                    className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-[#6d28d2] hover:bg-[#591fb0] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar el certificado (PDF)</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-[#f6f7f9] text-[#2a2b3f] font-bold text-sm border border-[#d1d2e0] shadow-sm flex items-center justify-center gap-2.5 transition-all active:scale-98"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#595c73]" />}
                    <span>{copied ? '¡Enlace copiado!' : 'Compartir certificado'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO BLOQUEADO (< 80% de avance) */
              <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#d1d2e0] shadow-sm text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-extrabold text-[#2a2b3f]">
                    Acreditación en progreso
                  </h3>
                  <p className="text-xs text-[#595c73] leading-relaxed">
                    Para acceder a la previsualización y descargar tu certificado oficial de TecnoGan, debes completar al menos el <strong>80% del programa</strong> (lecciones vistas y evaluaciones superadas).
                  </p>
                </div>

                {/* Barra de Progreso */}
                <div className="max-w-md mx-auto space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#595c73]">Tu avance actual:</span>
                    <span className="text-[#6d28d2]">{activePercent}% / 80% requerido</span>
                  </div>
                  <div className="w-full bg-[#e9eaf2] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#6d28d2] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, (activePercent / 80) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#9194ac]">
                    Llevas {completedLessonsCount} de {totalLessonsCount} lecciones acreditadas.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/course?id=${selectedCourse?.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <span>Continuar aprendiendo en el aula</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Modal de Impresión / Descarga a Pantalla Completa */}
      <CertificateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        courseSlug={selectedCourse?.slug}
        courseTitle={selectedCourse?.title}
        defaultStudentName={studentFullName}
        scoreAverage={scoreAverage}
        progressPercent={activePercent}
        initialCertificate={
          isSampleMode
            ? {
                id: certId,
                userId: 'sample-user',
                studentName: studentFullName,
                studentEmail: 'andres.garcia@tecnogan.com',
                courseSlug: selectedCourse?.slug || 'datagan-master-pro',
                courseTitle: selectedCourse?.title || 'DataGan 360 & TecnoGan',
                instructor: 'Equipo Directivo TecnoGan',
                instructorRole: 'Acreditado por el equipo directivo de TecnoGan',
                issueDate: new Date().toISOString(),
                issueDateFormatted: formattedDate,
                completionHours: 34,
                scoreAverage: scoreAverage,
                progressPercent: activePercent,
                verificationHash: 'TG-123321-VERIFIED',
                status: 'valid'
              }
            : certificateData
        }
      />
    </div>
  );
}

export default function CertificateClientView({ courseSlug }: CertificateClientViewProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CertificateViewInner courseSlug={courseSlug} />
    </Suspense>
  );
}
