const fs = require('fs');
const path = require('path');

const OFFICIAL_DATAGAN_METRICS = [
  // 1. Plantilla FÓRMULA: Litros por Vaca / Día
  {
    id: 'litros_vaca_dia',
    templateType: 'formula',
    label: 'Litros por Vaca / Día (Eficiencia de Ordeño)',
    category: 'Gestión Lechera',
    unit: 'L / vaca / día',
    shortDescription: 'Producción media individual diaria del hato en ordeño.',
    definition: 'Indicador nuclear de rentabilidad lechera que cuantifica el volumen medio de leche producido diariamente por cada vaca activa en la línea de ordeño (excluyendo vacas secas).',
    formula: 'Litros_Vaca_Dia = Produccion_Total_Tanque_Litros / Total_Vacas_En_Ordeño',
    formulaExplanation: 'Producción_Total_Tanque_Litros: suma del ordeño AM + PM. Total_Vacas_En_Ordeño: número de vacas ordeñadas ese día.',
    benchmark: {
      source: 'Datagan 360 Benchmark Lechero Nacional',
      year: 2025,
      average: '9.8 L/vaca/día',
      top: '24.5 L/vaca/día'
    },
    ranges: [
      { min: 0, max: 8, label: 'Bajo Rendimiento', color: 'red', interpretation: 'Alto costo fijo por litro; evaluar suplementación energética y días en lactancia.' },
      { min: 8.1, max: 15, label: 'Promedio Sostenible', color: 'yellow', interpretation: 'Nivel comercial típico de trópico bajo con manejo silvopastoril.' },
      { min: 15.1, max: 35, label: 'Alta Eficiencia', color: 'green', interpretation: 'Excelente conversión alimenticia y alta rentabilidad por hectárea.' }
    ]
  },
  // 2. Plantilla ESCALA VISUAL: Condición Corporal (CC 1 a 5)
  {
    id: 'condicion_corporal_cc',
    templateType: 'visual_scale',
    label: 'Escala de Condición Corporal Bovina (Score CC 1 a 5)',
    category: 'Nutrición y Zootecnia',
    unit: 'Puntos CC (1 - 5)',
    shortDescription: 'Evaluación cualitativa visual de reservas grasas y musculares.',
    definition: 'Sistema estandarizado de calificación visual y táctil que estima la reserva energética del bovino evaluando la fosa paralumbar, apófisis espinosas, tuberosidades coxales y base de la cola.',
    visualLevels: [
      { level: '1.0', title: 'Emaciada / Muy Flaca', status: 'critical', description: 'Costillas, vértebras lumbares y caderas prominentes; cavidades profundas en base de cola, sin grasa palpable. Alto riesgo de anestro e hipoglucemia.' },
      { level: '2.0', title: 'Flaca / Reserva Moderada', status: 'warning', description: 'Estructuras óseas visibles pero con ligera cubierta muscular. Fosa de los ijares hendida. Típica en pico de lactancia pero requiere corrección alimenticia.' },
      { level: '3.0 - 3.5', title: 'Óptima / Rango Meta', status: 'optimal', description: 'Transición suave entre vértebras y costillas. Pelvis redondeada con capa grasa elástica. Condición ideal para el secado, parto y servicio de preñez.' },
      { level: '4.0', title: 'Gorda / Sobreengrasada', status: 'warning', description: 'Depósitos grasos visibles en anca y pecho. Huesos difíciles de palpar. Riesgo de distocias al parto y síndrome de hígado graso.' },
      { level: '5.0', title: 'Obesa / Crítica', status: 'critical', description: 'Estructura ósea completamente oculta por gruesos paquetes adiposos; locomoción pesada y alto riesgo de cetosis posparto.' }
    ],
    ranges: [
      { min: 1, max: 2, label: 'Bajo (Déficit Nutricional)', color: 'red', interpretation: 'Falla reproductiva, celos silentes y baja calidad de calostro.' },
      { min: 3, max: 3.5, label: 'Meta Productiva', color: 'green', interpretation: 'Condición ideal para maximizar tasa de preñez y persistencia lechera.' },
      { min: 4, max: 5, label: 'Exceso (Riesgo Metabólico)', color: 'red', interpretation: 'Propensa a cetosis, desplazamiento de abomaso y retención placentaria.' }
    ]
  },
  // 3. Plantilla PROTOCOLO: Protocolo IATF
  {
    id: 'protocolo_iatf_bovino',
    templateType: 'protocol',
    label: 'Protocolo IATF (Inseminación Artificial a Tiempo Fijo)',
    category: 'Reproducción Bovina',
    unit: 'Cronograma Días',
    shortDescription: 'Secuencia hormonal estandarizada para sincronizar ovulación sin detectar celo.',
    definition: 'Esquema farmacológico de sincronización que coordina el desarrollo folicular y la ovulación mediante progesterona, estradiol y prostaglandinas para inseminar masivamente en hora fija.',
    protocolSteps: [
      { stepNumber: 1, title: 'Día 0: Inserción y Reseteo Folicular', timing: '08:00 AM', instructions: 'Aplicar dispositivo intravaginal con Progesterona (1.0g - 1.2g) + 2.0 mg de Benzoato de Estradiol IM.', criticalNote: 'Desinfectar vulva y dispositivo antes de la colocación para evitar vaginitis.' },
      { stepNumber: 2, title: 'Día 8: Retiro y Lisis del Cuerpo Lúteo', timing: '08:00 AM (192h después)', instructions: 'Retirar dispositivo intravaginal + aplicar Prostaglandina F2α (500 mcg Cloprostenol) + 300 UI eCG + 1.0 mg Cipionato de Estradiol.', criticalNote: 'Revisar que ningún animal pierda el dispositivo antes de este día.' },
      { stepNumber: 3, title: 'Día 10: Inseminación Artificial a Tiempo Fijo (IATF)', timing: '48 a 54 horas posretiro', instructions: 'Inseminar todos los animales con semen descongelado a 37°C por 40 segundos. Depositar semen en el cuerpo del útero.', criticalNote: 'Mantener tiempo de descongelado exacto y usar vainas tibias.' }
    ],
    benchmark: {
      source: 'Datagan Inteligencia Reproductiva',
      year: 2025,
      average: '46% Tasa de Preñez al primer servicio',
      top: '62% Tasa de Preñez con evaluación previa de ciclicidad'
    }
  },
  // 4. Plantilla MATRIZ DE DECISIÓN: Mastitis y Salud de Ubre
  {
    id: 'matriz_decision_mastitis',
    templateType: 'decision_matrix',
    label: 'Matriz Diagnóstica y de Decisión: Salud de Ubre & Mastitis',
    category: 'Sanidad y Calidad de Leche',
    unit: 'Niveles CMT',
    shortDescription: 'Criterios de acción operativa según grado de inflamación mamaria.',
    definition: 'Matriz de triaje veterinario que correlaciona los hallazgos en la prueba de California Mastitis Test (CMT) con la conducta médica y el desvío del producto en tanque.',
    decisionRows: [
      { condition: 'Prueba CMT Negativa / Trazas (Leche fluida sin gel)', probableCause: 'Cuarto sano, conteo de células somáticas normal (<200.000 CS/mL)', recommendedAction: 'Continuar ordeño regular. Aplicar sellador de pezón de barrera.', priority: 'low' },
      { condition: 'CMT Grado 1 o 2 (Espesamiento ligero a masa gelatinosa sin grumos)', probableCause: 'Mastitis subclínica (Staphylococcus aureus, Streptococcus agalactiae)', recommendedAction: 'Identificar cuarto afectado. Separar leche de ese cuarto. Monitorear rutina de predipping.', priority: 'medium' },
      { condition: 'CMT Grado 3 o Presencia de grumos/sangre/pus en tazón de fondo negro', probableCause: 'Mastitis clínica aguda con respuesta inflamatoria severa', recommendedAction: 'Ordeñar al final. Desviar 100% de la leche del animal. Infusión intramamaria con antibiótico según antibiograma + antiinflamatorio sistémico.', priority: 'high' }
    ]
  },
  // 5. Plantilla GLOSARIO / CONCEPTO CLAVE: Balance Energético Negativo (BEN)
  {
    id: 'balance_energetico_negativo_ben',
    templateType: 'glossary',
    label: 'Balance Energético Negativo (BEN) en el Periodo de Transición',
    category: 'Nutrición y Metabolismo',
    unit: 'Concepto Fisiológico',
    shortDescription: 'Estado metabólico crítico donde el gasto energético supera el consumo alimenticio.',
    definition: 'Fase fisiológica que ocurre durante las primeras 3 a 8 semanas posparto, cuando la demanda de glucosa y energía para sintetizar leche supera la capacidad máxima de ingestión de materia seca de la vaca, obligándola a movilizar tejido adiposo de reserva.',
    keyTakeaway: 'Una vaca que pierde más de 0.75 puntos de condición corporal durante el BEN reduce su tasa de concepción en 30% y triplica su riesgo de quistes ováricos y cojeras.',
    examples: [
      'Vaca multípara produce 28 L/día a los 20 días de parida pero consume solo 14 kg de MS: el déficit calórico se compensa quemando grasa corporal.',
      'Aparición de cuerpos cetónicos (beta-hidroxibutirato >1.2 mmol/L) en sangre en vacas de alta producción alimentadas con forrajes bajos en carbohidratos solubles.'
    ]
  },
  // 6. FÓRMULA: Índice de Ocupación de Potreros
  {
    id: 'indice_ocupacion_potreros',
    templateType: 'formula',
    label: 'Índice de Ocupación de Potreros',
    category: 'Manejo de Praderas',
    unit: 'Días / Ciclo',
    shortDescription: 'Tiempo de rotación y periodo de descanso biológico del pasto.',
    definition: 'Mide los días en que un potrero permanece con ganado pastando en relación al periodo óptimo de reposo vegetativo para evitar el sobrepastoreo según las Leyes de Voisin.',
    formula: 'Periodo_Ocupacion = Tiempo_Pastoreo_Dias / (Tiempo_Pastoreo_Dias + Tiempo_Descanso_Dias)',
    formulaExplanation: 'Tiempo_Pastoreo_Dias: días con animales en potrero (ideal ≤3 días). Tiempo_Descanso_Dias: días de rebrote sin animales (30-45 días según especie forrajera).',
    benchmark: {
      source: 'FEDEGAN & CIPAV Sistemas Silvopastoriles',
      year: 2025,
      average: '0.12 (Pastoreo extensivo continuo)',
      top: '0.04 (Pastoreo rotacional ultra denso)'
    },
    ranges: [
      { min: 0, max: 0.05, label: 'Excelente (Rotacional Intensivo)', color: 'green', interpretation: 'Permite máxima regeneración del estrato vegetal sin degradar biomasa.' },
      { min: 0.06, max: 0.15, label: 'Aceptable (Rotacional Clásico)', color: 'yellow', interpretation: 'Adecuado, pero puede mejorar reduciendo los días de estancia.' },
      { min: 0.16, max: 1.0, label: 'Crítico (Sobrepastoreo)', color: 'red', interpretation: 'Degradación de praderas, compactación de suelo y pérdida de especies nutritivas.' }
    ]
  },
  // 7. FÓRMULA: Ganancia Diaria de Peso
  {
    id: 'gdp_ceba',
    templateType: 'formula',
    label: 'Ganancia Diaria de Peso (GDP en Ceba y Levante)',
    category: 'Zootecnia y Ceba',
    unit: 'g / animal / día',
    shortDescription: 'Velocidad de incremento ponderal diario en novillos de ceba.',
    definition: 'Tasa a la que los animales de carne ganan masa muscular y grasa diariamente entre pesajes consecutivos. Determina los días necesarios para alcanzar el peso de sacrificio.',
    formula: 'GDP = ((Peso_Final_kg - Peso_Inicial_kg) * 1000) / Dias_Transcurridos',
    formulaExplanation: 'Peso_Final_kg: peso en báscula actual. Peso_Inicial_kg: peso en pesaje anterior. Dias_Transcurridos: días entre ambas pesadas.',
    benchmark: {
      source: 'FEDEGAN Ceba Estabulada y Silvopastoril',
      year: 2025,
      average: '450 g/día (Pastoreo extensivo)',
      top: '950 g/día (Silvopastoril intensivo + suplementación)'
    },
    ranges: [
      { min: 0, max: 350, label: 'Deficitario', color: 'red', interpretation: 'Ganancia insuficiente; ciclo de ceba mayor a 36 meses.' },
      { min: 351, max: 700, label: 'Aceptable Comercial', color: 'yellow', interpretation: 'Nivel estándar en praderas tropicales con sal mineralizada.' },
      { min: 701, max: 1200, label: 'Alto Rendimiento', color: 'green', interpretation: 'Excelente conversión alimenticia y alta rotación de capital.' }
    ]
  }
];

async function seedAll() {
  console.log('--- Iniciando Sincronización de Métricas Multitemplate en Firebase RTDB ---');
  
  // 1. Sincronizar presets multitemplate oficiales
  for (const m of OFFICIAL_DATAGAN_METRICS) {
    try {
      const res = await fetch(`https://datagan-course-default-rtdb.firebaseio.com/metrics/${m.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      });
      console.log(`[Oficial Multi-Template] ${m.id} (${m.templateType}): Status ${res.status}`);
    } catch (e) {
      console.error(`Error enviando ${m.id}:`, e.message);
    }
  }

  // 2. Leer metrics_data.json y agregar métricas base si existen
  const metricsDataPath = path.join(__dirname, 'metrics_data.json');
  if (fs.existsSync(metricsDataPath)) {
    const raw = JSON.parse(fs.readFileSync(metricsDataPath, 'utf8'));
    const metricsMap = raw.metrics || raw;
    let count = 0;
    for (const key of Object.keys(metricsMap)) {
      const item = metricsMap[key];
      // Si no es una de las ya sobreescritas
      if (!OFFICIAL_DATAGAN_METRICS.find(x => x.id === (item.id || key))) {
        const payload = {
          ...item,
          id: item.id || key,
          templateType: item.templateType || (item.formula ? 'formula' : 'custom')
        };
        try {
          const res = await fetch(`https://datagan-course-default-rtdb.firebaseio.com/metrics/${payload.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          count++;
        } catch (e) {
          console.error(`Error con ${key}:`, e.message);
        }
      }
    }
    console.log(`[Base Datagan] Se sincronizaron ${count} métricas adicionales de metrics_data.json.`);
  }

  // 3. Vincular métricas multitemplate a lecciones de datagan-master-pro para que se vean de inmediato en el aula
  try {
    const courseRes = await fetch('https://datagan-course-default-rtdb.firebaseio.com/courses/datagan-master-pro.json');
    if (courseRes.ok) {
      const course = await courseRes.json();
      if (course && course.modules) {
        let modified = false;
        // Asignar en lección 1: Litros por vaca y Condición Corporal
        if (course.modules[0] && course.modules[0].lessons && course.modules[0].lessons[0]) {
          course.modules[0].lessons[0].metrics = ['indice_ocupacion_potreros', 'condicion_corporal_cc', 'litros_vaca_dia'];
          modified = true;
        }
        // Asignar en lección 2: Protocolo IATF y Matriz Mastitis
        if (course.modules[0] && course.modules[0].lessons && course.modules[0].lessons[1]) {
          course.modules[0].lessons[1].metrics = ['protocolo_iatf_bovino', 'matriz_decision_mastitis', 'balance_energetico_negativo_ben', 'gdp_ceba'];
          modified = true;
        }
        if (modified) {
          await fetch('https://datagan-course-default-rtdb.firebaseio.com/courses/datagan-master-pro.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(course)
          });
          console.log('[Curso Actualizado] Métricas vinculadas a las lecciones de datagan-master-pro con éxito.');
        }
      }
    }
  } catch (err) {
    console.error('Error actualizando vinculación de lecciones:', err.message);
  }

  console.log('--- Sincronización completada con éxito ---');
}

seedAll();
