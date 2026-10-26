"use client";

import React, { useState, useRef } from "react";
import {
  Mic,
  MicOff,
  Play,
  Square,
  Upload,
  Paperclip,
  Send,
  CheckCircle2,
  MessageSquare,
  Trash2,
  X,
  FileCheck
} from "lucide-react";

export function FeedbackToolsDrawer({
  studentName,
  onSaveFeedback,
  onClose
}: {
  studentName: string;
  onSaveFeedback: (feedback: { text: string; audioUrl?: string; fileAttachment?: string }) => void;
  onClose: () => void;
}) {
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Iniciar grabación de nota de voz con Web Audio API / MediaRecorder
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordedSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("No se pudo acceder al micrófono para grabar la nota de voz.");
    }
  };

  // Detener grabación de audio
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleDiscardAudio = () => {
    setAudioBlobUrl(null);
    setRecordedSeconds(0);
  };

  // Adjuntar archivo corregido (PDF, DOCX)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFileName(e.target.files[0].name);
    }
  };

  // Enviar retroalimentación completa
  const handleSubmit = () => {
    if (!feedbackText.trim() && !audioBlobUrl && !attachedFileName) {
      alert("Por favor ingresa al menos un comentario, nota de voz o archivo corregido.");
      return;
    }

    onSaveFeedback({
      text: feedbackText,
      audioUrl: audioBlobUrl || undefined,
      fileAttachment: attachedFileName || undefined
    });

    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Pro Drawer */}
        <div className="px-6 py-5 border-b border-white/10 bg-[#181820] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Devolución Pedagógica</h3>
              <p className="text-[11px] text-zinc-400">Estudiante: <strong className="text-white">{studentName}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del Drawer Dark Pro */}
        <div className="p-6 space-y-5">
          {/* 1. Comentario de Texto */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Observaciones del Docente
            </label>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Explica detalladamente las correcciones realizadas, aspectos destacados y sugerencias de mejora..."
              className="w-full text-xs border border-white/10 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 bg-[#181820] text-white placeholder-zinc-500 leading-relaxed"
            />
          </div>

          {/* 2. Nota de Voz */}
          <div className="p-4 rounded-xl bg-[#181820] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-violet-400" />
                Nota de Voz Grabada
              </span>
              {isRecording && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 animate-pulse font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Grabando ({formatTime(recordedSeconds)})
                </span>
              )}
            </div>

            {!audioBlobUrl ? (
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-zinc-400">
                  {isRecording
                    ? "Habla hacia tu micrófono para dejar una explicación personalizada."
                    : "Graba una explicación auditiva para mayor cercanía pedagógica."}
                </p>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-all active:scale-[0.97] shadow-sm"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Grabar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-all active:scale-[0.97]"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Finalizar
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pt-2">
                <audio src={audioBlobUrl} controls className="h-8 max-w-[280px]" />
                <button
                  type="button"
                  onClick={handleDiscardAudio}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar grabación y regrabar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 3. Adjuntar Archivo Corregido */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Archivo Corregido (PDF, DOCX o Anotaciones)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#181820] hover:bg-[#20202c] text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.97] border border-white/10">
                <Paperclip className="w-3.5 h-3.5 text-violet-400" />
                <span>Seleccionar Archivo</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {attachedFileName && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[180px]">{attachedFileName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#181820] border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-violet-600/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Retroalimentación</span>
          </button>
        </div>
      </div>
    </div>
  );
}
