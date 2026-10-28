'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Download,
  Clock,
  CheckCircle2,
  ArrowRight,
  Video,
  FileCheck2,
  Users,
  Radio,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';

interface CalendarScheduleItem {
  id: string;
  title: string;
  category: 'live_class' | 'assignment_due' | 'mentorship_1on1';
  courseTitle: string;
  dateLabel: string;
  timeLabel: string;
  instructorOrNote: string;
  actionHref: string;
  actionLabel: string;
  minQuotaLabel?: string;
}

const SCHEDULE_EVENTS: CalendarScheduleItem[] = [
  {
    id: 'cal-1',
    title: 'Clase en Vivo: Diseño de Sistemas de Alta Concurrencia e Idempotencia',
    category: 'live_class',
    courseTitle: 'IPT Master: Arquitectura Fullstack',
    dateLabel: 'Miércoles 04 de Noviembre',
    timeLabel: '19:00 a 20:00 (Hora Colombia)',
    instructorOrNote: 'Ing. Iván Pérez · Director Académico',
    actionHref: '/live?session=sess-wed-1900',
    actionLabel: 'Ir a la Sala / Reservar',
    minQuotaLabel: 'Cuota mínima: 3 estudiantes (Confirmada 4/3)',
  },
  {
    id: 'cal-2',
    title: 'Fecha Límite de Entrega: Separación de Capas y Contratos de Dominio',
    category: 'assignment_due',
    courseTitle: 'IPT Master: Arquitectura Fullstack',
    dateLabel: 'Jueves 05 de Noviembre',
    timeLabel: 'Hasta las 23:59',
    instructorOrNote: 'Evaluación con matriz de rúbrica oficial (100 pts)',
    actionHref: '/assignments?id=asg-arch-01',
    actionLabel: 'Ver Tarea y Rúbrica',
  },
  {
    id: 'cal-3',
    title: 'Clase en Vivo: Laboratorio de Recuperación ante Caídas de Nodos',
    category: 'live_class',
    courseTitle: 'Arquitectura Cloud Resiliente',
    dateLabel: 'Viernes 06 de Noviembre',
    timeLabel: '18:00 a 19:00 (Hora Colombia)',
    instructorOrNote: 'Comité Docente IPT',
    actionHref: '/live?session=sess-fri-1800',
    actionLabel: 'Reservar Cupo (1 Crédito)',
    minQuotaLabel: 'Cuota mínima: 3 estudiantes (En inscripción 1/3)',
  },
  {
    id: 'cal-4',
    title: 'Horario de Atención Individual 1 a 1 (Exclusivo Your Plan)',
    category: 'mentorship_1on1',
    courseTitle: 'Mentoría Personalizada a la Medida',
    dateLabel: 'Martes y Jueves',
    timeLabel: '17:00 a 18:30 (Bloques de 15 min)',
    instructorOrNote: 'Fila virtual directa con el profesor titular',
    actionHref: '/home',
    actionLabel: 'Tomar Turno en Fila 1 a 1',
  },
  {
    id: 'cal-5',
    title: 'Fecha Límite de Entrega: Políticas de Reintento e Idempotencia en Pagos',
    category: 'assignment_due',
    courseTitle: 'IPT Master: Arquitectura Fullstack',
    dateLabel: 'Jueves 12 de Noviembre',
    timeLabel: 'Hasta las 23:59',
    instructorOrNote: 'Evaluación con matriz de rúbrica oficial (100 pts)',
    actionHref: '/assignments?id=asg-arch-02',
    actionLabel: 'Realizar Entrega',
  },
];

export default function InstitutionalCalendarPage() {
  const { subscription } = useSubscription();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    if (filterCategory === 'all') return SCHEDULE_EVENTS;
    return SCHEDULE_EVENTS.filter((e) => e.category === filterCategory);
  }, [filterCategory]);

  const handleDownloadCalendar = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IPT Academy//Agenda Estudiantil//ES',
      ...visibleEvents.flatMap((ev) => [
        'BEGIN:VEVENT',
        `UID:${ev.id}@iptapps.com`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${ev.courseTitle} - ${ev.instructorOrNote}`,
        'DTSTART:20261104T190000Z',
        'DTEND:20261104T200000Z',
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda-clases-ipt-academy.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportNotice(
      'Se descargó tu archivo de agenda para agregarlo con 1 clic en el calendario de tu celular o computador.'
    );
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1360px] mx-auto space-y-8">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ffffff]/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium mb-3">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Cronograma Fijo Semanal y Entregas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Calendario de Clases en Vivo y Actividades
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-2 max-w-2xl">
              Consulta los horarios publicados por los docentes para las sesiones en vivo, las
              fechas límite de tus entregas y las franjas de atención individual.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadCalendar}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#8052ff] hover:bg-[#6d3df5] text-xs font-semibold text-white shadow-[0_0_25px_rgba(128,82,255,0.35)] transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Guardar Agenda en mi Celular / Computador</span>
          </button>
        </div>

        {exportNotice && (
          <div className="p-4 rounded-2xl bg-[#15846e]/15 border border-[#15846e]/40 text-xs text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#15846e] shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Filtros de Categoría */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todas las Fechas' },
            { id: 'live_class', label: 'Catálogo de Clases en Vivo' },
            { id: 'assignment_due', label: 'Fechas de Entrega de Tareas' },
            { id: 'mentorship_1on1', label: 'Asesorías 1 a 1 (Your Plan)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-[#8052ff] text-white'
                  : 'bg-[#09090b] border border-[#ffffff]/10 text-[#bdbdbd] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista de Eventos del Cronograma */}
        <div className="space-y-4">
          {visibleEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-6 rounded-3xl bg-[#09090b] border border-[#ffffff]/10 hover:border-[#ffffff]/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {ev.category === 'live_class' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ffb829]/15 border border-[#ffb829]/30 text-[#ffb829] text-[11px] font-semibold">
                      <Video className="w-3 h-3" />
                      <span>Clase en Vivo</span>
                    </span>
                  )}
                  {ev.category === 'assignment_due' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#8052ff]/15 border border-[#8052ff]/30 text-[#c0c4fc] text-[11px] font-semibold">
                      <FileCheck2 className="w-3 h-3" />
                      <span>Entrega de Tarea</span>
                    </span>
                  )}
                  {ev.category === 'mentorship_1on1' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#15846e]/15 border border-[#15846e]/30 text-[#15846e] text-[11px] font-semibold">
                      <Radio className="w-3 h-3" />
                      <span>Exclusivo Your Plan · 1 a 1</span>
                    </span>
                  )}

                  <span className="text-xs font-mono text-white">{ev.dateLabel}</span>
                  <span className="text-xs text-[#9a9a9a]">•</span>
                  <span className="text-xs text-[#bdbdbd] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#8052ff]" />
                    {ev.timeLabel}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white">{ev.title}</h3>
                <p className="text-xs text-[#9a9a9a]">
                  {ev.courseTitle} — {ev.instructorOrNote}
                </p>

                {ev.minQuotaLabel && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#ffb829] pt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{ev.minQuotaLabel}</span>
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <Link
                  href={ev.actionHref}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#ffffff]/10 hover:bg-[#8052ff] text-xs font-semibold text-white transition-all"
                >
                  <span>{ev.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
