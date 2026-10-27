const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

// Insert a banner for Phase 3 Sandbox
const bannerInject = `
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Banner Fase 2 */}
          <div className="bg-gradient-to-br from-[#6d28d2] to-[#4c1d95] rounded-2xl p-8 flex flex-col justify-between text-white shadow-xl h-full">
            <div className="space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider w-fit">
                FASE 2
              </div>
              <h2 className="text-2xl font-bold">Reflejo Operativo</h2>
              <p className="text-[#c0c4fc] text-sm leading-relaxed">
                Entrena tu memoria muscular. Identifica visualmente dónde hacer clic según el requerimiento.
              </p>
            </div>
            <Link
              href="/scenarios"
              className="w-full px-8 py-3 bg-white text-[#6d28d2] font-bold rounded-xl hover:bg-[#f6f7f9] transition-all text-center shadow-lg"
            >
              Iniciar Simulación
            </Link>
          </div>

          {/* Banner Fase 3 */}
          <div className="bg-white rounded-2xl p-8 flex flex-col justify-between border border-[#d1d2e0] shadow-xl h-full">
            <div className="space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] text-xs font-bold uppercase tracking-wider w-fit">
                NUEVO - FASE 3
              </div>
              <h2 className="text-2xl font-bold text-[#2a2b3f]">Sandbox (Entorno de Pruebas)</h2>
              <p className="text-[#595c73] text-sm leading-relaxed">
                Interactúa con un clon exacto de DataGan 360 poblado con datos ficticios. Opera sin miedo a dañar información real.
              </p>
            </div>
            <Link
              href="/sandbox"
              className="w-full px-8 py-3 bg-[#2a2b3f] text-white font-bold rounded-xl hover:bg-black transition-all text-center shadow-lg"
            >
              Entrar a la Finca Ficticia
            </Link>
          </div>
        </div>
`;

content = content.replace(/<div className="mb-10 bg-gradient-to-r from-\[\#6d28d2\] to-\[\#4c1d95\] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl">[\s\S]*?<\/div>\s*<div className="flex items-center justify-between mb-8">/, `${bannerInject}\n\n        <div className="flex items-center justify-between mb-8">`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', content, 'utf8');
console.log('Injected Phase 3 Sandbox banner into home page!');
