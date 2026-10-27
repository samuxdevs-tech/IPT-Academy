const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

// Insert a banner to link to the new Phase 2 scenarios
const bannerInject = `
      {/* Catálogo de Cursos estilo Datagan Grid */}
      <main className="max-w-[1240px] mx-auto px-6 py-12">
        {/* Banner Fase 2 */}
        <div className="mb-10 bg-gradient-to-r from-[#6d28d2] to-[#4c1d95] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl">
          <div className="space-y-2 mb-6 md:mb-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              NUEVO - FASE 2
            </div>
            <h2 className="text-2xl font-bold">Práctica de Reflejo Operativo</h2>
            <p className="text-[#c0c4fc] max-w-xl text-sm leading-relaxed">
              Entrena tu memoria muscular. Identifica en qué módulo de la app real debes hacer clic según el requerimiento en el campo. Modalidad de simulación visual.
            </p>
          </div>
          <Link
            href="/scenarios"
            className="w-full md:w-auto px-8 py-3.5 bg-white text-[#6d28d2] font-bold rounded-xl hover:bg-[#f6f7f9] hover:scale-105 transition-all text-center shadow-lg"
          >
            Iniciar Simulación
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
`;

content = content.replace(`      {/* Catálogo de Cursos estilo Datagan Grid */}
      <main className="max-w-[1240px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">`, bannerInject);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', content, 'utf8');
console.log('Injected Phase 2 banner into home page!');
