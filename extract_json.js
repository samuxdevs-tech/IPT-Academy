const fs = require('fs');

const seedContent = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\seed.js', 'utf8');

// Use regex to extract the masterCourse object
const match = seedContent.match(/const masterCourse = (\{[\s\S]*?\});\s*await Course\.findOneAndUpdate/);
if (match) {
  const masterCourseString = match[1];
  
  // Clean up object string to valid JSON using a safe eval
  const masterCourseObject = eval('(' + masterCourseString + ')');
  
  fs.writeFileSync('D:\\My Apps\\Datagan Course\\curso-datagan-completo.json', JSON.stringify(masterCourseObject, null, 2), 'utf8');
  console.log("curso-datagan-completo.json created successfully!");
} else {
  console.log("Could not find masterCourse in seed.js");
}
