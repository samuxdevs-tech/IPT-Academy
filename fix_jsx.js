const fs = require('fs');

let layout = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox\\layout.tsx', 'utf8');

// List of common SVG attributes to camelCase
const svgAttrs = [
  'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 
  'stroke-miterlimit', 'xml:space', 'xmlns:xlink', 'xlink:href', 'color-interpolation-filters',
  'enable-background', 'stop-color', 'stop-opacity'
];

svgAttrs.forEach(attr => {
  const camel = attr.replace(/[-:]+([a-z])/g, (g) => g[g.length - 1].toUpperCase());
  const regex = new RegExp(attr, 'g');
  layout = layout.replace(regex, camel);
});

// Also replace class= with className= just in case
layout = layout.replace(/class=/g, 'className=');

// SVG xml:space is xmlSpace but React expects just skipping it or camelCasing it. Let's just remove xmlSpace
layout = layout.replace(/xmlSpace="preserve"/g, '');

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\sandbox\\layout.tsx', layout, 'utf8');
console.log("SVG attributes camelCased in layout.tsx");
