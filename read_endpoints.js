const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');
const hbIndex = content.indexOf("app.post('/api/progress/heartbeat',");
console.log(content.substring(hbIndex, hbIndex + 2000));
