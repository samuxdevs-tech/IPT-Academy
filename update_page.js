const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', 'utf8');

const telemetryFunction = `
  const handleTelemetry = async (eventType: 'video_started' | 'video_paused' | 'video_ended' | 'seek', timeSec: number) => {
    if (!activeLesson) return;
    try {
      await fetch('http://localhost:4000/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'ivan',
          courseSlug: slug,
          lessonId: activeLesson.id,
          eventType,
          videoTimeSeconds: timeSec,
          playbackRate: 1
        })
      });
    } catch (e) {
      console.error('Error enviando telemetría', e);
    }
  };

  const handleCheckpointAttempt = async (checkpointId: string, type: 'in_video' | 'module_quiz', selectedIndex: number, isCorrect: boolean, timeSec: number) => {
    if (!activeLesson) return;
    try {
      await fetch('http://localhost:4000/api/telemetry/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'ivan',
          courseSlug: slug,
          lessonId: activeLesson.id,
          questionId: checkpointId,
          type,
          selectedOptionIndex: selectedIndex,
          isCorrect,
          videoTimeSeconds: timeSec
        })
      });
    } catch (e) {
      console.error('Error enviando intento de checkpoint', e);
    }
  };
`;

const handleHeartbeatIndex = content.indexOf('const handleHeartbeat = async');
content = content.slice(0, handleHeartbeatIndex) + telemetryFunction + content.slice(handleHeartbeatIndex);

// Add onTelemetryEvent to <UniversalVideoPlayer>
content = content.replace(
  'onHeartbeat={handleHeartbeat}',
  'onHeartbeat={handleHeartbeat}\n                      onTelemetryEvent={handleTelemetry}'
);

// We need to inject handleCheckpointAttempt inside InVideoCheckpointModal onAnswer
content = content.replace(
  'const handleCheckAnswer = async (index: number) => {',
  `const handleCheckAnswer = async (index: number) => {
    const isCorrect = index === checkpoint.correctIndex;
    handleCheckpointAttempt(checkpoint.id, 'in_video', index, isCorrect, currentSeconds);
`
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\courses\\[slug]\\page.tsx', content, 'utf8');
console.log('page.tsx updated with telemetry handlers');
