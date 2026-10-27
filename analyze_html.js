const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\tecnogan.html', 'utf8');
const $ = cheerio.load(html);

console.log("== HEAD ==");
console.log($('head').html().substring(0, 500));

console.log("\n== BODY CLASSES ==");
console.log($('body').attr('class'));

console.log("\n== APP ROOT ==");
const app = $('#app');
console.log(app.children().length, "children in #app");

app.children().each((i, el) => {
  console.log(`Child ${i}: <${el.tagName}> id="${$(el).attr('id')}" class="${$(el).attr('class')}"`);
});

// Let's find common layout elements like 'sidebar', 'nav', 'header'
console.log("\n== SEARCHING FOR LAYOUT ELEMENTS ==");
const sidebars = $('.sidebar, [class*="sidebar"], nav, aside');
console.log("Sidebars found:", sidebars.length);
if (sidebars.length > 0) {
  console.log("First sidebar class:", sidebars.first().attr('class'));
}

const mains = $('main, [class*="main-content"]');
console.log("Mains found:", mains.length);
if (mains.length > 0) {
  console.log("First main class:", mains.first().attr('class'));
}
