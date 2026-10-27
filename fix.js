const fs = require('fs');
const file = 'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
    [/M\u01f8tricas/g, 'Métricas'],
    [/m\u01f8tricas/g, 'métricas'],
    [/Zoot\u01f8cnicas/g, 'Zootécnicas'],
    [/zoot\u01f8cnicas/g, 'zootécnicas'],
    [/Agronmicas/g, 'Agronómicas'],
    [/leccin/g, 'lección'],
    [/frmulas/g, 'fórmulas'],
    [/PESTA'A/g, 'PESTAÑA'],
    [/DESCRIPCI"N/g, 'DESCRIPCIÓN'],
    [/ganadera/g, 'ganadería'],
    [/Matem\u01edtica/g, 'Matemática'],
    [/Matem\u01ed/g, 'Matemá'],
    [/\^'/g, '∑']
];

let replaced = 0;
for (const [regex, replacement] of replacements) {
    if (content.match(regex)) {
        replaced++;
    }
    content = content.replace(regex, replacement);
}

// Special case for those '' (which might actually be literal \ufffd in utf8)
content = content.replace(/\ufffd/g, ''); 
// But we actually need to be careful with \ufffd because it could just be the terminal. 
// I will just use replace with the exact string from powershell output if they exist.

// Re-write
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed', replaced, 'patterns in page.tsx');
