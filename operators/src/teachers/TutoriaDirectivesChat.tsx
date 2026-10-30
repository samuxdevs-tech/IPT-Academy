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
  Calendar,
  AlertCircle
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

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_API_KEY =
  process.env.NEXT_PUBLIC_GROQ_API_KEY ||
  process.env.GROQ_API_KEY ||
  "";

const TEACHER_TOOLS = [
  {
    type: "function",
    function: {
      name: "eliminar_directiva",
      description:
        "Elimina o levanta una directiva o bloqueo existente de la agenda. Úsala cuando el docente solicite eliminar, borrar, quitar, levantar o revocar una regla, horario bloqueado o recomendación existente.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: ["string", "null"],
            description: "ID exacto de la directiva en RTDB a eliminar (ej: '-P51lDj-LsnlMSHr-lFG')"
          },
          criterio: {
            type: ["string", "null"],
            description: "Texto o palabras clave de la directiva si no se tiene el ID exacto"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_directiva",
      description:
        "Crea una nueva directiva de agenda. Úsala cuando el docente solicite bloquear una franja/día ('block') o recomendar/priorizar un horario ('recommend'). NUNCA la invoques si el docente está pidiendo eliminar o quitar una regla existente.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["block", "recommend"],
            description: "'block' para bloqueos estrictos; 'recommend' para horarios recomendados"
          },
          description: {
            type: "string",
            description: "Descripción concisa y profesional de la directiva a aplicar"
          }
        },
        required: ["type", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_directivas",
      description: "Consulta y lista las directivas de agenda actualmente activas.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

export function TutoriaDirectivesChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<DirectiveMessage[]>([
    {
      id: "init-msg",
      sender: "tutoria",
      text: "Hola, profesor Iván. Soy TutorIA para docentes. Estoy atenta a tus directivas pedagógicas y de agenda. Puedes decirme qué horarios específicos recomendar, bloquear o eliminar para los estudiantes.",
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

  const handleDeleteDirective = async (id: string) => {
    try {
      const itemRef = ref(rtdb, `tutoria_directives/${id}`);
      await remove(itemRef);
    } catch (err) {
      alert("No se pudo eliminar la directiva.");
    }
  };

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

    // Resumen formateado de directivas para el LLM
    const directivesSummary =
      directives.length === 0
        ? "No hay directivas activas en la agenda actualmente."
        : directives
            .map(
              (d) =>
                `- ID "${d.id}": [${d.type.toUpperCase()}] "${d.description}" (creada el ${d.createdAt})`
            )
            .join("\n");

    const systemPrompt = `Eres TutorIA para Docentes, la asistente ejecutiva de agenda y orquestadora pedagógica personal del Ing. Iván Pérez (Docente Titular y Director de IPT Academy).
Tu misión es gestionar las directivas de agenda que los alumnos verán y obedecerán al interactuar con TutorIA.

DIRECTIVAS ACTIVAS EN ESTE MOMENTO EN LA AGENDA:
${directivesSummary}

INSTRUCCIONES CLAVE DE RESOLUCIÓN:
1. ELIMINACIÓN DE DIRECTIVAS:
   - Si el profesor Iván pide eliminar, quitar, borrar o levantar una regla o bloqueo existente (ej: "Elimina el bloqueo de 1 pm a 8pm", "quita la directiva...", "borra el bloqueo"):
     Revisa la lista de directivas activas, identifica el ID correspondiente y llama a 'eliminar_directiva' con su ID.
     ¡NUNCA crees una nueva directiva de bloqueo cuando te están pidiendo eliminarla!
2. CREACIÓN DE DIRECTIVAS:
   - Si pide un bloqueo (ej: "No me agendes antes de...", "bloquea viernes..."): llama a 'crear_directiva' con type: "block".
   - Si pide una recomendación (ej: "Recomienda los lunes...", "prioriza las mañanas..."): llama a 'crear_directiva' con type: "recommend".
3. CONSULTAS Y CONVERSACIÓN:
   - Si saluda o hace preguntas generales, responde con trato respetuoso, ejecutivo y cercano ("profesor Iván"), con naturalidad humana y sin invocar herramientas innecesarias.`;

    try {
      // 1. Invocación a Groq Cloud con Tool Calling
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-4).map((m) => ({
              role: m.sender === "teacher" ? "user" : "assistant",
              content: m.text
            })),
            { role: "user", content: userText }
          ],
          tools: TEACHER_TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
          max_tokens: 512
        })
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const choice = groqData?.choices?.[0]?.message;

        if (choice?.tool_calls && choice.tool_calls.length > 0) {
          const toolCall = choice.tool_calls[0];
          const toolName = toolCall.function?.name;
          let toolArgs: Record<string, any> = {};
          try {
            toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
          } catch {}

          if (toolName === "eliminar_directiva") {
            const targetId = toolArgs.id;
            let matched = directives.find((d) => d.id === targetId);

            // Búsqueda difusa si no coincide por ID directo
            if (!matched && toolArgs.criterio) {
              const critLower = toolArgs.criterio.toLowerCase();
              matched = directives.find((d) => d.description.toLowerCase().includes(critLower));
            }
            if (!matched) {
              const userLower = userText.toLowerCase();
              matched = directives.find((d) => {
                const desc = d.description.toLowerCase();
                return (
                  (desc.includes("1") && desc.includes("8")) ||
                  desc.includes("1pm") ||
                  desc.includes("bloqueo") ||
                  userLower.includes(desc) ||
                  desc.includes(userLower)
                );
              });
            }

            if (matched) {
              await remove(ref(rtdb, `tutoria_directives/${matched.id}`));
              const replyMsg: DirectiveMessage = {
                id: `reply-${Date.now()}`,
                sender: "tutoria",
                text: `Entendido perfectamente, profesor Iván. He eliminado la directiva de bloqueo "${matched.description}". Esa franja horaria queda liberada y disponible en la agenda para los estudiantes.`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              };
              setMessages((prev) => [...prev, replyMsg]);
            } else {
              const replyMsg: DirectiveMessage = {
                id: `reply-${Date.now()}`,
                sender: "tutoria",
                text: `Profesor Iván, no encontré una directiva activa que coincida exactamente con ese horario. Actualmente tienes vigentes:\n${directivesSummary}`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              };
              setMessages((prev) => [...prev, replyMsg]);
            }
            setIsSending(false);
            return;
          }

          if (toolName === "crear_directiva") {
            const dirRef = ref(rtdb, "tutoria_directives");
            const newDirItem = push(dirRef);
            await set(newDirItem, {
              type: toolArgs.type === "block" ? "block" : "recommend",
              description: toolArgs.description || userText,
              createdAt: new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }),
              teacherUid: "samuxdevs"
            });

            const replyMsg: DirectiveMessage = {
              id: `reply-${Date.now()}`,
              sender: "tutoria",
              text:
                toolArgs.type === "block"
                  ? `Entendido perfectamente, profesor Iván. He registrado el bloqueo estricto: "${toolArgs.description}". Cuando los estudiantes soliciten sesiones en ese rango, les informaré que no estás disponible y les sugeriré otros horarios.`
                  : `Excelente directiva, profesor Iván. He priorizado este horario: "${toolArgs.description}". A los alumnos que consulten por tutorías les recomendaré preferentemente estos turnos.`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
            setMessages((prev) => [...prev, replyMsg]);
            setIsSending(false);
            return;
          }

          if (toolName === "consultar_directivas") {
            const replyMsg: DirectiveMessage = {
              id: `reply-${Date.now()}`,
              sender: "tutoria",
              text: `Profesor Iván, estas son tus directivas de agenda activas en este momento:\n\n${directivesSummary}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
            setMessages((prev) => [...prev, replyMsg]);
            setIsSending(false);
            return;
          }
        }

        // Respuesta conversacional directa del modelo
        const replyText = choice?.content?.trim();
        if (replyText) {
          const replyMsg: DirectiveMessage = {
            id: `reply-${Date.now()}`,
            sender: "tutoria",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          };
          setMessages((prev) => [...prev, replyMsg]);
          setIsSending(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Groq request failed, evaluating fallback:", err);
    }

    // RESOLUCIÓN SEMÁNTICA DE FALLBACK (SI GROQ NO RESPONDIÓ)
    const lower = userText.toLowerCase();
    const isDeleteIntent =
      lower.includes("elimina") ||
      lower.includes("borra") ||
      lower.includes("quita") ||
      lower.includes("remover") ||
      lower.includes("desbloque") ||
      lower.includes("levantar");

    if (isDeleteIntent) {
      // Buscar la directiva a eliminar
      const matched = directives.find((d) => {
        const desc = d.description.toLowerCase();
        return (
          (desc.includes("1") && desc.includes("8")) ||
          desc.includes("1pm") ||
          desc.includes("8pm") ||
          lower.includes(desc) ||
          desc.includes("bloqueo")
        );
      });

      if (matched) {
        await remove(ref(rtdb, `tutoria_directives/${matched.id}`));
        const tutoriaReply: DirectiveMessage = {
          id: `reply-${Date.now()}`,
          sender: "tutoria",
          text: `Entendido perfectamente, profesor Iván. He eliminado la directiva: "${matched.description}". Esa franja queda liberada en la agenda.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, tutoriaReply]);
      } else {
        const tutoriaReply: DirectiveMessage = {
          id: `reply-${Date.now()}`,
          sender: "tutoria",
          text: `Profesor Iván, no encontré una directiva que coincida con esa solicitud. Puedes usar el botón de papelera en el panel derecho si deseas retirar alguna regla.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, tutoriaReply]);
      }
      setIsSending(false);
      return;
    }

    // Caso de creación estándar de directiva
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

      const tutoriaReply: DirectiveMessage = {
        id: `reply-${Date.now()}`,
        sender: "tutoria",
        text: isBlock
          ? `Entendido perfectamente, profesor Iván. He registrado el bloqueo estricto en la agenda. Cuando los estudiantes soliciten agendar conmigo en ese lapso, les informaré que no estás disponible y les sugeriré alternativas.`
          : `Excelente directiva, profesor Iván. He priorizado este horario en mi motor de recomendación. A los estudiantes que consulten por tutorías les propondré preferentemente estas horas.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, tutoriaReply]);
    } catch {
      const tutoriaReply: DirectiveMessage = {
        id: `reply-${Date.now()}`,
        sender: "tutoria",
        text: "Hubo un error de conexión al procesar la directiva en la base de datos. Por favor reintenta.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, tutoriaReply]);
    } finally {
      setIsSending(false);
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
                placeholder="Escribe una directiva (ej: 'Elimina el bloqueo de 1 a 8pm', 'Recomendar lunes por la mañana')..."
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
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
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
