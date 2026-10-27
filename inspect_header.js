const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', 'utf8');
const $ = cheerio.load(html);

const header = $('header');
console.log("header classes:", header.attr('class'));
console.log("header style:", header.attr('style'));
console.log("header parent:", header.parent().prop('tagName'), header.parent().attr('class'));
