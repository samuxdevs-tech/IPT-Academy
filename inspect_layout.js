const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', 'utf8');
const $ = cheerio.load(html);

console.log("Body children:", $('body').children().map((i, el) => {
  return el.tagName + (el.attribs.id ? '#' + el.attribs.id : '') + (el.attribs.class ? '.' + el.attribs.class.split(' ')[0] : '');
}).get());

const app = $('#app');
console.log("#app exists:", app.length);
if (app.length) {
  console.log("#app class:", app.attr('class'));
  console.log("#app children:", app.children().map((i, el) => {
    return el.tagName + (el.attribs.id ? '#' + el.attribs.id : '') + (el.attribs.class ? '.' + el.attribs.class.split(' ')[0] : '');
  }).get());
}
