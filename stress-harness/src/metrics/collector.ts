import fs from 'node:fs';
import path from 'node:path';
import {
  UserSimulationResult,
  StressRunSummary,
  StepName,
  StepAggregate,
} from '../types/index.js';

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export function compileMetrics(
  results: UserSimulationResult[],
  targetBaseUrl: string,
  startedAt: string,
  totalUsersTarget: number
): StressRunSummary {
  const finishedAt = new Date().toISOString();
  const startTimeMs = new Date(startedAt).getTime();
  const totalDurationSec = (Date.now() - startTimeMs) / 1000;

  const totalCompletedUsers = results.length;
  const successfulUsers = results.filter((r) => r.success).length;
  const failedUsers = totalCompletedUsers - successfulUsers;
  const successRatePercent =
    totalCompletedUsers > 0
      ? Number(((successfulUsers / totalCompletedUsers) * 100).toFixed(2))
      : 0;

  const totalDurations = results.map((r) => r.totalDurationMs);
  const avgMs =
    totalDurations.length > 0
      ? Math.round(
          totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length
        )
      : 0;
  const minMs = totalDurations.length > 0 ? Math.min(...totalDurations) : 0;
  const maxMs = totalDurations.length > 0 ? Math.max(...totalDurations) : 0;
  const p50Ms = calculatePercentile(totalDurations, 50);
  const p90Ms = calculatePercentile(totalDurations, 90);
  const p95Ms = calculatePercentile(totalDurations, 95);
  const p99Ms = calculatePercentile(totalDurations, 99);
  const stdDevMs = Math.round(calculateStdDev(totalDurations, avgMs));

  const throughput =
    totalDurationSec > 0
      ? Number((totalCompletedUsers / totalDurationSec).toFixed(2))
      : 0;

  // Breakdown por Step
  const stepNames: StepName[] = [
    'REGISTER',
    'LOGIN',
    'HOME_DASHBOARD',
    'COURSE_VIEWER',
    'LESSON_INTERACTION',
  ];

  const stepBreakdown: Record<StepName, StepAggregate> = {} as any;

  for (const step of stepNames) {
    const allStepMetrics = results
      .flatMap((r) => r.steps)
      .filter((s) => s.step === step);
    const successMetrics = allStepMetrics.filter((s) => s.success);
    const failureMetrics = allStepMetrics.filter((s) => !s.success);
    const durations = allStepMetrics.map((s) => s.durationMs);

    const stepAvg =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    stepBreakdown[step] = {
      step,
      count: allStepMetrics.length,
      successCount: successMetrics.length,
      failureCount: failureMetrics.length,
      avgDurationMs: stepAvg,
      minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
      maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
      p50Ms: calculatePercentile(durations, 50),
      p90Ms: calculatePercentile(durations, 90),
      p95Ms: calculatePercentile(durations, 95),
      p99Ms: calculatePercentile(durations, 99),
    };
  }

  // Lista de fallas
  const failures: StressRunSummary['failures'] = [];
  for (const res of results) {
    for (const step of res.steps) {
      if (!step.success && step.errorMessage) {
        failures.push({
          personaId: res.personaId,
          email: res.email,
          step: step.step,
          errorMessage: step.errorMessage,
        });
      }
    }
  }

  return {
    targetBaseUrl,
    startedAt,
    finishedAt,
    totalDurationSec: Number(totalDurationSec.toFixed(2)),
    totalUsersTarget,
    totalCompletedUsers,
    successfulUsers,
    failedUsers,
    successRatePercent,
    overallThroughputUsersPerSec: throughput,
    overallLatencyStats: {
      avgMs,
      minMs,
      maxMs,
      p50Ms,
      p90Ms,
      p95Ms,
      p99Ms,
      stdDevMs,
    },
    stepBreakdown,
    failures,
  };
}

export function saveReports(
  summary: StressRunSummary,
  results: UserSimulationResult[],
  outputDir: string
): { jsonPath: string; csvPath: string; htmlPath: string } {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. JSON
  const jsonPath = path.join(outputDir, 'metrics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');

  // 2. CSV
  const csvPath = path.join(outputDir, 'summary.csv');
  const csvLines: string[] = [
    'PersonaId,Email,Archetype,Success,TotalDurationMs,RegisterMs,LoginMs,HomeMs,CourseMs,LessonMs,Errors',
  ];

  for (const r of results) {
    const getStepDuration = (stepName: StepName) =>
      r.steps.find((s) => s.step === stepName)?.durationMs ?? '';
    const errText = r.errors.join(' | ').replace(/,/g, ';');
    csvLines.push(
      [
        r.personaId,
        r.email,
        r.archetype,
        r.success ? 'TRUE' : 'FALSE',
        r.totalDurationMs,
        getStepDuration('REGISTER'),
        getStepDuration('LOGIN'),
        getStepDuration('HOME_DASHBOARD'),
        getStepDuration('COURSE_VIEWER'),
        getStepDuration('LESSON_INTERACTION'),
        `"${errText}"`,
      ].join(',')
    );
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  // 3. HTML Dashboard
  const htmlPath = path.join(outputDir, 'report.html');
  const htmlContent = generateHtmlReport(summary);
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  return { jsonPath, csvPath, htmlPath };
}

function generateHtmlReport(s: StressRunSummary): string {
  const stepsRows = Object.values(s.stepBreakdown)
    .map(
      (b) => `
    <tr>
      <td style="font-weight: 600; color: #fff;">${b.step}</td>
      <td>${b.count}</td>
      <td style="color: #4ade80;">${b.successCount}</td>
      <td style="color: #f87171;">${b.failureCount}</td>
      <td>${b.avgDurationMs} ms</td>
      <td>${b.p50Ms} ms</td>
      <td>${b.p95Ms} ms</td>
      <td style="color: #c084fc;">${b.p99Ms} ms</td>
    </tr>`
    )
    .join('');

  const failureRows = s.failures
    .slice(0, 20)
    .map(
      (f) => `
    <tr>
      <td style="font-family: monospace; color: #a5b4fc;">${f.personaId}</td>
      <td>${f.email}</td>
      <td style="font-weight: 600;">${f.step}</td>
      <td style="color: #fca5a5; font-size: 12px;">${f.errorMessage}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de Estrés E2E - IPT Course Academy</title>
  <style>
    body {
      margin: 0;
      padding: 32px 24px;
      background: #09090b;
      color: #e4e4e7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(128,82,255,0.15);
      border: 1px solid rgba(128,82,255,0.4);
      color: #c084fc;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 28px;
      margin: 12px 0 6px;
      color: #ffffff;
    }
    .subtitle {
      color: #a1a1aa;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .card {
      background: #121215;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 20px;
    }
    .card-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
    }
    .card-value.highlight {
      color: #8052ff;
    }
    .card-value.success {
      color: #22c55e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      background: #121215;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    th {
      background: #18181b;
      color: #a1a1aa;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 32px 0 12px;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">IPT Engineering AA+ · Stress Simulation</span>
      <h1>Análisis Cuantitativo E2E de Carga y Concurrencia</h1>
      <p class="subtitle">Target: <strong>${s.targetBaseUrl}</strong> | Duración: <strong>${s.totalDurationSec}s</strong> | Fecha: ${s.startedAt}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Usuarios Procesados</div>
        <div class="card-value">${s.totalCompletedUsers} / ${s.totalUsersTarget}</div>
      </div>
      <div class="card">
        <div class="card-title">Tasa de Éxito</div>
        <div class="card-value success">${s.successRatePercent}%</div>
      </div>
      <div class="card">
        <div class="card-title">Throughput</div>
        <div class="card-value highlight">${s.overallThroughputUsersPerSec} usr/s</div>
      </div>
      <div class="card">
        <div class="card-title">Latencia p50 (Mediana)</div>
        <div class="card-value">${s.overallLatencyStats.p50Ms} ms</div>
      </div>
      <div class="card">
        <div class="card-title">Latencia p95</div>
        <div class="card-value">${s.overallLatencyStats.p95Ms} ms</div>
      </div>
      <div class="card">
        <div class="card-title">Latencia p99 (Cola Crítica)</div>
        <div class="card-value" style="color: #f59e0b;">${s.overallLatencyStats.p99Ms} ms</div>
      </div>
    </div>

    <div class="section-title">Desglose por Etapa del Journey de Usuario</div>
    <table>
      <thead>
        <tr>
          <th>Etapa (Step)</th>
          <th>Muestras</th>
          <th>Éxito</th>
          <th>Fallas</th>
          <th>Promedio</th>
          <th>p50</th>
          <th>p95</th>
          <th>p99</th>
        </tr>
      </thead>
      <tbody>
        ${stepsRows}
      </tbody>
    </table>

    ${
      s.failures.length > 0
        ? `
      <div class="section-title" style="color: #f87171;">Muestreo de Errores Detectados (${s.failures.length})</div>
      <table>
        <thead>
          <tr>
            <th>ID Persona</th>
            <th>Email</th>
            <th>Etapa</th>
            <th>Error Diagnosticado</th>
          </tr>
        </thead>
        <tbody>
          ${failureRows}
        </tbody>
      </table>
    `
        : ''
    }
  </div>
</body>
</html>`;
}
