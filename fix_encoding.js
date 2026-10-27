const fs = require('fs');

function fixUtf8(str) {
  if (typeof str !== 'string') return str;
  try {
    // Convierte bytes interpretados erróneamente como Latin1 de vuelta a UTF-8 real
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch (e) {
    return str;
  }
}

function cleanObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  } else if (obj !== null && typeof obj === 'object') {
    const res = {};
    for (const key of Object.keys(obj)) {
      res[key] = cleanObject(obj[key]);
    }
    return res;
  } else if (typeof obj === 'string') {
    // Si contiene patrones típicos de doble encoding como 'Ã' o '\x8D'
    if (obj.includes('Ã') || /[\xC0-\xDF][\x80-\xBF]/.test(obj)) {
      return fixUtf8(obj);
    }
    return obj;
  }
  return obj;
}

const filePath = 'D:/My Apps/Datagan Course/metrics_data.json';
const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cleaned = cleanObject(raw);

fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');

console.log('Sample labels fixed:');
const keys = Object.keys(cleaned.metrics);
keys.slice(0, 10).forEach(k => {
  console.log(`${k} -> ${cleaned.metrics[k].label}`);
});
