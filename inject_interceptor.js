const fs = require('fs');

const interceptorScript = `
<!-- GLOBAL LINK INTERCEPTOR FOR SANDBOX -->
<script>
  document.addEventListener('click', function(e) {
    // Check if the click is on or inside an anchor tag
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Allow the return banner button to go to datagan-course.web.app
    if (href.includes('datagan-course.web.app')) {
      return;
    }

    // Intercept internal sandbox links
    if (href.includes('salud/nacimiento') || href === '/sandbox/nacimientos') {
      e.preventDefault();
      window.location.href = '/sandbox/nacimientos';
      return;
    }

    if (href.includes('dashboard') || href === '/sandbox') {
      e.preventDefault();
      window.location.href = '/sandbox';
      return;
    }

    // Block any external navigation to datagan360 or unhandled routes
    if (href.startsWith('http') || href.startsWith('/')) {
      e.preventDefault();
      alert('⚠️ Módulo restringido: Estás en un entorno de práctica (Sandbox). Solo los módulos asignados a tu misión están habilitados.');
    }
  }, true); // Use capture phase so nothing bypasses this!
</script>
`;

function injectInterceptor(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove any old interceptor
  content = content.replace(/<!-- GLOBAL LINK INTERCEPTOR FOR SANDBOX -->[\s\S]*?<\/script>/g, '');
  // Append right before </body> or at the very end
  if (content.includes('</body>')) {
    content = content.replace('</body>', interceptorScript + '</body>');
  } else {
    content += interceptorScript;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Injected robust interceptor into:", filePath);
}

const files = [
  'D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html',
  'D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox\\nacimientos.html',
  'D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html',
  'D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan-nacimientos.html',
  'D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox.html',
  'D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox\\nacimientos.html',
  'D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan.html',
  'D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan-nacimientos.html',
];

files.forEach(injectInterceptor);
