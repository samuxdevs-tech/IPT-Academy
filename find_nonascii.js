const fs = require('fs');
const files = [
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx',
  'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let nonAscii = [];
  for(let i=0; i<content.length; i++) {
     if(content.charCodeAt(i) > 127) {
        nonAscii.push({char: content[i], code: content.charCodeAt(i).toString(16)});
     }
  }
  // Print unique non-ascii characters
  const unique = Array.from(new Set(nonAscii.map(x => JSON.stringify(x))));
  console.log(f, unique);
});
