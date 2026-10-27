const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('frontend/out/sandbox.html', 'utf8'));
const s = $('#simulator-engine-script').html();
try {
  new Function(s);
  console.log('Engine Script Syntax OK!');
} catch(e) {
  console.error('Syntax error:', e);
}
