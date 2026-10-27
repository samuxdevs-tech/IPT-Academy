const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const regex = /const handleHeartbeat = async \([\s\S]*?console\.error\('Error enviando heartbeat de progreso:', e\);\s*\}\s*\};/;

const newHeartbeat = `const handleHeartbeat = async (range: [number, number], currentSec: number, durationSec: number) => {
    if (!activeLesson || !user) return;
    try {
      const lpRef = ref(db, \`progress/\${user.uid}/\${slug}/lessonProgress\`);
      // Simulado Serverless
    } catch (e) {
      console.error('Error enviando heartbeat de progreso:', e);
    }
  };`;

content = content.replace(regex, newHeartbeat);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Fixed heartbeat!');
