const fs = require('fs');

let html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', 'utf8');

// We will inject a script right before </body> to intercept clicks.
const script = `
<script>
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (a) {
      e.preventDefault();
      const href = a.getAttribute('href');
      console.log('Intercepted link click:', href);
      
      // Notify parent window (Next.js)
      window.parent.postMessage({ type: 'NAVIGATE', href: href }, '*');
    }
  });
</script>
</body>
`;

html = html.replace('</body>', script);
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', html, 'utf8');
console.log("Script injected into tecnogan.html!");
