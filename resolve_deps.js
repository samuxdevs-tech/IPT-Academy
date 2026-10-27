const fs = require('fs');
const path = require('path');

const dir = 'D:/My Apps/Datagan Course/assets';

async function checkAndDownloadMissing() {
  let hasNew = true;
  while (hasNew) {
    hasNew = false;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    const referenced = new Set();

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const matches = content.match(/["'](\.\/[^"']+\.js)["']/g) || [];
      for (const m of matches) {
        const clean = m.replace(/["']/g, '').replace('./', '');
        referenced.add(clean);
      }
    }

    const missing = Array.from(referenced).filter(f => !fs.existsSync(path.join(dir, f)));
    if (missing.length > 0) {
      console.log(`Found ${missing.length} missing dependencies. Downloading...`);
      for (const m of missing) {
        try {
          const res = await fetch(`https://datagan360.com/assets/${m}`);
          if (res.ok) {
            const text = await res.text();
            fs.writeFileSync(path.join(dir, m), text, 'utf8');
            console.log(`✅ Downloaded recursive dep: ${m}`);
            hasNew = true;
          }
        } catch (e) {
          console.error(`Failed: ${m}`, e.message);
        }
      }
    }
  }
  console.log('All JS chunk dependencies resolved!');
}

checkAndDownloadMissing();
