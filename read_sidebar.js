const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const index = content.indexOf('mod.lessons.map((lesson, lIdx) => {');
console.log(content.substring(index, index + 2000));
