const fs = require('fs');

const raw = fs.readFileSync('C:/Users/Pc/.gemini/antigravity/brain/c4d4f3f4-9d69-455a-b6bf-6561dc1539ef/.system_generated/steps/124/output.txt', 'utf8');

// The file format is:
// Script ran on page and returned:
// ```json
// "<!DOCTYPE html>..."
// ```

const jsonStart = raw.indexOf('```json\n');
const jsonEnd = raw.lastIndexOf('\n```');

if (jsonStart !== -1 && jsonEnd !== -1) {
  const jsonStr = raw.substring(jsonStart + 8, jsonEnd).trim();
  try {
    const html = JSON.parse(jsonStr);
    fs.writeFileSync('D:/My Apps/Datagan Course/datagan_dashboard_raw.html', html, 'utf8');
    console.log('Successfully saved datagan_dashboard_raw.html, size:', html.length);
  } catch (err) {
    console.error('Parse error:', err.message);
  }
} else {
  console.log('Markers not found');
}
