const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', 'utf8');

const fetchCourseOld = /fetch\(\`http:\/\/localhost:4000\/api\/courses\/\$\{slug\}\`\)[\s\S]*?\.then\(\(res\) => res\.json\(\)\)[\s\S]*?\.then\(\(data: Course\) => \{[\s\S]*?setCourse\(data\);[\s\S]*?\}\)[\s\S]*?\.catch\(\(err\) => console\.error\(err\)\);/;
const fetchCourseNew = `
      get(ref(db, \`courses/\${slug}\`))
        .then((snap) => {
          if (snap.exists()) {
            setCourse(snap.val());
          } else {
            console.error("Curso no encontrado");
          }
        })
        .catch(console.error);
`;
content = content.replace(fetchCourseOld, fetchCourseNew.trim());

const postNoteOld = /const res = await fetch\('http:\/\/localhost:4000\/api\/notes', \{[\s\S]*?method: 'POST',[\s\S]*?headers: \{ 'Content-Type': 'application\/json' \},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?courseSlug: course\.slug,[\s\S]*?lessonId: activeLesson\.id,[\s\S]*?seconds: currentSeconds,[\s\S]*?timeFormatted: formatTime\(currentSeconds\),[\s\S]*?text: newNoteText\.trim\(\)[\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?const created = await res\.json\(\);[\s\S]*?setNotes\(\(prev\) => \[created, \.\.\.prev\]\);/;
const postNoteNew = `
        const newNoteId = Date.now().toString();
        const created = {
          id: newNoteId,
          courseSlug: course.slug,
          lessonId: activeLesson.id,
          seconds: currentSeconds,
          timeFormatted: formatTime(currentSeconds),
          text: newNoteText.trim(),
          createdAt: new Date().toISOString()
        };
        await set(ref(db, \`notes/\${course.slug}/\${newNoteId}\`), created);
        setNotes((prev) => [created, ...prev]);
`;
content = content.replace(postNoteOld, postNoteNew.trim());

const postQAOld = /const res = await fetch\('http:\/\/localhost:4000\/api\/questions', \{[\s\S]*?method: 'POST',[\s\S]*?headers: \{ 'Content-Type': 'application\/json' \},[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?courseSlug: course\.slug,[\s\S]*?lessonId: activeLesson\.id,[\s\S]*?author: \{[\s\S]*?name: user\?\.displayName \|\| 'Usuario',[\s\S]*?initials: \(user\?\.displayName \|\| 'U'\)\.charAt\(0\)[\s\S]*?\},[\s\S]*?title: newQTitle\.trim\(\),[\s\S]*?body: newQBody\.trim\(\)[\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?const created = await res\.json\(\);[\s\S]*?setQuestions\(\(prev\) => \[created, \.\.\.prev\]\);/;
const postQANew = `
        const newQId = Date.now().toString();
        const created = {
          id: newQId,
          courseSlug: course.slug,
          lessonId: activeLesson.id,
          author: { name: user?.displayName || 'Usuario', initials: (user?.displayName || 'U').charAt(0) },
          title: newQTitle.trim(),
          body: newQBody.trim(),
          votes: 0,
          answers: [],
          createdAt: new Date().toISOString()
        };
        await set(ref(db, \`questions/\${course.slug}/\${newQId}\`), created);
        setQuestions((prev) => [created, ...prev]);
`;
content = content.replace(postQAOld, postQANew.trim());

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', content, 'utf8');
console.log("course/page.tsx manual replace finished!");
