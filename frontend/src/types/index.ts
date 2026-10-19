export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type MetricTemplateType =
  | 'formula'
  | 'visual_scale'
  | 'protocol'
  | 'decision_matrix'
  | 'glossary'
  | 'custom';

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
  formula?: string;
  formulaExplanation?: string;
  unit?: string;
  visualLevels?: VisualScaleLevel[];
  protocolSteps?: ProtocolStep[];
  decisionRows?: DecisionRow[];
  examples?: string[];
  keyTakeaway?: string;
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

// ============================================================================
// CLASES EN VIDEO Y REUNIONES EN VIVO
// ============================================================================

export type VideoResolution = 'auto' | '1080p' | '720p' | '480p' | '360p' | '240p';

export interface VideoQualityVariant {
  resolution: Exclude<VideoResolution, 'auto'>;
  bitrateKbps: number;
  fps: number;
  codec: string;
  streamUrl: string;
}

export interface VideoChapterMarker {
  id: string;
  title: string;
  slideTitle?: string;
  timestampSeconds: number;
  durationSeconds: number;
  keyConcept: string;
  transcriptExcerpt: string;
}

export interface VideoCaptionCue {
  id: string;
  startSeconds: number;
  endSeconds: number;
  textEs: string;
  textEn?: string;
}

export type ConferenceProvider = 'ms_teams' | 'google_meet' | 'zoom';

export interface LiveVirtualSession {
  id: string;
  courseSlug: string;
  moduleId: string;
  title: string;
  instructorName: string;
  provider: ConferenceProvider;
  meetingCode: string;
  joinUrl: string;
  startTimeUtc: string;
  durationMinutes: number;
  cloudRecordingState: 'scheduled' | 'recording_active' | 'processing_cloud' | 'ready_stream';
  cloudStreamMasterUrl?: string;
  storageSizeMb?: number;
  indexedMarkersCount?: number;
  autoTranscribed: boolean;
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
  metrics?: string[];
  resources?: Resource[];
  checkpointQuiz?: QuizQuestion[];
  inVideoCheckpoints?: InVideoCheckpoint[];
  qualityVariants?: VideoQualityVariant[];
  chapters?: VideoChapterMarker[];
  captions?: VideoCaptionCue[];
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
  minPassingGrade?: number; // Escala 0.0 a 5.0 (por defecto 3.0)
  faculty?: string;
  academicCredits?: number;
  academicTerm?: string;
  cohortCode?: string;
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
  title?: string;
  category?: string;
  description?: string;
  difficulty?: string;
  courseSlug?: string;
  imageUrl?: string;
  context?: string;
  question?: string;
  options?: ScenarioOption[];
  explanation?: string;
  metricId?: string;
  nodes?: Array<{
    id: string;
    stepNumber?: number;
    title?: string;
    situation?: string;
    options?: Array<{
      id: string;
      label?: string;
      text?: string;
      isOptimal?: boolean;
      isCorrect?: boolean;
      feedback?: string;
      nextNodeId?: string;
      budgetDelta?: number;
      healthDelta?: number;
      productivityDelta?: number;
    }>;
  }>;
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
  id: string;
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
  role?: 'admin' | 'instructor' | 'student';
  updatedAt?: string;
}

// ============================================================================
// CALENDARIO DE ACTIVIDADES
// ============================================================================

export type CalendarEventCategory =
  | 'assignment_due'
  | 'exam'
  | 'live_class'
  | 'institutional'
  | 'tutoring';

export interface InstitutionalCalendarEvent {
  id: string;
  title: string;
  description: string;
  category: CalendarEventCategory;
  courseSlug: string;
  courseTitle: string;
  startUtc: string; // ISO-8601 UTC
  endUtc: string;   // ISO-8601 UTC
  locationOrUrl: string;
  isPendingDelivery?: boolean;
  linkedAssignmentId?: string;
  syncedProviders: Array<'google_calendar' | 'outlook' | 'apple_calendar'>;
  createdByRole: 'instructor' | 'admin' | 'system';
}

// ============================================================================
// TAREAS, TRABAJOS Y CALIFICACIONES
// ============================================================================

export type AcademicCutId = 'cut_1' | 'cut_2' | 'cut_3';

export interface RubricLevel {
  id: string;
  label: string;
  points: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  weightPercent: number;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface PlagiarismMatchItem {
  id: string;
  sourceName: string;
  sourceType: 'institutional_repository' | 'academic_journal' | 'web_index';
  similarityPercent: number;
  matchedExcerpt: string;
}

export interface PlagiarismAnalysisReport {
  engine: string;
  overallSimilarityPercent: number;
  status: 'original' | 'moderate_review' | 'high_similarity';
  analyzedAtUtc: string;
  wordCount: number;
  matches: PlagiarismMatchItem[];
}

export interface TeacherMultimediaFeedback {
  writtenFeedback: string;
  voiceNoteUrl?: string;
  voiceNoteDurationSec?: number;
  correctedAttachmentName?: string;
  correctedAttachmentSize?: string;
  correctedAttachmentUrl?: string;
  gradedBy: string;
  gradedAtUtc: string;
}

export interface SubmittedFileItem {
  id: string;
  fileName: string;
  extension: string;
  sizeMb: number;
  uploadedAtUtc: string;
  sha256Receipt: string;
}

export interface AssignmentItem {
  id: string;
  courseSlug: string;
  courseTitle: string;
  moduleTitle: string;
  cutId: AcademicCutId;
  weightInCutPercent: number;
  title: string;
  instructions: string;
  dueDateUtc: string;
  allowedExtensions: string[];
  maxFileSizeMb: number;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  rubric: RubricCriterion[];
  selectedRubricLevels: Record<string, string>; // criterionId -> levelId
  submittedFiles: SubmittedFileItem[];
  submissionTextContent?: string;
  plagiarismReport?: PlagiarismAnalysisReport;
  multimediaFeedback?: TeacherMultimediaFeedback;
  finalGrade?: number; // 0.0 to 5.0
}

// ============================================================================
// AVANCE DEL GRUPO Y SEGUIMIENTO DE CLASES
// ============================================================================

export interface StudentAnalyticsRecord {
  id: string;
  studentName: string;
  studentCode: string;
  email: string;
  program: string;
  courseSlug: string;
  videoParticipationPercent: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  currentGpa: number;
  lastActiveHoursAgo: number;
  dropoutRiskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
}

export interface VideoRetentionPoint {
  minuteLabel: string;
  retentionPercent: number;
  replaysCount: number;
  topicLabel: string;
}
