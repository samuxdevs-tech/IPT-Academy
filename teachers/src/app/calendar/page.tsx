'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Globe,
  Download,
  Upload,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Home,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';
import { CalendarEventCategory } from '@/types';
import {
  SUPPORTED_TIMEZONES,
  formatUtcInTimeZone,
  generateInstitutionalIcsFeed,
} from '@/lib/lmsData';
import { DynamicCalendarEventInputSchema } from '@/lib/lmsSchemas';

export default function AdminCalendarWorkspacePage() {
  const {
    calendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
    createAssignmentAndSyncCalendar,
    courses,
    timeZone,
    setTimeZone,
  } = useLms();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEventCategory>('live_class');
  const [formCourseSlug, setFormCourseSlug] = useState(courses[0]?.slug || 'general');
  const [formDateLocal, setFormDateLocal] = useState(
    new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 16)
  );
  const [formDuration, setFormDuration] = useState(60);
  const [formLocationUrl, setFormLocationUrl] = useState('https://meet.google.com/');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return [...calendarEvents]
      .filter((ev) => {
        if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
        if (selectedCourse !== 'all' && ev.courseSlug !== selectedCourse) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
  }, [calendarEvents, selectedCategory, selectedCourse]);

  const categoryLabel = (cat: CalendarEventCategory) => {
    switch (cat) {
      case 'assignment_due':
        return 'Entrega de tarea';
      case 'exam':
        return 'Evaluación';
      case 'live_class':
        return 'Clase en vivo';
      case 'institutional':
        return 'Aviso general';
      case 'tutoring':
        return 'Asesoría con el profesor';
    }
  };

  const handleExportCalendarFile = () => {
    const icsContent = generateInstitutionalIcsFeed(filteredEvents);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendario-ipt-course.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCalendarNotice(`Calendario exportado con éxito con ${filteredEvents.length} eventos.`);
    setTimeout(() => setCalendarNotice(null), 3500);
  };

  const handleImportCalendarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const summaryMatch = text.match(/SUMMARY:(.+)/i);
      const importedTitle = summaryMatch?.[1]?.trim() || `Sesión importada (${file.name})`;

      createCalendarEvent({
        title: importedTitle,
        description: `Actividad importada desde ${file.name}.`,
        category: 'live_class',
        courseSlug: courses[0]?.slug || 'general',
        courseTitle: courses[0]?.title || 'Curso General',
        startUtc: new Date(Date.now() + 86400 * 1000 * 2).toISOString(),
        endUtc: new Date(Date.now() + 86400 * 1000 * 2 + 3600 * 1000).toISOString(),
        locationOrUrl: 'Sala de videollamada',
        syncedProviders: ['google_calendar', 'outlook', 'apple_calendar'],
        createdByRole: 'instructor',
      });

      setCalendarNotice(`Evento "${importedTitle}" importado y sincronizado en Firebase.`);
      setTimeout(() => setCalendarNotice(null), 3500);
    };
    reader.readAsText(file);
  };

  const handleCreateDynamicEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const courseObj = courses.find((c) => c.slug === formCourseSlug) || courses[0] || {
      slug: 'general',
      title: 'Curso General',
      modules: [],
    };
    const startIso = new Date(formDateLocal).toISOString();

    const parsed = DynamicCalendarEventInputSchema.safeParse({
      title: formTitle.trim(),
      description: formDescription.trim() || 'Sesión programada por la administración de IPT Course.',
      category: formCategory,
      courseSlug: courseObj.slug,
      courseTitle: courseObj.title,
      startUtc: startIso,
      durationMinutes: Number(formDuration),
      locationOrUrl:
        formLocationUrl.trim() ||
        (formCategory === 'assignment_due' ? '/assignments' : 'Sala en vivo'),
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ||
          'Escribe un título y una descripción para programar la sesión.'
      );
      return;
    }

    if (formCategory === 'assignment_due') {
      createAssignmentAndSyncCalendar({
        courseSlug: courseObj.slug,
        courseTitle: courseObj.title,
        moduleTitle: courseObj.modules?.[0]?.title || 'Unidad 1',
        cutId: 'cut_2',
        weightInCutPercent: 50,
        title: parsed.data.title,
        instructions: parsed.data.description,
        dueDateUtc: startIso,
        allowedExtensions: ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.zip'],
        maxFileSizeMb: 50,
        rubric: [
          {
            id: `crit-${Date.now()}`,
            title: 'Presentación completa y clara del ejercicio',
            description: 'El archivo entregado responde a lo solicitado en las instrucciones.',
            weightPercent: 100,
            maxPoints: 5.0,
            levels: [
              { id: 'l-exc', label: 'Muy bien (5.0)', points: 5.0, description: 'Trabajo completo y bien explicado.' },
              { id: 'l-sob', label: 'Bien (4.3)', points: 4.3, description: 'Buen trabajo con detalles menores.' },
              { id: 'l-ace', label: 'Suficiente (3.5)', points: 3.5, description: 'Cumple lo básico.' },
              { id: 'l-ins', label: 'Por mejorar (2.0)', points: 2.0, description: 'Faltan partes por completar.' },
            ],
          },
        ],
      });
    } else {
      const endIso = new Date(
        new Date(startIso).getTime() + parsed.data.durationMinutes * 60000
      ).toISOString();

      createCalendarEvent({
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        courseSlug: parsed.data.courseSlug,
        courseTitle: parsed.data.courseTitle,
        startUtc: startIso,
        endUtc: endIso,
        locationOrUrl: parsed.data.locationOrUrl,
        isPendingDelivery: formCategory === 'exam',
        syncedProviders: ['google_calendar', 'outlook', 'apple_calendar'],
        createdByRole: 'instructor',
      });
    }

    setFormTitle('');
    setFormDescription('');
    setFormSuccess('Fecha publicada y sincronizada en tiempo real con el portal estudiantil.');
    setTimeout(() => setFormSuccess(null), 4000);
  };

  return (
    <div className="flex-1 bg-[#f4f5f9] text-[#2a2b3f] font-sans pb-20">
      {/* Cabecera nativa del Admin Studio */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#595c73] mb-1">
            <Link href="/" className="hover:text-[#2a2b3f] flex items-center gap-1 font-medium">
              <Home className="w-3.5 h-3.5" />
              <span>Panel Principal</span>
            </Link>
            <span>/</span>
            <span className="text-[#2a2b3f] font-semibold">Calendario Académico</span>
          </nav>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d4ed8] block">
            Operación Académica · Programación en Tiempo Real
          </span>
          <h1 className="text-base font-extrabold text-[#2a2b3f]">
            Programador de Calendario, Evaluaciones y Clases en Vivo
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#f6f7f9] border border-[#d1d2e0] rounded-xl px-3 py-1.5 text-xs">
            <Globe className="w-3.5 h-3.5 text-[#1d4ed8]" />
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="bg-transparent font-semibold text-[#2a2b3f] focus:outline-hidden"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCalendarFile}
            className="px-3 py-1.5 rounded-xl border border-[#d1d2e0] bg-white hover:bg-[#f6f7f9] text-xs font-bold text-[#2a2b3f] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#1d4ed8]" />
            <span>Exportar calendario</span>
          </button>

          <label className="px-3 py-1.5 rounded-xl border border-[#d1d2e0] bg-white hover:bg-[#f6f7f9] text-xs font-bold text-[#2a2b3f] inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#6d28d2]" />
            <span>Importar calendario</span>
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={handleImportCalendarFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {calendarNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f0f0f] text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{calendarNotice}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* PANEL 1: PROGRAMAR CLASE EN VIVO, EVALUACIÓN O FECHA DE ENTREGA */}
        <section className="bg-white border border-[#d1d2e0] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[#f0f1f7] pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1d4ed8]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#2a2b3f]">
                Programar Nueva Sesión en Vivo, Evaluación o Fecha Académica
              </h2>
              <p className="text-xs text-[#595c73]">
                Publica una clase en vivo (con enlace de sala), fecha de examen o entrega. Se sincroniza al instante con los estudiantes.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateDynamicEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Título de la sesión o evento
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Clase en Vivo: Resolución de Casos..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] text-xs focus:outline-hidden focus:border-[#1d4ed8]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Tipo de evento
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as CalendarEventCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] bg-white text-xs font-semibold text-[#2a2b3f]"
                >
                  <option value="live_class">Clase en vivo</option>
                  <option value="assignment_due">Entrega de tarea</option>
                  <option value="exam">Evaluación / Examen</option>
                  <option value="tutoring">Asesoría con el profesor</option>
                  <option value="institutional">Aviso general</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Curso asociado
                </label>
                <select
                  value={formCourseSlug}
                  onChange={(e) => setFormCourseSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] bg-white text-xs font-semibold text-[#2a2b3f]"
                >
                  {courses.length === 0 ? (
                    <option value="general">Curso General</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Descripción o tema de la sesión
                </label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explica los temas o requisitos de la sesión..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] text-xs focus:outline-hidden focus:border-[#1d4ed8]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Enlace de videollamada o lugar
                </label>
                <input
                  type="text"
                  value={formLocationUrl}
                  onChange={(e) => setFormLocationUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d2e0] text-xs font-mono focus:outline-hidden focus:border-[#1d4ed8]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Fecha y hora
                </label>
                <input
                  type="datetime-local"
                  value={formDateLocal}
                  onChange={(e) => setFormDateLocal(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#d1d2e0] text-xs"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Minutos
                </label>
                <input
                  type="number"
                  min={15}
                  max={360}
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#d1d2e0] text-xs text-center"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Programar</span>
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}
          </form>
        </section>

        {/* PANEL 2: AGENDA DE EVENTOS PROGRAMADOS */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#1d4ed8]" />
              <h2 className="text-base font-extrabold text-[#2a2b3f]">
                Fechas y Sesiones Programadas ({filteredEvents.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#d1d2e0] rounded-xl text-xs font-semibold text-[#2a2b3f]"
              >
                <option value="all">Todos los tipos</option>
                <option value="live_class">Clases en vivo</option>
                <option value="assignment_due">Entregas de tarea</option>
                <option value="exam">Evaluaciones</option>
                <option value="tutoring">Asesorías</option>
                <option value="institutional">Avisos generales</option>
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#d1d2e0] rounded-xl text-xs font-semibold text-[#2a2b3f]"
              >
                <option value="all">Todos los cursos</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#d1d2e0] p-10 text-center space-y-2">
              <CalendarIcon className="w-10 h-10 text-[#9194ac] mx-auto" />
              <p className="text-sm font-bold text-[#2a2b3f]">
                No hay sesiones ni fechas programadas con ese filtro
              </p>
              <p className="text-xs text-[#595c73]">
                Usa el formulario superior para programar una clase en vivo, evaluación o entrega.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white rounded-2xl border border-[#d1d2e0] p-5 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1d4ed8] border border-blue-200 text-[10px] font-extrabold uppercase">
                        {categoryLabel(ev.category)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar el evento "${ev.title}" del calendario?`)) {
                            deleteCalendarEvent(ev.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#7e8299] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar fecha del calendario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-extrabold text-[#2a2b3f]">{ev.title}</h3>
                    <p className="text-xs text-[#595c73] leading-relaxed">{ev.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#f0f1f7] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#595c73]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#2a2b3f]">
                      <Clock className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      {formatUtcInTimeZone(ev.startUtc, timeZone)}
                    </span>
                    <span className="font-mono text-[10px] text-[#6d28d2] truncate max-w-[200px]">
                      {ev.locationOrUrl}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
