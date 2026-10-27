const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

// Convert to Client Component
content = content.replace("import React from 'react';", "'use client';\n\nimport React, { useEffect, useState } from 'react';\nimport { useAuth } from '@/context/AuthContext';\nimport { ref, get } from 'firebase/database';\nimport { db } from '@/lib/firebase';");

// Remove server-side getCourses
content = content.replace(/async function getCourses\(\)[\s\S]*?\}\s*export default async function HomePage\(\) \{[\s\S]*?const courses = await getCourses\(\);/, `export default function HomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressData, setProgressData] = useState<any>({});

  useEffect(() => {
    // 1. Cargar catálogo (simulado para Serverless, o desde RTDB)
    const mockCourses: Course[] = [
      {
        slug: 'datagan-master-pro',
        title: 'DataGan Master Pro: Gestión Zootécnica',
        description: 'Domina las 73 métricas operativas de DataGan 360.',
        category: 'Gestión',
        level: 'Avanzado',
        thumbnail: 'https://images.unsplash.com/photo-1548074900-33fa259bdf11?w=800&q=80',
        rating: 4.9,
        ratingsCount: 128,
        modules: [{ id: 'm1', title: 'M1', lessons: [{}, {}, {}] as any }]
      }
    ];
    setCourses(mockCourses);

    // 2. Cargar progreso del usuario
    if (user) {
      get(ref(db, \`progress/\${user.uid}\`)).then(snap => {
        if (snap.exists()) {
          setProgressData(snap.val());
        }
      });
    }
  }, [user]);
`);

// Add Login / User UI to header
content = content.replace(/<div className="w-9 h-9 rounded-full bg-\[\#202230\] text-white flex items-center justify-center font-semibold text-sm">\s*IP\s*<\/div>/, `
            {user ? (
              <div className="w-9 h-9 rounded-full bg-[#202230] text-white flex items-center justify-center font-semibold text-sm cursor-pointer" title={user.email || user.phoneNumber || 'User'}>
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-[#6d28d2] rounded-lg hover:bg-[#5b21b6] transition-all">
                Iniciar Sesión
              </Link>
            )}
`);

// Inject progress bar on course cards
content = content.replace(/<div className="flex items-center gap-2 text-xs text-\[\#595c73\] pt-2 border-t border-\[\#f6f7f9\]">[\s\S]*?<\/div>/, `
                    {user && progressData[course.slug] ? (
                      <div className="pt-3 border-t border-[#f6f7f9]">
                        <div className="flex justify-between text-[10px] text-[#595c73] mb-1 font-bold">
                          <span>Progreso</span>
                          <span className="text-[#6d28d2]">{Math.min(100, Math.round(((progressData[course.slug].completedLessons?.length || 0) / 10) * 100))}%</span>
                        </div>
                        <div className="w-full bg-[#f6f7f9] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#6d28d2] h-full" style={{ width: \`\${Math.min(100, Math.round(((progressData[course.slug].completedLessons?.length || 0) / 10) * 100))}%\` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#595c73] pt-2 border-t border-[#f6f7f9]">
                        <div className="flex items-center gap-1 font-semibold text-[#c4710d]">
                          ★ {course.rating.toFixed(1)}
                        </div>
                        <span className="text-[#9194ac]">({course.ratingsCount} valoraciones)</span>
                      </div>
                    )}
`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', content, 'utf8');
console.log('Merged Landing and Dashboard into page.tsx!');
