const DEFAULT_MISSIONS = [
  {
    id: 'mision-1',
    order: 1,
    title: 'Registro de Nacimiento: Vaca Mariposa (V-101)',
    category: 'Salud & Reproducción',
    courseSlug: 'datagan-master-pro',
    targetModule: 'nacimiento',
    summary: 'Inscribe la cría recién nacida de la vaca V-101 vinculando su chapeta y peso natalicio.',
    context: 'En la Hacienda El Rocío, la vaca de ordeño Mariposa (Chapeta: V-101) acaba de parir una ternera en el potrero El Mango. Tu responsabilidad zootécnica es formalizar el ingreso del animal en TecnoGan antes de 24 horas.',
    instructions: [
      'Ingresa al módulo Salud & Vida > Nacimientos en el menú lateral.',
      'Haz clic en el botón superior "Nuevo Registro".',
      'Asigna la chapeta del ternero (ej. CR-406), madre V-101 y peso al nacer (35 kg).',
      'Guarda el registro en el simulador y pulsa "Comprobar" en el banner superior.'
    ],
    rules: [
      { field: 'madreId', operator: 'equals', value: 'V-101', label: 'Chapeta de la Madre debe ser V-101' },
      { field: 'peso', operator: 'greater_than', value: '25', label: 'Peso al nacer debe ser superior a 25 kg' }
    ],
    solutionSteps: [
      'Dirígete en el menú a Salud & Vida > Nacimientos.',
      'Haz clic en "Nuevo Registro".',
      'Ingresa: ID Ternero: CR-406, ID Madre: V-101, Sexo: Hembra, Peso: 35.',
      'Pulsa "Guardar Registro en Simulador" y luego "Comprobar".'
    ],
    autoFillPayload: {
      terneroId: 'CR-406',
      madreId: 'V-101',
      padreId: 'T-201',
      sexo: 'Hembra',
      peso: 35,
      obs: 'Parto eutócico normal, cría vigorosa'
    },
    published: true
  },
  {
    id: 'mision-2',
    order: 2,
    title: 'Control Ponderal y Ganancia Diaria (GDP)',
    category: 'Producción & Ceba',
    courseSlug: 'datagan-master-pro',
    targetModule: 'pesaje',
    summary: 'Registra el pesaje mensual del lote de ceba para calcular la ganancia diaria de peso (g/día).',
    context: 'El lote de ceba intensiva en el potrero El Cedro completó 30 días de ciclo. Se requiere registrar el pesaje del novillo N-301 para corroborar si supera el umbral rentable de 750 g/día.',
    instructions: [
      'Dirígete al módulo Producción > Pesaje en el menú lateral.',
      'Pulsa "Nuevo Registro" e ingresa la chapeta N-301.',
      'Ingresa Peso Anterior: 370 kg, Peso Actual: 395 kg y 30 días transcurridos.',
      'Verifica que la GDP estimada sea calculada y pulsa "Comprobar".'
    ],
    rules: [
      { field: 'animalId', operator: 'equals', value: 'N-301', label: 'Animal pesado debe ser N-301' },
      { field: 'pesoActual', operator: 'greater_than', value: '380', label: 'Peso actual debe ser mayor a 380 kg' }
    ],
    solutionSteps: [
      'Ve a Producción > Pesaje en el menú.',
      'Haz clic en "Nuevo Registro".',
      'Animal: N-301, Peso Ant: 370 kg, Peso Act: 395 kg, Días: 30.',
      'Guarda y presiona "Comprobar" en el banner superior.'
    ],
    autoFillPayload: {
      animalId: 'N-301',
      pesoAnterior: 370,
      pesoActual: 395,
      dias: 30,
      gdp: 833
    },
    published: true
  },
  {
    id: 'mision-3',
    order: 3,
    title: 'Planificación de Pastoreo y Rotación de Potrero',
    category: 'Pastos & Aforo',
    courseSlug: 'datagan-master-pro',
    targetModule: 'potreros',
    summary: 'Registra un nuevo potrero de rotación con aforo forrajero y capacidad en UGM.',
    context: 'Se incorporaron 15 nuevas hectáreas de Brachiaria brizantha en la zona alta del predio (Potrero La Loma). Debes ingresar el potrero con capacidad de carga de 25 UGM.',
    instructions: [
      'Ingresa a Potreros en el menú lateral.',
      'Haz clic en "Nuevo Registro".',
      'Código: POT-7, Nombre: La Loma, Área: 15 Ha, Capacidad: 25 UGM, Estado: Descanso.',
      'Guarda el potrero y valida con el botón "Comprobar".'
    ],
    rules: [
      { field: 'nombre', operator: 'includes', value: 'Loma', label: 'Nombre del potrero debe contener Loma' },
      { field: 'area', operator: 'greater_than', value: '10', label: 'Área mínima de 10 Hectáreas' }
    ],
    solutionSteps: [
      'Ve a Potreros en el menú lateral.',
      'Pulsa "Nuevo Registro".',
      'Llena POT-7, La Loma, 15 Ha, Pasto Brizantha, 25 UGM, Estado Descanso.',
      'Guarda y presiona "Comprobar".'
    ],
    autoFillPayload: {
      id: 'POT-7',
      nombre: 'La Loma',
      area: 15,
      pasto: 'Brachiaria brizantha',
      capacidad: 25,
      estado: 'Descanso'
    },
    published: true
  }
];

async function seedMissions() {
  for (const m of DEFAULT_MISSIONS) {
    const res = await fetch(`https://datagan-course-default-rtdb.firebaseio.com/missions/${m.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    });
    console.log(`Seeded ${m.id}: status ${res.status}`);
  }
}

seedMissions().then(() => console.log("Seeding complete!"));
