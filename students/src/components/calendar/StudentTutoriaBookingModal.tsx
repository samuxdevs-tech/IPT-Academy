"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Video,
} from "lucide-react";
import { ref, onValue, set, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";

export interface TeacherAvailabilityConfig {
  weeklySlots: Record<
    number,
    { enabled: boolean; start: string; end: string }
  >;
  slotDurationMin: number;
  blockedDates?: string[];
}

const DEFAULT_AVAILABILITY: TeacherAvailabilityConfig = {
  weeklySlots: {
    1: { enabled: true, start: "14:00", end: "18:00" }, // Lunes
    2: { enabled: true, start: "14:00", end: "18:00" }, // Martes
    3: { enabled: true, start: "14:00", end: "18:00" }, // Miércoles
    4: { enabled: true, start: "14:00", end: "18:00" }, // Jueves
    5: { enabled: true, start: "14:00", end: "18:00" }, // Viernes
    6: { enabled: false, start: "10:00", end: "14:00" }, // Sábado
    0: { enabled: false, start: "10:00", end: "14:00" }, // Domingo
  },
  slotDurationMin: 60,
  blockedDates: [],
};

export function StudentTutoriaBookingModal({
  isOpen,
  onClose,
  onBookingSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: () => void;
}) {
  const { user } = useAuth();
  const { entitlements, subscription, openPricingModal } = useSubscription();

  const [availability, setAvailability] = useState<TeacherAvailabilityConfig>(DEFAULT_AVAILABILITY);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [topicReason, setTopicReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar configuración de disponibilidad docente y reservas existentes
  useEffect(() => {
    if (!isOpen) return;

    const availRef = ref(db, "teacher_availability");
    const unsubAvail = onValue(availRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAvailability({
          weeklySlots: val.weeklySlots || DEFAULT_AVAILABILITY.weeklySlots,
          slotDurationMin: val.slotDurationMin || 60,
          blockedDates: val.blockedDates || [],
        });
      }
    });

    const tutoriaRef = ref(db, "tutoria_sessions");
    const unsubTutoria = onValue(tutoriaRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
        setExistingBookings(list);
      } else {
        setExistingBookings([]);
      }
    });

    return () => {
      unsubAvail();
      unsubTutoria();
    };
  }, [isOpen]);

  // Generar días disponibles (próximos 14 días a partir de mañana)
  const availableDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayOfWeek: number;
      dayNum: number;
      monthName: string;
      weekdayShort: string;
      isAvailable: boolean;
    }> = [];

    const now = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split("T")[0];

      const configDay = availability.weeklySlots[dayOfWeek];
      const isBlocked = (availability.blockedDates || []).includes(dateStr);
      const isAvailable = Boolean(configDay && configDay.enabled && !isBlocked);

      days.push({
        dateStr,
        dayOfWeek,
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("es-CO", { month: "short" }),
        weekdayShort: d.toLocaleDateString("es-CO", { weekday: "short" }),
        isAvailable,
      });
    }

    return days;
  }, [availability]);

  // Auto-seleccionar el primer día disponible si no hay seleccionado
  useEffect(() => {
    if (availableDays.length > 0 && !selectedDateStr) {
      const firstActive = availableDays.find((d) => d.isAvailable);
      if (firstActive) {
        setSelectedDateStr(firstActive.dateStr);
      }
    }
  }, [availableDays, selectedDateStr]);

  // Generar ranuras de tiempo para el día seleccionado
  const timeSlotsForSelectedDay = useMemo(() => {
    if (!selectedDateStr) return [];

    const dateObj = new Date(`${selectedDateStr}T12:00:00`);
    const dayOfWeek = dateObj.getDay();
    const configDay = availability.weeklySlots[dayOfWeek];

    if (!configDay || !configDay.enabled) return [];

    const [startH, startM] = configDay.start.split(":").map(Number);
    const [endH, endM] = configDay.end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = availability.slotDurationMin || 60;

    const slots: Array<{
      start: string;
      end: string;
      label: string;
      isBooked: boolean;
    }> = [];

    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const sH = String(Math.floor(m / 60)).padStart(2, "0");
      const sM = String(m % 60).padStart(2, "0");
      const eH = String(Math.floor((m + duration) / 60)).padStart(2, "0");
      const eM = String((m + duration) % 60).padStart(2, "0");

      const startTimeStr = `${sH}:${sM}`;
      const endTimeStr = `${eH}:${eM}`;

      const slotStartIso = new Date(`${selectedDateStr}T${startTimeStr}:00`).toISOString();

      // Verificar si ya está reservado en tutoria_sessions
      const isBooked = existingBookings.some((b) => {
        if (!b || b.status === "cancelled") return false;
        if (!b.startUtc) return false;
        const bDate = new Date(b.startUtc).toISOString();
        return bDate === slotStartIso;
      });

      slots.push({
        start: startTimeStr,
        end: endTimeStr,
        label: `${startTimeStr} – ${endTimeStr}`,
        isBooked,
      });
    }

    return slots;
  }, [selectedDateStr, availability, existingBookings]);

  // Confirmar Cita consumiendo 1 crédito
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedDateStr || !selectedTimeSlot) {
      setErrorMessage("Por favor selecciona una fecha y una hora.");
      return;
    }

    const availableCredits = entitlements?.availableLiveCredits ?? 0;
    if (availableCredits < 1) {
      setErrorMessage("No dispones de créditos de tutoría. Actualiza a Plan Pro+ o solicita créditos a Rectoría.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const startIso = new Date(`${selectedDateStr}T${selectedTimeSlot.start}:00`).toISOString();
      const endIso = new Date(`${selectedDateStr}T${selectedTimeSlot.end}:00`).toISOString();
      const bookingId = `tutoria_${user.uid}_${Date.now()}`;
      const studentName = user.displayName || user.email?.split("@")[0] || "Estudiante";
      const cleanTopic = topicReason.trim() || "Consulta y resolución de dudas técnicas";
      const title = `Tutoría 1-1: ${cleanTopic}`;

      // 1. Guardar en tutoria_sessions
      const tutoriaItem = {
        id: bookingId,
        title,
        description: cleanTopic,
        studentUid: user.uid,
        studentName,
        studentEmail: user.email || "",
        startUtc: startIso,
        endUtc: endIso,
        durationMin: availability.slotDurationMin || 60,
        status: "confirmed",
        confirmedAtUtc: new Date().toISOString(),
        meetingUrl: "/live",
        createdAt: new Date().toISOString(),
      };
      await set(ref(db, `tutoria_sessions/${bookingId}`), tutoriaItem);

      // 2. Guardar en lms_calendar institucional
      const calSnap = await get(ref(db, "lms_calendar"));
      const calList = calSnap.exists()
        ? Array.isArray(calSnap.val())
          ? calSnap.val()
          : Object.values(calSnap.val())
        : [];

      const calendarEvent = {
        id: bookingId,
        title,
        description: cleanTopic,
        category: "tutoring",
        courseSlug: "ipt-master-fullstack",
        courseTitle: "IPT Master: Arquitectura de Software e IA",
        startUtc: startIso,
        endUtc: endIso,
        locationOrUrl: "/live",
        syncedProviders: ["google_calendar"],
        createdByRole: "system",
        status: "confirmed",
        studentUid: user.uid,
        studentName,
        studentEmail: user.email || "",
      };
      await set(ref(db, "lms_calendar"), [...calList, calendarEvent]);

      // 3. Crear sala sincrónica en liveSessions para transmisión inmediata
      const liveSessionItem = {
        id: bookingId,
        courseSlug: "ipt-master-fullstack",
        moduleId: "mod-live",
        title,
        instructorName: "Docente Titular IPT",
        provider: "native_live",
        meetingCode: bookingId.substring(0, 8),
        joinUrl: "/live",
        startTimeUtc: startIso,
        startTime: startIso,
        durationMinutes: availability.slotDurationMin || 60,
        cloudRecordingState: "scheduled",
        autoTranscribed: false,
        attendanceModel: "credits",
        quorumRequired: 1,
        maxCapacity: 1,
        bookedCount: 1,
        studentUid: user.uid,
        studentName,
      };
      await set(ref(db, `liveSessions/${bookingId}`), liveSessionItem);

      // 4. Registrar en lms_live_bookings
      await set(ref(db, `lms_live_bookings/${bookingId}`), {
        id: bookingId,
        sessionId: bookingId,
        studentUid: user.uid,
        userId: user.uid,
        studentName,
        studentEmail: user.email || "",
        creditHash: `sig_credit_${Date.now()}`,
        status: "confirmed",
        bookedAt: new Date().toISOString(),
      });

      // 5. Descontar 1 crédito del balance del estudiante
      const subSnap = await get(ref(db, `lms_subscriptions/${user.uid}`));
      if (subSnap.exists()) {
        const subData = subSnap.val();
        const currentCredits = Number(subData.remainingCredits ?? subData.liveClassCreditsRemaining ?? 1);
        const newCredits = Math.max(0, currentCredits - 1);
        await update(ref(db, `lms_subscriptions/${user.uid}`), {
          remainingCredits: newCredits,
          liveClassCreditsRemaining: newCredits,
          rectoriaCreditsOverride: newCredits,
          creditsConsumedInCycle: (subData.creditsConsumedInCycle || 0) + 1,
          updatedAt: new Date().toISOString(),
        });
      }

      setBookingSuccess({
        id: bookingId,
        title,
        dateFormatted: new Date(startIso).toLocaleDateString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        timeRange: `${selectedTimeSlot.start} – ${selectedTimeSlot.end}`,
      });

      if (onBookingSuccess) onBookingSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el agendamiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Agendar Tutoría 1 a 1 Sincrónica
              </h3>
              <p className="text-[11px] text-zinc-400">
                Selecciona tu horario preferido. Confirmación instantánea (1 Crédito).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Pasos */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {bookingSuccess ? (
            /* Pantalla de Éxito */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">¡Cita Agendada y Confirmada!</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Tu tutoría 1-1 con el docente ha sido confirmada en el calendario y la sala sincrónica está lista.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181822] border border-white/10 max-w-sm mx-auto text-left space-y-2">
                <div className="text-xs font-semibold text-white">{bookingSuccess.title}</div>
                <div className="text-xs text-violet-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="capitalize">{bookingSuccess.dateFormatted}</span> · {bookingSuccess.timeRange}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1 crédito consumido con éxito</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-violet-600/30 cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmBooking} className="space-y-5">
              {/* Saldo de Créditos */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#181822] border border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-zinc-300">Tus Créditos de Tutoría:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-mono">
                    {entitlements?.availableLiveCredits ?? 0} disponibles
                  </span>
                  {(entitlements?.availableLiveCredits ?? 0) < 1 && (
                    <button
                      type="button"
                      onClick={() => openPricingModal("pro_plus")}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                    >
                      Obtener
                    </button>
                  )}
                </div>
              </div>

              {/* Paso 1: Seleccionar Día */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  1. Selecciona el Día
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDays.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      disabled={!d.isAvailable}
                      onClick={() => {
                        setSelectedDateStr(d.dateStr);
                        setSelectedTimeSlot(null);
                      }}
                      className={`flex flex-col items-center justify-center min-w-[62px] py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                        !d.isAvailable
                          ? "opacity-30 border-white/5 bg-transparent cursor-not-allowed"
                          : selectedDateStr === d.dateStr
                          ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30 scale-105"
                          : "bg-[#181822] border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase">{d.weekdayShort}</span>
                      <span className="text-base font-bold my-0.5">{d.dayNum}</span>
                      <span className="text-[9px] opacity-80 uppercase">{d.monthName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: Seleccionar Horario */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  2. Horas Disponibles (60 min)
                </label>
                {timeSlotsForSelectedDay.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">
                    No hay horarios disponibles para la fecha seleccionada.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {timeSlotsForSelectedDay.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          slot.isBooked
                            ? "opacity-30 border-white/5 bg-zinc-950 text-zinc-600 line-through cursor-not-allowed"
                            : selectedTimeSlot?.start === slot.start
                            ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/30"
                            : "bg-[#181822] border-white/5 text-zinc-300 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Paso 3: Tema o Consulta */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  3. Tema o Dudas a Tratar
                </label>
                <input
                  type="text"
                  value={topicReason}
                  onChange={(e) => setTopicReason(e.target.value)}
                  placeholder="Ej: Revisión de arquitectura de microservicios o patrones de dominio..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botón de Confirmación */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !selectedDateStr ||
                    !selectedTimeSlot ||
                    (entitlements?.availableLiveCredits ?? 0) < 1
                  }
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-md shadow-violet-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Confirmando...</span>
                  ) : (
                    <>
                      <span>Confirmar Tutoría 1-1</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
