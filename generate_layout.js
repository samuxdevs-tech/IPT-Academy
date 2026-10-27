const fs = require('fs');
const cheerio = require('cheerio');

function convertToJSX(htmlStr) {
  const $ = cheerio.load(htmlStr, { xmlMode: true });
  let xml = $.xml();
  
  // Basic replacements
  xml = xml.replace(/class=/g, 'className=');
  xml = xml.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  // Style strings to objects (basic support for style="x: y; a: b;")
  xml = xml.replace(/style="([^"]*)"/g, (match, p1) => {
    const rules = p1.split(';').filter(Boolean);
    const obj = {};
    rules.forEach(rule => {
      let [k, v] = rule.split(':');
      if (k && v) {
        k = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        obj[k] = v.trim();
      }
    });
    return `style={${JSON.stringify(obj)}}`;
  });
  
  // Data attributes with - can be kept as is, but data-v-... might be useless
  xml = xml.replace(/\sdata-v-[a-z0-9]+=""/g, '');
  xml = xml.replace(/\sdata-v-[a-z0-9]+/g, '');
  
  // Replace xmlns:xlink since React uses xmlnsXlink
  xml = xml.replace(/xmlns:xlink/g, 'xmlnsXlink');
  // xlink:href
  xml = xml.replace(/xlink:href/g, 'xlinkHref');
  
  return xml;
}

const aside = fs.readFileSync('D:\\My Apps\\Datagan Course\\sandbox_aside.html', 'utf8');
const header = fs.readFileSync('D:\\My Apps\\Datagan Course\\sandbox_header.html', 'utf8');

const asideJSX = convertToJSX(aside);
const headerJSX = convertToJSX(header);

const layoutFile = `
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import './sandbox.css';

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ag-base text-text-main font-sans">
      {/* Sidebar */}
      <div className={\`\${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-300 ease-in-out\`}>
        ${asideJSX.replace(/className="sidebar fixed.*?md:translate-x-0"/, 'className="sidebar h-full flex flex-col w-full"')}
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300 md:ml-60">
        {/* Header */}
        <div onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          ${headerJSX}
        </div>

        {/* Page Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 relative">
          <button 
            className="md:hidden absolute top-4 left-4 z-50 bg-[#196e6c] text-white p-2 rounded"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            Menú
          </button>
          {children}
        </main>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox\\layout.tsx', layoutFile, 'utf8');

// Copy CSS
fs.copyFileSync('D:\\My Apps\\Datagan Course\\sandbox_styles.css', 'D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox\\sandbox.css');

console.log("Layout generated successfully!");
