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

  // Manejador de navegación para botón Siguiente
  const navigateLesson = (dir: 'next' | 'prev') => {
    if (!course || !activeLesson) return;
    const all = course.modules.flatMap((m) => m.lessons);
    const idx = all.findIndex((l) => l.id === activeLesson.id);
    if (dir === 'next' && idx < all.length - 1) {
      const nextLesson = all[idx + 1];
      if (!lockedLessons.has(nextLesson.id)) {
        setActiveLesson(nextLesson);
      } else {
        alert('Debes aprobar la evaluación de módulo previa para continuar.');
      }
    }
    if (dir === 'prev' && idx > 0) setActiveLesson(all[idx - 1]);
  };
`;

const navigateReplaceTarget = /const navigateLesson = \(dir: 'next' \| 'prev'\) => \{[\s\S]*?setActiveLesson\(all\[idx - 1\]\);\s*\};/;
content = content.replace(navigateReplaceTarget, lockLogic);

// Now apply isLocked logic in the sidebar
content = content.replace(
  'const isDone = completedLessons.includes(lesson.id);',
  `const isDone = completedLessons.includes(lesson.id);
                          const isLocked = lockedLessons.has(lesson.id);`
);

content = content.replace(
  /onClick=\{\(\) => setActiveLesson\(lesson\)\}/g,
  `onClick={() => {
                                if (isLocked) {
                                  alert('Debes aprobar la evaluación previa para desbloquear esta lección.');
                                  return;
                                }
                                setActiveLesson(lesson);
                              }}`
);

content = content.replace(
  'isCurrent\n                                  ? \'bg-[#c0c4fc]/20 border-l-4 border-[#6d28d2]\'\n                                  : \'hover:bg-white\'\n                              }`}',
  `isCurrent\n                                  ? 'bg-[#c0c4fc]/20 border-l-4 border-[#6d28d2]'\n                                  : isLocked ? 'opacity-50 cursor-not-allowed bg-[#fdfdfd]' : 'hover:bg-white'\n                              }\`}`
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('page.tsx locked lessons logic updated');
