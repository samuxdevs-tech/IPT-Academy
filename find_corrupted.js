const fs = require('fs');
const files = [
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx',
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx',
  'C:\\Users\\Pc\\.gemini\\antigravity\\brain\\c4d4f3f4-9d69-455a-b6bf-6561dc1539ef\\implementation_plan_fase1.md'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const words = content.match(/\S*\ufffd\S*/g) || [];
  console.log(f, [...new Set(words)]);
});
