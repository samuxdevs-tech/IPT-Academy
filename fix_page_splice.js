const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

const lines = content.split('\n');

// Find the line with '} else {' or ')}' before the duplicated span
let dropStart = -1;
let dropEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(')}')) {
    // Check if the next few lines have the duplicate span
    if (lines[i+2] && lines[i+2].includes('valoraciones)</span>')) {
      dropStart = i + 1; // start dropping from the blank line
      dropEnd = i + 3;   // drop the span and the closing div
      break;
    }
  }
}

if (dropStart !== -1) {
  lines.splice(dropStart, dropEnd - dropStart + 1);
  fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', lines.join('\n'), 'utf8');
  console.log('Fixed lines!');
} else {
  console.log('Could not find lines to drop');
}
