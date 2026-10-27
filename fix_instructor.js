const fs = require('fs');
let page = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');
page = page.replace(
  /instructor: 'Prof',/,
  "instructor: { name: 'Prof', role: 'Role', avatar: 'avt' },"
);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', page, 'utf8');
console.log('Fixed instructor object!');
