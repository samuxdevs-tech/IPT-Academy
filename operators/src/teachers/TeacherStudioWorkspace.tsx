"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Table,
  CheckSquare,
  Video,
  HelpCircle,
  Lock,
  Users,
  Calendar,
  Sparkles,
  Eye,
  Shield,
  Layers,
  GraduationCap,
  MessageSquare,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { CourseBuilder } from "./CourseBuilder";
import { RubricGradeMatrix } from "./RubricGradeMatrix";
import { QuickGradingView } from "./QuickGradingView";
import { LiveClassSplitView } from "./LiveClassSplitView";
import { QuestionBankView } from "./QuestionBankView";
import { CourseConditionalsView } from "./CourseConditionalsView";
import { StudentsAnalyticsView } from "./StudentsAnalyticsView";
import { TeacherCalendarView } from "./TeacherCalendarView";
import { TutoriaDirectivesChat } from "./TutoriaDirectivesChat";
import { OperatorUserProfile } from "@/lib/firebase";

export type TeacherTab =
  | "builder"
  | "conditionals"
  | "questions"
  | "grading"
  | "rubrics"
  | "live"
  | "calendar"
  | "tutoria"
  | "students";

interface NavGroup {
  groupTitle: string;
  items: {
    id: TeacherTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: "Estructura Didáctica",
    items: [
      { id: "builder", label: "Creador Modular", sublabel: "Drag & drop y lecciones", icon: BookOpen },
      { id: "conditionals", label: "Control de Candados", sublabel: "Condicionales de avance", icon: Lock },
      { id: "questions", label: "Banco de Preguntas", sublabel: "Import / Export JSON/CSV", icon: HelpCircle },
    ]
  },
  {
    groupTitle: "Evaluación & Calificaciones",
    items: [
      { id: "grading", label: "Calificación Rápida", sublabel: "Revisión asistida con IA", icon: CheckSquare, badge: "IA Activa" },
      { id: "rubrics", label: "Rúbricas & Matriz", sublabel: "Gradebook a Excel/CSV", icon: Table },
    ]
  },
  {
    groupTitle: "Sesiones & Agenda",
    items: [
      { id: "live", label: "Split View Videollamada", sublabel: "Cupos per-class & docx/pdf", icon: Video, badge: "En Vivo" },
      { id: "calendar", label: "Calendario Sincrónico", sublabel: "Agenda TutorIA y manual", icon: Calendar },
      { id: "tutoria", label: "Directivas a TutorIA", sublabel: "Restricción horaria docente", icon: Sparkles },
    ]
  },
  {
    groupTitle: "Métricas de Alumnos",
    items: [
      { id: "students", label: "Alumnos & Diplomas", sublabel: "Padrón vivo y folios", icon: Users },
    ]
  }
];

export function TeacherStudioWorkspace({
  userProfile,
  onGoToAdmin,
  onOpenPreview
}: {
  userProfile: OperatorUserProfile;
  onGoToAdmin: () => void;
  onOpenPreview: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TeacherTab>("builder");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const activeItem = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab) || NAV_GROUPS[0].items[0];

  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-3.5rem)] bg-[#0a0a0c]">
      {/* Sidebar Fijo Pro con Jerarquía Visual */}
      <aside
        className={`bg-[#0e0e12] border-r border-white/10 transition-all duration-300 flex-shrink-0 flex flex-col justify-between ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-72"
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Header del Sidebar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            {!sidebarCollapsed && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 block">
                  Studio Docente
                </span>
                <h2 className="text-sm font-bold text-white tracking-tight">Consola Académica</h2>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors mx-auto"
              title={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Grupos de Navegación */}
          <div className="space-y-5">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 px-2 block mb-1">
                    {group.groupTitle}
                  </span>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                          isActive
                            ? "bg-violet-600 text-white font-semibold shadow-md shadow-violet-600/30"
                            : "text-zinc-300 hover:text-white hover:bg-white/5"
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-[#181820] text-zinc-400 group-hover:text-white group-hover:bg-[#22222c]"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {!sidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs truncate block">{item.label}</span>
                              {item.badge && (
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] truncate block ${
                              isActive ? "text-violet-100" : "text-zinc-400"
                            }`}>
                              {item.sublabel}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer del Sidebar */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/10 m-2 rounded-2xl bg-[#14141a]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                RTDB Conectado
              </span>
            </div>
            <p className="text-[11px] text-zinc-300">
              Datagan 360 · Certificación Maestra
            </p>
          </div>
        )}
      </aside>

      {/* Área de Trabajo a Pantalla Completa */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[1600px] w-full">
        {activeTab === "builder" && <CourseBuilder onOpenPreview={onOpenPreview} />}
        {activeTab === "conditionals" && <CourseConditionalsView onOpenPreview={onOpenPreview} />}
        {activeTab === "questions" && <QuestionBankView />}
        {activeTab === "grading" && <QuickGradingView />}
        {activeTab === "rubrics" && <RubricGradeMatrix />}
        {activeTab === "live" && <LiveClassSplitView />}
        {activeTab === "calendar" && (
          <TeacherCalendarView onOpenTutoriaDirectives={() => setActiveTab("tutoria")} />
        )}
        {activeTab === "tutoria" && (
          <TutoriaDirectivesChat onBack={() => setActiveTab("calendar")} />
        )}
        {activeTab === "students" && <StudentsAnalyticsView />}
      </main>
    </div>
  );
}
