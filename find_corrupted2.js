const fs = require('fs');
const files = [
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx',
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let words = [];
  const parts = content.split(/[\s,();\"\'\`<>]+/);
  for (const part of parts) {
      if (part.includes('\ufffd')) {
          words.push(part);
      }
  }
  console.log(f, [...new Set(words)]);
});
