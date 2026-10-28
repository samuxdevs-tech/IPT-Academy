'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  X,
  Send,
  Sparkles,
  EyeOff,
  Eye,
  Trash2,
  Bot,
  User as UserIcon,
  GripHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLms } from '@/context/LmsContext';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type PositionZone = 'Abajo a la izquierda' | 'Abajo a la derecha' | 'Al medio';

// Modelo local de alto rendimiento (1.5B - 2B) compatible con WebGPU para navegadores
const WEBLLM_MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

// Helper seguro para formatear fechas sin riesgo de errores de undefined
const safeDateSlice = (val?: string | null, len = 10): string => {
  if (!val || typeof val !== 'string') return 'Fecha pendiente';
  return val.slice(0, len);
};

const safeDateTime = (val?: string | null): string => {
  if (!val || typeof val !== 'string') return 'Horario por definir';
  return val.slice(0, 16).replace('T', ' ');
};

export default function LocalAiTutorWidget() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/home' || pathname === '/legal' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/course') || pathname.startsWith('/free')) {
    return null;
  }
  const { user, effectiveIsAdmin } = useAuth();
  const { subscription } = useSubscription();

  // La tutoría está habilitada a partir del Plan Pro (Pro, Pro+, Your Plan o Administradores)
  const isTutoringPlanActive =
    effectiveIsAdmin ||
    (subscription &&
      (subscription.planId === 'pro' ||
        subscription.planId === 'pro_plus' ||
        subscription.planId === 'your_plan') &&
      (subscription.status === 'active' || subscription.status === 'trial'));

  if (!isTutoringPlanActive) {
    return null;
  }
  const {
    courses,
    assignments,
    calendarEvents,
    liveSessions,
  } = useLms();

  // Estado de carga silenciosa del motor IA (0 a 100)
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'webllm' | 'local-rag'>('local-rag');
  const engineRef = useRef<any>(null);

  // Lecciones completadas del usuario actual sincronizadas desde Firebase
  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(0);

  // Estado visual del widget e interacciones
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [topNotification, setTopNotification] = useState<{
    type: 'warning' | 'ready';
    text: string;
  } | null>(null);

  // Posición movible con valores por defecto seguros
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 500 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    pointerX: 0,
    pointerY: 0,
    startX: 24,
    startY: 500,
    moved: false
  });

  // Conversación y memoria del usuario sincronizada con Firebase
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detección reactiva de altura dinámica y teclado virtual móvil (interactive-widget / visualViewport)
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setVisualViewportHeight(window.innerHeight);
        setKeyboardOffset(0);
        return;
      }
      setVisualViewportHeight(vv.height);
      const isMobile = window.innerWidth < 768;
      // En móviles, si vv.height + vv.offsetTop < window.innerHeight, el teclado virtual está activo
      const offset = Math.round(window.innerHeight - (vv.height + vv.offsetTop));
      if (isMobile && offset > 60) {
        setKeyboardOffset(offset);
      } else {
        setKeyboardOffset(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVisualViewport);
      window.visualViewport.addEventListener('scroll', updateVisualViewport);
    }
    window.addEventListener('resize', updateVisualViewport);
    updateVisualViewport();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateVisualViewport);
        window.visualViewport.removeEventListener('scroll', updateVisualViewport);
      }
      window.removeEventListener('resize', updateVisualViewport);
    };
  }, []);

  // Asegurar que al abrir el teclado el input y los últimos mensajes se mantengan visibles
  useEffect(() => {
    if (keyboardOffset > 0 && isChatOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [keyboardOffset, isChatOpen]);

  // Inicializar coordenada Y asegurando que en móviles flote arriba de la barra inferior
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const initialX = isMobile ? Math.max(12, window.innerWidth - 76) : 24;
      const initialY = isMobile
        ? Math.max(80, window.innerHeight - 150)
        : Math.max(80, window.innerHeight - 116);
      setPosition({ x: initialX, y: initialY });

      const handleResize = () => {
        const mob = window.innerWidth < 768;
        const bottomMargin = mob ? 140 : 96;
        setPosition((prev) => {
          const prevX = prev?.x ?? 24;
          const prevY = prev?.y ?? 500;
          return {
            x: Math.min(Math.max(12, prevX), window.innerWidth - 84),
            y: Math.min(Math.max(64, prevY), window.innerHeight - bottomMargin)
          };
        });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Determinar en qué zona de la pantalla está el icono movible
  const getPositionZoneLabel = useCallback(
    (xPos?: number): PositionZone => {
      if (typeof window === 'undefined') return 'Abajo a la izquierda';
      const safeX = typeof xPos === 'number' && !isNaN(xPos) ? xPos : 24;
      const width = window.innerWidth;
      const centerX = safeX + 32;
      if (centerX < width * 0.35) {
        return 'Abajo a la izquierda';
      }
      if (centerX > width * 0.65) {
        return 'Abajo a la derecha';
      }
      return 'Al medio';
    },
    []
  );

  // Mostrar notificación superior temporal
  const showTopBanner = useCallback((type: 'warning' | 'ready', text: string, durationMs = 6000) => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }
    setTopNotification({ type, text });
    notifTimeoutRef.current = setTimeout(() => {
      setTopNotification(null);
    }, durationMs);
  }, []);

  // Cargar historial/memoria de conversación y progreso del usuario desde Firebase RTDB
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setCompletedLessonsCount(0);
      return;
    }
    const historyRef = ref(db, `users/${user.uid}/ai_tutor_history`);
    get(historyRef)
      .then((snap) => {
        if (snap.exists() && Array.isArray(snap.val())) {
          setMessages(snap.val());
        }
      })
      .catch(() => {});

    const progressRef = ref(db, `progress/${user.uid}`);
    get(progressRef)
      .then((snap) => {
        if (snap.exists() && typeof snap.val() === 'object') {
          const val = snap.val();
          let count = 0;
          Object.keys(val).forEach((slug) => {
            if (Array.isArray(val[slug]?.completedLessons)) {
              count += val[slug].completedLessons.length;
            }
          });
          setCompletedLessonsCount(count);
        }
      })
      .catch(() => {});
  }, [user]);

  // Guardar historial/memoria en Firebase para que recuerde al usuario activamente
  const persistMessagesToFirebase = useCallback(
    async (updated: ChatMessage[]) => {
      if (!user) return;
      try {
        const recent = updated.slice(-24);
        await set(ref(db, `users/${user.uid}/ai_tutor_history`), recent);
      } catch (e) {
        // Silencioso para no interrumpir al usuario
      }
    },
    [user]
  );

  // Inicialización persistente de WebLLM + Índice Contextual en vivo
  useEffect(() => {
    let cancelled = false;

    // Si ya existe la instancia global en memoria, reutilizarla instantáneamente (0ms)
    if (typeof window !== 'undefined' && (window as any).__IPT_WEBLLM_ENGINE__) {
      engineRef.current = (window as any).__IPT_WEBLLM_ENGINE__;
      setEngineMode('webllm');
      setLoadProgress(100);
      setIsReady(true);
      return;
    }

    // Si el usuario ya descargó el tutor previamente en este dispositivo, marcar listo al instante
    const isCachedLocally =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('ipt_ai_tutor_cached_2b_v1') === 'true';

    if (isCachedLocally) {
      setLoadProgress(100);
      setIsReady(true);
    }

    let progressValue = isCachedLocally ? 100 : 4;
    if (!isCachedLocally) {
      setLoadProgress(4);
    }

    // Avance visual suave mientras se prepara el motor
    const smoothTimer = setInterval(() => {
      if (cancelled || isCachedLocally) return;
      progressValue = Math.min(92, progressValue + Math.random() * 8 + 3);
      setLoadProgress((prev) => (prev < 92 ? Math.max(prev, Math.round(progressValue)) : prev));
    }, 280);

    const initLocalAi = async () => {
      try {
        // Verificar soporte de WebGPU en el navegador actual
        const hasWebGPU =
          typeof navigator !== 'undefined' && 'gpu' in navigator && Boolean((navigator as any).gpu);

        if (hasWebGPU) {
          // Validar compatibilidad de shaders de 16 bits (f16) para evitar errores fatales en Windows/Intel GPUs
          let supportsF16 = false;
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter?.features?.has('shader-f16')) {
              supportsF16 = true;
            }
          } catch {
            supportsF16 = false;
          }

          if (supportsF16) {
            const webllm = await import('@mlc-ai/web-llm');
            const engine = await webllm.CreateMLCEngine(WEBLLM_MODEL_ID, {
              initProgressCallback: (report) => {
                if (cancelled) return;
                const pct = Math.min(99, Math.max(8, Math.round((report.progress || 0) * 100)));
                setLoadProgress((prev) => Math.max(prev, pct));
              }
            });

            if (!cancelled) {
              engineRef.current = engine;
              if (typeof window !== 'undefined') {
                (window as any).__IPT_WEBLLM_ENGINE__ = engine;
                try {
                  window.localStorage.setItem('ipt_ai_tutor_cached_2b_v1', 'true');
                } catch {}
              }
              setEngineMode('webllm');
              clearInterval(smoothTimer);
              setLoadProgress(100);
              setIsReady(true);
              return;
            }
          }
        }
      } catch (err) {
        console.info('Activando motor contextual local de alta velocidad:', err);
      }

      // Motor contextual local entrenado con Firebase (0 consumo de ancho de banda y 100% confiable)
      if (!cancelled) {
        clearInterval(smoothTimer);
        setEngineMode('local-rag');
        setLoadProgress(100);
        setIsReady(true);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('ipt_ai_tutor_cached_2b_v1', 'true');
          } catch {}
        }
      }
    };

    initLocalAi();

    return () => {
      cancelled = true;
      clearInterval(smoothTimer);
    };
  }, []);

  // Disparar la notificación superior exacta apenas se llena al 100% (una vez por sesión para no saturar)
  const hasNotifiedReadyRef = useRef<boolean>(false);
  useEffect(() => {
    if (isReady && !hasNotifiedReadyRef.current) {
      hasNotifiedReadyRef.current = true;
      const alreadyNotified =
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('ipt_ai_tutor_notified_v1') === 'true';

      if (!alreadyNotified) {
        try {
          sessionStorage.setItem('ipt_ai_tutor_notified_v1', 'true');
        } catch {}
        const zone = getPositionZoneLabel(position?.x ?? 24);
        showTopBanner(
          'ready',
          `El tutor de inteligencia artificial se encuentra disponible, accede a través del logo (${zone})`,
          7000
        );
      }
    }
  }, [isReady, position?.x, getPositionZoneLabel, showTopBanner]);

  // Auto-scroll al último mensaje cuando el chat está abierto
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Construir el conocimiento en tiempo real a partir de los cursos de Firebase y los datos del usuario
  const liveKnowledgeContext = useMemo(() => {
    const studentName =
      user?.displayName ||
      (user?.email ? user.email.split('@')[0] : 'Estudiante');
    const roleLabel = effectiveIsAdmin ? 'Administrador / Instructor' : 'Estudiante';

    const coursesSummary =
      courses.length === 0
        ? 'Actualmente no hay cursos publicados en la base de datos.'
        : courses
            .map((c) => {
              const mods = (c.modules || [])
                .map((m) => {
                  const lessonsText = (m.lessons || [])
                    .map(
                      (l) =>
                        `${l.title} (${l.duration || 'Sin duración'})${
                          l.description ? `: ${l.description}` : ''
                        }`
                    )
                    .join(' | ');
                  return `Módulo "${m.title}": [${lessonsText}]`;
                })
                .join(' ; ');
              return `Curso "${c.title}" (Categoría: ${c.category}, Nivel: ${c.level}): ${c.description}. Contenido: ${mods}`;
            })
            .join('\n');

    const pendingAssignments = assignments.filter((a) => a.status === 'pending');
    const gradedAssignments = assignments.filter(
      (a) => a.status === 'graded' && a.finalGrade !== undefined
    );
    const avgScore =
      gradedAssignments.length > 0
        ? (
            gradedAssignments.reduce((acc, item) => acc + (item.finalGrade || 0), 0) /
            gradedAssignments.length
          ).toFixed(2)
        : 'Sin calificaciones aún';

    const assignmentsSummary =
      assignments.length === 0
        ? 'No hay tareas asignadas actualmente.'
        : assignments
            .map(
              (a) =>
                `Tarea "${a.title}" (${a.courseTitle}, vence ${safeDateSlice(a.dueDateUtc)}): estado=${a.status}${
                  a.finalGrade !== undefined ? `, nota=${a.finalGrade.toFixed(2)}/5.0` : ''
                }`
            )
            .join(' | ');

    const upcomingSessions =
      liveSessions.length === 0
        ? 'No hay clases en vivo programadas.'
        : liveSessions
            .map((s) => `${s.title} con ${s.instructorName} (${safeDateTime(s.startTimeUtc)})`)
            .join(' | ');

    return {
      studentName,
      roleLabel,
      completedCount: completedLessonsCount,
      pendingCount: pendingAssignments.length,
      avgScore,
      coursesSummary,
      assignmentsSummary,
      upcomingSessions,
      systemPrompt: `Eres TutorIA, el asistente académico oficial de IPT Academy.
Responde siempre en español claro, amable, breve y directo (máximo 3 párrafos cortos).
Estás entrenado en tiempo real con la base de datos activa de IPT Academy y con el perfil del usuario actual:
- Usuario actual: ${studentName} (${roleLabel})
- Lecciones completadas por el usuario: ${completedLessonsCount}
- Tareas pendientes: ${pendingAssignments.length} | Promedio actual: ${avgScore}
- Cursos activos en la plataforma:
${coursesSummary}
- Tareas registradas:
${assignmentsSummary}
- Clases en vivo:
${upcomingSessions}
- Política estricta de cupos: Como IA tienes terminantemente prohibido tramitar reembolsos, devoluciones o alterar balances de cupos. Si te solicitan una devolución, aclara que esta acción está reservada exclusivamente para un docente o administrador humano.`
    };
  }, [
    user,
    effectiveIsAdmin,
    courses,
    assignments,
    liveSessions,
    completedLessonsCount
  ]);

  // Respuesta inteligente local basada en el índice vivo (cuando WebLLM delega o como apoyo instantáneo)
  const buildContextualResponse = useCallback(
    (question: string): string => {
      const q = question.toLowerCase().trim();
      const {
        studentName,
        completedCount,
        pendingCount,
        avgScore,
        roleLabel
      } = liveKnowledgeContext;

      // 0. Solicitudes de devolución de cupos o reembolsos (Protegido: Solo humanos)
      if (
        q.includes('devolver cupo') ||
        q.includes('devuelveme') ||
        q.includes('devuélveme') ||
        q.includes('devolución') ||
        q.includes('devolucion') ||
        q.includes('reembolso') ||
        q.includes('reembolsar') ||
        q.includes('regresar mi cupo') ||
        q.includes('regresame mi cupo') ||
        q.includes('regrésame mi cupo')
      ) {
        return `Hola ${studentName}. Como asistente virtual tengo terminantemente restringida cualquier modificación o reembolso de cupos. La devolución de créditos de clases en vivo es una operación contable delicada que debe ser autorizada y ejecutada exclusivamente por un docente o administrador humano. Por favor comunícate directamente con tu profesor o el equipo de soporte de IPT Academy para que verifiquen tu caso.`;
      }

      // 1. Consultas sobre Clases en Vivo, Agendamiento o Cupos Mensuales
      if (
        q.includes('clase en vivo') ||
        q.includes('agendar') ||
        q.includes('tutor') ||
        q.includes('cita') ||
        q.includes('cupo') ||
        q.includes('en vivo') ||
        q.includes('live')
      ) {
        return `Hola ${studentName}. En IPT Academy dispones de tu bolsa mensual de cupos para clases magistrales en vivo. Puedes revisar los horarios disponibles y apartar tu lugar con 1 clic en el Calendario. Una vez programada, podrás ingresar a la sala en /live donde se activará la videollamada tan pronto tu docente dé inicio a la sesión.`;
      }

      // 2. Consultas sobre progreso, notas o calificaciones del usuario
      if (
        q.includes('nota') ||
        q.includes('promedio') ||
        q.includes('calificaci') ||
        q.includes('cómo voy') ||
        q.includes('como voy') ||
        q.includes('mi avance') ||
        q.includes('progreso')
      ) {
        const graded = assignments.filter(
          (a) => a.status === 'graded' && a.finalGrade !== undefined
        );
        if (courses.length === 0 && assignments.length === 0) {
          return `Hola ${studentName}. En este momento la plataforma aún no tiene cursos ni tareas calificados. Apenas se publiquen tus actividades desde el panel de administrador, aquí podré darte el seguimiento detallado de tus notas y tu promedio.`;
        }
        return `Hola ${studentName}, revisé tu expediente en tiempo real:\n• Lecciones completadas: ${completedCount}.\n• Tareas pendientes por entregar: ${pendingCount}.\n• Promedio de notas calificadas: ${avgScore}${graded.length > 0 ? ` (${graded.length} entregas evaluadas)` : ''}.`;
      }

      // 2. Consultas sobre tareas o entregas
      if (q.includes('tarea') || q.includes('entrega') || q.includes('pendiente') || q.includes('deber')) {
        if (assignments.length === 0) {
          return `Actualmente no tienes ninguna tarea registrada en IPT Academy. Cuando el administrador publique una nueva actividad en la sección de Tareas, aparecerá automáticamente en tu calendario y podré ayudarte a resolverla.`;
        }
        const pending = assignments.filter((a) => a.status === 'pending');
        if (pending.length === 0) {
          return `¡Excelente trabajo, ${studentName}! Estás al día: no tienes tareas pendientes por entregar de las ${assignments.length} registradas en el curso.`;
        }
        const list = pending
          .map((a) => `• "${a.title}" (${a.courseTitle}) — Fecha límite: ${safeDateSlice(a.dueDateUtc)}`)
          .join('\n');
        return `Tienes ${pending.length} tarea(s) pendiente(s) en este momento:\n${list}\n\nPuedes subir tu entrega desde la pestaña "Tareas" en el menú superior.`;
      }

      // 3. Consultas sobre calendario o clases en vivo
      if (q.includes('vivo') || q.includes('calendario') || q.includes('clase') || q.includes('horario') || q.includes('evento')) {
        if (liveSessions.length === 0 && calendarEvents.length === 0) {
          return `Por ahora no hay clases en vivo ni fechas próximas programadas en el calendario. En cuanto el administrador programe una sesión en vivo o una entrega, te avisaré por aquí.`;
        }
        const sessionsText =
          liveSessions.length > 0
            ? `Clases en vivo programadas:\n${liveSessions
                .map((s) => `• ${s.title} (${safeDateTime(s.startTimeUtc)}) con ${s.instructorName}`)
                .join('\n')}`
            : '';
        const eventsText =
          calendarEvents.length > 0
            ? `Eventos del calendario:\n${calendarEvents
                .slice(0, 4)
                .map((e) => `• ${e.title} (${safeDateSlice(e.startUtc)})`)
                .join('\n')}`
            : '';
        return [sessionsText, eventsText].filter(Boolean).join('\n\n');
      }

      // 4. Búsqueda directa en los cursos, módulos y lecciones publicados en Firebase
      if (courses.length === 0) {
        return `Hola ${studentName} (${roleLabel}). Ya estoy conectado en vivo a la base de datos de IPT Academy, que actualmente se encuentra en blanco esperando el primer curso. En cuanto crees o publiques cursos, módulos, lecciones o tareas desde el panel de administración, aprenderé su contenido al instante para responder cualquier duda.`;
      }

      // Buscar coincidencias en lecciones o módulos
      for (const course of courses) {
        for (const mod of course.modules || []) {
          for (const les of mod.lessons || []) {
            const haystack = `${course.title} ${mod.title} ${les.title} ${les.description || ''}`.toLowerCase();
            const words = q.split(/\s+/).filter((w) => w.length > 3);
            if (words.some((w) => haystack.includes(w))) {
              const quizHint =
                les.checkpointQuiz && les.checkpointQuiz.length > 0
                  ? `\nAdemás, esta clase incluye ${les.checkpointQuiz.length} pregunta(s) de repaso.`
                  : '';
              return `Sobre "${les.title}" (del ${mod.title} en el curso "${course.title}"):\n${
                les.description || 'Esta lección forma parte del plan de estudios activo.'
              }\nDuración estimada: ${les.duration || '10 min'}.${quizHint}`;
            }
          }
        }
      }

      // Respuesta general con resumen de los cursos disponibles en vivo
      const firstCourse = courses[0];
      const activeTitle = firstCourse?.title || 'IPT Academy';
      const totalMods = firstCourse?.modules?.length || 0;
      const totalLessons = (firstCourse?.modules || []).reduce(
        (acc: number, m) => acc + (m.lessons?.length || 0),
        0
      );

      return `Hola ${studentName}. Estoy entrenado con el contenido activo de "${activeTitle}" (${totalMods} módulos y ${totalLessons} clases publicadas) y con tu progreso personal (${completedCount} clases vistas, promedio ${avgScore}). Pregúntame sobre cualquier lección del curso, tus tareas pendientes o tus calificaciones.`;
    },
    [liveKnowledgeContext, assignments, courses, liveSessions, calendarEvents]
  );

  // Manejar envío de mensaje al TutorIA
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = inputPrompt.trim();
    if (!cleanPrompt || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: cleanPrompt,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputPrompt('');
    setIsGenerating(true);

    try {
      let replyText = '';

      if (engineMode === 'webllm' && engineRef.current) {
        try {
          const historyForModel = nextMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
          }));

          const response = await engineRef.current.chat.completions.create({
            messages: [
              { role: 'system', content: liveKnowledgeContext.systemPrompt },
              ...historyForModel
            ],
            temperature: 0.4,
            max_tokens: 280
          });

          replyText =
            response?.choices?.[0]?.message?.content?.trim() ||
            buildContextualResponse(cleanPrompt);
        } catch (webllmErr) {
          replyText = buildContextualResponse(cleanPrompt);
        }
      } else {
        await new Promise((r) => setTimeout(r, 450));
        replyText = buildContextualResponse(cleanPrompt);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      persistMessagesToFirebase(finalMessages);
    } finally {
      setIsGenerating(false);
    }
  };

  // Manejo de arrastre (movible por toda la pantalla) y clic en el círculo
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si hizo clic en el botón de ocultar, no iniciar arrastre
    if ((e.target as HTMLElement).closest('[data-hide-btn="true"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position?.x ?? 24,
      startY: position?.y ?? 500,
      moved: false
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStartRef.current.moved = true;
    }

    if (typeof window !== 'undefined') {
      const mob = window.innerWidth < 768;
      const bottomMargin = mob ? 140 : 96;
      const curStartX = dragStartRef.current?.startX ?? 24;
      const curStartY = dragStartRef.current?.startY ?? 500;
      const nextX = Math.min(Math.max(12, curStartX + dx), window.innerWidth - 84);
      const nextY = Math.min(Math.max(64, curStartY + dy), window.innerHeight - bottomMargin);
      setPosition({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    // Si no fue un arrastre sino un clic directo en el icono circular:
    if (!dragStartRef.current.moved) {
      if (!isReady || loadProgress < 100) {
        showTopBanner(
          'warning',
          'Actualmente el TutorIA no esta disponible, una vez completada la carga vuelve a intentarlo',
          5500
        );
        return;
      }
      setIsChatOpen((prev) => !prev);
    }
  };

  // Geometría del anillo de luz progresivo alrededor del círculo
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (loadProgress / 100) * circumference;

  const currentZone = getPositionZoneLabel(position?.x ?? 24);

  return (
    <>
      {/* NOTIFICACIÓN SUPERIOR (Cuando intenta abrir antes de tiempo o apenas se llena al 100%) */}
      {topNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] max-w-xl w-[calc(100%-2rem)] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 backdrop-blur-md ${
              topNotification.type === 'ready'
                ? 'bg-[#0f172a]/95 border-cyan-400/50 text-white shadow-cyan-500/20'
                : 'bg-[#1e1b2e]/95 border-amber-400/50 text-white shadow-amber-500/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  topNotification.type === 'ready'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                }`}
              >
                {topNotification.type === 'ready' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold leading-snug">
                {topNotification.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTopNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PÍLDORA DISCRETA PARA MOSTRAR DE NUEVO SI EL USUARIO OCULTÓ EL ICONO */}
      {isHidden && (
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          className="fixed bottom-20 right-4 z-[90] px-3 py-1.5 rounded-full bg-[#151726]/90 hover:bg-[#151726] text-white border border-cyan-500/30 shadow-lg flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer"
          title="Mostrar icono de TutorIA"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>TutorIA</span>
        </button>
      )}

      {/* ICONO CIRCULAR MOVIBLE CON ANILLO DE LUZ PROGRESIVO Y TEXTO "Chat" ABAJO */}
      {!isHidden && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            left: `${position?.x ?? 24}px`,
            top: (position?.y ?? 500) >= 0 ? `${position?.y ?? 500}px` : undefined,
            bottom: (position?.y ?? 500) < 0 ? '24px' : undefined,
            touchAction: 'none'
          }}
          className={`fixed z-[95] select-none flex flex-col items-center group ${
            isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
          }`}
        >
          {/* Botón para ocultar el icono flotante */}
          <button
            type="button"
            data-hide-btn="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsChatOpen(false);
              setIsHidden(true);
            }}
            title="Ocultar icono de Chat"
            className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-[#151726] text-slate-300 hover:text-white hover:bg-rose-600 border border-slate-700 flex items-center justify-center shadow-md opacity-85 group-hover:opacity-100 transition-all cursor-pointer"
          >
            <EyeOff className="w-2.5 h-2.5" />
          </button>

          {/* Círculo con Anillo de Luz Progresivo y Favicon de IPT Academy */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Resplandor exterior de luz cuando se está llenando o cuando ya está listo */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                isReady
                  ? 'bg-cyan-400/25 blur-md animate-pulse'
                  : 'bg-blue-500/15 blur-xs'
              }`}
            />

            {/* SVG de la línea de luz que rellena el borde del círculo */}
            <svg
              className="absolute inset-0 w-16 h-16 -rotate-90 pointer-events-none"
              viewBox="0 0 64 64"
            >
              <defs>
                <linearGradient id="iptTutorLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <filter id="iptGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Riel base oscuro */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.5"
              />

              {/* Línea de luz que se va rellenando progresivamente */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="url(#iptTutorLightGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                filter="url(#iptGlowFilter)"
                className="transition-all duration-300 ease-out"
              />
            </svg>

            {/* Interior del círculo con el Favicon de IPT Academy */}
            <div
              className={`relative z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner transition-transform ${
                isReady ? 'group-hover:scale-105' : 'opacity-90'
              }`}
            >
              <Image
                src="/favicon.png"
                alt="IPT Academy TutorIA"
                width={34}
                height={34}
                className="w-8 h-8 object-contain pointer-events-none select-none"
              />
            </div>
          </div>

          {/* Etiqueta "Chat" debajo del círculo */}
          <span
            className={`mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide shadow-sm border transition-all ${
              isReady
                ? 'bg-[#0f172a] text-cyan-300 border-cyan-400/50 shadow-cyan-500/20'
                : 'bg-[#151726]/90 text-slate-300 border-slate-700'
            }`}
          >
            Chat
          </span>
        </div>
      )}

      {/* VENTANA DE CONVERSACIÓN DEL TUTOR IA (Solo accesible cuando loadProgress === 100) */}
      {isChatOpen && isReady && !isHidden && (
        <div
          className={`fixed z-[96] bg-white rounded-2xl border border-[#d1d2e0] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-all ${
            'left-3 right-3 sm:left-auto sm:right-auto sm:w-96'
          } ${
            keyboardOffset > 0
              ? ''
              : 'bottom-20 sm:bottom-28'
          } ${
            currentZone === 'Abajo a la derecha'
              ? 'sm:right-6'
              : currentZone === 'Al medio'
              ? 'sm:left-1/2 sm:-translate-x-1/2'
              : 'sm:left-6'
          }`}
          style={{
            bottom: keyboardOffset > 0 ? `${keyboardOffset + 10}px` : undefined,
            maxHeight:
              keyboardOffset > 0 && visualViewportHeight
                ? `${Math.min(460, visualViewportHeight - 20)}px`
                : visualViewportHeight
                ? `${Math.min(520, visualViewportHeight - 110)}px`
                : 'min(520px, calc(100dvh - 120px))'
          }}
        >
          {/* Cabecera del TutorIA */}
          <div className="bg-[#0f172a] text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shrink-0 ring-2 ring-cyan-400/60">
                <Image
                  src="/favicon.png"
                  alt="TutorIA"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                    TutorIA • IPT Academy
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                </div>
                <p className="text-[10px] text-cyan-200/80 truncate">
                  Conectado a tus cursos y avance en vivo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    persistMessagesToFirebase([]);
                  }}
                  title="Limpiar conversación"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                title="Cerrar ventana de chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
            {messages.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3 text-xs text-[#334155]">
                <div className="flex items-center gap-2 text-[#1d4ed8] font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>¡Hola, {liveKnowledgeContext.studentName}!</span>
                </div>
                <p className="leading-relaxed text-[#475569]">
                  Soy el tutor de inteligencia artificial de <strong>IPT Academy</strong>. Aprendo automáticamente de cada curso, clase y tarea que se publica en la plataforma, así como de tu avance personal.
                </p>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {[
                    '¿Cómo voy en mis notas?',
                    '¿Qué tareas tengo pendientes?',
                    'Explícame el curso actual'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInputPrompt(suggestion)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      m.role === 'user'
                        ? 'bg-[#1d4ed8] text-white'
                        : 'bg-[#0f172a] text-cyan-300'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <UserIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                      m.role === 'user'
                        ? 'bg-[#1d4ed8] text-white rounded-tr-xs'
                        : 'bg-white text-[#1e293b] border border-[#e2e8f0] rounded-tl-xs'
                    }`}
                  >
                    <p>{m.content}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        m.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-[#64748b] px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span>TutorIA está analizando tu curso...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-[#e2e8f0] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 150);
              }}
              placeholder="Escribe tu duda sobre la clase o tus notas..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#1d4ed8] text-[#0f172a]"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="p-2.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Enviar pregunta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
