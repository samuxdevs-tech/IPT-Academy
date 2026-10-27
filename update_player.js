const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', 'utf8');

// Add onTelemetryEvent to Props
content = content.replace(
  'isPausedByModal?: boolean;',
  'isPausedByModal?: boolean;\n  onTelemetryEvent?: (eventType: \'video_started\' | \'video_paused\' | \'video_ended\' | \'seek\', timeSec: number) => void;'
);

content = content.replace(
  'isPausedByModal = false\n  }:',
  'isPausedByModal = false,\n    onTelemetryEvent\n  }:'
);

content = content.replace(
  'durationSeconds,\n      isPausedByModal\n    };',
  'durationSeconds,\n      isPausedByModal,\n      onTelemetryEvent\n    };'
);

content = content.replace(
  'durationSeconds,\n        isPausedByModal\n      }',
  'durationSeconds,\n        isPausedByModal,\n        onTelemetryEvent\n      }'
);

// Add YT onStateChange telemetry
content = content.replace(
  '// PLAYING (event.data === 1)',
  `// PLAYING (event.data === 1)
              if (event.data === 1 && propsRef.current.onTelemetryEvent) {
                 propsRef.current.onTelemetryEvent('video_started', ytPlayerRef.current.getCurrentTime());
              }
              // PLAYING (event.data === 1)`
);

content = content.replace(
  '// PAUSED (event.data === 2)',
  `// PAUSED (event.data === 2)
              if (event.data === 2 && propsRef.current.onTelemetryEvent) {
                 propsRef.current.onTelemetryEvent('video_paused', ytPlayerRef.current.getCurrentTime());
              }
              // PAUSED (event.data === 2)`
);

content = content.replace(
  'if (propsRef.current.onEnded) propsRef.current.onEnded();',
  `if (propsRef.current.onTelemetryEvent) propsRef.current.onTelemetryEvent('video_ended', now);
                      if (propsRef.current.onEnded) propsRef.current.onEnded();`
);

content = content.replace(
  'if (isSeek) {',
  `if (isSeek) {
            if (propsRef.current.onTelemetryEvent) propsRef.current.onTelemetryEvent('seek', now);`
);


fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', content, 'utf8');
console.log('UniversalVideoPlayer.tsx updated');
