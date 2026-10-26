"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, Plus, Trash2, CheckCircle2, Shield, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { ConditionalRule } from "@/lib/mockStudent";

export function CourseConditionalsView({ onOpenPreview }: { onOpenPreview: () => void }) {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [progressionMode, setProgressionMode] = useState<"free" | "lesson_strict" | "module_strict">("free");
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [targetTitle, setTargetTitle] = useState<string>("");
  const [requiredTitle, setRequiredTitle] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(4.0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const courseSlug = "datagan-360-certificacion-maestra";

  // Cargar reglas condicionales y modo de progresión reales desde RTDB
  useEffect(() => {
    const courseRef = ref(rtdb, `courses/${courseSlug}`);
    const unsubscribe = onValue(
      courseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.progressionMode) {
            setProgressionMode(data.progressionMode);
          }
          if (Array.isArray(data.conditionals)) {
            setRules(data.conditionals);
          } else if (typeof data.conditionals === "object") {
            setRules(Object.values(data.conditionals));
          } else {
            setRules([]);
          }
        } else {
          setRules([]);
        }
        setLoading(false);
      },
      () => {
        setRules([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Guardar modo de progresión en Firebase RTDB
  const handleUpdateProgressionMode = async (mode: "free" | "lesson_strict" | "module_strict") => {
    setProgressionMode(mode);
    try {
      setSaveStatus("Sincronizando modo...");
      await set(ref(rtdb, `courses/${courseSlug}/progressionMode`), mode);
      setSaveStatus("¡Modo Sincronizado!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("Error al sincronizar");
    }
  };

  // Guardar reglas en Firebase RTDB
  const handleSaveToRtdb = async (updated: ConditionalRule[]) => {
    try {
      setSaveStatus("Guardando candados...");
      const condRef = ref(rtdb, `courses/${courseSlug}/conditionals`);
      await set(condRef, updated);
      setRules(updated);
      setSaveStatus("Candados Sincronizados");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus("Error al guardar en Firebase");
    }
  };

  const handleAddRule = async () => {
    if (!targetTitle.trim() || !requiredTitle.trim()) {
      alert("Por favor completa el nombre del contenido a bloquear y la evaluación requerida.");
      return;
    }

    const created: ConditionalRule = {
      targetId: `cond-${Date.now()}`,
      targetTitle: targetTitle.trim(),
      requiredQuizOrExamId: `req-${Date.now()}`,
      requiredQuizTitle: requiredTitle.trim(),
      minScore: Number(minScore),
    };

    const updated = [...rules, created];
    await handleSaveToRtdb(updated);
    setTargetTitle("");
    setRequiredTitle("");
    setIsAdding(false);
  };

  const handleDeleteRule = async (index: number) => {
    if (!confirm("¿Deseas eliminar este candado pedagógico?")) return;
    const updated = rules.filter((_, i) => i !== index);
    await handleSaveToRtdb(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Control Pedagógico</span>
            {saveStatus && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {saveStatus}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Condicionales de Desbloqueo y Avance
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Establece candados obligatorios para que ningún estudiante acceda a módulos avanzados sin aprobar las evaluaciones requeridas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.97]"
            title="Prueba estos bloqueos como un alumno real con el Estudiante Mock"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Modo Estudiante (?preview=true)</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* Selector de Modo de Progresión Global */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
            Política de Progresión Académica (Transmitida a ipt-course-students)
          </span>
          <span className="text-xs text-zinc-400 font-mono">Modo activo: {progressionMode}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: "free",
              label: "Navegación Libre",
              desc: "Los estudiantes pueden ver cualquier lección en cualquier orden sin restricciones.",
            },
            {
              id: "lesson_strict",
              label: "Secuencial Estricto",
              desc: "El estudiante debe completar la lección previa antes de desbloquear la siguiente.",
            },
            {
              id: "module_strict",
              label: "Bloqueo por Módulo",
              desc: "El estudiante debe aprobar las tareas del módulo para desbloquear el siguiente.",
            },
          ].map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleUpdateProgressionMode(mode.id as any)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                progressionMode === mode.id
                  ? "bg-violet-600/10 border-violet-500 shadow-sm"
                  : "bg-[#181820] border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{mode.label}</span>
                {progressionMode === mode.id && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario de Nueva Regla Pro */}
      {isAdding && (
        <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Configurar Nuevo Candado de Progreso
              </span>
            </div>
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs text-zinc-400 hover:text-white font-medium"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Módulo o Lección a Bloquear
              </label>
              <input
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="Ej: Módulo 2 · Gestión de Forrajes"
                className="w-full text-xs border border-white/10 rounded-xl p-3 bg-[#181820] text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Evaluación Requerida para Desbloqueo
              </label>
              <input
                type="text"
                value={requiredTitle}
                onChange={(e) => setRequiredTitle(e.target.value)}
                placeholder="Ej: Examen de Certificación · Módulo 1"
                className="w-full text-xs border border-white/10 rounded-xl p-3 bg-[#181820] text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-zinc-300">Nota mínima aprobatoria (0.0 a 5.0):</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="w-20 text-xs border border-white/10 bg-[#181820] rounded-lg p-2 font-mono font-bold text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            <button
              onClick={handleAddRule}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar y Activar Regla</span>
            </button>
          </div>
        </div>
      )}

      {/* Lista de Reglas Activas */}
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#181820]">
          <span className="text-xs font-bold text-white tracking-tight">
            Candados Activos Registrados en Tiempo Real ({rules.length})
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Firebase RTDB
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-violet-500" />
            <p className="text-xs font-medium">Cargando condicionales del curso...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#181820] flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Unlock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Sin condicionales activas</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
              Actualmente los estudiantes pueden navegar libremente por todos los módulos. Agrega una regla para exigir aprobación escalonada.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Primera Regla</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rules.map((rule, idx) => (
              <div
                key={rule.targetId || idx}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#181820] border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Lock className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{rule.targetTitle}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        Bloqueado
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>Requiere aprobar:</span>
                      <strong className="text-white font-medium">{rule.requiredQuizTitle}</strong>
                      <span>con nota mínima de</span>
                      <span className="font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                        {rule.minScore.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => handleDeleteRule(idx)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar condicional"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
