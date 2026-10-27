const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const lockLogic = `
  // Pre-calcular el estado "bloqueado" de cada lección (Fase 2: Bloqueo estricto por evaluaciones)
  const lockedLessons = new Set<string>();
  let isCurrentlyLocked = false;
  if (course) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (isCurrentlyLocked) {
          lockedLessons.add(lesson.id);
        }
        // Si la lección tiene quiz de módulo y NO está completada, bloquea las siguientes
        const hasQuiz = lesson.checkpointQuiz && lesson.checkpointQuiz.length > 0;
        const isDone = completedLessons.includes(lesson.id);
        if (hasQuiz && !isDone) {
          isCurrentlyLocked = true;
        }
      }
    }
  }

  // Navegar Lección Anterior / Siguiente
  const navigateLesson = (direction: 'prev' | 'next') => {
    if (!course || !activeLesson) return;
    const all = course.modules.flatMap((m) => m.lessons);
    const currIdx = all.findIndex((l) => l.id === activeLesson.id);
    if (direction === 'prev' && currIdx > 0) {
      setActiveLesson(all[currIdx - 1]);
    } else if (direction === 'next' && currIdx < all.length - 1) {
      const nextLesson = all[currIdx + 1];
      if (!lockedLessons.has(nextLesson.id)) {
        setActiveLesson(nextLesson);
      } else {
        alert('Debes aprobar la evaluación de módulo previa para continuar.');
      }
    }
  };
`;

const replaceTarget = /const navigateLesson = \(direction: 'prev' \| 'next'\) => \{[\s\S]*?setActiveLesson\(all\[currIdx \+ 1\]\);\s*\}\s*\};/;
content = content.replace(replaceTarget, lockLogic);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Fixed navigateLesson and lockedLessons');
