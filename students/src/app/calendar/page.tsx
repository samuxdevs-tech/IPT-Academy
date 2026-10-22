'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Globe,
  Download,
  Upload,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Home,
  Video,
  Radio,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  LiveStudentService,
  StudentLiveClassItem,
  StudentBookingInfo,
} from '@/services/liveStudentService';
import { useLms } from '@/context/LmsContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarEventCategory } from '@/types';
import {
  SUPPORTED_TIMEZONES,
  formatUtcInTimeZone,
  generateInstitutionalIcsFeed,
  getTimeZoneOffsetLabel,
} from '@/lib/lmsData';
import { DynamicCalendarEventInputSchema } from '@/lib/lmsSchemas';

export default function InstitutionalCalendarPage() {
  const {
    calendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
    createAssignmentAndSyncCalendar,
    courses,
    timeZone,
    setTimeZone,
  } = useLms();
  const { user, effectiveIsAdmin } = useAuth();

  const [liveClasses, setLiveClasses] = useState<StudentLiveClassItem[]>([]);
  const [availableQuota, setAvailableQuota] = useState<number>(4);
  const [myBookings, setMyBookings] = useState<StudentBookingInfo[]>([]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  React.useEffect(() => {
    LiveStudentService.fetchAvailableClasses().then(setLiveClasses);
    if (user?.uid) {
      LiveStudentService.getStudentQuota(user.uid).then((q) => setAvailableQuota(q.availableQuota));
      setMyBookings(LiveStudentService.getLocalStudentBookings());
    }
  }, [user]);

  const handleBookLiveClass = async (classId: string) => {
    if (!user?.uid) {
      alert('Inicia sesión para apartar tu clase.');
      return;
    }
    setBookingLoading(classId);
    try {
      const booking = await LiveStudentService.requestBooking({
        classId,
        studentUid: user.uid,
        studentName: user.displayName || user.email?.split('@')[0] || 'Estudiante',
        studentEmail: user.email || 'estudiante@ipt.com',
      });
      setMyBookings((prev) => [booking, ...prev]);
      setAvailableQuota((prev) => Math.max(0, prev - 1));
      setCalendarNotice('¡Cupo reservado con éxito! Se ha retenido temporalmente de tu saldo mensual.');
      setTimeout(() => setCalendarNotice(null), 4500);
    } catch (err: any) {
      alert(err.message || 'No se pudo reservar.');
    } finally {
      setBookingLoading(null);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [onlyPendingDeliveries, setOnlyPendingDeliveries] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');

  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEventCategory>('assignment_due');
  const [formCourseSlug, setFormCourseSlug] = useState(courses[0]?.slug || 'general');
  const [formDateLocal, setFormDateLocal] = useState(
    new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 16)
  );
  const [formDuration, setFormDuration] = useState(60);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return [...calendarEvents]
      .filter((ev) => {
        if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
        if (selectedCourse !== 'all' && ev.courseSlug !== selectedCourse) return false;
        if (onlyPendingDeliveries && !ev.isPendingDelivery) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
  }, [calendarEvents, selectedCategory, selectedCourse, onlyPendingDeliveries]);

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => new Date());

  const monthData = useMemo(() => {
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Lunes = 0, Domingo = 6
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const monthLabel = selectedMonthDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });

    const days: Array<{
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateKey: string;
    }> = [];

    // Días del mes anterior para rellenar la primera fila
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        dateKey: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;
      days.push({
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Días del mes siguiente para completar la cuadrícula (múltiplo de 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        dateKey: `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    return {
      year,
      month,
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      days,
    };
  }, [selectedMonthDate]);

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
    a.download = 'mis-clases-y-entregas.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCalendarNotice(
      `Se descargó el archivo "mis-clases-y-entregas.ics" con ${filteredEvents.length} fechas. Ábrelo en tu celular o computador para guardarlo en tu calendario.`
    );
  };

  const handleImportCalendarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const summaryMatch = text.match(/SUMMARY:(.+)/i);
      const importedTitle = summaryMatch?.[1]?.trim() || `Actividad agregada (${file.name})`;

      createCalendarEvent({
        title: importedTitle,
        description: `Actividad cargada desde el archivo ${file.name}.`,
        category: 'tutoring',
        courseSlug: courses[0]?.slug || 'general',
        courseTitle: courses[0]?.title || 'Curso General',
        startUtc: new Date(Date.now() + 86400 * 1000 * 2).toISOString(),
        endUtc: new Date(Date.now() + 86400 * 1000 * 2 + 3600 * 1000).toISOString(),
        locationOrUrl: 'Agregado al calendario',
        syncedProviders: ['google_calendar', 'outlook', 'apple_calendar'],
        createdByRole: 'instructor',
      });

      setCalendarNotice(
        `Se agregó "${importedTitle}" a la lista de fechas sincronizada.`
      );
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
      description: formDescription.trim(),
      category: formCategory,
      courseSlug: courseObj.slug,
      courseTitle: courseObj.title,
      startUtc: startIso,
      durationMinutes: Number(formDuration),
      locationOrUrl:
        formCategory === 'assignment_due' || formCategory === 'exam'
          ? '/assignments'
          : 'Reunión por videollamada',
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ||
          'Por favor escribe un título y una breve explicación de la actividad.'
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
    setFormSuccess(
      'La nueva fecha quedó guardada en Firebase y sincronizada en el calendario.'
    );
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedCourse('all');
    setOnlyPendingDeliveries(false);
  };

  return (
    <div className="flex-1 bg-[#ffffff] text-[#0f0f0f]">
      <main id="main-content" className="max-w-[1300px] mx-auto py-5 px-4 lg:px-6 space-y-6">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[#606060]">
          <Link href="/" className="hover:text-[#0f0f0f] flex items-center gap-1 font-medium">
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </Link>
          <span>/</span>
          <span className="text-[#0f0f0f] font-semibold">Calendario de Clases</span>
        </nav>

        {/* Cabecera del Calendario */}
        <section className="bg-[#ffffff] rounded-2xl border border-[#e5e5e5] p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl lg:text-2xl font-bold text-[#0f0f0f] leading-snug">
                Calendario de Clases, Tareas y Evaluaciones
              </h1>
              <p className="text-xs text-[#606060]">
                Aquí puedes ver todas las fechas importantes del curso y guardarlas en tu teléfono o computador.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCalendarFile}
                disabled={filteredEvents.length === 0}
                className="btn-outline-violet !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Guardar en mi celular o computador</span>
              </button>

              {effectiveIsAdmin && (
                <label className="btn-ghost-neutral !py-2 !px-3.5 !text-[13px] inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#6d28d2]" />
                  <span>Cargar archivo de fechas</span>
                  <input
                    id="import-calendar-file"
                    name="import-calendar-file"
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={handleImportCalendarFile}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          </div>

          {calendarNotice && (
            <div
              role="status"
              className="p-4 rounded-[8px] bg-[#f6f7f9] border border-[#6d28d2] text-[14px] text-[#2a2b3f] flex items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#6d28d2] shrink-0" />
                <span>{calendarNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCalendarNotice(null)}
                className="text-[12px] font-medium text-[#6d28d2] hover:underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Módulo de Clases Magistrales en Vivo & Cupos del Estudiante (Fase 4) */}
          <section className="bg-white rounded-[16px] border border-[#d1d2e0] p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f1f7] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Video className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#1d1d1f]">Clases Magistrales en Vivo</h2>
                  <p className="text-[12px] text-[#595c73]">
                    Sesiones en tiempo real con tu docente titular.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#f6f7f9] border border-[#e5e5ea] px-3 py-1.5 rounded-xl text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[#595c73]">Cupos mensuales disponibles:</span>
                <strong className="text-[#1d1d1f] font-bold">{availableQuota}</strong>
              </div>
            </div>

            {liveClasses.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8e8e93] bg-[#fbfbfd] rounded-xl border border-[#e5e5ea]">
                No hay clases en vivo programadas para esta semana. Tu docente publicará las próximas fechas aquí.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {liveClasses.map((cls) => {
                  const isBooked = myBookings.some((b) => b.classId === cls.id);
                  const scheduledDate = new Date(cls.scheduled_at_utc);
                  const formatted = scheduledDate.toLocaleDateString('es-CO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={cls.id}
                      className="p-4 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] hover:bg-white transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold px-2 py-0.5 bg-neutral-100 rounded text-neutral-700">
                            {cls.course_title}
                          </span>
                          <span className="text-neutral-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            {formatted}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-[#1d1d1f]">{cls.title}</h3>
                        {cls.description && (
                          <p className="text-[11px] text-[#595c73] line-clamp-2 mt-0.5">{cls.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#f0f1f7] flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500">
                          Docente: <strong className="text-neutral-800">{cls.teacher_name}</strong>
                        </span>

                        {isBooked ? (
                          <Link
                            href={`/live?id=${cls.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-black transition-all"
                          >
                            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                            <span>Entrar a /live</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBookLiveClass(cls.id)}
                            disabled={bookingLoading === cls.id || availableQuota <= 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-xs font-semibold hover:bg-[#0077ed] transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{bookingLoading === cls.id ? 'Apartando...' : 'Apartar Cupo'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Selector de hora según el país */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-[#f6f7f9] rounded-[12px] border border-[#d1d2e0] p-4">
            <div className="lg:col-span-7 space-y-1">
              <div className="flex items-center gap-2 text-[14px] font-medium text-[#2a2b3f]">
                <Globe className="w-4 h-4 text-[#6d28d2]" />
                <span>
                  Horario actual mostrado:{' '}
                  <strong className="text-[#6d28d2]">{getTimeZoneOffsetLabel(timeZone)}</strong>
                </span>
              </div>
              <p className="text-[13px] text-[#595c73]">
                Si vives o viajas a otro país, cámbialo a la derecha y todas las horas se actualizarán solas.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
              <label htmlFor="calendar-tz-select" className="text-[13px] text-[#595c73]">
                Cambiar país:
              </label>
              <select
                id="calendar-tz-select"
                name="calendar-tz-select"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                aria-label="Cambiar el horario según tu país"
                className="ipt-input !py-2 !px-3 !text-[13px] font-medium"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="text-[14px] text-[#2a2b3f]">
            <summary className="font-medium cursor-pointer flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#6d28d2] shrink-0" />
              <span>¿Cómo paso estas fechas al calendario de mi teléfono o correo?</span>
            </summary>
            <p className="mt-2 text-[#595c73] leading-[1.6] pl-6">
              Presiona el botón <strong>“Guardar en mi celular o computador”</strong> que está arriba a la derecha. Se descargará un archivo llamado <em>mis-clases-y-entregas.ics</em>. Al abrirlo, tu agenda de Google, Outlook o iPhone agregará todos los recordatorios.
            </p>
          </details>
        </section>

        {/* Lista de Fechas + Formulario Admin */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Principal: Fechas programadas */}
          <div className={`${effectiveIsAdmin ? 'lg:col-span-7' : 'lg:col-span-12'} bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eaf2] pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#6d28d2]" />
                <h2 className="text-[18px] font-bold text-[#2a2b3f]">
                  Fechas programadas ({filteredEvents.length})
                </h2>
              </div>

              <div className="inline-flex rounded-[8px] border border-[#d1d2e0] p-0.5 bg-[#f6f7f9]">
                <button
                  type="button"
                  onClick={() => setViewMode('agenda')}
                  className={`px-3 py-1 rounded-[6px] text-[13px] font-medium cursor-pointer ${
                    viewMode === 'agenda'
                      ? 'bg-[#ffffff] text-[#6d28d2] border border-[#6d28d2]'
                      : 'text-[#595c73]'
                  }`}
                >
                  Ver como lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded-[6px] text-[13px] font-medium cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-[#ffffff] text-[#6d28d2] border border-[#6d28d2]'
                      : 'text-[#595c73]'
                  }`}
                >
                  Ver por días del mes
                </button>
              </div>
            </div>

            {/* Botones sencillos para filtrar */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'Ver todo' },
                  { id: 'assignment_due', label: 'Tareas' },
                  { id: 'exam', label: 'Evaluaciones' },
                  { id: 'live_class', label: 'Clases en vivo' },
                  { id: 'tutoring', label: 'Asesorías' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-[1000px] text-[13px] font-medium border cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'border-[1.5px] border-[#6d28d2] text-[#6d28d2] bg-[#c0c4fc]/15'
                      : 'border-[#d1d2e0] text-[#2a2b3f] bg-[#ffffff]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="filter-course-select" className="text-[13px] text-[#595c73]">
                  Curso:
                </label>
                <select
                  id="filter-course-select"
                  name="filter-course-select"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  aria-label="Filtrar fechas por curso"
                  className="ipt-input !py-1.5 !px-3 !text-[13px]"
                >
                  <option value="all">Todos los cursos</option>
                  {courses.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2a2b3f] cursor-pointer">
                <input
                  id="only-pending-checkbox"
                  name="only-pending-checkbox"
                  type="checkbox"
                  checked={onlyPendingDeliveries}
                  onChange={(e) => setOnlyPendingDeliveries(e.target.checked)}
                  className="accent-[#6d28d2] w-4 h-4"
                />
                <span>Ver solo lo que falta por entregar</span>
              </label>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="p-8 rounded-[12px] bg-[#f6f7f9] border border-[#d1d2e0] text-center space-y-2">
                <p className="text-[15px] font-medium text-[#2a2b3f]">
                  Aún no hay fechas ni eventos programados en el calendario
                </p>
                <p className="text-[13px] text-[#595c73]">
                  {effectiveIsAdmin
                    ? 'Usa el formulario de la derecha para publicar tareas, exámenes o clases en vivo.'
                    : 'Cuando el profesor publique fechas o tareas aparecerán aquí.'}
                </p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-6 rounded-[12px] bg-[#f6f7f9] border border-[#d1d2e0] text-center space-y-3">
                <p className="text-[14px] text-[#2a2b3f]">
                  No hay actividades que coincidan con este filtro.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-outline-violet !py-2 !px-4 !text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Mostrar todas las fechas</span>
                </button>
              </div>
            ) : viewMode === 'agenda' ? (
              <div className="divide-y divide-[#e9eaf2]">
                {filteredEvents.map((ev) => (
                  <div key={ev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            ev.isPendingDelivery ? 'ipt-badge-ember' : 'ipt-badge-violet'
                          }
                        >
                          {categoryLabel(ev.category)}
                        </span>
                        <span className="text-[12px] text-[#595c73]">{ev.courseTitle}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <time
                          dateTime={ev.startUtc}
                          className="text-[13px] font-medium text-[#2a2b3f] tabular-nums inline-flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#6d28d2]" />
                          <span>{formatUtcInTimeZone(ev.startUtc, timeZone)}</span>
                        </time>
                        {effectiveIsAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar esta fecha "${ev.title}" del calendario?`)) {
                                deleteCalendarEvent(ev.id);
                              }
                            }}
                            className="p-1 text-[#595c73] hover:text-[#c4710d] cursor-pointer"
                            title="Eliminar esta fecha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-[16px] font-medium text-[#2a2b3f]">{ev.title}</h3>
                    <p className="text-[14px] text-[#595c73] leading-[1.5]">{ev.description}</p>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-[13px]">
                      {ev.linkedAssignmentId ? (
                        <Link
                          href={`/assignments?id=${ev.linkedAssignmentId}`}
                          className="font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Abrir esta tarea</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : ev.locationOrUrl.startsWith('http') ? (
                        <a
                          href={ev.locationOrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#6d28d2] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Entrar a la videollamada</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-[#595c73]">{ev.locationOrUrl}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vista por días del mes */
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] font-medium text-[#2a2b3f]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0f0f0f]">{monthData.monthLabel}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMonthDate(new Date(monthData.year, monthData.month - 1, 1))
                        }
                        className="p-1 rounded-md hover:bg-[#f0f0f0] text-[#595c73] hover:text-[#0f0f0f] transition-colors cursor-pointer"
                        title="Mes anterior"
                        aria-label="Mes anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMonthDate(new Date())}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-[#d1d2e0] hover:bg-[#f0f0f0] text-[#2a2b3f] transition-colors cursor-pointer"
                        title="Ir al mes actual"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMonthDate(new Date(monthData.year, monthData.month + 1, 1))
                        }
                        className="p-1 rounded-md hover:bg-[#f0f0f0] text-[#595c73] hover:text-[#0f0f0f] transition-colors cursor-pointer"
                        title="Mes siguiente"
                        aria-label="Mes siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <span className="text-[12px] text-[#595c73]">
                    {getTimeZoneOffsetLabel(timeZone)}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-semibold text-[#595c73]">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 tabular-nums">
                  {monthData.days.map((item, idx) => {
                    const dayEvents = item.isCurrentMonth
                      ? filteredEvents.filter((ev) => {
                          const evDate = new Date(ev.startUtc);
                          return (
                            evDate.getFullYear() === monthData.year &&
                            evDate.getMonth() === monthData.month &&
                            evDate.getDate() === item.dayNum
                          );
                        })
                      : [];

                    return (
                      <div
                        key={`${item.dateKey}-${idx}`}
                        className={`min-h-[88px] p-2 rounded-[8px] border text-left flex flex-col justify-between transition-colors ${
                          !item.isCurrentMonth
                            ? 'border-[#f0f0f0] bg-[#fafafa] opacity-40'
                            : item.isToday
                            ? 'border-[#6d28d2] bg-[#6d28d2]/[0.05] ring-1 ring-[#6d28d2]'
                            : dayEvents.length > 0
                            ? 'border-[#6d28d2]/60 bg-[#f6f7f9]'
                            : 'border-[#e9eaf2] bg-[#ffffff]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[12px] font-semibold ${
                              item.isToday
                                ? 'text-[#6d28d2] font-bold'
                                : item.isCurrentMonth
                                ? 'text-[#2a2b3f]'
                                : 'text-[#8e90a6]'
                            }`}
                          >
                            {item.dayNum}
                          </span>
                          {item.isToday && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-[#6d28d2] text-white rounded">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className="text-[11px] leading-tight text-[#6d28d2] font-medium truncate"
                              title={`${ev.title} (${categoryLabel(ev.category)})`}
                            >
                              • {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-[#595c73] font-semibold block">
                              +{dayEvents.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario exclusivo de Administración para agregar fechas o tareas */}
          {effectiveIsAdmin && (
            <aside className="lg:col-span-5 bg-[#ffffff] rounded-[16px] border border-[#d1d2e0] p-6 space-y-5">
              <div className="border-b border-[#e9eaf2] pb-4 space-y-1">
                <h2 className="text-[18px] font-bold text-[#2a2b3f] flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#6d28d2]" />
                  <span>Agregar una nueva fecha o tarea</span>
                </h2>
                <p className="text-[14px] text-[#595c73]">
                  Se sincroniza inmediatamente en Firebase para todos los estudiantes.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-[8px] border border-[#c4710d] bg-[#c4710d]/10 text-[13px] text-[#2a2b3f] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#c4710d] shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div
                  role="status"
                  className="p-3 rounded-[8px] border border-[#6d28d2] bg-[#f6f7f9] text-[13px] text-[#2a2b3f] flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#6d28d2] shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateDynamicEvent} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="ev-type" className="block text-[13px] font-medium text-[#2a2b3f]">
                    ¿Qué tipo de actividad es?
                  </label>
                  <select
                    id="ev-type"
                    name="ev-type"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CalendarEventCategory)}
                    className="ipt-input w-full !py-2 !text-[14px]"
                  >
                    <option value="assignment_due">Nueva tarea para entregar</option>
                    <option value="exam">Evaluación o examen</option>
                    <option value="tutoring">Asesoría con el profesor</option>
                    <option value="institutional">Aviso general del curso</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ev-course" className="block text-[13px] font-medium text-[#2a2b3f]">
                    ¿Para qué curso es?
                  </label>
                  <select
                    id="ev-course"
                    name="ev-course"
                    value={formCourseSlug}
                    onChange={(e) => setFormCourseSlug(e.target.value)}
                    className="ipt-input w-full !py-2 !text-[14px]"
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

                <div className="space-y-1">
                  <label htmlFor="ev-title" className="block text-[13px] font-medium text-[#2a2b3f]">
                    Nombre de la actividad
                  </label>
                  <input
                    id="ev-title"
                    name="ev-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Por ejemplo: Entrega de tarea..."
                    className="ipt-input w-full !py-2 !text-[14px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="ev-date" className="block text-[13px] font-medium text-[#2a2b3f]">
                      Fecha y hora
                    </label>
                    <input
                      id="ev-date"
                      name="ev-date"
                      type="datetime-local"
                      value={formDateLocal}
                      onChange={(e) => setFormDateLocal(e.target.value)}
                      className="ipt-input w-full !py-2 !text-[13px] tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ev-dur" className="block text-[13px] font-medium text-[#2a2b3f]">
                      Duración (en minutos)
                    </label>
                    <input
                      id="ev-dur"
                      name="ev-dur"
                      type="number"
                      min={15}
                      max={480}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="ipt-input w-full !py-2 !text-[13px] tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ev-desc" className="block text-[13px] font-medium text-[#2a2b3f]">
                    Explicación o instrucciones
                  </label>
                  <textarea
                    id="ev-desc"
                    name="ev-desc"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Escribe aquí qué deben hacer o tener en cuenta los estudiantes..."
                    className="ipt-input w-full !text-[14px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="btn-outline-violet flex-1 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Guardar en el calendario</span>
                  </button>
                  {(formTitle || formDescription) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormTitle('');
                        setFormDescription('');
                        setFormError(null);
                      }}
                      className="btn-ghost-neutral !py-2.5 !px-3.5 !text-[13px] cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </form>
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
