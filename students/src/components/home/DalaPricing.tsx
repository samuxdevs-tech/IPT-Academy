'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Sparkles, Building2 } from 'lucide-react';
import { formatCop } from '@/lib/subscriptionEngine';

export default function DalaPricing() {
  const tiers = [
    {
      id: 'free',
      name: 'Prueba Gratuita',
      badge: 'Acceso Inicial',
      price: '$0',
      period: 'por 14 días',
      description: 'Experimenta la metodología de formación de IPT Course sin costo ni compromiso.',
      features: [
        'Acceso completo al curso liberado',
        '1 Crédito de clase en vivo de cortesía',
        'Visualización de rúbricas docentes',
        'Sin requerimiento de tarjeta de crédito',
      ],
      ctaText: 'Iniciar Trial Gratuito',
      ctaHref: '#curso-liberado',
      isPrimary: false,
    },
    {
      id: 'pro',
      name: 'Plan Pro',
      badge: 'Estudio Continuo',
      price: formatCop(79000),
      period: 'al mes',
      description: 'Para profesionales que desean profundizar en especializaciones técnicas con evaluación.',
      features: [
        '1 Especialización dinámica activa',
        'Intercambio flexible de cursos',
        'Acceso ilimitado a biblioteca de lecciones',
        'Emisión de certificados oficiales con folio',
      ],
      ctaText: 'Comenzar con Pro',
      ctaHref: '/register?plan=pro',
      isPrimary: false,
    },
    {
      id: 'pro_plus',
      name: 'Plan Pro+',
      badge: 'Más Elegido · Recomendado',
      price: formatCop(149000),
      period: 'al mes',
      description: 'Acompañamiento docente intensivo, tutoría directa y múltiples especializaciones simultáneas.',
      features: [
        '3 Especializaciones dinámicas simultáneas',
        '8 Créditos de clases virtuales en vivo al mes',
        'Revisión detallada de tareas con rúbricas',
        'Prioridad en reserva de sesiones con docentes',
        'Certificados verificables de alta credencial',
      ],
      ctaText: 'Comenzar con Pro+',
      ctaHref: '/register?plan=pro_plus',
      isPrimary: true,
    },
    {
      id: 'your_plan',
      name: 'Plan Corporativo',
      badge: 'Equipos y Empresas',
      price: 'A convenir',
      period: 'según asientos',
      description: 'Capacitación técnica para departamentos de ingeniería y empresas de base tecnológica.',
      features: [
        'Asientos de estudiantes centralizados',
        'Bolsa configurable de créditos en vivo',
        'Métricas grupales de rendimiento y avance',
        'Facturación corporativa con soporte directo',
      ],
      ctaText: 'Contactar Asesoría',
      ctaHref: 'mailto:contacto@ivanperez.tech?subject=Plan%20Corporativo%20IPT%20Course',
      isPrimary: false,
    },
  ];

  return (
    <section id="membresias" className="relative py-28 px-6 z-10 border-t border-[#ffffff]/10">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Header Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-7">
            <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#ffb829] block mb-3">
              Inversión y Membresías
            </span>
            <h2 className="text-[42px] sm:text-[56px] md:text-[64px] font-normal text-white leading-[1.05] tracking-[-0.04em]">
              Elige tu ritmo de aprendizaje.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[17px] font-extralight text-[#bdbdbd] leading-[1.5]">
              Planes claros y sin costos ocultos. Todos los planes de pago incluyen acceso
              a certificados verificables y evaluación docente.
            </p>
          </div>
        </div>

        {/* Pricing Cards Grid — Solid Opaque Surfaces so particles NEVER disrupt text */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative z-10 p-7 rounded-[24px] flex flex-col justify-between transition-all duration-300 ${
                tier.isPrimary
                  ? 'bg-[#0d091b] border-2 border-[#8052ff] shadow-[0_0_40px_rgba(128,82,255,0.3)]'
                  : 'bg-[#09090b] border border-[#ffffff]/15 hover:border-[#ffffff]/30 shadow-xl'
              }`}
            >
              <div>
                <div className="mb-4">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.05em] px-2.5 py-1 rounded-full ${
                      tier.isPrimary
                        ? 'text-[#ffb829] bg-[#ffb829]/15'
                        : 'text-[#9a9a9a] bg-[#ffffff]/5'
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>

                <h3 className="text-[22px] font-normal text-white tracking-[-0.02em] mb-2">
                  {tier.name}
                </h3>
                <p className="text-[13px] font-extralight text-[#bdbdbd] leading-relaxed mb-6 min-h-[40px]">
                  {tier.description}
                </p>

                <div className="mb-6 pb-6 border-b border-[#ffffff]/10">
                  <div className="text-[36px] font-normal text-white tracking-tight leading-none mb-1">
                    {tier.price}
                  </div>
                  <div className="text-[12px] text-[#9a9a9a] font-light">{tier.period}</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-[13px] text-[#bdbdbd] font-extralight">
                      <Check className="w-4 h-4 text-[#8052ff] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Link
                  href={tier.ctaHref}
                  className={`w-full py-3 rounded-[24px] text-[13px] font-semibold uppercase tracking-[0.025em] flex items-center justify-center transition-all ${
                    tier.isPrimary
                      ? 'bg-[#8052ff] hover:bg-[#6e3df0] text-white shadow-[0_0_20px_rgba(128,82,255,0.35)]'
                      : 'bg-[#ffffff]/10 hover:bg-[#ffffff]/20 text-white'
                  }`}
                >
                  {tier.ctaText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
