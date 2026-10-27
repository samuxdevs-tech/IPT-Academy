const http = require('http');

async function post(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Iniciando prueba automatizada de Fase 1 (Heartbeats + Checkpoints)...');

  const userId = 'operario-prueba';
  const courseSlug = 'datagan-master-pro';
  const lessonId = 'les-1-1';

  // 1. Enviar Heartbeat inicial
  const hb1 = await post('http://localhost:4000/api/progress/heartbeat', {
    userId, courseSlug, lessonId, currentSecond: 10, range: [0, 10], durationSeconds: 900
  });
  console.log(`1. Heartbeat inicial [0, 10]: ${hb1.totalSecondsWatched}s acumulados (${hb1.coveragePercent}% cobertura)`);

  // 2. Responder primer Checkpoint en video (segundo 30)
  const cp1 = await post('http://localhost:4000/api/progress/in-video-checkpoint', {
    userId, courseSlug, lessonId, checkpointId: 'iv-cp-1-1', selectedIndex: 1
  });
  console.log(`2. Checkpoint #1 (min 0:30): Correcto=${cp1.correct}, Lección Completada=${cp1.isCompleted}`);

  // 3. Responder segundo Checkpoint en video (segundo 75)
  const cp2 = await post('http://localhost:4000/api/progress/in-video-checkpoint', {
    userId, courseSlug, lessonId, checkpointId: 'iv-cp-1-2', selectedIndex: 1
  });
  console.log(`3. Checkpoint #2 (min 1:15): Correcto=${cp2.correct}, Lección Completada=${cp2.isCompleted}`);

  // 4. Acumular intervalos de reproducción hasta alcanzar >= 80% (720s de 900s)
  console.log('4. Acumulando intervalos de reproducción legítimos (5s cada uno)...');
  let lastHb = null;
  for (let sec = 15; sec <= 730; sec += 10) {
    lastHb = await post('http://localhost:4000/api/progress/heartbeat', {
      userId, courseSlug, lessonId, currentSecond: sec, range: [sec - 10, sec], durationSeconds: 900
    });
  }

  console.log(`\n🎉 RESULTADO FINAL:`);
  console.log(`- Segundos únicos reproducidos: ${lastHb.totalSecondsWatched}s / 900s`);
  console.log(`- Cobertura validada por servidor: ${lastHb.coveragePercent}% (Umbral >= 80%: ${lastHb.coverageMet})`);
  console.log(`- Todos los checkpoints aprobados: ${lastHb.allCheckpointsPassed}`);
  console.log(`- Lección acreditada (isCompleted): ${lastHb.isCompleted}`);
  console.log(`- Lecciones acreditadas en UserProgress: ${JSON.stringify(lastHb.completedLessons)}`);
  
  if (lastHb.isCompleted && lastHb.completedLessons.includes(lessonId)) {
    console.log('\n✅ TEST FASE 1 SUPERADO AL 100%: La lección se acreditó legítimamente en el servidor.');
  } else {
    console.log('\n❌ ERROR: La lección no se acreditó como se esperaba.');
  }
}

runTest().catch(console.error);
