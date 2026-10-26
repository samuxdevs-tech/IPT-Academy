const fs = require('fs');
const path = require('path');

function normalizeOut(outDir) {
  if (!fs.existsSync(outDir)) return;

  // 1. Asegurar index.html en cada subcarpeta para evitar colisiones de trailingSlash de Firebase
  const topFiles = fs.readdirSync(outDir);
  for (const file of topFiles) {
    if (file.endsWith('.html') && file !== 'index.html' && file !== '404.html' && file !== '_not-found.html') {
      const routeName = file.replace(/\.html$/, '');
      const routeDir = path.join(outDir, routeName);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      const targetIndex = path.join(routeDir, 'index.html');
      fs.copyFileSync(path.join(outDir, file), targetIndex);
    }
  }

  // 2. Normalizar endpoints RSC de Turbopack en todas las ubicaciones posibles
  function walkAndFix(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('__next.')) {
          const pageTxt = path.join(fullPath, '__PAGE__.txt');
          if (fs.existsSync(pageTxt)) {
            fs.copyFileSync(pageTxt, path.join(dir, `${entry.name}.__PAGE__.txt`));
            fs.copyFileSync(pageTxt, path.join(dir, '__PAGE__.txt'));
            fs.copyFileSync(pageTxt, path.join(outDir, `${entry.name}.__PAGE__.txt`));
            fs.copyFileSync(pageTxt, path.join(outDir, `${entry.name}.txt`));
          }
        }
        walkAndFix(fullPath);
      }
    }
  }

  walkAndFix(outDir);
  console.log('[fix-rsc] Rutas estáticas y endpoints RSC de Turbopack 100% normalizados en ' + outDir);
}

const outDir = path.join(__dirname, '..', 'out');
normalizeOut(outDir);
