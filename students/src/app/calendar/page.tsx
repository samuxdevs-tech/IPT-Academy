'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Download,
  Clock,
  ArrowRight,
  Video,
  FileCheck2,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLms } from '@/context/LmsContext';
import { AcademicFeatureGate } from '@/components/AcademicFeatureGate';

interface CalendarScheduleItem {
  id: string;
  title: string;
  category: 'live_class' | 'assignment_due';
  courseTitle: string;
  dateLabel: string;
  timeLabel: string;
  instructorOrNote: string;
  actionHref: string;
  actionLabel: string;
}

export default function InstitutionalCalendarPage() {
  const { subscription } = useSubscription();
  const { liveSessions: rawLiveSessions, assignments: rawAssignments } = useLms();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const realEvents = useMemo<CalendarScheduleItem[]>(() => {
    const list: CalendarScheduleItem[] = [];

    // Clases en vivo reales de la plataforma
    if (Array.isArray(rawLiveSessions)) {
      rawLiveSessions.forEach((sess) => {
        list.push({
          id: `live-${sess.id}`,
          title: sess.title,
          category: 'live_class',
          courseTitle: sess.courseSlug,
          dateLabel: sess.startTimeUtc ? new Date(sess.startTimeUtc).toLocaleDateString('es-CO', { dateStyle: 'long' }) : 'Fecha por confirmar',
          timeLabel: `${sess.durationMinutes} minutos`,
          instructorOrNote: sess.instructorName || 'Docente IPT',
          actionHref: `/live?session=${encodeURIComponent(sess.id)}`,
          actionLabel: 'Entrar a la Sala / Reservar',
        });
      });
    }

    // Tareas reales con fecha límite
    if (Array.isArray(rawAssignments)) {
      rawAssignments.forEach((asg) => {
        list.push({
          id: `asg-${asg.id}`,
          title: `Fecha límite de entrega: ${asg.title}`,
          category: 'assignment_due',
          courseTitle: asg.courseTitle,
          dateLabel: asg.dueDateUtc ? new Date(asg.dueDateUtc).toLocaleDateString('es-CO', { dateStyle: 'long' }) : 'Fecha límite por definir',
          timeLabel: asg.dueDateUtc ? new Date(asg.dueDateUtc).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '23:59',
          instructorOrNote: `Estado: ${asg.status === 'graded' ? 'Calificada' : asg.status === 'submitted' ? 'Entregada' : 'Pendiente'}`,
          actionHref: `/assignments?id=${encodeURIComponent(asg.id)}`,
          actionLabel: 'Ver Tarea y Rúbrica',
        });
      });
    }

    return list;
  }, [rawLiveSessions, rawAssignments]);

  const visibleEvents = useMemo(() => {
    if (filterCategory === 'all') return realEvents;
    return realEvents.filter((e) => e.category === filterCategory);
  }, [realEvents, filterCategory]);

  const handleDownloadCalendar = () => {
    if (visibleEvents.length === 0) return;
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
    <AcademicFeatureGate feature="calendar">
      <div className="min-h-screen bg-[#000000] text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1360px] mx-auto space-y-8">
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ffffff]/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8052ff]/10 border border-[#8052ff]/30 text-[#8052ff] text-xs font-medium mb-3">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Cronograma de Actividades</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
              Calendario de Clases y Entregas
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-2 max-w-2xl">
              Consulta los horarios de clases en vivo y las fechas límite de entrega de proyectos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {visibleEvents.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadCalendar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3ff3] text-xs font-medium text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(128,82,255,0.3)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a Mi Calendario</span>
              </button>
            )}
          </div>
        </div>

        {exportNotice && (
          <div className="p-4 rounded-2xl bg-[#15846e]/15 border border-[#15846e]/40 text-xs text-emerald-300 flex items-center justify-between">
            <span>{exportNotice}</span>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              className="text-[#9a9a9a] hover:text-white"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Todos los eventos' },
            { id: 'live_class', label: 'Clases en Vivo' },
            { id: 'assignment_due', label: 'Fechas Límite de Tareas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-white text-black'
                  : 'bg-[#09090b] text-[#9a9a9a] border border-[#ffffff]/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista de Eventos Reales */}
        {visibleEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#09090b] border border-white/10 space-y-3">
            <CalendarIcon className="w-10 h-10 text-[#9a9a9a] mx-auto opacity-40" />
            <h3 className="text-base font-semibold text-white">No hay actividades programadas</h3>
            <p className="text-xs text-[#9a9a9a] max-w-md mx-auto">
              No hay eventos ni clases en vivo programadas en este momento. El equipo docente publicará las próximas actividades aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-6 rounded-3xl bg-[#09090b] border border-[#ffffff]/10 hover:border-[#ffffff]/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      ev.category === 'live_class'
                        ? 'bg-[#ffb829]/15 text-[#ffb829] border border-[#ffb829]/30'
                        : 'bg-[#8052ff]/15 text-[#8052ff] border border-[#8052ff]/30'
                    }`}
                  >
                    {ev.category === 'live_class' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <FileCheck2 className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono text-[#9a9a9a]">
                        {ev.dateLabel} • {ev.timeLabel}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">{ev.title}</h3>
                    <p className="text-xs text-[#9a9a9a]">
                      {ev.courseTitle} • {ev.instructorOrNote}
                    </p>
                  </div>
                </div>

                <Link
                  href={ev.actionHref}
                  className="px-5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/15 text-xs font-semibold text-white flex items-center gap-2 transition-all self-start md:self-center shrink-0"
                >
                  <span>{ev.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </AcademicFeatureGate>
  );
}
