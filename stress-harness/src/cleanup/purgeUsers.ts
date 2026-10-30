import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePersonas } from '../generators/personas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runCleanupManifest(totalUsers: number = 100) {
  const personas = generatePersonas(totalUsers);
  const userList = personas.map((p) => ({
    id: p.id,
    email: p.email,
    generatedAt: new Date().toISOString(),
  }));

  const manifestDir = path.resolve(__dirname, '..', '..', 'results');
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const manifestPath = path.join(manifestDir, 'test_users_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(userList, null, 2), 'utf-8');

  console.log(`\n🧹 [IPT Stress Cleanup] Manifiesto generado con ${userList.length} usuarios de prueba aislados.`);
  console.log(`📄 Archivo: ${manifestPath}`);
  console.log(`\nPatrón de identificación en Firebase Auth / RTDB:`);
  console.log(`  - Prefijo Email: test_stress_user_XXX@iptapps.com`);
  console.log(`  - Con este manifiesto puedes purgar en masa desde Firebase CLI o un script de Admin SDK si se requiere.`);
}

if (process.argv[1]?.includes('purgeUsers')) {
  runCleanupManifest().catch(console.error);
}
