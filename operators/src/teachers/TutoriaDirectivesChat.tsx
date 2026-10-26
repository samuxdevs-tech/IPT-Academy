"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Shield,
  Clock,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Bot,
  User,
  RefreshCw,
  Calendar
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, push, remove } from "firebase/database";

interface DirectiveMessage {
  id: string;
  sender: "teacher" | "tutoria";
  text: string;
  time: string;
}

interface ActiveDirective {
  id: string;
  type: "block" | "recommend";
  description: string;
  createdAt: string;
}

export function TutoriaDirectivesChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<DirectiveMessage[]>([
    {
      id: "init-msg",
      sender: "tutoria",
      text: "Hola, profesor Iván. Soy TutorIA para docentes. Estoy atenta a tus directivas pedagógicas y de agenda. Puedes decirme qué horarios específicos recomendar o bloquear para los estudiantes.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputVal, setInputVal] = useState<string>("");
  const [directives, setDirectives] = useState<ActiveDirective[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Cargar directivas reales desde Firebase RTDB
  useEffect(() => {
    const dirRef = ref(rtdb, "tutoria_directives");
    const unsubscribe = onValue(
      dirRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: ActiveDirective[] = [];
          Object.entries(data).forEach(([id, item]: [string, any]) => {
            list.push({
              id,
              type: item.type === "block" ? "block" : "recommend",
              description: item.description || "Directiva de agenda",
              createdAt: item.createdAt || "Hoy"
            });
          });
          setDirectives(list);
        } else {
          setDirectives([]);
        }
        setLoading(false);
      },
      () => {
        setDirectives([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputVal.trim() || isSending) return;

    const userText = inputVal.trim();
    setInputVal("");
    setIsSending(true);

    const userMsg: DirectiveMessage = {
      id: `msg-${Date.now()}`,
      sender: "teacher",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);

    const lower = userText.toLowerCase();
    const isBlock = lower.includes("bloque") || lower.includes("no") || lower.includes("cancel");
    const directiveType: "block" | "recommend" = isBlock ? "block" : "recommend";

    try {
      const dirRef = ref(rtdb, "tutoria_directives");
      const newDirItem = push(dirRef);
      await set(newDirItem, {
        type: directiveType,
        description: userText,
        createdAt: new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }),
        teacherUid: "samuxdevs"
      });

      setTimeout(() => {
        const tutoriaReply: DirectiveMessage = {
          id: `reply-${Date.now()}`,
          sender: "tutoria",
          text: isBlock
            ? `Entendido perfectamente, profesor. He bloqueado esa franja horaria en la agenda. Cuando los estudiantes soliciten agendar conmigo en ese lapso, les informaré que no estás disponible y les sugeriré alternativas.`
            : `Excelente directiva, profesor Iván. He priorizado este horario en mi motor de recomendación. A los estudiantes que consulten por tutorías les propondré preferentemente estas horas.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, tutoriaReply]);
        setIsSending(false);
      }, 700);
    } catch (err) {
      setIsSending(false);
    }
  };

  const handleDeleteDirective = async (id: string) => {
    try {
      const itemRef = ref(rtdb, `tutoria_directives/${id}`);
      await remove(itemRef);
    } catch (err) {
      alert("No se pudo eliminar la directiva.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar Pro */}
      <div className="bg-[#121217] rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[#181820] hover:bg-[#20202c] border border-white/10 text-white transition-all active:scale-[0.97]"
            title="Volver a la vista previa"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                Canal Pedagógico Exclusivo
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              Chat Privado con TutorIA para Docentes
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dicta pautas de agenda, franjas recomendadas y bloqueos técnicos. TutorIA las aplicará en tiempo real cuando converse con los alumnos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Chat Interactivo Dark Pro */}
        <div className="lg:col-span-2 bg-[#121217] rounded-2xl border border-white/10 shadow-lg flex flex-col h-[560px] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-[#181820] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">TutorIA · Orquestadora de Agenda</h4>
                <p className="text-[10px] text-zinc-400 font-mono">Motor sincronizado con base de datos de estudiantes</p>
              </div>
            </div>
          </div>

          {/* Lista de Mensajes */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#0e0e14]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === "teacher" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === "teacher"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-[#181820] text-violet-400 border border-violet-500/20"
                  }`}
                >
                  {msg.sender === "teacher" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === "teacher"
                        ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                        : "bg-[#181820] text-white border border-white/10 shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div
                    className={`text-[10px] text-zinc-500 mt-1 px-1 font-mono ${
                      msg.sender === "teacher" ? "text-right" : ""
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Caja de Entrada */}
          <div className="p-4 bg-[#121217] border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe una directiva (ej: 'Bloquear martes de 14:00 a 16:00' o 'Recomendar viernes por la mañana')..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-[#181820] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputVal.trim() || isSending}
                className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-500 transition-all active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md shadow-violet-600/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Directivas Activas en RTDB */}
        <div className="bg-[#121217] rounded-2xl border border-white/10 shadow-lg p-6 flex flex-col h-[560px]">
          <div className="pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Directivas Activas en RTDB</h3>
              <p className="text-[11px] text-zinc-400">Reglas que TutorIA ejecuta en sus conversaciones</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              {directives.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {loading ? (
              <div className="p-8 text-center text-zinc-400">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-violet-500" />
                <p className="text-xs">Consultando reglas...</p>
              </div>
            ) : directives.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-white">Sin directivas vigentes</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Escribe en el chat para crear tu primera directiva de agenda o bloqueo.
                </p>
              </div>
            ) : (
              directives.map((dir) => (
                <div
                  key={dir.id}
                  className="p-3.5 rounded-xl bg-[#181820] border border-white/5 flex items-start justify-between gap-3"
                >
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${
                        dir.type === "block"
                          ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      }`}
                    >
                      {dir.type === "block" ? "Bloqueo Estricto" : "Horario Recomendado"}
                    </span>
                    <p className="text-xs font-medium text-white leading-snug">{dir.description}</p>
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">{dir.createdAt}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteDirective(dir.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Eliminar directiva"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
