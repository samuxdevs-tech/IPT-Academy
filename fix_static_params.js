const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const staticParamsInsert = `export function generateStaticParams() {
  return [
    { slug: 'curso-manejo-holistico' },
    { slug: 'curso-genetica-bovina' }
  ];
}

export default function CourseViewerPage`;

content = content.replace('export default function CourseViewerPage', staticParamsInsert);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Added generateStaticParams to courses/[slug]/page.tsx');
