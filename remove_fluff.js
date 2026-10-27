const fs = require('fs');

// 1. Clean course/page.tsx
let coursePage = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', 'utf8');

const fluffRegex1 = /<span className="font-bold text-\[#c4710d\]">.*?<\/span>\s*<span>\s*•\s*<\/span>\s*<span>\s*\d+\.\d+\s+Estudiantes\s*<\/span>\s*<span>\s*•\s*<\/span>/g;
coursePage = coursePage.replace(fluffRegex1, '');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', coursePage, 'utf8');
console.log("course/page.tsx cleaned!");

// 2. Clean page.tsx
let dashboardPage = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

const fluffRegex2 = /<div className="flex items-center gap-1 font-semibold text-\[#c4710d\]">.*?<\/div>\s*<span className="text-\[#9194ac\]">.*?valoraciones.*?<\/span>/gs;
dashboardPage = dashboardPage.replace(fluffRegex2, '');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', dashboardPage, 'utf8');
console.log("page.tsx cleaned!");

