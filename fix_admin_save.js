const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

const fixOld = /const createInitialCourse = \(\) => \{[\s\S]*?setSelectedCourse\(newCourse\);\s*setCourses\(\[newCourse\]\);\s*\};/;
const fixNew = `
  const createInitialCourse = async () => {
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
    try {
      await set(ref(db, \`courses/\${newCourse.slug}\`), newCourse);
    } catch (e) {
      console.error(e);
    }
  };
`;

content = content.replace(fixOld, fixNew.trim());
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', content, 'utf8');
console.log("admin/page.tsx auto-save fixed!");
