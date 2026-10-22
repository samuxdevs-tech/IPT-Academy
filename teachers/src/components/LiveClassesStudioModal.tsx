'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Video,
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Radio,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Inbox,
  Filter,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import {
  LiveClassesService,
  LiveClassItem,
  ClassBookingItem,
  CreateLiveClassPayload,
} from '@/services/liveClassesService';
import SafeNavLink from './SafeNavLink';

interface LiveClassesStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'classes' | 'inbox';
}

export default function LiveClassesStudioModal({
  isOpen,
  onClose,
  defaultTab = 'classes',
}: LiveClassesStudioModalProps) {
  const { user } = useAuth();
  const { courses } = useLms();

  const [activeTab, setActiveTab] = useState<'classes' | 'inbox' | 'new_class' | 'refunds'>(defaultTab);
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [bookings, setBookings] = useState<ClassBookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Formulario para nueva clase
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCourseSlug, setFormCourseSlug] = useState(courses[0]?.slug || 'general');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formDuration, setFormDuration] = useState(60);
  const [formMaxCapacity, setFormMaxCapacity] = useState(15);
  const [formAutoApprove, setFormAutoApprove] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);

  // Formulario para Devolución Manual de Cupos (Solo Humanos)
  const [refundStudentUid, setRefundStudentUid] = useState('');
  const [refundAmount, setRefundAmount] = useState(1);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Inicializar fecha por defecto (mañana a las 18:00)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localIso = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setFormScheduledAt(localIso);
  }, []);

  // Cargar clases y reservas
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const classList = await LiveClassesService.fetchClasses(undefined, user?.uid);
      setClasses(classList);

      // Cargar todas las reservas asociadas a las clases del docente
      const allBookings: ClassBookingItem[] = [];
      for (const c of classList) {
        const details = await LiveClassesService.fetchClassDetails(c.id);
        if (details?.bookings) {
          allBookings.push(...details.bookings);
        }
      }
      setBookings(allBookings);
    } catch (err) {
      console.warn('Error cargando datos de clases:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Solicitudes pendientes de confirmación
  const pendingBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchClass = selectedClassId === 'all' || b.class_id === selectedClassId;
      return matchClass && b.status === 'pending_hold';
    });
  }, [bookings, selectedClassId]);

  // Solicitudes confirmadas
  const confirmedBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchClass = selectedClassId === 'all' || b.class_id === selectedClassId;
      return matchClass && b.status === 'confirmed';
    });
  }, [bookings, selectedClassId]);

  // Manejador para aprobar reserva
  const handleApprove = async (bookingId: string) => {
    if (!user?.uid) return;
    try {
      await LiveClassesService.approveBooking(bookingId, user.uid);
      setActionNotice('Reserva aprobada con éxito. El cupo del estudiante ha sido confirmado.');
      loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error al aprobar: ${err.message}`);
    }
  };

  // Manejador para rechazar reserva
  const handleReject = async (bookingId: string) => {
    if (!user?.uid) return;
    const reason = prompt('Motivo del rechazo (opcional):', 'Horario saturado');
    if (reason === null) return;

    try {
      await LiveClassesService.rejectBooking(bookingId, user.uid, reason || 'Horario no disponible');
      setActionNotice('Reserva rechazada. El cupo fue devuelto al balance del estudiante al instante.');
      loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error al rechazar: ${err.message}`);
    }
  };

  // Crear nueva clase
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Ingresa el título de la clase.');
      return;
    }

    const scheduledDate = new Date(formScheduledAt);
    if (scheduledDate.getTime() <= Date.now()) {
      alert('La fecha y hora de la clase debe ser en el futuro.');
      return;
    }

    const selectedCourseObj = courses.find((c) => c.slug === formCourseSlug);

    setCreatingClass(true);
    try {
      const payload: CreateLiveClassPayload = {
        courseSlug: formCourseSlug,
        courseTitle: selectedCourseObj?.title || 'Curso General',
        title: formTitle.trim(),
        description: formDescription.trim(),
        scheduledAtUtc: scheduledDate.toISOString(),
        durationMinutes: formDuration,
        maxCapacity: formMaxCapacity,
        autoApprove: formAutoApprove,
        teacherUid: user?.uid || 'teacher_owner',
        teacherName: user?.displayName || user?.email?.split('@')[0] || 'Docente Titular',
        teacherEmail: user?.email || 'docente@ipt.com',
      };

      await LiveClassesService.createClass(payload);
      setActionNotice('Clase en vivo programada con éxito.');
      setFormTitle('');
      setFormDescription('');
      setActiveTab('classes');
      loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error al programar la clase: ${err.message}`);
    } finally {
      setCreatingClass(false);
    }
  };

  // Manejador para Devolución Manual de Cupos (Solo Humanos)
  const handleManualRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      alert('Debes ser un administrador humano autenticado para devolver cupos.');
      return;
    }
    if (!refundStudentUid.trim() || !refundReason.trim()) {
      alert('Ingresa el correo/UID del estudiante y el motivo justificado.');
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await LiveClassesService.manualRefund({
        studentUid: refundStudentUid.trim(),
        amount: refundAmount,
        reason: refundReason.trim(),
        authorizedByAdminUid: user.displayName || user.email || user.uid,
      });

      setActionNotice(`Devolución completada: ${refundAmount} cupo(s) reintegrados. Nuevo balance: ${res.newBalance}`);
      setRefundStudentUid('');
      setRefundReason('');
      setRefundAmount(1);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      alert(`Error en la devolución: ${err.message}`);
    } finally {
      setProcessingRefund(false);
    }
  };

  // Calcular tiempo restante del TTL
  const formatTtlRemaining = (expiresAtUtc: string) => {
    const expiresMs = new Date(expiresAtUtc).getTime();
    const diffMs = expiresMs - Date.now();

    if (diffMs <= 0) {
      return { text: 'Expirada', isUrgent: true };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return { text: `${hours}h ${minutes}m restantes`, isUrgent: hours < 1 };
    }
    return { text: `${minutes}m restantes`, isUrgent: true };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#f5f5f7] rounded-2xl shadow-2xl border border-[#e5e5ea] flex flex-col overflow-hidden">
        
        {/* Cabecera Apple Studio */}
        <div className="bg-white px-6 py-4 border-b border-[#e5e5ea] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">Estudio de Clases en Vivo</h2>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Motor $0 Embebido</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500">Gestión de sesiones magistrales, aforos y aprobación de cupos con TTL de 4 horas</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notificaciones y Avisos */}
        {actionNotice && (
          <div className="bg-neutral-900 text-white text-xs px-6 py-2.5 flex items-center justify-between transition-all">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Segmented Control / Tabs */}
        <div className="bg-white/80 backdrop-blur px-6 py-2.5 border-b border-[#e5e5ea] flex items-center justify-between">
          <div className="flex items-center p-1 bg-neutral-200/70 rounded-xl space-x-1">
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'classes'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Clases Programadas ({classes.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                activeTab === 'inbox'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Inbox className="w-3.5 h-3.5" />
                <span>Bandeja de Aprobación</span>
                {pendingBookings.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {pendingBookings.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('new_class')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'new_class'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Programar Clase</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('refunds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'refunds'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Devolución de Cupos</span>
              </div>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Contenido Dinámico de las Pestañas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* TAB 1: LISTADO DE CLASES PROGRAMADAS */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              {classes.length === 0 ? (
                <div className="bg-white rounded-xl p-10 border border-[#e5e5ea] text-center">
                  <Video className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-neutral-900">No hay clases en vivo programadas</h3>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 mb-4">
                    Comienza programando una sesión grupal con aforo definido. Tus estudiantes podrán apartar su cupo mensual desde el calendario o conversando con TutorIA.
                  </p>
                  <button
                    onClick={() => setActiveTab('new_class')}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-xl shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Programar Primera Clase</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((cls) => {
                    const scheduledDate = new Date(cls.scheduled_at_utc);
                    const formattedDate = scheduledDate.toLocaleDateString('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const currentBookings = bookings.filter((b) => b.class_id === cls.id && ['pending_hold', 'confirmed'].includes(b.status));
                    const enrolledCount = currentBookings.length;
                    const percentOccupied = Math.min(100, Math.round((enrolledCount / cls.max_capacity) * 100));

                    return (
                      <div
                        key={cls.id}
                        className="bg-white rounded-xl p-5 border border-[#e5e5ea] hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-700 rounded-md">
                              {cls.course_title}
                            </span>
                            <span className="flex items-center space-x-1 text-xs text-neutral-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{formattedDate}</span>
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-neutral-900 leading-snug mb-1">{cls.title}</h3>
                          {cls.description && (
                            <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{cls.description}</p>
                          )}

                          {/* Barra de aforo */}
                          <div className="mt-3 p-3 bg-[#f5f5f7] rounded-xl border border-[#e5e5ea]/80 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 font-medium flex items-center space-x-1">
                                <Users className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Aforo de Alumnos</span>
                              </span>
                              <span className="font-semibold text-neutral-900">
                                {enrolledCount} / {cls.max_capacity} cupos
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  percentOccupied >= 100
                                    ? 'bg-rose-500'
                                    : percentOccupied > 70
                                    ? 'bg-amber-500'
                                    : 'bg-neutral-900'
                                }`}
                                style={{ width: `${percentOccupied}%` }}
                              />
                            </div>
                          </div>

                          {/* Indicadores de configuración */}
                          <div className="mt-3 flex items-center space-x-2 text-[11px] text-neutral-500">
                            {cls.auto_approve === 1 ? (
                              <span className="flex items-center space-x-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Auto-admisión activa</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-amber-700 font-medium">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Requiere tu aprobación (TTL 4h)</span>
                              </span>
                            )}
                            <span>•</span>
                            <span>{cls.duration_minutes} min</span>
                          </div>
                        </div>

                        {/* Botón de acceso a la sala */}
                        <div className="mt-4 pt-3 border-t border-[#e5e5ea] flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setActiveTab('inbox');
                            }}
                            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                          >
                            Ver inscritos ({enrolledCount})
                          </button>

                          <SafeNavLink
                            href={`/live?id=${cls.id}`}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                          >
                            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>Abrir Sala /live</span>
                          </SafeNavLink>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BANDEJA DE APROBACIÓN DE RESERVAS */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              
              {/* Filtro por clase */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#e5e5ea]">
                <div className="flex items-center space-x-2 text-xs text-neutral-600">
                  <Filter className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Filtrar por clase:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-1 text-xs text-neutral-800 font-medium focus:outline-none"
                  >
                    <option value="all">Todas las clases programadas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-neutral-500 font-medium">
                  {pendingBookings.length} solicitud(es) esperando respuesta
                </div>
              </div>

              {/* Lista de Solicitudes Pendientes */}
              {pendingBookings.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-[#e5e5ea] text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-neutral-900">Bandeja al día</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    No tienes reservas pendientes con retención de cupo por aprobar en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((b) => {
                    const cls = classes.find((c) => c.id === b.class_id);
                    const ttl = formatTtlRemaining(b.expires_at_utc);

                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-xl p-4 border border-[#e5e5ea] flex items-center justify-between hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
                            {b.student_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs font-bold text-neutral-900">{b.student_name}</h4>
                              <span className="text-[11px] text-neutral-400">({b.student_email})</span>
                            </div>
                            <p className="text-xs text-neutral-600 mt-0.5">
                              Solicita cupo para: <span className="font-medium text-neutral-900">{cls?.title || 'Clase'}</span>
                            </p>
                            
                            {/* TTL Regresivo del Senior */}
                            <div className="mt-1 flex items-center space-x-1.5">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border flex items-center space-x-1 ${
                                  ttl.isUrgent
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                    : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>TTL para aprobar: {ttl.text}</span>
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                (Si no respondes, el cupo se libera automáticamente)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de Aprobación y Rechazo */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleReject(b.id)}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-700 text-xs font-semibold rounded-lg border border-[#e5e5ea] transition-all flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Rechazar</span>
                          </button>

                          <button
                            onClick={() => handleApprove(b.id)}
                            className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Aprobar Cupo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sección de Confirmados */}
              {confirmedBookings.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[#e5e5ea]">
                  <h4 className="text-xs font-semibold text-neutral-700 mb-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Estudiantes con Cupo Confirmado ({confirmedBookings.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {confirmedBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-neutral-50/80 p-2.5 rounded-lg border border-[#e5e5ea] flex items-center justify-between text-xs"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-neutral-900">{b.student_name}</span>
                          <span className="text-neutral-400 ml-1.5">({b.student_email})</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 rounded-md">
                          Confirmado
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: FORMULARIO DE PROGRAMACIÓN DE CLASE */}
          {activeTab === 'new_class' && (
            <div className="bg-white rounded-xl p-6 border border-[#e5e5ea] max-w-2xl mx-auto">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-neutral-900">Programar Nueva Clase Magistral en Vivo</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Esta sesión se sincronizará automáticamente con el calendario y la bolsa mensual de cupos.
                </p>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Título de la Clase *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Taller Práctico de Ecuaciones Diferenciales"
                    required
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Curso Vinculado</label>
                  <select
                    value={formCourseSlug}
                    onChange={(e) => setFormCourseSlug(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Fecha y Hora de Inicio *</label>
                    <input
                      type="datetime-local"
                      value={formScheduledAt}
                      onChange={(e) => setFormScheduledAt(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Duración (minutos)</label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                      <option value={90}>90 minutos (1.5 horas)</option>
                      <option value={120}>120 minutos (2 horas)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Aforo Máximo de Estudiantes: <span className="font-bold text-neutral-900">{formMaxCapacity}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={formMaxCapacity}
                      onChange={(e) => setFormMaxCapacity(Number(e.target.value))}
                      className="w-full accent-neutral-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>1 alumno (Tutoría)</span>
                      <span>15 (Ideal grupo)</span>
                      <span>50 (Magistral)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl border border-[#e5e5ea]">
                    <div>
                      <span className="block text-xs font-semibold text-neutral-900">Auto-aprobar Alumnos</span>
                      <span className="block text-[11px] text-neutral-500">
                        {formAutoApprove
                          ? 'Cualquier alumno con cupo entra al instante'
                          : 'Requiere que apruebes cada solicitud (TTL 4h)'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formAutoApprove}
                      onChange={(e) => setFormAutoApprove(e.target.checked)}
                      className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Descripción / Temario (Opcional)</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="Temas principales que se abordarán en esta sesión..."
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingClass}
                    className="px-5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    {creatingClass ? (
                      <span>Programando...</span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Confirmar Programación</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: DEVOLUCIÓN MANUAL DE CUPOS (ESTRICTAMENTE HUMANO) */}
          {activeTab === 'refunds' && (
            <div className="bg-white rounded-xl p-6 border border-[#e5e5ea] max-w-2xl mx-auto space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#e5e5ea]">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Devolución Manual de Cupos (Solo Humanos)</h3>
                  <p className="text-xs text-neutral-500">
                    Operación protegida. La IA (TutorIA) no tiene permiso para devolver cupos.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Política Estricta de Integridad Financiera</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Toda devolución queda auditada de forma inmutable en el Libro Mayor (`quota_ledger`) vinculada a tu firma de administrador humano. Úsalo para reposiciones por fallas técnicas justificadas o excusas médicas.
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualRefund} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Correo o UID del Estudiante *
                  </label>
                  <input
                    type="text"
                    value={refundStudentUid}
                    onChange={(e) => setRefundStudentUid(e.target.value)}
                    placeholder="ejemplo@correo.com o student_uid"
                    required
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Cantidad de Cupos a Devolver *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Motivo Justificado de la Devolución (Obligatorio) *
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    placeholder="Describe por qué se autoriza la reposición (ej: Falla de energía eléctrica verificada en la zona)..."
                    required
                    className="w-full px-3 py-2 text-xs bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processingRefund}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    {processingRefund ? (
                      <span>Procesando en Ledger...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Autorizar Devolución Manual</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer Informativo */}
        <div className="bg-white px-6 py-3 border-t border-[#e5e5ea] flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Regla de Cancelación: Reembolso automático si el alumno cancela con &gt; 2 horas.</span>
          </div>
          <span>IPT Course Live Studio • Clase AA+</span>
        </div>

      </div>
    </div>
  );
}
