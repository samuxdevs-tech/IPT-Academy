const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');
const index = content.indexOf("app.post('/api/progress/quiz-verify',");
console.log(content.substring(index, index + 2000));
