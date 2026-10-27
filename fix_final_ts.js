const fs = require('fs');

// Fix page.tsx
let page = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');
page = page.replace(
  /modules: \[\{ id: 'm1', title: 'M1', lessons: \[\{\}, \{\}, \{\}\] as any \}\]/,
  "modules: [{ id: 'm1', title: 'M1', description: 'Desc', order: 1, lessons: [{}, {}, {}] as any }]"
);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', page, 'utf8');

// Fix course/page.tsx
let course = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', 'utf8');
course = course.replace(/<CourseViewerContent params=\{params\} \/>/, '<CourseViewerContent />');

// Convert slug to string unconditionally since we return null if not found
course = course.replace(/const slug = searchParams\.get\('id'\);/, "const slug = searchParams.get('id') || '';");
course = course.replace(/if \(\!slug\) return;/, "if (!slug) return;");

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', course, 'utf8');

console.log('Fixed TS errors in both files!');
