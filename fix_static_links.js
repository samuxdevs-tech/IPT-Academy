const fs = require('fs');

function fixLinks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace links to datagan360 dashboard with /sandbox
  content = content.replace(/href="https:\/\/www\.datagan360\.com\/dashboard"/g, 'href="/sandbox"');
  
  // Replace links to datagan360 nacimientos with /sandbox/nacimientos
  content = content.replace(/href="https:\/\/www\.datagan360\.com\/salud\/nacimiento"/g, 'href="/sandbox/nacimientos"');
  
  // Strip any interceptor scripts that block default clicks
  content = content.replace(/<script>[\s\S]*?postMessage[\s\S]*?<\/script>/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

fixLinks('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html');
fixLinks('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox\\nacimientos.html');
console.log("Fixed navigation links in static files!");
