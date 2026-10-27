const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', 'utf8');

// The malformed part looks like this:
/*
                        <span className="text-[#9194ac]">({course.ratingsCount} valoraciones)</span>
                      </div>
                    )}

                      <span className="text-[#9194ac]">({course.ratingsCount} valoraciones)</span>
                    </div>
                  </div>
                </div>
*/

content = content.replace(/<span className="text-\[\#9194ac\]">\(\{course\.ratingsCount\} valoraciones\)<\/span>\s*<\/div>\s*\}\)\s*<span className="text-\[\#9194ac\]">\(\{course\.ratingsCount\} valoraciones\)<\/span>\s*<\/div>/, `<span className="text-[#9194ac]">({course.ratingsCount} valoraciones)</span>
                      </div>
                    )}`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\page.tsx', content, 'utf8');
console.log('Fixed page.tsx JSX malformation');
