"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Check,
  CalendarClock,
  Video,
  AlertCircle,
  UserCheck,
  Edit3,
  X,
  ChevronRight,
  BookOpen,
  Send,
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, get, update, remove } from "firebase/database";

export interface InstitutionalCalendarEvent {
  id: string;
  title: string;
  description: string;
  category: "assignment_due" | "exam" | "live_class" | "institutional" | "tutoring";
  courseSlug: string;
  courseTitle: string;
  startUtc: string;
  endUtc: string;
  locationOrUrl: string;
  linkedAssignmentId?: string;
  syncedProviders: Array<"google_calendar" | "outlook" | "apple_calendar">;
  createdByRole: "instructor" | "admin" | "system";
  attendanceModel?: "quorum" | "credits" | "hybrid";
  quorumRequired?: number;
  maxCapacity?: number;
  bookedCount?: number;
  status?: "pending_teacher_approval" | "requested" | "confirmed" | "completed" | "cancelled";
  completed?: boolean;
  studentUid?: string;
  studentName?: string;
  studentEmail?: string;
  rescheduledByTeacher?: boolean;
  completedAtUtc?: string;
}

interface StudentOption {
  uid: string;
  name: string;
  email: string;
}

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

export function TeacherCalendarView({
  onOpenTutoriaDirectives,
  onNavigateToLive,
}: {
  onOpenTutoriaDirectives: () => void;
  onNavigateToLive?: () => void;
}) {
  const [events, setEvents] = useState<InstitutionalCalendarEvent[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal para crear evento / agendar
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newCategory, setNewCategory] =
    useState<InstitutionalCalendarEvent["category"]>("live_class");
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("10:00");
  const [newDurationMin, setNewDurationMin] = useState<number>(60);
  const [newLocation, setNewLocation] = useState<string>("");
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>("");
  const [attendanceModel, setAttendanceModel] = useState<"quorum" | "credits" | "hybrid">(
    "hybrid"
  );
  const [quorumRequired, setQuorumRequired] = useState<number>(3);
  const [maxCapacity, setMaxCapacity] = useState<number>(25);

  // Modal para fijar/cambiar horas de clase
  const [reschedulingEvent, setReschedulingEvent] = useState<InstitutionalCalendarEvent | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleDurationMin, setRescheduleDurationMin] = useState<number>(60);

  // Modal para configurar disponibilidad semanal del docente
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<boolean>(false);
  const [availability, setAvailability] = useState<TeacherAvailabilityConfig>(DEFAULT_AVAILABILITY);
  const [newBlockedDate, setNewBlockedDate] = useState<string>("");

  const activeCourseSlug = "ipt-master-fullstack";

  // Sincronización en tiempo real con Firebase RTDB (lms_calendar y tutoria_sessions)
  useEffect(() => {
    const calRef = ref(rtdb, "lms_calendar");
    const tutoriaRef = ref(rtdb, "tutoria_sessions");
    const usersRef = ref(rtdb, "users");

    let rawCal: any[] = [];
    let rawTutoria: Record<string, any> = {};

    const mergeAndSet = () => {
      const eventMap = new Map<string, InstitutionalCalendarEvent>();

      // 1. Cargar desde lms_calendar
      for (const item of rawCal) {
        if (!item || !item.id) continue;
        eventMap.set(item.id, {
          ...item,
          status: item.completed ? "completed" : item.status || "confirmed",
          completed: Boolean(item.completed || item.status === "completed"),
        });
      }

      // 2. Fusionar con tutoria_sessions
      for (const [tId, tVal] of Object.entries(rawTutoria)) {
        if (!tVal) continue;
        const existing = eventMap.get(tId);
        if (existing) {
          eventMap.set(tId, {
            ...existing,
            status: tVal.status || existing.status || "confirmed",
            studentName: tVal.studentName || existing.studentName,
            studentUid: tVal.studentUid || existing.studentUid,
            completed: Boolean(tVal.completed || existing.completed),
          });
        } else {
          // Nueva tutoría 1-1 sincronizada desde el subsistema
          const startUtc = tVal.startUtc || tVal.scheduledAt || new Date().toISOString();
          const endUtc =
            tVal.endUtc ||
            new Date(new Date(startUtc).getTime() + (tVal.durationMin || 60) * 60000).toISOString();
          eventMap.set(tId, {
            id: tId,
            title: tVal.title || `Tutoría 1-1 con ${tVal.studentName || "Estudiante"}`,
            description:
              tVal.description ||
              `Sesión individual de tutoría sincrónica solicitada por ${tVal.studentName || "estudiante"}.`,
            category: "tutoring",
            courseSlug: tVal.courseSlug || activeCourseSlug,
            courseTitle: "IPT Master: Arquitectura de Software e IA",
            startUtc,
            endUtc,
            locationOrUrl: tVal.meetingUrl || "/live",
            syncedProviders: ["google_calendar"],
            createdByRole: "instructor",
            status: tVal.status || "pending_teacher_approval",
            completed: Boolean(tVal.completed),
            studentUid: tVal.studentUid,
            studentName: tVal.studentName,
            studentEmail: tVal.studentEmail,
          });
        }
      }

      const list = Array.from(eventMap.values()).sort(
        (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
      );
      setEvents(list);
      setLoading(false);
    };

    const unsubCal = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        rawCal = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
      } else {
        rawCal = [];
      }
      mergeAndSet();
    });

    const unsubTutoria = onValue(tutoriaRef, (snap) => {
      if (snap.exists()) {
        rawTutoria = snap.val() || {};
      } else {
        rawTutoria = {};
      }
      mergeAndSet();
    });

    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const uVal = snap.val();
        const stdList: StudentOption[] = [];
        for (const [uid, uData] of Object.entries(uVal as Record<string, any>)) {
          if (!uData) continue;
          const prof = uData.profile || {};
          const consent = uData.legalConsent || {};
          const email = (prof.email || uData.email || consent.email || "").trim();
          if (
            email.toLowerCase().includes("docente@") ||
            email.toLowerCase().includes("rectoria@") ||
            email.toLowerCase().includes("administrator@")
          ) {
            continue;
          }
          const name = prof.displayName || uData.displayName || uData.name || email.split("@")[0] || "Estudiante";
          stdList.push({ uid, name, email });
        }
        setStudents(stdList);
      }
    });

    const availRef = ref(rtdb, "teacher_availability");
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

    return () => {
      unsubCal();
      unsubTutoria();
      unsubUsers();
      unsubAvail();
    };
  }, []);

  // 1. Aceptar Clase o Tutoría Pendiente
  const handleAcceptClass = async (evt: InstitutionalCalendarEvent) => {
    try {
      const updatedEvent: InstitutionalCalendarEvent = {
        ...evt,
        status: "confirmed",
      };

      // Actualizar en lms_calendar
      const updatedList = events.map((e) => (e.id === evt.id ? updatedEvent : e));
      await set(ref(rtdb, "lms_calendar"), updatedList);

      // Sincronizar en tutoria_sessions
      await update(ref(rtdb, `tutoria_sessions/${evt.id}`), {
        status: "confirmed",
        confirmedAtUtc: new Date().toISOString(),
        title: evt.title,
        startUtc: evt.startUtc,
        endUtc: evt.endUtc,
        studentUid: evt.studentUid || "",
        studentName: evt.studentName || "",
      });

      // Sincronizar en lms_live_sessions para que aparezca en el estudio en vivo y en la vista del alumno
      const liveSessionItem = {
        id: evt.id,
        courseSlug: evt.courseSlug || activeCourseSlug,
        moduleId: "mod-live",
        title: evt.title,
        instructorName: "Docente Titular IPT",
        provider: "native_live",
        meetingCode: evt.id.substring(0, 8),
        joinUrl: evt.locationOrUrl || "/live",
        startTimeUtc: evt.startUtc,
        startTime: evt.startUtc,
        durationMinutes: 60,
        cloudRecordingState: "scheduled",
        autoTranscribed: false,
        attendanceModel: evt.attendanceModel || "hybrid",
        quorumRequired: evt.quorumRequired || 1,
        maxCapacity: evt.maxCapacity || 25,
        bookedCount: evt.bookedCount || 1,
        studentUid: evt.studentUid || "",
        studentName: evt.studentName || "",
      };
      await set(ref(rtdb, `liveSessions/${evt.id}`), liveSessionItem);

      // Sincronizar en bookings si está asociado
      await update(ref(rtdb, `lms_live_bookings/${evt.id}`), {
        status: "confirmed",
      }).catch(() => {});

      setToastMessage(`¡Clase "${evt.title}" aceptada y confirmada en el calendario!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert("Error al confirmar la clase en el calendario.");
    }
  };

  // 2. Abrir Modal para Fijar Horas de Clase
  const handleOpenRescheduleModal = (evt: InstitutionalCalendarEvent) => {
    setReschedulingEvent(evt);
    const d = new Date(evt.startUtc);
    const dateStr = d.toISOString().split("T")[0];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setRescheduleDate(dateStr);
    setRescheduleTime(`${hours}:${minutes}`);

    const duration = evt.endUtc
      ? Math.max(15, Math.round((new Date(evt.endUtc).getTime() - d.getTime()) / 60000))
      : 60;
    setRescheduleDurationMin(duration);
  };

  // 3. Guardar Nueva Hora Fijada para la Clase
  const handleSaveRescheduledTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingEvent || !rescheduleDate || !rescheduleTime) return;

    try {
      const startIso = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      const endIso = new Date(
        new Date(startIso).getTime() + rescheduleDurationMin * 60000
      ).toISOString();

      const updatedEvt: InstitutionalCalendarEvent = {
        ...reschedulingEvent,
        startUtc: startIso,
        endUtc: endIso,
        status: "confirmed",
        rescheduledByTeacher: true,
      };

      // Actualizar lms_calendar
      const updatedList = events.map((ev) => (ev.id === reschedulingEvent.id ? updatedEvt : ev));
      await set(ref(rtdb, "lms_calendar"), updatedList);

      // Sincronizar tutoria_sessions
      await update(ref(rtdb, `tutoria_sessions/${reschedulingEvent.id}`), {
        startUtc: startIso,
        endUtc: endIso,
        status: "confirmed",
        rescheduledByTeacher: true,
        updatedAtUtc: new Date().toISOString(),
      }).catch(() => {});

      // Sincronizar lms_live_sessions
      await update(ref(rtdb, `liveSessions/${reschedulingEvent.id}`), {
        startTimeUtc: startIso,
        startTime: startIso,
        durationMinutes: rescheduleDurationMin,
      }).catch(() => {});

      setToastMessage(
        `Horario fijado con éxito: ${new Date(startIso).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} a las ${rescheduleTime} para "${reschedulingEvent.title}".`
      );
      setReschedulingEvent(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al fijar la nueva hora de la clase.");
    }
  };

  // 4. Marcar Clase como Vista en el Calendario
  const handleMarkAsViewed = async (evt: InstitutionalCalendarEvent) => {
    try {
      const nowIso = new Date().toISOString();
      const updatedEvt: InstitutionalCalendarEvent = {
        ...evt,
        completed: true,
        status: "completed",
        completedAtUtc: nowIso,
      };

      const updatedList = events.map((e) => (e.id === evt.id ? updatedEvt : e));
      await set(ref(rtdb, "lms_calendar"), updatedList);

      await update(ref(rtdb, `tutoria_sessions/${evt.id}`), {
        completed: true,
        status: "completed",
        completedAtUtc: nowIso,
      }).catch(() => {});

      await update(ref(rtdb, `liveSessions/${evt.id}`), {
        completed: true,
        cloudRecordingState: "finished",
        completedAtUtc: nowIso,
      }).catch(() => {});

      setToastMessage(`Clase "${evt.title}" dada por vista en el calendario institucional.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al marcar la clase como vista.");
    }
  };

  // 5. Crear Nuevo Evento o Tutoría 1-1 Personalizada
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime) return;

    try {
      const startIso = new Date(`${newDate}T${newTime}:00`).toISOString();
      const endIso = new Date(
        new Date(startIso).getTime() + newDurationMin * 60000
      ).toISOString();
      const id = `evt-${Date.now()}`;

      const matchedStudent = students.find((s) => s.uid === selectedStudentUid);

      const newEvt: InstitutionalCalendarEvent = {
        id,
        title: newTitle.trim(),
        description:
          newDescription.trim() ||
          (newCategory === "tutoring"
            ? `Tutoría individual 1-1 programada con ${matchedStudent?.name || "el estudiante"}.`
            : "Sesión académica programada por el docente titular."),
        category: newCategory,
        courseSlug: activeCourseSlug,
        courseTitle: "IPT Master: Arquitectura de Software e IA",
        startUtc: startIso,
        endUtc: endIso,
        locationOrUrl: newLocation.trim() || "/live",
        syncedProviders: ["google_calendar", "outlook", "apple_calendar"],
        createdByRole: "instructor",
        status: "confirmed",
        completed: false,
        studentUid: matchedStudent?.uid,
        studentName: matchedStudent?.name,
        studentEmail: matchedStudent?.email,
        ...(newCategory === "live_class" || newCategory === "tutoring"
          ? {
              attendanceModel: newCategory === "tutoring" ? "credits" : attendanceModel,
              quorumRequired: newCategory === "tutoring" ? 1 : Math.max(1, quorumRequired),
              maxCapacity: newCategory === "tutoring" ? 1 : Math.max(quorumRequired, maxCapacity),
              bookedCount: newCategory === "tutoring" ? 1 : 0,
            }
          : {}),
      };

      const nextEvents = [...events, newEvt];
      await set(ref(rtdb, "lms_calendar"), nextEvents);

      // Sincronizar en lms_live_sessions
      if (newCategory === "live_class" || newCategory === "tutoring") {
        const liveSessionItem = {
          id,
          courseSlug: activeCourseSlug,
          moduleId: "mod-01",
          title: newTitle.trim(),
          instructorName: "Docente Titular IPT",
          provider: "native_live",
          meetingCode: id.substring(0, 8),
          joinUrl: newLocation.trim() || "/live",
          startTimeUtc: startIso,
          startTime: startIso,
          durationMinutes: newDurationMin,
          cloudRecordingState: "scheduled",
          autoTranscribed: false,
          attendanceModel: newCategory === "tutoring" ? "credits" : attendanceModel,
          quorumRequired: newCategory === "tutoring" ? 1 : Math.max(1, quorumRequired),
          maxCapacity: newCategory === "tutoring" ? 1 : Math.max(quorumRequired, maxCapacity),
          bookedCount: newCategory === "tutoring" ? 1 : 0,
          studentUid: matchedStudent?.uid || "",
          studentName: matchedStudent?.name || "",
        };

        const liveSnap = await get(ref(rtdb, "lms_live_sessions"));
        const currentLive = liveSnap.exists()
          ? Array.isArray(liveSnap.val())
            ? liveSnap.val()
            : Object.values(liveSnap.val())
          : [];
        await set(ref(rtdb, "lms_live_sessions"), [...currentLive, liveSessionItem]);
        await set(ref(rtdb, `liveSessions/${id}`), liveSessionItem);

        // Si es tutoría 1-1, escribir en tutoria_sessions y lms_live_bookings
        if (newCategory === "tutoring" && matchedStudent) {
          await set(ref(rtdb, `tutoria_sessions/${id}`), {
            id,
            title: newTitle.trim(),
            startUtc: startIso,
            endUtc: endIso,
            studentUid: matchedStudent.uid,
            studentName: matchedStudent.name,
            studentEmail: matchedStudent.email,
            status: "confirmed",
            createdAt: new Date().toISOString(),
          });

          await set(ref(rtdb, `lms_live_bookings/${id}`), {
            id,
            sessionId: id,
            studentUid: matchedStudent.uid,
            userId: matchedStudent.uid,
            studentName: matchedStudent.name,
            studentEmail: matchedStudent.email,
            status: "confirmed",
            bookedAt: new Date().toISOString(),
          });
        }
      }

      setToastMessage(
        newCategory === "tutoring"
          ? `Tutoría 1-1 agendada con ${matchedStudent?.name || "el estudiante"} para el ${newDate} a las ${newTime}.`
          : `Clase en vivo "${newTitle}" agendada exitosamente en el calendario.`
      );
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewDate("");
      setNewLocation("");
      setSelectedStudentUid("");
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al programar el evento en el calendario.");
    }
  };

  // 6. Eliminar Evento
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Deseas eliminar este evento del calendario institucional?")) return;
    try {
      const filtered = events.filter((e) => e.id !== eventId);
      await set(ref(rtdb, "lms_calendar"), filtered);
      await remove(ref(rtdb, `tutoria_sessions/${eventId}`)).catch(() => {});
      await remove(ref(rtdb, `liveSessions/${eventId}`)).catch(() => {});
      setToastMessage("Evento retirado del calendario institucional.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al eliminar evento.");
    }
  };

  // Solicitudes pendientes de aceptación
  const pendingRequests = events.filter(
    (e) => e.status === "pending_teacher_approval" || e.status === "requested"
  );

  const filteredEvents = events.filter(
    (e) => selectedCategory === "all" || e.category === selectedCategory
  );

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "live_class":
        return {
          label: "Clase en Vivo",
          color: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        };
      case "assignment_due":
        return {
          label: "Entrega de Tarea",
          color: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        };
      case "exam":
        return {
          label: "Examen / Evaluación",
          color: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        };
      case "tutoring":
        return {
          label: "Tutoría 1-1 Sincrónica",
          color: "bg-violet-500/10 text-violet-300 border-violet-500/20",
        };
      default:
        return {
          label: "Institucional",
          color: "bg-white/5 text-zinc-300 border-white/10",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Principal de Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              Sincronizado con Alumnos & Tutoría 1-1
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Quórum Docente · Aceptación de Clases · Fijar Horarios
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Calendario de Clases en Vivo, Tutorías 1-1 & Horarios
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
            Acepta solicitudes de tutoría 1-1, fija y reprograma horas de clase, y sincroniza las sesiones en vivo directamente con el estudio de transmisión.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Configurar días y horarios semanales disponibles para tutorías 1-1"
          >
            <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
            <span>Mi Disponibilidad Semanal</span>
          </button>

          <button
            onClick={onOpenTutoriaDirectives}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Directivas TutorIA</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar Sesión / Evento</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BANDEJA DE ENTRADA: Solicitudes de Tutoría 1-1 y Clases por Aceptar */}
      {pendingRequests.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-transparent border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Solicitudes de Tutoría 1-1 & Clases Pendientes de Aceptación</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingRequests.length} pendientes
                </span>
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400">
              Acepta la sesión o fija un horario alternativo para el estudiante
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingRequests.map((req) => {
              const start = new Date(req.startUtc);
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-[#14141c] border border-amber-500/20 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {req.category === "tutoring" ? "Tutoría 1-1" : "Clase Solicitada"}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {start.toLocaleDateString("es-CO", { day: "numeric", month: "short" })},{" "}
                        {start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{req.title}</h4>
                    {req.studentName && (
                      <p className="text-xs text-zinc-300 mt-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                        <span>Solicitado por: <strong>{req.studentName}</strong></span>
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                      {req.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleAcceptClass(req)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/30"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aceptar Clase</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRescheduleModal(req)}
                      className="py-1.5 px-3 rounded-lg bg-[#20202c] hover:bg-[#282838] text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Fijar Otra Hora</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros de Categoría */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: "Todos los Eventos" },
          { id: "tutoring", label: "Tutorías 1-1" },
          { id: "live_class", label: "Clases en Vivo" },
          { id: "assignment_due", label: "Entregas de Tareas" },
          { id: "exam", label: "Exámenes" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedCategory(f.id)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
              selectedCategory === f.id
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-[#181820] text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de Eventos del Calendario */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-zinc-500">
            Cargando eventos y sincronización del calendario...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto text-zinc-500">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-white">
              No hay eventos en esta categoría
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Haz clic en "Agendar Sesión / Evento" para programar una clase en vivo o una tutoría 1-1 personalizada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map((evt) => {
              const badge = getCategoryBadge(evt.category);
              const startDate = new Date(evt.startUtc);
              const isCompleted = evt.completed || evt.status === "completed";
              const isPending = evt.status === "pending_teacher_approval" || evt.status === "requested";

              return (
                <div
                  key={evt.id}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isCompleted
                      ? "bg-white/[0.01] opacity-75"
                      : isPending
                      ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>

                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Vista en Calendario / Completada</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Pendiente de Aceptación</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                          Confirmada en Horario
                        </span>
                      )}

                      {evt.studentName && (
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-semibold inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Estudiante: {evt.studentName}</span>
                        </span>
                      )}

                      {(evt.category === "live_class" || evt.category === "tutoring") && !evt.studentName && (
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-semibold inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-zinc-400" />
                          <span>
                            Quórum: {evt.quorumRequired || 3} · Cupo: {evt.maxCapacity || 25}
                          </span>
                        </span>
                      )}
                    </div>

                    <h4 className={`text-sm font-semibold ${isCompleted ? "text-zinc-300 line-through decoration-zinc-500" : "text-white"}`}>
                      {evt.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                      {evt.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-1 font-mono">
                      <span className="flex items-center gap-1 text-zinc-300 font-sans">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        {startDate.toLocaleDateString("es-CO", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        ·{" "}
                        {startDate.toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {evt.locationOrUrl && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <LinkIcon className="w-3.5 h-3.5" />
                          {evt.locationOrUrl}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Botón Aceptar Clase si está pendiente */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleAcceptClass(evt)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/30"
                        title="Aceptar y confirmar clase en el calendario"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aceptar</span>
                      </button>
                    )}

                    {/* Botón Fijar / Modificar Horas */}
                    <button
                      type="button"
                      onClick={() => handleOpenRescheduleModal(evt)}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                      title="Fijar nueva hora para esta clase"
                    >
                      <CalendarClock className="w-4 h-4" />
                    </button>

                    {/* Botón Iniciar en Sala en Vivo */}
                    {!isCompleted && onNavigateToLive && (evt.category === "live_class" || evt.category === "tutoring") && (
                      <button
                        type="button"
                        onClick={onNavigateToLive}
                        className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-violet-600/30"
                        title="Abrir sala en vivo en Live Studio"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Iniciar en Sala</span>
                      </button>
                    )}

                    {/* Botón Marcar como Vista en Calendario */}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsViewed(evt)}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-all border border-white/5 cursor-pointer"
                        title="Marcar clase como vista/completada en el calendario"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                        <span>Marcar Vista</span>
                      </button>
                    )}

                    {/* Botón Eliminar Evento */}
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                      title="Eliminar evento del calendario institucional"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Fijar Horas de Clase (Reprogramar / Establecer Horario) */}
      {reschedulingEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Fijar Horario de Clase</h3>
              </div>
              <button
                onClick={() => setReschedulingEvent(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Establece la fecha y hora oficial para <strong>"{reschedulingEvent.title}"</strong>. Se sincronizará inmediatamente con el alumno y el sistema de tutoría.
            </p>

            <form onSubmit={handleSaveRescheduledTime} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Nueva Fecha
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="15"
                    value={rescheduleDurationMin}
                    onChange={(e) => setRescheduleDurationMin(Number(e.target.value))}
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReschedulingEvent(null)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
                >
                  Guardar y Sincronizar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear Evento con Soporte de Tutoría 1-1 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Agendar Nuevo Evento, Clase en Vivo o Tutoría 1-1
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Programa clases grupales con quórum o agenda sesiones personalizadas de tutoría 1-1 asignando directamente al estudiante.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Título de la Sesión o Evento
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Tutoría 1-1: Arquitectura Limpia y Patrones Hexagonales"
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Temario u objetivos pedagógicos a abordar..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white resize-none outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="tutoring">Tutoría 1-1 Personalizada</option>
                    <option value="live_class">Clase en Vivo (Por Quórum)</option>
                    <option value="assignment_due">Entrega de Tarea</option>
                    <option value="exam">Examen / Evaluación</option>
                    <option value="institutional">Institucional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Lugar o Enlace
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="/live (Estudio IPT)"
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Selector de Estudiante para Tutoría 1-1 */}
              {newCategory === "tutoring" && (
                <div className="p-3.5 rounded-2xl bg-[#181820] border border-violet-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                    <UserCheck className="w-4 h-4" />
                    <span>Asignar Estudiante a la Tutoría 1-1</span>
                  </div>
                  <select
                    value={selectedStudentUid}
                    onChange={(e) => {
                      setSelectedStudentUid(e.target.value);
                      const std = students.find((s) => s.uid === e.target.value);
                      if (std && !newTitle.includes("Tutoría")) {
                        setNewTitle(`Tutoría 1-1 con ${std.name}`);
                      }
                    }}
                    required
                    className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="">Selecciona un estudiante inscrito...</option>
                    {students.map((stu) => (
                      <option key={stu.uid} value={stu.uid}>
                        {stu.name} ({stu.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parámetros de Quórum para Clases Grupales */}
              {newCategory === "live_class" && (
                <div className="p-3.5 rounded-2xl bg-[#181820] border border-violet-500/30 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Regla de Escalabilidad Docente (Quórum & Créditos)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                        Modelo
                      </label>
                      <select
                        value={attendanceModel}
                        onChange={(e) => setAttendanceModel(e.target.value as any)}
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="hybrid">Quórum + 1 Crédito</option>
                        <option value="quorum">Solo Quórum</option>
                        <option value="credits">Bolsa de Créditos</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                        Quórum Mínimo
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={quorumRequired}
                        onChange={(e) => setQuorumRequired(Number(e.target.value))}
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                        Cupo Máximo
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={maxCapacity}
                        onChange={(e) => setMaxCapacity(Number(e.target.value))}
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    value={newDurationMin}
                    onChange={(e) => setNewDurationMin(Number(e.target.value))}
                    min="15"
                    max="300"
                    step="15"
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
                >
                  {newCategory === "tutoring" ? "Agendar y Asignar Tutoría 1-1" : "Agendar en Calendario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Disponibilidad Semanal del Docente */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Disponibilidad Semanal para Tutorías 1 a 1</h3>
              </div>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Define los días y franjas horarias en las que los alumnos pueden agendar citas contigo. El sistema dividirá automáticamente las franjas en ranuras de atención individual.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await set(ref(rtdb, "teacher_availability"), {
                    ...availability,
                    updatedAt: new Date().toISOString(),
                  });
                  setToastMessage("Disponibilidad semanal guardada con éxito.");
                  setShowAvailabilityModal(false);
                  setTimeout(() => setToastMessage(null), 4000);
                } catch {
                  alert("Error al guardar la disponibilidad docente.");
                }
              }}
              className="space-y-4 pt-1"
            >
              {/* Duración de Ranuras */}
              <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Duración de Cada Cita</span>
                  <span className="text-[10px] text-zinc-400">Tiempo asignado por estudiante</span>
                </div>
                <select
                  value={availability.slotDurationMin}
                  onChange={(e) =>
                    setAvailability({
                      ...availability,
                      slotDurationMin: Number(e.target.value),
                    })
                  }
                  className="bg-[#121217] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500 font-mono"
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (Estándar)</option>
                  <option value={90}>90 minutos</option>
                </select>
              </div>

              {/* Días Semanales */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Días y Horarios de Atención
                </span>
                <div className="space-y-2">
                  {[
                    { day: 1, name: "Lunes" },
                    { day: 2, name: "Martes" },
                    { day: 3, name: "Miércoles" },
                    { day: 4, name: "Jueves" },
                    { day: 5, name: "Viernes" },
                    { day: 6, name: "Sábado" },
                    { day: 0, name: "Domingo" },
                  ].map(({ day, name }) => {
                    const slot = availability.weeklySlots[day] || {
                      enabled: false,
                      start: "14:00",
                      end: "18:00",
                    };

                    return (
                      <div
                        key={day}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          slot.enabled
                            ? "bg-[#181822] border-violet-500/30"
                            : "bg-[#14141a]/50 border-white/5 opacity-60"
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={(e) => {
                              setAvailability({
                                ...availability,
                                weeklySlots: {
                                  ...availability.weeklySlots,
                                  [day]: { ...slot, enabled: e.target.checked },
                                },
                              });
                            }}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-0 bg-black border-white/20"
                          />
                          <span className={`text-xs font-semibold ${slot.enabled ? "text-white" : "text-zinc-400"}`}>
                            {name}
                          </span>
                        </label>

                        {slot.enabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => {
                                setAvailability({
                                  ...availability,
                                  weeklySlots: {
                                    ...availability.weeklySlots,
                                    [day]: { ...slot, start: e.target.value },
                                  },
                                });
                              }}
                              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-violet-500"
                            />
                            <span className="text-xs text-zinc-500">–</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => {
                                setAvailability({
                                  ...availability,
                                  weeklySlots: {
                                    ...availability.weeklySlots,
                                    [day]: { ...slot, end: e.target.value },
                                  },
                                });
                              }}
                              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none focus:border-violet-500"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500">No disponible</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bloqueo de Fechas Específicas */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Bloquear Fechas Específicas (Feriados / Ausencias)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    className="flex-1 bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newBlockedDate) return;
                      const cur = availability.blockedDates || [];
                      if (!cur.includes(newBlockedDate)) {
                        setAvailability({
                          ...availability,
                          blockedDates: [...cur, newBlockedDate],
                        });
                      }
                      setNewBlockedDate("");
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-xs text-white rounded-xl font-semibold cursor-pointer"
                  >
                    + Bloquear
                  </button>
                </div>

                {(availability.blockedDates || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(availability.blockedDates || []).map((dateStr) => (
                      <span
                        key={dateStr}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono"
                      >
                        <span>{dateStr}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAvailability({
                              ...availability,
                              blockedDates: (availability.blockedDates || []).filter((d) => d !== dateStr),
                            });
                          }}
                          className="hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
                >
                  Guardar Disponibilidad Semanal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
