'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, X, Sparkles, RefreshCw, BookOpen } from 'lucide-react';
import { QuizQuestion } from '@/types';
import confetti from 'canvas-confetti';
import { useModalA11y } from '@/hooks/useModalA11y';

interface PopQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  questions: QuizQuestion[];
  lessonTitle: string;
  onComplete?: (passed: boolean) => void;
}

export default function PopQuizModal({
  isOpen,
  onClose,
  title,
  questions,
  lessonTitle,
  onComplete
}: PopQuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { containerRef } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSelectOption = (qId: string, idx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qId]: idx }));
  };

  const correctCount = questions.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;
  const total = questions.length || 1;
  const scorePercent = Math.round((correctCount / total) * 100);
  const passed = scorePercent >= 70;

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (onComplete) {
      onComplete(passed);
    }
    if (scorePercent >= 70) {
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // Confetti fallback
        }
      }
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  const allAnswered = questions.length > 0 && questions.every(q => selectedAnswers[q.id] !== undefined);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pop-quiz-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-xl w-full border border-[#d1d2e0] shadow-2xl overflow-hidden my-6 outline-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#202230] to-[#2a2b3f] text-white p-5 flex items-start justify-between border-b border-[#3d4055]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6d28d2]/30 text-[#c0c4fc] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#c0c4fc]" />
              Pop Quiz de Refuerzo
            </div>
            <h3 id="pop-quiz-modal-title" className="text-lg font-bold tracking-tight text-white">{title}</h3>
            <p className="text-xs text-[#b7b9cd] flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lessonTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar cuestionario"
            className="p-1.5 text-[#b7b9cd] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-[#595c73] space-y-2">
              <HelpCircle className="w-10 h-10 mx-auto text-[#9194ac]" />
              <p className="font-semibold text-sm">Este recurso no tiene preguntas configuradas aún.</p>
            </div>
          ) : (
            questions.map((q, qIndex) => {
              const selectedIdx = selectedAnswers[q.id];
              const isQCorrect = selectedIdx === q.correctIndex;

              return (
                <div key={q.id || qIndex} className="space-y-3 pb-5 border-b border-[#e9eaf2] last:border-b-0">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#f6f7f9] border border-[#d1d2e0] text-[#595c73] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {qIndex + 1}
                    </span>
                    <p className="text-sm font-semibold text-[#2a2b3f] leading-snug">
                      {q.prompt}
                    </p>
                  </div>

                  <div className="space-y-2 pl-8">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedIdx === oIdx;
                      let optionStyle = 'border-[#d1d2e0] bg-white text-[#2a2b3f] hover:border-[#6d28d2]/50 hover:bg-[#f6f7f9]';

                      if (isSubmitted) {
                        if (oIdx === q.correctIndex) {
                          optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                        } else if (isSelected && !isQCorrect) {
                          optionStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                        } else {
                          optionStyle = 'border-[#e9eaf2] bg-[#f6f7f9] opacity-60 text-[#595c73]';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-[#6d28d2] bg-[#6d28d2]/10 text-[#6d28d2] font-semibold';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, oIdx)}
                          disabled={isSubmitted}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                        >
                          <span>{opt}</span>
                          {isSubmitted && oIdx === q.correctIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                          {isSubmitted && isSelected && !isQCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}

                    {isSubmitted && q.explanation && (
                      <div className="mt-2 p-3 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg text-xs text-[#595c73] leading-relaxed shadow-xs">
                        <strong className="text-[#2a2b3f]">Fundamento: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f6f7f9] px-6 py-4 border-t border-[#d1d2e0] flex items-center justify-between">
          {isSubmitted ? (
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {passed ? '¡Aprobado!' : 'Requiere repaso'} ({scorePercent}%)
                </span>
                <span className="text-xs text-[#595c73]">
                  {correctCount} de {total} correctas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-[#d1d2e0] bg-white text-[#595c73] text-xs font-semibold hover:bg-[#f6f7f9] flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-[#2a2b3f] text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#595c73]">
                {Object.keys(selectedAnswers).length} de {questions.length} respondidas
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || questions.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-[#6d28d2] text-white text-xs font-bold hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Verificar Respuestas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
