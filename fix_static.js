const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

content = content.replace(/export function generateStaticParams\(\) \{\s*return \[\s*\{ slug: 'curso-manejo-holistico' \},\s*\{ slug: 'curso-genetica-bovina' \}\s*\];\s*\}/, '');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Removed generateStaticParams from page.tsx');
