const fs = require('fs');
const cheerio = require('cheerio');

console.log("Reading raw tecnogan.html...");
// We use the original clean capture or public/tecnogan.html
const rawHtml = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', 'utf8');
const $ = cheerio.load(rawHtml);

// 1. Ensure the persistent blue banner is present
// Remove any existing banners or interceptors to avoid duplication
$('body > div:contains("PERSISTENT SANDBOX BANNER")').remove();
$('body > div:contains("Entorno Simulado")').remove();
$('script:contains("GLOBAL LINK INTERCEPTOR")').remove();

// 2. Prepare the <main> tag for multi-view routing
const main = $('main').first();
if (main.length === 0) {
  console.error("Could not find <main> tag!");
  process.exit(1);
}

// Get the original dashboard contents (children of main)
const originalDashboardHtml = main.html();

// Wrap the original dashboard in a dedicated container and add the module workspace container
main.html(`
  <div id="dashboard-view" class="w-full transition-opacity duration-200">
    ${originalDashboardHtml}
  </div>
  <div id="module-workspace" class="w-full hidden transition-opacity duration-200">
    <!-- Dynamic Module Content Injected by Simulator Engine -->
  </div>
`);

console.log("Main structure updated with #dashboard-view and #module-workspace.");
