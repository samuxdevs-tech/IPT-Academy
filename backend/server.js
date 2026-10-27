require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { z } = require('zod');

const { Course, Metric, Note, QuestionPost, UserProgress, TelemetryEvent, CheckpointAttempt } = require('./models');

const app = express();
const PORT = process.env.PORT || 4000;
const STORAGE_DIR = path.resolve(__dirname, process.env.STORAGE_DIR || '../storage/videos');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Configurar multer para carga de videos locales
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, safeName);
  }
});
const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 1024 * 1024 * 1024 * 2 } // 2 GB
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// 1. ENDPOINTS DE VIDEO (STREAMING RANGE REQUESTS)
// ==========================================

app.get('/api/videos/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(STORAGE_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }
  const streamUrl = `/api/videos/stream/${req.file.filename}`;
  res.json({
    message: 'Video subido exitosamente',
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    streamUrl
  });
});

// ==========================================
// 2. ENDPOINTS DE CURSOS & MÓDULOS
// ==========================================

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/courses/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { slug, ...data } = req.body;
    const course = await Course.findOneAndUpdate(
      { slug },
      { slug, ...data },
      { upsert: true, new: true }
    );
    res.json({ message: 'Curso guardado con éxito', course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ENDPOINTS DE MÉTRICAS & GLOSARIO
// ==========================================

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await Metric.find().sort({ category: 1, label: 1 });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/metrics/:id', async (req, res) => {
  try {
    const metric = await Metric.findOne({ id: req.params.id });
    if (!metric) return res.status(404).json({ error: 'Métrica no encontrada' });
    res.json(metric);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. NOTAS VINCULADAS AL SEGUNDO EXACTO
// ==========================================

app.get('/api/notes/:courseSlug', async (req, res) => {
  try {
    const { lessonId } = req.query;
    const filter = { courseSlug: req.params.courseSlug };
    if (lessonId) filter.lessonId = lessonId;
    const notes = await Note.find(filter).sort({ seconds: 1, createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { courseSlug, lessonId, seconds, timeFormatted, text, userId } = req.body;
    const note = new Note({
      id: 'note-' + Date.now(),
      userId: userId || 'ivan',
      courseSlug,
      lessonId,
      seconds: seconds || 0,
      timeFormatted: timeFormatted || '00:00',
      text
    });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. PREGUNTAS Y RESPUESTAS (Q&A)
// ==========================================

app.get('/api/questions/:courseSlug', async (req, res) => {
  try {
    const { search, lessonId } = req.query;
    const filter = { courseSlug: req.params.courseSlug };
    if (lessonId) filter.lessonId = lessonId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }
    const questions = await QuestionPost.find(filter).sort({ votes: -1, createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { courseSlug, lessonId, title, body, authorName } = req.body;
    const q = new QuestionPost({
      id: 'q-' + Date.now(),
      courseSlug,
      lessonId,
      author: {
        name: authorName || 'Iván Samuel',
        initials: (authorName || 'IS').split(' ').map(n => n[0]).join('').substring(0, 2)
      },
      title,
      body,
      votes: 1
    });
    await q.save();
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions/:id/vote', async (req, res) => {
  try {
    const q = await QuestionPost.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { votes: 1 } },
      { new: true }
    );
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. VALIDACIÓN REAL DE APRENDIZAJE & QUIZ
// ==========================================

app.get('/api/progress/:userId/:courseSlug', async (req, res) => {
  try {
    const progress = await UserProgress.findOne({
      userId: req.params.userId,
      courseSlug: req.params.courseSlug
    });
    res.json(progress || { completedLessons: [], lessonProgress: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Algoritmo de unión de intervalos matemáticos continuos
function mergeIntervals(intervals) {
  if (!intervals || !Array.isArray(intervals) || intervals.length === 0) return [];
  const clean = intervals
    .filter(r => Array.isArray(r) && r.length >= 2 && !isNaN(r[0]) && !isNaN(r[1]))
    .map(r => [Number(r[0]), Number(r[1])])
    .sort((a, b) => a[0] - b[0]);

  if (clean.length === 0) return [];
  const merged = [clean[0]];

  for (let i = 1; i < clean.length; i++) {
    const current = clean[i];
    const last = merged[merged.length - 1];

    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function calculateTotalWatchedSeconds(ranges) {
  if (!ranges || !Array.isArray(ranges)) return 0;
  return ranges.reduce((acc, [start, end]) => acc + Math.max(0, end - start), 0);
}

// 6.1 HEARTBEAT DE REPRODUCCIÓN (Validación Pasiva de Intervalos)

// --- FASE 3: ENDPOINTS DE TELEMETRÍA Y EVALUACIÓN ---

app.post('/api/telemetry/event', async (req, res) => {
  try {
    const EventSchema = z.object({
      userId: z.string().min(1),
      courseSlug: z.string().min(1),
      lessonId: z.string().min(1),
      eventType: z.enum(['video_started', 'video_paused', 'video_ended', 'seek']),
      videoTimeSeconds: z.number().nonnegative(),
      playbackRate: z.number().positive().optional()
    });

    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }
    const { userId, courseSlug, lessonId, eventType, videoTimeSeconds, playbackRate } = parsed.data;

    // TODO: A jwt middleware would override parsed.data.userId here

    const event = new TelemetryEvent({
      userId,
      courseSlug,
      lessonId,
      eventType,
      videoTimeSeconds,
      playbackRate
    });
    await event.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6.2 EVALUACIÓN DE CHECKPOINT INTERCALADO EN TIMELINE
app.post('/api/progress/in-video-checkpoint', async (req, res) => {
  try {
    const { userId, courseSlug, lessonId, checkpointId, selectedIndex } = req.body;
    if (!userId || !courseSlug || !lessonId || !checkpointId || selectedIndex === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros de evaluación' });
    }

    const course = await Course.findOne({ slug: courseSlug });
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    let lessonFound = null;
    for (const m of course.modules) {
      const l = m.lessons.find(item => item.id === lessonId);
      if (l) { lessonFound = l; break; }
    }
    if (!lessonFound) return res.status(404).json({ error: 'Lección no encontrada' });

    const cp = (lessonFound.inVideoCheckpoints || []).find(item => item.id === checkpointId);
    if (!cp) return res.status(404).json({ error: 'Checkpoint no encontrado en esta lección' });

    const isCorrect = selectedIndex === cp.correctIndex;

    let progress = await UserProgress.findOne({ userId, courseSlug });
    if (!progress) {
      progress = new UserProgress({ userId, courseSlug, completedLessons: [], lessonProgress: [] });
    }

    let lp = progress.lessonProgress.find(item => item.lessonId === lessonId);
    if (!lp) {
      lp = {
        lessonId,
        watchedRanges: [],
        totalSecondsWatched: 0,
        videoDurationSeconds: lessonFound.durationSeconds || 900,
        inVideoCheckpointsPassed: [],
        quizPassed: false,
        quizScore: 0,
        isCompleted: false
      };
      progress.lessonProgress.push(lp);
      lp = progress.lessonProgress[progress.lessonProgress.length - 1];
    }

    if (isCorrect) {
      if (!lp.inVideoCheckpointsPassed.includes(checkpointId)) {
        lp.inVideoCheckpointsPassed.push(checkpointId);
      }

      // Evaluar si con esta respuesta correcta se cumple la lección completa
      const duration = lp.videoDurationSeconds || lessonFound.durationSeconds || 900;
      const coverage = duration > 0 ? (lp.totalSecondsWatched / duration) : 0;
      const coverageMet = coverage >= 0.8;
      const requiredCheckpoints = lessonFound.inVideoCheckpoints || [];
      const allCheckpointsPassed = requiredCheckpoints.every(c => lp.inVideoCheckpointsPassed.includes(c.id));

      if (coverageMet && allCheckpointsPassed) {
        lp.isCompleted = true;
        if (!progress.completedLessons.includes(lessonId)) {
          progress.completedLessons.push(lessonId);
        }
      }
      await progress.save();
    }

    res.json({
      correct: isCorrect,
      correctIndex: isCorrect ? cp.correctIndex : null,
      explanation: isCorrect 
        ? cp.explanation 
        : 'Respuesta incorrecta. La opción elegida no corresponde al criterio zootécnico. Reflexiona sobre el concepto explicado en el video y vuelve a intentarlo.',
      inVideoCheckpointsPassed: lp.inVideoCheckpointsPassed,
      isCompleted: lp.isCompleted,
      completedLessons: progress.completedLessons
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress/reset', async (req, res) => {
  try {
    const { userId, courseSlug } = req.body;
    await UserProgress.deleteMany({ userId: userId || 'ivan', ...(courseSlug ? { courseSlug } : {}) });
    res.json({ success: true, message: 'Progreso reiniciado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para calificar el checkpoint quiz y marcar lección completada si aprueba
app.post('/api/progress/quiz-verify', async (req, res) => {
  try {
    const { userId, courseSlug, lessonId, answers } = req.body;
    // answers = { "q-1": 1, "q-2": 0 }

    const course = await Course.findOne({ slug: courseSlug });
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    let lessonFound = null;
    for (const m of course.modules) {
      const l = m.lessons.find(item => item.id === lessonId);
      if (l) { lessonFound = l; break; }
    }

    if (!lessonFound) return res.status(404).json({ error: 'Lección no encontrada' });

    
    const quiz = lessonFound.checkpointQuiz || [];
    let correctCount = 0;
    const feedback = [];
    const attemptDocs = [];

    quiz.forEach(q => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;
      
      feedback.push({
        id: q.id,
        prompt: q.prompt,
        isCorrect,
        correctIndex: q.correctIndex,
        explanation: q.explanation
      });

      // Crear registro de telemetría para esta pregunta del examen final de lección
      if (selected !== undefined) {
        attemptDocs.push({
          userId,
          courseSlug,
          lessonId,
          questionId: q.id,
          type: 'module_quiz',
          selectedOptionIndex: selected,
          isCorrect,
          videoTimeSeconds: 0,
          clientTimestamp: new Date()
        });
      }
    });

    if (attemptDocs.length > 0) {
      await CheckpointAttempt.insertMany(attemptDocs);
    }
const score = quiz.length > 0 ? Math.round((correctCount / quiz.length) * 100) : 100;
    const passed = score >= 70; // Requiere al menos 70% para aprobar y validar aprendizaje

    // Actualizar progreso
    let progress = await UserProgress.findOne({ userId, courseSlug });
    if (!progress) {
      progress = new UserProgress({ userId, courseSlug, completedLessons: [], lessonProgress: [] });
    }

    const idx = progress.lessonProgress.findIndex(lp => lp.lessonId === lessonId);
    if (idx !== -1) {
      progress.lessonProgress[idx].quizPassed = passed;
      progress.lessonProgress[idx].quizScore = score;
    } else {
      progress.lessonProgress.push({
        lessonId,
        quizPassed: passed,
        quizScore: score
      });
    }

    if (passed && !progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    } else if (!passed) {
      // Si reprobó el examen, no se considera completada
      progress.completedLessons = progress.completedLessons.filter(id => id !== lessonId);
    }

    await progress.save();

    res.json({
      passed,
      score,
      correctCount,
      totalQuestions: quiz.length,
      feedback,
      completedLessons: progress.completedLessons
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conexión y Arranque
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas (Base: datagan_course)');
    
app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar todos los progresos del usuario
    const progressList = await UserProgress.find({ userId });
    const dashboardData = [];

    for (const prog of progressList) {
      const course = await Course.findOne({ slug: prog.courseSlug });
      if (!course) continue;

      let totalLessons = 0;
      course.modules.forEach(m => totalLessons += m.lessons.length);
      
      const completed = prog.completedLessons.length;
      const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      const isCertified = progressPercent === 100;

      // Calcular promedios desde TelemetryEvent / CheckpointAttempt
      const attempts = await CheckpointAttempt.find({ userId, courseSlug: course.slug });
      
      const inVideoAttempts = attempts.filter(a => a.type === 'in_video');
      const inVideoScore = inVideoAttempts.length > 0 
        ? Math.round((inVideoAttempts.filter(a => a.isCorrect).length / inVideoAttempts.length) * 100)
        : 100;

      const quizAttempts = attempts.filter(a => a.type === 'module_quiz');
      const quizScore = quizAttempts.length > 0
        ? Math.round((quizAttempts.filter(a => a.isCorrect).length / quizAttempts.length) * 100)
        : 100;

      dashboardData.push({
        courseSlug: course.slug,
        courseTitle: course.title,
        thumbnail: course.thumbnail,
        totalLessons,
        completedLessons: completed,
        progressPercent,
        isCertified,
        metrics: {
          inVideoScore,
          quizScore
        }
      });
    }

    res.json({ success: true, courses: dashboardData });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/certificate/generate', async (req, res) => {
  try {
    const { userId, courseSlug } = req.body;
    
    const progress = await UserProgress.findOne({ userId, courseSlug });
    const course = await Course.findOne({ slug: courseSlug });
    
    if (!progress || !course) return res.status(404).json({ error: 'Datos no encontrados' });

    let totalLessons = 0;
    course.modules.forEach(m => totalLessons += m.lessons.length);
    const completed = progress.completedLessons.length;
    
    if (completed < totalLessons) {
      return res.status(403).json({ error: 'Debes completar el 100% del curso para certificar.' });
    }

    // Generar un hash único de certificado
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(userId + courseSlug + Date.now().toString()).digest('hex').substring(0, 10).toUpperCase();

    // En un caso real, aquí se usaría puppeteer o PDFKit para generar el PDF.
    // Retornamos el payload necesario para que el frontend pueda pintar el diploma.
    res.json({ 
      success: true, 
      certificateId: 'IPT-' + hash,
      studentName: 'Iván Pérez', // Mock de estudiante autenticado
      courseName: course.title,
      issueDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});


app.get('/api/admin/analytics/:courseSlug', async (req, res) => {
  try {
    const { courseSlug } = req.params;
    
    // 1. Analíticas de Preguntas (dónde se equivocan más)
    const attempts = await CheckpointAttempt.find({ courseSlug });
    
    const questionStats = {};
    attempts.forEach(a => {
      if (!questionStats[a.questionId]) {
        questionStats[a.questionId] = { total: 0, correct: 0, type: a.type, lessonId: a.lessonId };
      }
      questionStats[a.questionId].total += 1;
      if (a.isCorrect) questionStats[a.questionId].correct += 1;
    });

    const errorRanking = Object.entries(questionStats).map(([qId, stats]) => {
      const errorRate = stats.total > 0 ? ((stats.total - stats.correct) / stats.total) * 100 : 0;
      return {
        questionId: qId,
        lessonId: stats.lessonId,
        type: stats.type,
        totalAttempts: stats.total,
        errorRate: Math.round(errorRate)
      };
    }).sort((a, b) => b.errorRate - a.errorRate); // Descendente por mayor tasa de error

    // 2. Mapa de Calor (Drop-offs y Seeks)
    const events = await TelemetryEvent.find({ courseSlug });
    const heatmapByLesson = {};

    events.forEach(e => {
      if (!heatmapByLesson[e.lessonId]) {
        heatmapByLesson[e.lessonId] = { dropoffs: {}, repeats: {} };
      }
      const bucket = Math.floor(e.videoTimeSeconds / 10) * 10; // Buckets de 10 segundos
      
      // Abandonos (Pausas sin reanudación rápida, o cierres. Simplificado a 'video_paused' y 'video_ended')
      if (e.eventType === 'video_paused' || e.eventType === 'video_ended') {
        heatmapByLesson[e.lessonId].dropoffs[bucket] = (heatmapByLesson[e.lessonId].dropoffs[bucket] || 0) + 1;
      }
      
      // Repeticiones (Seeks hacia ese minuto)
      if (e.eventType === 'seek') {
        heatmapByLesson[e.lessonId].repeats[bucket] = (heatmapByLesson[e.lessonId].repeats[bucket] || 0) + 1;
      }
    });

    res.json({ success: true, errorRanking, heatmapByLesson });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.listen(PORT, () => {
      console.log(`🚀 Backend API escuchando en: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error fatal conectando a MongoDB:', err.message);
  });
