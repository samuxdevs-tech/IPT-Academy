const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', 'utf8');

// 1. Destructure onTelemetryEvent
content = content.replace(
  /onHeartbeat,\s*isPausedByModal = false\s*\}: UniversalVideoPlayerProps\)/, 
  "onHeartbeat,\n  isPausedByModal = false,\n  onTelemetryEvent\n}: UniversalVideoPlayerProps)"
);

// 2. Add to propsRef initialization
const refInitRegex = /const propsRef = useRef\(\{[\s\S]*?isPausedByModal\s*\}\);/;
const newRefInit = `const propsRef = useRef({
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent
  });`;
content = content.replace(refInitRegex, newRefInit);

// 3. Add to propsRef update
const refUpdateRegex = /propsRef\.current = \{[\s\S]*?isPausedByModal\s*\};/;
const newRefUpdate = `propsRef.current = {
    onTimeUpdate,
    onHeartbeat,
    onTriggerCheckpoint,
    onEnded,
    durationSeconds,
    isPausedByModal,
    onTelemetryEvent
  };`;
content = content.replace(refUpdateRegex, newRefUpdate);

// 4. Fix 'now' error
content = content.replace(/propsRef\.current\.onTelemetryEvent\('video_ended', now\);/, `propsRef.current.onTelemetryEvent('video_ended', ytPlayerRef.current?.getCurrentTime() || 0);`);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', content, 'utf8');
console.log('Fixed UniversalVideoPlayer TS errors!');
