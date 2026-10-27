const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

const analyticsCode = `
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
`;

const insertIndex = content.indexOf("app.listen(PORT");
content = content.slice(0, insertIndex) + analyticsCode + '\n' + content.slice(insertIndex);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('server.js updated with Admin Analytics endpoint');
