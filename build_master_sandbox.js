const fs = require('fs');
const cheerio = require('cheerio');

console.log("Upgrading Master Sandbox to Dynamic Multi-Mission Engine connected to Firebase RTDB...");

const rawHtml = fs.readFileSync('D:\\My Apps\\Datagan Course\\tecnogan.html', 'utf8');
const $ = cheerio.load(rawHtml);

// 1. Injected custom styles
const customSimulatorStyles = `
<style id="simulator-custom-styles">
  #persistent-sandbox-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    z-index: 9999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    box-sizing: border-box;
  }
  
  .banner-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .banner-tag {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.35);
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .banner-select {
    background: rgba(255,255,255,0.18);
    color: #ffffff;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 700;
    outline: none;
    cursor: pointer;
    max-width: 200px;
  }
  .banner-select option {
    background: #1e3a8a;
    color: #ffffff;
  }
  .banner-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
  }
  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .banner-btn-verify {
    background: #10b981;
    color: #ffffff;
    border: 1px solid #059669;
    padding: 5px 14px;
    border-radius: 7px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .banner-btn-verify:hover {
    background: #059669;
    transform: translateY(-1px);
  }
  .banner-btn-surrender {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 5px 12px;
    border-radius: 7px;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.15s ease;
  }
  .banner-btn-surrender:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  .banner-btn-home {
    background: #ffffff;
    color: #1e40af;
    padding: 5px 12px;
    border-radius: 7px;
    text-decoration: none;
    font-weight: 700;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
  }
  .banner-btn-home:hover {
    background: #f1f5f9;
  }

  @media (max-width: 768px) {
    #persistent-sandbox-banner {
      height: 46px;
      padding: 0 8px;
    }
    .banner-title {
      display: none;
    }
    .banner-select {
      max-width: 130px;
      font-size: 10px;
    }
    .banner-btn-verify, .banner-btn-surrender, .banner-btn-home {
      font-size: 11px;
      padding: 4px 8px;
    }
  }

  body {
    padding-top: 48px !important;
    box-sizing: border-box !important;
  }

  header.header {
    height: 70px !important;
    min-height: 70px !important;
    max-height: 70px !important;
    position: relative !important;
  }

  aside.sidebar {
    top: 48px !important;
    height: calc(100vh - 48px) !important;
  }

  /* Modal Styling */
  .sim-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    z-index: 99999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: simFadeIn 0.2s ease-out;
  }
  .sim-modal-dialog {
    background: #ffffff;
    border-radius: 1.25rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 520px;
    width: 100%;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    animation: simSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes simFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes simSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Simulator Card & Badges */
  .sim-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }
  .sim-input {
    width: 100%;
    padding: 0.65rem 0.9rem;
    border-radius: 0.75rem;
    border: 1px solid #cbd5e1;
    background-color: #f8fafc;
    color: #0f172a;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .sim-input:focus {
    border-color: #196e6c;
    box-shadow: 0 0 0 3px rgba(25, 110, 108, 0.15);
    background-color: #ffffff;
  }
  .sim-btn-primary {
    background-color: #196e6c;
    color: #ffffff;
    font-weight: 600;
    padding: 0.65rem 1.25rem;
    border-radius: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    border: none;
  }
  .sim-btn-primary:hover { background-color: #155e5c; }
  .sim-btn-secondary {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 600;
    padding: 0.65rem 1.1rem;
    border-radius: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    border: 1px solid #e2e8f0;
  }
  .sim-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .sim-badge-success { background-color: #dcfce7; color: #166534; }
  .sim-badge-info { background-color: #e0f2fe; color: #075985; }
  .sim-badge-warning { background-color: #fef3c7; color: #92400e; }
  .sim-badge-neutral { background-color: #f1f5f9; color: #475569; }
  .sidebar-link-active {
    background-color: rgba(255, 255, 255, 0.18) !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    border-left: 3px solid #38bdf8 !important;
  }
</style>
`;

$('head').append(customSimulatorStyles);

// 2. Banner HTML with Dynamic Mission Selector
const bannerHtml = `
<div id="persistent-sandbox-banner">
  <div class="banner-left">
    <span class="banner-tag">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
      Misión
    </span>
    <select id="sandbox-mission-select" onchange="window.simulator.changeMission(this.value)" class="banner-select">
      <option value="mision-1">M1: Nacimientos</option>
      <option value="mision-2">M2: Pesaje / GDP</option>
      <option value="mision-3">M3: Potreros / Aforo</option>
    </select>
    <span id="banner-mission-title" class="banner-title">
      Registro de Nacimiento &bull; Vaca Mariposa (V-101)
    </span>
  </div>
  <div class="banner-actions">
    <button onclick="window.simulator.verifyActiveMission()" class="banner-btn-verify" title="Verificar si cumpliste la tarea en el simulador">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Comprobar
    </button>
    <button onclick="window.simulator.surrenderActiveMission()" class="banner-btn-surrender" title="Ver la solución guiada de esta misión">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      Rendirse
    </button>
    <a href="https://datagan-course.web.app" class="banner-btn-home" title="Salir al aula virtual">
      Volver al Aula &rarr;
    </a>
  </div>
</div>
`;

$('body').prepend(bannerHtml);

// 3. Prepare <main>
const main = $('main').first();
const originalDashboardHtml = main.html();

main.html(`
  <div id="dashboard-view" class="w-full">
    ${originalDashboardHtml}
  </div>
  <div id="module-workspace" class="w-full" style="display: none;">
    <!-- Injected dynamically by engine -->
  </div>
`);

// 4. Simulator Engine with Dynamic Mission Resolution
const engineScript = `
<script id="simulator-engine-script">
(function() {
  console.log("Datagan Universal Simulator Engine with Dynamic Missions initializing...");

  const SEED_ANIMALES = [
    { id: "V-101", nombre: "Mariposa", raza: "Holstein", sexo: "Hembra", categoria: "Vaca en Ordeño", lote: "Lote Leche A", potrero: "El Mango", peso: 485, estado: "Activo" },
    { id: "V-102", nombre: "Paloma", raza: "Gyr Lechero", sexo: "Hembra", categoria: "Vaca en Ordeño", lote: "Lote Leche A", potrero: "El Mango", peso: 450, estado: "Activo" },
    { id: "V-103", nombre: "Gitana", raza: "Girolando", sexo: "Hembra", categoria: "Vaca en Ordeño", lote: "Lote Leche A", potrero: "El Mango", peso: 510, estado: "Activo" },
    { id: "T-201", nombre: "Faraón", raza: "Brahman Rojo", sexo: "Macho", categoria: "Toro Reproductor", lote: "Lote Reproductores", potrero: "La Sabana", peso: 790, estado: "Activo" },
    { id: "N-301", nombre: "Novillo 301", raza: "Brahman Blanco", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 395, estado: "Activo" },
    { id: "N-302", nombre: "Novillo 302", raza: "Brahman Comercial", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 410, estado: "Activo" },
    { id: "N-303", nombre: "Novillo 303", raza: "Brangus", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 425, estado: "Activo" },
    { id: "N-304", nombre: "Novillo 304", raza: "Brahman Blanco", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 380, estado: "Activo" },
    { id: "N-305", nombre: "Novillo 305", raza: "Sanmartinero x Br", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 405, estado: "Activo" },
    { id: "N-306", nombre: "Novillo 306", raza: "Brahman Comercial", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 390, estado: "Activo" },
    { id: "N-307", nombre: "Novillo 307", raza: "Simmental x Br", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 435, estado: "Activo" },
    { id: "N-308", nombre: "Novillo 308", raza: "Brahman Rojo", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 375, estado: "Activo" },
    { id: "N-309", nombre: "Novillo 309", raza: "Brahman Comercial", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 420, estado: "Activo" },
    { id: "N-310", nombre: "Novillo 310", raza: "Brahman Blanco", sexo: "Macho", categoria: "Novillo Ceba", lote: "Lote Ceba Intensiva", potrero: "El Cedro", peso: 415, estado: "Activo" },
    { id: "V-104", nombre: "Lucera", raza: "Brahman", sexo: "Hembra", categoria: "Vaca Horra / Cría", lote: "Lote Cría", potrero: "La Ceiba", peso: 520, estado: "Gestante" },
    { id: "CR-401", nombre: "Ternero 401", raza: "Girolando", sexo: "Hembra", categoria: "Cría / Ternera", lote: "Lote Terneraje", potrero: "El Guayabo", peso: 110, estado: "Activo" },
    { id: "CR-402", nombre: "Ternero 402", raza: "Gyr x Holstein", sexo: "Macho", categoria: "Cría / Ternero", lote: "Lote Terneraje", potrero: "El Guayabo", peso: 95, estado: "Activo" },
    { id: "CR-403", nombre: "Ternero 403", raza: "Brahman", sexo: "Hembra", categoria: "Cría / Ternera", lote: "Lote Terneraje", potrero: "El Guayabo", peso: 120, estado: "Activo" },
    { id: "CR-404", nombre: "Ternero 404", raza: "Brahman", sexo: "Macho", categoria: "Cría / Ternero", lote: "Lote Terneraje", potrero: "El Guayabo", peso: 105, estado: "Activo" },
    { id: "CR-405", nombre: "Ternero 405", raza: "Brahman Rojo", sexo: "Hembra", categoria: "Cría / Ternera", lote: "Lote Terneraje", potrero: "El Guayabo", peso: 115, estado: "Activo" }
  ];

  const SEED_POTREROS = [
    { id: "POT-1", nombre: "El Mango", area: 14, pasto: "Brachiaria decumbens", capacidad: 22, ocupacion: "18 UGM", estado: "Ocupado", diasOcupado: 8 },
    { id: "POT-2", nombre: "La Ceiba", area: 10, pasto: "Guinea Mombaza", capacidad: 18, ocupacion: "0 UGM", estado: "Descanso", diasOcupado: 16 },
    { id: "POT-3", nombre: "El Cedro", area: 18, pasto: "Brachiaria brizantha", capacidad: 28, ocupacion: "24 UGM", estado: "Ocupado", diasOcupado: 5 },
    { id: "POT-4", nombre: "La Sabana", area: 22, pasto: "Puntero / Jaragua", capacidad: 30, ocupacion: "15 UGM", estado: "Ocupado", diasOcupado: 12 },
    { id: "POT-5", nombre: "El Guayabo", area: 8, pasto: "Estrella Africana", capacidad: 14, ocupacion: "6 UGM", estado: "Ocupado", diasOcupado: 4 },
    { id: "POT-6", nombre: "Las Palmas", area: 12, pasto: "Brachiaria humidicola", capacidad: 20, ocupacion: "0 UGM", estado: "Descanso", diasOcupado: 24 }
  ];

  const SEED_NACIMIENTOS = [
    { id: "NAC-1", terneroId: "CR-402", madreId: "V-102", padreId: "T-201", sexo: "Macho", peso: 38, fecha: "2026-08-22", tipo: "Parto Normal", obs: "Madre con buena ubre" },
    { id: "NAC-2", terneroId: "CR-403", madreId: "V-103", padreId: "T-201", sexo: "Hembra", peso: 32, fecha: "2026-09-04", tipo: "Parto Asistido", obs: "Ternero asistido con calostro" },
    { id: "NAC-3", terneroId: "CR-404", madreId: "V-104", padreId: "T-201", sexo: "Macho", peso: 36, fecha: "2026-09-18", tipo: "Parto Normal", obs: "Sin novedades clínicas" }
  ];

  const SEED_PESAJE = [
    { id: "PES-1", animalId: "N-301", pesoAnterior: 370, pesoActual: 395, ganancia: 25, dias: 30, gdp: 833, fecha: "2026-10-01" },
    { id: "PES-2", animalId: "N-302", pesoAnterior: 388, pesoActual: 410, ganancia: 22, dias: 30, gdp: 733, fecha: "2026-10-01" },
    { id: "PES-3", animalId: "N-303", pesoAnterior: 401, pesoActual: 425, ganancia: 24, dias: 30, gdp: 800, fecha: "2026-10-01" }
  ];

  const SEED_LECHE = [
    { id: "LEC-1", vacaId: "V-101", fecha: "2026-10-09", manana: 10.5, tarde: 8.0, total: 18.5, novedad: "Normal" },
    { id: "LEC-2", vacaId: "V-102", fecha: "2026-10-09", manana: 8.2, tarde: 6.5, total: 14.7, novedad: "Normal" },
    { id: "LEC-3", vacaId: "V-103", fecha: "2026-10-09", manana: 9.0, tarde: 6.0, total: 15.0, novedad: "Normal" }
  ];

  const SEED_VETERINARIA = [
    { id: "VET-1", animalId: "V-102", diagnostico: "Mastitis subclínica cuarto posterior", medicamento: "Cefalosporina Intramamaria", dosis: "1 jeringa c/24h", via: "Intramamaria", retiro: "3 días", fecha: "2026-10-05", estado: "En recuperación" },
    { id: "VET-2", animalId: "N-305", diagnostico: "Tratamiento preventivo parásitos", medicamento: "Ivermectina al 1%", dosis: "8 ml", via: "Subcutánea", retiro: "28 días carne", fecha: "2026-09-28", estado: "Tratado" }
  ];

  const SEED_LOTES = [
    { id: "LOT-1", nombre: "Lote Leche A", proposito: "Producción Lechera", animales: 3, potrero: "El Mango", lider: "Vaquero Juan" },
    { id: "LOT-2", nombre: "Lote Ceba Intensiva", proposito: "Ceba y Engorde", animales: 10, potrero: "El Cedro", lider: "Capataz Pedro" }
  ];

  const SEED_INVENTARIO = [
    { id: "INV-1", nombre: "Sal Mineralizada al 8%", categoria: "Nutrición", stock: 35, unidad: "Bultos (50 kg)", costoUnitario: 95000, ubicacion: "Bodega Principal" },
    { id: "INV-2", nombre: "Melaza de Caña", categoria: "Nutrición", stock: 4, unidad: "Tambores (200 L)", costoUnitario: 340000, ubicacion: "Bodega Principal" }
  ];

  const SEED_VENTAS = [
    { id: "VEN-1", concepto: "Venta 4 Novillos Ceba en pie", cliente: "Frigorífico del Caribe", cantidad: "1.840 kg", precioKg: 8300, total: 15272000, fecha: "2026-09-30", estado: "Cobrado" }
  ];

  // Default missions in case Firebase is loading
  const FALLBACK_MISSIONS = [
    {
      id: "mision-1",
      order: 1,
      title: "Registro de Nacimiento • Vaca Mariposa (V-101)",
      category: "Salud & Reproducción",
      targetModule: "nacimiento",
      summary: "Inscribe la cría de la vaca V-101 con chapeta y peso.",
      storageKey: "datagan_sim_nacimientos",
      rules: [
        { field: "madreId", operator: "equals", value: "V-101", label: "Madre V-101" },
        { field: "peso", operator: "greater_than", value: "25", label: "Peso > 25 kg" }
      ],
      solutionSteps: [
        "Abre el menú en Salud & Vida > Nacimientos.",
        "Haz clic en 'Nuevo Registro'.",
        "Ingresa Ternero: CR-406, Madre: V-101, Sexo: Hembra, Peso: 35 kg.",
        "Guarda y pulsa 'Comprobar'."
      ],
      autoFillPayload: { terneroId: "CR-406", madreId: "V-101", padreId: "T-201", sexo: "Hembra", peso: 35, obs: "Parto normal" }
    },
    {
      id: "mision-2",
      order: 2,
      title: "Control Ponderal y GDP • Novillo N-301",
      category: "Producción & Ceba",
      targetModule: "pesaje",
      summary: "Registra pesaje mensual para calcular la ganancia diaria.",
      storageKey: "datagan_sim_pesaje",
      rules: [
        { field: "animalId", operator: "equals", value: "N-301", label: "Animal N-301" },
        { field: "pesoActual", operator: "greater_than", value: "380", label: "Peso Actual > 380 kg" }
      ],
      solutionSteps: [
        "Dirígete en el menú a Producción > Pesaje.",
        "Pulsa 'Nuevo Registro'.",
        "Ingresa Animal: N-301, Peso Ant: 370 kg, Peso Act: 395 kg, Días: 30.",
        "Guarda y pulsa 'Comprobar'."
      ],
      autoFillPayload: { animalId: "N-301", pesoAnterior: 370, pesoActual: 395, dias: 30, gdp: 833 }
    },
    {
      id: "mision-3",
      order: 3,
      title: "Planificación de Pastoreo • La Loma",
      category: "Pastos & Aforo",
      targetModule: "potreros",
      summary: "Registra un potrero nuevo de 15 Ha con aforo de 25 UGM.",
      storageKey: "datagan_sim_potreros",
      rules: [
        { field: "nombre", operator: "includes", value: "Loma", label: "Nombre La Loma" },
        { field: "area", operator: "greater_than", value: "10", label: "Área > 10 Ha" }
      ],
      solutionSteps: [
        "Dirígete en el menú a Potreros.",
        "Pulsa 'Nuevo Registro'.",
        "Código: POT-7, Nombre: La Loma, Área: 15 Ha, Pasto: Brachiaria brizantha, Capacidad: 25 UGM.",
        "Guarda y pulsa 'Comprobar'."
      ],
      autoFillPayload: { id: "POT-7", nombre: "La Loma", area: 15, pasto: "Brachiaria brizantha", capacidad: 25, estado: "Descanso" }
    }
  ];

  let currentMissions = [...FALLBACK_MISSIONS];
  let activeMission = currentMissions[0];

  const MODULES_CONFIG = {
    animales: { title: "Gestión de Hato Bovino", subtitle: "Inventario individual y perfiles genealógicos", breadcrumb: "Bovinos > Animales", storageKey: "datagan_sim_animales", seed: SEED_ANIMALES, fields: [{ name: "id", label: "Chapeta", type: "text" }, { name: "nombre", label: "Nombre", type: "text" }, { name: "raza", label: "Raza", type: "text" }, { name: "sexo", label: "Sexo", type: "select", options: ["Hembra", "Macho"] }, { name: "categoria", label: "Categoría", type: "select", options: ["Vaca en Ordeño", "Novillo Ceba", "Cría / Ternero", "Toro Reproductor"] }, { name: "peso", label: "Peso (kg)", type: "number" }], columns: [{ key: "id", label: "Chapeta" }, { key: "nombre", label: "Nombre" }, { key: "raza", label: "Raza" }, { key: "peso", label: "Peso", format: v => v + " kg" }, { key: "estado", label: "Estado", badge: true }] },
    potreros: { title: "Gestión de Potreros", subtitle: "Rotación y aforos forrajeros", breadcrumb: "Potreros & Pastos", storageKey: "datagan_sim_potreros", seed: SEED_POTREROS, fields: [{ name: "id", label: "Código", type: "text" }, { name: "nombre", label: "Nombre", type: "text" }, { name: "area", label: "Área (Ha)", type: "number" }, { name: "pasto", label: "Pasto", type: "text" }, { name: "capacidad", label: "Capacidad (UGM)", type: "number" }, { name: "estado", label: "Estado", type: "select", options: ["Ocupado", "Descanso", "Mantenimiento"] }], columns: [{ key: "id", label: "Código" }, { key: "nombre", label: "Potrero" }, { key: "area", label: "Área", format: v => v + " Ha" }, { key: "pasto", label: "Pasto" }, { key: "estado", label: "Estado", badge: true }] },
    nacimiento: { title: "Registro de Nacimientos", subtitle: "Partos y vinculación maternal", breadcrumb: "Salud > Nacimientos", storageKey: "datagan_sim_nacimientos", seed: SEED_NACIMIENTOS, fields: [{ name: "terneroId", label: "Chapeta Cría", type: "text" }, { name: "madreId", label: "ID Madre", type: "text" }, { name: "padreId", label: "ID Padre", type: "text" }, { name: "sexo", label: "Sexo", type: "select", options: ["Hembra", "Macho"] }, { name: "peso", label: "Peso al Nacer (kg)", type: "number" }, { name: "fecha", label: "Fecha", type: "date" }], columns: [{ key: "terneroId", label: "Cría" }, { key: "madreId", label: "Madre" }, { key: "sexo", label: "Sexo" }, { key: "peso", label: "Peso", format: v => v + " kg" }, { key: "fecha", label: "Fecha" }] },
    pesaje: { title: "Control Ponderal y Pesaje", subtitle: "Ganancia Diaria de Peso (GDP)", breadcrumb: "Producción > Pesaje", storageKey: "datagan_sim_pesaje", seed: SEED_PESAJE, fields: [{ name: "animalId", label: "Chapeta Animal", type: "text" }, { name: "pesoAnterior", label: "Peso Ant (kg)", type: "number" }, { name: "pesoActual", label: "Peso Act (kg)", type: "number" }, { name: "dias", label: "Días", type: "number" }, { name: "fecha", label: "Fecha", type: "date" }], columns: [{ key: "animalId", label: "Animal" }, { key: "pesoAnterior", label: "Peso Ant.", format: v => v + " kg" }, { key: "pesoActual", label: "Peso Act.", format: v => v + " kg" }, { key: "gdp", label: "GDP", format: (v, r) => Math.round(((r.pesoActual - r.pesoAnterior) * 1000) / (r.dias || 30)) + " g/día" }] },
    leche: { title: "Control Lechero Diario", subtitle: "Ordeño matutino y vespertino", breadcrumb: "Producción > Leche", storageKey: "datagan_sim_leche", seed: SEED_LECHE, fields: [{ name: "vacaId", label: "Chapeta Vaca", type: "text" }, { name: "manana", label: "Mañana (L)", type: "number" }, { name: "tarde", label: "Tarde (L)", type: "number" }, { name: "fecha", label: "Fecha", type: "date" }], columns: [{ key: "vacaId", label: "Vaca" }, { key: "manana", label: "Mañana" }, { key: "tarde", label: "Tarde" }] },
    veterinaria: { title: "Sanidad Animal", subtitle: "Tratamientos y periodos de retiro", breadcrumb: "Salud > Veterinaria", storageKey: "datagan_sim_veterinaria", seed: SEED_VETERINARIA, fields: [{ name: "animalId", label: "Animal", type: "text" }, { name: "diagnostico", label: "Diagnóstico", type: "text" }, { name: "medicamento", label: "Medicamento", type: "text" }, { name: "dosis", label: "Dosis", type: "text" }, { name: "retiro", label: "Retiro", type: "text" }], columns: [{ key: "animalId", label: "Animal" }, { key: "diagnostico", label: "Diagnóstico" }, { key: "medicamento", label: "Medicamento" }] },
    lotes: { title: "Organización de Lotes", subtitle: "Manejo por categoría zootécnica", breadcrumb: "Manejo > Lotes", storageKey: "datagan_sim_lotes", seed: SEED_LOTES, fields: [{ name: "nombre", label: "Nombre", type: "text" }, { name: "proposito", label: "Propósito", type: "text" }, { name: "animales", label: "Cabezas", type: "number" }], columns: [{ key: "nombre", label: "Lote" }, { key: "proposito", label: "Propósito" }, { key: "animales", label: "Cabezas" }] },
    inventario: { title: "Inventario de Insumos", subtitle: "Bodega, sales y suplementos", breadcrumb: "Finanzas > Inventario", storageKey: "datagan_sim_inventario", seed: SEED_INVENTARIO, fields: [{ name: "nombre", label: "Insumo", type: "text" }, { name: "stock", label: "Stock", type: "number" }, { name: "unidad", label: "Unidad", type: "text" }], columns: [{ key: "nombre", label: "Insumo" }, { key: "stock", label: "Stock" }] },
    ventas: { title: "Comercialización y Ventas", subtitle: "Venta de ganado y subproductos", breadcrumb: "Finanzas > Ventas", storageKey: "datagan_sim_ventas", seed: SEED_VENTAS, fields: [{ name: "concepto", label: "Concepto", type: "text" }, { name: "cliente", label: "Cliente", type: "text" }, { name: "total", label: "Monto ($)", type: "number" }], columns: [{ key: "concepto", label: "Concepto" }, { key: "total", label: "Monto" }] }
  };

  function getModuleData(key, config) {
    const raw = localStorage.getItem(config.storageKey);
    if (!raw) {
      localStorage.setItem(config.storageKey, JSON.stringify(config.seed));
      return config.seed;
    }
    try { return JSON.parse(raw); } catch(e) { return config.seed; }
  }

  function saveModuleData(config, data) {
    localStorage.setItem(config.storageKey, JSON.stringify(data));
  }

  function renderConfiguredModule(moduleKey, config) {
    const data = getModuleData(moduleKey, config);
    const html = \`
      <div class="space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-[#196e6c] mb-1">TecnoGan &bull; \${config.breadcrumb}</div>
            <h1 class="text-2xl font-bold text-slate-800">\${config.title}</h1>
            <p class="text-sm text-slate-500 mt-1">\${config.subtitle}</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.simulator.resetModule('\${moduleKey}')" class="sim-btn-secondary text-xs">Restablecer</button>
            <button onclick="document.getElementById('module-form-card').classList.toggle('hidden')" class="sim-btn-primary text-xs">Nuevo Registro</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="sim-card p-5">
            <div class="text-xs font-bold uppercase text-slate-500 mb-1">Total Registros</div>
            <div class="text-3xl font-black text-slate-900">\${data.length}</div>
          </div>
          <div class="sim-card p-5">
            <div class="text-xs font-bold uppercase text-slate-500 mb-1">Base de Datos</div>
            <div class="text-3xl font-black text-[#196e6c]">Local</div>
          </div>
          <div class="sim-card p-5">
            <div class="text-xs font-bold uppercase text-slate-500 mb-1">Módulo</div>
            <div class="text-xl font-bold text-slate-800 truncate">\${config.breadcrumb}</div>
          </div>
        </div>

        <div id="module-form-card" class="sim-card p-6 hidden">
          <h3 class="font-bold text-slate-800 mb-4">Agregar Nuevo Registro</h3>
          <form onsubmit="window.simulator.submitModule(event, '\${moduleKey}')" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              \${config.fields.map(f => \`
                <div>
                  <label class="block text-xs font-bold uppercase text-slate-500 mb-1">\${f.label}</label>
                  \${f.type === 'select' ? \`
                    <select id="field-\${f.name}" class="sim-input" required>
                      \${f.options.map(opt => \`<option value="\${opt}">\${opt}</option>\`).join('')}
                    </select>
                  \` : \`
                    <input id="field-\${f.name}" type="\${f.type || 'text'}" class="sim-input" required />
                  \`}
                </div>
              \`).join('')}
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="document.getElementById('module-form-card').classList.add('hidden')" class="sim-btn-secondary text-xs">Cancelar</button>
              <button type="submit" class="sim-btn-primary text-xs">Guardar en Simulador</button>
            </div>
          </form>
        </div>

        <div class="sim-card p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
                  \${config.columns.map(col => \`<th class="py-3 px-3">\${col.label}</th>\`).join('')}
                  <th class="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                \${data.map(row => \`
                  <tr class="hover:bg-slate-50/80">
                    \${config.columns.map(col => {
                      let val = row[col.key];
                      if (col.format) val = col.format(val, row);
                      return '<td class="py-3 px-3 text-slate-700 font-medium">' + (val !== undefined ? val : '-') + '</td>';
                    }).join('')}
                    <td class="py-3 px-3 text-right">
                      <button onclick="window.simulator.deleteRow('\${moduleKey}', '\${row.id || row.terneroId || row.animalId}')" class="text-xs text-rose-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    \`;
    const ws = document.getElementById('module-workspace');
    ws.innerHTML = html;
  }

  function navigateTo(moduleKey, label) {
    const dashView = document.getElementById('dashboard-view');
    const modWorkspace = document.getElementById('module-workspace');

    document.querySelectorAll('aside a').forEach(a => a.classList.remove('sidebar-link-active'));
    const matchedLink = document.querySelector('aside a[data-sim-mod="' + moduleKey + '"]');
    if (matchedLink) matchedLink.classList.add('sidebar-link-active');

    const sidebar = document.querySelector('aside.sidebar');
    if (window.innerWidth < 768 && sidebar) sidebar.classList.add('-translate-x-full');

    if (moduleKey === "dashboard" || !moduleKey) {
      modWorkspace.style.display = "none";
      dashView.style.display = "block";
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    dashView.style.display = "none";
    modWorkspace.style.display = "block";

    if (MODULES_CONFIG[moduleKey]) {
      renderConfiguredModule(moduleKey, MODULES_CONFIG[moduleKey]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showModal(contentHtml) {
    const existing = document.getElementById('sim-active-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'sim-active-modal';
    overlay.className = 'sim-modal-overlay';
    overlay.innerHTML = \`<div class="sim-modal-dialog">\${contentHtml}</div>\`;
    document.body.appendChild(overlay);
  }

  function closeModal() {
    const existing = document.getElementById('sim-active-modal');
    if (existing) existing.remove();
  }

  function updateBannerMissionUI() {
    const titleEl = document.getElementById('banner-mission-title');
    const selectEl = document.getElementById('sandbox-mission-select');
    if (titleEl && activeMission) {
      titleEl.innerHTML = \`\${activeMission.title}\`;
    }
    if (selectEl) {
      selectEl.innerHTML = currentMissions.map(m => \`
        <option value="\${m.id}" \${m.id === activeMission.id ? 'selected' : ''}>
          M\${m.order || 1}: \${m.title.split(':')[0]}
        </option>
      \`).join('');
    }
  }

  window.simulator = {
    navigate: navigateTo,
    closeModal: closeModal,

    changeMission: function(missionId) {
      const found = currentMissions.find(m => m.id === missionId);
      if (found) {
        activeMission = found;
        updateBannerMissionUI();
        if (found.targetModule) {
          navigateTo(found.targetModule, found.targetModule);
        }
      }
    },

    verifyActiveMission: function() {
      if (!activeMission) return;
      const targetMod = activeMission.targetModule || 'nacimiento';
      const config = MODULES_CONFIG[targetMod];
      if (!config) return;

      const data = getModuleData(targetMod, config);
      const rules = activeMission.rules || [];

      // Evaluate rules with robust normalization
      const pass = data.some(item => {
        return rules.every(rule => {
          const rawVal = String(item[rule.field] !== undefined ? item[rule.field] : '').trim();
          const rawTarget = String(rule.value !== undefined ? rule.value : '').trim();
          const val = rawVal.toLowerCase();
          const target = rawTarget.toLowerCase();

          if (rule.operator === 'equals') {
            return val === target || val.replace(/[^a-z0-9]/g, '') === target.replace(/[^a-z0-9]/g, '');
          }
          if (rule.operator === 'includes') {
            return val.includes(target) || val.replace(/[^a-z0-9]/g, '').includes(target.replace(/[^a-z0-9]/g, ''));
          }
          if (rule.operator === 'greater_than') {
            const numVal = parseFloat(val.replace(/[^0-9.-]/g, ''));
            const numTarget = parseFloat(target.replace(/[^0-9.-]/g, ''));
            return !isNaN(numVal) && !isNaN(numTarget) && numVal > numTarget;
          }
          if (rule.operator === 'not_empty') {
            return val.length > 0;
          }
          return true;
        });
      });

      if (pass) {
        localStorage.setItem("datagan_" + activeMission.id + "_status", "approved");
        try { window.dispatchEvent(new Event('storage')); } catch(e) {}
        showModal(\`
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 class="text-2xl font-black text-slate-900 mb-2">¡\${activeMission.title} Superada! 🎉</h2>
            <p class="text-sm text-slate-600 mb-6 leading-relaxed">
              Has cumplido todas las condiciones requeridas para este reto zootécnico en TecnoGan.
              <br><br>
              Tu competencia práctica ha sido registrada con éxito.
            </p>
            <div class="flex flex-col sm:flex-row gap-3">
              <button onclick="window.simulator.closeModal()" class="sim-btn-secondary flex-1 justify-center py-3 text-xs">Seguir Practicando</button>
              <a href="https://datagan-course.web.app" class="sim-btn-primary flex-1 justify-center py-3 text-xs text-center">Volver al Aula Virtual &rarr;</a>
            </div>
          </div>
        \`);
      } else {
        const rulesListHtml = rules.map(r => \`<li class="text-slate-600"><strong>\${r.label || r.field}:</strong> debe cumplir \${r.operator === 'equals' ? '=' : r.operator === 'greater_than' ? '>' : 'contener'} \${r.value}</li>\`).join('');
        showModal(\`
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-2">Misión Pendiente de Verificación</h2>
            <p class="text-sm text-slate-600 mb-4 leading-relaxed">
              Aún no se encontró en el módulo <strong>\${targetMod.toUpperCase()}</strong> un registro que cumpla todos los criterios:
            </p>
            <ul class="text-xs text-left bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1 mb-5">
              \${rulesListHtml}
            </ul>
            <div class="flex flex-col gap-2.5">
              <button onclick="window.simulator.autoFillActiveMission()" class="sim-btn-primary w-full justify-center py-3 text-xs">
                ⚡ Autocompletar Caso y Aprobar (Demostración)
              </button>
              <div class="flex gap-2">
                <button onclick="window.simulator.closeModal()" class="sim-btn-secondary flex-1 justify-center py-2.5 text-xs">Reintentar</button>
                <button onclick="window.simulator.navigateTo('\${targetMod}'); window.simulator.closeModal();" class="sim-btn-secondary flex-1 justify-center py-2.5 text-xs text-[#196e6c]">Ir a \${targetMod}</button>
              </div>
            </div>
          </div>
        \`);
      }
    },

    surrenderActiveMission: function() {
      if (!activeMission) return;
      const steps = activeMission.solutionSteps || [];
      showModal(\`
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">Guía de Resolución: \${activeMission.title}</h3>
              <p class="text-xs text-slate-500">Paso a paso para resolver el caso</p>
            </div>
          </div>

          <div class="space-y-2.5 text-xs text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
            \${steps.map((st, i) => \`<p><strong>Paso \${i + 1}:</strong> \${st}</p>\`).join('')}
          </div>

          <div class="flex flex-col gap-2">
            <button onclick="window.simulator.autoFillActiveMission()" class="sim-btn-primary w-full justify-center py-3 text-xs">
              Autocompletar Solución en el Simulador (Modo Demostración)
            </button>
            <button onclick="window.simulator.closeModal()" class="sim-btn-secondary w-full justify-center py-2.5 text-xs">
              Cerrar y Resolver por mi Cuenta
            </button>
          </div>
        </div>
      \`);
    },

    autoFillActiveMission: function() {
      if (!activeMission) return;
      const targetMod = activeMission.targetModule || 'nacimiento';
      const config = MODULES_CONFIG[targetMod];
      if (!config) return;
      const data = getModuleData(targetMod, config);
      const payload = {
        id: "REC-" + Date.now().toString().slice(-5),
        ...(activeMission.autoFillPayload || {})
      };
      data.unshift(payload);
      saveModuleData(config, data);
      closeModal();
      navigateTo(targetMod, targetMod);
      setTimeout(() => {
        alert("✅ Solución cargada en el simulador. Pulsa 'Comprobar' en el banner para verificar.");
      }, 200);
    },

    submitModule: function(e, moduleKey) {
      e.preventDefault();
      const config = MODULES_CONFIG[moduleKey];
      if (!config) return;
      const newRecord = { id: "REC-" + Date.now().toString().slice(-5) };
      config.fields.forEach(f => {
        const el = document.getElementById('field-' + f.name);
        if (el) newRecord[f.name] = el.value;
      });
      const data = getModuleData(moduleKey, config);
      data.unshift(newRecord);
      saveModuleData(config, data);
      renderConfiguredModule(moduleKey, config);
      const card = document.getElementById('module-form-card');
      if (card) card.classList.add('hidden');
    },

    deleteRow: function(moduleKey, id) {
      if (!confirm("¿Eliminar registro local?")) return;
      const config = MODULES_CONFIG[moduleKey];
      let data = getModuleData(moduleKey, config);
      data = data.filter(r => (r.id !== id && r.terneroId !== id && r.animalId !== id));
      saveModuleData(config, data);
      renderConfiguredModule(moduleKey, config);
    },

    resetModule: function(moduleKey) {
      if (!confirm("¿Restablecer datos de muestra?")) return;
      const config = MODULES_CONFIG[moduleKey];
      localStorage.removeItem(config.storageKey);
      renderConfiguredModule(moduleKey, config);
    }
  };

  function setupSidebarInteractions() {
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('aside.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('-translate-x-full');
      });
    }

    document.querySelectorAll('aside a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim().toLowerCase();
      let modKey = "generic";
      if (href.includes('dashboard')) modKey = "dashboard";
      else if (href.includes('animales') || text.includes('animales')) modKey = "animales";
      else if (href.includes('potreros') || text.includes('potreros')) modKey = "potreros";
      else if (href.includes('nacimiento') || text.includes('nacimiento')) modKey = "nacimiento";
      else if (href.includes('pesaje') || text.includes('pesaje')) modKey = "pesaje";
      else if (href.includes('leche') || text.includes('leche')) modKey = "leche";
      else if (href.includes('veterinaria') || text.includes('veterinaria')) modKey = "veterinaria";
      else if (href.includes('lotes') || text.includes('lotes')) modKey = "lotes";
      else if (href.includes('inventario') || text.includes('inventario')) modKey = "inventario";
      else if (href.includes('ventas') || text.includes('ventas')) modKey = "ventas";
      else { modKey = text.replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || "modulo"; }

      a.setAttribute('data-sim-mod', modKey);
      a.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        navigateTo(modKey, a.textContent.trim());
      });
    });
  }

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.includes('datagan-course.web.app')) return;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/')) {
      e.preventDefault();
      navigateTo("generic", link.textContent.trim() || "Sección");
    }
  });

  // Fetch dynamic missions from Firebase RTDB
  async function loadMissionsFromFirebase() {
    try {
      const res = await fetch('https://datagan-course-default-rtdb.firebaseio.com/missions.json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const list = Object.keys(data).map(k => ({ ...data[k], id: k })).sort((a,b) => (a.order || 0) - (b.order || 0));
          if (list.length > 0) {
            currentMissions = list;
            activeMission = list[0];
            updateBannerMissionUI();
          }
        }
      }
    } catch(e) {
      console.log("Using default fallback missions:", e);
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    setupSidebarInteractions();
    loadMissionsFromFirebase();
    updateBannerMissionUI();

    const urlParams = new URLSearchParams(window.location.search);
    const requestedMission = urlParams.get('mision') || window.location.hash.replace('#', '');
    if (requestedMission) {
      window.simulator.changeMission(requestedMission);
    } else {
      navigateTo('dashboard', 'Dashboard');
    }
  });

})();
</script>
`;

$('body').append(engineScript);

const masterHtml = $.html();

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html', masterHtml, 'utf8');
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', masterHtml, 'utf8');
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox\\nacimientos.html', masterHtml, 'utf8');

if (!fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out')) {
  fs.mkdirSync('D:\\My Apps\\Datagan Course\\frontend\\out', { recursive: true });
}
if (!fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox')) {
  fs.mkdirSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox', { recursive: true });
}
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox.html', masterHtml, 'utf8');
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan.html', masterHtml, 'utf8');
fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox\\nacimientos.html', masterHtml, 'utf8');

console.log("Master Sandbox with Dynamic Firebase Multi-Mission Engine generated successfully!");
