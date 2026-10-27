const fs = require('fs');

const bannerHtml = `
<!-- PERSISTENT SANDBOX BANNER -->
<div style="position: fixed; top: 0; left: 0; right: 0; height: 42px; background: #1e40af; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; z-index: 999999; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">Entorno Simulado</span>
    <span style="font-weight: 500;">Estás en el simulador de práctica. Cualquier cambio o registro no afectará tus datos reales en TecnoGan.</span>
  </div>
  <a href="/course?id=datagan-master-pro" style="background: white; color: #1e40af; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
    Volver a Datagan Course &rarr;
  </a>
</div>
<style>
  body {
    padding-top: 42px !important;
    box-sizing: border-box !important;
  }
  /* Adjust fixed header if needed */
  header.header, .sidebar {
    top: 42px !important;
    height: calc(100vh - 42px) !important;
  }
</style>
`;

function injectBanner(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove previously injected banner if any
  content = content.replace(/<!-- PERSISTENT SANDBOX BANNER -->[\s\S]*?<\/style>/, '');
  // Insert at top of body
  content = content.replace('<body', bannerHtml + '<body');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Banner injected into:", filePath);
}

injectBanner('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html');
injectBanner('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox\\nacimientos.html');
injectBanner('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html');
injectBanner('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan-nacimientos.html');
