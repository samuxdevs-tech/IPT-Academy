const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

// 1. Add firebase imports
if (!content.includes("import { db } from '@/lib/firebase'")) {
  content = content.replace(
    "import { Course, Lesson, Module, Metric, QuizQuestion, InVideoCheckpoint } from '@/types';",
    "import { Course, Lesson, Module, Metric, QuizQuestion, InVideoCheckpoint } from '@/types';\nimport { ref, get, set } from 'firebase/database';\nimport { db } from '@/lib/firebase';"
  );
}

// 2. Replace useEffect fetching logic
const newFetchLogic = `
  useEffect(() => {
    // Cargar cursos desde Firebase
    get(ref(db, 'courses'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const coursesArray = Object.keys(data).map(key => data[key]);
          setCourses(coursesArray);
          if (coursesArray.length > 0) setSelectedCourse(coursesArray[0]);
        }
      })
      .catch((e) => console.error(e));

    // Cargar métricas
    get(ref(db, 'metrics'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setMetricsList(Object.keys(data).map(key => data[key]));
        }
      })
      .catch((e) => console.error(e));
  }, []);
`;

content = content.replace(
  /useEffect\(\(\) => \{\s*\/\/ Cargar cursos[\s\S]*?\}, \[\]\);/,
  newFetchLogic.trim()
);

// 3. Replace POST courses logic
const newSaveLogic = `
  const handleSaveCourse = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await set(ref(db, \`courses/\${selectedCourse.slug}\`), selectedCourse);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };
`;

content = content.replace(
  /const handleSaveCourse = async \(\) => \{[\s\S]*?finally \{\s*setIsSaving\(false\);\s*\}\s*\};/,
  newSaveLogic.trim()
);

// 4. Replace Video Upload logic to throw alert since we are serverless
const newUploadLogic = `
  const uploadVideoFile = async (file: File) => {
    alert("Las subidas de video locales requieren Firebase Storage en este modo Serverless. Sube el video a YouTube y pega el enlace.");
    setIsDragging(false);
  };
`;

content = content.replace(
  /const uploadVideoFile = async \(file: File\) => \{[\s\S]*?xhr\.send\(formData\);\s*\};/,
  newUploadLogic.trim()
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', content, 'utf8');
console.log("admin/page.tsx refactored to Firebase!");
