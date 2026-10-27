const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\sandbox_app.html', 'utf8');
const $ = cheerio.load(html);

// We need the sidebar and the header.
const sidebar = $('.sidebar').parent().html(); 
// Wait, in sandbox_app.html, .sidebar is inside an <aside>.
const aside = $('aside.sidebar').prop('outerHTML');
const header = $('header.header').prop('outerHTML');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\sandbox_aside.html', aside, 'utf8');
fs.writeFileSync('D:\\My Apps\\Datagan Course\\sandbox_header.html', header, 'utf8');

console.log("Extracted aside and header!");
