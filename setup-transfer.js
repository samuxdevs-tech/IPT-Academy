#!/usr/bin/env node
/**
 * ============================================================================
 *  ASISTENTE AUTOMÁTICO DE TRANSFERENCIA E INSTALACIÓN — DATAGAN COURSE
 * ============================================================================
 *  Ejecutado mediante: npm run setup
 *
 *  Flujo todo-en-uno:
 *  1. Instala todas las dependencias de `frontend` (y `firebase-tools` si hace falta).
 *  2. Abre automáticamente `CREDENCIALES_FIREBASE.txt` en el editor de texto del sistema
 *     y espera a que el cliente pegue sus nuevas credenciales de Firebase y lo guarde.
 *  3. Extrae y valida `apiKey`, `authDomain`, `databaseURL`, `projectId`,
 *     `storageBucket`, `messagingSenderId` y `appId`.
 *  4. Actualiza automáticamente:
 *     - `frontend/.env.local`
 *     - `frontend/src/lib/firebase.ts`
 *     - `.firebaserc`
 *  5. Migra/inyecta automáticamente los datos base (`courses`, `metrics`,
 *     `missions`, `scenarios`) desde `database_seed.json` hacia el nuevo Firebase RTDB.
 *  6. Compila la aplicación (`npm run build`) y despliega a Firebase Hosting
 *     si el cliente tiene sesión activa en Firebase CLI.
 *  7. Inicia el servidor local (`npm run dev`) y abre `http://localhost:3000`.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

const ROOT_DIR = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const CREDENTIALS_TXT = path.join(ROOT_DIR, 'CREDENCIALES_FIREBASE.txt');
const SEED_JSON = path.join(ROOT_DIR, 'database_seed.json');

const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function logBanner(title) {
  console.log(`\n${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bright}${C.cyan}  ${title}${C.reset}`);
  console.log(`${C.cyan}================================================================================${C.reset}\n`);
}

function logStep(step, msg) {
  console.log(`${C.green}${C.bright}[PASO ${step}]${C.reset} ${msg}`);
}

function logWarn(msg) {
  console.log(`${C.yellow}[AVISO] ${msg}${C.reset}`);
}

function logError(msg) {
  console.log(`${C.red}[ERROR] ${msg}${C.reset}`);
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function normalizeDatabaseUrl(rawUrl, projectId) {
  const defaultUrl = `https://${projectId}-default-rtdb.firebaseio.com`;
  if (!rawUrl || typeof rawUrl !== 'string') return defaultUrl;
  const cleaned = rawUrl.trim().replace(/^["'`]+|["'`,;]+$/g, '').trim();

  // Extraer URL válida si termina en .firebaseio.com o .firebasedatabase.app
  const urlMatch = cleaned.match(/https?:\/\/[a-zA-Z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)/i);
  if (urlMatch) {
    return urlMatch[0].replace(/^http:\/\//i, 'https://');
  }

  // Si pegaron solo el dominio sin https://
  const domainMatch = cleaned.match(/([a-zA-Z0-9-]+(?:-default-rtdb)?\.(?:[a-z0-9-]+\.)?(?:firebaseio\.com|firebasedatabase\.app))/i);
  if (domainMatch) {
    return `https://${domainMatch[1]}`;
  }

  return defaultUrl;
}

/**
 * Extrae las credenciales desde CREDENCIALES_FIREBASE.txt
 * Soporta tanto formato `clave = valor` como bloque JS `firebaseConfig = { apiKey: "...", ... }`
 */
function parseCredentialsFromText(rawText) {
  const keys = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const extracted = {};
  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    // Ignorar líneas vacías o separadores
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('---') || line.startsWith('===')) {
      continue;
    }

    for (const key of keys) {
      // 1. Coincidencia formato JS/JSON en la misma línea: apiKey: "valor" o "apiKey": "valor"
      const jsMatch = line.match(new RegExp(`^["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i'));
      // 2. Coincidencia formato INI en la misma línea: apiKey = valor (usando [ \\t]* para jamás saltar de línea)
      const iniMatch = line.match(new RegExp(`^${key}[ \\t]*=[ \\t]*(.+)$`, 'i'));

      const matchVal = jsMatch ? jsMatch[1] : iniMatch ? iniMatch[1] : null;
      if (matchVal !== null) {
        const candidate = matchVal
          .trim()
          .replace(/[,;]+$/, '')
          .replace(/^["'`]|["'`]$/g, '')
          .trim();

        // Evitar capturar placeholders vacíos, otras claves o separadores
        if (
          candidate &&
          !candidate.startsWith('tu-') &&
          !candidate.includes('...') &&
          !candidate.includes('<YOUR') &&
          !candidate.includes('---') &&
          !candidate.endsWith('=') &&
          candidate !== ''
        ) {
          extracted[key] = candidate;
        }
      }
    }
  }

  // Si pegaron authDomain pero no projectId, deducir projectId desde authDomain
  if (!extracted.projectId && extracted.authDomain && extracted.authDomain.includes('.firebaseapp.com')) {
    extracted.projectId = extracted.authDomain.split('.firebaseapp.com')[0].trim();
  }

  // Autocompletar y normalizar campos derivados a partir de projectId
  if (extracted.projectId) {
    extracted.projectId = extracted.projectId.replace(/[^a-zA-Z0-9-]/g, '');
    if (!extracted.authDomain || !extracted.authDomain.includes('.')) {
      extracted.authDomain = `${extracted.projectId}.firebaseapp.com`;
    }
    extracted.databaseURL = normalizeDatabaseUrl(extracted.databaseURL, extracted.projectId);
    if (!extracted.storageBucket || !extracted.storageBucket.includes('.')) {
      extracted.storageBucket = `${extracted.projectId}.firebasestorage.app`;
    }
  }

  return extracted;
}

/**
 * Abre el archivo .txt en el editor predeterminado y espera a que el usuario lo cierre o presione Enter
 */
async function openTextFileAndWait(filePath) {
  console.log(`${C.yellow}Abriendo el archivo de credenciales:${C.reset} ${filePath}`);
  console.log(`${C.dim}Por favor pega las credenciales de tu proyecto Firebase, GUARDA (Ctrl+S) y CIERRA el bloc de notas...${C.reset}\n`);

  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // Ejecutar notepad de forma síncrona (bloquea hasta que el usuario cierre la ventana de Notepad)
      execSync(`notepad.exe "${filePath}"`, { stdio: 'inherit' });
    } else if (platform === 'darwin') {
      execSync(`open -W -t "${filePath}"`, { stdio: 'inherit' });
    } else {
      execSync(`xdg-open "${filePath}"`, { stdio: 'inherit' });
      await askQuestion(`\nPresiona [ENTER] cuando hayas guardado los cambios en CREDENCIALES_FIREBASE.txt... `);
    }
  } catch (err) {
    logWarn(`No se pudo abrir el editor automáticamente (${err.message}).`);
    await askQuestion(`Edita manualmente "${filePath}", guárdalo y presiona [ENTER] para continuar... `);
  }
}

/**
 * Crea el archivo CREDENCIALES_FIREBASE.txt si no existe
 */
function ensureCredentialsTemplate() {
  if (!fs.existsSync(CREDENTIALS_TXT)) {
    const template = `================================================================================
   CONFIGURACIÓN DE CREDENCIALES DE FIREBASE — TECNOGAN / DATAGAN COURSE
================================================================================

INSTRUCCIONES PARA EL CLIENTE:
1. Ve a tu Consola de Firebase (https://console.firebase.google.com/).
2. Abre tu proyecto > Configuración del proyecto (ícono de engranaje) > Tus apps (Web).
3. Asegúrate de tener habilitados "Realtime Database" y "Authentication" (Correo/Contraseña).
4. Completa los campos de la OPCIÓN A, o pega el bloque \`firebaseConfig\` en la OPCIÓN B.
5. GUARDA este archivo (Ctrl + S) y CIERRA esta ventana para continuar automáticamente.

--------------------------------------------------------------------------------
OPCIÓN A: Completa cada campo después del signo "="
--------------------------------------------------------------------------------

apiKey = 
authDomain = 
databaseURL = 
projectId = 
storageBucket = 
messagingSenderId = 
appId = 

--------------------------------------------------------------------------------
OPCIÓN B: O pega directamente aquí abajo el bloque \`const firebaseConfig = { ... }\`
copiado de la consola de Firebase:
--------------------------------------------------------------------------------

`;
    fs.writeFileSync(CREDENTIALS_TXT, template, 'utf8');
  }
}

/**
 * Actualiza los archivos de configuración del proyecto con las nuevas credenciales
 */
function applyFirebaseCredentials(creds) {
  const safeDbUrl = normalizeDatabaseUrl(creds.databaseURL, creds.projectId);
  const siteUrl = `https://${creds.projectId}.web.app`;
  creds.databaseURL = safeDbUrl;

  // 1. Escribir frontend/.env.local
  const envContent = `NEXT_PUBLIC_FIREBASE_API_KEY="${creds.apiKey}"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${creds.authDomain}"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="${safeDbUrl}"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="${creds.projectId}"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${creds.storageBucket}"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${creds.messagingSenderId || ''}"
NEXT_PUBLIC_FIREBASE_APP_ID="${creds.appId || ''}"
NEXT_PUBLIC_SITE_URL="${siteUrl}"
`;
  const envPath = path.join(FRONTEND_DIR, '.env.local');
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`  ✔ Creado/actualizado: ${C.bright}frontend/.env.local${C.reset}`);

  // 2. Actualizar frontend/src/lib/firebase.ts con sanitización de URL integrada
  const firebaseTsPath = path.join(FRONTEND_DIR, 'src', 'lib', 'firebase.ts');
  const firebaseTsContent = `import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

function sanitizeEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val
    .trim()
    .replace(/^["'\`]+|["'\`,;]+$/g, "")
    .trim();
  if (
    !cleaned ||
    cleaned === "undefined" ||
    cleaned === "null" ||
    cleaned.includes("<YOUR") ||
    cleaned.startsWith("tu-")
  ) {
    return fallback;
  }
  return cleaned;
}

function resolveDatabaseUrl(rawUrl: string | undefined, projectId: string): string {
  const defaultUrl = \`https://\${projectId}-default-rtdb.firebaseio.com\`;
  const candidate = sanitizeEnv(rawUrl, defaultUrl);

  const urlMatch = candidate.match(/https?:\\/\\/[a-zA-Z0-9.-]+\\.(?:firebaseio\\.com|firebasedatabase\\.app)/i);
  if (urlMatch) {
    return urlMatch[0].replace(/^http:\\/\\//i, "https://");
  }

  const domainMatch = candidate.match(/([a-zA-Z0-9-]+(?:-default-rtdb)?\\.(?:[a-z0-9-]+\\.)?(?:firebaseio\\.com|firebasedatabase\\.app))/i);
  if (domainMatch) {
    return \`https://\${domainMatch[1]}\`;
  }

  return defaultUrl;
}

const resolvedProjectId = sanitizeEnv(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "${creds.projectId}"
);

const firebaseConfig = {
  apiKey: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "${creds.apiKey}"
  ),
  authDomain: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    \`\${resolvedProjectId}.firebaseapp.com\`
  ),
  databaseURL: resolveDatabaseUrl(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    resolvedProjectId
  ),
  projectId: resolvedProjectId,
  storageBucket: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "${creds.storageBucket}"
  ),
  messagingSenderId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "${creds.messagingSenderId || ''}"
  ),
  appId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "${creds.appId || ''}"
  ),
};

// Initialize Firebase (prevent multiple initializations in Next.js dev mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app, firebaseConfig.databaseURL);

export default app;
`;
  fs.writeFileSync(firebaseTsPath, firebaseTsContent, 'utf8');
  console.log(`  ✔ Actualizado: ${C.bright}frontend/src/lib/firebase.ts${C.reset}`);

  // 3. Actualizar .firebaserc
  const firebasercPath = path.join(ROOT_DIR, '.firebaserc');
  const firebasercContent = JSON.stringify(
    {
      projects: {
        default: creds.projectId,
      },
    },
    null,
    2
  );
  fs.writeFileSync(firebasercPath, firebasercContent + '\n', 'utf8');
  console.log(`  ✔ Actualizado: ${C.bright}.firebaserc${C.reset} (Proyecto: ${creds.projectId})`);

  // 4. Actualizar URLs en simuladores estáticos (sandbox.html, nacimientos.html, tecnogan.html) y SEO (robots.txt, sitemap.xml)
  const staticHtmlFiles = [
    path.join(FRONTEND_DIR, 'public', 'sandbox.html'),
    path.join(FRONTEND_DIR, 'public', 'sandbox', 'nacimientos.html'),
    path.join(FRONTEND_DIR, 'public', 'tecnogan.html'),
    path.join(FRONTEND_DIR, 'public', 'tecnogan-nacimientos.html'),
  ];
  for (const htmlFile of staticHtmlFiles) {
    if (fs.existsSync(htmlFile)) {
      let html = fs.readFileSync(htmlFile, 'utf8');
      html = html.replace(
        /https:\/\/[a-zA-Z0-9-]+-default-rtdb\.(?:[a-z0-9-]+\.)?(?:firebaseio\.com|firebasedatabase\.app)/g,
        safeDbUrl.replace(/\/$/, '')
      );
      html = html.replace(/href="https:\/\/datagan-course\.web\.app\/?"/g, 'href="/course"');
      html = html.replace(/https:\/\/datagan-course\.web\.app/g, siteUrl);
      fs.writeFileSync(htmlFile, html, 'utf8');
    }
  }

  const seoFiles = [
    path.join(FRONTEND_DIR, 'public', 'robots.txt'),
    path.join(FRONTEND_DIR, 'public', 'sitemap.xml'),
  ];
  for (const seoFile of seoFiles) {
    if (fs.existsSync(seoFile)) {
      let content = fs.readFileSync(seoFile, 'utf8');
      content = content.replace(/https:\/\/datagan-course\.iptapps\.com/g, siteUrl);
      content = content.replace(/https:\/\/[a-zA-Z0-9-]+\.web\.app/g, siteUrl);
      fs.writeFileSync(seoFile, content, 'utf8');
    }
  }
  console.log(`  ✔ Actualizados enlaces de dominio y RTDB en simuladores Sandbox y SEO (${siteUrl})`);

  // 5. Limpiar cachés antiguos de Next.js (.next y out) para evitar que sirvan el viejo dominio
  for (const cacheDir of [path.join(FRONTEND_DIR, '.next'), path.join(FRONTEND_DIR, 'out')]) {
    if (fs.existsSync(cacheDir)) {
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
  console.log(`  ✔ Caché de compilación anterior (.next / out) limpiado.`);
}

/**
 * Migra los datos iniciales (cursos, 73 métricas, misiones y escenarios) a la nueva base de datos
 */
async function seedClientDatabase(creds) {
  if (!fs.existsSync(SEED_JSON)) {
    logWarn('No se encontró database_seed.json; omitiendo migración de datos base.');
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
  const baseUrl = creds.databaseURL.replace(/\/$/, '');
  const nodes = ['courses', 'metrics', 'missions', 'scenarios'];

  console.log(`  Conectando con Realtime Database: ${C.cyan}${baseUrl}${C.reset}`);

  let restSuccess = true;
  for (const node of nodes) {
    if (!seedData[node]) continue;
    try {
      const res = await fetch(`${baseUrl}/${node}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedData[node]),
      });

      if (res.ok) {
        const count = Object.keys(seedData[node]).length;
        console.log(`  ✔ Nodo ${C.bright}/${node}${C.reset} migrado (${count} registros).`);
      } else {
        restSuccess = false;
        logWarn(`Respuesta HTTP ${res.status} al escribir en /${node} vía REST (posibles reglas cerradas).`);
        break;
      }
    } catch (err) {
      restSuccess = false;
      logWarn(`No se pudo escribir vía REST en /${node}: ${err.message}`);
      break;
    }
  }

  // Si las reglas de la base de datos bloquean escritura pública, intentar con Firebase CLI autenticado
  if (!restSuccess) {
    console.log(`  Intentando inyección autenticada mediante Firebase CLI...`);
    try {
      execSync(`npx --yes firebase-tools database:set / "${SEED_JSON}" --project "${creds.projectId}" --force`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      console.log(`  ✔ Base de datos migrada con éxito mediante Firebase CLI.`);
    } catch (cliErr) {
      logWarn(
        `Para migrar automáticamente la base de datos o desplegar reglas, inicia sesión con "npx firebase-tools login" o importa el archivo "database_seed.json" directamente desde la consola de Firebase > Realtime Database > Importar JSON.`
      );
    }
  }
}

async function main() {
  logBanner('TRANSFERENCIA E INSTALACIÓN AUTOMÁTICA — DATAGAN COURSE');

  // PASO 1: Instalar dependencias
  logStep(1, 'Instalando dependencias del proyecto ( raíz y frontend )...');
  try {
    execSync('npm install', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    console.log(`  ✔ Dependencias de frontend instaladas correctamente.\n`);
  } catch (err) {
    logError(`Error instalando dependencias en frontend: ${err.message}`);
    process.exit(1);
  }

  // PASO 2: Abrir archivo .txt para pedir las nuevas credenciales de Firebase
  logStep(2, 'Solicitando las nuevas credenciales de Firebase del cliente...');
  ensureCredentialsTemplate();

  let creds = {};
  while (true) {
    await openTextFileAndWait(CREDENTIALS_TXT);

    const rawText = fs.readFileSync(CREDENTIALS_TXT, 'utf8');
    creds = parseCredentialsFromText(rawText);

    if (creds.apiKey && creds.projectId && creds.databaseURL) {
      console.log(`\n  ${C.green}✔ Credenciales detectadas correctamente:${C.reset}`);
      console.log(`    • Project ID   : ${C.bright}${creds.projectId}${C.reset}`);
      console.log(`    • Nuevo Dominio: ${C.bright}https://${creds.projectId}.web.app${C.reset}`);
      console.log(`    • Auth Domain  : ${creds.authDomain}`);
      console.log(`    • Database URL : ${creds.databaseURL}`);
      console.log(`    • Storage      : ${creds.storageBucket}\n`);

      if (creds.projectId === 'datagan-course') {
        logWarn('Has ingresado el projectId "datagan-course" (que corresponde al dominio original).');
        const keepOld = await askQuestion(
          '¿Seguro que deseas usar "datagan-course" en lugar de pegar las nuevas credenciales del cliente? (s/N): '
        );
        if (keepOld.toLowerCase() !== 's') {
          continue;
        }
      }
      break;
    } else {
      logWarn('No se detectaron credenciales completas en CREDENCIALES_FIREBASE.txt.');
      console.log('Asegúrate de pegar al menos apiKey, projectId y databaseURL (o el bloque firebaseConfig completo) y GUARDAR el archivo.');
      const retry = await askQuestion('¿Deseas volver a abrir CREDENCIALES_FIREBASE.txt para completarlo? (S/n): ');
      if (retry.toLowerCase() === 'n') {
        logError('Instalación cancelada: faltan credenciales de Firebase.');
        process.exit(1);
      }
    }
  }

  // PASO 3: Inyectar credenciales en el código y archivos de entorno
  logStep(3, 'Configurando credenciales y nuevo dominio en todo el proyecto...');
  applyFirebaseCredentials(creds);

  // PASO 4: Migrar base de datos (cursos, 73 métricas, misiones y escenarios)
  console.log('');
  logStep(4, 'Migrando cursos, 73 métricas zootécnicas, misiones y escenarios al nuevo Firebase...');
  await seedClientDatabase(creds);

  // PASO 5: Compilar aplicación estática para producción
  console.log('');
  logStep(5, 'Compilando aplicación optimizada de producción (npm run build)...');
  try {
    execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    console.log(`  ✔ Build de producción generado en ${C.bright}frontend/out${C.reset}.\n`);
  } catch (err) {
    logWarn(`Advertencia durante el build: ${err.message}`);
  }

  // PASO 6: Despliegue opcional a Firebase Hosting & Reglas de RTDB
  logStep(6, 'Verificando despliegue en Firebase Hosting del cliente...');
  const deployAnswer = await askQuestion(
    `\n¿Deseas desplegar ahora mismo a Firebase Hosting y Reglas RTDB del proyecto "${creds.projectId}"? (S/n): `
  );
  if (deployAnswer.toLowerCase() !== 'n') {
    try {
      console.log(`  Verificando sesión de Firebase CLI...`);
      execSync(`npx --yes firebase-tools deploy --project "${creds.projectId}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      console.log(`\n  ${C.green}✔ Despliegue completado en https://${creds.projectId}.web.app${C.reset}\n`);
    } catch (err) {
      logWarn(`No se pudo completar el despliegue automático (es posible que debas iniciar sesión con Firebase).`);
      console.log(`  Intentando abrir inicio de sesión de Firebase CLI...`);
      try {
        execSync(`npx --yes firebase-tools login`, { cwd: ROOT_DIR, stdio: 'inherit' });
        execSync(`npx --yes firebase-tools deploy --project "${creds.projectId}"`, {
          cwd: ROOT_DIR,
          stdio: 'inherit',
        });
      } catch (retryErr) {
        logWarn(
          `Puedes desplegar manualmente en cualquier momento ejecutando: npx firebase-tools deploy --project ${creds.projectId}`
        );
      }
    }
  }

  // PASO 7: Iniciar el servidor local y abrir el navegador
  logBanner('¡INSTALACIÓN Y TRANSFERENCIA COMPLETADA CON ÉXITO!');
  console.log(`Iniciando servidor de desarrollo en ${C.bright}${C.green}http://localhost:3000${C.reset} ...\n`);

  // Abrir navegador tras 3 segundos
  setTimeout(() => {
    try {
      if (process.platform === 'win32') {
        execSync('start http://localhost:3000');
      } else if (process.platform === 'darwin') {
        execSync('open http://localhost:3000');
      } else {
        execSync('xdg-open http://localhost:3000');
      }
    } catch (_) {}
  }, 3000);

  const devProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    shell: true,
  });

  devProc.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  logError(`Error inesperado en el instalador: ${err.message}`);
  process.exit(1);
});
