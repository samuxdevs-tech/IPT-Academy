const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', 'utf8');
const $ = cheerio.load(html);

console.log("Buttons in header:", $('header button').map((i, el) => {
  return $(el).attr('class') || $(el).attr('id') || 'btn-' + i;
}).get());
console.log("Header html:", $('header').html().slice(0, 500));
