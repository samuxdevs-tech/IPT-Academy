"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Filter,
  RefreshCw,
  Video,
  CheckCircle2
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface ScheduledClassEvent {
  id: string;
  title: string;
  scheduledTime: string;
  dayName: string;
  dayDate: string;
  origin: "tutoria_ai" | "manual_booking";
  studentName: string;
  reservedQuotas: number;
  maxQuotas: number;
  status: "confirmada" | "pendiente";
}

export function TeacherCalendarView({
  onOpenTutoriaDirectives
}: {
  onOpenTutoriaDirectives: () => void;
}) {
  const [events, setEvents] = useState<ScheduledClassEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "tutoria" | "manual">("all");
  const [currentWeekLabel, setCurrentWeekLabel] = useState<string>("Semana Actual");

  useEffect(() => {
    // Calcular etiqueta de semana
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lunes
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5); // Sábado
    setCurrentWeekLabel(`${startOfWeek.toLocaleDateString("es-ES", options)} – ${endOfWeek.toLocaleDateString("es-ES", options)}, ${now.getFullYear()}`);

    // Consultar eventos reales en RTDB: class_bookings
    const bookingsRef = ref(rtdb, "class_bookings");
    const unsubscribe = onValue(
      bookingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: ScheduledClassEvent[] = [];
          Object.entries(data).forEach(([id, item]: [string, any]) => {
            list.push({
              id,
              title: item.title || item.topic || "Clase de Acompañamiento",
              scheduledTime: item.time || item.scheduledTime || "10:00 - 11:00",
              dayName: item.dayName || "Lunes",
              dayDate: item.date || item.dayDate || new Date().toISOString().split("T")[0],
              origin: item.origin === "tutoria_ai" ? "tutoria_ai" : "manual_booking",
              studentName: item.studentName || item.studentEmail || "Estudiante IPT",
              reservedQuotas: Number(item.reservedQuotas) || 1,
              maxQuotas: Number(item.maxQuotas) || 1,
              status: item.status === "pendiente" ? "pendiente" : "confirmada"
            });
          });
          setEvents(list);
        } else {
          setEvents([]);
        }
        setLoading(false);
      },
      () => {
        setEvents([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (selectedFilter === "tutoria") return e.origin === "tutoria_ai";
    if (selectedFilter === "manual") return e.origin === "manual_booking";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Agenda Docente</span>
            <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              Sincronizado con TutorIA
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Calendario de Clases y Tutorías
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Visualizador de clases agendadas automáticamente por TutorIA y reservaciones manuales de estudiantes con cupo confirmado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenTutoriaDirectives}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Directivas de TutorIA</span>
          </button>
        </div>
      </div>

      {/* Selector de Filtro y Controles de Semana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-[#121217] p-1.5 rounded-full border border-white/10 inline-flex self-start">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedFilter === "all"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Todas ({events.length})
          </button>
          <button
            onClick={() => setSelectedFilter("tutoria")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedFilter === "tutoria"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Vía TutorIA ({events.filter((e) => e.origin === "tutoria_ai").length})
          </button>
          <button
            onClick={() => setSelectedFilter("manual")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedFilter === "manual"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Manuales ({events.filter((e) => e.origin === "manual_booking").length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-white bg-[#121217] px-3.5 py-1.5 rounded-full border border-white/10">
          <CalendarIcon className="w-4 h-4 text-violet-400" />
          <span>{currentWeekLabel}</span>
        </div>
      </div>

      {/* Grid del Calendario / Lista de Sesiones Dark Pro */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-500" />
            <p className="text-xs font-medium">Cargando agenda de clases sincronizadas...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Sin clases programadas</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
              {selectedFilter !== "all"
                ? "No se encontraron clases con el filtro seleccionado."
                : "No hay clases agendadas para esta semana. Cuando los estudiantes reserven a través de TutorIA o manualmente, aparecerán aquí."}
            </p>
            <button
              onClick={onOpenTutoriaDirectives}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all active:scale-[0.97]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Configurar Horarios en TutorIA</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#181820] border border-white/10 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">
                      {event.dayName.slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {event.dayDate ? event.dayDate.split("-")[2] || "•" : "•"}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{event.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          event.origin === "tutoria_ai"
                            ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                            : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        }`}
                      >
                        {event.origin === "tutoria_ai" ? "Vía TutorIA" : "Reserva Manual"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-medium text-white font-mono">{event.scheduledTime}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{event.studentName}</span>
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] bg-[#181820] px-2 py-0.5 rounded text-zinc-300 border border-white/5">
                        Cupos: {event.reservedQuotas}/{event.maxQuotas}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmada
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
