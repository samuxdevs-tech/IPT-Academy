const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

const regex = /<div className="flex items-center gap-1 font-semibold text-\[\#c4710d\]">[\s\S]*?valoraciones\)<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="p-5 pt-0">/;

const fix = `<div className="flex items-center gap-1 font-semibold text-[#c4710d]">
                          ★ {course.rating.toFixed(1)}
                        </div>
                        <span className="text-[#9194ac]">({course.ratingsCount} valoraciones)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0">`;

content = content.replace(regex, fix);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', content, 'utf8');
console.log('Fixed page.tsx!');
