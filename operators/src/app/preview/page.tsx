"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  Video,
  RefreshCw
} from "lucide-react";
import { MockStudentManager, DEFAULT_CONDITIONALS, ConditionalRule } from "@/lib/mockStudent";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

function StudentPreviewInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = searchParams.get("preview") === "true";

  const [conditionals, setConditionals] = useState<ConditionalRule[]>(DEFAULT_CONDITIONALS);
  const [studentManager, setStudentManager] = useState<MockStudentManager>(
    () => new MockStudentManager(DEFAULT_CONDITIONALS)
  );
  const [progress, setProgress] = useState(studentManager.getProgress());
  const [courseModules, setCourseModules] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cargar módulos y condicionales reales desde RTDB
  useEffect(() => {
    const modulesRef = ref(rtdb, "courses/datagan-360-certificacion-maestra/modules");
    const condRef = ref(rtdb, "courses/datagan-360-certificacion-maestra/conditionals");

    let unsubMods: (() => void) | null = null;
    let unsubConds: (() => void) | null = null;

    unsubMods = onValue(modulesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const mods = Array.isArray(val) ? val : Object.values(val);
        setCourseModules(mods);
        if (mods.length > 0 && mods[0].lessons?.length > 0 && !selectedLessonId) {
          setSelectedLessonId(mods[0].lessons[0].id);
        }
      } else {
        // Fallback estructural si aún no se han subido módulos a RTDB
        const fallbackMods = [
          {
            id: "mod-1",
            title: "Módulo 1 · Cimientos Operativos y Diagnóstico de Entrada",
            lessons: [
              { id: "les-1-1", title: "1.1 Configuración de Perfil Oficial", duration: "08:30" },
              { id: "les-1-2", title: "1.2 Diagnóstico Forrajero y Materia Seca", duration: "14:15" },
            ],
            examId: "exam-modulo-1",
            examTitle: "Examen de Certificación · Módulo 1"
          },
          {
            id: "mod-2",
            title: "Módulo 2 · Gestión de Forrajes y Pastoreo Rotacional",
            lessons: [
              { id: "les-2-1", title: "2.1 Fórmulas Zootécnicas de Presión de Pastoreo", duration: "18:40" },
              { id: "les-2-2", title: "2.2 División de Apartos y Leyes de Voisin", duration: "16:20" },
            ],
            examId: "exam-modulo-2",
            examTitle: "Evaluación Técnica · Módulo 2"
          },
          {
            id: "mod-3",
            title: "Módulo 3 · Parámetros Reproductivos e IATF",
            lessons: [
              { id: "les-3-1", title: "3.1 Protocolos Hormonales en Ganado de Carne", duration: "22:10" }
            ],
            examId: "exam-modulo-3",
            examTitle: "Examen de Corte · Módulo 3"
          }
        ];
        setCourseModules(fallbackMods);
        setSelectedLessonId("les-1-1");
      }
      setLoading(false);
    });

    unsubConds = onValue(condRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const conds = Array.isArray(val) ? val : Object.values(val);
        setConditionals(conds);
        const mgr = new MockStudentManager(conds);
        setStudentManager(mgr);
        setProgress(mgr.getProgress());
      }
    });

    return () => {
      if (unsubMods) unsubMods();
      if (unsubConds) unsubConds();
    };
  }, []);

  const updateState = () => {
    setProgress(studentManager.getProgress());
  };

  const handleSimulatePassExam = (examId: string, score: number) => {
    studentManager.simulatePassQuiz(examId, score);
    updateState();
    setAlertNotice(
      `¡Examen aprobado con nota ${score.toFixed(1)}/5.0! Se ha desbloqueado el contenido condicional correspondiente.`
    );
    setTimeout(() => setAlertNotice(null), 4000);
  };

  const handleResetProgress = () => {
    studentManager.resetProgress();
    updateState();
    if (courseModules.length > 0 && courseModules[0].lessons?.length > 0) {
      setSelectedLessonId(courseModules[0].lessons[0].id);
    }
    setAlertNotice("Progreso reiniciado a 0%. Todos los condicionales han sido bloqueados nuevamente.");
    setTimeout(() => setAlertNotice(null), 3000);
  };

  const currentModule = courseModules.find((m) =>
    m.lessons?.some((l: any) => l.id === selectedLessonId)
  );

  const isCurrentModuleLocked = currentModule
    ? studentManager.isTargetLocked(currentModule.id) ||
      studentManager.isTargetLocked(currentModule.title)
    : false;

  const currentLesson = currentModule?.lessons?.find((l: any) => l.id === selectedLessonId);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col font-sans text-white">
      {/* Banner de Impersonation Dark Pro */}
      <div className="bg-[#0e0e12] text-white px-4 py-2.5 shadow-md sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Modo Estudiante (?preview=true)
            </span>
            <span className="text-[#a1a1aa] hidden md:inline">
              Estudiante Mock instanciado con progreso en 0% para validar condicionales
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulatePassExam("exam-modulo-1", 4.5)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-[11px] border border-white/10 transition-all active:scale-[0.97]"
            >
              Simular Aprobar Examen Módulo 1 (Nota 4.5)
            </button>
            <button
              onClick={handleResetProgress}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all active:scale-[0.97]"
              title="Reiniciar progreso a cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1 px-3.5 py-1 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl text-[11px] transition-all active:scale-[0.97] shadow-sm ml-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Salir de Preview
            </button>
          </div>
        </div>
      </div>

      {alertNotice && (
        <div className="bg-violet-600 text-white px-4 py-2.5 text-xs text-center font-medium shadow-sm flex items-center justify-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4" />
          {alertNotice}
        </div>
      )}

      {/* Main Student Shell */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Reproductor o Pantalla de Bloqueo */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-[#121217] rounded-2xl p-16 text-center border border-white/10 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-400 mb-2" />
              <p className="text-xs text-[#a1a1aa]">Cargando curso...</p>
            </div>
          ) : isCurrentModuleLocked ? (
            /* Bloqueo Legítimo por Condicional Pedagógico */
            <div className="bg-[#121217] rounded-2xl border border-rose-500/20 p-12 text-center space-y-4 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                  Contenido Condicionalmente Bloqueado
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                  {currentModule?.title}
                </h3>
              </div>

              <div className="max-w-md mx-auto bg-[#181820] rounded-xl p-4 text-left border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Requisito de Desbloqueo Pendiente
                </div>
                <p className="text-[#a1a1aa] leading-relaxed">
                  Para acceder a este contenido, el estudiante debe primero aprobar la evaluación previa requerida con la nota mínima aprobatoria exigida por el docente.
                </p>
                <div className="pt-2 border-t border-white/10 text-[11px] text-violet-400 font-medium">
                  Regla de Condicional verificada exitosamente en el navegador
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleSimulatePassExam("exam-modulo-1", 4.5)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-medium transition-all active:scale-[0.97] shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  Simular Aprobación para Probar Desbloqueo
                </button>
              </div>
            </div>
          ) : (
            /* Reproductor de Lección */
            <div className="bg-[#121217] rounded-2xl border border-white/10 overflow-hidden">
              <div className="aspect-video bg-black flex flex-col items-center justify-center text-white relative">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/80">
                  <span className="font-mono">{currentLesson?.duration || "12:45"}</span>
                  <span className="bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[10px]">
                    1080p HD
                  </span>
                </div>
              </div>

              <div className="p-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  {currentModule?.title}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                  {currentLesson?.title || "Lección Activa"}
                </h3>
                <p className="text-xs text-[#a1a1aa] mt-2 leading-relaxed">
                  Esta es la vista auténtica del estudiante con renderizado estricto del contenido audiovisual, checkpoints evaluativos y recursos pedagógicos de apoyo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Plan de Estudios del Curso */}
        <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-4 h-fit">
          <div className="pb-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                Plan de Estudios
              </h4>
              <p className="text-[11px] text-[#a1a1aa]">Datagan 360 · Certificación Maestra</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-violet-400">
              {progress.progressPercent}%
            </span>
          </div>

          {/* Barra de Progreso Global */}
          <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          {/* Lista de Módulos */}
          <div className="space-y-3 pt-2">
            {courseModules.map((module) => {
              const isLocked =
                studentManager.isTargetLocked(module.id) ||
                studentManager.isTargetLocked(module.title);

              return (
                <div
                  key={module.id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isLocked
                      ? "bg-[#181820]/40 border-white/5 opacity-60"
                      : "bg-[#181820] border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {module.title}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {module.lessons?.map((les: any) => {
                      const isSelected = selectedLessonId === les.id;
                      return (
                        <button
                          key={les.id}
                          onClick={() => setSelectedLessonId(les.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-violet-600 text-white font-medium shadow-xs"
                              : "text-[#a1a1aa] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="truncate max-w-[200px]">{les.title}</span>
                          <span className="text-[10px] font-mono opacity-80">{les.duration}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-8 text-center text-white">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-2" />
          <p className="text-xs text-[#a1a1aa]">Cargando vista previa del estudiante...</p>
        </div>
      }
    >
      <StudentPreviewInner />
    </Suspense>
  );
}
