const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\scenarios\\page.tsx', 'utf8');

// Add context to the interface
content = content.replace(
  /question: string;/,
  "context: string;\n  question: string;"
);

// Add context to mockScenarios[0]
content = content.replace(
  /question: '¿Qué módulo abres para registrar el nacimiento de un nuevo ternero\?',/,
  "context: 'El capataz te informa por radio que la vaca #104 acaba de parir un ternero macho en el lote 3.',\n    question: '¿Qué módulo abres para registrar el nacimiento de este nuevo ternero?',"
);

// Add context to mockScenarios[1]
content = content.replace(
  /question: 'Estás viendo la ficha de un animal. ¿Dónde haces clic para registrar su pesaje mensual\?',/,
  "context: 'Estás en la báscula y el animal #890 acaba de ser pesado marcando 350kg.',\n    question: 'Estás viendo la ficha del animal. ¿Dónde haces clic para registrar su pesaje mensual?',"
);

// Render context in the UI
content = content.replace(
  /<h2 className="text-xl font-bold text-\[\#2a2b3f\] mb-6 leading-snug">/,
  `<div className="mb-6">
            <p className="text-sm font-semibold text-[#6d28d2] uppercase tracking-wider mb-2">Situación en Campo</p>
            <p className="text-[#595c73] leading-relaxed mb-4">{currentScenario.context}</p>
            <h2 className="text-xl font-bold text-[#2a2b3f] leading-snug">`
);
content = content.replace(
  /\{currentScenario\.question\}\n\s*<\/h2>/,
  `{currentScenario.question}
            </h2>
          </div>`
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\scenarios\\page.tsx', content, 'utf8');
console.log('Added context to scenarios!');
