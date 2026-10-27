const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');
const index = content.search(/<div className="w-64 bg-\[#202230\]/);
console.log(content.substring(index, index + 2000));
