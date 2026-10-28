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
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Ticket,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLms } from '@/context/LmsContext';
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  askTutorIAWithGroq,
  GroqTutorContext,
  GroqChatMessage
} from '@/services/groqTutorService';

export interface InteractiveActionPayload {
  kind: 'sessions_picker' | 'bookings_list' | 'credits_card' | 'rules_card';
  sessions?: Array<{
    id: string;
    title: string;
    instructorName: string;
    startTimeUtc: string;
    durationMinutes: number;
    courseSlug: string;
    isBooked: boolean;
    tooLateToBook: boolean;
    hoursUntilStart: number;
  }>;
  bookings?: Array<{
    id: string;
    sessionId: string;
    title: string;
    instructorName: string;
    startTimeUtc: string;
    canCancel: boolean;
    hoursRemaining: number;
  }>;
  credits?: {
    available: number;
    consumed: number;
    planTitle: string;
    cycleEnd?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionPayload?: InteractiveActionPayload;
}

type PositionZone = 'Abajo a la izquierda' | 'Abajo a la derecha' | 'Al medio';

const WEBLLM_MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

// Formato institucional amigable en español
const safeDateSlice = (val?: string | null, len = 10): string => {
  if (!val || typeof val !== 'string') return 'Fecha pendiente';
  return val.slice(0, len);
};

const safeDateTime = (val?: string | null): string => {
  if (!val || typeof val !== 'string') return 'Horario por definir';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val.slice(0, 16).replace('T', ' ');
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return val.slice(0, 16).replace('T', ' ');
  }
};

// Detector de intenciones de cancelación
const isCancelIntent = (text: string): boolean => {
  const t = text.toLowerCase();
  return (
    t.includes('cancela') ||
    t.includes('cancelar') ||
    t.includes('cancélala') ||
    t.includes('cancelala') ||
    t.includes('cancélame') ||
    t.includes('cancelame') ||
    t.includes('cancélalo') ||
    t.includes('cancelalo') ||
    t.includes('anula') ||
    t.includes('anular') ||
    t.includes('anúlala') ||
    t.includes('anulala') ||
    t.includes('elimina la clase') ||
    t.includes('eliminar la clase') ||
    t.includes('elimina la cita') ||
    t.includes('eliminar cita') ||
    t.includes('quitar la cita') ||
    t.includes('quitar cita') ||
    t.includes('borrar cita') ||
    t.includes('no puedo asistir') ||
    t.includes('fue un error') ||
    t.includes('descartar cita') ||
    t.includes('me equivoque') ||
    t.includes('me equivoqué') ||
    /\b(cancela|cancelar|anula|anular|elimina|eliminar)\b/i.test(t)
  );
};

// Parser inteligente de hora en lenguaje natural
interface ParsedTimeQuery {
  hasRequestedTime: boolean;
  rawTimeStr?: string;
  hour?: number; // 0 a 23
  minute?: number;
  isOutsideAcademicHours: boolean;
}

const parseRequestedTime = (text: string): ParsedTimeQuery => {
  const t = text.toLowerCase();

  // Coincidencias tipo "a las 5am", "a las 5:00 am", "5am", "10:30 am", "a las 3pm", "a las 17:00"
  const match =
    t.match(/(?:a\s+las\s+|a\s+la\s+|para\s+las\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i) ||
    t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);

  if (!match) {
    return { hasRequestedTime: false, isOutsideAcademicHours: false };
  }

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3] ? match[3].toLowerCase().replace(/\./g, '') : null;

  if (meridian === 'pm' && hour < 12) {
    hour += 12;
  } else if (meridian === 'am' && hour === 12) {
    hour = 0;
  }

  // Horario institucional de tutorías: 7:00 AM a 10:00 PM (07:00 a 22:00 COT)
  const isOutsideAcademicHours = hour < 7 || hour > 22;

  return {
    hasRequestedTime: true,
    rawTimeStr: match[0].trim(),
    hour,
    minute,
    isOutsideAcademicHours
  };
};

export default function LocalAiTutorWidget() {
  const pathname = usePathname();
  if (
    pathname === '/' ||
    pathname === '/home' ||
    pathname === '/legal' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/course') ||
    pathname.startsWith('/free')
  ) {
    return null;
  }

  const { user, effectiveIsAdmin } = useAuth();
  const {
    subscription,
    entitlements,
    liveBookings,
    bookLiveSession,
    cancelLiveBooking
  } = useSubscription();

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
    courses: rawCourses,
    assignments: rawAssignments,
    calendarEvents: rawCalendarEvents,
    liveSessions: rawLiveSessions,
  } = useLms();

  const courses = Array.isArray(rawCourses) ? rawCourses : [];
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : [];
  const calendarEvents = Array.isArray(rawCalendarEvents) ? rawCalendarEvents : [];
  const liveSessions = Array.isArray(rawLiveSessions) ? rawLiveSessions : [];

  const availableCredits = entitlements?.availableLiveCredits ?? subscription?.remainingCredits ?? 0;
  const consumedCredits = subscription?.creditsConsumedInCycle ?? 0;
  const planTitle =
    subscription?.planId === 'pro_plus'
      ? 'Pro+'
      : subscription?.planId === 'pro'
      ? 'Pro'
      : subscription?.planId === 'your_plan'
      ? 'Your Plan'
      : 'Suscripción Activa';

  // Directivas de docentes en vivo
  const [teacherDirectives, setTeacherDirectives] = useState<
    Array<{ id: string; type: string; description: string }>
  >([]);

  useEffect(() => {
    const dirRef = ref(db, 'tutoria_directives');
    const unsub = onValue(
      dirRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list: Array<{ id: string; type: string; description: string }> = [];
          Object.entries(data).forEach(([id, item]: [string, any]) => {
            list.push({
              id,
              type: item.type === 'block' ? 'block' : 'recommend',
              description: item.description || 'Directiva docente'
            });
          });
          setTeacherDirectives(list);
        } else {
          setTeacherDirectives([]);
        }
      },
      () => setTeacherDirectives([])
    );
    return () => unsub();
  }, []);

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'webllm' | 'local-rag'>('local-rag');
  const engineRef = useRef<any>(null);

  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(0);
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [topBanner, setTopBanner] = useState<{
    show: boolean;
    type: 'warning' | 'ready';
    text: string;
  }>({
    show: false,
    type: 'warning',
    text: ''
  });

  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);

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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (keyboardOffset > 0 && isChatOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [keyboardOffset, isChatOpen]);

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

  const getPositionZoneLabel = useCallback((xPos?: number): PositionZone => {
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
  }, []);

  const showTopBanner = useCallback(
    (type: 'warning' | 'ready', text: string, durationMs = 6000) => {
      if (notifTimeoutRef.current) {
        clearTimeout(notifTimeoutRef.current);
      }
      setTopBanner({ show: true, type, text });
      notifTimeoutRef.current = setTimeout(() => {
        setTopBanner((prev) => ({ ...prev, show: false }));
      }, durationMs);
    },
    []
  );

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
        if (snap.exists()) {
          const val = snap.val();
          let count = 0;
          if (val.completedLessons && typeof val.completedLessons === 'object') {
            count = Object.keys(val.completedLessons).length;
          } else if (typeof val === 'object') {
            Object.values(val).forEach((courseObj: any) => {
              if (courseObj?.completedLessons && typeof courseObj.completedLessons === 'object') {
                count += Object.keys(courseObj.completedLessons).length;
              }
            });
          }
          setCompletedLessonsCount(count);
        }
      })
      .catch(() => {});
  }, [user]);

  const persistMessagesToFirebase = useCallback(
    async (updated: ChatMessage[]) => {
      if (!user) return;
      try {
        const recent = updated.slice(-24);
        await set(ref(db, `users/${user.uid}/ai_tutor_history`), recent);
      } catch (e) {
        // Silencioso
      }
    },
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    if (typeof window !== 'undefined' && (window as any).__IPT_WEBLLM_ENGINE__) {
      engineRef.current = (window as any).__IPT_WEBLLM_ENGINE__;
      setEngineMode('webllm');
      setLoadProgress(100);
      setIsReady(true);
      return;
    }

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

    const smoothTimer = setInterval(() => {
      if (cancelled || isCachedLocally) return;
      progressValue = Math.min(92, progressValue + Math.random() * 8 + 3);
      setLoadProgress((prev) => (prev < 92 ? Math.max(prev, Math.round(progressValue)) : prev));
    }, 280);

    const initLocalAi = async () => {
      try {
        const hasWebGPU =
          typeof navigator !== 'undefined' && 'gpu' in navigator && Boolean((navigator as any).gpu);

        if (hasWebGPU) {
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
        // Fallback a motor RAG local
      }

      if (!cancelled) {
        clearInterval(smoothTimer);
        setEngineMode('local-rag');
        setLoadProgress(100);
        setIsReady(true);
      }
    };

    initLocalAi();

    return () => {
      cancelled = true;
      clearInterval(smoothTimer);
    };
  }, []);

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

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Citas confirmadas en vivo
  const userConfirmedBookings = useMemo(() => {
    return (liveBookings || []).filter((b) => b.status === 'confirmed');
  }, [liveBookings]);

  // Lista base de sesiones disponibles para agendamiento
  const preparedSessions = useMemo(() => {
    const nowMs = Date.now();
    const fourHoursMs = 4 * 60 * 60 * 1000;

    let baseList = liveSessions.length > 0 ? liveSessions : [];

    // Si no hay sesiones colectivas en el calendario, generar opciones de tutoría sincrónica personalizada
    if (baseList.length === 0) {
      const d1 = new Date();
      d1.setDate(d1.getDate() + 1);
      d1.setHours(8, 0, 0, 0);

      const d2 = new Date();
      d2.setDate(d2.getDate() + 1);
      d2.setHours(10, 0, 0, 0);

      const d3 = new Date();
      d3.setDate(d3.getDate() + 1);
      d3.setHours(16, 0, 0, 0);

      baseList = [
        {
          id: 'live_tutoria_08am',
          title: 'Tutoría Sincrónica (Franja Matutina)',
          instructorName: 'Ing. Iván Pérez (Docente Titular)',
          startTimeUtc: d1.toISOString(),
          durationMinutes: 60,
          courseSlug: 'ipt-master-fullstack',
          moduleId: 'mod_tutoria',
          provider: 'native_jitsi',
          meetingCode: 'ipt-tutor-08am',
          joinUrl: '/live?mode=1on1',
          cloudRecordingState: 'scheduled',
          autoTranscribed: true
        } as any,
        {
          id: 'live_tutoria_10am',
          title: 'Tutoría Sincrónica (Media Mañana)',
          instructorName: 'Ing. Iván Pérez (Docente Titular)',
          startTimeUtc: d2.toISOString(),
          durationMinutes: 60,
          courseSlug: 'ipt-master-fullstack',
          moduleId: 'mod_tutoria',
          provider: 'native_jitsi',
          meetingCode: 'ipt-tutor-10am',
          joinUrl: '/live?mode=1on1',
          cloudRecordingState: 'scheduled',
          autoTranscribed: true
        } as any,
        {
          id: 'live_tutoria_04pm',
          title: 'Tutoría Sincrónica (Franja Vespertina)',
          instructorName: 'Ing. Iván Pérez (Docente Titular)',
          startTimeUtc: d3.toISOString(),
          durationMinutes: 60,
          courseSlug: 'ipt-master-fullstack',
          moduleId: 'mod_tutoria',
          provider: 'native_jitsi',
          meetingCode: 'ipt-tutor-04pm',
          joinUrl: '/live?mode=1on1',
          cloudRecordingState: 'scheduled',
          autoTranscribed: true
        } as any
      ];
    }

    return baseList.map((s) => {
      const sessionStartMs = new Date(s.startTimeUtc).getTime();
      const diffMs = sessionStartMs - nowMs;
      const hoursUntilStart = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
      const isBooked = userConfirmedBookings.some((b) => b.sessionId === s.id);
      const tooLateToBook = diffMs < fourHoursMs;

      return {
        id: s.id,
        title: s.title,
        instructorName: s.instructorName || 'Docente IPT Academy',
        startTimeUtc: s.startTimeUtc,
        durationMinutes: s.durationMinutes || 60,
        courseSlug: s.courseSlug || 'ipt-master-fullstack',
        isBooked,
        tooLateToBook,
        hoursUntilStart
      };
    });
  }, [liveSessions, userConfirmedBookings]);

  // Contexto de conocimiento para el LLM
  const liveKnowledgeContext = useMemo(() => {
    const studentName =
      user?.displayName || (user?.email ? user.email.split('@')[0] : 'Estudiante');
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
            .join('\n');

    const userBookingsSummary =
      userConfirmedBookings.length === 0
        ? 'Sin citas activas en agenda.'
        : userConfirmedBookings
            .map((b) => `Cita ID: ${b.id} para sesión ${b.sessionId} (${safeDateTime(b.bookedAt)})`)
            .join(' | ');

    const directivesSummary =
      teacherDirectives.length === 0
        ? 'Sin directivas docentes específicas.'
        : teacherDirectives.map((d) => `[${d.type.toUpperCase()}] ${d.description}`).join(' ; ');

    return {
      studentName,
      roleLabel,
      completedCount: completedLessonsCount,
      pendingCount: pendingAssignments.length,
      avgScore,
      coursesSummary,
      assignmentsSummary,
      availableCredits,
      consumedCredits,
      planTitle,
      userBookingsSummary,
      directivesSummary,
      systemPrompt: `Eres TutorIA, el tutor de inteligencia artificial de IPT Academy con capacidad activa de agendamiento y cancelación de citas.
Responde siempre en español claro, humano, empático y directo.
Tienes facultades plenas:
- Agendar citas sincrónicas (consume 1 crédito de forma atómica).
- Cancelar citas activas con reembolso automático si faltan > 4 horas.
- Informar balance de créditos en tiempo real: ${availableCredits} disponibles (${consumedCredits} consumidos).
- Horario de tutorías en vivo: 7:00 AM a 10:00 PM (hora Colombia). Si piden horas de madrugada (como 5:00 AM), explica la franja y ofrece alternativas a partir de las 7:00 AM o 8:00 AM.
- Citas activas del estudiante: ${userBookingsSummary}.
- Reglas: 1 cita = 1 crédito; cancelación/reserva con mínimo 4h de antelación; quórum de 3 evaluado a las 3h.`
    };
  }, [
    user,
    effectiveIsAdmin,
    courses,
    assignments,
    completedLessonsCount,
    availableCredits,
    consumedCredits,
    planTitle,
    userConfirmedBookings,
    teacherDirectives
  ]);

  // Generador contextual con análisis inteligente de hora y cancelación
  const buildContextualResponse = useCallback(
    (question: string): { text: string; actionPayload?: InteractiveActionPayload } => {
      const q = question.toLowerCase().trim();
      const { studentName, completedCount, pendingCount, avgScore } = liveKnowledgeContext;

      // =====================================================================
      // 1. INTENCIÓN: VER CRÉDITOS / CUPOS
      // =====================================================================
      if (
        q.includes('credito') ||
        q.includes('crédito') ||
        q.includes('cupo') ||
        q.includes('saldo') ||
        q.includes('cuantas citas') ||
        q.includes('cuántas citas')
      ) {
        const text = `Hola ${studentName}. En tu plan ${planTitle} dispones de **${availableCredits} crédito(s) para clases y tutorías sincrónicas** en este ciclo (has utilizado ${consumedCredits}). Cada cita consume 1 crédito de tu bolsa mensual, y si cancelas con más de 4 horas de anticipación tu crédito se reintegra al instante.`;
        return {
          text,
          actionPayload: {
            kind: 'credits_card',
            credits: {
              available: availableCredits,
              consumed: consumedCredits,
              planTitle,
              cycleEnd: subscription?.currentPeriodEnd
            }
          }
        };
      }

      // =====================================================================
      // 2. INTENCIÓN: CANCELAR CITA / ANULAR RESERVA
      // =====================================================================
      if (isCancelIntent(q)) {
        if (userConfirmedBookings.length === 0) {
          const text = `Hola ${studentName}. No tienes ninguna cita activa agendada en este momento para cancelar. Tienes ${availableCredits} crédito(s) disponibles listos para cuando desees programar una clase.`;
          return {
            text,
            actionPayload: {
              kind: 'credits_card',
              credits: {
                available: availableCredits,
                consumed: consumedCredits,
                planTitle,
                cycleEnd: subscription?.currentPeriodEnd
              }
            }
          };
        }

        const nowMs = Date.now();
        const fourHoursMs = 4 * 60 * 60 * 1000;
        const defaultTomorrow = new Date();
        defaultTomorrow.setDate(defaultTomorrow.getDate() + 1);
        defaultTomorrow.setHours(18, 0, 0, 0);

        const mappedBookings = userConfirmedBookings.map((bkg) => {
          const session = liveSessions.find((s) => s.id === bkg.sessionId);
          const title = (bkg as any).sessionTitle || session?.title || 'Tutoría Sincrónica con Docente Titular';
          const instructorName = (bkg as any).sessionInstructor || session?.instructorName || 'Ing. Iván Pérez';
          const startTimeUtc = (bkg as any).sessionStartTime || session?.startTimeUtc || defaultTomorrow.toISOString();
          const sessionStartMs = new Date(startTimeUtc).getTime();
          const diffMs = sessionStartMs - nowMs;
          const bookedAtMs = new Date(bkg.bookedAt).getTime();
          const isRecentBooking = nowMs - bookedAtMs < 30 * 60 * 1000;
          const canCancel = diffMs >= fourHoursMs || isRecentBooking;
          const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

          return {
            id: bkg.id,
            sessionId: bkg.sessionId,
            title,
            instructorName,
            startTimeUtc,
            canCancel,
            hoursRemaining
          };
        });

        const text = `Hola ${studentName}. He revisado tu agenda institucional. Aquí tienes tus citas activas. Puedes presionar "Cancelar (+1 crédito)" en la tarjeta para devolver tu crédito de inmediato a tu saldo:`;
        return {
          text,
          actionPayload: {
            kind: 'bookings_list',
            bookings: mappedBookings
          }
        };
      }

      // =====================================================================
      // 3. INTENCIÓN: AGENDAR CITA / SOLICITUD DE HORA ESPECÍFICA
      // =====================================================================
      const isBookingKeyword =
        q.includes('agendar') ||
        q.includes('agenda') ||
        q.includes('reservar') ||
        q.includes('reserva') ||
        q.includes('pedir cita') ||
        q.includes('sacar cita') ||
        q.includes('programar') ||
        q.includes('quiero cita') ||
        q.includes('quiero una clase') ||
        q.includes('ver clases') ||
        q.includes('horarios') ||
        q.includes('clase a las') ||
        q.includes('cita a las');

      if (isBookingKeyword) {
        if (availableCredits <= 0) {
          const text = `Hola ${studentName}. En este momento tienes 0 créditos disponibles para agendar citas en este ciclo de tu plan ${planTitle}. Para obtener más créditos mensuales puedes actualizar al plan Pro+ (4 créditos al mes) o esperar a la renovación de tu período de facturación.`;
          return {
            text,
            actionPayload: {
              kind: 'credits_card',
              credits: {
                available: availableCredits,
                consumed: consumedCredits,
                planTitle,
                cycleEnd: subscription?.currentPeriodEnd
              }
            }
          };
        }

        // Analizar si el estudiante pidió una hora específica (ej. "a las 5am", "a las 10am")
        const parsedTime = parseRequestedTime(q);

        if (parsedTime.hasRequestedTime && parsedTime.isOutsideAcademicHours) {
          // El estudiante pidió una hora fuera de la franja (ej. 5:00 AM)
          const requestedStr = `${parsedTime.hour}:00 ${parsedTime.hour! < 12 ? 'AM' : 'PM'}`;
          const text = `Hola ${studentName}. He identificado que solicitas tu clase a las **${requestedStr}**. Ten en cuenta que las tutorías sincrónicas con los docentes de IPT Academy operan en la franja institucional de **7:00 AM a 10:00 PM (hora de Colombia)** para garantizar el acompañamiento activo y en vivo del profesor titular.\n\nPara facilitarte el agendamiento, he preparado los horarios más tempranos y convenientes disponibles dentro de la jornada habilitada:`;

          // Generar opciones matutinas para mañana a las 7:00 AM, 8:00 AM y 10:00 AM
          const d7 = new Date();
          d7.setDate(d7.getDate() + 1);
          d7.setHours(7, 0, 0, 0);

          const d8 = new Date();
          d8.setDate(d8.getDate() + 1);
          d8.setHours(8, 0, 0, 0);

          const d10 = new Date();
          d10.setDate(d10.getDate() + 1);
          d10.setHours(10, 0, 0, 0);

          const customEarlySessions = [
            {
              id: 'slot_custom_07am',
              title: 'Tutoría Sincrónica (07:00 AM COT)',
              instructorName: 'Ing. Iván Pérez (Docente Titular)',
              startTimeUtc: d7.toISOString(),
              durationMinutes: 60,
              courseSlug: 'ipt-master-fullstack',
              isBooked: false,
              tooLateToBook: false,
              hoursUntilStart: 17
            },
            {
              id: 'slot_custom_08am',
              title: 'Tutoría Sincrónica (08:00 AM COT)',
              instructorName: 'Ing. Iván Pérez (Docente Titular)',
              startTimeUtc: d8.toISOString(),
              durationMinutes: 60,
              courseSlug: 'ipt-master-fullstack',
              isBooked: false,
              tooLateToBook: false,
              hoursUntilStart: 18
            },
            {
              id: 'slot_custom_10am',
              title: 'Tutoría Sincrónica (10:00 AM COT)',
              instructorName: 'Ing. Iván Pérez (Docente Titular)',
              startTimeUtc: d10.toISOString(),
              durationMinutes: 60,
              courseSlug: 'ipt-master-fullstack',
              isBooked: false,
              tooLateToBook: false,
              hoursUntilStart: 20
            }
          ];

          return {
            text,
            actionPayload: {
              kind: 'sessions_picker',
              sessions: customEarlySessions
            }
          };
        } else if (parsedTime.hasRequestedTime && !parsedTime.isOutsideAcademicHours) {
          // El estudiante pidió una hora válida dentro de la franja (ej. 10:00 AM o 3:00 PM)
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(parsedTime.hour!, parsedTime.minute || 0, 0, 0);

          const customSession = {
            id: `slot_custom_${parsedTime.hour}_${parsedTime.minute || 0}`,
            title: `Tutoría Sincrónica Personalizada (${safeDateTime(targetDate.toISOString())})`,
            instructorName: 'Ing. Iván Pérez (Docente Titular)',
            startTimeUtc: targetDate.toISOString(),
            durationMinutes: 60,
            courseSlug: 'ipt-master-fullstack',
            isBooked: false,
            tooLateToBook: false,
            hoursUntilStart: 20
          };

          const text = `¡Perfecto, ${studentName}! He preparado la sesión en el horario exacto que me solicitaste (${safeDateTime(targetDate.toISOString())}) con el docente titular. Haz clic a continuación para confirmar tu cupo (se descontará 1 crédito):`;

          return {
            text,
            actionPayload: {
              kind: 'sessions_picker',
              sessions: [customSession]
            }
          };
        }

        // Agendamiento general sin hora específica
        const text = `Hola ${studentName}. Tienes **${availableCredits} crédito(s) disponible(s)**. Aquí tienes las sesiones y tutorías magistrales programadas. Puedes agendar tu lugar con 1 clic (se descontará 1 crédito), o si lo prefieres, dime a qué hora específica deseas tu clase:`;
        return {
          text,
          actionPayload: {
            kind: 'sessions_picker',
            sessions: preparedSessions
          }
        };
      }

      // =====================================================================
      // 4. INTENCIÓN: REGLAS DEL SISTEMA
      // =====================================================================
      if (
        q.includes('regla') ||
        q.includes('norma') ||
        q.includes('política') ||
        q.includes('politica') ||
        q.includes('condicion') ||
        q.includes('condición') ||
        q.includes('cómo funciona') ||
        q.includes('como funciona') ||
        q.includes('plazo') ||
        q.includes('reembolso')
      ) {
        const text = `Hola ${studentName}. En IPT Academy el agendamiento y cancelación de tutorías se rige por las siguientes 5 reglas oficiales:`;
        return {
          text,
          actionPayload: {
            kind: 'rules_card'
          }
        };
      }

      // =====================================================================
      // 5. CONSULTAS ACADÉMICAS (NOTAS, TAREAS, CURSOS)
      // =====================================================================
      if (
        q.includes('nota') ||
        q.includes('promedio') ||
        q.includes('calificaci') ||
        q.includes('cómo voy') ||
        q.includes('como voy') ||
        q.includes('mi avance') ||
        q.includes('progreso')
      ) {
        const graded = assignments.filter((a) => a.status === 'graded' && a.finalGrade !== undefined);
        if (courses.length === 0 && assignments.length === 0) {
          return {
            text: `Hola ${studentName}. En este momento la plataforma aún no tiene cursos ni tareas calificados. En cuanto el docente publique evaluaciones, podré darte el seguimiento detallado de tus notas.`
          };
        }
        return {
          text: `Hola ${studentName}, revisé tu expediente en tiempo real:\n• Lecciones completadas: ${completedCount}.\n• Tareas pendientes por entregar: ${pendingCount}.\n• Promedio de notas calificadas: ${avgScore}${graded.length > 0 ? ` (${graded.length} entregas evaluadas)` : ''}.`
        };
      }

      if (q.includes('tarea') || q.includes('entrega') || q.includes('pendiente') || q.includes('deber')) {
        if (assignments.length === 0) {
          return {
            text: `Actualmente no tienes ninguna tarea registrada en IPT Academy. Cuando el administrador publique una nueva actividad en la sección de Tareas, aparecerá automáticamente en tu calendario.`
          };
        }
        const pending = assignments.filter((a) => a.status === 'pending');
        if (pending.length === 0) {
          return {
            text: `¡Excelente trabajo, ${studentName}! Estás al día: no tienes tareas pendientes por entregar de las ${assignments.length} registradas en el curso.`
          };
        }
        const list = pending
          .map((a) => `• "${a.title}" (${a.courseTitle}) — Fecha límite: ${safeDateSlice(a.dueDateUtc)}`)
          .join('\n');
        return {
          text: `Tienes ${pending.length} tarea(s) pendiente(s) en este momento:\n${list}\n\nPuedes subir tu entrega desde la pestaña "Tareas" en el menú superior.`
        };
      }

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
              return {
                text: `Sobre "${les.title}" (del ${mod.title} en el curso "${course.title}"):\n${
                  les.description || 'Esta lección forma parte del plan de estudios activo.'
                }\nDuración estimada: ${les.duration || '10 min'}.${quizHint}`
              };
            }
          }
        }
      }

      // Respuesta por defecto con asistencia
      const firstCourse = courses[0];
      const activeTitle = firstCourse?.title || 'IPT Academy';
      return {
        text: `Hola ${studentName}. Estoy lista para ayudarte con tus clases de "${activeTitle}", tus tareas pendientes, tus notas o el agendamiento y cancelación de tus citas en vivo (tienes ${availableCredits} crédito(s) disponibles). ¿Qué deseas realizar?`,
        actionPayload: {
          kind: 'credits_card',
          credits: {
            available: availableCredits,
            consumed: consumedCredits,
            planTitle
          }
        }
      };
    },
    [
      liveKnowledgeContext,
      availableCredits,
      consumedCredits,
      planTitle,
      subscription?.currentPeriodEnd,
      preparedSessions,
      userConfirmedBookings,
      liveSessions,
      courses,
      assignments
    ]
  );

  // Ejecución atómica de agendamiento
  const handleExecuteBooking = async (session: {
    id: string;
    title: string;
    instructorName: string;
    startTimeUtc: string;
    durationMinutes: number;
    courseSlug: string;
  }) => {
    if (availableCredits <= 0) {
      showTopBanner('warning', 'No tienes créditos disponibles en este ciclo para agendar clases.');
      return;
    }

    setIsExecutingAction(session.id);
    try {
      await bookLiveSession(session.id, {
        courseSlug: session.courseSlug,
        teacherId: session.instructorName,
        title: session.title,
        startTime: session.startTimeUtc,
        durationMinutes: session.durationMinutes || 60
      });

      const confirmMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🎉 ¡Cita agendada con éxito!\n\n• Clase: "${session.title}"\n• Docente: ${session.instructorName}\n• Horario: ${safeDateTime(session.startTimeUtc)} (${session.durationMinutes} min)\n• Crédito descontado: 1 crédito de tu bolsa mensual (te quedan ${Math.max(0, availableCredits - 1)} créditos).\n\nRecuerda que si necesitas cancelar o reprogramar, debes hacerlo con al menos 4 horas de anticipación para que tu crédito sea reembolsado automáticamente. ¡Nos vemos en /live!`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => {
        const next = [...prev, confirmMsg];
        persistMessagesToFirebase(next);
        return next;
      });
      showTopBanner('ready', `Cita agendada: se descontó 1 crédito de tu bolsa.`, 4500);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ No se pudo completar la reserva: ${err?.message || 'Error al procesar la cita.'}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsExecutingAction(null);
    }
  };

  // Ejecución atómica de cancelación
  const handleExecuteCancellation = async (booking: {
    id: string;
    title: string;
    hoursRemaining: number;
  }) => {
    setIsExecutingAction(booking.id);
    try {
      await cancelLiveBooking(booking.id);

      const confirmMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `✅ Tu cita para "${booking.title}" ha sido cancelada con éxito.\n\n• Reembolso: Tu crédito de tutoría ha sido reintegrado a tu cuenta de inmediato (ahora dispones de ${availableCredits + 1} créditos).\n\nPuedes volver a agendar en cualquier momento pidiéndome "Agendar cita".`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => {
        const next = [...prev, confirmMsg];
        persistMessagesToFirebase(next);
        return next;
      });
      showTopBanner('ready', `Cita cancelada: tu crédito fue reintegrado con éxito.`, 4500);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ No se pudo cancelar la cita: ${err?.message || 'Error al procesar la cancelación.'}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsExecutingAction(null);
    }
  };

  const handleFastIntent = (intent: 'creditos' | 'agendar' | 'citas' | 'reglas' | string) => {
    const promptMap: Record<string, string> = {
      creditos: '¿Cuántos créditos de tutoría tengo disponibles?',
      agendar: 'Quiero agendar una cita o clase en vivo',
      citas: 'Ver mis citas agendadas',
      reglas: '¿Cuáles son las reglas y condiciones de las citas?'
    };
    const question = promptMap[intent] || intent;
    executeSendMessage(question);
  };

  // Procesador autónomo de mensajes con IA y Tool Calling guiado por directrices inviolables
  const executeSendMessage = async (promptText: string) => {
    const cleanPrompt = promptText.trim();
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
      const studentName =
        user?.displayName || (user?.email ? user.email.split('@')[0] : 'Estudiante');

      // Ensamblaje del contexto institucional para el modelo autónomo
      const groqCtx: GroqTutorContext = {
        studentName,
        roleLabel: effectiveIsAdmin ? 'Administrador / Docente' : 'Estudiante',
        planTitle,
        availableCredits,
        consumedCredits,
        cycleEnd: subscription?.currentPeriodEnd,
        activeBookings: userConfirmedBookings.map((b) => {
          const session = liveSessions.find((s) => s.id === b.sessionId);
          return {
            id: b.id,
            sessionId: b.sessionId,
            title: (b as any).sessionTitle || session?.title || 'Tutoría Sincrónica con Docente Titular',
            instructorName: (b as any).sessionInstructor || session?.instructorName || 'Ing. Iván Pérez',
            startTimeUtc: (b as any).sessionStartTime || session?.startTimeUtc || '',
            bookedAt: b.bookedAt
          };
        }),
        availableSessions: preparedSessions.map((s) => ({
          id: s.id,
          title: s.title,
          instructorName: s.instructorName,
          startTimeUtc: s.startTimeUtc,
          durationMinutes: s.durationMinutes,
          courseSlug: s.courseSlug
        })),
        teacherDirectives,
        coursesSummary: liveKnowledgeContext.coursesSummary,
        assignmentsSummary: liveKnowledgeContext.assignmentsSummary
      };

      const historyForAgent: GroqChatMessage[] = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      // Invocación del Agente Autónomo (Groq openai/gpt-oss-120b)
      let agentResponse;
      try {
        agentResponse = await askTutorIAWithGroq(cleanPrompt, historyForAgent, groqCtx);
      } catch (err) {
        console.warn('Groq Agent invocation fallback to local:', err);
        const fallback = buildContextualResponse(cleanPrompt);
        agentResponse = { text: fallback.text, toolCall: undefined };
      }

      let replyText = agentResponse.text || '';
      let actionPayload: InteractiveActionPayload | undefined = undefined;

      // RESOLUCIÓN AUTÓNOMA DE HERRAMIENTAS (TOOL CALLING)
      if (agentResponse.toolCall) {
        const { name, arguments: args } = agentResponse.toolCall;

        if (name === 'agendar_cita') {
          if (availableCredits <= 0) {
            replyText =
              replyText ||
              `Hola ${studentName}. Actualmente cuentas con 0 créditos en tu bolsa de clases en vivo. Cada sesión sincrónica requiere 1 crédito de tu suscripción mensual.`;
            actionPayload = {
              kind: 'credits_card',
              credits: {
                available: availableCredits,
                consumed: consumedCredits,
                planTitle,
                cycleEnd: subscription?.currentPeriodEnd
              }
            };
          } else {
            replyText =
              replyText ||
              `Hola ${studentName}. Tienes ${availableCredits} crédito(s) disponible(s). A continuación te presento las sesiones y tutorías programadas. Puedes agendar tu lugar con 1 clic (se descontará 1 crédito):`;
            actionPayload = {
              kind: 'sessions_picker',
              sessions: preparedSessions
            };
          }
        } else if (name === 'cancelar_cita') {
          if (userConfirmedBookings.length === 0) {
            replyText =
              replyText ||
              `Hola ${studentName}. No tienes ninguna cita activa agendada en este momento para cancelar. Tienes ${availableCredits} crédito(s) disponibles para cuando desees programar.`;
            actionPayload = {
              kind: 'credits_card',
              credits: {
                available: availableCredits,
                consumed: consumedCredits,
                planTitle,
                cycleEnd: subscription?.currentPeriodEnd
              }
            };
          } else if (userConfirmedBookings.length === 1) {
            const targetBooking = userConfirmedBookings[0];
            const session = liveSessions.find((s) => s.id === targetBooking.sessionId);
            const title =
              (targetBooking as any).sessionTitle ||
              session?.title ||
              'Tutoría Sincrónica Personalizada (1 a 1)';
            const defaultTomorrow = new Date();
            defaultTomorrow.setDate(defaultTomorrow.getDate() + 1);
            defaultTomorrow.setHours(18, 0, 0, 0);
            const startTimeUtc =
              (targetBooking as any).sessionStartTime ||
              session?.startTimeUtc ||
              defaultTomorrow.toISOString();

            const diffMs = new Date(startTimeUtc).getTime() - Date.now();
            const fourHoursMs = 4 * 60 * 60 * 1000;
            const bookedAtMs = new Date(targetBooking.bookedAt).getTime();
            const isRecentBooking = Date.now() - bookedAtMs < 30 * 60 * 1000; // Ventana de gracia de 30 min
            const forceCancelRequested = Boolean(args?.forzarSinReembolso);

            if (diffMs >= fourHoursMs || isRecentBooking) {
              // Cancelación con reembolso total
              try {
                await cancelLiveBooking(targetBooking.id);
                replyText = `✅ ¡Cita cancelada con éxito, ${studentName}!

• Clase cancelada: "${title}"
• Horario programado: ${safeDateTime(startTimeUtc)}
• Reembolso: Tu crédito de tutoría ha sido reintegrado inmediatamente a tu cuenta (ahora tienes ${availableCredits + 1} crédito(s) disponibles).
${
                  isRecentBooking
                    ? '• Ventana de gracia: Se aplicó la devolución inmediata de crédito por cancelación de reserva reciente.\n'
                    : ''
                }
Puedes reprogramar en cualquier momento en el horario que prefieras.`;
                actionPayload = {
                  kind: 'credits_card',
                  credits: {
                    available: availableCredits + 1,
                    consumed: Math.max(0, consumedCredits - 1),
                    planTitle,
                    cycleEnd: subscription?.currentPeriodEnd
                  }
                };
                showTopBanner('ready', 'Cita cancelada: crédito reintegrado con éxito.', 5000);
              } catch (err: any) {
                replyText = `⚠️ No se pudo cancelar la cita: ${err?.message || 'Error al procesar la cancelación.'}`;
              }
            } else if (forceCancelRequested) {
              // Estudiante insistió en cancelar aunque no haya reembolso
              try {
                await cancelLiveBooking(targetBooking.id, { forceCancel: true });
                replyText = `✅ He cancelado la cita para "${title}" (${safeDateTime(startTimeUtc)}) de tu agenda institucional tal como lo indicaste.

• Estado: Cita eliminada de tu calendario.
• Créditos: Por haberse cancelado con menos de 4 horas de antelación y fuera de la ventana de gracia, no se reintegró el crédito según las directrices de IPT Academy.`;
                actionPayload = {
                  kind: 'credits_card',
                  credits: {
                    available: availableCredits,
                    consumed: consumedCredits,
                    planTitle,
                    cycleEnd: subscription?.currentPeriodEnd
                  }
                };
                showTopBanner('ready', 'Cita cancelada de tu agenda.', 4500);
              } catch (err: any) {
                replyText = `⚠️ No se pudo cancelar la cita: ${err?.message || 'Error al procesar la cancelación.'}`;
              }
            } else {
              // Menos de 4 horas: advertir y dar la opción de cancelar de todas formas
              replyText = `Hola ${studentName}. Ubiqué tu cita para "${title}" (${safeDateTime(startTimeUtc)}). Faltan menos de 4 horas para su inicio, por lo que la cancelación no reintegra el crédito automáticamente.

Si deseas cancelarla de todas formas de tu calendario institucional, respóndeme **"cancélala de igual manera"** y la daré de baja de inmediato.`;
            }
          } else {
            // Múltiples citas: mostrar tarjeta interactiva
            const mappedBookings = userConfirmedBookings.map((bkg) => {
              const session = liveSessions.find((s) => s.id === bkg.sessionId);
              const title =
                (bkg as any).sessionTitle ||
                session?.title ||
                'Tutoría Sincrónica con Docente Titular';
              const instructorName =
                (bkg as any).sessionInstructor || session?.instructorName || 'Ing. Iván Pérez';
              const startTimeUtc =
                (bkg as any).sessionStartTime || session?.startTimeUtc || new Date().toISOString();
              const sessionStartMs = new Date(startTimeUtc).getTime();
              const diffMs = sessionStartMs - Date.now();
              const bookedAtMs = new Date(bkg.bookedAt).getTime();
              const isRecent = Date.now() - bookedAtMs < 30 * 60 * 1000;
              const canCancel = diffMs >= 4 * 60 * 60 * 1000 || isRecent;
              const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

              return {
                id: bkg.id,
                sessionId: bkg.sessionId,
                title,
                instructorName,
                startTimeUtc,
                canCancel,
                hoursRemaining
              };
            });

            replyText =
              replyText ||
              `Hola ${studentName}. Aquí tienes tus citas activas. Puedes presionar "Cancelar" en la que desees gestionar:`;
            actionPayload = {
              kind: 'bookings_list',
              bookings: mappedBookings
            };
          }
        } else if (name === 'consultar_creditos') {
          replyText =
            replyText ||
            `Hola ${studentName}. En tu plan ${planTitle} dispones de **${availableCredits} crédito(s) para clases y tutorías sincrónicas** en este ciclo (has utilizado ${consumedCredits}). Cada cita consume 1 crédito de tu bolsa mensual, y si cancelas con más de 4 horas de anticipación tu crédito se reintegra al instante.`;
          actionPayload = {
            kind: 'credits_card',
            credits: {
              available: availableCredits,
              consumed: consumedCredits,
              planTitle,
              cycleEnd: subscription?.currentPeriodEnd
            }
          };
        } else if (name === 'consultar_reglas') {
          replyText =
            replyText ||
            `Estas son las normas y directrices institucionales de tutorías y clases sincrónicas en IPT Academy:`;
          actionPayload = {
            kind: 'rules_card'
          };
        } else if (name === 'consultar_tareas') {
          const pending = assignments.filter((a) => a.status === 'pending');
          if (pending.length === 0) {
            replyText = `¡Excelente noticia, ${studentName}! Estás completamente al día: no tienes tareas pendientes de entrega.`;
          } else {
            const list = pending
              .map(
                (a) =>
                  `• "${a.title}" (${a.courseTitle}) — Fecha límite: ${safeDateSlice(a.dueDateUtc)}`
              )
              .join('\n');
            replyText = `Tienes ${pending.length} tarea(s) pendiente(s) en este momento:
${list}

Puedes subir tu entrega desde la pestaña "Tareas" en el menú superior.`;
          }
        }
      }

      // Si no hubo tool call y el replyText está vacío, proporcionar fallback
      if (!replyText) {
        const fallback = buildContextualResponse(cleanPrompt);
        replyText = fallback.text;
        actionPayload = fallback.actionPayload;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        actionPayload
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      persistMessagesToFirebase(finalMessages);
    } catch (err: any) {
      console.error('Error in executeSendMessage:', err);
      const fallback = buildContextualResponse(cleanPrompt);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fallback.text,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        actionPayload: fallback.actionPayload
      };
      const finalMessages = [...nextMessages, errorMsg];
      setMessages(finalMessages);
      persistMessagesToFirebase(finalMessages);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSendMessage(inputPrompt);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-hide-btn="true"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position?.x ?? 24,
      startY: 500,
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

    if (!dragStartRef.current.moved) {
      if (!isReady || loadProgress < 100) {
        showTopBanner(
          'warning',
          'Actualmente el TutorIA no está disponible, una vez completada la carga vuelve a intentarlo',
          5500
        );
        return;
      }
      setIsChatOpen((prev) => !prev);
    }
  };

  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (loadProgress / 100) * circumference;
  const currentZone = getPositionZoneLabel(position?.x ?? 24);

  return (
    <>
      {/* Banner de Notificación Superior */}
      {topBanner.show && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] sm:w-auto px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-white/20 bg-slate-900/95 text-white"
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              topBanner.type === 'ready'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}
          >
            {topBanner.type === 'ready' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <p className="text-xs font-medium text-slate-100 flex-1 leading-snug">
            {topBanner.text}
          </p>
          <button
            type="button"
            onClick={() => setTopBanner((prev) => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Botón flotante para restaurar si el usuario lo ocultó */}
      {isHidden && (
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          title="Mostrar TutorIA"
          className="fixed bottom-20 left-4 z-[95] p-2.5 rounded-full bg-slate-900/90 text-white border border-slate-700 shadow-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          <span>TutorIA</span>
          <span className="px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-300 text-[10px]">
            {availableCredits}🎟️
          </span>
        </button>
      )}

      {/* Widget Circular Flotante */}
      {!isHidden && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            transform: `translate3d(${position?.x ?? 24}px, ${position?.y ?? 500}px, 0)`,
            touchAction: 'none'
          }}
          className={`fixed top-0 left-0 z-[95] select-none cursor-grab active:cursor-grabbing transition-shadow ${
            isDragging ? 'scale-105 shadow-2xl' : ''
          }`}
          title="TutorIA • IPT Academy (Arrastra para mover o haz clic para abrir)"
        >
          <button
            type="button"
            data-hide-btn="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
              setIsChatOpen(false);
            }}
            title="Ocultar TutorIA"
            className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600 flex items-center justify-center shadow-md transition-colors cursor-pointer"
          >
            <EyeOff className="w-2.5 h-2.5" />
          </button>

          <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-slate-900 shadow-2xl border border-slate-700/80">
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 64 64"
            >
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-slate-800 fill-transparent"
                strokeWidth="3"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-cyan-400 fill-transparent transition-all duration-300 ease-out"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center p-1.5 shadow-inner">
              <Image
                src="/favicon.png"
                alt="IPT Academy TutorIA"
                width={38}
                height={38}
                className="w-full h-full object-contain pointer-events-none select-none"
                priority
              />
              <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                {availableCredits}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ventana de Conversación del Tutor IA */}
      {isChatOpen && isReady && !isHidden && (
        <div
          className={`fixed z-[96] bg-white rounded-2xl border border-[#d1d2e0] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-all ${
            'left-3 right-3 sm:left-auto sm:right-auto sm:w-[420px]'
          } ${
            keyboardOffset > 0 ? '' : 'bottom-20 sm:bottom-28'
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
                ? `${Math.min(520, visualViewportHeight - 20)}px`
                : visualViewportHeight
                ? `${Math.min(590, visualViewportHeight - 110)}px`
                : 'min(590px, calc(100dvh - 120px))'
          }}
        >
          {/* Cabecera del TutorIA */}
          <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
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
                  Asistente inteligente con facultades de agendamiento
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

          {/* Subcabecera Informativa */}
          <div className="bg-[#1e293b] px-4 py-2 flex items-center justify-between border-b border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center">
                <Ticket className="w-3 h-3" />
              </div>
              <div className="text-[11px] text-slate-300">
                <span className="text-white font-semibold">Créditos de Tutoría:</span>{' '}
                <span className="text-violet-400 font-bold">{availableCredits} disponibles</span>
                {consumedCredits > 0 && (
                  <span className="text-slate-400"> ({consumedCredits} usados)</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleFastIntent('reglas')}
              className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-medium cursor-pointer"
            >
              Reglas del sistema
            </button>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f8fafc]">
            {messages.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3 text-xs text-[#334155]">
                <div className="flex items-center gap-2 text-[#1d4ed8] font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>¡Hola, {liveKnowledgeContext.studentName}!</span>
                </div>
                <p className="leading-relaxed text-[#475569]">
                  Soy <strong>TutorIA</strong>. Puedo ayudarte a agendar citas a horas específicas, cancelar citas con reembolso automático, verificar tus créditos y resolver dudas académicas.
                </p>

                <div className="pt-1 flex flex-wrap gap-1.5">
                  {[
                    { label: '🎟️ Ver mis créditos', intent: 'creditos' },
                    { label: '📅 Agendar cita', intent: 'agendar' },
                    { label: '📋 Mis citas', intent: 'citas' },
                    { label: '⚖️ Reglas de citas', intent: 'reglas' },
                    { label: '📊 Mis notas', intent: '¿Cómo voy en mis notas?' },
                    { label: '📚 Curso actual', intent: 'Explícame el curso actual' }
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleFastIntent(btn.intent)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      {btn.label}
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
                      m.role === 'user' ? 'bg-[#1d4ed8] text-white' : 'bg-[#0f172a] text-cyan-300'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <UserIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                      m.role === 'user'
                        ? 'bg-[#1d4ed8] text-white rounded-tr-xs'
                        : 'bg-white text-[#1e293b] border border-[#e2e8f0] rounded-tl-xs'
                    }`}
                  >
                    <p>{m.content}</p>

                    {/* Tarjetas Interactivas de Acción */}
                    {m.actionPayload && (
                      <div className="mt-2.5">
                        {/* Selector de Sesiones */}
                        {m.actionPayload.kind === 'sessions_picker' && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              Opciones de Agendamiento
                            </p>
                            {m.actionPayload.sessions && m.actionPayload.sessions.length > 0 ? (
                              m.actionPayload.sessions.map((sess) => (
                                <div
                                  key={sess.id}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h5 className="font-bold text-[12px] text-slate-900 leading-snug">
                                        {sess.title}
                                      </h5>
                                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                        <span>{sess.instructorName}</span> •{' '}
                                        <span>{sess.durationMinutes} min</span>
                                      </p>
                                    </div>
                                    {sess.isBooked && (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                        ✓ Reservada
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {safeDateTime(sess.startTimeUtc)}
                                    </span>
                                    {!sess.isBooked && (
                                      sess.tooLateToBook ? (
                                        <span className="text-amber-700 font-medium">
                                          Antelación cerrada (&lt; 4h)
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={
                                            isExecutingAction === sess.id || availableCredits <= 0
                                          }
                                          onClick={() => handleExecuteBooking(sess)}
                                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-[10px] transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                        >
                                          {isExecutingAction === sess.id ? (
                                            <span className="animate-spin w-2.5 h-2.5 border border-white border-t-transparent rounded-full" />
                                          ) : (
                                            <Ticket className="w-2.5 h-2.5" />
                                          )}
                                          Agendar (-1 crédito)
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-500">
                                No hay sesiones en vivo programadas en este momento.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Lista de Citas Programadas con Botón de Cancelación */}
                        {m.actionPayload.kind === 'bookings_list' && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Tus Citas Programadas
                            </p>
                            {m.actionPayload.bookings && m.actionPayload.bookings.length > 0 ? (
                              m.actionPayload.bookings.map((bkg) => (
                                <div
                                  key={bkg.id}
                                  className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h5 className="font-bold text-[12px] text-slate-900 leading-snug">
                                        {bkg.title}
                                      </h5>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        {bkg.instructorName}
                                      </p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                      Confirmada
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] pt-1">
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {safeDateTime(bkg.startTimeUtc)}
                                    </span>
                                    {bkg.canCancel ? (
                                      <button
                                        type="button"
                                        disabled={isExecutingAction === bkg.id}
                                        onClick={() => handleExecuteCancellation(bkg)}
                                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        {isExecutingAction === bkg.id ? (
                                          <span className="animate-spin w-2.5 h-2.5 border border-rose-700 border-t-transparent rounded-full" />
                                        ) : (
                                          <Trash2 className="w-2.5 h-2.5" />
                                        )}
                                        Cancelar (+1 crédito)
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-amber-700 font-medium">
                                        Menos de 4h (Sin reembolso)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-500">
                                No tienes citas programadas actualmente.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tarjeta de Créditos */}
                        {m.actionPayload.kind === 'credits_card' && (
                          <div className="pt-2 border-t border-slate-100 p-3 rounded-xl bg-slate-900 text-white space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Bolsa de Créditos
                              </span>
                              <span className="text-[10px] font-medium text-cyan-400">
                                Plan {m.actionPayload.credits?.planTitle || planTitle}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-extrabold text-white">
                                {m.actionPayload.credits?.available ?? availableCredits}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                crédito(s) disponibles para clases en vivo
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              Cada cita descuenta 1 crédito de tu bolsa mensual. Si cancelas con más de 4 horas de anticipación, tu crédito vuelve automáticamente a tu cuenta.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleFastIntent('agendar')}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] text-center transition-colors cursor-pointer"
                              >
                                📅 Agendar Cita
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFastIntent('citas')}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-[10px] text-center transition-colors cursor-pointer"
                              >
                                📋 Mis Citas
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tarjeta de Reglas Oficiales */}
                        {m.actionPayload.kind === 'rules_card' && (
                          <div className="pt-2 border-t border-slate-100 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2 text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                              <span>Reglas Oficiales del Sistema de Citas</span>
                            </div>
                            <ul className="space-y-1.5 text-slate-600 leading-snug">
                              <li className="flex items-start gap-1.5">
                                <span className="font-bold text-blue-600 shrink-0">1.</span>
                                <span>
                                  <strong>1 Cita = 1 Crédito:</strong> Agendar una sesión descuenta automáticamente 1 crédito de tu saldo mensual.
                                </span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="font-bold text-blue-600 shrink-0">2.</span>
                                <span>
                                  <strong>Anticipación de 4 Horas:</strong> Las citas solo pueden reservarse o cancelarse con al menos 4 horas de antelación al inicio.
                                </span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="font-bold text-blue-600 shrink-0">3.</span>
                                <span>
                                  <strong>Reembolso Automático:</strong> Si cancelas tu cita con &gt; 4 horas de anticipación, el crédito se reintegra al instante a tu cuenta.
                                </span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="font-bold text-blue-600 shrink-0">4.</span>
                                <span>
                                  <strong>Quórum Mínimo:</strong> Se evalúa 3 horas antes (mínimo 3 estudiantes). Si no se alcanza, se cancela y tu crédito se reembolsa.
                                </span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="font-bold text-blue-600 shrink-0">5.</span>
                                <span>
                                  <strong>Horario Institucional:</strong> Las tutorías operan entre las 7:00 AM y las 10:00 PM (hora Colombia).
                                </span>
                              </li>
                            </ul>
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFastIntent('creditos')}
                                className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold text-[10px] hover:bg-blue-200 transition-colors cursor-pointer"
                              >
                                🎟️ Ver mis créditos
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFastIntent('agendar')}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-semibold text-[10px] hover:bg-slate-300 transition-colors cursor-pointer"
                              >
                                📅 Agendar cita
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                <span>TutorIA está analizando tu solicitud...</span>
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
              placeholder="Escribe tu duda, pide una hora (ej. 'a las 8am') o cancela una cita..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#cbd5e1] focus:outline-none focus:border-[#1d4ed8] text-[#0f172a]"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="p-2.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
