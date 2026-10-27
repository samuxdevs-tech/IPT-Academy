const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', 'utf8');
const $ = cheerio.load(html);

const flexDiv = $('#app > div.flex');
console.log("flexDiv classes:", flexDiv.attr('class'));
console.log("flexDiv children:", flexDiv.children().map((i, el) => {
  return el.tagName + (el.attribs.id ? '#' + el.attribs.id : '') + (el.attribs.class ? '.' + el.attribs.class.split(' ').join('.') : '');
}).get());
