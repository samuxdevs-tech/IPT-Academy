import { chromium, Browser } from 'playwright';
import { UserPersona, UserSimulationResult, HarnessOptions } from '../types/index.js';
import { runUserJourney } from '../runners/userJourneyRunner.js';

export async function runOrchestratedSimulation(
  personas: UserPersona[],
  options: HarnessOptions,
  onProgress?: (completed: number, total: number, latestResult: UserSimulationResult) => void
): Promise<UserSimulationResult[]> {
  const results: UserSimulationResult[] = [];

  console.log(`\n🚀 [Orquestador IPT Stress] Iniciando simulación de ${personas.length} usuarios`);
  console.log(`🌐 Target: ${options.baseUrl}`);
  console.log(`⚙️  Modo: Rampa Progresiva (Inicial: ${options.rampUpBatchSize}, Máx Concurrencia: ${options.maxConcurrency})\n`);

  const browser: Browser = await chromium.launch({
    headless: options.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    let currentIndex = 0;
    const total = personas.length;

    // Fase 1: Calentamiento / Lote inicial pequeño (ej. 5)
    // Fase 2: Rampa progresiva hasta maxConcurrency (10-15)
    let currentBatchSize = Math.min(options.rampUpBatchSize, total);

    while (currentIndex < total) {
      const batchPersonas = personas.slice(currentIndex, currentIndex + currentBatchSize);
      console.log(`▶️ Ejecutando lote de ${batchPersonas.length} usuarios concurrentes (Usuarios ${currentIndex + 1} a ${currentIndex + batchPersonas.length} de ${total})...`);

      const batchPromises = batchPersonas.map(async (persona) => {
        const res = await runUserJourney(browser, persona, options.baseUrl);
        results.push(res);
        if (onProgress) {
          onProgress(results.length, total, res);
        }
        return res;
      });

      await Promise.all(batchPromises);
      currentIndex += batchPersonas.length;

      // Escalar tamaño de lote hacia la concurrencia máxima de forma controlada
      if (currentBatchSize < options.maxConcurrency) {
        currentBatchSize = Math.min(currentBatchSize + 5, options.maxConcurrency);
      }

      // Pequeña pausa estocástica entre lotes para asentar conexiones TCP
      if (currentIndex < total) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return results;
}
