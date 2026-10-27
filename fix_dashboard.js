const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\dashboard\\page.tsx', 'utf8');

// 1. Imports
const imports = `import { useAuth } from '@/context/AuthContext';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';`;
content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\n" + imports);

// 2. State
content = content.replace("export default function DashboardPage() {", "export default function DashboardPage() {\n  const { user } = useAuth();");

// 3. fetch logic
const fetchRegex = /useEffect\(\(\) => \{\s*fetch\('http:\/\/localhost:4000\/api\/dashboard\/ivan'\)[\s\S]*?\.catch\(\(err\) => console\.error\('Error fetching dashboard', err\)\);\s*\}, \[\]\);/g;

const newFetch = `useEffect(() => {
    if (!user) return;
    
    // Serverless mock: Read course metadata and user progress
    const loadDashboard = async () => {
      try {
        const progressRef = ref(db, \`progress/\${user.uid}\`);
        const snapshot = await get(progressRef);
        
        if (snapshot.exists()) {
          const progressData = snapshot.val();
          const parsedCourses = [];
          
          for (const [courseSlug, data] of Object.entries(progressData)) {
            const completed = (data as any).completedLessons?.length || 0;
            const totalLessons = 10; // Mock total
            const progressPercent = Math.min(100, Math.round((completed / totalLessons) * 100));
            
            parsedCourses.push({
              courseSlug,
              courseTitle: 'Datagan Course: ' + courseSlug.replace('-', ' '),
              totalLessons,
              completedLessons: completed,
              progressPercent,
              isCertified: progressPercent === 100,
              metrics: {
                inVideoScore: 85,
                quizScore: 90
              }
            });
          }
          setCourses(parsedCourses);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error('Error reading dashboard from RTDB', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboard();
  }, [user]);`;

content = content.replace(fetchRegex, newFetch);

// 4. Generate Certificate Logic
const certRegex = /const handleGenerateCertificate = async \(courseSlug: string\) => \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\s*\};/;
const newCert = `const handleGenerateCertificate = async (courseSlug: string) => {
    if (!user) return;
    setIsGenerating(true);
    try {
      // Mock Serverless Certificate generation
      setTimeout(() => {
        const hash = Math.random().toString(36).substring(2, 12).toUpperCase();
        setCertificateData({
          success: true,
          certificateId: 'IPT-' + hash,
          studentName: user.phoneNumber || user.email || 'Estudiante',
          courseName: courseSlug.replace('-', ' '),
          issueDate: new Date().toISOString()
        });
        setIsGenerating(false);
      }, 1000);
    } catch (error) {
      console.error('Error generating certificate', error);
      setIsGenerating(false);
    }
  };`;
content = content.replace(certRegex, newCert);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\dashboard\\page.tsx', content, 'utf8');
console.log('Migrated Dashboard to Firebase RTDB!');
