const fs = require('fs');
const file = 'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let start = lines.findIndex(l => l.includes("activeTab === 'metrics'"));
if (start !== -1) {
    for (let i = start; i < start + 50; i++) {
        let line = lines[i];
        if (line.includes('tricas') || line.includes('cnicas') || line.includes('micas')) {
           let hex = '';
           for(let j=0; j<line.length; j++) hex += line.charCodeAt(j).toString(16) + ' ';
           console.log(line.trim());
           console.log(hex);
        }
    }
}
