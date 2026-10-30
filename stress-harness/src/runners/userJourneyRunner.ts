import { Browser, BrowserContext, Page } from 'playwright';
import { UserPersona, StepMetric, UserSimulationResult, StepName } from '../types/index.js';

export async function runUserJourney(
  browser: Browser,
  persona: UserPersona,
  baseUrl: string,
  timeoutMs: number = 25000
): Promise<UserSimulationResult> {
  const result: UserSimulationResult = {
    personaId: persona.id,
    email: persona.email,
    archetype: persona.profileArchetype,
    totalDurationMs: 0,
    success: false,
    steps: [],
    errors: [],
  };

  const journeyStart = Date.now();
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const measureStep = async (step: StepName, action: (p: Page) => Promise<void>): Promise<boolean> => {
    const startedAt = Date.now();
    const metric: StepMetric = {
      step,
      startedAt,
      endedAt: 0,
      durationMs: 0,
      success: false,
    };

    try {
      if (!page) throw new Error('Page not initialized');
      await action(page);
      metric.success = true;
      metric.endedAt = Date.now();
      metric.durationMs = metric.endedAt - metric.startedAt;
      result.steps.push(metric);
      return true;
    } catch (err: any) {
      metric.endedAt = Date.now();
      metric.durationMs = metric.endedAt - metric.startedAt;
      metric.errorMessage = err?.message || String(err);
      result.steps.push(metric);
      result.errors.push(`[${step}] ${metric.errorMessage}`);
      return false;
    }
  };

  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: `IPT-StressBot/1.0 (Windows NT 10.0; Win64; x64) Persona/${persona.id}`,
    });

    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    // ==========================================
    // STEP 1: REGISTRO DE CUENTA
    // ==========================================
    let alreadyRegistered = false;

    await measureStep('REGISTER', async (p) => {
      await p.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });

      const textInputs = p.locator('form input[type="text"]:visible');
      const emailInput = p.locator('form input[type="email"]:visible');
      const passInput = p.locator('form input[type="password"]:visible');
      const checkboxes = p.locator('input[type="checkbox"]:visible');
      const submitBtn = p.locator('button[type="submit"]:visible');

      await textInputs.nth(0).fill(persona.firstName);
      await textInputs.nth(1).fill(persona.lastName);
      await emailInput.fill(persona.email);
      await passInput.fill(persona.password);

      const cbCount = await checkboxes.count();
      for (let c = 0; c < cbCount; c++) {
        await checkboxes.nth(c).check().catch(() => {});
      }

      await submitBtn.click();

      // Esperar navegación SPA cliente o detección de error si ya existe
      try {
        await p.waitForFunction(() => !window.location.pathname.includes('/register'), { timeout: 6000 });
      } catch {
        const errorText = await p.locator('.text-white, .leading-relaxed, [class*="AlertCircle"]').innerText().catch(() => '');
        if (
          errorText.toLowerCase().includes('registrado') ||
          errorText.toLowerCase().includes('already') ||
          errorText.toLowerCase().includes('in-use') ||
          errorText.toLowerCase().includes('existe')
        ) {
          alreadyRegistered = true;
        }
      }
    });

    // ==========================================
    // STEP 2: INICIO DE SESIÓN (LOGIN)
    // ==========================================
    await measureStep('LOGIN', async (p) => {
      const isAlreadyOnApp = await p.evaluate(
        () => !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')
      );

      if (!isAlreadyOnApp || alreadyRegistered) {
        await p.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

        const emailInput = p.locator('form input[type="email"]:visible').first();
        const passInput = p.locator('form input[type="password"]:visible').first();
        const checkboxes = p.locator('input[type="checkbox"]:visible');
        const submitBtn = p.locator('button[type="submit"]:visible').first();

        await emailInput.fill(persona.email);
        await passInput.fill(persona.password);

        const cbCount = await checkboxes.count();
        for (let c = 0; c < cbCount; c++) {
          await checkboxes.nth(c).check().catch(() => {});
        }

        await submitBtn.click();
        await p.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 }).catch(() => {});
      } else {
        // Sesión establecida correctamente tras el registro
        await p.waitForTimeout(300);
      }
    });

    // ==========================================
    // STEP 3: HOME DASHBOARD
    // ==========================================
    await measureStep('HOME_DASHBOARD', async (p) => {
      await p.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.body && document.body.innerText.length > 50, { timeout: 8000 });
      await p.waitForTimeout(Math.min(persona.jitterFactorMs, 1000));
    });

    // ==========================================
    // STEP 4: COURSE VIEWER
    // ==========================================
    await measureStep('COURSE_VIEWER', async (p) => {
      await p.goto(`${baseUrl}/course`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.body && document.body.innerText.length > 50, { timeout: 8000 });
      await p.waitForTimeout(500);
    });

    // ==========================================
    // STEP 5: LESSON INTERACTION
    // ==========================================
    await measureStep('LESSON_INTERACTION', async (p) => {
      await p.evaluate(() => window.scrollBy(0, 350));
      await p.waitForTimeout(Math.min(persona.jitterFactorMs, 1200));
    });

    const successSteps = result.steps.filter((s) => s.success).length;
    result.success = successSteps >= 4;
  } catch (globalErr: any) {
    result.errors.push(`[GLOBAL] ${globalErr?.message || String(globalErr)}`);
    result.success = false;
  } finally {
    result.totalDurationMs = Date.now() - journeyStart;
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }

  return result;
}
