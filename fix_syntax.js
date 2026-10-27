const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

// Fix handleCheckpointAttempt double catch
content = content.replace(/\} catch \(e\) \{\s*console\.error\('Error enviando intento de checkpoint', e\);\s*\}\s*\} catch \(e\) \{\s*console\.error\('Error enviando intento de checkpoint', e\);\s*\}/, `} catch (e) {
      console.error('Error enviando intento de checkpoint', e);
    }`);

// Fix handleHeartbeat
content = content.replace(/const handleHeartbeat = async \([\s\S]*?if \(data\.completedLessons\) setCompletedLessons\(data\.completedLessons\);\s*\}/, `const handleHeartbeat = async (range: [number, number], currentSec: number, durationSec: number) => {
    if (!activeLesson || !user) return;
    try {
      const lpRef = ref(db, \`progress/\${user.uid}/\${slug}/lessonProgress\`);
      // Update logic would go here
    } catch (err) {
      console.error('Heartbeat error', err);
    }`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Fixed page.tsx syntax errors!');
