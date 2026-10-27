const fs = require('fs');
const file = 'D:\\My Apps\\Datagan Course\\metrics_data.json';
let content = fs.readFileSync(file, 'utf8');

const fixes = [
  { bad: /\ufffd0poca/g, good: 'Época' },
  { bad: /\ufffd\x1d/g, good: '→' },
  { bad: /\ufffd0\ufffd/g, good: '≥' },
  { bad: /\ufffd\ufffd\x19/g, good: '-' },
  { bad: /\ufffd\x14/g, good: '×' },
  { bad: /\ufffd\x1cptimo/g, good: 'Óptimo' },
  { bad: /\ufffd\x1cptima/g, good: 'Óptima' },
  { bad: /\ufffdaltima/g, good: 'Última' },
  { bad: /\ufffd\ufffda/g, good: '√' },
  { bad: /x\ufffd\x1e/g, good: 'x̄' },
  { bad: /\ufffd/g, good: '' } // Any remaining \ufffd should just be removed or replaced safely
];

let totalReplaced = 0;
for (const fix of fixes) {
   let matchCount = (content.match(fix.bad) || []).length;
   if (matchCount > 0) {
       console.log('Replacing', matchCount, 'occurrences of', fix.bad);
       totalReplaced += matchCount;
       content = content.replace(fix.bad, fix.good);
   }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced', totalReplaced, 'corrupted sequences in metrics_data.json');
