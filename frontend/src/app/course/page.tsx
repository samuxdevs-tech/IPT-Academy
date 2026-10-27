'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Play,
  Share2,
  HelpCircle,
  FileText,
  MessageSquare,
  Bookmark,
  Award,
  ThumbsUp,
  RotateCcw,
  RotateCw,
  Maximize,
  Volume2,
  VolumeX,
  PlaySquare,
  Search,
  Plus,
  Send,
  X,
  Clock,
  Sparkles,
  Info,
  Target,
  Eye,
  BookOpen,
  GitBranch,
  SlidersHorizontal,
  ExternalLink,
  Film,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, set, get, push, onValue, update } from 'firebase/database';
import UniversalVideoPlayer from '@/components/UniversalVideoPlayer';
import CheckpointQuizModal from '@/components/CheckpointQuizModal';
import InVideoCheckpointModal from '@/components/InVideoCheckpointModal';
import PopQuizModal from '@/components/PopQuizModal';
import UserProfileMenu from '@/components/UserProfileMenu';
import LockToast from '@/components/LockToast';
import { Course, Lesson, Metric, NoteItem, QuestionPost, InVideoCheckpoint, LessonProgressItem, SandboxMission, QuizQuestion, Resource } from '@/types';
import { normalizeCourse } from '@/lib/courseUtils';
import { verifyUserHasCourseLicense, generateCourseLicenseToken } from '@/lib/licenseUtils';



// Banco de preguntas de comprobación zootécnica por lección
const DEFAULT_LESSON_QUIZZES: Record<string, QuizQuestion[]> = {
  'les-1-1': [
    {
      id: 'q-1-1-1',
      prompt: '¿Cuál es el beneficio primordial de utilizar delimitación perimetral SIG en la gestión ganadera de precisión?',
      options: [
        'Aumentar el conteo visual sin georreferenciación',
        'Calcular con exactitud el aforo y la subdivisión de potreros para evitar sobrepastoreo',
        'Reemplazar la cerca perimetral física por satélites',
        'Eliminar la necesidad de pesajes periódicos'
      ],
      correctIndex: 1,
      explanation: 'La delimitación con Sistemas de Información Geográfica (SIG) permite conocer el área real útil de pastoreo, calcular la carga animal exacta y diseñar rotaciones precisas.'
    },
    {
      id: 'q-1-1-2',
      prompt: 'Al mapear potreros con SIG, ¿qué variable agronómica se correlaciona directamente con la biomasa disponible?',
      options: [
        'El color del alambre de púa',
        'El índice de vegetación y área efectiva de pastoreo (ha netas)',
        'La distancia a la capital departamental',
        'El número de comederos portátiles'
      ],
      correctIndex: 1,
      explanation: 'El área efectiva neta combinada con índices de biomasa determina la oferta forrajera real para el cálculo de UGM.'
    }
  ],
  'les-1-2': [
    {
      id: 'q-1-2-1',
      prompt: 'En la gobernanza administrativa de DataGan, ¿por qué los vaqueros tienen permisos restringidos frente al administrador?',
      options: [
        'Porque no tienen acceso a teléfonos móviles',
        'Para proteger la consistencia de inventarios y evitar alteraciones no autorizadas en registros de compras o bajas',
        'Para impedir que registren partos diarios',
        'Para obligarlos a usar planillas físicas de papel'
      ],
      correctIndex: 1,
      explanation: 'La separación de roles garantiza trazabilidad: el personal operativo captura eventos de campo y los administradores validan modificaciones financieras y de inventario.'
    }
  ],
  'les-2-1': [
    {
      id: 'q-2-1-1',
      prompt: 'Según las Leyes Universales del Pastoreo de Voisin, ¿qué ocurre si el periodo de descanso de la pradera es insuficiente?',
      options: [
        'El pasto produce mayor volumen radicular',
        'La planta agota sus reservas de carbohidratos radiculares, provocando degradación y menor rebrote',
        'Se duplica automáticamente la proteína cruda',
        'Aumenta la ganancia diaria de peso sin suplementación'
      ],
      correctIndex: 1,
      explanation: 'El descanso óptimo permite a la pastura acumular reservas en la raíz y alcanzar el punto óptimo de reposo antes de la siguiente defoliación.'
    }
  ],
  'les-2-2': [
    {
      id: 'q-2-2-1',
      prompt: '¿A cuántos kilogramos de peso vivo equivale convencionalmente una Unidad Gran Ganado (UGM)?',
      options: [
        '250 kg de peso vivo',
        '450 kg de peso vivo',
        '700 kg de peso vivo',
        '1000 kg de peso vivo'
      ],
      correctIndex: 1,
      explanation: 'El estándar zootécnico define 1 UGM como un animal adulto de 450 kg de peso vivo consumiendo el porcentaje correspondiente de MS diaria.'
    }
  ],
  'les-3-1': [
    {
      id: 'q-3-1-1',
      prompt: '¿Qué hormona es la responsable directa del reflejo de eyección de leche en los alvéolos mamarios durante el ordeño?',
      options: [
        'Adrenalina',
        'Oxitocina',
        'Cortisol',
        'Progesterona'
      ],
      correctIndex: 1,
      explanation: 'La oxitocina viaja por el torrente sanguíneo provocando la contracción de las células mioepiteliales para liberar la leche hacia las cisternas mamarias.'
    }
  ],
  'les-3-2': [
    {
      id: 'q-3-2-1',
      prompt: '¿En qué fase de la curva de lactancia de una vaca lechera se ubica usualmente el pico máximo de producción?',
      options: [
        'En los primeros 10 días posparto',
        'Entre las semanas 4 y 8 (30 a 60 días posparto)',
        'A los 200 días posparto',
        'Durante el periodo seco'
      ],
      correctIndex: 1,
      explanation: 'El pico de lactancia ocurre entre las 4 y 8 semanas posparto, exigiendo máxima densidad energética para mitigar el balance energético negativo.'
    }
  ],
  'les-4-1': [
    {
      id: 'q-4-1-1',
      prompt: 'Para una medición precisa de Ganancia Diaria de Peso (GDP), ¿cuál es la mejor práctica de manejo del pesaje?',
      options: [
        'Pesar a cualquier hora tras pastoreo abundante y agua libre',
        'Pesar con protocolo estandarizado de ayuno y a la misma hora del día para evitar variaciones por llenado ruminal',
        'Calcular el peso únicamente con cinta métrica visual',
        'Pesar los animales solo una vez al año'
      ],
      correctIndex: 1,
      explanation: 'El contenido ruminal y de agua puede variar entre 10% y 15% del peso vivo; la hora y protocolo constante garantizan mediciones comparables.'
    }
  ],
  'les-4-2': [
    {
      id: 'q-4-2-1',
      prompt: '¿Qué indicador mide la productividad de carne por hectárea (kg carne/ha/año)?',
      options: [
        'La altura de los árboles en el potrero',
        'La carga animal multiplicada por la Ganancia Diaria de Peso en el periodo sobre el área útil',
        'El precio de venta en subasta local',
        'El número total de vacas en ordeño'
      ],
      correctIndex: 1,
      explanation: 'Productividad = (Carga Animal en cabezas/ha × GDP en kg/día × Días de pastoreo), reflejando la eficiencia zootécnica integral del predio.'
    }
  ],
  'les-5-1': [
    {
      id: 'q-5-1-1',
      prompt: '¿Por qué un aumento en los días abiertos (período parto-concepción) genera pérdidas financieras críticas?',
      options: [
        'Porque los terneros nacen más pesados de lo normal',
        'Porque se reducen los terneros producidos en la vida útil de la vaca y se prolongan días de baja producción o secado improductivo',
        'Porque baja el costo de alimentación',
        'Porque no afecta los costos fijos de la explotación'
      ],
      correctIndex: 1,
      explanation: 'Cada día abierto por encima del umbral óptimo (ej. >110 días) representa costo de mantenimiento diario sin cría gestada ni producción óptima de leche.'
    }
  ],
  'les-5-2': [
    {
      id: 'q-5-2-1',
      prompt: '¿Cuál es el objetivo principal de un protocolo de Inseminación Artificial a Tiempo Fijo (IATF)?',
      options: [
        'Eliminar la necesidad de semen certificado',
        'Sincronizar la ovulación del lote para inseminar sin requerir detección visual de celo, concentrando partos',
        'Garantizar un 100% de preñez en una sola monta natural',
        'Aumentar el intervalo entre partos a 24 meses'
      ],
      correctIndex: 1,
      explanation: 'La IATF permite sincronizar la onda folicular y la ovulación mediante progestágenos y estrógenos, optimizando la tasa de preñez acumulada del lote.'
    }
  ],
  'les-6-1': [
    {
      id: 'q-6-1-1',
      prompt: 'En ganadería de precisión, ¿qué alerta zootécnica indica un Índice de Temperatura-Humedad (ITH) superior a 72?',
      options: [
        'Estrés por frío extremo',
        'Inicio de estrés calórico que reduce el consumo de materia seca y la producción',
        'Clima ideal sin impacto fisiológico',
        'Aumento espontáneo de la fertilidad'
      ],
      correctIndex: 1,
      explanation: 'Un ITH > 72 activa mecanismos de disipación de calor (jadeo, redistribución sanguínea), deprimiendo el consumo de forraje y la producción láctea.'
    }
  ],
  'les-7-1': [
    {
      id: 'q-7-1-1',
      prompt: 'En sistemas ganaderos de doble propósito, ¿cómo deben asignarse los costos conjuntos entre leche y carne?',
      options: [
        'Atribuyendo el 100% de los costos a la leche',
        'Mediante criterios zootécnicos o valor relativo de mercado según la participación en los ingresos y recursos consumidos',
        'Dividiendo exactamente 50/50 sin importar la producción real',
        'Ignorando los costos de mano de obra y sanidad'
      ],
      correctIndex: 1,
      explanation: 'El costeo conjunto exige métodos objetivos (como valor relativo de venta o prorrateo por UGM) para calcular el costo unitario por litro y por kg de carne producida.'
    }
  ]
};

function getLessonQuizQuestions(lesson?: Lesson | null): QuizQuestion[] {
  if (!lesson) return [];
  if (lesson.checkpointQuiz && lesson.checkpointQuiz.length > 0) {
    return lesson.checkpointQuiz;
  }
  return DEFAULT_LESSON_QUIZZES[lesson.id] || [
    {
      id: `default-${lesson.id}-1`,
      prompt: `¿Cuál es el concepto zootécnico principal desarrollado en la sesión "${lesson.title}"?`,
      options: [
        'Implementación de buenas prácticas ganaderas y control de variables productivas',
        'Manejo aleatorio sin registro de información en campo',
        'Eliminación de la toma de datos de pesajes y aforos',
        'Exclusión de registros financieros en el hato'
      ],
      correctIndex: 0,
      explanation: 'La ganadería de precisión se fundamenta en la estandarización de procesos y el control sistemático de parámetros productivos.'
    }
  ];
}

export default function CourseViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#202230] text-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#b7b9cd]">Cargando Aula Virtual...</p>
          </div>
        </div>
      }
    >
      <CourseViewerContent />
    </React.Suspense>
  );
}

function CourseViewerContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('id') || '';
  const initialTabParam = searchParams.get('tab');
  const { user, effectiveIsAdmin, userLicenses, grantCourseLicense } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [course, setCourse] = useState<Course | null>(null);

  // Auto-otorgar licencia al enrolarse en un curso gratuito y público
  useEffect(() => {
    if (!course || !user) return;
    const isFree = (course.accessType || 'free') === 'free';
    const isPublic = (course.visibility || 'public') !== 'draft' && course.published !== false;
    if (isFree && isPublic) {
      const token = course.licenseToken || generateCourseLicenseToken(course.slug);
      if (!verifyUserHasCourseLicense(course, userLicenses)) {
        grantCourseLicense(course.slug, token).catch(() => {});
      }
    }
  }, [course, user, userLicenses, grantCourseLicense]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [metricDetails, setMetricDetails] = useState<Metric[]>([]);

  // Pestañas exactas de Datagan + Métricas DataGan + Misiones Sandbox (Fase 3)
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'missions' | 'qa' | 'notes'>(
    initialTabParam === 'missions' ? 'missions' : 'overview'
  );
  const [missionsList, setMissionsList] = useState<SandboxMission[]>([]);
  const [approvedMissions, setApprovedMissions] = useState<Record<string, boolean>>({});
  const [embeddedSandboxMissionId, setEmbeddedSandboxMissionId] = useState<string | null>(null);

  // Estado del Reproductor y Timecodes
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockToastKey, setLockToastKey] = useState<number>(0);

  const triggerLockToast = useCallback((msg: string) => {
    setLockMessage(msg);
    setLockToastKey((k) => k + 1);
  }, []);

  // Modal de Verificación de Aprendizaje
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [activeInVideoCheckpoint, setActiveInVideoCheckpoint] = useState<InVideoCheckpoint | null>(null);
  const [lessonProgressList, setLessonProgressList] = useState<LessonProgressItem[]>([]);

  // Recursos desplegables y Pop Quiz activo
  const [openResourcesLessonId, setOpenResourcesLessonId] = useState<string | null>(null);
  const [completedResources, setCompletedResources] = useState<string[]>([]);
  const [activePopQuiz, setActivePopQuiz] = useState<{
    id?: string;
    title: string;
    questions: QuizQuestion[];
    lessonTitle: string;
  } | null>(null);

  // Progreso de la lección activa
  const activeLp = lessonProgressList.find((lp) => lp.lessonId === activeLesson?.id);
  const activeDuration = activeLp?.videoDurationSeconds || activeLesson?.durationSeconds || 900;
  const activeCoverage = activeDuration > 0
    ? Math.min(100, Math.round(((activeLp?.totalSecondsWatched || 0) / activeDuration) * 100))
    : 0;

  // Notas con timecode
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Preguntas y Respuestas (Q&A)
  
  const [questions, setQuestions] = useState<QuestionPost[]>([]);
  
  const [seekCommand, setSeekCommand] = useState<number | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  const [qaSearch, setQaSearch] = useState('');
  const [newQTitle, setNewQTitle] = useState('');
  const [newQBody, setNewQBody] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Cargar datos del curso (con respaldo offline para uso en campo/finca)
  useEffect(() => {
    if (!slug) return;
    if (typeof window !== 'undefined') {
      try {
        const cachedCourse = localStorage.getItem(`datagan_offline_course_${slug}`);
        if (cachedCourse) {
          const parsed = JSON.parse(cachedCourse);
          setCourse((prev) => prev || parsed);
          if (parsed.modules?.[0]?.lessons?.[0]) {
            setActiveLesson((prev) => prev || parsed.modules[0].lessons[0]);
          }
        }
      } catch (e) {}
    }

    get(ref(db, `courses/${slug}`))
        .then((snap) => {
          if (snap.exists()) {
            const raw = snap.val();
            const courseData = normalizeCourse(raw);
            setCourse(courseData);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(`datagan_offline_course_${slug}`, JSON.stringify(courseData));
              } catch (e) {}
            }
            if (courseData.modules && courseData.modules.length > 0) {
              const firstMod = courseData.modules[0];
              if (firstMod.lessons && firstMod.lessons.length > 0) {
                setActiveLesson((prev) => prev || firstMod.lessons[0]);
                setExpandedModules((prev) => {
                  if (Object.keys(prev).length === 0) {
                    return { [firstMod.id]: true };
                  }
                  return prev;
                });
              }
            }
          } else {
            console.error("Curso no encontrado");
          }
        })
        .catch(console.error);

    // Cargar progreso del usuario
    if (typeof window !== 'undefined' && slug) {
      try {
        const localSaved = localStorage.getItem(`datagan_resources_${slug}`);
        if (localSaved) setCompletedResources(JSON.parse(localSaved));
      } catch (e) {
        // Fallback localstorage
      }
    }

    if (user && slug) {
      const progressRef = ref(db, `progress/${user.uid}/${slug}`);
      get(progressRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.completedLessons) setCompletedLessons(data.completedLessons);
          if (data.lessonProgress) setLessonProgressList(data.lessonProgress);
          if (data.completedResources && Array.isArray(data.completedResources)) {
            setCompletedResources((prev) => Array.from(new Set([...prev, ...data.completedResources])));
          }
          if (data.approvedMissions && typeof data.approvedMissions === 'object') {
            setApprovedMissions((prev) => ({ ...prev, ...data.approvedMissions }));
            if (typeof window !== 'undefined') {
              Object.keys(data.approvedMissions).forEach((mId) => {
                if (data.approvedMissions[mId]) {
                  try {
                    localStorage.setItem(`datagan_${mId}_status`, 'approved');
                  } catch (e) {}
                }
              });
            }
          }
        }
      }).catch(err => console.error(err));
    }
  }, [slug, user]);

  const handleMarkResourceCompleted = async (resourceId: string) => {
    if (!resourceId) return;
    setCompletedResources((prev) => {
      if (prev.includes(resourceId)) return prev;
      const updated = [...prev, resourceId];
      if (typeof window !== 'undefined' && slug) {
        try {
          localStorage.setItem(`datagan_resources_${slug}`, JSON.stringify(updated));
        } catch (e) {}
      }
      if (user && slug) {
        try {
          set(ref(db, `progress/${user.uid}/${slug}/completedResources`), updated);
        } catch (e) {
          console.error('Error guardando recurso completado:', e);
        }
      }
      return updated;
    });
  };

  // Cargar notas de la lección
  useEffect(() => {
    get(ref(db, `notes/${slug}`))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setNotes(Object.keys(data).map(k => data[k]));
          }
        })
        .catch(console.error);
  }, [slug]);

  // Cargar Q&A
  useEffect(() => {
    get(ref(db, `questions/${slug}`))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            let arr = Object.keys(data).map(k => data[k]);
            if (qaSearch) {
              arr = arr.filter(q => q.title.toLowerCase().includes(qaSearch.toLowerCase()) || q.body.toLowerCase().includes(qaSearch.toLowerCase()));
            }
            setQuestions(arr);
          }
        })
        .catch(console.error);
  }, [slug, qaSearch]);

  // Cargar métricas asociadas a la lección (con caché local para consulta en potrero)
  useEffect(() => {
    if (activeLesson?.metrics && activeLesson.metrics.length > 0) {
      Promise.all(
        activeLesson.metrics.map(async (id) => {
          try {
            const s = await get(ref(db, `metrics/${id}`));
            if (s.exists()) {
              const val = s.val();
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(`datagan_offline_metric_${id}`, JSON.stringify(val));
                } catch (e) {}
              }
              return val;
            }
          } catch (e) {}
          if (typeof window !== 'undefined') {
            try {
              const cached = localStorage.getItem(`datagan_offline_metric_${id}`);
              if (cached) return JSON.parse(cached);
            } catch (e) {}
          }
          return null;
        })
      ).then((metrics) => {
        setMetricDetails(metrics.filter(Boolean) as Metric[]);
      });
    } else {
      setMetricDetails([]);
    }
  }, [activeLesson]);

  // Cargar misiones dinámicas desde Firebase y sincronizar estado de aprobación
  useEffect(() => {
    get(ref(db, 'missions')).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const loaded: SandboxMission[] = Object.keys(data).map(k => ({ ...data[k], id: k })).sort((a,b) => (a.order || 0) - (b.order || 0));
        setMissionsList(loaded.filter(m => (!m.courseSlug || m.courseSlug === slug) && m.published !== false));
      }
    }).catch(console.error);

    const checkMissions = () => {
      if (typeof window !== 'undefined') {
        try {
          const approved: Record<string, boolean> = {};
          const len = localStorage?.length || 0;
          for (let i = 0; i < len; i++) {
            const key = localStorage.key(i);
            if (key && typeof key === 'string' && key.startsWith('datagan_') && key.endsWith('_status')) {
              const val = localStorage.getItem(key);
              if (val === 'approved') {
                const mId = key.replace('datagan_', '').replace('_status', '');
                if (mId) approved[mId] = true;
              }
            }
          }
          setApprovedMissions((prev) => {
            const merged = { ...prev, ...approved };
            if (user && slug && Object.keys(merged).length > 0) {
              set(ref(db, `progress/${user.uid}/${slug}/approvedMissions`), merged).catch(() => {});
            }
            return merged;
          });
        } catch (e) {
          console.warn('Error reading localStorage for missions:', e);
        }
      }
    };

    const handleSandboxMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'DATAGAN_MISSION_APPROVED' && event.data.missionId) {
        const mId = String(event.data.missionId);
        try {
          localStorage.setItem(`datagan_${mId}_status`, 'approved');
        } catch (e) {}
        checkMissions();
      } else if (event.data.type === 'DATAGAN_SANDBOX_CLOSE') {
        setEmbeddedSandboxMissionId(null);
        checkMissions();
      }
    };

    checkMissions();
    window.addEventListener('focus', checkMissions);
    window.addEventListener('storage', checkMissions);
    window.addEventListener('message', handleSandboxMessage);
    return () => {
      window.removeEventListener('focus', checkMissions);
      window.removeEventListener('storage', checkMissions);
      window.removeEventListener('message', handleSandboxMessage);
    };
  }, [slug, user]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Heartbeat continuo al backend para acumular intervalos sin trampa
  
  const handleTelemetry = async (eventType: 'video_started' | 'video_paused' | 'video_ended' | 'seek', timeSec: number) => {
    if (!activeLesson || !user) return;
    try {
      const telemetryRef = ref(db, `telemetry/${user.uid}/${slug}`);
      await push(telemetryRef, {
        lessonId: activeLesson.id,
        eventType,
        videoTimeSeconds: timeSec,
        playbackRate: 1,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Error enviando telemetría', e);
    }
  };

  const handleCheckpointAttempt = async (checkpointId: string, type: 'in_video' | 'module_quiz', selectedIndex: number, isCorrect: boolean, timeSec: number) => {
    if (!activeLesson || !user) return;
    try {
      const attemptRef = ref(db, `attempts/${user.uid}/${slug}`);
      await push(attemptRef, {
        lessonId: activeLesson.id,
        questionId: checkpointId,
        type,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        videoTimeSeconds: timeSec,
        clientTimestamp: Date.now()
      });
    } catch (e) {
      console.error('Error enviando intento de checkpoint', e);
    }
  };
const handleHeartbeat = async (range: [number, number], currentSec: number, durationSec: number) => {
    if (!activeLesson || !user) return;
    try {
      const lpRef = ref(db, `progress/${user.uid}/${slug}/lessonProgress`);
      // Simulado Serverless
    } catch (e) {
      console.error('Error enviando heartbeat de progreso:', e);
    }
  };

  const handleInVideoCheckpointPassed = () => {
    if (!activeInVideoCheckpoint || !activeLesson) return;
    const cpId = activeInVideoCheckpoint.id;
    setActiveInVideoCheckpoint(null);

    setLessonProgressList((prev) => {
      const idx = prev.findIndex((item) => item.lessonId === activeLesson.id);
      if (idx !== -1) {
        const item = prev[idx];
        const passed = item.inVideoCheckpointsPassed || [];
        const nextPassed = passed.includes(cpId) ? passed : [...passed, cpId];
        const next = [...prev];
        next[idx] = { ...item, inVideoCheckpointsPassed: nextPassed };
        return next;
      }
      return [...prev, { lessonId: activeLesson.id, inVideoCheckpointsPassed: [cpId] }];
    });
  };

  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !activeLesson) return;
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'ivan',
          courseSlug: slug,
          lessonId: activeLesson.id,
          seconds: currentSeconds,
          timeFormatted: formatSeconds(currentSeconds),
          text: newNoteText
        })
      });
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNoteText('');
      setIsAddingNote(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostQuestion = async () => {
    if (!newQTitle.trim() || !newQBody.trim() || !activeLesson) return;
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug: slug,
          lessonId: activeLesson.id,
          title: newQTitle,
          body: newQBody,
          authorName: 'Iván Pérez'
        })
      });
      const q = await res.json();
      setQuestions((prev) => [q, ...prev]);
      setNewQTitle('');
      setNewQBody('');
      setIsAsking(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVoteQuestion = async (qId: string) => {
    try {
      const qRef = ref(db, `questions/${course?.slug}/${qId}`);
        const snap = await get(qRef);
        if (snap.exists()) {
          const updated = snap.val();
          updated.votes = (updated.votes || 0) + 1;
          await set(qRef, updated);
          setQuestions(prev => prev.map(item => item.id === qId ? updated : item));
        }
    } catch (e) {
      console.error(e);
    }
  };

  // Navegar Lección Anterior / Siguiente
  
  // Pre-calcular el estado "bloqueado" de cada lección según progressionMode
  const lockedLessons = new Set<string>();
  if (course) {
    const mode = course.progressionMode || 'lesson_strict';

    if (mode === 'free') {
      // Modo libre: sin bloqueos
    } else if (mode === 'module_strict') {
      // Bloqueo por módulos: todas las lecciones del módulo anterior deben estar completas
      let prevModuleAllDone = true;
      for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
        const mod = course.modules[mIdx];
        if (!prevModuleAllDone) {
          for (const l of mod.lessons) {
            lockedLessons.add(l.id);
          }
        }
        const isCurrentModComplete = mod.lessons.every(l => completedLessons.includes(l.id));
        if (!isCurrentModComplete) {
          prevModuleAllDone = false;
        }
      }
    } else {
      // Modo por defecto: lesson_strict (secuencial estricto lección por lección)
      let previousLessonCompleted = true;
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          if (!previousLessonCompleted) {
            lockedLessons.add(lesson.id);
          }
          const isDone = completedLessons.includes(lesson.id);
          if (!isDone) {
            previousLessonCompleted = false;
          }
        }
      }
    }
  }

  // Salvaguarda reactiva: si por estado previo o carga asíncrona la lección activa está bloqueada, reubicar a la lección permitida
  useEffect(() => {
    if (activeLesson && lockedLessons.has(activeLesson.id) && course) {
      const all = course.modules.flatMap((m) => m.lessons);
      const validLesson = all.find((l) => !lockedLessons.has(l.id));
      if (validLesson) {
        setActiveLesson(validLesson);
      }
    }
  }, [activeLesson?.id, completedLessons, course]);

  // Navegar Lección Anterior / Siguiente
  const navigateLesson = (direction: 'prev' | 'next') => {
    if (!course || !activeLesson) return;
    const all = course.modules.flatMap((m) => m.lessons);
    const currIdx = all.findIndex((l) => l.id === activeLesson.id);
    if (direction === 'prev' && currIdx > 0) {
      setActiveLesson(all[currIdx - 1]);
    } else if (direction === 'next' && currIdx < all.length - 1) {
      const nextLesson = all[currIdx + 1];
      if (!lockedLessons.has(nextLesson.id)) {
        setActiveLesson(nextLesson);
      } else {
        const msg = course.progressionMode === 'module_strict'
          ? 'Debes completar todas las lecciones del módulo anterior para continuar a esta sección.'
          : 'Debes completar la lección anterior para continuar.';
        triggerLockToast(msg);
      }
    }
  };


  if (!course) {
    return (
      <div className="min-h-screen bg-[#202230] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#b7b9cd]">Cargando Aula Virtual...</p>
        </div>
      </div>
    );
  }

  const isDraft = course.visibility === 'draft' || course.published === false;
  const isPaid = course.accessType === 'paid';
  const hasLicense = verifyUserHasCourseLicense(course, userLicenses);
  const hasAccess = effectiveIsAdmin || (!isPaid && !isDraft) || hasLicense;

  if (isDraft && !effectiveIsAdmin) {
    return (
      <div className="min-h-screen bg-[#151726] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#202336] border border-[#2e334d] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
              Curso en Preparación
            </span>
            <h1 className="text-xl font-extrabold text-white">
              {course.title}
            </h1>
            <p className="text-xs text-[#9da1bd] leading-relaxed">
              Este programa formativo se encuentra actualmente en fase de revisión técnica por la dirección académica y no está abierto a inscripciones.
            </p>
          </div>
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-[#6d28d2] hover:bg-[#5b21b6] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Explorar Cursos Disponibles</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isPaid && !hasAccess) {
    return (
      <div className="min-h-screen bg-[#f4f5f9] flex flex-col text-[#2a2b3f]">
        <header className="h-16 bg-[#151726] text-white px-6 flex items-center justify-between border-b border-[#25283e] sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-2.5 text-xs font-bold text-[#b5b8cc] hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="TecnoGan" width={28} height={28} className="w-7 h-7 object-contain" />
            <span className="text-xs font-extrabold text-white">TecnoGan Academy</span>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center">
          <div className="bg-white rounded-3xl border border-[#d1d2e0] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 relative aspect-video md:aspect-auto bg-[#1e2135]">
              <Image
                src={course.thumbnail || '/images/datagan-course-cover-v2.jpeg'}
                alt={course.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold uppercase shadow-sm">
                  ${course.price || 49} USD
                </span>
              </div>
            </div>

            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#6d28d2]/10 text-[#6d28d2] text-[11px] font-bold">
                    {course.category || 'Gestión Ganadera'}
                  </span>
                  <span className="text-xs text-[#595c73]">•</span>
                  <span className="text-xs font-semibold text-[#595c73]">{course.level || 'Intermedio'}</span>
                </div>

                <h1 className="text-2xl font-extrabold text-[#2a2b3f] leading-snug">
                  {course.title}
                </h1>

                <p className="text-xs text-[#595c73] leading-relaxed">
                  {course.description || course.subtitle}
                </p>

                <div className="p-4 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2a2b3f]">
                    Beneficios de tu Matrícula
                  </div>
                  <ul className="text-xs text-[#595c73] space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Acceso completo a todas las lecciones en alta definición</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Prácticas en simulador de escenarios y Sandbox 360</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Certificado oficial zootécnico emitido al aprobar</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e9eaf2] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] text-[#595c73] font-semibold">Inversión del Programa</div>
                  <div className="text-2xl font-black text-[#2a2b3f]">
                    ${course.price || 49} <span className="text-xs font-semibold text-[#595c73]">USD</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isEnrolling}
                  onClick={async () => {
                    setIsEnrolling(true);
                    try {
                      await grantCourseLicense(course.slug, course.licenseToken || generateCourseLicenseToken(course.slug));
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsEnrolling(false);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isEnrolling ? 'Procesando inscripción...' : 'Matricularme y Acceder al Aula'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const progressPercent = Math.round((completedLessons.length / (allLessons.length || 1)) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      {/* Top Header estilo Datagan (Exacto a las capturas) */}
      <header className="bg-[#202230] text-white px-6 py-3 border-b border-[#3d4055] flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 text-xs font-semibold text-[#b7b9cd] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <Image src="/logo.webp" alt="TecnoGan" width={72} height={24} className="h-6 w-auto object-contain" />
            <span className="font-bold text-sm text-white">Datagan</span>
          </Link>
          <div className="h-4 w-px bg-[#3d4055]" />
          <h1 className="text-xs md:text-sm font-semibold text-[#e9eaf2] truncate max-w-xl">
            {course.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-1.5 text-xs text-[#b7b9cd] hover:text-white transition-colors">
            <span>★ Deja una calificación</span>
          </button>

          {/* Menú Tu Progreso */}
          <div className="flex items-center gap-2 bg-[#33364a] px-3 py-1.5 rounded-full border border-[#3d4055]">
            <Award className="w-3.5 h-3.5 text-[#6d28d2]" />
            <span className="text-xs font-bold text-white">Tu progreso</span>
            <span className="text-[11px] bg-[#202230] text-[#c0c4fc] px-1.5 py-0.2 rounded-full">
              {completedLessons.length}/{allLessons.length}
            </span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('¡Enlace del curso copiado al portapapeles!');
            }}
            className="flex items-center gap-1.5 text-xs text-[#b7b9cd] hover:text-white px-3 py-1.5 rounded-md border border-[#3d4055] hover:bg-[#33364a] transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </button>

          {/* Menú de Perfil de Usuario con Módulo de Certificados y Cerrar Sesión */}
          <UserProfileMenu courseSlug={slug} />
        </div>
      </header>

      {/* Main Workspace (Player + Sidebar) */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Left Column: Player & Tab Content */}
        <div className="flex-1 flex flex-col bg-[#f6f7f9]">
          {/* Black Canvas Area with Chevrons (Exacto a Imagen 1) */}
          <div className="relative w-full bg-[#101010] flex items-center justify-center">
            {/* Botón flotante Lección Anterior (Izquierda) */}
            <button
              onClick={() => navigateLesson('prev')}
              className="absolute left-2 z-30 p-2.5 rounded-md bg-[#6d28d2] text-white hover:bg-[#591fb0] transition-transform active:scale-95 shadow-lg"
              title="Clase anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Video Player */}
            <div className="w-full max-w-5xl aspect-video relative">
              {activeLesson && lockedLessons.has(activeLesson.id) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#15161e] text-white p-6 text-center rounded-lg">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold mb-2">Lección bloqueada</h3>
                  <p className="text-xs text-[#9194ac] max-w-md leading-relaxed">
                    {course?.progressionMode === 'module_strict'
                      ? 'Debes completar todas las lecciones del módulo anterior para desbloquear esta sección.'
                      : 'Debes aprobar la evaluación de la lección previa para desbloquear este contenido.'}
                  </p>
                </div>
              ) : activeLesson ? (
                <>
                  <UniversalVideoPlayer
                    key={activeLesson.id}
                    videoType={
                      activeLesson.videoType === 'local' ||
                      (activeLesson.videoUrl &&
                        (activeLesson.videoUrl.includes('r2.dev') ||
                          activeLesson.videoUrl.includes('.mp4') ||
                          activeLesson.videoUrl.includes('.webm') ||
                          !activeLesson.videoUrl.includes('youtu')))
                        ? 'local'
                        : 'youtube'
                    }
                    videoUrl={activeLesson.videoUrl}
                    durationSeconds={activeLesson.durationSeconds || 900}
                    inVideoCheckpoints={activeLesson.inVideoCheckpoints || []}
                    passedCheckpoints={activeLp?.inVideoCheckpointsPassed || []}
                    onTimeUpdate={(sec) => setCurrentSeconds(sec)}
                    onTriggerCheckpoint={(checkpoint) => setActiveInVideoCheckpoint(checkpoint)}
                    onHeartbeat={handleHeartbeat}
                    onTelemetryEvent={handleTelemetry}
                    isPausedByModal={!!activeInVideoCheckpoint || isQuizModalOpen}
                    seekToTime={seekCommand}
                    onEnded={() => {
                      setIsQuizModalOpen(true);
                    }}
                  />
                  {activeInVideoCheckpoint && (
                    <InVideoCheckpointModal
                      checkpoint={activeInVideoCheckpoint}
                      courseSlug={slug}
                      lessonId={activeLesson.id}
                      onCorrectAnswer={handleInVideoCheckpointPassed}
                      onClose={() => setActiveInVideoCheckpoint(null)}
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-[#1b1d2a] rounded-xl flex items-center justify-center text-[#9194ac]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-[#b7b9cd]">Cargando lección...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botón flotante Lección Siguiente (Derecha) */}
            <button
              onClick={() => navigateLesson('next')}
              className="absolute right-2 z-30 p-2.5 rounded-md bg-[#6d28d2] text-white hover:bg-[#591fb0] transition-transform active:scale-95 shadow-lg"
              title="Clase siguiente"
            >
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
          </div>

          {/* Barra de Verificación de Aprendizaje Requerida (Fase 1: Validación Real) */}
          {activeLesson && (
            <div className="bg-[#202230] text-white px-6 py-3.5 border-t border-[#3d4055] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#6d28d2]/20 border border-[#6d28d2]/40 text-[#c0c4fc]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">Acreditación Teórica</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          completedLessons.includes(activeLesson.id)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {completedLessons.includes(activeLesson.id) ? 'Acreditada ✓' : 'En Curso'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#b7b9cd]">
                      {completedLessons.includes(activeLesson.id)
                        ? 'Requisitos de tiempo real y preguntas de control verificadas por el servidor.'
                        : 'El servidor requiere ≥80% de cobertura de video y responder los puntos de control.'}
                    </p>
                  </div>
                </div>

                {/* Cobertura de Video Real (Sin Trampa) */}
                <div className="bg-[#292c3d] px-3 py-1.5 rounded-lg border border-[#3d4055] flex items-center gap-3">
                  <div className="w-24 bg-[#1b1d2a] rounded-full h-2 overflow-hidden border border-[#3d4055]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        activeCoverage >= 80 ? 'bg-emerald-500' : 'bg-[#6d28d2]'
                      }`}
                      style={{ width: `${activeCoverage}%` }}
                    />
                  </div>
                  <div className="text-[11px]">
                    <span className="text-white font-bold">{activeCoverage}%</span>
                    <span className="text-[#8e92a8]"> / 80%</span>
                  </div>
                </div>

                {/* Checkpoints de Atención en Video */}
                {activeLesson.inVideoCheckpoints && activeLesson.inVideoCheckpoints.length > 0 && (
                  <div className="bg-[#292c3d] px-3 py-1.5 rounded-lg border border-[#3d4055] flex items-center gap-2 text-[11px]">
                    <span className="text-[#b7b9cd]">Puntos de control:</span>
                    <span className="font-bold text-[#c0c4fc]">
                      {(activeLp?.inVideoCheckpointsPassed || []).length} / {activeLesson.inVideoCheckpoints.length}
                    </span>
                    {(activeLp?.inVideoCheckpointsPassed || []).length >= activeLesson.inVideoCheckpoints.length && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Botón de Evaluación / Quiz Final de Lección */}
              {activeLesson && (
                <button
                  onClick={() => setIsQuizModalOpen(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                    completedLessons.includes(activeLesson.id)
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-[#6d28d2] text-white hover:bg-[#591fb0]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {completedLessons.includes(activeLesson.id)
                      ? 'Revisar Evaluación Aprobada'
                      : 'Preguntas de Validación'}
                  </span>
                </button>
              )}
            </div>
          )}

          
          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] rounded-md transition-colors"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <div className="space-y-1.5">
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
            </div>
          </button>
          {/* Navigation Tabs estilo Datagan (Imágenes 2, 3 y 4) */}
          <div className="border-b border-[#d1d2e0] bg-white px-6 sticky top-0 z-20">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'overview'
                    ? 'border-[#2a2b3f] text-[#2a2b3f]'
                    : 'border-transparent text-[#595c73] hover:text-[#2a2b3f]'
                }`}
              >
                Descripción general
              </button>

              <button
                onClick={() => setActiveTab('metrics')}
                className={`py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'metrics'
                    ? 'border-[#2a2b3f] text-[#2a2b3f]'
                    : 'border-transparent text-[#595c73] hover:text-[#2a2b3f]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#a374f9]" />
                <span>Métricas DataGan</span>
                {metricDetails.length > 0 && (
                  <span className="text-[10px] bg-[#6d28d2] text-white px-1.5 py-0.5 rounded-full font-mono font-bold leading-none">
                    {metricDetails.length}
                  </span>
                )}
              </button>

              {course.phase2Visible !== false && (
                <Link
                  href={`/scenarios?course=${slug}`}
                  target="_blank"
                  className="py-3.5 text-xs md:text-sm font-bold border-b-2 border-transparent text-[#595c73] hover:text-[#6d28d2] flex items-center gap-1.5 transition-all"
                  title="Fase 2: Reflejo Operativo y Reconocimiento Visual"
                >
                  <Film className="w-4 h-4 text-[#6d28d2]" />
                  <span>Reflejo Operativo</span>
                  <span className="text-[10px] bg-[#6d28d2]/10 text-[#6d28d2] px-1.5 py-0.5 rounded-full font-bold">
                    Fase 2 ↗
                  </span>
                </Link>
              )}

              {course.phase3Visible !== false && (
                <button
                  onClick={() => setActiveTab('missions')}
                  className={`py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'missions'
                      ? 'border-[#6d28d2] text-[#6d28d2]'
                      : 'border-transparent text-[#595c73] hover:text-[#2a2b3f]'
                  }`}
                >
                  <Target className="w-4 h-4 text-[#6d28d2]" />
                  <span>Simulador Sandbox</span>
                  <span className="text-[10px] bg-[#6d28d2]/10 text-[#6d28d2] px-1.5 py-0.5 rounded-full font-bold">
                    Fase 3
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
                    Object.keys(approvedMissions).length > 0 ? 'bg-emerald-600 text-white' : 'bg-[#6d28d2] text-white'
                  }`}>
                    {Object.keys(approvedMissions).length}/{missionsList.length || 3}
                  </span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('qa')}
                className={`py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'qa'
                    ? 'border-[#2a2b3f] text-[#2a2b3f]'
                    : 'border-transparent text-[#595c73] hover:text-[#2a2b3f]'
                }`}
              >
                <span>Preguntas y respuestas</span>
                <span className="text-[11px] bg-[#f6f7f9] text-[#595c73] px-2 py-0.5 rounded-full font-mono">
                  {questions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'notes'
                    ? 'border-[#2a2b3f] text-[#2a2b3f]'
                    : 'border-transparent text-[#595c73] hover:text-[#2a2b3f]'
                }`}
              >
                <span>Notas</span>
                <span className="text-[11px] bg-[#f6f7f9] text-[#595c73] px-2 py-0.5 rounded-full font-mono">
                  {notes.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Panels */}
          <div className="p-6 md:p-8 max-w-5xl w-full mx-auto space-y-8 bg-white min-h-[400px]">
            {/* PESTAÑA 1: DESCRIPCIÓN GENERAL (Imagen 2) */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#2a2b3f]">
                    {course.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#595c73] mt-2">
                    
                    <span>34 horas Total</span>
                    <span>•</span>
                    <span>Español [CC]</span>
                  </div>
                </div>

                {/* Banner de Programa de Aprendizaje (Imagen 2) */}
                <div className="p-5 rounded-2xl border border-[#d1d2e0] bg-[#f6f7f9] flex items-start gap-4">
                  <Clock className="w-5 h-5 text-[#6d28d2] shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-[#2a2b3f]">Programa un tiempo de aprendizaje</h4>
                    <p className="text-xs text-[#595c73] leading-relaxed">
                      Aprender un poco cada día marca la diferencia. Establece un hábito de estudio para aplicar los modelos zootécnicos y financieros en tu predio ganadero.
                    </p>
                  </div>
                </div>

                {/* Cifras y Características (Imagen 2) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#e9eaf2] text-xs">
                  <div className="space-y-2">
                    <span className="font-bold text-[#2a2b3f] block">Por cifras:</span>
                    <p className="text-[#595c73]">Nivel de habilidad: {course.level}</p>
                    <p className="text-[#595c73]">Clases: {allLessons.length} lecciones zootécnicas</p>
                    <p className="text-[#595c73]">Certificado: Acreditación Oficial TecnoGan</p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-[#2a2b3f] block">Características:</span>
                    <p className="text-[#595c73]">Disponible en Web, iOS y Android PWA</p>
                    <p className="text-[#595c73]">Fórmulas matemáticas y semáforos ICA / FEDEGAN</p>
                  </div>
                </div>

              </div>
            )}

            {/* PESTAÑA 1.5: FÓRMULAS Y MÉTRICAS DATAGAN */}
            {activeTab === 'metrics' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-[#2a2b3f] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#6d28d2]" />
                    Métricas Zootécnicas y Agronómicas
                  </h2>
                  <p className="text-sm text-[#595c73] leading-relaxed max-w-3xl">
                    Estas son las métricas oficiales de DataGan 360 que sustentan los conceptos explicados en esta lección. Utiliza estas fórmulas y rangos como referencia para tomar decisiones basadas en datos en tu ganadería.
                  </p>
                </div>

                {metricDetails.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-[#e9eaf2] bg-[#f6f7f9]">
                    <Sparkles className="w-8 h-8 text-[#d1d2e0] mx-auto mb-3" />
                    <p className="text-sm font-bold text-[#595c73]">Sin métricas asociadas</p>
                    <p className="text-xs text-[#9194ac] mt-1">Esta lección no contiene fórmulas o métricas zootécnicas configuradas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {metricDetails.map((metric) => (
                      <div key={metric.id} className="rounded-2xl border border-[#d1d2e0] bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
                        {/* Panel Principal */}
                        <div className="flex-1 p-6 md:p-8 space-y-6">
                          {/* Header de la Métrica */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold tracking-wider uppercase text-[#6d28d2] bg-purple-50 px-2.5 py-0.5 rounded border border-purple-100">
                                  {metric.category}
                                </span>
                                {metric.templateType && (
                                  <span className="text-[10px] font-medium text-[#595c73] bg-[#f6f7f9] px-2 py-0.5 rounded border border-[#e9eaf2]">
                                    {metric.templateType === 'formula' ? '📐 Fórmula Matemática' :
                                     metric.templateType === 'visual_scale' ? '👁️ Escala Visual' :
                                     metric.templateType === 'protocol' ? '📋 Protocolo Operativo' :
                                     metric.templateType === 'decision_matrix' ? '🔀 Matriz de Decisión' :
                                     metric.templateType === 'glossary' ? '💡 Concepto Clave' : '⚙️ Parámetro Personalizado'}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-[#2a2b3f] leading-tight">{metric.label}</h3>
                              {metric.shortDescription && (
                                <p className="text-xs font-semibold text-[#595c73]">{metric.shortDescription}</p>
                              )}
                            </div>
                            {metric.unit && (
                              <span className="bg-[#f6f7f9] border border-[#e9eaf2] px-3 py-1 rounded-lg text-xs font-mono font-bold text-[#2a2b3f] shrink-0">
                                Unidad: {metric.unit}
                              </span>
                            )}
                          </div>

                          {/* Definición Conceptual */}
                          {metric.definition && (
                            <div className="bg-[#fdfcff] p-4 rounded-xl border border-[#e9eaf2]">
                              <p className="text-sm text-[#2a2b3f] leading-relaxed">{metric.definition}</p>
                            </div>
                          )}

                          {/* 1. PLANTILLA: FÓRMULA MATEMÁTICA */}
                          {metric.formula && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-[#595c73] uppercase tracking-wider flex items-center gap-1.5">
                                <span>Fórmula Matemática</span>
                              </h4>
                              <div className="bg-[#202230] p-4 rounded-xl border border-[#3d4055] text-[#e9eaf2] font-mono text-sm overflow-x-auto shadow-inner">
                                <div className="flex items-center gap-3">
                                  <span className="text-[#a374f9] font-bold">∑</span>
                                  <span className="whitespace-pre">{metric.formula}</span>
                                </div>
                              </div>
                              {metric.formulaExplanation && (
                                <p className="text-xs text-[#595c73] pt-1 leading-relaxed">
                                  <strong className="text-[#2a2b3f]">Variables:</strong> {metric.formulaExplanation}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 2. PLANTILLA: ESCALA VISUAL (ej: Condición Corporal CC 1 a 5) */}
                          {metric.visualLevels && metric.visualLevels.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-[#2a2b3f] uppercase tracking-wider flex items-center gap-2">
                                <Eye className="w-4 h-4 text-[#6d28d2]" />
                                <span>Escala de Calificación Visual</span>
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {metric.visualLevels.map((lvl, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                      lvl.status === 'optimal' ? 'bg-emerald-50/40 border-emerald-200' :
                                      lvl.status === 'warning' ? 'bg-amber-50/40 border-amber-200' :
                                      lvl.status === 'critical' ? 'bg-rose-50/40 border-rose-200' :
                                      'bg-blue-50/40 border-blue-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-mono font-extrabold text-[#6d28d2] bg-white px-2 py-0.5 rounded border border-[#e9eaf2]">
                                        Score {lvl.level}
                                      </span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        lvl.status === 'optimal' ? 'bg-emerald-100 text-emerald-800' :
                                        lvl.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                                        lvl.status === 'critical' ? 'bg-rose-100 text-rose-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {lvl.status === 'optimal' ? 'Óptimo' : lvl.status === 'warning' ? 'Alerta' : lvl.status === 'critical' ? 'Crítico' : 'Info'}
                                      </span>
                                    </div>
                                    <p className="font-bold text-xs text-[#0f172a] mb-1">{lvl.title}</p>
                                    <p className="text-[11px] text-[#475569] leading-snug">{lvl.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. PLANTILLA: PROTOCOLO OPERATIVO PASO A PASO */}
                          {metric.protocolSteps && metric.protocolSteps.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-[#2a2b3f] uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#6d28d2]" />
                                <span>Protocolo Operativo Paso a Paso</span>
                              </h4>
                              <div className="space-y-2.5">
                                {metric.protocolSteps.map((st, sIdx) => (
                                  <div key={sIdx} className="p-3.5 rounded-xl border border-[#e9eaf2] bg-[#fafbfe] flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#6d28d2] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {st.stepNumber}
                                    </span>
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="font-bold text-xs text-[#2a2b3f]">{st.title}</span>
                                        {st.timing && (
                                          <span className="text-[11px] font-mono text-[#6d28d2] bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {st.timing}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#475569] leading-relaxed">{st.instructions}</p>
                                      {st.criticalNote && (
                                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-start gap-1.5 mt-1">
                                          <span>⚠️</span>
                                          <span><strong>Nota Crítica:</strong> {st.criticalNote}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4. PLANTILLA: MATRIZ DE DECISIÓN Y TRIAJE */}
                          {metric.decisionRows && metric.decisionRows.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-[#2a2b3f] uppercase tracking-wider flex items-center gap-2">
                                <GitBranch className="w-4 h-4 text-[#6d28d2]" />
                                <span>Matriz de Diagnóstico y Decisión en Campo</span>
                              </h4>
                              <div className="border border-[#e9eaf2] rounded-xl overflow-hidden divide-y divide-[#e9eaf2]">
                                {metric.decisionRows.map((dr, dIdx) => (
                                  <div key={dIdx} className="p-4 bg-white space-y-2 hover:bg-[#fafbfe] transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#6d28d2]" />
                                        Condición: {dr.condition}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        dr.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                                        dr.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>
                                        Prioridad {dr.priority === 'high' ? 'Urgente' : dr.priority === 'medium' ? 'Media' : 'Baja'}
                                      </span>
                                    </div>
                                    {dr.probableCause && (
                                      <p className="text-xs text-[#64748b] pl-3.5 border-l-2 border-[#e9eaf2]">
                                        <strong className="text-[#475569]">Causa Probable:</strong> {dr.probableCause}
                                      </p>
                                    )}
                                    <div className="text-xs font-medium text-emerald-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                                      <strong className="text-emerald-900">Acción Recomendada:</strong> {dr.recommendedAction}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 5. PLANTILLA: GLOSARIO / CONCEPTO CLAVE */}
                          {(metric.keyTakeaway || (metric.examples && metric.examples.length > 0)) && (
                            <div className="space-y-3">
                              {metric.keyTakeaway && (
                                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6d28d2]">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Regla de Oro / Conclusión Zootécnica</span>
                                  </div>
                                  <p className="text-xs text-purple-950 leading-relaxed font-medium">
                                    {metric.keyTakeaway}
                                  </p>
                                </div>
                              )}
                              {metric.examples && metric.examples.length > 0 && (
                                <div className="space-y-1.5">
                                  <h5 className="text-xs font-bold text-[#595c73]">Casos y Ejemplos Prácticos:</h5>
                                  <ul className="space-y-1">
                                    {metric.examples.map((ex, exIdx) => (
                                      <li key={exIdx} className="text-xs text-[#2a2b3f] flex items-start gap-2 bg-[#f6f7f9] p-2.5 rounded-lg border border-[#e9eaf2]">
                                        <span className="text-[#6d28d2] font-bold">•</span>
                                        <span>{ex}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 6. CAMPOS ADICIONALES LIBRES */}
                          {metric.customFields && metric.customFields.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-[#e9eaf2]">
                              <h5 className="text-[11px] font-bold text-[#595c73] uppercase tracking-wider flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3 h-3 text-[#6d28d2]" />
                                <span>Atributos Adicionales</span>
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {metric.customFields.map((cf, cIdx) => (
                                  <div key={cIdx} className="bg-[#f6f7f9] px-3 py-2 rounded-lg border border-[#e9eaf2] text-xs flex items-center justify-between gap-2">
                                    <span className="font-bold text-[#595c73]">{cf.label}:</span>
                                    <span className="font-medium text-[#2a2b3f] text-right truncate">{cf.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 7. ENLACE A GUÍA EXTERNA */}
                          {metric.externalUrl && (
                            <div className="pt-1">
                              <a
                                href={metric.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6d28d2] hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Consultar Guía Técnica Externa</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Panel Lateral: Benchmarks y Rangos */}
                        {(metric.benchmark || (metric.ranges && metric.ranges.length > 0)) && (
                          <div className="w-full md:w-72 bg-[#f6f7f9] border-t md:border-t-0 md:border-l border-[#e9eaf2] p-6 space-y-6">
                            {metric.benchmark && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-[#2a2b3f] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Benchmark (Top 10%)
                                </h4>
                                <div className="bg-white p-3 rounded-xl border border-[#d1d2e0] shadow-sm">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-2xl font-bold text-emerald-600">{metric.benchmark.top}</span>
                                    {metric.unit && <span className="text-xs font-semibold text-[#595c73]">{metric.unit}</span>}
                                  </div>
                                  <p className="text-[10px] text-[#9194ac]">
                                    Promedio estándar: <strong className="text-[#595c73]">{metric.benchmark.average}</strong>
                                  </p>
                                  <p className="text-[10px] text-[#9194ac] mt-1 border-t border-[#e9eaf2] pt-1">
                                    Fuente: {metric.benchmark.source} ({metric.benchmark.year})
                                  </p>
                                </div>
                              </div>
                            )}

                            {metric.ranges && metric.ranges.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-[#2a2b3f]">Rangos e Interpretación</h4>
                                <div className="space-y-2">
                                  {metric.ranges.map((r, i) => (
                                    <div key={i} className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-[#e9eaf2]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-[#2a2b3f]">{r.label}</span>
                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                          r.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                          r.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                                          r.color === 'red' ? 'bg-rose-100 text-rose-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {r.min} - {r.max}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-[#595c73] leading-snug">{r.interpretation}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA 2: PREGUNTAS Y RESPUESTAS (Q&A) (Imagen 3) */}
            {activeTab === 'qa' && (
              <div className="space-y-6">
                {/* Search & Actions */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-[#595c73] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar todas las preguntas del curso..."
                      value={qaSearch}
                      onChange={(e) => setQaSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>

                  <button
                    onClick={() => setIsAsking(!isAsking)}
                    className="px-4 py-2 rounded-lg bg-[#6d28d2] text-white text-xs font-bold hover:bg-[#591fb0] flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hacer una pregunta</span>
                  </button>
                </div>

                {/* Formulario Nueva Pregunta */}
                {isAsking && (
                  <div className="p-5 rounded-xl border border-[#6d28d2]/30 bg-purple-50/30 space-y-3">
                    <h4 className="font-bold text-xs text-[#2a2b3f]">Pregunta a la comunidad e instructores</h4>
                    <input
                      type="text"
                      placeholder="Título breve y claro de la pregunta..."
                      value={newQTitle}
                      onChange={(e) => setNewQTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-white focus:outline-none focus:border-[#6d28d2]"
                    />
                    <textarea
                      rows={3}
                      placeholder="Describe los detalles, variables o registros que tienes en tu predio..."
                      value={newQBody}
                      onChange={(e) => setNewQBody(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-white focus:outline-none focus:border-[#6d28d2]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAsking(false)}
                        className="px-3 py-1.5 text-xs text-[#595c73] hover:text-[#2a2b3f]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handlePostQuestion}
                        className="px-4 py-1.5 text-xs font-bold bg-[#6d28d2] text-white rounded-lg hover:bg-[#591fb0]"
                      >
                        Publicar Pregunta
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Preguntas estilo Datagan */}
                <div className="space-y-4 divide-y divide-[#e9eaf2]">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#595c73]">
                      No se encontraron preguntas. ¡Sé el primero en preguntar!
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="pt-4 first:pt-0 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#202230] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {q.author?.initials || 'US'}
                        </div>

                        <div className="flex-1 space-y-1">
                          <h4 className="font-bold text-xs text-[#2a2b3f] hover:text-[#6d28d2] cursor-pointer">
                            {q.title}
                          </h4>
                          <p className="text-xs text-[#595c73] line-clamp-2 leading-relaxed">{q.body}</p>
                          <div className="flex items-center gap-3 text-[11px] text-[#9194ac] pt-1">
                            <span className="font-medium text-[#6d28d2]">{q.author?.name}</span>
                            <span>•</span>
                            <span>{q.answers?.length || 0} respuestas</span>
                          </div>

                          {/* Respuestas del Instructor */}
                          {q.answers && q.answers.length > 0 && (
                            <div className="mt-3 p-3 rounded-lg bg-[#f6f7f9] border border-[#e9eaf2] text-xs space-y-1">
                              <span className="font-bold text-[#6d28d2] text-[11px]">
                                Respuesta de {q.answers[0].authorName} ({q.answers[0].authorRole}):
                              </span>
                              <p className="text-[#2a2b3f]">{q.answers[0].body}</p>
                            </div>
                          )}
                        </div>

                        {/* Botón de Votos */}
                        <button
                          onClick={() => handleVoteQuestion(q.id)}
                          className="flex flex-col items-center gap-0.5 p-2 rounded-lg border border-[#d1d2e0] hover:bg-[#f6f7f9] text-[#595c73] transition-colors shrink-0"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">{q.votes}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA 3: NOTAS CON TIMECODE (Imagen 4) */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Input Crear Nota con Timecode actual */}
                <div className="p-4 rounded-xl border border-[#d1d2e0] bg-[#f6f7f9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2a2b3f]">
                      Crear una nueva nota en{' '}
                      <span className="font-mono bg-[#202230] text-white px-2 py-0.5 rounded-md">
                        {formatSeconds(currentSeconds)}
                      </span>
                    </span>
                    <button
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className="p-1 rounded-full bg-[#6d28d2] text-white hover:bg-[#591fb0]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isAddingNote && (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={2}
                        placeholder="Escribe tu apunte zootécnico aquí..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsAddingNote(false)}
                          className="px-3 py-1 text-xs text-[#595c73]"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateNote}
                          className="px-4 py-1 text-xs font-bold bg-[#6d28d2] text-white rounded-lg hover:bg-[#591fb0]"
                        >
                          Guardar Nota
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Notas con Salto de Video */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#595c73] space-y-2">
                      <p>No tienes notas registradas en este curso todavía.</p>
                      <p className="text-[11px] text-[#9194ac]">
                        Haz clic en el botón '+' arriba para capturar un apunte en el segundo exacto del video.
                      </p>
                    </div>
                  ) : (
                    notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 rounded-xl border border-[#e9eaf2] bg-white hover:border-[#6d28d2] transition-colors flex items-start gap-4 shadow-2xs"
                      >
                        <button 
                          onClick={() => {
                            setSeekCommand(undefined);
                            setTimeout(() => setSeekCommand(n.seconds), 50);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#202230] text-white hover:bg-[#6d28d2] font-mono text-xs font-bold shrink-0 cursor-pointer transition-colors"
                        >
                          {n.timeFormatted}
                        </button>

                        <div className="flex-1 text-xs text-[#2a2b3f] leading-relaxed">
                          {n.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA 5: MISIONES SANDBOX (Fase 3: Simulación Operativa en TecnoGan) */}
            {activeTab === 'missions' && (() => {
              const effectiveMissions = missionsList.length > 0 ? missionsList : [
                {
                  id: 'mision-1',
                  order: 1,
                  title: 'Registro de Nacimiento • Vaca Mariposa (V-101)',
                  category: 'Salud & Reproducción Bovina',
                  targetModule: 'nacimiento',
                  summary: 'Inscribe la cría recién nacida de la vaca V-101 con chapeta y peso natalicio.',
                  context: 'En la Hacienda El Rocío, la vaca de ordeño Mariposa (V-101) acaba de tener un parto normal con el toro Faraón (T-201). Como responsable técnico, debes formalizar el ingreso de la cría al libro genealógico.',
                  instructions: [
                    'Abre el módulo Salud > Nacimientos en el simulador.',
                    'Haz clic en "+ Nuevo Registro" e inscribe la cría (ej. CR-406) con ID Madre V-101.',
                    'Registra un peso natalicio mayor a 25 kg (ej. 35 kg) y guarda.',
                    'Haz clic en "Comprobar" para acreditar la misión.'
                  ]
                },
                {
                  id: 'mision-2',
                  order: 2,
                  title: 'Control Ponderal y GDP • Novillo N-301',
                  category: 'Producción & Ceba',
                  targetModule: 'pesaje',
                  summary: 'Registra el pesaje mensual del novillo N-301 para calcular su Ganancia Diaria de Peso (GDP).',
                  context: 'El lote de ceba intensiva cumplió 30 días de rotación. El novillo N-301 pesó 370 kg el mes anterior y hoy marcó 395 kg en báscula.',
                  instructions: [
                    'Dirígete al módulo Producción > Pesaje en el simulador.',
                    'Haz clic en "+ Nuevo Registro" e ingresa Animal: N-301, Peso Ant: 370 kg, Peso Act: 395 kg y Días: 30.',
                    'Revisa el cálculo automático de GDP (833 g/día), guarda y pulsa "Comprobar".'
                  ]
                },
                {
                  id: 'mision-3',
                  order: 3,
                  title: 'Planificación de Pastoreo • Potrero La Loma',
                  category: 'Pastos & Aforo',
                  targetModule: 'potreros',
                  summary: 'Registra un potrero nuevo de 15 Ha establecido con Brachiaria brizantha y aforo de 25 UGM.',
                  context: 'Se acaba de habilitar el sector "La Loma" con 15 hectáreas de Brachiaria brizantha en estado de descanso para incorporarlo al plan rotacional.',
                  instructions: [
                    'Dirígete al módulo Potreros & Pastos en el simulador.',
                    'Haz clic en "+ Nuevo Registro" e ingresa Código: POT-7, Nombre: La Loma y Área: 15 Ha.',
                    'Asigna especie Brachiaria brizantha, Capacidad: 25 UGM, guarda y pulsa "Comprobar".'
                  ]
                }
              ];
              const approvedCount = effectiveMissions.filter((m) => !!approvedMissions[m.id]).length;
              const progressPct = effectiveMissions.length > 0 ? Math.round((approvedCount / effectiveMissions.length) * 100) : 0;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e9eaf2]">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#6d28d2]">Fase 3 &bull; Simulación Operativa en TecnoGan</span>
                      <h3 className="text-xl font-bold text-[#2a2b3f] mt-1">Misiones de Práctica en Finca Ficticia</h3>
                      <p className="text-xs text-[#595c73] mt-0.5">
                        Opera el software ganadero con datos reales de hato, pesajes y potreros para certificar tu destreza práctica.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEmbeddedSandboxMissionId(effectiveMissions[0]?.id || 'mision-1')}
                        className="px-4 py-2.5 bg-[#6d28d2] text-white rounded-xl text-xs font-bold hover:bg-[#591fb0] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Target className="w-4 h-4" />
                        <span>Practicar Aquí Mismo</span>
                      </button>
                      <a
                        href="/sandbox"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 bg-[#f6f7f9] border border-[#d1d2e0] text-[#2a2b3f] rounded-xl text-xs font-bold hover:bg-[#e9eaf2] transition-all flex items-center gap-1.5"
                      >
                        <span>Pantalla Completa ↗</span>
                      </a>
                    </div>
                  </div>

                  {/* Barra de Progreso de Fase 3 */}
                  <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-[#2a2b3f]">
                        Progreso de Competencia Operativa: {approvedCount} de {effectiveMissions.length} misiones superadas ({progressPct}%)
                      </div>
                      <p className="text-[11px] text-[#595c73] mt-0.5">
                        Cada misión verifica en tiempo real los registros que guardas en la base de datos del simulador.
                      </p>
                    </div>
                    <div className="w-full sm:w-48 h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Listado Dinámico de Misiones */}
                  <div className="space-y-4">
                    {effectiveMissions.map((mission, mIdx) => {
                      const isApproved = !!approvedMissions[mission.id];
                      return (
                        <div 
                          key={mission.id || mIdx}
                          className={`p-6 rounded-2xl border-2 transition-all ${
                            isApproved
                              ? 'border-emerald-500/40 bg-emerald-50/20'
                              : 'border-[#6d28d2]/25 bg-white shadow-xs'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                isApproved ? 'bg-emerald-600 text-white' : 'bg-[#6d28d2] text-white'
                              }`}>
                                M{mission.order || (mIdx + 1)}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-base text-[#2a2b3f]">{mission.title}</h4>
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                    isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {isApproved ? 'Aprobada ✓' : 'Pendiente'}
                                  </span>
                                </div>
                                <p className="text-xs text-[#595c73] mt-0.5">
                                  Módulo objetivo: <span className="font-semibold capitalize text-[#6d28d2]">{mission.targetModule}</span> &bull; {mission.category}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                onClick={() => setEmbeddedSandboxMissionId(mission.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isApproved
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-[#6d28d2] text-white hover:bg-[#591fb0]'
                                }`}
                              >
                                {isApproved ? 'Revisar aquí en Simulador' : 'Resolver Misión Aquí →'}
                              </button>
                              <a
                                href={`/sandbox?mision=${mission.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-xl text-xs font-semibold border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-all"
                                title="Abrir en una nueva pestaña"
                              >
                                Nueva pestaña ↗
                              </a>
                            </div>
                          </div>

                          {mission.context && (
                            <p className="text-xs text-[#475569] mb-3 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                              &ldquo;{mission.context}&rdquo;
                            </p>
                          )}

                          <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0] space-y-1.5 text-xs text-[#334155] leading-relaxed">
                            <p className="font-bold text-[#0f172a]">📋 Instrucciones del Caso:</p>
                            {mission.instructions?.map((inst, i) => (
                              <p key={i}>{i + 1}. {inst}</p>
                            ))}
                          </div>

                          {isApproved && (
                            <div className="mt-4 p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>¡Misión verificada con éxito! Has demostrado competencia operativa en este proceso ganadero.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Sidebar: Accordion Curriculum stile Datagan (Imagen 1) */}
        {isSidebarOpen && (
          <div className="w-full lg:w-96 bg-white border-l border-[#d1d2e0] flex flex-col shrink-0">
            <div className="p-4 border-b border-[#e9eaf2] bg-[#f6f7f9] flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#2a2b3f]">Contenido del curso</h3>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-[#595c73] hover:text-[#2a2b3f] p-1"
                title="Cerrar panel lateral"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#e9eaf2]">
              {course.modules.map((mod, modIdx) => {
                const isExpanded = expandedModules[mod.id] ?? false;
                const completedInMod = mod.lessons.filter((l) => completedLessons.includes(l.id)).length;

                return (
                  <div key={mod.id} className="bg-white">
                    {/* Header Módulo estilo Datagan (0/7 | 35 min) */}
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full p-4 text-left hover:bg-[#f6f7f9] flex items-start justify-between gap-3 transition-colors"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-[#2a2b3f] leading-snug">
                          Sección {modIdx + 1}: {mod.title}
                        </h4>
                        <span className="text-[11px] text-[#595c73] mt-1 block">
                          {completedInMod}/{mod.lessons.length} | {mod.lessons.length * 15} min
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#595c73] shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#595c73] shrink-0 mt-0.5" />
                      )}
                    </button>

                    {/* Lista de Lecciones con Checkbox (Imagen 1) */}
                    {isExpanded && (
                      <div className="bg-[#f6f7f9] divide-y divide-[#e9eaf2]/60">
                        {mod.lessons.map((lesson) => {
                          const isCurrent = activeLesson?.id === lesson.id;
                          const isDone = completedLessons.includes(lesson.id);
                          const isLocked = lockedLessons.has(lesson.id);

                          return (
                            <div
                              key={lesson.id}
                              className={`p-3.5 px-4 mx-2 rounded-xl flex items-start gap-3 transition-colors ${
                                isCurrent
                                  ? 'bg-[#c0c4fc]/20 ring-1 ring-[#6d28d2]/30'
                                  : isLocked ? 'opacity-50 bg-[#fdfdfd]' : 'hover:bg-white'
                              }`}
                            >
                              {/* Checkbox de Validación Real - Control autónomo */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLocked) {
                                    const msg = course?.progressionMode === 'module_strict'
                                      ? 'Debes completar todas las lecciones del módulo anterior para desbloquear esta sección.'
                                      : 'Debes completar la lección previa para desbloquear esta lección.';
                                    triggerLockToast(msg);
                                    return;
                                  }
                                  setActiveLesson(lesson);
                                  setIsQuizModalOpen(true);
                                }}
                                className={`mt-0.5 p-0.5 rounded focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden shrink-0 transition-colors ${
                                  isLocked
                                    ? 'text-[#9194ac]/60 cursor-not-allowed hover:text-amber-500'
                                    : 'text-[#595c73] hover:text-[#6d28d2] cursor-pointer'
                                }`}
                                aria-label={
                                  isLocked
                                    ? 'Lección bloqueada'
                                    : isDone
                                    ? 'Lección Aprobada'
                                    : 'Abrir evaluación de aprendizaje de la lección'
                                }
                                title={
                                  isLocked
                                    ? (course?.progressionMode === 'module_strict'
                                        ? 'Debes completar todas las lecciones del módulo anterior para desbloquear esta sección.'
                                        : 'Debes completar la lección previa para desbloquear esta lección.')
                                    : isDone
                                    ? 'Lección Aprobada'
                                    : 'Requiere aprobar la evaluación de aprendizaje'
                                }
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : isLocked ? (
                                  <Lock className="w-4 h-4 text-[#9194ac]" />
                                ) : (
                                  <Circle className="w-4 h-4 text-[#9194ac]" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isLocked) {
                                      const msg = course?.progressionMode === 'module_strict'
                                        ? 'Debes completar todas las lecciones del módulo anterior para desbloquear esta sección.'
                                        : 'Debes completar la lección previa para desbloquear esta lección.';
                                      triggerLockToast(msg);
                                      return;
                                    }
                                    setActiveLesson(lesson);
                                  }}
                                  className={`w-full text-left rounded focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden ${
                                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <p
                                    className={`text-xs leading-snug ${
                                      isCurrent
                                        ? 'font-bold text-[#6d28d2]'
                                        : isLocked
                                        ? 'font-medium text-[#9194ac]'
                                        : 'font-medium text-[#2a2b3f]'
                                    }`}
                                  >
                                    {lesson.title}
                                  </p>
                                </button>

                                <div className="flex items-center justify-between mt-1.5 text-[11px] text-[#595c73]">
                                  <span className="flex items-center gap-1">
                                    <Play className="w-3 h-3 text-[#595c73]" />
                                    {lesson.duration}
                                  </span>

                                  {/* Botón Recursos desplegable y funcional */}
                                  <div className="relative">
                                    {lesson.resources && lesson.resources.length > 0 ? (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isLocked) {
                                              const msg = course?.progressionMode === 'module_strict'
                                                ? 'Debes completar todas las lecciones del módulo anterior para acceder a sus recursos.'
                                                : 'Debes completar la lección previa para acceder a estos recursos.';
                                              triggerLockToast(msg);
                                              return;
                                            }
                                            setOpenResourcesLessonId(openResourcesLessonId === lesson.id ? null : lesson.id);
                                          }}
                                          className={`px-2 py-0.5 rounded-sm border text-[10px] font-medium flex items-center gap-1 transition-all ${
                                            isLocked
                                              ? 'border-[#d1d2e0]/60 text-[#9194ac] cursor-not-allowed opacity-60'
                                              : openResourcesLessonId === lesson.id
                                              ? 'border-[#6d28d2] bg-[#6d28d2]/10 text-[#6d28d2] cursor-pointer'
                                              : 'border-[#d1d2e0] text-[#595c73] hover:bg-white hover:text-[#2a2b3f] cursor-pointer'
                                          }`}
                                        >
                                          <span>📁 Recursos ▾</span>
                                          <span className="px-1 rounded-full bg-[#6d28d2] text-white text-[9px] font-bold">
                                            {lesson.resources.length}
                                          </span>
                                        </button>

                                        {openResourcesLessonId === lesson.id && (
                                          <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white rounded-xl shadow-2xl border border-[#d1d2e0] p-2 space-y-1 animate-in fade-in zoom-in-95">
                                            <div className="px-2 py-1 text-[10px] font-bold text-[#9194ac] uppercase tracking-wider border-b border-[#f6f7f9] flex items-center justify-between">
                                              <span>Materiales ({lesson.resources.length})</span>
                                              <button 
                                                onClick={() => setOpenResourcesLessonId(null)}
                                                className="text-[#9194ac] hover:text-[#2a2b3f]"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <div className="max-h-[114px] overflow-y-auto space-y-1 pr-0.5">
                                              {lesson.resources.map((res, rIdx) => {
                                                const resId = res.id || `res-${lesson.id}-${rIdx}`;
                                                const isPopQuiz = res.type === 'popquiz';
                                                const isCompleted = completedResources.includes(resId);

                                                return (
                                                  <div
                                                    key={res.id || rIdx}
                                                    onClick={() => {
                                                      if (isPopQuiz) {
                                                        setActivePopQuiz({
                                                          id: resId,
                                                          title: res.title,
                                                          questions: res.popQuizQuestions || [],
                                                          lessonTitle: lesson.title
                                                        });
                                                        setOpenResourcesLessonId(null);
                                                      } else if (res.url) {
                                                        handleMarkResourceCompleted(resId);
                                                        window.open(res.url, '_blank');
                                                        setOpenResourcesLessonId(null);
                                                      }
                                                    }}
                                                    title={isCompleted ? 'Completado (puedes volver a realizarlo o consultarlo)' : undefined}
                                                    className={`p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 border ${
                                                      isCompleted
                                                        ? 'opacity-60 hover:opacity-100 bg-[#f9fafb] border-[#e5e7eb] hover:border-[#6d28d2]/30'
                                                        : isPopQuiz
                                                        ? 'bg-[#6d28d2]/5 hover:bg-[#6d28d2]/15 border-[#6d28d2]/20 text-[#6d28d2]'
                                                        : 'hover:bg-[#f6f7f9] border-transparent text-[#2a2b3f]'
                                                    }`}
                                                  >
                                                    {isCompleted ? (
                                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    ) : isPopQuiz ? (
                                                      <Sparkles className="w-3.5 h-3.5 text-[#6d28d2] shrink-0" />
                                                    ) : (
                                                      <FileText className="w-3.5 h-3.5 text-[#595c73] shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                      <p className={`text-xs font-semibold truncate leading-tight ${isCompleted ? 'text-[#595c73]' : ''}`}>
                                                        {res.title}
                                                      </p>
                                                      <p className="text-[10px] text-[#9194ac] flex items-center gap-1">
                                                        {isPopQuiz ? 'Pop Quiz interactivo' : res.type === 'document' ? 'Documento descargable' : 'Enlace web'}
                                                        {isCompleted && <span className="text-emerald-600 font-medium">• Completado</span>}
                                                      </p>
                                                    </div>
                                                    <span className="text-[10px] text-[#9194ac] shrink-0">↗</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span
                                        className="px-2 py-0.5 rounded-sm border border-[#e9eaf2] text-[#9194ac] text-[10px] cursor-not-allowed bg-[#f6f7f9]"
                                        title="No hay recursos adicionales configurados para esta lección"
                                      >
                                        📁 Sin recursos
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE COMPROBACIÓN DE APRENDIZAJE REAL (QUIZ) */}
      {activeLesson && !lockedLessons.has(activeLesson.id) && (() => {
        const allCourseLessons = course?.modules?.flatMap((m) => m.lessons || []) || [];
        const currentIdx = allCourseLessons.findIndex((l) => l.id === activeLesson.id);
        const nextLessonCandidate = currentIdx >= 0 && currentIdx < allCourseLessons.length - 1
          ? allCourseLessons[currentIdx + 1]
          : undefined;

        return (
          <CheckpointQuizModal
            isOpen={isQuizModalOpen}
            onClose={() => setIsQuizModalOpen(false)}
            questions={getLessonQuizQuestions(activeLesson)}
            lessonTitle={activeLesson.title}
            courseSlug={slug}
            lessonId={activeLesson.id}
            nextLessonTitle={nextLessonCandidate?.title}
            onNextLesson={
              nextLessonCandidate
                ? () => {
                    setActiveLesson(nextLessonCandidate);
                    const targetMod = course?.modules?.find((m) =>
                      m.lessons?.some((l) => l.id === nextLessonCandidate.id)
                    );
                    if (targetMod) {
                      setExpandedModules((prev) => ({ ...prev, [targetMod.id]: true }));
                    }
                  }
                : undefined
            }
            onQuizPassed={async () => {
              if (!completedLessons.includes(activeLesson.id)) {
                const updated = [...completedLessons, activeLesson.id];
                setCompletedLessons(updated);
                if (user && slug) {
                  try {
                    await set(ref(db, `progress/${user.uid}/${slug}/completedLessons`), updated);
                  } catch (e) {
                    console.error('Error guardando lección completada:', e);
                  }
                }
              }
            }}
          />
        );
      })()}

      {/* MODAL DE POP QUIZ INTERACTIVO DE REFUERZO */}
      {activePopQuiz && (
        <PopQuizModal
          isOpen={!!activePopQuiz}
          onClose={() => setActivePopQuiz(null)}
          title={activePopQuiz.title}
          questions={activePopQuiz.questions}
          lessonTitle={activePopQuiz.lessonTitle}
          onComplete={(passed) => {
            if (passed && activePopQuiz?.id) {
              handleMarkResourceCompleted(activePopQuiz.id);
            }
          }}
        />
      )}

      {/* MODAL INTEGRADO DE FASE 3: SIMULADOR SANDBOX TECNOGAN */}
      {embeddedSandboxMissionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col p-2 md:p-5 animate-in fade-in duration-200">
          <div className="bg-[#202230] text-white px-4 py-2.5 rounded-t-2xl border border-[#2d2f42] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full bg-[#6d28d2] text-white text-[11px] font-extrabold uppercase tracking-wider shrink-0">
                Fase 3 &bull; Simulador Integrado
              </span>
              <span className="text-xs text-[#b7b9cd] truncate">
                Practica en la Finca Ficticia TecnoGan sin salir de tu clase
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/sandbox?mision=${embeddedSandboxMissionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-[#2a2b3f] hover:bg-[#3a3c54] text-xs font-semibold text-[#e9eaf2] transition-colors"
              >
                Abrir en pestaña nueva ↗
              </a>
              <button
                onClick={() => setEmbeddedSandboxMissionId(null)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar Simulador ✕
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-b-2xl overflow-hidden shadow-2xl border-x border-b border-[#2d2f42]">
            <iframe
              src={`/sandbox?mision=${embeddedSandboxMissionId}`}
              title="Simulador Operativo TecnoGan"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* Notificación Flotante con Borde LED Animado y Salida Suave */}
      <LockToast
        key={lockToastKey}
        message={lockMessage}
        onClose={() => setLockMessage(null)}
        durationMs={4200}
      />
    </div>
  );
}
