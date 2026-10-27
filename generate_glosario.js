const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('D:/My Apps/Datagan Course/metrics_data.json', 'utf8'));
const metrics = raw.metrics;

// Categories extracted from Datagan sidebar & system
const categories = [
  {
    name: "Administración & Usuarios",
    icon: "ShieldCheck",
    description: "Gestión de roles, permisos corporativos, accesos de trabajadores, fincas asociadas, terceros y facturación.",
    subcategories: [
      { name: "Roles y Permisos", path: "/grupos", summary: "Control de acceso granular y matriz de permisos por perfil." },
      { name: "Trabajadores", path: "/users", summary: "Gestión del personal operativo, vaqueros y administradores de finca." },
      { name: "Fincas y Predios", path: "/Fincas", summary: "Configuración territorial de predios, áreas totales y georreferenciación." },
      { name: "Terceros", path: "/terceros", summary: "Proveedores, veterinarios, compradores y aliados comerciales." },
      { name: "Facturación & Suscripción", path: "/facturacion", summary: "Planes (Enterprise IA), límites de animales y ciclos de cobro." }
    ]
  },
  {
    name: "Gestión Bovina & Inventario",
    icon: "Cow",
    description: "Administración integral del hato, división de potreros, conformación de lotes, transferencias y sistemas silvopastoriles.",
    subcategories: [
      { name: "Potreros", path: "/potreros", summary: "Delimitación perimetral, estado de ocupación, aforo y capacidad de carga." },
      { name: "Lotes de Manejo", path: "/lotes", summary: "Agrupación zootécnica de animales (horras, paridas, levante, ceba)." },
      { name: "Inventario de Animales", path: "/animales", summary: "Fichas individuales, chapetas, genealogía, pesaje histórico y bajas." },
      { name: "Transferencia de Ganado", path: "/bovinos/transferencia", summary: "Movimientos entre lotes, potreros y cambios de predio." },
      { name: "Sistemas Silvopastoriles", path: "/bovinos/silvopastoril", summary: "Integración de árboles forrajeros y pasturas para bienestar animal." }
    ]
  },
  {
    name: "Producción de Carne & Leche",
    icon: "TrendingUp",
    description: "Control de pesajes periódicos, curvas de ganancia diaria de peso (GDP) y registros de ordeño diario.",
    subcategories: [
      { name: "Pesaje & Curvas GDP", path: "/produccion/pesaje", summary: "Evolución ponderal, control de báscula y tasa de ganancia de peso diaria." },
      { name: "Producción de Leche", path: "/produccion/leche", summary: "Ordeños individuales y generales (mañana/tarde), rendimiento por vaca y lote." }
    ]
  },
  {
    name: "Trazabilidad & Cumplimiento ICA",
    icon: "QrCode",
    description: "Seguimiento individual, registro de chapetas oficiales, historial de movimientos y exportación SINIGAN v6.",
    subcategories: [
      { name: "Registro de Trazabilidad", path: "/trazabilidad/registro", summary: "Identificación oficial de animales y homologación de códigos DIN/SINIGAN." },
      { name: "Historial de Movimientos", path: "/trazabilidad/historial", summary: "Registro cronológico de traslados, guías sanitarias de movilización interna (GSMI)." }
    ]
  },
  {
    name: "Salud, Reproducción & Veterinaria",
    icon: "HeartPulse",
    description: "Ciclo reproductivo, detección de celos, servicios, inseminación, partos, tratamientos clínicos y planes de vacunación.",
    subcategories: [
      { name: "Detección de Celo", path: "/salud/celo", summary: "Monitoreo de celo natural y sincronización para inseminación artificial." },
      { name: "Servicios e Inseminación", path: "/salud/servicio", summary: "Registro de montas naturales e IATF con identificación del toro/pajilla." },
      { name: "Veterinaria & Tratamientos", path: "/salud/veterinaria", summary: "Diagnósticos clínicos, fármacos aplicados, periodos de retiro y vacunas." },
      { name: "Nacimientos y Partos", path: "/salud/nacimiento", summary: "Registro de partos, peso al nacer, vitalidad del ternero e identificación de madre." },
      { name: "Genealogía & Linaje", path: "/salud/genealogia", summary: "Árbol genealógico ascendente y descendente, consanguinidad y mérito genético." }
    ]
  },
  {
    name: "Finanzas & Control de Costos",
    icon: "DollarSign",
    description: "Control financiero ganadero, costos por litro de leche y kilo de carne, valor comercial del hato e inventario de insumos.",
    subcategories: [
      { name: "Inventario de Insumos", path: "/finanza/inventario", summary: "Medicamentos, balanceados, sales mineralizadas, semen y herramientas." },
      { name: "Actividades & Labores", path: "/finanza/actividades", summary: "Costos de jornales, mantenimiento de cercas, fertilización y siembra." },
      { name: "Compras & Gastos", path: "/finanza/compras", summary: "Egresos operativos, adquisición de ganado, forrajes y suministros." },
      { name: "Ventas & Facturación", path: "/finanza/ventas", summary: "Comercialización de leche cruda, novillos gordos, terneros y descarte." },
      { name: "Cuentas & Balance", path: "/finanza/cuentas", summary: "Cuentas bancarias, caja menor, flujo de caja libre y margen de contribución." }
    ]
  },
  {
    name: "Geolocalización, Telemetría & Clima (IoT)",
    icon: "Radio",
    description: "Red de antenas LoRaWAN/GPS, lecturas de sensores perimetrales, ausentismo de ganado y estrés calórico ITH.",
    subcategories: [
      { name: "Antenas & Nodos", path: "/localizacion/antenas", summary: "Infraestructura de comunicación inalámbrica y estado de baterías de nodos." },
      { name: "Lecturas de Sensores", path: "/localizacion/lecturas", summary: "Temperatura ambiente, humedad relativa, lluvia acumulada y radiación." },
      { name: "Detección de Ausentismo", path: "/localizacion/ausentismo", summary: "Alertas de escape de animales fuera del perímetro geocercado o robo." },
      { name: "Estrés Calórico (ITH)", path: "/localizacion/ith", summary: "Índice de Temperatura-Humedad por potrero y zonas de sombra requeridas." }
    ]
  },
  {
    name: "Reportes & Analítica Predictiva",
    icon: "FileSpreadsheet",
    description: "Generación de informes de gestión zootécnica, auditorías sanitarias y proyecciones basadas en modelos estadísticos.",
    subcategories: [
      { name: "Nuevo Informe", path: "/reportes/nuevo", summary: "Consolidación de indicadores de productividad, índices reproductivos y balances." }
    ]
  }
];

// Build Markdown Glossary
let md = `# Glosario Técnico y Taxonomía de Datagan 360

Este documento contiene la taxonomía oficial de categorías, subcategorías y el catálogo de las **73 métricas e indicadores zootécnico-financieros** extraídos de la plataforma **DataGan 360**.

---

## 1. Mapa de Categorías y Subcategorías de la Plataforma

`;

categories.forEach(cat => {
  md += `### ${cat.name}\n`;
  md += `> ${cat.description}\n\n`;
  md += `| Subcategoría | Ruta | Descripción |\n`;
  md += `|---|---|---|\n`;
  cat.subcategories.forEach(sub => {
    md += `| **${sub.name}** | \`${sub.path}\` | ${sub.summary} |\n`;
  });
  md += `\n`;
});

md += `---

## 2. Catálogo Oficial de Métricas e Indicadores (73 Métricas)

`;

const categoryOrder = {
  produccion: "Producción (Carne & Leche)",
  reproduccion: "Reproducción & Parición",
  salud: "Salud Animal & Bioseguridad",
  gestion: "Gestión de Potreros & Pastoreo",
  eficiencia: "Eficiencia Productiva & Densidad",
  finanzas: "Finanzas & Economía Ganadera",
  clima: "Clima & Estrés Calórico (ITH)",
  regulatorio: "Regulatorio & Entidades Sanitarias"
};

// Group metrics by category
const grouped = {};
for (const k in metrics) {
  const m = metrics[k];
  const cat = m.category || 'otros';
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(m);
}

for (const catKey in categoryOrder) {
  const catName = categoryOrder[catKey];
  const list = grouped[catKey] || [];
  md += `### Categoría: ${catName} (${list.length} métricas)\n\n`;

  list.forEach(item => {
    md += `#### ${item.label} (\`${item.id}\`)\n`;
    md += `- **Descripción Corta:** ${item.shortDescription || 'N/A'}\n`;
    md += `- **Definición Técnica:** ${item.definition || 'N/A'}\n`;
    if (item.formula) {
      md += `- **Fórmula de Cálculo:** \`${item.formula}\`\n`;
    }
    if (item.formulaExplanation) {
      md += `- **Explicación Metodológica:** ${item.formulaExplanation}\n`;
    }
    md += `- **Unidad de Medida:** \`${item.unit || 'unidad'}\`\n`;
    md += `- **Fuente de Datos:** ${item.source || 'Registros internos'}\n`;
    if (item.influences) {
      md += `- **Factores Determinantes:** ${item.influences}\n`;
    }
    if (item.benchmark) {
      md += `- **Valores de Referencia (Benchmark):** Fuente: ${item.benchmark.source} (${item.benchmark.year}) | Promedio: ${item.benchmark.average} | Top 10%: ${item.benchmark.top}\n`;
    }
    if (item.ranges && item.ranges.length) {
      md += `- **Rangos Operativos:**\n`;
      item.ranges.forEach(r => {
        md += `  - **${r.label}** (${r.color}): ${r.interpretation} [min: ${r.min}, max: ${r.max}]\n`;
      });
    }
    if (item.relatedMetrics && item.relatedMetrics.length) {
      md += `- **Métricas Relacionadas:** ${item.relatedMetrics.map(rm => '`' + rm + '`').join(', ')}\n`;
    }
    md += `\n`;
  });
  md += `---\n\n`;
}

fs.writeFileSync('D:/My Apps/Datagan Course/glosario.md', md, 'utf8');
console.log('Successfully written D:/My Apps/Datagan Course/glosario.md');
