const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\tecnogan.html', 'utf8');
const $ = cheerio.load(html);

// Find styles
let styles = '';
$('style').each((i, el) => {
  styles += $(el).html() + '\n';
});
fs.writeFileSync('D:\\My Apps\\Datagan Course\\sandbox_styles.css', styles, 'utf8');

// Get Sidebar
const sidebarHtml = $('.sidebar').parent().html(); 
// Wait, the sidebar itself is .sidebar. But let's just get the outer container layout
const appHtml = $('#app > div').html();

fs.writeFileSync('D:\\My Apps\\Datagan Course\\sandbox_app.html', appHtml, 'utf8');

console.log("Extracted sandbox_styles.css and sandbox_app.html");
