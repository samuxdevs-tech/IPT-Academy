const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', 'utf8');

// 1. Add seekToTime prop
content = content.replace(
  'initialTime?: number;',
  'initialTime?: number;\n  seekToTime?: number;'
);

content = content.replace(
  'initialTime = 0,',
  'initialTime = 0,\n    seekToTime,'
);

// 2. Add useEffect for seekToTime
const effectStr = `
  // Escuchar comandos de seek desde el padre (ej. Notas con Timestamp)
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime >= 0) {
      if (videoType === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(seekToTime, true);
      } else if (videoType === 'local' && videoRef.current) {
        videoRef.current.currentTime = seekToTime;
      }
    }
  }, [seekToTime, videoType]);

  // Si el modal está abierto
`;

content = content.replace('// Si el modal está abierto', effectStr);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\components\\UniversalVideoPlayer.tsx', content, 'utf8');
console.log('UniversalVideoPlayer updated to support seekToTime');
