const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\dashboard\\page.tsx', 'utf8');

// The file contains literally `\` followed by `\``
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\dashboard\\page.tsx', content, 'utf8');
console.log('Fixed backslashes');
