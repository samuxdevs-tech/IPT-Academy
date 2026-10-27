const html = require('fs').readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', 'utf8');
const m = html.match(/<aside[^>]+class=["']([^"']+)["']/);
console.log("Aside classes:", m ? m[1] : 'not found');
