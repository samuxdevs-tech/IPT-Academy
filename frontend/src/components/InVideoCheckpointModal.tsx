'use client';

import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { InVideoCheckpoint } from '@/types';
import { useModalA11y } from '@/hooks/useModalA11y';

interface InVideoCheckpointModalProps {
  checkpoint: InVideoCheckpoint;
  courseSlug: string;
  lessonId: string;
  onCorrectAnswer: () => void;
  onClose?: () => void;
}

export default function InVideoCheckpointModal({
  checkpoint,
  courseSlug,
  lessonId,
  onCorrectAnswer,
  onClose
}: InVideoCheckpointModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    correct: boolean;
    explanation: string;
  } | null>(null);
  const { containerRef } = useModalA11y({ isOpen: true, onClose: onClose || (() => {}) });

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (idx: number) => {
    if (evaluationResult) return;
    setSelectedIndex(idx);
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || isEvaluating) return;
    setIsEvaluating(true);

    try {
      const isCorrect = selectedIndex === checkpoint.correctIndex;
      setEvaluationResult({
        correct: isCorrect,
        explanation: checkpoint.explanation || (isCorrect ? '¡Excelente! Respuesta zootécnica correcta.' : 'Respuesta incorrecta. Revisa los conceptos del video.')
      });

      if (isCorrect) {
        onCorrectAnswer();
      }
    } catch (err) {
      console.error('Error evaluando checkpoint en video:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetry = () => {
    setEvaluationResult(null);
    setSelectedIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invideo-checkpoint-title"
        tabIndex={-1}
        className="bg-[#202230] border border-[#3d4055] rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl relative overflow-hidden my-auto outline-hidden"
      >
        {/* Glow decorativo de fondo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#6d28d2]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header con timestamp exacto */}
        <div className="flex items-center justify-between border-b border-[#33364a] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#6d28d2]/20 text-[#c0c4fc] border border-[#6d28d2]/40">
              <Sparkles className="w-4 h-4 text-[#a374f9]" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a374f9]">
                Punto de Control en Video ({formatSeconds(checkpoint.timestampSeconds)})
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Comprobación de Atención Activa
              </h3>
            </div>
          </div>
          <span className="text-xs bg-[#2e3146] text-[#b7b9cd] px-2.5 py-1 rounded-full border border-[#3d4055]">
            Pausa activa
          </span>
        </div>

        {/* Prompt */}
        <p className="text-sm text-[#e9eaf2] font-medium leading-relaxed mb-5">
          {checkpoint.prompt}
        </p>

        {/* Opciones */}
        <div className="space-y-2.5 mb-6">
          {checkpoint.options.map((option, idx) => {
            const isSelected = selectedIndex === idx;
            let btnClass = 'border-[#3d4055] bg-[#292c3d] text-[#e9eaf2] hover:border-[#6d28d2]/80 hover:bg-[#31354a]';

            if (evaluationResult) {
              if (evaluationResult.correct && idx === selectedIndex) {
                btnClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
              } else if (!evaluationResult.correct && isSelected) {
                btnClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
              } else {
                btnClass = 'border-[#33364a] bg-[#202230] text-[#71748a] opacity-60';
              }
            } else if (isSelected) {
              btnClass = 'border-[#a374f9] bg-[#6d28d2]/20 text-white font-medium shadow-sm';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={evaluationResult !== null}
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-3 transition-all ${btnClass}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isSelected
                      ? evaluationResult && !evaluationResult.correct ? 'bg-rose-600 text-white' : 'bg-[#6d28d2] text-white'
                      : 'bg-[#33364a] text-[#b7b9cd]'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {evaluationResult && evaluationResult.correct && idx === selectedIndex && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {evaluationResult && isSelected && !evaluationResult.correct && (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Retroalimentación tras responder */}
        {evaluationResult && (
          <div
            className={`p-4 rounded-xl border mb-5 text-xs sm:text-sm ${
              evaluationResult.correct
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="font-bold flex items-center gap-2 mb-1">
              {evaluationResult.correct ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Excelente deducción! Respuesta correcta.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Respuesta incorrecta.</span>
                </>
              )}
            </div>
            <p className="text-xs opacity-90 leading-relaxed mt-1">
              {evaluationResult.explanation}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#33364a]">
          <span className="text-[11px] text-[#8e92a8]">
            {evaluationResult?.correct
              ? 'Progreso acreditado en el servidor'
              : 'Selecciona una respuesta para continuar el video'}
          </span>

          <div className="flex items-center gap-2">
            {evaluationResult && !evaluationResult.correct && (
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#2e3146] hover:bg-[#393d56] text-[#e9eaf2] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Intentar de nuevo</span>
              </button>
            )}

            {!evaluationResult ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedIndex === null || isEvaluating}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedIndex !== null && !isEvaluating
                    ? 'bg-[#6d28d2] hover:bg-[#591fb0] text-white shadow-md'
                    : 'bg-[#33364a] text-[#71748a] cursor-not-allowed'
                }`}
              >
                <span>{isEvaluating ? 'Verificando...' : 'Comprobar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : evaluationResult.correct ? (
              <button
                type="button"
                onClick={onCorrectAnswer}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md animate-pulse"
              >
                <span>Reanudar Video</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
