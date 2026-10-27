const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const regex = /<span className=\"font-mono bg-\[#202230\] text-white px-2 py-0\.5 rounded-md\">/;
const index = content.search(regex);
console.log(content.substring(index, index + 3000));
