const fs = require('fs');

let page = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');
page = page.replace(
  /ratingsCount: 128,/,
  "ratingsCount: 128,\n        subtitle: 'Sub',\n        instructor: 'Prof',\n        published: true,"
);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', page, 'utf8');

console.log('Fixed final TS missing props!');
