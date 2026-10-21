const fs = require('fs');
const path = require('path');

function walkAndFix(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('__next.')) {
        const pageTxt = path.join(fullPath, '__PAGE__.txt');
        if (fs.existsSync(pageTxt)) {
          const targetFile = path.join(dir, `${entry.name}.__PAGE__.txt`);
          fs.copyFileSync(pageTxt, targetFile);
        }
      }
      walkAndFix(fullPath);
    }
  }
}

const outDir = path.join(__dirname, '..', 'out');
if (fs.existsSync(outDir)) {
  walkAndFix(outDir);
  console.log('[fix-rsc] Turbopack static RSC endpoints normalized in ' + outDir);
}
