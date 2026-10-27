const fs = require('fs');
const path = require('path');

// 1. Remove the Next.js sandbox route completely
const appSandboxDir = 'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox';
if (fs.existsSync(appSandboxDir)) {
  fs.rmSync(appSandboxDir, { recursive: true, force: true });
  console.log("Deleted app/sandbox directory!");
}

// 2. Ensure public/sandbox.html exists (copy of tecnogan.html)
fs.copyFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', 'D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html');
console.log("Copied tecnogan.html to public/sandbox.html");

// 3. Ensure public/sandbox/nacimientos.html exists
const publicSandboxDir = 'D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox';
if (!fs.existsSync(publicSandboxDir)) {
  fs.mkdirSync(publicSandboxDir, { recursive: true });
}
fs.copyFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan-nacimientos.html', path.join(publicSandboxDir, 'nacimientos.html'));
console.log("Copied tecnogan-nacimientos.html to public/sandbox/nacimientos.html");
