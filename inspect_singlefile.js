const fs = require('fs');

const files = fs.readdirSync('d:/descargas').filter(f => f.includes('TecnoGan') && f.endsWith('.html'));
const target = 'd:/descargas/' + files[files.length - 1];
const html = fs.readFileSync(target, 'utf8');

console.log('Total characters:', html.length);
console.log('Style tags count:', (html.match(/<style/g) || []).length);
console.log('Script tags count:', (html.match(/<script/g) || []).length);
console.log('Has app container:', html.includes('id="app"') || html.includes('id=app'));
console.log('Has data-v attributes:', html.includes('data-v-'));

// Ver qué scripts tiene incrustados
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Found scripts:', scriptMatches.length);
scriptMatches.forEach((s, idx) => {
  console.log(`Script ${idx + 1} length: ${s.length}, snippet: ${s.substring(0, 150)}...`);
});
