"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  MessageSquare,
  Inbox,
  Eye,
  FileSpreadsheet,
  FileCode,
  Music,
  Video as VideoIcon,
  Image as ImageIcon
} from "lucide-react";
import {
  UniversalFilePreviewModal,
  PreviewableFile,
} from "@/components/UniversalFilePreviewModal";
import { ApiClient, SubmissionItem } from "@/lib/apiClient";
import { rtdb } from "@/lib/firebase";
import { ref, get, set, update } from "firebase/database";

export function QuickGradingView() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);

  const getFileIcon = (fileName: string) => {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (["mp4", "webm", "mov", "mkv"].includes(ext)) return <VideoIcon className="w-4 h-4 text-sky-400" />;
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return <Music className="w-4 h-4 text-purple-400" />;
    if (["xlsx", "xls", "csv", "ods"].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (["pdf"].includes(ext)) return <FileText className="w-4 h-4 text-rose-400" />;
    if (["docx", "doc", "odt"].includes(ext)) return <FileText className="w-4 h-4 text-blue-400" />;
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return <ImageIcon className="w-4 h-4 text-pink-400" />;
    if (["txt", "md", "json", "js", "ts", "py"].includes(ext)) return <FileCode className="w-4 h-4 text-indigo-400" />;
    return <FileText className="w-4 h-4 text-violet-400" />;
  };

  const [criterionGrades, setCriterionGrades] = useState<{ [key: string]: number }>({});
  const [feedbackText, setFeedbackText] = useState<string>("");

  useEffect(() => {
    async function fetchRealSubmissions() {
      setLoading(true);
      try {
        // 1. Consultar API de Cloudflare Workers para entregas reales
        const apiSubs = await ApiClient.getSubmissions();
        if (apiSubs && apiSubs.length > 0) {
          setSubmissions(apiSubs);
        } else {
          // 2. Consultar RTDB para entregas: submissions o lms_assignments
          const subSnap = await get(ref(rtdb, "submissions"));
          if (subSnap.exists()) {
            const val = subSnap.val();
            const list: SubmissionItem[] = Object.keys(val).map(k => ({
              id: k,
              assignment_id: val[k].assignment_id || "assign-01",
              student_uid: val[k].student_uid || val[k].student_id || "stu-001",
              student_name: val[k].student_name || "Estudiante IPT",
              student_email: val[k].student_email || "sin-correo@iptapps.com",
              submission_text_content: val[k].submission_text_content || "",
              submitted_at: val[k].submitted_at || new Date().toISOString(),
              status: val[k].status || 'pending',
              final_grade: val[k].final_grade ?? null,
              teacher_feedback_text: val[k].teacher_feedback_text || null,
              teacher_audio_r2_url: val[k].teacher_audio_r2_url || null,
              files: val[k].files || [],
              ...val[k]
            }));
            setSubmissions(list);
          } else {
            setSubmissions([]);
          }
        }
      } catch (err) {
        console.warn("No se pudieron cargar entregas:", err);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRealSubmissions();
  }, []);

  const currentSub = submissions[currentIndex];

  const calculateFinalGrade = (): number => {
    const grades = Object.values(criterionGrades);
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / grades.length) * 10) / 10;
  };

  const handleRunAiReview = async () => {
    if (!currentSub) return;
    setIsAiEvaluating(true);
    setAiSuggestion(null);

    const result = await ApiClient.requestAiReview(currentSub.id);
    setAiSuggestion(result);
    if (result?.generalFeedback) {
      setFeedbackText(result.generalFeedback);
    }
    if (result?.criteriaEvaluations && result.criteriaEvaluations.length > 0) {
      const updated: { [key: string]: number } = {};
      result.criteriaEvaluations.forEach((ce: any, i: number) => {
        updated[`crit-${i + 1}`] = ce.aiSuggestedPoints || 4.0;
      });
      setCriterionGrades(updated);
    }
    setIsAiEvaluating(false);
  };

  const handleSaveAndNext = async () => {
    if (!currentSub) return;
    const finalGrade = calculateFinalGrade();

    // 1. Guardar en RTDB: submissions
    try {
      await set(ref(rtdb, `submissions/${currentSub.id}`), {
        ...currentSub,
        status: "graded",
        final_grade: finalGrade,
        teacher_feedback_text: feedbackText,
        graded_at: new Date().toISOString(),
      });
    } catch {}

    // 2. Sincronizar en lms_assignments consumido por los estudiantes
    try {
      const asgSnap = await get(ref(rtdb, "lms_assignments"));
      if (asgSnap.exists()) {
        const val = asgSnap.val();
        const list = Array.isArray(val) ? val : Object.values(val);
        const updated = list.map((a: any) => {
          if (a.id === currentSub.assignment_id) {
            return {
              ...a,
              status: "graded",
              finalGrade: finalGrade,
              multimediaFeedback: {
                writtenFeedback: feedbackText,
                gradedAtUtc: new Date().toISOString(),
                gradedBy: "Docente Titular IPT",
              },
            };
          }
          return a;
        });
        await set(ref(rtdb, "lms_assignments"), updated);
      }
    } catch {}

    // 3. Sincronizar en progress/${student_uid} para el libro de notas del estudiante
    try {
      const courseSlug = (currentSub as any).courseSlug || (currentSub as any).course_slug || 'ipt-master-fullstack';
      const cutRaw = (currentSub as any).cutId || (currentSub as any).cut_id || 'corte1';
      const cutGradeKey = cutRaw.toLowerCase().includes('grade') ? cutRaw : `${cutRaw.replace(/-([0-9])/, '$1')}Grade`;
      await set(ref(rtdb, `progress/${currentSub.student_uid}/${courseSlug}/${cutGradeKey}`), finalGrade);
    } catch {}

    // 4. Respaldar en API si está disponible
    try {
      await ApiClient.saveGrading(currentSub.id, {
        finalGrade,
        teacherFeedbackText: feedbackText,
        criterionGrades,
      });
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setAiSuggestion(null);
        setFeedbackText("");
      }
    }, 800);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-zinc-400 bg-[#121217] rounded-2xl border border-white/10">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium">Consultando bandeja de entregas reales...</p>
      </div>
    );
  }

  if (submissions.length === 0 || !currentSub) {
    return (
      <div className="p-16 text-center bg-[#121217] rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Bandeja al Día · 0 Entregas Pendientes
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            No hay trabajos pendientes de calificación en este momento. Las nuevas entregas de los estudiantes aparecerán aquí para revisión consecutiva y asistencia por IA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Pagination Toolbar Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121217] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs font-mono">
            {currentIndex + 1}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{currentSub.student_name}</h3>
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <Clock className="w-3 h-3 text-zinc-500" />
              {currentSub.submitted_at || "Entregado recientemente"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentIndex === 0}
            onClick={() => {
              setCurrentIndex(currentIndex - 1);
              setAiSuggestion(null);
            }}
            className="p-2 border border-white/10 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all active:scale-[0.97]"
            title="Estudiante anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-white px-2 font-mono">
            {currentIndex + 1} / {submissions.length}
          </span>

          <button
            disabled={currentIndex === submissions.length - 1}
            onClick={() => {
              setCurrentIndex(currentIndex + 1);
              setAiSuggestion(null);
            }}
            className="p-2 border border-white/10 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all active:scale-[0.97]"
            title="Siguiente estudiante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunAiReview}
            disabled={isAiEvaluating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 text-xs font-bold transition-all active:scale-[0.97] ml-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiEvaluating ? "Analizando..." : "Revisión con IA"}</span>
          </button>

          <button
            onClick={handleSaveAndNext}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
          >
            {savedSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? "Guardado" : "Guardar & Siguiente"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Submission */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121217] border border-white/10 shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              Evidencia Entregada por el Estudiante
            </span>
            <span className="text-[10px] font-mono text-zinc-500">ID: {currentSub.id}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#181820] border border-white/5 text-xs text-zinc-200 leading-relaxed">
            <span className="font-bold text-zinc-400 uppercase text-[10px] block mb-1.5">
              Texto del Alumno:
            </span>
            {currentSub.submission_text_content || "Sin texto adjunto en el cuerpo del mensaje."}
          </div>

          {currentSub.files && currentSub.files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                  Archivos Adjuntos de la Entrega
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {currentSub.files.length} {currentSub.files.length === 1 ? "archivo" : "archivos"}
                </span>
              </div>

              <div className="space-y-2">
                {currentSub.files.map((file: any, fIdx: number) => {
                  const fileName = file.file_name || file.name || "Archivo adjunto";
                  const fileUrl = file.download_url || file.url || file.file_url || "";
                  const fileSize = file.file_size || file.size;

                  return (
                    <div
                      key={fIdx}
                      className="p-3.5 rounded-xl bg-[#161620] border border-white/5 hover:border-violet-500/30 flex items-center justify-between text-xs transition-all group"
                    >
                      <div
                        onClick={() => {
                          if (fileUrl) {
                            setPreviewFile({
                              name: fileName,
                              url: fileUrl,
                              size: fileSize,
                              type: file.file_type || file.type,
                            });
                          }
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {getFileIcon(fileName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                            {fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                            {fileSize ? (
                              <span>{Math.round(fileSize / 1024)} KB</span>
                            ) : (
                              <span>Documento</span>
                            )}
                            <span>•</span>
                            <span className="text-violet-400">Clic para previsualizar</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFile({
                                name: fileName,
                                url: fileUrl,
                                size: fileSize,
                                type: file.file_type || file.type,
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                            title="Previsualizar en pantalla sin descargar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Feedback Banner */}
          {aiSuggestion && (
            <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Sugerencia Pedagógica de Workers AI
                </span>
                <span className="text-xs font-bold font-mono text-violet-300 bg-violet-500/20 px-2.5 py-0.5 rounded-full border border-violet-500/30">
                  Nota sugerida: {aiSuggestion.suggestedFinalGrade?.toFixed(1) || "4.5"} / 5.0
                </span>
              </div>
              <p className="text-xs text-violet-200/90 leading-relaxed">
                {aiSuggestion.generalFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Criteria Grading */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#121217] border border-white/10 shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Calificación por Criterios
            </span>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-violet-400">
                {calculateFinalGrade().toFixed(1)} / 5.0
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">1. Rigor Matemático y Aforo</span>
                <span className="font-mono font-bold text-violet-400">{criterionGrades["crit-1"] || 4.5} pts</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5.0, 3.5, 1.5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCriterionGrades({ ...criterionGrades, "crit-1": val })}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all active:scale-[0.97] ${
                      criterionGrades["crit-1"] === val
                        ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30"
                        : "bg-[#181820] text-zinc-300 border-white/10 hover:bg-[#20202a]"
                    }`}
                  >
                    {val.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">2. Análisis Forrajero y Carga</span>
                <span className="font-mono font-bold text-violet-400">{criterionGrades["crit-2"] || 4.0} pts</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5.0, 3.5, 1.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => setCriterionGrades({ ...criterionGrades, "crit-2": val })}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all active:scale-[0.97] ${
                      criterionGrades["crit-2"] === val
                        ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30"
                        : "bg-[#181820] text-zinc-300 border-white/10 hover:bg-[#20202a]"
                    }`}
                  >
                    {val.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 block">
                Comentarios y Devolución Formativa
              </label>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Observaciones pedagógicas que leerá el estudiante..."
                className="w-full text-xs text-white leading-relaxed bg-[#181820] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Modal Universal de Previsualización de Archivos */}
      <UniversalFilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
