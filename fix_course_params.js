const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', 'utf8');

content = content.replace("import React, { useEffect, useState, useRef, use } from 'react';", "import React, { useEffect, useState, useRef, Suspense } from 'react';\nimport { useSearchParams } from 'next/navigation';");

content = content.replace(/export default function CourseViewerPage\(\{ params \}: \{ params: Promise<\{ slug: string \}> \}\) \{[\s\S]*?\} >\s*<CourseViewerContent params=\{params\} \/>\s*<\/React\.Suspense>\s*\);\s*\}/, `export default function CourseViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#202230] text-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#b7b9cd]">Cargando Aula Virtual...</p>
          </div>
        </div>
      }
    >
      <CourseViewerContent />
    </Suspense>
  );
}`);

content = content.replace(/function CourseViewerContent\(\{ params \}: \{ params: Promise<\{ slug: string \}> \}\) \{\s*const \{ slug \} = use\(params\);/, `function CourseViewerContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('id');`);

// Fix the case where slug could be null
content = content.replace(/useEffect\(\(\) => \{\s*fetch\(\`http:\/\/localhost:4000\/api\/courses\/\$\{slug\}\`\)/g, `useEffect(() => {
    if (!slug) return;
    fetch(\`http://localhost:4000/api/courses/\${slug}\`)`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', content, 'utf8');
console.log('Migrated course viewer to query params!');
