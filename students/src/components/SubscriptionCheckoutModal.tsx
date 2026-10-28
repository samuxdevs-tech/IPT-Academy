'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Phone,
  Building2,
  Calendar,
  FileText,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Award,
  Video,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLms } from '@/context/LmsContext';
import { BillingTaxProfile, PlanId } from '@/lib/subscriptionEngine';

export default function SubscriptionCheckoutModal() {
  const {
    subscription,
    entitlements,
    planConfigs,
    invoices,
    yourPlanRequests,
    isPricingModalOpen,
    preselectedModalPlan,
    closePricingModal,
    startTrial,
    upgradeSubscription,
    scheduleDowngrade,
    cancelSubscription,
    resumeSubscription,
    reactivateSubscription,
    submitYourPlanRequest,
  } = useSubscription();

  const { courses } = useLms();

  const [activeTab, setActiveTab] = useState<'plans' | 'checkout' | 'your_plan' | 'billing'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'pro_plus'>(
    preselectedModalPlan === 'pro' ? 'pro' : 'pro_plus'
  );

  // Campos de tarjeta simulada (Hosted Fields: jamás guarda PAN completo ni CVV)
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumberInput, setCardNumberInput] = useState('4532 •••• •••• 4242');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex'>('visa');
  const [expMonth, setExpMonth] = useState(12);
  const [expYear, setExpYear] = useState(2028);
  const [cvvInput, setCvvInput] = useState('•••');
  const [phoneNumber, setPhoneNumber] = useState('+57 300 123 4567');
  const [selectedInitialCourse, setSelectedInitialCourse] = useState('ipt-master-fullstack');

  // Datos fiscales DIAN Colombia
  const [includeTaxProfile, setIncludeTaxProfile] = useState(false);
  const [docType, setDocType] = useState<BillingTaxProfile['documentType']>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [verificationDigit, setVerificationDigit] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxRegime, setTaxRegime] = useState<BillingTaxProfile['taxRegime']>('no_responsable_iva');
  const [billingEmail, setBillingEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Downgrade selector
  const [downgradeCourseToKeep, setDowngradeCourseToKeep] = useState<string>(
    subscription?.activeDynamicCourseSlugs?.[0] || 'ipt-master-fullstack'
  );

  // Your Plan Executive Form
  const [orgName, setOrgName] = useState('');
  const [seatsRequested, setSeatsRequested] = useState(5);
  const [desiredDynamicCourses, setDesiredDynamicCourses] = useState(4);
  const [desiredWeeklyLive, setDesiredWeeklyLive] = useState(3);
  const [desiredTrialDays, setDesiredTrialDays] = useState(15);
  const [executivePhone, setExecutivePhone] = useState('+57 ');
  const [executiveNotes, setExecutiveNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const dynamicCoursesList = useMemo(() => {
    const list = courses.filter((c) => (c as any).courseType !== 'static');
    return list.length > 0 ? list : courses;
  }, [courses]);

  if (!isPricingModalOpen) return null;

  const targetConfig = planConfigs[selectedPlan];
  const subtotal = targetConfig.priceMonthly;
  const taxAmount = Math.round(subtotal * (targetConfig.taxRatePercent / 100));
  const totalMonthly = subtotal + taxAmount;

  const canStartNewTrial = !subscription || (subscription.planId === 'free' && subscription.status === 'active');

  const handleSelectPlanForCheckout = (plan: PlanId) => {
    setFeedbackMessage(null);
    if (plan === 'your_plan') {
      setActiveTab('your_plan');
      return;
    }
    if (plan === 'free') {
      if (subscription && subscription.planId !== 'free' && subscription.status !== 'read_only') {
        handleDowngrade('free');
      }
      return;
    }
    setSelectedPlan(plan);
    setActiveTab('checkout');
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!acceptedTerms) {
      setFeedbackMessage({
        type: 'error',
        text: 'Por favor confirma que aceptas las condiciones del ciclo mensual y uso del servicio.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const digitsOnly = cardNumberInput.replace(/\D/g, '');
      const last4 = digitsOnly.slice(-4) || '4242';

      const taxProfile: BillingTaxProfile | undefined =
        includeTaxProfile && docNumber.trim()
          ? {
              documentType: docType,
              documentNumber: docNumber.trim(),
              verificationDigit: docType === 'NIT' ? verificationDigit.trim() : undefined,
              legalName: legalName.trim() || cardholderName.trim() || 'Suscriptor IPT',
              taxRegime,
              billingEmail: billingEmail.trim() || 'facturacion@ivanperez.tech',
            }
          : undefined;

      if (subscription && subscription.status === 'read_only') {
        await reactivateSubscription({
          targetPlanId: selectedPlan,
          newCardInput: {
            panLast4: last4,
            brand: cardBrand,
            expMonth,
            expYear,
            cardholderName: cardholderName.trim() || 'Titular IPT',
          },
        });
        setFeedbackMessage({
          type: 'success',
          text: 'Tu suscripción ha sido reactivada y tus cursos previos han sido restaurados.',
        });
      } else if (
        subscription &&
        subscription.planId !== 'free' &&
        (subscription.status === 'active' || subscription.status === 'trial')
      ) {
        await upgradeSubscription(selectedPlan);
        setFeedbackMessage({
          type: 'success',
          text: `Tu plan se actualizó a ${targetConfig.name} exitosamente.`,
        });
      } else {
        await startTrial({
          planId: selectedPlan,
          cardInput: {
            panLast4: last4,
            brand: cardBrand,
            expMonth,
            expYear,
            cardholderName: cardholderName.trim() || 'Titular IPT',
            rawCardIdentifierForFingerprint: `${cardBrand}_${last4}_${expMonth}_${expYear}`,
          },
          phoneNumber,
          taxProfile,
          initialDynamicCourseSlug: selectedInitialCourse,
        });
        setFeedbackMessage({
          type: 'success',
          text: `¡Periodo de prueba de ${targetConfig.trialDays} días en ${targetConfig.name} activado!`,
        });
      }
      setTimeout(() => {
        closePricingModal();
      }, 1100);
    } catch (err: any) {
      const rawMsg = String(err?.message || 'Error procesando la solicitud');
      let friendly = rawMsg;
      if (rawMsg.includes('TRIAL_ALREADY_USED')) {
        friendly = 'Ya utilizaste tu único periodo de prueba gratuito en la plataforma.';
      } else if (rawMsg.includes('CARD_FINGERPRINT_ALREADY_USED')) {
        friendly =
          'Esta tarjeta ya fue utilizada para activar un periodo de prueba en otra cuenta. Si compartes tarjeta familiar, solicita autorización a soporte.';
      } else if (rawMsg.includes('PAYMENT_METHOD_EXPIRED')) {
        friendly = 'La fecha de vencimiento de la tarjeta ingresada ya expiró.';
      } else if (rawMsg.includes('DISPOSABLE_EMAIL')) {
        friendly = 'No se permiten direcciones de correo temporales para activar pruebas gratuitas.';
      }
      setFeedbackMessage({ type: 'error', text: friendly });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDowngrade = async (target: 'free' | 'pro') => {
    setSubmitting(true);
    setFeedbackMessage(null);
    try {
      await scheduleDowngrade(target, target === 'pro' ? downgradeCourseToKeep : undefined);
      setFeedbackMessage({
        type: 'success',
        text: `El cambio a ${target === 'free' ? 'Plan Free' : 'Plan Pro'} quedó programado para el final de tu ciclo actual sin cobros adicionales.`,
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitYourPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMessage(null);
    try {
      await submitYourPlanRequest({
        organizationName: orgName.trim() || 'Plan Personalizado Individual',
        seatsRequested,
        desiredDynamicCourses,
        desiredWeeklyLiveSessions: desiredWeeklyLive,
        desiredTrialDays,
        contactPhone: executivePhone.trim(),
        preferredScheduleNotes: executiveNotes.trim(),
      });
      setFeedbackMessage({
        type: 'success',
        text: 'Solicitud enviada al equipo ejecutivo de IPT. Un administrador definirá tu propuesta y días de prueba acordados.',
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#202230]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ipt-subscription-modal-title"
    >
      <div className="bg-[#ffffff] text-[#2a2b3f] w-full max-w-5xl rounded-2xl border border-[#d1d2e0] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#f6f7f9] border-b border-[#e9eaf2] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.svg" alt="IPT" className="w-8 h-8" />
            <div>
              <h2 id="ipt-subscription-modal-title" className="text-lg font-bold text-[#202230]">
                Planes, Campus y Suscripciones IPT Academy
              </h2>
              <p className="text-xs text-[#595c73]">
                Elige cómo quieres estudiar: cursos a tu ritmo, acompañamiento docente o clases en vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-[#e9eaf2] p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'plans' ? 'bg-[#ffffff] text-[#202230] font-semibold' : 'text-[#595c73]'
                }`}
              >
                Comparar Planes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('checkout')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'checkout' ? 'bg-[#ffffff] text-[#202230] font-semibold' : 'text-[#595c73]'
                }`}
              >
                Activar / Cambiar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('your_plan')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'your_plan' ? 'bg-[#ffffff] text-[#202230] font-semibold' : 'text-[#595c73]'
                }`}
              >
                Your Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'billing' ? 'bg-[#ffffff] text-[#202230] font-semibold' : 'text-[#595c73]'
                }`}
              >
                Mi Cuenta y Facturas
              </button>
            </div>

            <button
              type="button"
              onClick={closePricingModal}
              className="p-2 rounded-lg text-[#595c73] hover:text-[#202230] hover:bg-[#e9eaf2] cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de retroalimentación */}
        {feedbackMessage && (
          <div
            className={`px-6 py-3 text-xs font-medium flex items-center justify-between border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-xs underline cursor-pointer"
            >
              Cerrar aviso
            </button>
          </div>
        )}

        {/* Contenido desplazable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Explicación clara de por qué Pro+ tiene 15 días de prueba frente a los 20 días de Pro */}
              <div className="bg-[#f6f7f9] border border-[#d1d2e0] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#6d28d2] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#2a2b3f] space-y-0.5">
                    <p className="font-semibold text-[#202230]">
                      ¿Por qué el Plan Pro ofrece 20 días de prueba y el Plan Pro+ ofrece 15 días?
                    </p>
                    <p className="text-[#595c73]">
                      El Plan Pro+ incluye acceso directo a clases en vivo semanales con docentes titulares y 1 sesión en vivo de cortesía durante la prueba. Al implicar horas de docencia sincrónica en tiempo real, el periodo de prueba es de 15 días. Puedes cancelar en cualquier momento antes de la fecha de corte sin cobro.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grilla de los 4 planes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Plan Free */}
                <div className="rounded-xl border border-[#d1d2e0] bg-[#ffffff] p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#595c73]">
                        Campus Estático
                      </span>
                      <h3 className="text-xl font-bold text-[#202230] mt-1">Free</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#202230]">$0</span>
                        <span className="text-xs text-[#595c73]">/ siempre</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#2a2b3f]">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                        <span>Acceso a los cursos estáticos liberados por la administración</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                        <span>Consulta permanente de certificados ya obtenidos</span>
                      </li>
                      <li className="flex items-start gap-2 text-[#9194ac]">
                        <X className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Sin cursos dinámicos ni corrección de tareas</span>
                      </li>
                      <li className="flex items-start gap-2 text-[#9194ac]">
                        <X className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Sin clases en vivo</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanForCheckout('free')}
                    disabled={subscription?.planId === 'free'}
                    className="mt-6 w-full py-2.5 px-4 rounded-lg border border-[#d1d2e0] text-xs font-semibold text-[#2a2b3f] hover:bg-[#f6f7f9] disabled:opacity-50 cursor-pointer"
                  >
                    {subscription?.planId === 'free' ? 'Tu plan actual' : 'Cambiar a Free al corte'}
                  </button>
                </div>

                {/* 2. Plan Pro */}
                <div className="rounded-xl border border-[#202230] bg-[#ffffff] p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <img src="/logo-pro.svg" alt="IPT Pro" className="h-6 w-auto" />
                        <span className="text-[10px] font-bold bg-[#e9eaf2] text-[#202230] px-2 py-0.5 rounded-full">
                          20 días gratis
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#202230]">
                          ${planConfigs.pro.priceMonthly.toLocaleString('es-CO')}
                        </span>
                        <span className="text-xs text-[#595c73]">COP + IVA / mes</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#2a2b3f]">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                        <span>
                          <strong>Todos los cursos estáticos</strong> del catálogo completo
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                        <span>
                          <strong>1 Curso Dinámico activo</strong> elegible de la lista oficial (entregas y evaluación docente)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                        <span>Campus Pro con seguimiento de rúbricas y notas</span>
                      </li>
                      <li className="flex items-start gap-2 text-[#9194ac]">
                        <X className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Sin sesiones de clases en vivo</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanForCheckout('pro')}
                    className="mt-6 w-full py-2.5 px-4 rounded-lg border-[1.5px] border-[#6d28d2] text-xs font-semibold text-[#6d28d2] hover:bg-[#f6f7f9] cursor-pointer"
                  >
                    {subscription?.planId === 'pro' && subscription.status !== 'read_only'
                      ? 'Plan activo'
                      : canStartNewTrial
                      ? 'Probar 20 días gratis'
                      : 'Elegir Plan Pro'}
                  </button>
                </div>

                {/* 3. Plan Pro+ */}
                <div className="rounded-xl border-2 border-[#6d28d2] bg-[#202230] text-[#ffffff] p-5 flex flex-col justify-between relative">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider uppercase text-[#c0c4fc]">
                          IPT PRO+ EN VIVO
                        </span>
                        <span className="text-[10px] font-bold bg-[#6d28d2] text-[#ffffff] px-2 py-0.5 rounded-full">
                          15 días gratis
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#ffffff]">
                          ${planConfigs.pro_plus.priceMonthly.toLocaleString('es-CO')}
                        </span>
                        <span className="text-xs text-[#b7b9cd]">COP + IVA / mes</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#e9eaf2]">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c0c4fc] shrink-0 mt-0.5" />
                        <span>Todo lo incluido en Free y Pro</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c0c4fc] shrink-0 mt-0.5" />
                        <span>
                          Hasta <strong>{planConfigs.pro_plus.maxDynamicCourses} Cursos Dinámicos</strong> simultáneos
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c0c4fc] shrink-0 mt-0.5" />
                        <span>
                          <strong>{planConfigs.pro_plus.monthlyLiveCredits} Clases en Vivo mensuales</strong> (incluye 1 crédito de cortesía en prueba)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c0c4fc] shrink-0 mt-0.5" />
                        <span>Acceso a sala en vivo, calendario interactivo y grabaciones</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanForCheckout('pro_plus')}
                    className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#ffffff] text-[#202230] hover:bg-[#e9eaf2] text-xs font-bold cursor-pointer"
                  >
                    {subscription?.planId === 'pro_plus' && subscription.status !== 'read_only'
                      ? 'Tu plan actual'
                      : canStartNewTrial
                      ? 'Probar 15 días gratis'
                      : 'Subir a Plan Pro+'}
                  </button>
                </div>

                {/* 4. Plan Your Plan */}
                <div className="rounded-xl border border-[#c4710d] bg-[#ffffff] p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <img src="/logo-your-plan.svg" alt="Your Plan" className="h-6 w-auto" />
                      </div>
                      <div className="mt-3">
                        <span className="text-lg font-bold text-[#202230]">Acuerdo a Medida</span>
                        <p className="text-[11px] text-[#595c73] mt-0.5">
                          Precio, cupos y facturación definidos con un ejecutivo
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#2a2b3f]">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c4710d] shrink-0 mt-0.5" />
                        <span>Llamada o conversación directa con un ejecutivo/administrador</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c4710d] shrink-0 mt-0.5" />
                        <span>Días de prueba gratuitos personalizados según la intensidad que busques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c4710d] shrink-0 mt-0.5" />
                        <span>Soporte para múltiples asientos de equipos u organizaciones</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#c4710d] shrink-0 mt-0.5" />
                        <span>Facturación electrónica corporativa DIAN</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlanForCheckout('your_plan')}
                    className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#202230] text-[#ffffff] hover:bg-[#33364a] text-xs font-semibold cursor-pointer"
                  >
                    Conversar con Ejecutivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checkout' && (
            <form onSubmit={handleConfirmCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#202230]">
                    1. Selecciona tu plan y curso dinámico inicial
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('pro')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        selectedPlan === 'pro'
                          ? 'border-[#6d28d2] bg-[#f6f7f9] text-[#6d28d2]'
                          : 'border-[#d1d2e0] text-[#595c73]'
                      }`}
                    >
                      Pro (20d trial)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('pro_plus')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        selectedPlan === 'pro_plus'
                          ? 'border-[#6d28d2] bg-[#f6f7f9] text-[#6d28d2]'
                          : 'border-[#d1d2e0] text-[#595c73]'
                      }`}
                    >
                      Pro+ (15d trial + En Vivo)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202230] mb-1.5">
                    Curso dinámico que deseas activar ahora:
                  </label>
                  <select
                    value={selectedInitialCourse}
                    onChange={(e) => setSelectedInitialCourse(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs text-[#202230] bg-[#ffffff]"
                  >
                    {dynamicCoursesList.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verificación telefónica y tarjeta tokenizada */}
                <div className="p-4 rounded-xl border border-[#d1d2e0] bg-[#f6f7f9] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202230] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#6d28d2]" />
                      2. Verificación de teléfono y tarjeta para activar
                    </span>
                    <span className="text-[11px] text-[#595c73]">
                      Pasarela simulada tokenizada (no almacena número completo ni CVV)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                        Nombre en la tarjeta
                      </label>
                      <input
                        type="text"
                        required
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="Ej. Iván Pérez"
                        className="w-full h-10 px-3 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                        Teléfono móvil verificado
                      </label>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+57 300 000 0000"
                        className="w-full h-10 px-3 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                        Número de tarjeta (Simulación)
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumberInput}
                        onChange={(e) => setCardNumberInput(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                        Franquicia
                      </label>
                      <select
                        value={cardBrand}
                        onChange={(e) => setCardBrand(e.target.value as any)}
                        className="w-full h-10 px-2 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230]"
                      >
                        <option value="visa">Visa</option>
                        <option value="mastercard">Mastercard</option>
                        <option value="amex">Amex</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                          Mes
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={expMonth}
                          onChange={(e) => setExpMonth(Number(e.target.value))}
                          className="w-full h-10 px-2 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#595c73] mb-1">
                          Año
                        </label>
                        <input
                          type="number"
                          min={2026}
                          max={2035}
                          value={expYear}
                          onChange={(e) => setExpYear(Number(e.target.value))}
                          className="w-full h-10 px-2 rounded-md border border-[#d1d2e0] bg-[#ffffff] text-xs text-[#202230]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datos Fiscales DIAN Opcionales */}
                <div className="p-4 rounded-xl border border-[#d1d2e0] bg-[#ffffff] space-y-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#202230] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTaxProfile}
                      onChange={(e) => setIncludeTaxProfile(e.target.checked)}
                      className="rounded border-[#d1d2e0]"
                    />
                    <span>Requiero Factura Electrónica DIAN (Colombia) con CC o NIT</span>
                  </label>

                  {includeTaxProfile && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] text-[#595c73] mb-1">Tipo Doc.</label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value as any)}
                          className="w-full h-9 px-2 rounded border border-[#d1d2e0] text-xs"
                        >
                          <option value="CC">Cédula (CC)</option>
                          <option value="NIT">NIT Empresa</option>
                          <option value="CE">Cédula Extranjería</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#595c73] mb-1">
                          Número Documento
                        </label>
                        <input
                          type="text"
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          placeholder="Ej. 901234567"
                          className="w-full h-9 px-2.5 rounded border border-[#d1d2e0] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#595c73] mb-1">
                          Razón Social / Nombre
                        </label>
                        <input
                          type="text"
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                          placeholder="Nombre fiscal"
                          className="w-full h-9 px-2.5 rounded border border-[#d1d2e0] text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen derecho de Checkout */}
              <div className="lg:col-span-5 bg-[#f6f7f9] rounded-xl p-5 border border-[#d1d2e0] flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#202230]">Resumen de tu suscripción</h4>

                  <div className="p-3.5 rounded-lg bg-[#ffffff] border border-[#e9eaf2] space-y-2 text-xs">
                    <div className="flex justify-between font-semibold text-[#202230]">
                      <span>{targetConfig.name}</span>
                      <span>
                        {canStartNewTrial ? `${targetConfig.trialDays} días de prueba` : 'Ciclo mensual'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#595c73]">
                      <span>Subtotal mensual</span>
                      <span>${subtotal.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between text-[#595c73]">
                      <span>IVA ({targetConfig.taxRatePercent}%)</span>
                      <span>${taxAmount.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="pt-2 border-t border-[#e9eaf2] flex justify-between font-bold text-[#202230]">
                      <span>Total mensual después de la prueba</span>
                      <span>${totalMonthly.toLocaleString('es-CO')} COP</span>
                    </div>
                    {canStartNewTrial && (
                      <div className="pt-2 border-t border-[#e9eaf2] flex justify-between font-bold text-emerald-700">
                        <span>Total a pagar hoy</span>
                        <span>$0 COP</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-[#595c73] space-y-1.5 leading-relaxed">
                    <p>
                      • <strong>Renovación por mes calendario:</strong> Se renovará el mismo día de cada mes. Puedes cancelar cuando quieras con 1 clic y seguirás teniendo acceso hasta la fecha de corte sin cargos adicionales.
                    </p>
                    <p>
                      • <strong>Certificación durante la prueba:</strong> Si finalizas un curso durante los días de prueba y deseas emitir tu Certificado Oficial antes de terminar el trial, se liquidará el primer mes en ese momento.
                    </p>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-[#2a2b3f] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#d1d2e0]"
                    />
                    <span>
                      Acepto los términos del servicio, la política de renovación mensual y las condiciones de derecho de retracto (Ley 1480).
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-lg bg-[#202230] hover:bg-[#33364a] text-[#ffffff] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {submitting
                      ? 'Procesando...'
                      : subscription?.status === 'read_only'
                      ? `Reactivar ${targetConfig.name}`
                      : canStartNewTrial
                      ? `Iniciar mis ${targetConfig.trialDays} días gratis`
                      : `Confirmar cambio a ${targetConfig.name}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {activeTab === 'your_plan' && (
            <form onSubmit={handleSubmitYourPlan} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-base font-bold text-[#202230]">
                  Configura tu propuesta Your Plan con un Ejecutivo IPT
                </h3>
                <p className="text-xs text-[#595c73]">
                  Cuéntanos qué necesitas exactamente (para ti o para tu equipo). Un administrador revisará tu solicitud, conversará contigo para definir el precio y método de facturación, y te habilitará tus días de prueba acordados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202230] mb-1">
                      Empresa, Universidad o Proyecto
                    </label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Nombre de tu organización o personal"
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#202230] mb-1">
                      Teléfono / WhatsApp directo
                    </label>
                    <input
                      type="tel"
                      required
                      value={executivePhone}
                      onChange={(e) => setExecutivePhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                      Cupos / Asientos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={seatsRequested}
                      onChange={(e) => setSeatsRequested(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                      Cursos dinámicos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={desiredDynamicCourses}
                      onChange={(e) => setDesiredDynamicCourses(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                      Clases en vivo / sem
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={desiredWeeklyLive}
                      onChange={(e) => setDesiredWeeklyLive(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                      Días gratis deseados
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={desiredTrialDays}
                      onChange={(e) => setDesiredTrialDays(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-[#d1d2e0] text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202230] mb-1">
                    Objetivos y horario preferido para conversar
                  </label>
                  <textarea
                    rows={3}
                    value={executiveNotes}
                    onChange={(e) => setExecutiveNotes(e.target.value)}
                    placeholder="Indica qué temas buscas dominar, intensidad deseada y en qué horario te queda mejor recibir la llamada..."
                    className="w-full p-3 rounded-lg border border-[#d1d2e0] text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="py-3 px-6 rounded-lg bg-[#202230] text-[#ffffff] text-xs font-bold hover:bg-[#33364a] cursor-pointer"
                >
                  Solicitar llamada con Ejecutivo IPT
                </button>
              </div>

              <div className="lg:col-span-5 bg-[#f6f7f9] rounded-xl p-5 border border-[#d1d2e0] space-y-4">
                <h4 className="text-sm font-bold text-[#202230]">Estado de tus solicitudes Your Plan</h4>
                {yourPlanRequests.length === 0 ? (
                  <p className="text-xs text-[#595c73]">
                    Aún no has enviado solicitudes personalizadas. Al enviar el formulario, aparecerá aquí el seguimiento y la propuesta del administrador.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {yourPlanRequests.map((r) => (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-lg bg-[#ffffff] border border-[#d1d2e0] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-[#202230]">
                          <span>{r.organizationName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900">
                            {r.status === 'pending_call'
                              ? 'Llamada pendiente'
                              : r.status === 'approved'
                              ? 'Aprobado'
                              : 'En revisión'}
                          </span>
                        </div>
                        <p className="text-[#595c73]">
                          {r.seatsRequested} asiento(s) • {r.desiredDynamicCourses} cursos dinámicos •{' '}
                          {r.desiredTrialDays} días de prueba solicitados
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Estado actual, Cancelación, Deshacer Cancelación y Downgrade */}
              <div className="p-5 rounded-xl border border-[#d1d2e0] bg-[#f6f7f9] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#202230]">
                      Plan actual: {subscription?.planId.toUpperCase() || 'FREE'}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#d1d2e0] text-[#2a2b3f]">
                      Estado: {subscription?.status || 'active'}
                    </span>
                  </div>
                  <p className="text-xs text-[#595c73]">
                    Fecha de corte actual:{' '}
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO')
                      : 'Sin vencimiento'}
                    {subscription?.cancelAtPeriodEnd &&
                      ' (Cancelación programada al corte: no se realizarán más cobros)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {subscription &&
                    subscription.planId !== 'free' &&
                    subscription.status !== 'read_only' &&
                    !subscription.cancelAtPeriodEnd && (
                      <button
                        type="button"
                        onClick={() => cancelSubscription()}
                        className="px-3.5 py-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                      >
                        Cancelar al final del ciclo
                      </button>
                    )}

                  {subscription &&
                    subscription.cancelAtPeriodEnd &&
                    subscription.status !== 'read_only' && (
                      <button
                        type="button"
                        onClick={() => resumeSubscription()}
                        className="px-3.5 py-2 rounded-lg bg-emerald-700 text-[#ffffff] text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                      >
                        Deshacer cancelación (Mantener mi plan sin cobro extra)
                      </button>
                    )}
                </div>
              </div>

              {/* Si está en Pro+ y quiere bajar a Pro eligiendo qué curso conservar */}
              {subscription?.planId === 'pro_plus' && subscription.status !== 'read_only' && (
                <div className="p-4 rounded-xl border border-[#d1d2e0] bg-[#ffffff] space-y-3">
                  <h4 className="text-xs font-bold text-[#202230]">
                    ¿Deseas bajar de Pro+ a Plan Pro en tu próxima fecha de corte?
                  </h4>
                  <p className="text-xs text-[#595c73]">
                    El Plan Pro incluye 1 curso dinámico activo. Elige cuál de tus cursos dinámicos quieres mantener activo para el próximo ciclo (los demás quedarán guardados en pausa sin perder tu avance):
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={downgradeCourseToKeep}
                      onChange={(e) => setDowngradeCourseToKeep(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[#d1d2e0] text-xs text-[#202230]"
                    >
                      {(subscription.activeDynamicCourseSlugs.length > 0
                        ? subscription.activeDynamicCourseSlugs
                        : ['ipt-master-fullstack']
                      ).map((slug) => (
                        <option key={slug} value={slug}>
                          Conservar activo: {slug}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDowngrade('pro')}
                      className="px-4 py-2 rounded-lg border border-[#202230] text-xs font-semibold text-[#202230] hover:bg-[#f6f7f9] cursor-pointer"
                    >
                      Programar paso a Pro al corte
                    </button>
                  </div>
                </div>
              )}

              {/* Historial de Facturas con desglose de IVA */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#202230]">
                  Comprobantes y Facturas Electrónicas ({invoices.length})
                </h4>
                {invoices.length === 0 ? (
                  <p className="text-xs text-[#595c73]">
                    Aún no se han generado cobros en tu cuenta.
                  </p>
                ) : (
                  <div className="border border-[#d1d2e0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f7f9] text-[#595c73] border-b border-[#d1d2e0]">
                        <tr>
                          <th className="py-2.5 px-4">Factura</th>
                          <th className="py-2.5 px-4">Fecha</th>
                          <th className="py-2.5 px-4">Plan</th>
                          <th className="py-2.5 px-4">Subtotal</th>
                          <th className="py-2.5 px-4">IVA</th>
                          <th className="py-2.5 px-4">Total</th>
                          <th className="py-2.5 px-4">Estado DIAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9eaf2]">
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-2.5 px-4 font-mono font-semibold text-[#202230]">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-4 text-[#595c73]">
                              {new Date(inv.createdAt).toLocaleDateString('es-CO')}
                            </td>
                            <td className="py-2.5 px-4 uppercase font-medium">{inv.planId}</td>
                            <td className="py-2.5 px-4">
                              ${inv.subtotal.toLocaleString('es-CO')}
                            </td>
                            <td className="py-2.5 px-4">
                              ${inv.taxAmount.toLocaleString('es-CO')} ({inv.taxRatePercent}%)
                            </td>
                            <td className="py-2.5 px-4 font-bold text-[#202230]">
                              ${inv.total.toLocaleString('es-CO')} {inv.currency}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {inv.dianStatus === 'pending_emission'
                                  ? 'Lista para DIAN'
                                  : 'Comprobante emitido'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
