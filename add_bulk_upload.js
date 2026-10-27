const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

// 1. Add fileInputBulkRef
const stateBlockOld = "  const fileInputRef = useRef<HTMLInputElement>(null);";
const stateBlockNew = "  const fileInputRef = useRef<HTMLInputElement>(null);\n  const fileInputBulkRef = useRef<HTMLInputElement>(null);";
content = content.replace(stateBlockOld, stateBlockNew);

// 2. Add handleBulkUpload function
const handleSaveCourseRegex = /(const handleSaveCourse = async \(\) => \{[\s\S]*?finally \{\s*setIsSaving\(false\);\s*\}\s*\};)/;

const bulkUploadFunc = `
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        if (!json.slug || !json.title || !json.modules) {
          alert('El archivo JSON no tiene la estructura de un Curso válida.');
          return;
        }

        setIsLoading(true);
        await set(ref(db, \`courses/\${json.slug}\`), json);
        setCourses(prev => [...prev.filter(c => c.slug !== json.slug), json]);
        setSelectedCourse(json);
        alert('Carga masiva completada con éxito.');
      } catch (err) {
        console.error(err);
        alert('Error al leer o guardar el JSON.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    if (fileInputBulkRef.current) {
      fileInputBulkRef.current.value = '';
    }
  };
`;
content = content.replace(handleSaveCourseRegex, `$1\n\n${bulkUploadFunc}`);

// 3. Add button in Empty State
const emptyStateRegex = /(<button\s*onClick=\{createInitialCourse\}[\s\S]*?<\/button>)/;
const bulkButtonEmpty = `
          $1
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#d1d2e0]" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-[#9194ac]">O también</span></div>
          </div>
          <button 
            onClick={() => fileInputBulkRef.current?.click()}
            className="w-full py-3 bg-white border-2 border-[#d1d2e0] text-[#595c73] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#f6f7f9] transition-all"
          >
            <Upload className="w-4 h-4" />
            Carga Masiva (JSON)
          </button>
`;
content = content.replace(emptyStateRegex, bulkButtonEmpty);

// 4. Add button in Header when Course exists
const headerRegex = /(<div className="flex items-center gap-3">)/;
const bulkButtonHeader = `
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputBulkRef}
            onChange={handleBulkUpload}
          />
          <button
            onClick={() => fileInputBulkRef.current?.click()}
            className="px-3.5 py-2 rounded-lg border border-[#d1d2e0] text-[#595c73] hover:text-[#6d28d2] text-xs font-semibold flex items-center gap-1.5 transition-all bg-white mr-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar JSON</span>
          </button>
`;
content = content.replace(headerRegex, bulkButtonHeader.trim());

// We must ensure the hidden input is also in the Empty State so it triggers correctly. Wait, it is in the Header, but the Header is NOT rendered when in Empty State!
// Let's inject the hidden input globally into the main div.
// Wait, empty state returns its own div tree. Let's add the input inside the empty state too.
const emptyStateContainer = /(<div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-\[#d1d2e0\] p-8 text-center space-y-4">)/;
const inputForEmptyState = `
        $1
        <input 
          type="file" 
          accept=".json" 
          className="hidden" 
          ref={fileInputBulkRef}
          onChange={handleBulkUpload}
        />
`;
content = content.replace(emptyStateContainer, inputForEmptyState.trim());


fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', content, 'utf8');
console.log("admin/page.tsx updated with Bulk Upload!");
