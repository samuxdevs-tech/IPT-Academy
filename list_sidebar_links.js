const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html'));
$('aside a').each((i, el) => {
  console.log($(el).text().replace(/\s+/g, ' ').trim(), '-->', $(el).attr('href'));
});
