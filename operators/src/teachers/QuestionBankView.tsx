"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Download, Upload, Plus, Trash2, CheckCircle2, FileJson, FileSpreadsheet, Sparkles, Inbox } from "lucide-react";
import { exportToCsv } from "@/lib/exportUtils";
import { rtdb } from "@/lib/firebase";
import { ref, get, set, remove } from "firebase/database";

export interface QuestionBankItem {
  id: string;
  moduleId: string;
  moduleName: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export function QuestionBankView() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterModule, setFilterModule] = useState<string>("all");
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [newExplanation, setNewExplanation] = useState<string>("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIdx, setCorrectIdx] = useState<number>(0);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Cargar preguntas REALES de Firebase Realtime Database
  useEffect(() => {
    async function fetchRealQuestions() {
      setLoading(true);
      try {
        const bankSnap = await get(ref(rtdb, "question_bank"));
        if (bankSnap.exists()) {
          const val = bankSnap.val();
          const items: QuestionBankItem[] = Object.keys(val).map(key => ({
            id: key,
            ...val[key]
          }));
          setQuestions(items);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.warn("No se pudo leer question_bank en RTDB:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRealQuestions();
  }, []);

  // Exportar preguntas a CSV
  const handleExportCsv = () => {
    const headers = [
      "Identificador",
      "Modulo",
      "Pregunta",
      "Opcion 1",
      "Opcion 2",
      "Opcion 3",
      "Opcion 4",
      "Indice Correcto (0-3)",
      "Explicacion Pedagogica"
    ];

    const rows = questions.map(q => [
      q.id,
      q.moduleName,
      q.prompt,
      q.options[0] || "",
      q.options[1] || "",
      q.options[2] || "",
      q.options[3] || "",
      q.correctIndex,
      q.explanation
    ]);

    exportToCsv("Banco_Preguntas_IPT_Course", headers, rows);
  };

  // Exportar preguntas a JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "banco_preguntas_ipt_course.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar desde archivo JSON y guardar en RTDB
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const updated = [...questions, ...imported];
          setQuestions(updated);
          const bankObj: Record<string, any> = {};
          updated.forEach(item => {
            bankObj[item.id] = item;
          });
          await set(ref(rtdb, "question_bank"), bankObj);
          alert(`Se importaron y guardaron ${imported.length} preguntas en el banco oficial.`);
        }
      } catch (err) {
        alert("El archivo no contiene un formato JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  // Guardar nueva pregunta en RTDB
  const handleSaveQuestion = async () => {
    if (!newPrompt.trim() || newOptions.some(o => !o.trim())) {
      alert("Por favor completa el enunciado y las opciones de respuesta.");
      return;
    }

    const newId = `q-${Date.now()}`;
    const created: QuestionBankItem = {
      id: newId,
      moduleId: "modulo-1-introduccion",
      moduleName: "Módulo 1 · Cimientos Operativos",
      prompt: newPrompt,
      options: [...newOptions],
      correctIndex: correctIdx,
      explanation: newExplanation || "Explicación formativa añadida por el docente."
    };

    const updated = [...questions, created];
    setQuestions(updated);

    try {
      await set(ref(rtdb, `question_bank/${newId}`), created);
    } catch (err) {
      console.warn("Pregunta guardada localmente:", err);
    }

    setNewPrompt("");
    setNewExplanation("");
    setNewOptions(["", "", "", ""]);
    setIsAdding(false);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("¿Deseas eliminar esta pregunta del banco?")) return;
    setQuestions(questions.filter(q => q.id !== id));
    try {
      await remove(ref(rtdb, `question_bank/${id}`));
    } catch {}
  };

  const filteredQuestions = filterModule === "all"
    ? questions
    : questions.filter(q => q.moduleId === filterModule);

  return (
    <div className="space-y-6">
      {/* Action Toolbar Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">Banco de Preguntas Oficial</h2>
            <span className="text-[10px] font-mono font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">
              RTDB Sincronizado
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Preguntas persistidas en tiempo real. Importables y exportables para quizzes, checkpoints y exámenes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer transition-all active:scale-[0.97]">
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Importar JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={handleExportCsv}
            disabled={questions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={questions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          >
            <FileJson className="w-3.5 h-3.5 text-violet-400" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Pregunta</span>
          </button>
        </div>
      </div>

      {/* New Question Form */}
      {isAdding && (
        <div className="bg-[#121217] rounded-2xl border border-white/10 p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Nueva Pregunta de Opción Múltiple
            </span>
            <button onClick={() => setIsAdding(false)} className="text-xs text-zinc-400 hover:text-white">
              Cancelar
            </button>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Enunciado</label>
            <textarea
              rows={2}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Planteamiento técnico o zootécnico de la pregunta..."
              className="w-full text-xs text-white bg-[#181820] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-zinc-400 block">
              Opciones (Selecciona la correcta con el botón radial)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {newOptions.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2.5 bg-[#181820] p-2.5 rounded-xl border border-white/10">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctIdx === oIdx}
                    onChange={() => setCorrectIdx(oIdx)}
                    className="w-4 h-4 text-violet-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[oIdx] = e.target.value;
                      setNewOptions(updated);
                    }}
                    placeholder={`Opción ${String.fromCharCode(65 + oIdx)}`}
                    className="w-full text-xs bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">
              Explicación Formativa (Justificación que leerá el estudiante)
            </label>
            <textarea
              rows={2}
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              placeholder="Justificación pedagógica según normatividad técnica..."
              className="w-full text-xs text-white bg-[#181820] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveQuestion}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
            >
              Guardar en Firebase RTDB
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-16 text-center text-zinc-400 bg-[#121217] rounded-2xl border border-white/10">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Consultando banco de preguntas en Firebase RTDB...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredQuestions.length === 0 && (
        <div className="p-16 text-center bg-[#121217] rounded-2xl border border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#181820] text-zinc-500 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No hay preguntas registradas</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              El banco de preguntas en Firebase RTDB está vacío. Haz clic en "Nueva Pregunta" o importa un archivo JSON para nutrir el repositorio.
            </p>
          </div>
        </div>
      )}

      {/* Real Questions List */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-md space-y-3 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    {q.moduleName}
                  </span>
                  <p className="text-sm font-bold text-white tracking-tight">{q.prompt}</p>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                      optIdx === q.correctIndex
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold"
                        : "bg-[#181820] border-white/5 text-zinc-300"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        optIdx === q.correctIndex ? "bg-emerald-500 text-white" : "bg-[#22222c] text-zinc-400"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {optIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="p-3 bg-[#181820] rounded-xl text-[11px] text-zinc-400 border border-white/5 leading-relaxed">
                  <strong className="text-white">Fundamento:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
