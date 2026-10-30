'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ref, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Clock,
  RotateCcw
} from 'lucide-react';

export interface LessonItem {
  id: string;
  code: string;
  title: string;
  duration: string;
  durationSec: number;
  videoUrl?: string;
  summary: string;
  keyTakeaways: string[];
  resources: { name: string; url: string; tag: string }[];
}

export interface ModuleItem {
  id: string;
  number: number;
  title: string;
  lessons: LessonItem[];
}

export const FREE_TIER_COURSE_MODULES: ModuleItem[] = [
  {
    id: 'mod-1',
    number: 1,
    title: 'Fundamentos de Arquitectura y Separación de Capas',
    lessons: [
      {
        id: 'les-1-1',
        code: '1.1',
        title: 'Introducción a la Arquitectura de Software Moderna',
        duration: '14:20',
        durationSec: 860,
        summary:
          'En esta lección exploramos qué define a una arquitectura de software de producción, la diferencia entre escribir código y diseñar sistemas, y los factores no funcionales (rendimiento, seguridad y escalabilidad) que rigen la ingeniería de Big Tech.',
        keyTakeaways: [
          'Diferenciación entre arquitectura, diseño de componentes e implementación.',
          'Requisitos no funcionales como cimiento de decisiones técnicas.',
          'El costo oculto de la sobreingeniería temprana frente a la deuda técnica.',
        ],
        resources: [
          { name: 'Guía de Arquitectura de Sistemas IPT', url: '#', tag: 'PDF Técnico' },
          { name: 'Diagrama de Topología Base', url: '#', tag: 'Diagrama' },
        ],
      },
      {
        id: 'les-1-2',
        code: '1.2',
        title: 'Monolitos Modulares vs. Microservicios',
        duration: '18:45',
        durationSec: 1125,
        summary:
          'Análisis crítico y objetivo sobre cuándo una organización realmente necesita microservicios y cuándo un monolito modular bien estructurado ofrece mayor velocidad, menor latencia y simplicidad operativa.',
        keyTakeaways: [
          'Límites transaccionales y costos de red en sistemas distribuidos.',
          'Estrategia de modularización interna antes de separar servicios físicos.',
          'Criterios formales para decidir una migración de servicios.',
        ],
        resources: [
          { name: 'Matriz Comparativa de Arquitecturas', url: '#', tag: 'Matriz' },
        ],
      },
      {
        id: 'les-1-3',
        code: '1.3',
        title: 'Separación de Responsabilidades y Patrones Limpios',
        duration: '16:10',
        durationSec: 970,
        summary:
          'Estructuración de capas en aplicaciones reales: separación estricta entre capa de transporte (APIs), casos de uso de negocio y adaptadores de infraestructura o persistencia.',
        keyTakeaways: [
          'Regla de dependencia: el núcleo de dominio jamás depende de librerías externas.',
          'Inversión de control mediante interfaces y contratos abstractos.',
          'Facilidad de testing unitario sin dependencias de red o bases de datos.',
        ],
        resources: [
          { name: 'Plantilla de Repositorio en Capas', url: '#', tag: 'Código' },
        ],
      },
      {
        id: 'les-1-4',
        code: '1.4',
        title: 'Principios SOLID aplicados a la Industria',
        duration: '21:30',
        durationSec: 1290,
        summary:
          'Revisión práctica de cada principio SOLID con ejemplos reales de software que escala sin romperse ante requerimientos cambiantes.',
        keyTakeaways: [
          'Single Responsibility como motor de cohesión en módulos.',
          'Open/Closed mediante composición sobre herencia.',
          'Interface Segregation para contratos de clientes livianos.',
        ],
        resources: [
          { name: 'Casos de Estudio de Refactorización', url: '#', tag: 'Notas' },
        ],
      },
      {
        id: 'les-1-5',
        code: '1.5',
        title: 'Modelado de Dominio y Contratos de Datos',
        duration: '19:15',
        durationSec: 1155,
        summary:
          'Cómo definir entidades inmutables, objetos de valor (Value Objects) y contratos de datos seguros usando validación estricta y esquemas deterministas.',
        keyTakeaways: [
          'Inmutabilidad como garantía contra efectos secundarios indeseados.',
          'Validación en los bordes del sistema con esquemas de tipos.',
          'Diseño de APIs orientadas a casos de uso reales.',
        ],
        resources: [
          { name: 'Ejemplos de Esquemas Zod & TypeScript', url: '#', tag: 'TypeScript' },
        ],
      },
    ],
  },
  {
    id: 'mod-2',
    number: 2,
    title: 'APIs, Protocolos y Resiliencia en Producción',
    lessons: [
      {
        id: 'les-2-1',
        code: '2.1',
        title: 'Diseño de Contratos de API REST y Versionado',
        duration: '22:40',
        durationSec: 1360,
        summary:
          'Estandarización de endpoints, contratos OpenAPI, semántica de métodos HTTP, códigos de estado correctos y políticas de retrocompatibilidad.',
        keyTakeaways: [
          'Uso estricto de verbos HTTP y sustantivos en recursos de ruta.',
          'Estrategias de versionado en URL vs encabezados de contenido.',
          'Paginación mediante cursores vs paginación por offset.',
        ],
        resources: [
          { name: 'Especificación de API REST IPT', url: '#', tag: 'OpenAPI' },
        ],
      },
      {
        id: 'les-2-2',
        code: '2.2',
        title: 'Manejo Centralizado de Errores y Códigos de Estado',
        duration: '15:50',
        durationSec: 950,
        summary:
          'Cómo estructurar un middleware global de errores que devuelva respuestas consistentes en JSON (RFC 7807 Problem Details) sin filtrar trazas internas del servidor.',
        keyTakeaways: [
          'Estandarización de errores para clientes frontend y móviles.',
          'Enmascaramiento de excepciones internas por seguridad.',
          'Mapeo determinista de errores de dominio a códigos HTTP.',
        ],
        resources: [
          { name: 'Middleware de Errores de Ejemplo', url: '#', tag: 'Código' },
        ],
      },
      {
        id: 'les-2-3',
        code: '2.3',
        title: 'Idempotencia y Políticas de Reintento (Backoff)',
        duration: '17:25',
        durationSec: 1045,
        summary:
          'Implementación de claves de idempotencia para pagos y mutaciones críticas, combinadas con reintentos exponenciales con jitter para tolerar fallas de red temporales.',
        keyTakeaways: [
          'Encabezados de idempotencia y almacenamiento de respuestas cacheadas.',
          'Algoritmo Exponential Backoff con Jitter aleatorio.',
          'Prevención de tormentas de peticiones sobre servidores saturados.',
        ],
        resources: [
          { name: 'Algoritmo de Reintentos Exponenciales', url: '#', tag: 'Diagrama' },
        ],
      },
      {
        id: 'les-2-4',
        code: '2.4',
        title: 'Autenticación, Tokens JWT y Control de Acceso (RBAC)',
        duration: '24:10',
        durationSec: 1450,
        summary:
          'Fundamentos de seguridad web: anatomía de un token JWT firmado criptográficamente, almacenamiento seguro en cookies HttpOnly y verificación de permisos por roles.',
        keyTakeaways: [
          'Firma asimétrica y validación sin consulta recurrente a base de datos.',
          'Ciclo de vida de Access Tokens y Refresh Tokens rotativos.',
          'Matriz de permisos granulares por rol y contexto.',
        ],
        resources: [
          { name: 'Esquema de Seguridad JWT IPT', url: '#', tag: 'Seguridad' },
        ],
      },
      {
        id: 'les-2-5',
        code: '2.5',
        title: 'Estrategias de Caché y Reducción de Latencia',
        duration: '18:30',
        durationSec: 1110,
        summary:
          'Encabezados Cache-Control, ETag, revalidación condicional (304 Not Modified) y distribución mediante CDN para entregar respuestas en milisegundos.',
        keyTakeaways: [
          'Directivas stale-while-revalidate para alta frescura de datos.',
          'Invalidación basada en etiquetas y eventos.',
          'Aceleración de assets estáticos y endpoints de solo lectura.',
        ],
        resources: [
          { name: 'Guía de Encabezados HTTP Cache', url: '#', tag: 'Guía' },
        ],
      },
    ],
  },
  {
    id: 'mod-3',
    number: 3,
    title: 'Persistencia, Eventos y Bases de Datos',
    lessons: [
      {
        id: 'les-3-1',
        code: '3.1',
        title: 'Criterios de Selección Arquitectónica: SQL vs NoSQL',
        duration: '20:15',
        durationSec: 1215,
        summary:
          'Cuándo elegir bases de datos relacionales ACID (Postgres, Cloudflare D1) y cuándo apoyarse en almacenes de documentos, grafos o clave-valor según la naturaleza del dato.',
        keyTakeaways: [
          'Teorema CAP aplicado a decisiones prácticas de almacenamiento.',
          'Normalización relacional vs denormalización para lectura ultra rápida.',
          'Modelado híbrido en arquitecturas modernas.',
        ],
        resources: [
          { name: 'Cuadro Decisional SQL vs NoSQL', url: '#', tag: 'Matriz' },
        ],
      },
      {
        id: 'les-3-2',
        code: '3.2',
        title: 'Índices, Consultas Óptimas y Planes de Ejecución',
        duration: '23:00',
        durationSec: 1380,
        summary:
          'Cómo funcionan los índices B-Tree, cómo interpretar un EXPLAIN ANALYZE y cómo evitar los costosos escaneos secuenciales en tablas de millones de registros.',
        keyTakeaways: [
          'Índices compuestos y orden de columnas según selectividad.',
          'Optimización de cláusulas JOIN y filtrado WHERE.',
          'Monitoreo de tiempos de ejecución y bloqueos.',
        ],
        resources: [
          { name: 'Cheat Sheet de Índices SQL', url: '#', tag: 'Cheat Sheet' },
        ],
      },
      {
        id: 'les-3-3',
        code: '3.3',
        title: 'Migraciones Seguras de Esquema sin Downtime',
        duration: '19:40',
        durationSec: 1180,
        summary:
          'Estrategias de Expand-and-Contract para alterar columnas, tipos de datos y tablas sin interrumpir la operación del servicio en producción.',
        keyTakeaways: [
          'Fases secuenciales: Expandir esquema, escribir en dual, migrar, contraer.',
          'Herramientas deterministas de migración y reversión (Rollback).',
          'Evitar bloqueos exclusivos en tablas de alto tráfico.',
        ],
        resources: [
          { name: 'Playbook de Migraciones sin Downtime', url: '#', tag: 'Playbook' },
        ],
      },
      {
        id: 'les-3-4',
        code: '3.4',
        title: 'Patrones Basados en Eventos y Colas de Mensajería',
        duration: '25:10',
        durationSec: 1510,
        summary:
          'Desacoplamiento de procesos intensivos mediante el patrón Outbox, publicación/suscripción y colas asíncronas con reintentos ordenados.',
        keyTakeaways: [
          'Patrón Transactional Outbox para consistencia garantizada.',
          'Diferencia entre colas de tareas (Task Queues) y streams de eventos.',
          'Consumidores idempotentes y manejo de Dead Letter Queues (DLQ).',
        ],
        resources: [
          { name: 'Diagrama del Patrón Outbox', url: '#', tag: 'Diagrama' },
        ],
      },
    ],
  },
  {
    id: 'mod-4',
    number: 4,
    title: 'Despliegue, Observabilidad y Calidad Operativa',
    lessons: [
      {
        id: 'les-4-1',
        code: '4.1',
        title: 'Contenedores y Empaquetado Determinista',
        duration: '17:35',
        durationSec: 1055,
        summary:
          'Creación de imágenes Docker livianas, multi-stage builds, ejecución sin privilegios de root y empaquetado reproducible para servidores e infraestructuras serverless.',
        keyTakeaways: [
          'Multi-stage builds para imágenes de producción de menos de 100MB.',
          'Manejo de variables de entorno y secretos sin inyectarlos en la imagen.',
          'Principios de seguridad de contenedores.',
        ],
        resources: [
          { name: 'Dockerfile Multi-Stage Optimizado', url: '#', tag: 'Docker' },
        ],
      },
      {
        id: 'les-4-2',
        code: '4.2',
        title: 'Métricas Esenciales, Telemetría y Logs Centralizados',
        duration: '19:50',
        durationSec: 1190,
        summary:
          'Los 4 Golden Signals de Google SRE (Latencia, Tráfico, Errores y Saturación), logs estructurados en JSON y correlación de trazas distribuidas.',
        keyTakeaways: [
          'Estructura de logs uniforme con Correlation IDs.',
          'Monitoreo proactivo con umbrales de alerta temprana.',
          'Dashboards visuales de salud de sistemas en tiempo real.',
        ],
        resources: [
          { name: 'Plantilla de Dashboards SRE', url: '#', tag: 'Métricas' },
        ],
      },
      {
        id: 'les-4-3',
        code: '4.3',
        title: 'Auditoría de Seguridad y Prácticas OWASP',
        duration: '22:15',
        durationSec: 1335,
        summary:
          'Protección práctica contra el OWASP Top 10: prevención de inyecciones SQL, sanitización de entradas, prevención de Cross-Site Scripting (XSS) y protección CSRF.',
        keyTakeaways: [
          'Defensa en profundidad y principio de mínimo privilegio.',
          'Encabezados de seguridad HTTP (CSP, HSTS, X-Frame-Options).',
          'Auditoría continua de dependencias y vulnerabilidades.',
        ],
        resources: [
          { name: 'Checklist de Auditoría OWASP IPT', url: '#', tag: 'Checklist' },
        ],
      },
      {
        id: 'les-4-4',
        code: '4.4',
        title: 'Cierre de Especialización y Hoja de Ruta de Ingeniería',
        duration: '16:45',
        durationSec: 1005,
        summary:
          'Consolidación de los conocimientos aprendidos en el curso liberado, autoevaluación técnica y los siguientes pasos en la academia para dominar arquitecturas de nivel Big Tech.',
        keyTakeaways: [
          'Resumen integral de los 4 módulos de formación inicial.',
          'Cómo estructurar tu portafolio con arquitectura justificada.',
          'Ruta de especialización avanzada hacia los planes Pro y Pro+.',
        ],
        resources: [
          { name: 'Hoja de Ruta Profesional de Ingeniería', url: '#', tag: 'Roadmap' },
        ],
      },
    ],
  },
];

export default function FreeTierClassViewer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Obtener la lección solicitada por query (?lesson=1 o ?code=1.1)
  const initialLessonCode = searchParams?.get('code') || searchParams?.get('lesson') || '1.1';

  // Progreso guardado localmente en el navegador
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ipt_free_course_progress');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Sincronizar en tiempo real el progreso del estudiante con Firebase RTDB (progress/{uid})
  useEffect(() => {
    if (!user?.uid) return;
    const progressRef = ref(db, `progress/${user.uid}/completedLessons`);
    const unsub = onValue(progressRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val)) {
          setCompletedLessons(val);
          try {
            localStorage.setItem('ipt_free_course_progress', JSON.stringify(val));
          } catch {}
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Todas las lecciones aplanadas para navegación secuencial sencilla
  const allLessons = useMemo(() => {
    return FREE_TIER_COURSE_MODULES.flatMap((m) => m.lessons);
  }, []);

  // Encontrar la lección actual
  const [activeLessonCode, setActiveLessonCode] = useState<string>(() => {
    if (initialLessonCode === '1') return '1.1';
    const exists = allLessons.some((l) => l.code === initialLessonCode || l.id === initialLessonCode);
    return exists ? initialLessonCode : '1.1';
  });

  const activeLesson = useMemo<LessonItem>(() => {
    return (
      allLessons.find((l) => l.code === activeLessonCode || l.id === activeLessonCode) ||
      allLessons[0]
    );
  }, [allLessons, activeLessonCode]);

  const activeIndex = useMemo(() => {
    return allLessons.findIndex((l) => l.id === activeLesson.id);
  }, [allLessons, activeLesson]);

  // Estado del reproductor
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'resources'>('info');

  // Módulos desplegados en el acordeón de la barra lateral
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'mod-1': true,
    'mod-2': true,
    'mod-3': false,
    'mod-4': false,
  });

  // Toggle de completitud de la lección con persistencia viva en RTDB
  const toggleLessonCompleted = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ipt_free_course_progress', JSON.stringify(next));
        } catch {}
      }
      if (user?.uid) {
        set(ref(db, `progress/${user.uid}/completedLessons`), next).catch(() => {});
        set(ref(db, `progress/${user.uid}/lastActiveLesson`), lessonId).catch(() => {});
        set(ref(db, `progress/${user.uid}/updatedAt`), new Date().toISOString()).catch(() => {});
      }
      return next;
    });
  };

  const isCurrentCompleted = completedLessons.includes(activeLesson.id);

  // Navegar a lección anterior / siguiente
  const handleNextLesson = () => {
    if (activeIndex < allLessons.length - 1) {
      const next = allLessons[activeIndex + 1];
      setActiveLessonCode(next.code);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  const handlePrevLesson = () => {
    if (activeIndex > 0) {
      const prev = allLessons[activeIndex - 1];
      setActiveLessonCode(prev.code);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }
  };

  // Simulación suave de reproducción si no hay video embebido
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= activeLesson.durationSec) {
            setIsPlaying(false);
            if (!completedLessons.includes(activeLesson.id)) {
              toggleLessonCompleted(activeLesson.id);
            }
            return activeLesson.durationSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeLesson, completedLessons]);

  const progressPercent = Math.round(
    (completedLessons.length / allLessons.length) * 100
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#8052ff] selection:text-white flex flex-col">
      {/* Sub-barra Contextual del Curso (Debajo del Navbar Principal del Campus) */}
      <div className="border-b border-[#ffffff]/10 bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/home"
            className="flex items-center gap-1.5 text-xs text-[#9a9a9a] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Campus</span>
          </Link>

          <div className="h-3.5 w-[1px] bg-[#ffffff]/15 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-medium text-white truncate">
              Fundamentos de Arquitectura de Software e Ingeniería
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#15846e]/15 border border-[#15846e]/30 text-[#15846e] text-[10px] font-semibold uppercase tracking-wider shrink-0 hidden md:inline">
              Free Tier
            </span>
          </div>
        </div>

        {/* Avance del Estudiante */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#9a9a9a]">
            <span className="text-[11px]">{completedLessons.length}/{allLessons.length} lecciones</span>
            <div className="w-16 sm:w-24 h-1.5 rounded-full bg-[#ffffff]/10 overflow-hidden">
              <div
                className="h-full bg-[#15846e] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#15846e] font-bold">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Contenedor del Visor Estático: Reproductor + Temario Lateral */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Columna Principal Izquierda: Reproductor y Detalle */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6">
            {/* Pantalla del Reproductor de Video */}
            <div className="relative aspect-video w-full rounded-[24px] bg-[#09090b] border border-[#ffffff]/15 shadow-2xl overflow-hidden flex flex-col justify-between group">
              {/* Fondo Cinematográfico Abstracto */}
              <div className="absolute inset-0 bg-radial from-[#8052ff]/20 via-transparent to-transparent opacity-40 pointer-events-none" />

              {/* Botón Central de Play/Pause */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-18 h-18 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-white flex items-center justify-center shadow-[0_0_35px_rgba(128,82,255,0.6)] transform group-hover:scale-105 transition-all cursor-pointer"
                  aria-label={isPlaying ? 'Pausar video' : 'Reproducir video'}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-white" />
                  ) : (
                    <Play className="w-8 h-8 fill-white ml-1" />
                  )}
                </button>
              </div>

              {/* Marca de Agua / Título Superior */}
              <div className="relative z-10 p-6 flex items-center justify-between text-xs text-[#9a9a9a]">
                <span className="font-mono text-white/80">
                  Lección {activeLesson.code} · {activeLesson.duration}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-[#bdbdbd] backdrop-blur-md">
                  1080p HD
                </span>
              </div>

              {/* Barra de Control Inferior */}
              <div className="relative z-10 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-3">
                {/* Línea de tiempo interactiva */}
                <div
                  className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const fraction = clickX / rect.width;
                    setCurrentTimeSec(Math.floor(fraction * activeLesson.durationSec));
                  }}
                >
                  <div
                    className="h-full bg-[#8052ff] transition-all duration-150"
                    style={{
                      width: `${(currentTimeSec / activeLesson.durationSec) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#bdbdbd]">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span className="font-mono text-[11px]">
                      {formatTime(currentTimeSec)} / {activeLesson.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentTimeSec(0)}
                      title="Reiniciar video"
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-[11px] text-[#9a9a9a]">Velocidad 1.0x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila de Acciones Rápidas de Navegación */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-[20px] bg-[#09090b] border border-[#ffffff]/10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleLessonCompleted(activeLesson.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                    isCurrentCompleted
                      ? 'bg-[#15846e]/20 border-[#15846e]/50 text-[#15846e]'
                      : 'bg-[#ffffff]/5 border-[#ffffff]/15 hover:border-[#ffffff]/30 text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${isCurrentCompleted ? 'text-[#15846e]' : 'text-[#9a9a9a]'}`} />
                  <span>{isCurrentCompleted ? 'Lección completada' : 'Marcar como completada'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevLesson}
                  disabled={activeIndex === 0}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[#ffffff]/15 hover:border-[#ffffff]/30 disabled:opacity-30 disabled:pointer-events-none text-[#bdbdbd] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextLesson}
                  disabled={activeIndex === allLessons.length - 1}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#8052ff] hover:bg-[#6e3df0] text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(128,82,255,0.4)] cursor-pointer"
                >
                  <span>Siguiente Lección</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pestañas de Información de la Lección */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 border-b border-[#ffffff]/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`text-xs uppercase tracking-wider font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'info'
                      ? 'border-[#8052ff] text-white'
                      : 'border-transparent text-[#9a9a9a] hover:text-white'
                  }`}
                >
                  Sobre esta clase
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('resources')}
                  className={`text-xs uppercase tracking-wider font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'resources'
                      ? 'border-[#8052ff] text-white'
                      : 'border-transparent text-[#9a9a9a] hover:text-white'
                  }`}
                >
                  Recursos ({(activeLesson.resources || []).length})
                </button>
              </div>

              {activeTab === 'info' ? (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-normal text-white tracking-tight mb-2">
                      {activeLesson.code} {activeLesson.title}
                    </h1>
                    <p className="text-sm font-extralight text-[#bdbdbd] leading-relaxed">
                      {activeLesson.summary}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#09090b] border border-[#ffffff]/10 space-y-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-white block">
                      Conceptos Clave de la Lección:
                    </span>
                    <ul className="space-y-2 text-xs text-[#9a9a9a] font-light">
                      {(activeLesson.keyTakeaways || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8052ff] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeLesson.resources || []).map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 rounded-xl bg-[#09090b] border border-[#ffffff]/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8052ff]/15 text-[#8052ff] border border-[#8052ff]/30">
                          {res.tag}
                        </span>
                        <span className="text-xs text-white font-medium">{res.name}</span>
                      </div>
                      <a
                        href={res.url}
                        className="text-xs text-[#8052ff] hover:underline flex items-center gap-1"
                      >
                        <span>Descargar</span>
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Lateral Derecha: Temario de Módulos y Lecciones */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#ffffff]/10 bg-[#09090b]/80 backdrop-blur-md flex flex-col h-auto lg:h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-[#ffffff]/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Temario del Curso
              </h2>
              <p className="text-[11px] text-[#9a9a9a] font-light">
                4 Módulos · 18 Lecciones Libres
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#15846e]/15 text-[#15846e] text-[10px] font-mono font-semibold">
              {progressPercent}%
            </span>
          </div>

          {/* Lista Acordeón de Módulos */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#ffffff]/5">
            {FREE_TIER_COURSE_MODULES.map((mod) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              return (
                <div key={mod.id} className="py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedModules((prev) => ({
                        ...prev,
                        [mod.id]: !prev[mod.id],
                      }))
                    }
                    className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-[#ffffff]/5 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-[#8052ff] block">
                        Módulo {mod.number}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {mod.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#9a9a9a]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#9a9a9a]" />
                    )}
                  </button>

                  {/* Lecciones del Módulo */}
                  {isExpanded && (
                    <div className="space-y-1 px-2 pt-1">
                      {mod.lessons.map((les) => {
                        const isSelected = les.id === activeLesson.id;
                        const isDone = completedLessons.includes(les.id);
                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => {
                              setActiveLessonCode(les.code);
                              setCurrentTimeSec(0);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left flex items-start gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#8052ff] text-white shadow-[0_0_15px_rgba(128,82,255,0.3)]'
                                : 'hover:bg-[#ffffff]/5 text-[#bdbdbd]'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#15846e]'}`} />
                              ) : isSelected ? (
                                <Play className="w-4 h-4 fill-white text-white" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#ffffff]/30" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className={`text-xs block truncate ${isSelected ? 'font-semibold text-white' : 'text-[#d1d5db]'}`}>
                                {les.code} {les.title}
                              </span>
                              <span className={`text-[11px] font-mono ${isSelected ? 'text-white/80' : 'text-[#9a9a9a]'}`}>
                                {les.duration}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
