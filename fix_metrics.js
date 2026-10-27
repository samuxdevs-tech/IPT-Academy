const fs = require('fs');
const file = 'D:\\My Apps\\Datagan Course\\metrics_data.json';
let content = fs.readFileSync(file, 'utf8');

const fixes = [
  { bad: /0poca/g, good: 'Época' },
  { bad: /\x1d/g, good: '→' },
  { bad: /0/g, good: '≥' },
  { bad: /\x19/g, good: '-' },
  { bad: /\x14/g, good: '×' },
  { bad: /\x1cptimo/g, good: 'Óptimo' },
  { bad: /\x1cptima/g, good: 'Óptima' },
  { bad: /altima/g, good: 'Última' },
  { bad: /a/g, good: '√' },
  { bad: /x\x1e/g, good: 'x̄' },
  { bad: /\(0/g, good: '(≥' }, // just in case
  { bad: /0/g, good: '≥' }
];

let totalReplaced = 0;
for (const fix of fixes) {
   let matchCount = (content.match(fix.bad) || []).length;
   totalReplaced += matchCount;
   content = content.replace(fix.bad, fix.good);
}

// Write it back
fs.writeFileSync(file, content, 'utf8');
console.log('Replaced', totalReplaced, 'corrupted sequences in metrics_data.json');
