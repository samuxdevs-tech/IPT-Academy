const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', 'utf8');

// Replace fetch for Course
const fetchCourseOld = /fetch\(\`http:\/\/localhost:4000\/api\/courses\/\$\{slug\}\`\)\s*\.then\(\(res\) => res\.json\(\)\)\s*\.then\(\(data: Course\) => \{\s*setCourse\(data\);\s*\}\)\s*\.catch\(\(err\) => console\.error\(err\)\);/g;

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

// Replace fetch for Notes
const fetchNotesOld = /fetch\(\`http:\/\/localhost:4000\/api\/notes\/\$\{slug\}\`\)\s*\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(data: NoteItem\[\]\) => setNotes\(data\)\)\s*\.catch\(\(e\) => console\.error\(e\)\);/g;

const fetchNotesNew = `
      get(ref(db, \`notes/\${slug}\`))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            setNotes(Object.keys(data).map(k => data[k]));
          }
        })
        .catch(console.error);
`;

content = content.replace(fetchNotesOld, fetchNotesNew.trim());

// Replace fetch for Questions (QA)
const fetchQAOld = /const qUrl = qaSearch\s*\?\s*\`http:\/\/localhost:4000\/api\/questions\/\$\{slug\}\?search=\$\{encodeURIComponent\(qaSearch\)\}\`\s*:\s*\`http:\/\/localhost:4000\/api\/questions\/\$\{slug\}\`;\s*fetch\(qUrl\)\s*\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(data: QuestionPost\[\]\) => setQuestions\(data\)\)\s*\.catch\(\(e\) => console\.error\(e\)\);/g;

const fetchQANew = `
      get(ref(db, \`questions/\${slug}\`))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.val();
            let arr = Object.keys(data).map(k => data[k]);
            if (qaSearch) {
              arr = arr.filter(q => q.title.toLowerCase().includes(qaSearch.toLowerCase()) || q.body.toLowerCase().includes(qaSearch.toLowerCase()));
            }
            setQuestions(arr);
          }
        })
        .catch(console.error);
`;

content = content.replace(fetchQAOld, fetchQANew.trim());

// Replace metrics fetch
const fetchMetricsOld = /fetch\(\`http:\/\/localhost:4000\/api\/metrics\/\$\{id\}\`\)\.then\(\(r\) => \(r\.ok \? r\.json\(\) : null\)\)/g;
const fetchMetricsNew = `get(ref(db, \`metrics/\${id}\`)).then(s => s.exists() ? s.val() : null)`;
content = content.replace(fetchMetricsOld, fetchMetricsNew);

// Replace handleCreateNote
const postNoteOld = /const res = await fetch\('http:\/\/localhost:4000\/api\/notes', \{[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?\}\)\s*\}\);[\s\S]*?const created = await res\.json\(\);[\s\S]*?setNotes\(\(prev\) => \[created, \.\.\.prev\]\);/g;
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
        setNotes(prev => [created, ...prev]);
`;
content = content.replace(postNoteOld, postNoteNew.trim());

// Replace handlePostQuestion
const postQAOld = /const res = await fetch\('http:\/\/localhost:4000\/api\/questions', \{[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?\}\)\s*\}\);[\s\S]*?const created = await res\.json\(\);[\s\S]*?setQuestions\(\(prev\) => \[created, \.\.\.prev\]\);/g;
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
        setQuestions(prev => [created, ...prev]);
`;
content = content.replace(postQAOld, postQANew.trim());

// Replace handleVoteQuestion
const voteQAOld = /const res = await fetch\(\`http:\/\/localhost:4000\/api\/questions\/\$\{qId\}\/vote\`, \{ method: 'POST' \}\);[\s\S]*?const updated = await res\.json\(\);[\s\S]*?setQuestions\(\(prev\) => prev\.map\(\(item\) => \(item\.id === qId \? updated : item\)\)\);/g;
const voteQANew = `
        const qRef = ref(db, \`questions/\${course.slug}/\${qId}\`);
        const snap = await get(qRef);
        if (snap.exists()) {
          const updated = snap.val();
          updated.votes = (updated.votes || 0) + 1;
          await set(qRef, updated);
          setQuestions(prev => prev.map(item => item.id === qId ? updated : item));
        }
`;
content = content.replace(voteQAOld, voteQANew.trim());

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\course\\page.tsx', content, 'utf8');
console.log("course/page.tsx refactored successfully!");
