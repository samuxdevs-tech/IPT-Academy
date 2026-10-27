const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

// 1. Add state
const stateInsertion = `
  const [questions, setQuestions] = useState<QuestionPost[]>([]);
  const [seekCommand, setSeekCommand] = useState<number | undefined>(undefined);
`;
content = content.replace('const [questions, setQuestions] = useState<QuestionPost[]>([]);', stateInsertion);

// 2. Add prop to UniversalVideoPlayer
content = content.replace(
  'isPausedByModal={!!activeInVideoCheckpoint || isQuizModalOpen}',
  'isPausedByModal={!!activeInVideoCheckpoint || isQuizModalOpen}\n                      seekToTime={seekCommand}'
);

// 3. Update the Note time span to be a clickable button
const oldNoteHtml = `<span className="px-2.5 py-1 rounded-md bg-[#202230] text-white font-mono text-xs font-bold shrink-0">
                          {n.timeFormatted}
                        </span>`;

const newNoteHtml = `<button 
                          onClick={() => {
                            setSeekCommand(undefined);
                            setTimeout(() => setSeekCommand(n.seconds), 50);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#202230] text-white hover:bg-[#6d28d2] font-mono text-xs font-bold shrink-0 cursor-pointer transition-colors"
                        >
                          {n.timeFormatted}
                        </button>`;

content = content.replace(oldNoteHtml, newNoteHtml);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('page.tsx updated with clickable notes for seeking');
