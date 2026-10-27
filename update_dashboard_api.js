const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

const dashboardCode = `
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
`;

const insertIndex = content.indexOf("app.listen(PORT");
content = content.slice(0, insertIndex) + dashboardCode + '\n' + content.slice(insertIndex);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('server.js updated with dashboard and certificate endpoints');
