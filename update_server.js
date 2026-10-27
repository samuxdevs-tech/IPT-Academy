const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

const telemetryCode = `
// --- FASE 3: ENDPOINTS DE TELEMETRÍA Y EVALUACIÓN ---

app.post('/api/telemetry/event', async (req, res) => {
  try {
    const { userId, courseSlug, lessonId, eventType, videoTimeSeconds, playbackRate } = req.body;
    if (!userId || !courseSlug || !lessonId || !eventType) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
    }

    // Registra el evento asíncronamente en BD (no bloquea al cliente)
    const event = new TelemetryEvent({
      userId,
      courseSlug,
      lessonId,
      eventType,
      videoTimeSeconds: videoTimeSeconds || 0,
      playbackRate: playbackRate || 1,
      clientTimestamp: new Date()
    });
    
    await event.save();
    res.json({ success: true, eventId: event._id });
  } catch (error) {
    console.error('Error guardando telemetría:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/telemetry/attempt', async (req, res) => {
  try {
    const { userId, courseSlug, lessonId, questionId, type, selectedOptionIndex, isCorrect, videoTimeSeconds } = req.body;
    
    const attempt = new CheckpointAttempt({
      userId,
      courseSlug,
      lessonId,
      questionId,
      type: type || 'in_video',
      selectedOptionIndex,
      isCorrect,
      videoTimeSeconds: videoTimeSeconds || 0,
      clientTimestamp: new Date()
    });

    await attempt.save();
    res.json({ success: true, attemptId: attempt._id });
  } catch (error) {
    console.error('Error guardando intento:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

`;

const targetIndex = content.indexOf("app.post('/api/progress/heartbeat',");
content = content.slice(0, targetIndex) + telemetryCode + content.slice(targetIndex);

// Add TelemetryEvent, CheckpointAttempt to the require imports!
const modelsImportRegex = /const \{ Course, Metric, Note, QuestionPost, UserProgress \} = require\('\.\/models'\);/;
content = content.replace(modelsImportRegex, "const { Course, Metric, Note, QuestionPost, UserProgress, TelemetryEvent, CheckpointAttempt } = require('./models');");

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('server.js updated with telemetry endpoints');
