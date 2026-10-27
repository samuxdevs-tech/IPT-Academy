const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\layout.tsx', 'utf8');

const navBar = `
  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col">
      <nav className="bg-white border-b border-[#d1d2e0] px-6 py-3 flex items-center gap-6 sticky top-0 z-40">
        <div className="font-bold text-[#2a2b3f] mr-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#6d28d2]" />
          Portal Admin
        </div>
        <Link href="/admin" className="text-sm font-medium text-[#595c73] hover:text-[#6d28d2] transition-colors">
          Cursos y Métricas
        </Link>
        <Link href="/admin/scenarios" className="text-sm font-medium text-[#595c73] hover:text-[#6d28d2] transition-colors">
          Escenarios Visuales
        </Link>
        <Link href="/admin/analytics" className="text-sm font-medium text-[#595c73] hover:text-[#6d28d2] transition-colors">
          Analítica
        </Link>
        <div className="flex-1" />
        <Link href="/" className="text-sm font-medium text-[#6d28d2] hover:underline">
          Volver a la App
        </Link>
      </nav>
      {children}
    </div>
  );
`;

content = content.replace(/return <>{children}<\/>;/, navBar);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\layout.tsx', content, 'utf8');
console.log('Added navbar to admin layout!');
