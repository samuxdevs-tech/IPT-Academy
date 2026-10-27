const fs = require('fs');

const layout = `
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Users, BarChart2, Calendar, Settings, Menu, X, Baby, Activity } from 'lucide-react';
import './sandbox.css';

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ag-base text-text-main font-sans">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={\`\${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed inset-y-0 left-0 z-50 w-60 bg-[#196e6c] border-r border-[#155e5c] text-white/70 transition-transform duration-300 ease-in-out flex flex-col\`}>
        <div className="h-[70px] flex items-center px-6 border-b border-white/20">
          <h2 className="font-bold text-white text-xl">TecnoGan</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/sandbox" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="font-semibold text-sm">Dashboard</span>
          </Link>
          <div className="pt-4 pb-2 px-3">
            <p className="text-[10px] font-bold tracking-wider uppercase text-white/50">Salud & Vida</p>
          </div>
          <Link href="/sandbox/nacimientos" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
            <Baby className="w-5 h-5" />
            <span className="font-semibold text-sm">Nacimientos</span>
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors opacity-50">
            <Activity className="w-5 h-5" />
            <span className="font-semibold text-sm">Tratamientos</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300 md:ml-60">
        {/* Header */}
        <header className="w-full h-[70px] px-4 flex items-center gap-3 bg-[#196e6c] border-b border-[#155e5c] text-white">
          <button 
            className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="ml-auto flex items-center gap-3">
            <Link href="/course?id=datagan-master-pro" className="px-4 py-2 bg-white text-[#196e6c] rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors">
              Volver al Aula
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox\\layout.tsx', layout, 'utf8');
