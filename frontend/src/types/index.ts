export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type MetricTemplateType = 
  | 'formula'          // Fórmula matemática clásica con variables y benchmark
  | 'visual_scale'     // Escala de calificación visual (ej. Condición Corporal 1-5, Locomoción)
  | 'protocol'         // Protocolo de acción o procedimiento paso a paso
  | 'decision_matrix'  // Matriz de decisión o árbol condicional
  | 'glossary'         // Término / Concepto de Glosario sin fórmula
  | 'custom';          // Personalizado / Totalmente libre

export interface VisualScaleLevel {
  level: string | number;
  title: string;
  description: string;
  status: 'optimal' | 'warning' | 'critical' | 'info';
  imageUrl?: string;
}

export interface ProtocolStep {
  stepNumber: number;
  title: string;
  timing?: string;
  instructions: string;
  criticalNote?: string;
}

export interface DecisionRow {
  condition: string;
  probableCause?: string;
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CustomField {
  label: string;
  value: string;
}

export interface Metric {
  id: string;
  label: string;
  category: string;
  shortDescription: string;
  definition: string;
  templateType?: MetricTemplateType;
  
  // Para plantilla Fórmula
  formula?: string;
  formulaExplanation?: string;
  unit?: string;
  
  // Para plantilla Escala Visual
  visualLevels?: VisualScaleLevel[];
  
  // Para plantilla Protocolo Paso a Paso
  protocolSteps?: ProtocolStep[];
  
  // Para plantilla Matriz de Decisión
  decisionRows?: DecisionRow[];
  
  // Para plantilla Glosario
  examples?: string[];
  keyTakeaway?: string;
  
  // Benchmarks & Rangos
  benchmark?: {
    source: string;
    year: number;
    average: number | string;
    top: number | string;
  };
  ranges?: Array<{
    label: string;
    min: number;
    max: number;
    color: string;
    interpretation: string;
  }>;
  
  // Campos Libres Adicionales (Máxima manejabilidad)
  customFields?: CustomField[];
  externalUrl?: string;
  relatedMetrics?: string[];
}

export type ResourceType = 'document' | 'link' | 'popquiz';

export interface Resource {
  id?: string;
  title: string;
  url?: string;
  type: ResourceType | string;
  description?: string;
  fileSize?: string;
  extension?: string;
  popQuizQuestions?: QuizQuestion[];
}

export interface InVideoCheckpoint {
  id: string;
  timestampSeconds: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  order: number;
  videoType: 'youtube' | 'local';
  videoUrl: string;
  duration: string;
  durationSeconds?: number;
  metrics: string[];
  resources?: Resource[];
  checkpointQuiz?: QuizQuestion[];
  inVideoCheckpoints?: InVideoCheckpoint[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export type ProgressionMode = 'free' | 'lesson_strict' | 'module_strict';

export interface Course {
  _id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  instructor: {
    name: string;
    role: string;
    avatar: string;
  };
  category: string;
  level: string;
  rating: number;
  ratingsCount: number;
  modules: Module[];
  published: boolean;
  approxHours?: string;
  whatYouWillLearn?: string[];
  progressionMode?: ProgressionMode;
  phase2Visible?: boolean;
  phase3Visible?: boolean;
  phase3Mode?: 'global' | 'in_course';
  visibility?: 'public' | 'draft';
  accessType?: 'free' | 'paid';
  price?: number;
  licenseToken?: string;
}

export interface NoteItem {
  id: string;
  courseSlug: string;
  lessonId: string;
  seconds: number;
  timeFormatted: string;
  text: string;
  createdAt: string;
}

export interface QAAnswer {
  id: string;
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
}

export interface QuestionPost {
  id: string;
  courseSlug: string;
  lessonId: string;
  author: {
    name: string;
    initials: string;
  };
  title: string;
  body: string;
  votes: number;
  answers: QAAnswer[];
  createdAt: string;
}

export interface LessonProgressItem {
  lessonId: string;
  watchedRanges?: number[][];
  totalSecondsWatched?: number;
  videoDurationSeconds?: number;
  inVideoCheckpointsPassed?: string[];
  quizPassed?: boolean;
  quizScore?: number;
  isCompleted?: boolean;
}

export interface UserProgress {
  userId: string;
  courseSlug: string;
  completedLessons: string[];
  lessonProgress?: LessonProgressItem[];
}

export interface ScenarioOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Scenario {
  id: string;
  courseSlug?: string;
  imageUrl: string;
  context: string;
  question: string;
  options: ScenarioOption[];
  explanation: string;
  metricId?: string;
}

export interface MissionRule {
  field: string;
  operator: 'equals' | 'greater_than' | 'not_empty' | 'includes';
  value: string;
  label: string;
}

export interface SandboxMission {
  id: string;
  order: number;
  title: string;
  category: string;
  courseSlug: string;
  lessonId?: string;
  targetModule: 'nacimiento' | 'animales' | 'potreros' | 'pesaje' | 'leche' | 'veterinaria' | 'lotes' | 'inventario' | 'ventas';
  summary: string;
  context: string;
  instructions: string[];
  rules: MissionRule[];
  solutionSteps: string[];
  autoFillPayload: Record<string, any>;
  published: boolean;
}

export interface Certificate {
  id: string; // e.g. "TG-CERT-7A8B9C"
  userId: string;
  studentName: string;
  studentEmail: string;
  courseSlug: string;
  courseTitle: string;
  instructor: string;
  instructorRole: string;
  issueDate: string;
  issueDateFormatted: string;
  issueTimeFormatted?: string;
  createdAt?: string;
  completionHours?: number;
  scoreAverage?: number;
  progressPercent?: number;
  verificationHash: string;
  status: 'valid' | 'revoked';
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  email: string;
  role?: 'admin' | 'student';
  updatedAt?: string;
}


