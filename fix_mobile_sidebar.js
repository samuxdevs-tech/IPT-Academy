const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

// 1. Add state for mobile sidebar
const stateInsert = `
  const [seekCommand, setSeekCommand] = useState<number | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
`;
content = content.replace('const [seekCommand, setSeekCommand] = useState<number | undefined>(undefined);', stateInsert);

// 2. Add hamburger button in Top Navbar
const hamburgerBtn = `
          {/* Navigation Tabs estilo Datagan (Imágenes 2, 3 y 4) */}
          <div className="flex-1 flex justify-center hidden md:flex">
`;
content = content.replace('{/* Navigation Tabs estilo Datagan', `
          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] rounded-md transition-colors"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <div className="space-y-1.5">
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
            </div>
          </button>
          {/* Navigation Tabs estilo Datagan`);

// 3. Fix the sidebar wrapper to be absolute/fixed on mobile when open
const sidebarRegex = /<div className=\"w-80 bg-white border-l border-\[\#e9eaf2\] flex flex-col hidden lg:flex\">/;
const newSidebar = `
        {/* Overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Right Sidebar: Accordion Curriculum estilo Datagan */}
        <div className={\`w-80 bg-white border-l border-[#e9eaf2] flex-col fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex \${isMobileSidebarOpen ? 'translate-x-0 flex' : 'translate-x-full hidden'}\`}>
          <div className="flex justify-between items-center p-4 border-b border-[#e9eaf2] lg:hidden">
            <span className="font-extrabold text-[#2a2b3f]">Contenido del Curso</span>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 rounded-md text-[#595c73] hover:bg-[#f6f7f9]">
              <X className="w-5 h-5" />
            </button>
          </div>
`;
content = content.replace(sidebarRegex, newSidebar);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('Mobile sidebar fixed!');
