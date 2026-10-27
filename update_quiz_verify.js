const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

const replacement = `
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
`;

const oldCodeRegex = /const quiz = lessonFound\.checkpointQuiz \|\| \[\];[\s\S]*?(?=const score = quiz\.length > 0 \? Math\.round\(\(correctCount \/ quiz\.length\) \* 100\) : 100;)/;

content = content.replace(oldCodeRegex, replacement);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('server.js updated with CheckpointAttempt logic for quizzes');
