import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePersonas } from './generators/personas.js';
import { runOrchestratedSimulation } from './orchestrator/rampUp.js';
import { compileMetrics, saveReports } from './metrics/collector.js';
import { HarnessOptions } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(): HarnessOptions {
  const args = process.argv.slice(2);
  const options: HarnessOptions = {
    totalUsers: 100,
    maxConcurrency: 12,
    rampUpBatchSize: 5,
    baseUrl: 'https://academy.iptapps.com',
    headless: true,
    slowMoMs: 0,
  };

  for (const arg of args) {
    if (arg.startsWith('--users=')) {
      options.totalUsers = parseInt(arg.split('=')[1], 10) || 100;
    } else if (arg.startsWith('--concurrency=')) {
      options.maxConcurrency = parseInt(arg.split('=')[1], 10) || 12;
    } else if (arg.startsWith('--ramp=')) {
      options.rampUpBatchSize = parseInt(arg.split('=')[1], 10) || 5;
    } else if (arg.startsWith('--target=')) {
      options.baseUrl = arg.split('=')[1].replace(/\/$/, '');
    } else if (arg === '--headed') {
      options.headless = false;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();

  console.log(`=======================================================`);
  console.log(`   IPT COURSE · SIMULADOR DE ESTRÉS Y ANÁLISIS E2E   `);
  console.log(`   Ingeniería de Clase AA+ · 100 Usuarios Sintéticos   `);
  console.log(`=======================================================`);
  console.log(`Configuración:`);
  console.log(`  - Usuarios Objetivo: ${options.totalUsers}`);
  console.log(`  - Concurrencia Máx:  ${options.maxConcurrency}`);
  console.log(`  - Lote Inicial Ramp: ${options.rampUpBatchSize}`);
  console.log(`  - URL Objetivo:      ${options.baseUrl}`);
  console.log(`  - Modo Headless:     ${options.headless}`);

  const personas = generatePersonas(options.totalUsers);

  let successCount = 0;
  let failureCount = 0;

  const results = await runOrchestratedSimulation(
    personas,
    options,
    (completed, total, latest) => {
      if (latest.success) successCount++;
      else failureCount++;
      const pct = Math.round((completed / total) * 100);
      process.stdout.write(
        `\rProgreso: [${completed}/${total}] (${pct}%) | ✅ Éxito: ${successCount} | ❌ Fallas: ${failureCount} | Último: ${latest.personaId} (${latest.totalDurationMs}ms)   `
      );
    }
  );

  console.log('\n\n📊 Compilando métricas cuantitativas y análisis estadístico...');
  const summary = compileMetrics(results, options.baseUrl, startedAt, options.totalUsers);

  // Guardar estrictamente dentro de D:\My Apps\IPT Course\stress-harness\results
  const outputDir = path.resolve(__dirname, '..', 'results');
  const reportPaths = saveReports(summary, results, outputDir);

  console.log(`\n=======================================================`);
  console.log(`               RESUMEN CUANTITATIVO                    `);
  console.log(`=======================================================`);
  console.log(`Usuarios Completados:    ${summary.totalCompletedUsers} / ${summary.totalUsersTarget}`);
  console.log(`Tasa de Éxito Global:    ${summary.successRatePercent}%`);
  console.log(`Throughput Global:       ${summary.overallThroughputUsersPerSec} usuarios/seg`);
  console.log(`Tiempo Total Simulación: ${summary.totalDurationSec}s`);
  console.log(`-------------------------------------------------------`);
  console.log(`Latencia Mediana (p50):  ${summary.overallLatencyStats.p50Ms} ms`);
  console.log(`Latencia Percentil 95:   ${summary.overallLatencyStats.p95Ms} ms`);
  console.log(`Latencia Percentil 99:   ${summary.overallLatencyStats.p99Ms} ms`);
  console.log(`Latencia Mín / Máx:      ${summary.overallLatencyStats.minMs} ms / ${summary.overallLatencyStats.maxMs} ms`);
  console.log(`Desviación Estándar:     ${summary.overallLatencyStats.stdDevMs} ms`);
  console.log(`-------------------------------------------------------`);
  console.log(`Desglose por Etapa (Promedio / p95):`);
  for (const [step, data] of Object.entries(summary.stepBreakdown)) {
    console.log(`  - ${step.padEnd(20)}: Avg: ${String(data.avgDurationMs).padStart(5)}ms | p95: ${String(data.p95Ms).padStart(5)}ms | Éxitos: ${data.successCount}/${data.count}`);
  }
  console.log(`-------------------------------------------------------`);
  console.log(`📁 Reportes Guardados:`);
  console.log(`  - Dashboard HTML: ${reportPaths.htmlPath}`);
  console.log(`  - Archivo JSON:   ${reportPaths.jsonPath}`);
  console.log(`  - Archivo CSV:    ${reportPaths.csvPath}`);
  console.log(`=======================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Error crítico durante la simulación:', err);
  process.exit(1);
});
