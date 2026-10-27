const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

const regex = /<div className=\"w-64/;
const index = content.search(regex);
console.log(content.substring(index, index + 2000));
