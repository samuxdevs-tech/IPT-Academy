const mongoose = require('mongoose');

// Subesquema de Pregunta del Quiz
const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  prompt: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  explanation: { type: String, required: true }
}, { _id: false });

const LessonSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  videoType: { type: String, enum: ['youtube', 'local'], default: 'youtube' },
  videoUrl: { type: String, default: '' },
  duration: { type: String, default: '15 min' },
  durationSeconds: { type: Number, default: 900 },
  metrics: [{ type: String }],
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  // Verificación real de aprendizaje
  checkpointQuiz: [QuestionSchema],
  inVideoCheckpoints: [{
    id: { type: String, required: true },
    timestampSeconds: { type: Number, required: true },
    prompt: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' }
  }]
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  lessons: [LessonSchema]
}, { _id: false });

const CourseSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  instructor: {
    name: { type: String, default: 'Iván Pérez' },
    role: { type: String, default: 'Especialista en Zootecnia & Datos IPT' },
    avatar: { type: String, default: '' }
  },
  category: { type: String, required: true },
  level: { type: String, enum: ['Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles'], default: 'Todos los niveles' },
  rating: { type: Number, default: 4.9 },
  ratingsCount: { type: Number, default: 120 },
  modules: [ModuleSchema],
  published: { type: Boolean, default: true }
}, { timestamps: true });

const MetricSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  definition: { type: String, default: '' },
  formula: { type: String, default: '' },
  formulaExplanation: { type: String, default: '' },
  unit: { type: String, default: '' },
  category: { type: String, required: true },
  direction: { type: String, default: 'neutral' },
  influences: { type: String, default: '' },
  benchmark: {
    source: String,
    year: Number,
    average: mongoose.Schema.Types.Mixed,
    top: mongoose.Schema.Types.Mixed
  },
  ranges: [{
    label: String,
    min: Number,
    max: Number,
    color: String,
    interpretation: String
  }],
  relatedMetrics: [String]
}, { timestamps: true });

// Notas asociadas al segundo exacto de video
const NoteSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  courseSlug: { type: String, required: true },
  lessonId: { type: String, required: true },
  seconds: { type: Number, required: true },
  timeFormatted: { type: String, default: '00:00' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Preguntas y respuestas (Q&A de la comunidad estilo Datagan)
const QuestionPostSchema = new mongoose.Schema({
  id: { type: String, required: true },
  courseSlug: { type: String, required: true },
  lessonId: { type: String, required: true },
  author: {
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    initials: { type: String, default: 'IP' }
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  votes: { type: Number, default: 0 },
  answers: [{
    id: String,
    authorName: String,
    authorRole: String,
    body: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Progreso del estudiante con validación de aprendizaje
const UserProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseSlug: { type: String, required: true },
  completedLessons: [String],
  lessonProgress: [{
    lessonId: String,
    watchedRanges: { type: [[Number]], default: [] }, // Array de intervalos [start, end]
    totalSecondsWatched: { type: Number, default: 0 },
    videoDurationSeconds: { type: Number, default: 0 },
    inVideoCheckpointsPassed: { type: [String], default: [] },
    quizPassed: { type: Boolean, default: false },
    quizScore: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false }
  }],
  lastLessonId: { type: String, default: '' },
  lastPositionSeconds: { type: Number, default: 0 }
}, { timestamps: true });

UserProgressSchema.index({ userId: 1, courseSlug: 1 }, { unique: true });


// --- FASE 3: TELEMETRÍA Y EVENTOS ---

// Registro de eventos de video (telemetría) para analíticas del admin
const TelemetryEventSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseSlug: { type: String, required: true },
  lessonId: { type: String, required: true },
  eventType: { type: String, enum: ['video_started', 'heartbeat', 'video_paused', 'video_ended', 'seek'], required: true },
  videoTimeSeconds: { type: Number, required: true },
  playbackRate: { type: Number, default: 1 },
  clientTimestamp: { type: Date, required: true }
}, { timestamps: true });

// Registro detallado de intentos de preguntas (Checkpoints y Quizzes)
const CheckpointAttemptSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseSlug: { type: String, required: true },
  lessonId: { type: String, required: true },
  questionId: { type: String, required: true },
  type: { type: String, enum: ['in_video', 'module_quiz'], required: true },
  selectedOptionIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  videoTimeSeconds: { type: Number }, // Dónde estaba el usuario cuando respondió
  clientTimestamp: { type: Date, required: true }
}, { timestamps: true });

module.exports = {
  Course: mongoose.model('Course', CourseSchema),
  Metric: mongoose.model('Metric', MetricSchema),
  Note: mongoose.model('Note', NoteSchema),
  QuestionPost: mongoose.model('QuestionPost', QuestionPostSchema),
  UserProgress: mongoose.model('UserProgress', UserProgressSchema),
  TelemetryEvent: mongoose.model('TelemetryEvent', TelemetryEventSchema),
  CheckpointAttempt: mongoose.model('CheckpointAttempt', CheckpointAttemptSchema)
};
