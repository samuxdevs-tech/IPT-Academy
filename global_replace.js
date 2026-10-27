const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.next', '.git'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (stat.isFile() && !file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.ico')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/datagan/i)) {
        content = content.replace(/Datagan/g, 'Datagan').replace(/datagan/g, 'datagan');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Replaced in', fullPath);
      }
    }
  }
}

replaceInDir('D:\\My Apps\\Datagan Course');
