const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', 'utf8');
const $ = cheerio.load(html);

const aside = $('aside.sidebar');
console.log("aside classes:", aside.attr('class'));
