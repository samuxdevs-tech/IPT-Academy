const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

const replacement = `
    const requiredCheckpoints = lessonFound.inVideoCheckpoints || [];
    const passedCps = lp.inVideoCheckpointsPassed || [];
    const allCheckpointsPassed = requiredCheckpoints.length === 0 || 
      requiredCheckpoints.every(cp => passedCps.includes(cp.id));

    // Verificar si la lección tiene examen final de módulo (quiz)
    const hasModuleQuiz = lessonFound.checkpointQuiz && lessonFound.checkpointQuiz.length > 0;
    const quizMet = !hasModuleQuiz || lp.quizPassed === true;

    // Si cumple cobertura >= 80% Y todos los checkpoints en video están aprobados Y (si hay quiz) lo aprobó
    if (coverageMet && allCheckpointsPassed && quizMet) {
      lp.isCompleted = true;
      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
      }
    }
`;

const oldCodeRegex = /const requiredCheckpoints = lessonFound\.inVideoCheckpoints \|\| \[\];[\s\S]*?progress\.completedLessons\.push\(lessonId\);\s*}\s*}/;

content = content.replace(oldCodeRegex, replacement);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('server.js heartbeat completion logic updated');
