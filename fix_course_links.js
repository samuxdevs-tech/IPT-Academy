const fs = require('fs');

const fixLinks = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/href=\{\`\/courses\/\$\{([a-zA-Z0-9_.\-]+)\}\`\}/g, "href={`/course?id=${$1}`}");
  fs.writeFileSync(path, content, 'utf8');
};

fixLinks('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\dashboard\\page.tsx');
fixLinks('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx');

console.log('Fixed links to use query params!');
