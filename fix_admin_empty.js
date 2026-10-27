const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

// 1. Add isLoading state
content = content.replace(
  "const [courses, setCourses] = useState<Course[]>([]);",
  "const [courses, setCourses] = useState<Course[]>([]);\n  const [isLoading, setIsLoading] = useState(true);"
);

// 2. Update the fetch logic to turn off isLoading
content = content.replace(
  /get\(ref\(db, 'courses'\)\)[\s\S]*?\.catch\(\(e\) => console\.error\(e\)\);/,
  `get(ref(db, 'courses'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const coursesArray = Object.keys(data).map(key => data[key]);
          setCourses(coursesArray);
          if (coursesArray.length > 0) setSelectedCourse(coursesArray[0]);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));`
);

// 3. Update the render blocking logic
const emptyStateLogic = `
  const createInitialCourse = () => {
    const newCourse: Course = {
      slug: 'datagan-master-pro',
      title: 'Datagan Master Pro (Demo)',
      subtitle: 'Aprende a usar la plataforma',
      description: 'Curso inicial creado automáticamente.',
      thumbnail: 'https://via.placeholder.com/600x400',
      instructor: { name: 'Admin', role: 'Instructor', avatar: '' },
      category: 'Software',
      level: 'Básico',
      rating: 5.0,
      ratingsCount: 1,
      published: false,
      modules: [
        {
          id: 'mod-1',
          title: 'Módulo 1',
          description: '',
          order: 1,
          lessons: []
        }
      ]
    };
    setSelectedCourse(newCourse);
    setCourses([newCourse]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202230] text-white flex items-center justify-center">
        <p className="text-sm text-[#b7b9cd]">Cargando Admin Studio...</p>
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-[#d1d2e0] p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#2a2b3f]">Ningún curso encontrado</h2>
          <p className="text-[#595c73]">La base de datos está vacía. Debes crear un curso para empezar.</p>
          <button 
            onClick={createInitialCourse}
            className="w-full py-3 bg-[#6d28d2] text-white font-bold rounded-xl"
          >
            Crear Curso Inicial
          </button>
        </div>
      </div>
    );
  }
`;

content = content.replace(
  /if \(!selectedCourse\) \{[\s\S]*?Cargando Admin Studio\.\.\.<\/p>\s*<\/div>\s*\);\s*\}/,
  emptyStateLogic.trim()
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', content, 'utf8');
console.log("admin/page.tsx fixed for empty states!");
