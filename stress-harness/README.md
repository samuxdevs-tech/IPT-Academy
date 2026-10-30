# IPT Course · Banco de Simulación Cuantitativa y Estrés E2E (AA+)

Arnés de ingeniería de pruebas de carga y simulación de usuarios reales para la plataforma **IPT Course Academy** (`https://academy.iptapps.com`), construido bajo los estándares de rigor de la rúbrica **AA+** (`aa-product-engineering` y `webapp-testing`).

---

## 🏗️ Arquitectura del Sistema

```
stress-harness/
├── src/
│   ├── types/               # Contratos e interfaces TypeScript estrictas
│   │   └── index.ts
│   ├── generators/          # Generador estocástico de personas hispanohablantes
│   │   └── personas.ts
│   ├── runners/             # Runner de Journey del estudiante en Playwright
│   │   └── userJourneyRunner.ts
│   ├── orchestrator/        # Motor de rampa progresiva (Ramp-up)
│   │   └── rampUp.ts
│   ├── metrics/             # Compilador estadístico (p50, p95, p99, throughput)
│   │   └── collector.ts
│   ├── cleanup/             # Manifiesto y rutina de limpieza de usuarios
│   │   └── purgeUsers.ts
│   └── index.ts             # CLI principal ejecutable
├── results/                 # Salida de métricas (JSON, CSV, HTML Dashboard)
├── package.json
└── tsconfig.json
```

---

## 🚀 Comandos de Ejecución

### 1. Prueba de Muestreo Rápido (5 Usuarios)
```bash
npm run test:sample
```
o con parámetros directos:
```bash
npx tsx src/index.ts --users=5 --concurrency=2
```

### 2. Simulación Completa de 100 Usuarios con Rampa Progresiva
```bash
npm run test:full
```
o personalizado:
```bash
npx tsx src/index.ts --users=100 --concurrency=12 --ramp=5 --target=https://academy.iptapps.com
```

### 3. Generar Manifiesto de Limpieza
```bash
npm run clean
```

---

## 📊 Métricas Cuantitativas Generadas
* **Throughput:** Usuarios y solicitudes completadas por segundo.
* **Tasa de Éxito:** Porcentaje de recorridos completados sin error.
* **Percentiles de Latencia:** p50 (mediana), p90, p95, p99 (cola crítica) y desviación estándar.
* **Desglose por Etapa (Step Breakdown):** Registro, Login, Dashboard de Estudiante, Aula Virtual y Simulación de Lección.
* **Entregables:**
  - `results/report.html`: Dashboard visual interactivo.
  - `results/metrics.json`: Resumen estadístico estructurado para CI/CD.
  - `results/summary.csv`: Tiempos individuales y errores por cada una de las personas simuladas.
