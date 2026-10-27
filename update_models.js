const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\models.js', 'utf8');
content = content.replace(/Iv\u01edn P\u01f8rez/g, 'Iván Pérez')
                 .replace(/Verificaci\ufffdn/g, 'Verificación')
                 .replace(/validaci\ufffdn/g, 'validación');

const telemetrySchemas = `
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
`;

// Insert before module.exports
content = content.replace('module.exports = {', telemetrySchemas + '\nmodule.exports = {');

// Append exports
content = content.replace(/UserProgress:\s*mongoose\.model\('UserProgress',\s*UserProgressSchema\)\s*\n\};/,
`UserProgress: mongoose.model('UserProgress', UserProgressSchema),
  TelemetryEvent: mongoose.model('TelemetryEvent', TelemetryEventSchema),
  CheckpointAttempt: mongoose.model('CheckpointAttempt', CheckpointAttemptSchema)
};`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\models.js', content, 'utf8');
console.log('models.js updated');
