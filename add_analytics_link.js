const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', 'utf8');

const analyticsLink = `
          <Link
            href="/admin/analytics"
            className="px-3.5 py-2 rounded-lg border border-[#d1d2e0] text-[#595c73] hover:text-[#6d28d2] text-xs font-semibold flex items-center gap-1.5 transition-all bg-white mr-2"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ver Analíticas y Telemetría</span>
          </Link>
          <Link
            href={\`/courses/\${selectedCourse?.slug}\`}
`;

content = content.replace(/<Link\s*href=\{\`\/courses\/\$\{selectedCourse(\?)?\.slug\}\`\}/, analyticsLink);
content = content.replace("import {\n  Upload,", "import {\n  BarChart3,\n  Upload,");

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\page.tsx', content, 'utf8');
console.log('Added analytics link to admin page');
