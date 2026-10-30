/**
 * groqTutorService.ts
 * Servicio autónomo de inteligencia artificial para TutorIA en IPT Academy.
 * Motor: Groq Cloud (openai/gpt-oss-120b) con Tool / Function Calling.
 * Gobernado por las 5 Directrices Inviolables de IPT Academy.
 */

export interface GroqTutorContext {
  studentName: string;
  roleLabel: string;
  planTitle: string;
  availableCredits: number;
  consumedCredits: number;
  cycleEnd?: string;
  activeBookings: Array<{
    id: string;
    sessionId: string;
    title: string;
    instructorName: string;
    startTimeUtc: string;
    bookedAt: string;
  }>;
  availableSessions: Array<{
    id: string;
    title: string;
    instructorName: string;
    startTimeUtc: string;
    durationMinutes: number;
    courseSlug: string;
  }>;
  teacherDirectives: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  coursesSummary: string;
  assignmentsSummary: string;
}

export interface GroqChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GroqToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface GroqTutorResponse {
  text?: string;
  toolCall?: GroqToolCall;
  fromCache?: boolean;
}

// ============================================================================
// CAPA DE CACHÉ DE IA: PETICIONES IDÉNTICAS NO SE VUELVEN A GENERAR
// ============================================================================
interface CachedEntry {
  response: GroqTutorResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de persistencia

export const TutorAiCache = {
  get: (key: string): GroqTutorResponse | null => {
    // 1. Memoria RAM
    const inMem = memoryCache.get(key);
    if (inMem && Date.now() - inMem.timestamp < CACHE_TTL_MS) {
      const t = inMem.response.text || '';
      if (!t.includes('¿En qué puedo ayudarte') && !t.includes('intermitencia de conexión')) {
        return { ...inMem.response, fromCache: true };
      }
    }

    // 2. Persistencia en LocalStorage para recargas de página
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ipt_tutor_cache_${key}`);
        if (stored) {
          const parsed: CachedEntry = JSON.parse(stored);
          const t = parsed?.response?.text || '';
          if (
            t.includes('¿En qué puedo ayudarte') ||
            t.includes('intermitencia de conexión') ||
            !t.trim()
          ) {
            localStorage.removeItem(`ipt_tutor_cache_${key}`);
            return null;
          }
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(key, parsed);
            return { ...parsed.response, fromCache: true };
          } else {
            localStorage.removeItem(`ipt_tutor_cache_${key}`);
          }
        }
      } catch {}
    }
    return null;
  },

  set: (key: string, response: GroqTutorResponse): void => {
    const t = response?.text || '';
    // Nunca cachear respuestas genéricas de error o fallbacks vacíos
    if (
      !t.trim() ||
      t.includes('¿En qué puedo ayudarte') ||
      t.includes('intermitencia de conexión')
    ) {
      return;
    }
    const entry: CachedEntry = { response, timestamp: Date.now() };
    memoryCache.set(key, entry);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ipt_tutor_cache_${key}`, JSON.stringify(entry));
      } catch {}
    }
  }
};

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_CLIENT_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';

const postToTutorApi = async (payload: Record<string, any>) => {
  // En Next.js exportado estáticamente para Firebase Hosting, invocamos directamente a Groq Cloud con CORS
  if (GROQ_CLIENT_KEY) {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_CLIENT_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        ...payload
      })
    });
    if (groqRes.ok) {
      return groqRes;
    }
    const errText = await groqRes.text().catch(() => '');
    throw new Error(`Groq API (${groqRes.status}): ${errText || groqRes.statusText}`);
  }

  // Fallback para entornos con API route activa verificando que la respuesta sea JSON real
  const localRes = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const cType = localRes.headers.get('content-type') || '';
  if (localRes.ok && cType.includes('application/json')) {
    return localRes;
  }
  throw new Error('No se pudo establecer conexión con el motor de IA.');
};

const TUTOR_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'agendar_cita',
      description:
        'OBLIGATORIA: Invoca esta herramienta SIEMPRE que el estudiante exprese la intención de agendar, programar, tomar una clase, reservar horario, o mencione una hora específica (ej: "a las 4pm", "a las 10am") o plazos relativos (ej: "dentro de 3h", "en 2 horas"). Pasa en horaDeseada la hora o plazo indicado.',
      parameters: {
        type: 'object',
        properties: {
          horaDeseada: {
            type: ['string', 'null'],
            description:
              'Hora o plazo solicitado por el estudiante (ej: "dentro de 3h", "a las 4pm", "10:30 am", "mañana a las 8am"), o null si no especificó hora'
          },
          motivo: {
            type: ['string', 'null'],
            description: 'Tema académico o motivo de la tutoría, o null si no lo especificó'
          },
          sessionId: {
            type: ['string', 'null'],
            description: 'ID de la sesión específica si fue seleccionada o referenciada, o null'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_cita',
      description:
        'Cancela una cita activa del estudiante o muestra sus citas activas para que elija. Úsala cuando el estudiante pida cancelar, anular, eliminar o descartar una clase o cita.',
      parameters: {
        type: 'object',
        properties: {
          forzarSinReembolso: {
            type: ['boolean', 'null'],
            description:
              'true si el estudiante dice "igualmente", "de igual manera", "aunque no devuelvas el credito", "sin crédito", "de todas formas", "no importa", "cancela igual", o insiste en que se cancele la cita a pesar de no recibir reembolso. false solo si es una pregunta o petición inicial ordinaria, o null.'
          },
          motivo: {
            type: ['string', 'null'],
            description: 'Razón de la cancelación si fue expresada por el estudiante, o null'
          },
          bookingId: {
            type: ['string', 'null'],
            description: 'ID de la reserva específica si fue indicada, o null'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_citas',
      description:
        'Consulta y muestra las citas o tutorías sincrónicas activas y programadas del estudiante en pantalla con herramientas de gestión (cancelar, entrar al aula /live). Úsala cuando el estudiante pregunte por sus citas, su agenda, qué clases tiene pendientes o quiera revisar sus reservas.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_creditos',
      description:
        'Consulta el balance actual de créditos disponibles y consumidos del estudiante para clases en vivo.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_reglas',
      description:
        'Consulta las directrices y normas institucionales de agendamiento, cancelación, horarios y quórum de IPT Academy.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_tareas',
      description:
        'Consulta las tareas pendientes, calificaciones y fechas de entrega del estudiante.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

export async function askTutorIAWithGroq(
  prompt: string,
  history: GroqChatMessage[],
  ctx: GroqTutorContext
): Promise<GroqTutorResponse> {
  // Generar clave canónica de caché basada en contexto del estudiante y su petición
  const cacheKey = [
    ctx.studentName.toLowerCase().trim(),
    prompt.toLowerCase().trim(),
    `cred_${ctx.availableCredits}`,
    `bkg_${ctx.activeBookings.length}`,
    history.length > 0 ? (history[history.length - 1]?.content || '') : 'init'
  ].join('__');

  // Si la petición es idéntica en este mismo contexto, devolver de caché inmediatamente
  const cachedResponse = TutorAiCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  const bookingsDescription =
    ctx.activeBookings.length === 0
      ? 'El estudiante NO tiene ninguna cita activa agendada en este momento.'
      : ctx.activeBookings
          .map(
            (b, idx) =>
              `Cita #${idx + 1} (ID: "${b.id}", Sesión: "${b.sessionId}"): "${b.title}" con ${b.instructorName}. Horario programado: ${b.startTimeUtc}. Reservada el: ${b.bookedAt}.`
          )
          .join('\n');

  const sessionsDescription =
    ctx.availableSessions.length === 0
      ? 'No hay sesiones programadas en cartelera en este momento.'
      : ctx.availableSessions
          .map(
            (s) =>
              `- Sesión ID "${s.id}": "${s.title}" con ${s.instructorName}. Horario: ${s.startTimeUtc} (${s.durationMinutes} min). Curso: ${s.courseSlug}.`
          )
          .join('\n');

  const directivesDescription =
    ctx.teacherDirectives.length === 0
      ? 'Sin directivas docentes activas.'
      : ctx.teacherDirectives
          .map((d) => `[Directiva ${d.type.toUpperCase()}]: ${d.description}`)
          .join(' ; ');

  const systemPrompt = `Eres TutorIA, el tutor personal, pedagogo y asistente de inteligencia artificial de IPT Academy para el estudiante ${ctx.studentName}.
Posees autonomía resolutiva total para guiar pedagógicamente al estudiante, responder dudas académicas del plan de estudios y gestionar citas sincrónicas invocando herramientas de sistema (Function Calling).

PERSONALIDAD, TONO Y VOZ:
- Eres una IA con personalidad auténtica: cercana, empática, culta, inteligente y con un toque de carisma y calidez humana.
- PROHIBIDO hablar como un contestador automático o usar plantillas acartonadas (como "Hola Ivan Samuel. En tu plan Pro+ dispones de..."). Cada respuesta tuya debe ser fresca, conversacional y adaptada exactamente a lo que el estudiante te dice.
- Si el estudiante te habla con confianza, bromas o te pide favores especiales (por ejemplo: "Regálame un crédito", "hazme una rebaja", "échame una mano"), respóndele con simpatía, naturalidad y buen humor, pero dejando claras las directrices institucionales (por ejemplo, reconociendo que te encantaría regalarle créditos para que siga estudiando, pero que el sistema contable de la academia no te lo permite).
- Habla en un español impecable, natural y motivador.

INFORMACIÓN DEL ESTUDIANTE EN TIEMPO REAL:
- Estudiante: ${ctx.studentName} (${ctx.roleLabel})
- Plan de suscripción: ${ctx.planTitle}
- Bolsa de créditos en vivo: ${ctx.availableCredits} disponibles (${ctx.consumedCredits} consumidos en el ciclo actual).
- Citas activas agendadas:
${bookingsDescription}
- Sesiones disponibles en cartelera:
${sessionsDescription}
- Directivas docentes en vivo:
${directivesDescription}
- Contenido del curso:
${ctx.coursesSummary}
- Tareas y entregas:
${ctx.assignmentsSummary}

DIRECTRICES INVIOLABLES DE GESTIÓN:
1. CONTABILIDAD INVIOLABLE DE CRÉDITOS:
   - 1 cita = 1 crédito descontado de la bolsa mensual.
   - TutorIA NO puede inventar, regalar ni añadir créditos. Si el estudiante te pide que le regales créditos o pide agendar teniendo 0 créditos disponibles, explícaselo con amabilidad y carisma, e indícale que actualmente tiene ${ctx.availableCredits} créditos.
2. FRANJA INSTITUCIONAL DE TUTORÍAS (7:00 AM a 10:00 PM COT):
   - Las tutorías sincrónicas con docentes operan EXCLUSIVAMENTE entre las 7:00 AM y las 10:00 PM (hora Colombia).
   - NUNCA agendes ni confirmes citas en horas de madrugada (como 5:00 AM, 3:00 AM o 2:00 AM) ni pasada la medianoche.
   - Si el estudiante solicita una hora fuera de franja (ejemplo: "Quiero agendar a las 5am"), explícale amablemente y con empatía que la franja institucional es de 7:00 AM a 10:00 PM, y ofrécele de inmediato las alternativas más cercanas (ej. 7:00 AM u 8:00 AM). Llama a la herramienta 'agendar_cita' indicando esa alternativa.
3. POLÍTICA DE CANCELACIONES Y REEMBOLSOS:
   - Anticipación reglamentaria: La cancelación ordinaria con más de 4 horas de anticipación reintegra el crédito de inmediato.
   - Ventana de gracia por error de reserva: Si el estudiante reservó hace menos de 30 minutos y dice que fue un error o pide cancelar, se le cancela con reembolso de crédito.
   - Cancelación fuera de término / insistencia: Si el estudiante insiste expresamente en cancelar ("cancélala de igual manera", "igualmente", "de todas formas", "no importa", "aunque no devuelvas el crédito", "elimínala igual"), llama a 'cancelar_cita' con forzarSinReembolso: true.
4. ESTILO DE COMUNICACIÓN Y VOCABULARIO:
   - Responde siempre con voz propia, humana, cercana y profesional. PROHIBIDO usar frases robóticas como "según mis directrices" o "mi prompt indica".
   - PROHIBIDO TERMINANTEMENTE decir frases como "aquí te dejo tu tarjeta de créditos", "te adjunto la tarjeta", "aquí tienes la tarjeta" o auto-anunciar componentes de la interfaz. Los elementos visuales aparecen solos en pantalla; tú habla con naturalidad como un mentor real.
   - NUNCA uses la expresión "tarjeta de crédito" ni "tarjeta de créditos" (eso suena a tarjeta bancaria de crédito y es incorrecto en este contexto). En IPT Academy nos referimos a "saldo de créditos", "bolsa de tutorías" o "cupos para clases en vivo".
5. REGLAS DE FORMATO Y PRESENTACIÓN VISUAL:
   - PROHIBIDO TERMINANTEMENTE escribir o generar tablas de texto Markdown (con barras verticales |---|---|) para mostrar citas o reservas.
   - NUNCA expongas códigos o IDs técnicos internos como "bkg_live_..." al estudiante.
   - Cuando el estudiante pregunte por sus citas agendadas, citas pendientes o su agenda, simplemente llama a la herramienta 'consultar_citas'.
6. AGENDAMIENTO INTELIGENTE Y RESPUESTA A HORARIOS:
   - Si el estudiante dice "agendame una clase para dentro de 3h", "a las 4pm", "quiero una cita", "agenda para mañana", o simplemente menciona una hora como "a las 4pm" o "4pm", DEBES invocar OBLIGATORIAMENTE la herramienta 'agendar_cita' pasando en 'horaDeseada' lo solicitado.
   - NUNCA des saludos genéricos o preguntes "¿En qué te puedo colaborar?" si el estudiante te está respondiendo con una hora o pidiendo una clase.
   - Anticipación de 4 horas: Las tutorías requieren un mínimo de 4 horas de anticipación. Si el estudiante pide una hora con menos de 4 horas (ej. "dentro de 3h"), llama igualmente a 'agendar_cita' con horaDeseada='dentro de 3h' y explícale con empatía la regla de las 4 horas de anticipación para que el docente aliste la sala, invitándolo a confirmar el turno más cercano a partir de la 4ª hora.`;

  const messagesPayload: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Incluir hasta los últimos 6 mensajes del historial
  const recentHistory = history.slice(-6);
  for (const m of recentHistory) {
    messagesPayload.push({
      role: m.role,
      content: m.content
    });
  }

  // Asegurar que el mensaje actual del usuario esté al final
  if (messagesPayload[messagesPayload.length - 1]?.content !== prompt) {
    messagesPayload.push({
      role: 'user',
      content: prompt
    });
  }

  // Detección de intención para guiar tool_choice en Groq y asegurar Function Calling resolutivo
  const pLower = prompt.toLowerCase().trim();
  let toolChoice: any = 'auto';

  const isBookingIntent =
    pLower.includes('agenda') ||
    pLower.includes('cita') ||
    pLower.includes('clase') ||
    pLower.includes('reserva') ||
    pLower.includes('programar') ||
    pLower.includes('dentro de') ||
    /\b(a las|para las)\b/i.test(pLower) ||
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(pLower);

  const isCancelIntent =
    pLower.includes('cancela') ||
    pLower.includes('cancelar') ||
    pLower.includes('anula') ||
    pLower.includes('elimina') ||
    pLower.includes('descartar');

  const isCreditsIntent =
    pLower.includes('credito') ||
    pLower.includes('crédito') ||
    pLower.includes('cupo') ||
    pLower.includes('saldo');

  const isBookingsListIntent =
    pLower.includes('mis citas') ||
    pLower.includes('que citas tengo') ||
    pLower.includes('qué citas tengo') ||
    pLower.includes('ver citas') ||
    pLower.includes('agenda de hoy');

  if (isBookingIntent && !isCancelIntent) {
    toolChoice = { type: 'function', function: { name: 'agendar_cita' } };
  } else if (isCancelIntent) {
    toolChoice = { type: 'function', function: { name: 'cancelar_cita' } };
  } else if (isCreditsIntent) {
    toolChoice = { type: 'function', function: { name: 'consultar_creditos' } };
  } else if (isBookingsListIntent) {
    toolChoice = { type: 'function', function: { name: 'consultar_citas' } };
  }

  try {
    const res = await postToTutorApi({
      messages: messagesPayload,
      tools: TUTOR_TOOLS,
      tool_choice: toolChoice,
      temperature: 0.2,
      max_tokens: 1024
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('Groq API HTTP error:', res.status, errBody);
      return {
        text: 'He recibido tu solicitud, pero tuve una ligera intermitencia de conexión con el motor de IA. Puedes usar las opciones directas para agendar o gestionar tu cita.'
      };
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    if (!choice || !choice.message) {
      return {
        text: 'Hola. ¿En qué puedo orientarte hoy respecto a tus clases, créditos o tareas?'
      };
    }

    const msg = choice.message;

    // Si el LLM emitió un Tool Call, resolvemos el resultado en Turn 2 para obtener respuesta conversacional completa
    if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const firstCall = msg.tool_calls[0];
      const toolName = firstCall.function?.name;
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = JSON.parse(firstCall.function?.arguments || '{}');
      } catch (parseErr) {
        console.warn('Could not parse tool call arguments:', parseErr);
      }

      // Preparar los datos contextuales que devuelve la herramienta
      let toolResultData: any = {};
      if (toolName === 'consultar_creditos') {
        toolResultData = {
          disponibles: ctx.availableCredits,
          consumidos: ctx.consumedCredits,
          plan: ctx.planTitle,
          finCiclo: ctx.cycleEnd || 'Fin de mes'
        };
      } else if (toolName === 'consultar_citas') {
        toolResultData = {
          citasAgendadas: ctx.activeBookings.length,
          citas: ctx.activeBookings
        };
      } else if (toolName === 'agendar_cita') {
        toolResultData = {
          creditosDisponibles: ctx.availableCredits,
          sesionesEnCartelera: ctx.availableSessions.length,
          horaSolicitada: parsedArgs.horaDeseada,
          franjaOficial: '07:00 a 22:00 COT'
        };
      } else if (toolName === 'cancelar_cita') {
        toolResultData = {
          citasActivas: ctx.activeBookings.length,
          citas: ctx.activeBookings,
          forzarSinReembolso: parsedArgs.forzarSinReembolso
        };
      } else if (toolName === 'consultar_reglas') {
        toolResultData = {
          reglas: [
            '1 cita = 1 crédito mensual',
            'Franja de tutorías: 7:00 AM a 10:00 PM (hora Colombia)',
            'Cancelación con reembolso: mínimo 4 horas de anticipación o gracia de 30m',
            'Cancelación con menos de 4 horas: se retira de la agenda sin reembolso',
            'Quórum grupal: 3 estudiantes requeridos'
          ]
        };
      } else if (toolName === 'consultar_tareas') {
        toolResultData = {
          tareas: ctx.assignmentsSummary
        };
      }

      // Turn 2: Enviar el resultado de la herramienta a Groq para que redacte su respuesta con personalidad
      try {
        const turn2Messages = [
          ...messagesPayload,
          msg,
          {
            role: 'tool',
            tool_call_id: firstCall.id,
            name: toolName,
            content: JSON.stringify(toolResultData)
          }
        ];

        const res2 = await postToTutorApi({
          messages: turn2Messages,
          temperature: 0.6,
          max_tokens: 1024
        });

        if (res2.ok) {
          const data2 = await res2.json();
          const turn2Text = data2?.choices?.[0]?.message?.content?.trim();
          if (turn2Text) {
            const finalRes: GroqTutorResponse = {
              text: turn2Text,
              toolCall: {
                id: firstCall.id,
                name: toolName,
                arguments: parsedArgs
              }
            };
            TutorAiCache.set(cacheKey, finalRes);
            return finalRes;
          }
        }
      } catch (turn2Err) {
        console.warn('Turn 2 tool resolution error:', turn2Err);
      }

      const finalRes1: GroqTutorResponse = {
        text: msg.content || undefined,
        toolCall: {
          id: firstCall.id,
          name: toolName,
          arguments: parsedArgs
        }
      };
      if (finalRes1.text && finalRes1.text.trim()) {
        TutorAiCache.set(cacheKey, finalRes1);
      }
      return finalRes1;
    }

    // Respuesta textual autónoma
    const finalResText: GroqTutorResponse = {
      text:
        msg.content ||
        'Hola. He recibido tu mensaje. Dime qué tema deseas repasar de tu formación o si prefieres agendar una sesión sincrónica.'
    };
    if (msg.content && msg.content.trim()) {
      TutorAiCache.set(cacheKey, finalResText);
    }
    return finalResText;
  } catch (err: any) {
    console.error('Groq tutor invocation exception:', err);
    throw err;
  }
}
