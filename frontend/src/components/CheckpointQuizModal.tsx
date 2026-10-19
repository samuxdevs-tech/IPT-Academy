'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Award, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { QuizQuestion } from '@/types';
import { useModalA11y } from '@/hooks/useModalA11y';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  lessonTitle: string;
  courseSlug: string;
  lessonId: string;
  onQuizPassed: () => void;
  onNextLesson?: () => void;
  nextLessonTitle?: string;
}

export default function CheckpointQuizModal({
  isOpen,
  onClose,
  questions,
  lessonTitle,
  courseSlug,
  lessonId,
  onQuizPassed,
  onNextLesson,
  nextLessonTitle
}: CheckpointModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { containerRef } = useModalA11y({ isOpen, onClose });
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    correctCount: number;
    totalQuestions: number;
    feedback: Array<{
      id: string;
      isCorrect: boolean;
      correctIndex: number;
      explanation: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAnswers({});
      setResult(null);
    }
  }, [lessonId, isOpen]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (result) return; // Ya calificado
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let correctCount = 0;
      const feedback = questions.map((q) => {
        const isCorrect = selectedAnswers[q.id] === q.correctIndex;
        if (isCorrect) correctCount++;
        return {
          id: q.id,
          isCorrect,
          correctIndex: q.correctIndex,
          explanation: q.explanation
        };
      });

      const totalQuestions = questions.length || 1;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= 70;

      const evalResult = {
        passed,
        score,
        correctCount,
        totalQuestions,
        feedback
      };

      setResult(evalResult);
      if (passed) {
        onQuizPassed();
      }
    } catch (err) {
      console.error('Error calificando evaluación:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedAnswers({});
  };

  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkpoint-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-2xl w-full border border-[#d1d2e0] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 outline-hidden"
      >
        {/* Header */}
        <div className="bg-[#202230] text-white p-6 border-b border-[#3d4055] flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#c0c4fc] uppercase tracking-wider">
              Evaluación de Conocimiento
            </span>
            <h3 id="checkpoint-modal-title" className="text-lg font-bold text-white leading-snug">
              Comprobación de Aprendizaje
            </h3>
            <p className="text-xs text-[#b7b9cd]">{lessonTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar evaluación"
            className="text-[#9194ac] hover:text-white p-1 rounded-lg hover:bg-[#33364a] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {!result ? (
            <>
              <div className="p-3.5 bg-[#f6f7f9] rounded-xl border border-[#e9eaf2] text-xs text-[#595c73] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#6d28d2] shrink-0" />
                <span>
                  Responde las siguientes preguntas zootécnicas para validar tu comprensión y marcar la clase como completada (mínimo 70%).
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3">
                    <p className="text-sm font-bold text-[#2a2b3f] leading-snug">
                      {idx + 1}. {q.prompt}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[q.id] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'border-[#6d28d2] bg-purple-50 text-[#6d28d2] font-semibold'
                                : 'border-[#d1d2e0] hover:bg-[#f6f7f9] text-[#2a2b3f]'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-[#6d28d2] bg-[#6d28d2]' : 'border-[#9194ac]'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Resultados de la Evaluación */
            <div className="space-y-6">
              <div
                className={`p-6 rounded-2xl border text-center space-y-2 ${
                  result.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 bg-white shadow-xs">
                  {result.passed ? (
                    <Award className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-rose-600" />
                  )}
                </div>
                <h4 className="text-xl font-bold">
                  {result.passed ? '¡Excelente! Lección Aprobada' : 'Aún no alcanzas el puntaje mínimo'}
                </h4>
                <p className="text-sm font-semibold">
                  Obtuviste {result.correctCount} de {result.totalQuestions} respuestas correctas ({result.score}%)
                </p>
                <p className="text-xs opacity-80 max-w-md mx-auto">
                  {result.passed
                    ? 'Has demostrado comprensión de los conceptos clave. La lección ha quedado registrada como completada en tu avance.'
                    : 'Revisa las explicaciones zootécnicas a continuación e inténtalo nuevamente para certificar tu aprendizaje.'}
                </p>
              </div>

              {/* Detalle de Respuestas y Explicaciones */}
              <div className="space-y-4 pt-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-[#595c73]">
                  Retroalimentación Técnico-Zootécnica
                </h5>
                {result.feedback.map((fb, idx) => (
                  <div
                    key={fb.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      fb.isCorrect ? 'bg-white border-emerald-200' : 'bg-white border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {fb.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-[#2a2b3f]">Pregunta {idx + 1}</span>
                    </div>
                    <p className="text-[#595c73] bg-[#f6f7f9] p-3 rounded-lg border border-[#e9eaf2] leading-relaxed">
                      <strong className="text-[#2a2b3f] block mb-1">Fundamento:</strong>
                      {fb.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f6f7f9] border-t border-[#e9eaf2] p-4 px-6 flex items-center justify-between">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f]"
              >
                Repasar video antes
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className="px-5 py-2.5 rounded-lg bg-[#6d28d2] text-white text-xs font-bold hover:bg-[#591fb0] disabled:opacity-50 transition-all shadow-xs"
              >
                {isSubmitting ? 'Calificando...' : 'Comprobar Aprendizaje'}
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              {!result.passed ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f]"
                  >
                    Repasar clase
                  </button>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 rounded-lg border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2]/5 flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Evaluación</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] hover:bg-white text-xs font-semibold transition-all"
                  >
                    Quedarme en esta lección
                  </button>
                  {onNextLesson ? (
                    <button
                      onClick={() => {
                        onClose();
                        onNextLesson();
                      }}
                      title={nextLessonTitle ? `Siguiente: ${nextLessonTitle}` : undefined}
                      className="px-5 py-2.5 rounded-lg bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                      <span>Ir a la siguiente lección</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-lg bg-[#202230] text-white text-xs font-bold hover:bg-[#33364a] transition-all"
                    >
                      Finalizar evaluación
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
