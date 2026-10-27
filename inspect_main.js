const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html'));
console.log("Main tag exists:", $('main').length);
console.log("Main classes:", $('main').attr('class'));
console.log("Main children count:", $('main').children().length);
console.log("Main children tags:", $('main').children().map((i, el) => el.tagName).get().join(', '));
