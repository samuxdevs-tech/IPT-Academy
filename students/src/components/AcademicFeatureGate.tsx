'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sliders,
  X,
  FileCheck2,
  GraduationCap,
  Video,
  Calendar,
  Layers,
  Award,
  Clock,
  Coins,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useSubscription, RectoriaTrialOffer } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

export type AcademicGatedFeature =
  | 'assignments'
  | 'grades'
  | 'live'
  | 'calendar'
  | 'sandbox'
  | 'certificates'
  | 'custom';

interface AcademicFeatureGateProps {
  feature: AcademicGatedFeature;
  title?: string;
  description?: string;
  minPlan?: 'pro' | 'pro_plus';
  children: React.ReactNode;
}

const FEATURE_METADATA: Record<
  AcademicGatedFeature,
  {
    icon: React.ElementType;
    badge: string;
    headline: string;
    subheadline: string;
    whyLocked: string;
    defaultMinPlan: 'pro' | 'pro_plus';
  }
> = {
  assignments: {
    icon: FileCheck2,
    badge: 'Herramienta de Formación Activa',
    headline: 'Entrega de Tareas y Rúbricas Oficiales',
    subheadline:
      'Envío de proyectos, revisión de código por el equipo docente y retroalimentación criterio por criterio.',
    whyLocked:
      'En el Plan Free tienes acceso completo a las clases y al material en video. La entrega de talleres, calificación con rúbricas de ingeniería y radicación de apelaciones ante Rectoría están disponibles a partir del Plan Pro.',
    defaultMinPlan: 'pro',
  },
  grades: {
    icon: GraduationCap,
    badge: 'Registro Académico Institucional',
    headline: 'Mis Notas y Kárdex Oficial',
    subheadline:
      'Historial de rendimiento acumulado, ponderación por competencias y constancia de notas descargable.',
    whyLocked:
      'El Kárdex oficial y la expedición de certificados de notas están reservados para estudiantes matriculados en planes de formación activa (Pro y Pro+).',
    defaultMinPlan: 'pro',
  },
  live: {
    icon: Video,
    badge: 'Sesiones Sincrónicas Magistrales',
    headline: 'Salas en Vivo y Tutorías 1 a 1',
    subheadline:
      'Mentoría sincrónica personalizada con el Ing. Iván Pérez y clases magistrales en tiempo real con pizarrón interactivo.',
    whyLocked:
      'Las salas sincrónicas y la bolsa mensual de créditos para reservar tutorías individuales están disponibles en el Plan Pro+ y Your Plan.',
    defaultMinPlan: 'pro_plus',
  },
  calendar: {
    icon: Calendar,
    badge: 'Planificación Académica',
    headline: 'Calendario Institucional Sincronizado',
    subheadline:
      'Fechas de entrega, cierres de módulo, convocatorias en vivo y recordatorios integrados.',
    whyLocked:
      'El cronograma sincronizado de actividades evaluativas y eventos en vivo está habilitado para planes Pro y Pro+.',
    defaultMinPlan: 'pro',
  },
  sandbox: {
    icon: Layers,
    badge: 'Laboratorio de Simulación Técnica',
    headline: 'Entorno Interactivo Sandbox TecnoGan',
    subheadline:
      'Toma de decisiones técnicas sobre escenarios de alta concurrencia, bases de datos y microservicios.',
    whyLocked:
      'Los escenarios prácticos de arquitectura y simulaciones interactivas forman parte de la formación avanzada Pro y Pro+.',
    defaultMinPlan: 'pro',
  },
  certificates: {
    icon: Award,
    badge: 'Acreditación Oficial IPT',
    headline: 'Diplomas y Certificación Profesional',
    subheadline:
      'Expedición de diplomas institucionales con folio único, validación pública QR y verificación de identidad OCR.',
    whyLocked:
      'La expedición y descarga de certificaciones oficiales con valor profesional está reservada para miembros Pro y Pro+.',
    defaultMinPlan: 'pro',
  },
  custom: {
    icon: Lock,
    badge: 'Membresía Universitaria',
    headline: 'Módulo de Nivel Avanzado',
    subheadline: 'Herramienta reservada para estudiantes matriculados.',
    whyLocked:
      'Esta función forma parte de los planes de formación técnica avanzada de IPT Academy.',
    defaultMinPlan: 'pro',
  },
};

export function AcademicFeatureGate({
  feature,
  title,
  description,
  minPlan,
  children,
}: AcademicFeatureGateProps) {
  const {
    subscription,
    openPricingModal,
    rectoriaOffer,
    updateRectoriaOffer,
  } = useSubscription();
  const { effectiveIsAdmin, user } = useAuth();

  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [draftPlan, setDraftPlan] = useState<'pro' | 'pro_plus'>(rectoriaOffer.targetPlan);
  const [draftDays, setDraftDays] = useState<number>(rectoriaOffer.durationDays);
  const [draftPriceCop, setDraftPriceCop] = useState<number>(rectoriaOffer.priceCop);
  const [draftPriceUsd, setDraftPriceUsd] = useState<number>(rectoriaOffer.priceUsd);
  const [draftHeadline, setDraftHeadline] = useState<string>(rectoriaOffer.headline);
  const [draftBadge, setDraftBadge] = useState<string>(rectoriaOffer.badge);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const currentPlanId = subscription?.planId || 'free';
  const meta = FEATURE_METADATA[feature] || FEATURE_METADATA.custom;
  const effectiveMinPlan = minPlan || meta.defaultMinPlan;

  // Determinar si el usuario tiene acceso
  const hasAccess = React.useMemo(() => {
    if (currentPlanId === 'your_plan') return true;
    if (effectiveMinPlan === 'pro_plus') {
      return currentPlanId === 'pro_plus';
    }
    return currentPlanId === 'pro' || currentPlanId === 'pro_plus';
  }, [currentPlanId, effectiveMinPlan]);

  // Si tiene acceso, renderizar el contenido normalmente
  if (hasAccess) {
    return <>{children}</>;
  }

  const handleSaveRectoriaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await updateRectoriaOffer({
        targetPlan: draftPlan,
        durationDays: Number(draftDays) || 7,
        priceCop: Number(draftPriceCop) || 0,
        priceUsd: Number(draftPriceUsd) || 0,
        headline: draftHeadline.trim() || rectoriaOffer.headline,
        badge: draftBadge.trim() || rectoriaOffer.badge,
        isFreeTrial: Number(draftPriceCop) === 0,
      });
      setIsAdminConfigOpen(false);
    } catch (err) {
      console.error('Error actualizando oferta de Rectoría:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isFreePrice = rectoriaOffer.isFreeTrial || rectoriaOffer.priceCop === 0;

  return (
    <div className="relative min-h-[720px] w-full overflow-hidden">
      {/* Contenido subyacente real renderizado con desenfoque alto */}
      <div
        className="filter blur-xl pointer-events-none select-none opacity-25 scale-[0.99] transition-all duration-700"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Capa de Bloqueo Académico Dala Dark Void D1 */}
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto bg-black/65 backdrop-blur-xl">
        <div className="max-w-2xl w-full rounded-3xl border border-[#ffffff]/15 bg-[#09090b]/95 p-6 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.95)] relative overflow-hidden my-auto">
          {/* Resplandor ambiental de fondo */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#8052ff]/20 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#15846e]/20 blur-[100px] pointer-events-none" />

          {/* Botón de configuración para Rectoría / Admin */}
          {effectiveIsAdmin && (
            <div className="absolute top-5 right-5 z-20">
              <button
                type="button"
                onClick={() => {
                  setDraftPlan(rectoriaOffer.targetPlan);
                  setDraftDays(rectoriaOffer.durationDays);
                  setDraftPriceCop(rectoriaOffer.priceCop);
                  setDraftPriceUsd(rectoriaOffer.priceUsd);
                  setDraftHeadline(rectoriaOffer.headline);
                  setDraftBadge(rectoriaOffer.badge);
                  setIsAdminConfigOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff]/5 hover:bg-[#ffffff]/10 border border-[#ffffff]/15 text-[#9a9a9a] hover:text-white text-[11px] transition-all cursor-pointer"
                title="Configurar Plan, Tiempo y Precio de Rectoría"
              >
                <Sliders className="w-3.5 h-3.5 text-[#ffb829]" />
                <span className="font-mono">Rectoría: Configurar Oferta</span>
              </button>
            </div>
          )}

          <div className="relative z-10 space-y-6">
            {/* Encabezado Principal */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/15 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium">
                <meta.icon className="w-3.5 h-3.5" />
                <span>{meta.badge}</span>
                <span className="text-white/40">·</span>
                <span className="text-white/90">
                  Requiere Plan {effectiveMinPlan === 'pro_plus' ? 'Pro+' : 'Pro'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-white leading-tight">
                {title || meta.headline}
              </h2>

              <p className="text-sm font-light text-[#bdbdbd] leading-relaxed">
                {description || meta.whyLocked}
              </p>
            </div>

            {/* Tarjeta de Oferta Esporádica de Rectoría (Anti-estrés y ganancia baja) */}
            <div className="rounded-2xl border border-[#8052ff]/30 bg-gradient-to-br from-[#8052ff]/10 via-[#0d0d12] to-[#15846e]/10 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ffffff]/10 pb-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb829]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{rectoriaOffer.badge || 'Acuerdo Oficial de Rectoría'}</span>
                </div>
                <span className="text-[11px] font-mono text-[#9a9a9a]">
                  Oferta Institucional Activa
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                  {rectoriaOffer.headline}
                </h3>
                <p className="text-xs text-[#9a9a9a] leading-relaxed">
                  {rectoriaOffer.description}
                </p>
              </div>

              {/* Parámetros Clave Definidos por Rectoría: Plan, Tiempo y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Plan */}
                <div className="rounded-xl bg-[#09090b]/80 border border-[#ffffff]/10 p-3">
                  <span className="text-[10px] uppercase font-mono text-[#9a9a9a] block">
                    Nivel Autorizado
                  </span>
                  <span className="text-sm font-semibold text-white block mt-0.5">
                    {rectoriaOffer.targetPlan === 'pro_plus' ? 'Plan Pro+' : 'Plan Pro'}
                  </span>
                  <span className="text-[10px] text-[#8052ff] block">
                    {rectoriaOffer.targetPlan === 'pro_plus'
                      ? 'Tutorías + Todas las Áreas'
                      : 'Proyectos + Rúbricas'}
                  </span>
                </div>

                {/* 2. Tiempo */}
                <div className="rounded-xl bg-[#09090b]/80 border border-[#ffffff]/10 p-3">
                  <span className="text-[10px] uppercase font-mono text-[#9a9a9a] block">
                    Vigencia de Prueba
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-white">
                      {rectoriaOffer.durationDays}
                    </span>
                    <span className="text-xs text-[#9a9a9a]">días corridos</span>
                  </div>
                  <span className="text-[10px] text-[#15846e] block">Acceso total inmediato</span>
                </div>

                {/* 3. Precio */}
                <div className="rounded-xl bg-[#09090b]/80 border border-[#ffffff]/10 p-3">
                  <span className="text-[10px] uppercase font-mono text-[#9a9a9a] block">
                    Tarifa de Prueba
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    {isFreePrice ? (
                      <span className="text-lg font-bold text-[#15846e]">Sin Costo</span>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-[#ffb829]">
                          ${rectoriaOffer.priceCop.toLocaleString('es-CO')}
                        </span>
                        <span className="text-[10px] text-[#9a9a9a]">COP</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9a9a9a] block">
                    {isFreePrice ? 'Tarjeta requerida' : `~$${rectoriaOffer.priceUsd} USD`}
                  </span>
                </div>
              </div>

              {/* Beneficios puntuales */}
              <div className="space-y-1.5 pt-1">
                {(rectoriaOffer.perks || []).slice(0, 3).map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[#d1d5db]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15846e] shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              {/* Garantía Dignificada Anti-Estrés */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#ffffff]/10 text-[11px] text-[#9a9a9a]">
                <ShieldCheck className="w-4 h-4 text-[#15846e] shrink-0" />
                <span>
                  Sin permanencia ni llamadas comerciales. Cancela en cualquier momento con 1 solo
                  clic desde tu perfil.
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openPricingModal(rectoriaOffer.targetPlan)}
                className="flex-1 inline-flex items-center justify-center gap-2.5 bg-[#8052ff] hover:bg-[#6e3ff5] text-white text-xs sm:text-sm font-semibold px-6 py-3.5 rounded-full shadow-[0_0_25px_rgba(128,82,255,0.4)] transition-all cursor-pointer group"
              >
                <span>
                  {isFreePrice
                    ? `Iniciar Prueba de ${rectoriaOffer.durationDays} Días`
                    : `Activar Pase de Rectoría (${rectoriaOffer.durationDays} Días)`}
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => openPricingModal()}
                className="inline-flex items-center justify-center px-5 py-3.5 rounded-full bg-[#ffffff]/5 hover:bg-[#ffffff]/10 border border-[#ffffff]/15 text-xs text-[#bdbdbd] hover:text-white transition-all cursor-pointer"
              >
                <span>Ver Todos los Planes</span>
              </button>

              <Link
                href="/course"
                className="inline-flex items-center justify-center px-4 py-3.5 rounded-full text-xs text-[#9a9a9a] hover:text-white transition-all text-center"
              >
                <span>Volver al Aula Gratuita</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Drawer Administrativo de Rectoría para Editar Oferta en Vivo */}
      {isAdminConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl border border-[#ffffff]/20 bg-[#0d0d12] p-6 space-y-5 text-white shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#ffffff]/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#ffb829]" />
                <h3 className="text-sm font-semibold text-white">
                  Rectoría: Definir Plan, Tiempo y Precio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminConfigOpen(false)}
                className="p-1 rounded-full text-[#9a9a9a] hover:text-white hover:bg-[#ffffff]/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRectoriaConfig} className="space-y-4 text-xs">
              {/* 1. Plan Objetivo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#9a9a9a] uppercase">
                  1. Plan Ofrecido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftPlan('pro')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      draftPlan === 'pro'
                        ? 'border-[#8052ff] bg-[#8052ff]/20 text-white font-semibold'
                        : 'border-[#ffffff]/10 bg-[#09090b] text-[#9a9a9a]'
                    }`}
                  >
                    Plan Pro (Proyectos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftPlan('pro_plus')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      draftPlan === 'pro_plus'
                        ? 'border-[#ffb829] bg-[#ffb829]/20 text-white font-semibold'
                        : 'border-[#ffffff]/10 bg-[#09090b] text-[#9a9a9a]'
                    }`}
                  >
                    Plan Pro+ (Tutorías 1 a 1)
                  </button>
                </div>
              </div>

              {/* 2. Tiempo (Días de Prueba) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#9a9a9a] uppercase">
                  2. Tiempo / Duración (Días)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDraftDays(d)}
                      className={`py-2 px-2 rounded-xl border text-center transition-all ${
                        draftDays === d
                          ? 'border-[#15846e] bg-[#15846e]/20 text-white font-semibold'
                          : 'border-[#ffffff]/10 bg-[#09090b] text-[#9a9a9a]'
                      }`}
                    >
                      {d} Días
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Precio COP y USD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#9a9a9a] uppercase">
                    3. Precio COP
                  </label>
                  <input
                    type="number"
                    value={draftPriceCop}
                    onChange={(e) => setDraftPriceCop(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090b] border border-[#ffffff]/15 text-white font-mono focus:border-[#8052ff] focus:outline-none"
                    placeholder="19000"
                  />
                  <span className="text-[10px] text-[#9a9a9a]">0 = Prueba sin costo</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-[#9a9a9a] uppercase">
                    Precio USD
                  </label>
                  <input
                    type="number"
                    value={draftPriceUsd}
                    onChange={(e) => setDraftPriceUsd(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090b] border border-[#ffffff]/15 text-white font-mono focus:border-[#8052ff] focus:outline-none"
                    placeholder="5"
                  />
                </div>
              </div>

              {/* 4. Título de la Oferta */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#9a9a9a] uppercase">
                  Encabezado / Título de Rectoría
                </label>
                <input
                  type="text"
                  value={draftHeadline}
                  onChange={(e) => setDraftHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090b] border border-[#ffffff]/15 text-white focus:border-[#8052ff] focus:outline-none"
                  placeholder="Pase Académico de Acceso Total"
                />
              </div>

              {/* Botón de Guardado */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminConfigOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#9a9a9a] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 rounded-xl bg-[#8052ff] hover:bg-[#6e3ff5] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? 'Guardando en Firebase...' : 'Guardar y Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
