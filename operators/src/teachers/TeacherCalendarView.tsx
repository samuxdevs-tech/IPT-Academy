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
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, get } from "firebase/database";

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
}

export function TeacherCalendarView({
  onOpenTutoriaDirectives,
}: {
  onOpenTutoriaDirectives: () => void;
}) {
  const [events, setEvents] = useState<InstitutionalCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal para crear evento
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newCategory, setNewCategory] =
    useState<InstitutionalCalendarEvent["category"]>("live_class");
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("10:00");
  const [newDurationMin, setNewDurationMin] = useState<number>(60);
  const [newLocation, setNewLocation] = useState<string>("");
  const [attendanceModel, setAttendanceModel] = useState<"quorum" | "credits" | "hybrid">(
    "hybrid"
  );
  const [quorumRequired, setQuorumRequired] = useState<number>(3);
  const [maxCapacity, setMaxCapacity] = useState<number>(25);

  const activeCourseSlug = "ipt-master-fullstack";

  useEffect(() => {
    const calRef = ref(rtdb, "lms_calendar");
    const unsub = onValue(calRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: InstitutionalCalendarEvent[] = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.values(val);
        list.sort(
          (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
        );
        setEvents(list);
      } else {
        setEvents([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime) return;

    try {
      const startIso = new Date(`${newDate}T${newTime}:00`).toISOString();
      const endIso = new Date(
        new Date(startIso).getTime() + newDurationMin * 60000
      ).toISOString();
      const id = `evt-${Date.now()}`;

      const newEvt: InstitutionalCalendarEvent = {
        id,
        title: newTitle.trim(),
        description:
          newDescription.trim() ||
          "Sesión académica programada por el docente titular.",
        category: newCategory,
        courseSlug: activeCourseSlug,
        courseTitle: "IPT Master: Arquitectura de Software e IA",
        startUtc: startIso,
        endUtc: endIso,
        locationOrUrl: newLocation.trim() || "/live",
        syncedProviders: ["google_calendar", "outlook", "apple_calendar"],
        createdByRole: "instructor",
        ...(newCategory === "live_class" || newCategory === "tutoring"
          ? {
              attendanceModel,
              quorumRequired: Math.max(1, quorumRequired),
              maxCapacity: Math.max(quorumRequired, maxCapacity),
              bookedCount: 0,
            }
          : {}),
      };

      const nextEvents = [...events, newEvt];
      await set(ref(rtdb, "lms_calendar"), nextEvents);

      if (newCategory === "live_class") {
        const liveSessionId = `live-${Date.now()}`;
        const liveSessionItem = {
          id: liveSessionId,
          courseSlug: activeCourseSlug,
          moduleId: "mod-01",
          title: newTitle.trim(),
          instructorName: "Docente Titular IPT",
          provider: "google_meet",
          meetingCode: id.substring(0, 8),
          joinUrl: newLocation.trim() || "https://meet.google.com/ipt-session",
          startTimeUtc: startIso,
          startTime: startIso,
          durationMinutes: newDurationMin,
          cloudRecordingState: "scheduled",
          autoTranscribed: false,
          attendanceModel,
          quorumRequired: Math.max(1, quorumRequired),
          maxCapacity: Math.max(quorumRequired, maxCapacity),
          bookedCount: 0,
        };

        const liveSnap = await get(ref(rtdb, "lms_live_sessions"));
        const currentLive = liveSnap.exists()
          ? Array.isArray(liveSnap.val())
            ? liveSnap.val()
            : Object.values(liveSnap.val())
          : [];
        await set(ref(rtdb, "lms_live_sessions"), [...currentLive, liveSessionItem]);
        await set(ref(rtdb, `liveSessions/${liveSessionId}`), liveSessionItem);
      }

      setToastMessage(
        `Evento "${newTitle}" agendado con regla de quórum (${quorumRequired} mín. / ${maxCapacity} máx.) para estudiantes Pro+ y Your Plan.`
      );
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewDate("");
      setNewLocation("");
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al programar el evento en el calendario.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Deseas eliminar este evento del calendario de todos los estudiantes?"))
      return;
    try {
      const filtered = events.filter((e) => e.id !== eventId);
      await set(ref(rtdb, "lms_calendar"), filtered);
      setToastMessage("Evento retirado del calendario de estudiantes.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      alert("Error al eliminar evento.");
    }
  };

  const filteredEvents = events.filter(
    (e) => selectedCategory === "all" || e.category === selectedCategory
  );

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "live_class":
        return {
          label: "Clase en Vivo (Pro+ / Your Plan)",
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
          label: "Tutoría Sincrónica",
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              Sincronizado con ipt-course-students
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Quórum Docente & Créditos Pro+
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Calendario de Clases en Vivo (Por Quórum / Créditos), Tutorías & Entregas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
            Programa sesiones en vivo sin compromisos rígidos de horas perdidas: define el quórum mínimo de inscritos para activar la sesión y el consumo de créditos para alumnos Pro+ y Your Plan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTutoriaDirectives}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Directivas TutorIA</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar Sesión / Evento</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filtros de Categoría */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: "Todos los Eventos" },
          { id: "live_class", label: "Clases en Vivo (Quórum / Créditos)" },
          { id: "assignment_due", label: "Entregas de Tareas" },
          { id: "exam", label: "Exámenes" },
          { id: "tutoring", label: "Tutorías" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedCategory(f.id)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 ${
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
            Cargando eventos de lms_calendar...
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
              Haz clic en "Agendar Sesión / Evento" para programar una clase en vivo con quórum mínimo, entrega o examen.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map((evt) => {
              const badge = getCategoryBadge(evt.category);
              const startDate = new Date(evt.startUtc);
              return (
                <div
                  key={evt.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {evt.courseTitle}
                      </span>
                      {(evt.category === "live_class" || evt.category === "tutoring") && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>
                            Quórum mín: {evt.quorumRequired || 3} · Cupo máx:{" "}
                            {evt.maxCapacity || 25} · Reservados: {evt.bookedCount || 0}
                          </span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white">{evt.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                      {evt.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1 font-mono">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        {startDate.toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        ·{" "}
                        {startDate.toLocaleTimeString("es-ES", {
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

                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all self-end md:self-center"
                    title="Eliminar evento de la base de datos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Crear Evento con Configuración de Quórum y Créditos */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] rounded-3xl border border-white/10 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Agendar Nuevo Evento o Clase en Vivo con Quórum
            </h3>
            <p className="text-xs text-zinc-400">
              Para clases en vivo, define el quórum mínimo de inscritos. Si 3 horas antes de iniciar no se alcanza el quórum, la sesión se cancela sin costo docente y se reembolsa el crédito a los alumnos inscritos.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Título del Evento
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Clase en Vivo: Estrategias de Pesaje Digital"
                  required
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
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
                  placeholder="Objetivo de la sesión o detalles para los alumnos..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
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
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="live_class">Clase en Vivo (Pro+ / Your Plan)</option>
                    <option value="assignment_due">Entrega de Tarea</option>
                    <option value="exam">Examen / Evaluación</option>
                    <option value="tutoring">Tutoría Individual</option>
                    <option value="institutional">Institucional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Lugar o Enlace de Reunión
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {(newCategory === "live_class" || newCategory === "tutoring") && (
                <div className="p-3.5 rounded-2xl bg-[#181820] border border-violet-500/30 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Regla de Escalabilidad Docente (Quórum & Bolsa de Créditos)</span>
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
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                >
                  Agendar en Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
