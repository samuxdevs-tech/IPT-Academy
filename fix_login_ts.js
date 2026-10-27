const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\login\\page.tsx', 'utf8');

content = content.replace(/\.then\(\(id\) => window\.grecaptcha\.reset\(id\)\)/, `.then((id: any) => window.grecaptcha.reset(id))`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\login\\page.tsx', content, 'utf8');
console.log('Fixed login page TS error!');
