'use client';

import React, { useEffect, useState } from 'react';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Metric, MetricTemplateType, VisualScaleLevel, ProtocolStep, DecisionRow, CustomField } from '@/types';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Save,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  TrendingUp,
  Sliders,
  Layers,
  BookOpen,
  Eye,
  ListOrdered,
  GitBranch,
  FileText,
  SlidersHorizontal,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  MousePointerClick,
  Target,
  BarChart3
} from 'lucide-react';

// Catálogo Multitemplate Oficial de Fábrica de Datagan 360
const OFFICIAL_DATAGAN_METRICS: Metric[] = [
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
    formula: 'GDP = ((Peso_Final_kg - Peso_Inicial_kg) * 1000) / Dias_Transcurridos_Entre_Pesajes',
    formulaExplanation: 'Peso_Final_kg: peso en báscula calibrada en pesaje actual. Peso_Inicial_kg: peso en pesaje anterior. Multiplicado por 1000 para gramos.',
    benchmark: {
      source: 'Asocébu & Asobrangus Colombia',
      year: 2025,
      average: '420 g/día (Pastura sola)',
      top: '850 g/día (Pastura mejorada + Ensilaje estratégico)'
    },
    ranges: [
      { min: 0, max: 350, label: 'Deficiente (Mantenimiento)', color: 'red', interpretation: 'Animales estancados; genera alto costo financiero por días extra en finca.' },
      { min: 351, max: 600, label: 'Aceptable Estándar', color: 'yellow', interpretation: 'Ganancia comercial típica de pastoreo en temporadas normales.' },
      { min: 601, max: 1200, label: 'Sobresaliente / Rápida Ceba', color: 'green', interpretation: 'Excelente conformación carnicera y rápida rotación de capital.' }
    ]
  }
];

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, 'metrics'));
      if (snap.exists()) {
        const data = snap.val();
        const list: Metric[] = Object.keys(data).map((k) => ({
          ...data[k],
          id: data[k].id || k,
          templateType: data[k].templateType || (data[k].visualLevels ? 'visual_scale' : data[k].protocolSteps ? 'protocol' : data[k].decisionRows ? 'decision_matrix' : data[k].formula ? 'formula' : 'custom')
        }));
        setMetrics(list);
        if (list.length > 0 && !selectedMetric) {
          setSelectedMetric(list[0]);
        }
      } else {
        setMetrics([]);
      }
    } catch (e) {
      console.error(e);
      showToast('Error cargando métricas desde Firebase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createWithTemplate = (type: MetricTemplateType) => {
    const baseId = `param_${Date.now()}`;
    let templateData: Partial<Metric> = {
      id: baseId,
      templateType: type,
      category: 'Zootecnia General',
      label: 'Nuevo Parámetro Técnico',
      shortDescription: 'Resumen descriptivo del parámetro...',
      definition: 'Explicación detallada de cómo se evalúa y su propósito en la finca...'
    };

    if (type === 'formula') {
      templateData = {
        ...templateData,
        label: 'Nuevo KPI / Indicador Numérico',
        unit: 'kg / día',
        formula: 'Variable_A / Variable_B',
        formulaExplanation: 'Variable_A: divisor. Variable_B: dividendo.',
        benchmark: { source: 'Benchmark Sectorial', year: 2025, average: '10', top: '20' },
        ranges: [
          { min: 0, max: 9, label: 'Bajo', color: 'red', interpretation: 'Por debajo del umbral mínimo.' },
          { min: 10, max: 20, label: 'Óptimo', color: 'green', interpretation: 'En meta productiva.' }
        ]
      };
    } else if (type === 'visual_scale') {
      templateData = {
        ...templateData,
        label: 'Nueva Escala de Calificación Visual',
        unit: 'Puntos (1 a 5)',
        visualLevels: [
          { level: '1', title: 'Deficiente / Nivel Crítico', status: 'critical', description: 'Signos evidentes de deterioro o déficit visual.' },
          { level: '2', title: 'Alerta / Nivel Medio', status: 'warning', description: 'Condición aceptable pero con margen de mejora.' },
          { level: '3', title: 'Excelente / Rango Meta', status: 'optimal', description: 'Cumplimiento perfecto del estándar zootécnico visual.' }
        ]
      };
    } else if (type === 'protocol') {
      templateData = {
        ...templateData,
        label: 'Nuevo Protocolo Paso a Paso',
        unit: 'Procedimiento',
        protocolSteps: [
          { stepNumber: 1, title: 'Fase 1: Preparación Inicial', timing: 'Minuto 0', instructions: 'Reunir instrumental desinfectado y asegurar al animal en manga.', criticalNote: 'Verificar higiene estricta.' },
          { stepNumber: 2, title: 'Fase 2: Ejecución Operativa', timing: 'Continuo', instructions: 'Aplicar el tratamiento o maniobra según dosis prescrita.', criticalNote: 'No aplicar en animales con fiebre.' }
        ]
      };
    } else if (type === 'decision_matrix') {
      templateData = {
        ...templateData,
        label: 'Nueva Matriz de Decisión / Diagnóstico',
        unit: 'Criterio Condicional',
        decisionRows: [
          { condition: 'Si el animal presenta X síntoma', probableCause: 'Falla o alteración tipo A', recommendedAction: 'Proceder con acción correctiva 1', priority: 'medium' },
          { condition: 'Si el parámetro supera el límite Y', probableCause: 'Falla crítica tipo B', recommendedAction: 'Aislar animal e iniciar terapia inmediata', priority: 'high' }
        ]
      };
    } else if (type === 'glossary') {
      templateData = {
        ...templateData,
        label: 'Nuevo Concepto Glosario / Negocio Ganadero',
        keyTakeaway: 'Regla de oro: El impacto económico directo de este concepto en el flujo de caja de la hacienda.',
        examples: ['Ejemplo de aplicación práctica en una finca de leche', 'Ejemplo de error común en potrero']
      };
    } else {
      templateData = {
        ...templateData,
        label: 'Parámetro Personalizado Libre',
        customFields: [
          { label: 'Frecuencia de Toma', value: 'Semanal en báscula' },
          { label: 'Responsable', value: 'Mayordomo / Médico Veterinario' }
        ]
      };
    }

    setSelectedMetric(templateData as Metric);
  };

  const seedOfficialLibrary = async () => {
    if (!confirm('¿Deseas precargar la Biblioteca Multitemplate Oficial de Datagan 360 en Firebase? Incluye Fórmulas, Escalas Visuales (CC 1-5), Protocolos IATF, Matrices de Decisión y Glosario.')) {
      return;
    }

    setIsSaving(true);
    try {
      for (const m of OFFICIAL_DATAGAN_METRICS) {
        await set(ref(db, `metrics/${m.id}`), m);
      }
      showToast('¡Biblioteca Multitemplate de Datagan 360 precargada con éxito!');
      await loadMetrics();
      setSelectedMetric(OFFICIAL_DATAGAN_METRICS[0]);
    } catch (e) {
      console.error(e);
      showToast('Error al precargar biblioteca', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMetric) return;
    if (!selectedMetric.id.trim() || !selectedMetric.label.trim()) {
      showToast('El identificador (ID) y el nombre del parámetro son obligatorios', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const cleanId = selectedMetric.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const payload: Metric = {
        ...selectedMetric,
        id: cleanId,
        templateType: selectedMetric.templateType || 'custom'
      };

      await set(ref(db, `metrics/${cleanId}`), payload);
      showToast(`Parámetro "${payload.label}" guardado exitosamente en Firebase`);
      await loadMetrics();
      setSelectedMetric(payload);
    } catch (e) {
      console.error(e);
      showToast('Error al guardar en Firebase', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${id}"?`)) return;

    try {
      await remove(ref(db, `metrics/${id}`));
      showToast('Elemento eliminado');
      if (selectedMetric?.id === id) setSelectedMetric(null);
      await loadMetrics();
    } catch (e) {
      console.error(e);
      showToast('Error al eliminar', 'error');
    }
  };

  // Ayudantes para campos dinámicos de cada plantilla
  const addVisualLevel = () => {
    if (!selectedMetric) return;
    const current = selectedMetric.visualLevels || [];
    const next: VisualScaleLevel = {
      level: String(current.length + 1),
      title: 'Nuevo Grado / Nivel',
      description: 'Criterio visual de este nivel...',
      status: 'optimal'
    };
    setSelectedMetric({ ...selectedMetric, visualLevels: [...current, next] });
  };

  const updateVisualLevel = (index: number, field: keyof VisualScaleLevel, val: any) => {
    if (!selectedMetric?.visualLevels) return;
    const next = [...selectedMetric.visualLevels];
    next[index] = { ...next[index], [field]: val };
    setSelectedMetric({ ...selectedMetric, visualLevels: next });
  };

  const removeVisualLevel = (index: number) => {
    if (!selectedMetric?.visualLevels) return;
    const next = selectedMetric.visualLevels.filter((_, i) => i !== index);
    setSelectedMetric({ ...selectedMetric, visualLevels: next });
  };

  const addProtocolStep = () => {
    if (!selectedMetric) return;
    const current = selectedMetric.protocolSteps || [];
    const next: ProtocolStep = {
      stepNumber: current.length + 1,
      title: `Paso ${current.length + 1}: Nueva Acción`,
      timing: 'A demanda',
      instructions: 'Instrucciones del procedimiento...'
    };
    setSelectedMetric({ ...selectedMetric, protocolSteps: [...current, next] });
  };

  const updateProtocolStep = (index: number, field: keyof ProtocolStep, val: any) => {
    if (!selectedMetric?.protocolSteps) return;
    const next = [...selectedMetric.protocolSteps];
    next[index] = { ...next[index], [field]: val };
    setSelectedMetric({ ...selectedMetric, protocolSteps: next });
  };

  const removeProtocolStep = (index: number) => {
    if (!selectedMetric?.protocolSteps) return;
    const next = selectedMetric.protocolSteps.filter((_, i) => i !== index);
    setSelectedMetric({ ...selectedMetric, protocolSteps: next });
  };

  const addDecisionRow = () => {
    if (!selectedMetric) return;
    const current = selectedMetric.decisionRows || [];
    const next: DecisionRow = {
      condition: 'Si se observa la condición...',
      probableCause: 'Causa zootécnica...',
      recommendedAction: 'Acción operativa inmediata...',
      priority: 'medium'
    };
    setSelectedMetric({ ...selectedMetric, decisionRows: [...current, next] });
  };

  const updateDecisionRow = (index: number, field: keyof DecisionRow, val: any) => {
    if (!selectedMetric?.decisionRows) return;
    const next = [...selectedMetric.decisionRows];
    next[index] = { ...next[index], [field]: val };
    setSelectedMetric({ ...selectedMetric, decisionRows: next });
  };

  const removeDecisionRow = (index: number) => {
    if (!selectedMetric?.decisionRows) return;
    const next = selectedMetric.decisionRows.filter((_, i) => i !== index);
    setSelectedMetric({ ...selectedMetric, decisionRows: next });
  };

  const addCustomField = () => {
    if (!selectedMetric) return;
    const current = selectedMetric.customFields || [];
    const next: CustomField = { label: 'Nuevo Atributo', value: 'Valor' };
    setSelectedMetric({ ...selectedMetric, customFields: [...current, next] });
  };

  const updateCustomField = (index: number, field: keyof CustomField, val: string) => {
    if (!selectedMetric?.customFields) return;
    const next = [...selectedMetric.customFields];
    next[index] = { ...next[index], [field]: val };
    setSelectedMetric({ ...selectedMetric, customFields: next });
  };

  const removeCustomField = (index: number) => {
    if (!selectedMetric?.customFields) return;
    const next = selectedMetric.customFields.filter((_, i) => i !== index);
    setSelectedMetric({ ...selectedMetric, customFields: next });
  };

  // Filtrado
  const categories = ['Todas', ...Array.from(new Set(metrics.map((m) => m.category || 'General')))];

  const filteredMetrics = metrics.filter((m) => {
    const matchesSearch =
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(search.toLowerCase())) ||
      (m.unit && m.unit.toLowerCase().includes(search.toLowerCase())) ||
      m.id.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'Todas' || m.category === selectedCategory;
    const matchesTemplate = selectedTemplateFilter === 'all' || m.templateType === selectedTemplateFilter;

    return matchesSearch && matchesCategory && matchesTemplate;
  });

  const currentTemplate = selectedMetric?.templateType || 'formula';

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col pb-16">
      {/* Toast Notificación */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-xs font-bold transition-all animate-in slide-in-from-bottom duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header de Acciones del Módulo de Métricas */}
      <header className="bg-white border-b border-[#e2e4f0] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#6d28d2]/10 border border-[#6d28d2]/20 flex items-center justify-center text-[#6d28d2]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#2a2b3f]">Gestor de Métricas & Parámetros Asociados</h1>
              <span className="text-xs font-bold bg-[#6d28d2] text-white px-2.5 py-0.5 rounded-full">
                {metrics.length} Registros
              </span>
            </div>
            <p className="text-xs text-[#595c73]">
              Máxima manejabilidad: Crea fórmulas, escalas visuales de condición, protocolos clínicos, matrices de decisión o glosario.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={seedOfficialLibrary}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="Precarga la biblioteca completa con Fórmulas, Escalas Visuales CC 1-5, Protocolos y Glosario"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Precargar Biblioteca Oficial</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!selectedMetric || isSaving}
            className="flex items-center gap-2 bg-[#6d28d2] hover:bg-[#591fb0] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Parámetro'}</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Navegador Lateral + Workspace Editor */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Izquierdo: Lista & Filtros */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#d1d2e0] shadow-xs flex flex-col h-[calc(100vh-140px)] sticky top-[125px] overflow-hidden">
          {/* Barra de Búsqueda y Botones de Creación Rápida por Plantilla */}
          <div className="p-4 border-b border-[#e9eaf2] space-y-3 bg-[#fafbfe]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#595c73] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, categoría o fórmula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
              />
            </div>

            {/* Selector de Plantilla para CREAR */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9194ac] mb-1.5">
                Crear Nuevo con Plantilla:
              </span>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                <button
                  onClick={() => createWithTemplate('formula')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>📐 Fórmula</span>
                </button>
                <button
                  onClick={() => createWithTemplate('visual_scale')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>👁️ Escala Visual</span>
                </button>
                <button
                  onClick={() => createWithTemplate('protocol')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>📋 Protocolo</span>
                </button>
                <button
                  onClick={() => createWithTemplate('decision_matrix')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>⚖️ Matriz Decisión</span>
                </button>
                <button
                  onClick={() => createWithTemplate('glossary')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>💡 Glosario</span>
                </button>
                <button
                  onClick={() => createWithTemplate('custom')}
                  className="p-1.5 rounded-lg border border-[#d1d2e0] bg-white hover:border-[#6d28d2] hover:text-[#6d28d2] flex items-center justify-center gap-1 transition-all"
                >
                  <span>🎯 Libre</span>
                </button>
              </div>
            </div>

            {/* Filtros de Categorías */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#2a2b3f] text-white'
                      : 'bg-white text-[#595c73] border border-[#e9eaf2] hover:border-[#d1d2e0]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Registros */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#9194ac]">
                <div className="w-6 h-6 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Cargando biblioteca de parámetros...
              </div>
            ) : filteredMetrics.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#595c73] space-y-3">
                <p>No se encontraron registros con ese filtro.</p>
                <button
                  onClick={seedOfficialLibrary}
                  className="px-3 py-1.5 bg-[#6d28d2] text-white rounded-lg font-bold text-[11px]"
                >
                  Precargar Biblioteca Oficial
                </button>
              </div>
            ) : (
              filteredMetrics.map((m) => {
                const isSelected = selectedMetric?.id === m.id;
                const templateIcon =
                  m.templateType === 'visual_scale' ? '👁️ Escala' :
                  m.templateType === 'protocol' ? '📋 Protocolo' :
                  m.templateType === 'decision_matrix' ? '⚖️ Matriz' :
                  m.templateType === 'glossary' ? '💡 Glosario' :
                  m.templateType === 'custom' ? '🎯 Libre' : '📐 Fórmula';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMetric(m)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#6d28d2] bg-[#f8f6fe] shadow-xs'
                        : 'border-[#e9eaf2] bg-white hover:border-[#d1d2e0] hover:bg-[#fafbfe]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a374f9] px-2 py-0.5 rounded-md bg-[#a374f9]/10">
                        {m.category || 'General'}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-[#475569] px-2 py-0.5 rounded font-bold">
                        {templateIcon}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-[#2a2b3f] mt-1.5 leading-snug">{m.label}</h4>
                    <p className="text-[11px] text-[#595c73] mt-1 line-clamp-2 leading-relaxed">
                      {m.shortDescription || m.definition}
                    </p>

                    {m.formula && (
                      <div className="mt-2 text-[10px] font-mono bg-slate-900 text-emerald-400 px-2.5 py-1 rounded-md truncate">
                        ∑ {m.formula}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Derecho: Editor Completo Multi-Plantilla */}
        {selectedMetric ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Barra de Cambio de Plantilla del Registro Actual */}
            <div className="bg-white rounded-2xl border border-[#d1d2e0] p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#2a2b3f]">Tipo de Plantilla:</span>
                <span className="text-xs text-[#595c73]">Adapta los campos según la naturaleza del dato</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'formula', label: '📐 Fórmula', desc: 'KPI cuantitativo con cálculo' },
                    { id: 'visual_scale', label: '👁️ Escala Visual', desc: 'Calificación por niveles/fotos' },
                    { id: 'protocol', label: '📋 Protocolo', desc: 'Paso a paso cronológico' },
                    { id: 'decision_matrix', label: '⚖️ Matriz Decisión', desc: 'Triaje condicional Si -> Acción' },
                    { id: 'glossary', label: '💡 Glosario', desc: 'Concepto sin fórmula' },
                    { id: 'custom', label: '🎯 Personalizado', desc: 'Campos libres' }
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedMetric({ ...selectedMetric, templateType: t.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentTemplate === t.id
                        ? 'bg-[#6d28d2] text-white shadow-xs'
                        : 'bg-[#f6f7f9] text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#e9eaf2]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarjeta 1: Información General / Base */}
            <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#e9eaf2]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6d28d2]" />
                  <h3 className="font-bold text-base text-[#2a2b3f]">Información General</h3>
                </div>
                <button
                  onClick={() => handleDelete(selectedMetric.id)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Registro</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Identificador ID (Slug)</label>
                  <input
                    type="text"
                    value={selectedMetric.id}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, id: e.target.value })}
                    className="w-full text-xs font-mono bg-[#f6f7f9] p-2.5 rounded-xl border border-[#d1d2e0] text-[#2a2b3f]"
                    placeholder="ej: condicion_corporal_cc"
                  />
                  <p className="text-[10px] text-[#9194ac] mt-1">Se almacena en el arreglo de lecciones.</p>
                </div>

                <div className="md:col-span-8">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Nombre / Título</label>
                  <input
                    type="text"
                    value={selectedMetric.label}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, label: e.target.value })}
                    className="w-full text-xs font-bold text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                    placeholder="ej: Score de Condición Corporal (1 a 5)"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Categoría</label>
                  <input
                    type="text"
                    value={selectedMetric.category}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, category: e.target.value })}
                    className="w-full text-xs text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                    placeholder="ej: Nutrición y Zootecnia, Gestión Lechera, Sanidad..."
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Unidad o Escala de Medida (Opcional)</label>
                  <input
                    type="text"
                    value={selectedMetric.unit || ''}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, unit: e.target.value })}
                    className="w-full text-xs font-mono font-bold text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                    placeholder="ej: Puntos (1-5), L/vaca/día, %, N/A"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Descripción Breve (Resumen de Ficha)</label>
                  <input
                    type="text"
                    value={selectedMetric.shortDescription || ''}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, shortDescription: e.target.value })}
                    className="w-full text-xs text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                    placeholder="Resumen de 1 línea del indicador o protocolo..."
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Definición y Alcance Zootécnico / Práctico</label>
                  <textarea
                    rows={3}
                    value={selectedMetric.definition || ''}
                    onChange={(e) => setSelectedMetric({ ...selectedMetric, definition: e.target.value })}
                    className="w-full text-xs text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0] leading-relaxed"
                    placeholder="Explicación detallada del por qué es importante este parámetro y cómo se interpreta en campo..."
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN CONDICIONAL POR PLANTILLA */}

            {/* 1. CAMPOS DE PLANTILLA: FÓRMULA MATEMÁTICA */}
            {(currentTemplate === 'formula' || currentTemplate === 'custom') && (
              <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                  <span className="font-mono text-[#a374f9] font-bold text-lg">∑</span>
                  <span>Fórmula Matemática & Procedimiento de Cálculo</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Expresión de la Fórmula (Opcional)</label>
                    <input
                      type="text"
                      value={selectedMetric.formula || ''}
                      onChange={(e) => setSelectedMetric({ ...selectedMetric, formula: e.target.value })}
                      className="w-full text-xs font-mono font-bold bg-[#1e202d] text-emerald-400 p-3 rounded-xl border border-[#3d4055]"
                      placeholder="ej: Produccion_Total_Litros / Vacas_En_Ordeño"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Variables y Procedimiento de Cálculo</label>
                    <textarea
                      rows={2}
                      value={selectedMetric.formulaExplanation || ''}
                      onChange={(e) => setSelectedMetric({ ...selectedMetric, formulaExplanation: e.target.value })}
                      className="w-full text-xs text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                      placeholder="ej: Produccion_Total_Litros: suma AM + PM. Vacas_En_Ordeño: animales activos."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. CAMPOS DE PLANTILLA: ESCALA VISUAL CUALITATIVA (Condición Corporal, Cojeras, etc.) */}
            {(currentTemplate === 'visual_scale' || currentTemplate === 'custom') && (
              <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#6d28d2]" />
                      <span>Niveles / Grados de la Escala Visual</span>
                    </h3>
                    <p className="text-xs text-[#595c73] mt-0.5">
                      Define los niveles cualitativos (ej: Grado 1 a Grado 5) con sus características anatómicas visuales.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVisualLevel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2]/5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Grado / Nivel</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(selectedMetric.visualLevels || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-[#e9eaf2] bg-[#f6f7f9] text-center text-xs text-[#595c73]">
                      No has añadido grados a la escala visual. Pulsa &ldquo;Añadir Grado / Nivel&rdquo; para estructurarla.
                    </div>
                  ) : (
                    selectedMetric.visualLevels?.map((vl, vIdx) => (
                      <div key={vIdx} className="p-4 rounded-xl border border-[#d1d2e0] bg-[#fafbfe] space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={vl.level}
                              onChange={(e) => updateVisualLevel(vIdx, 'level', e.target.value)}
                              placeholder="Score (ej: 1.0)"
                              className="w-20 text-xs font-mono font-bold text-center bg-white px-2 py-1.5 rounded-lg border border-[#d1d2e0]"
                            />
                            <input
                              type="text"
                              value={vl.title}
                              onChange={(e) => updateVisualLevel(vIdx, 'title', e.target.value)}
                              placeholder="Título (ej: Emaciada / Muy Flaca)"
                              className="text-xs font-bold text-[#2a2b3f] bg-white px-3 py-1.5 rounded-lg border border-[#d1d2e0] w-64"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={vl.status}
                              onChange={(e) => updateVisualLevel(vIdx, 'status', e.target.value)}
                              className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#d1d2e0] bg-white"
                            >
                              <option value="optimal">Óptimo (Verde)</option>
                              <option value="warning">Alerta (Amarillo)</option>
                              <option value="critical">Crítico (Rojo)</option>
                              <option value="info">Informativo (Azul)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeVisualLevel(vIdx)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={vl.description}
                          onChange={(e) => updateVisualLevel(vIdx, 'description', e.target.value)}
                          placeholder="Descripción visual anatómica (apófisis, grasa visible, fosa lumbar)..."
                          className="w-full text-xs text-[#2a2b3f] bg-white p-2 rounded-lg border border-[#d1d2e0]"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. CAMPOS DE PLANTILLA: PROTOCOLO PASO A PASO */}
            {(currentTemplate === 'protocol' || currentTemplate === 'custom') && (
              <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-[#6d28d2]" />
                      <span>Pasos del Protocolo Operativo</span>
                    </h3>
                    <p className="text-xs text-[#595c73] mt-0.5">
                      Secuencia cronológica de maniobras, tiempos y advertencias críticas zootécnicas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addProtocolStep}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2]/5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Paso</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(selectedMetric.protocolSteps || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-[#e9eaf2] bg-[#f6f7f9] text-center text-xs text-[#595c73]">
                      No has configurado pasos para este protocolo.
                    </div>
                  ) : (
                    selectedMetric.protocolSteps?.map((step, sIdx) => (
                      <div key={sIdx} className="p-4 rounded-xl border border-[#d1d2e0] bg-[#fafbfe] space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#6d28d2] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {step.stepNumber}
                            </span>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateProtocolStep(sIdx, 'title', e.target.value)}
                              placeholder="Título del paso (ej: Día 0: Inserción)"
                              className="text-xs font-bold text-[#2a2b3f] bg-white px-3 py-1.5 rounded-lg border border-[#d1d2e0] w-64"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#d1d2e0]">
                              <Clock className="w-3 h-3 text-[#595c73]" />
                              <input
                                type="text"
                                value={step.timing || ''}
                                onChange={(e) => updateProtocolStep(sIdx, 'timing', e.target.value)}
                                placeholder="Momento / Hora (ej: 08:00 AM)"
                                className="text-xs font-mono outline-none w-32"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProtocolStep(sIdx)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={step.instructions}
                          onChange={(e) => updateProtocolStep(sIdx, 'instructions', e.target.value)}
                          placeholder="Instrucciones precisas de este paso operativo..."
                          className="w-full text-xs text-[#2a2b3f] bg-white p-2 rounded-lg border border-[#d1d2e0]"
                        />

                        <input
                          type="text"
                          value={step.criticalNote || ''}
                          onChange={(e) => updateProtocolStep(sIdx, 'criticalNote', e.target.value)}
                          placeholder="Advertencia zootécnica crítica (ej: Desinfectar vulva antes de insertar)..."
                          className="w-full text-xs text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. CAMPOS DE PLANTILLA: MATRIZ DE DECISIÓN / DIAGNÓSTICO */}
            {(currentTemplate === 'decision_matrix' || currentTemplate === 'custom') && (
              <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#6d28d2]" />
                      <span>Matriz de Decisión & Triaje Clínico</span>
                    </h3>
                    <p className="text-xs text-[#595c73] mt-0.5">
                      Condiciones observadas en campo y su correspondiente acción de manejo o tratamiento.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addDecisionRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2]/5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Criterio</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(selectedMetric.decisionRows || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-[#e9eaf2] bg-[#f6f7f9] text-center text-xs text-[#595c73]">
                      No has añadido criterios a la matriz de decisión.
                    </div>
                  ) : (
                    selectedMetric.decisionRows?.map((row, rIdx) => (
                      <div key={rIdx} className="p-4 rounded-xl border border-[#d1d2e0] bg-[#fafbfe] space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <input
                            type="text"
                            value={row.condition}
                            onChange={(e) => updateDecisionRow(rIdx, 'condition', e.target.value)}
                            placeholder="Condición observada (ej: Leche con grumos o sangre)..."
                            className="text-xs font-bold text-[#2a2b3f] bg-white px-3 py-1.5 rounded-lg border border-[#d1d2e0] flex-1"
                          />

                          <div className="flex items-center gap-2">
                            <select
                              value={row.priority}
                              onChange={(e) => updateDecisionRow(rIdx, 'priority', e.target.value)}
                              className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#d1d2e0] bg-white"
                            >
                              <option value="high">Prioridad Alta / Urgente</option>
                              <option value="medium">Prioridad Media</option>
                              <option value="low">Prioridad Baja / Monitoreo</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeDecisionRow(rIdx)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={row.probableCause || ''}
                            onChange={(e) => updateDecisionRow(rIdx, 'probableCause', e.target.value)}
                            placeholder="Causa zootécnica probable..."
                            className="text-xs text-[#475569] bg-white p-2 rounded-lg border border-[#d1d2e0]"
                          />
                          <input
                            type="text"
                            value={row.recommendedAction}
                            onChange={(e) => updateDecisionRow(rIdx, 'recommendedAction', e.target.value)}
                            placeholder="Acción / Tratamiento recomendado..."
                            className="text-xs font-bold text-emerald-800 bg-emerald-50/50 p-2 rounded-lg border border-emerald-200"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. CAMPOS DE PLANTILLA: GLOSARIO / CONCEPTO CLAVE */}
            {(currentTemplate === 'glossary' || currentTemplate === 'custom') && (
              <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#6d28d2]" />
                  <span>Enseñanza Clave & Casos de Ejemplo</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Regla de Oro / Conclusión del Negocio Ganadero</label>
                    <textarea
                      rows={2}
                      value={selectedMetric.keyTakeaway || ''}
                      onChange={(e) => setSelectedMetric({ ...selectedMetric, keyTakeaway: e.target.value })}
                      className="w-full text-xs font-medium text-[#2a2b3f] bg-purple-50/40 p-3 rounded-xl border border-purple-200 leading-relaxed"
                      placeholder="Conclusión zootécnica o financiera fundamental que el estudiante debe memorizar..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Ejemplos Prácticos en Finca (Uno por línea)</label>
                    <textarea
                      rows={3}
                      value={(selectedMetric.examples || []).join('\n')}
                      onChange={(e) => setSelectedMetric({ ...selectedMetric, examples: e.target.value.split('\n').filter(Boolean) })}
                      className="w-full text-xs text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                      placeholder="Escribe cada caso o ejemplo práctico en una línea separada..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. CAMPOS ADICIONALES LIBRES (Máxima Manejabilidad) */}
            <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#2a2b3f] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#6d28d2]" />
                    <span>Atributos & Metadatos Personalizados Libres</span>
                  </h3>
                  <p className="text-xs text-[#595c73] mt-0.5">
                    ¿Necesitas añadir un dato no contemplado? Añade cualquier par etiqueta / valor sin límites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2]/5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Atributo Libre</span>
                </button>
              </div>

              <div className="space-y-2">
                {(selectedMetric.customFields || []).length === 0 ? (
                  <p className="text-xs text-[#9194ac] italic">Sin atributos adicionales personalizados.</p>
                ) : (
                  selectedMetric.customFields?.map((cf, cfIdx) => (
                    <div key={cfIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cf.label}
                        onChange={(e) => updateCustomField(cfIdx, 'label', e.target.value)}
                        placeholder="Nombre del Atributo"
                        className="text-xs font-bold text-[#2a2b3f] bg-[#f6f7f9] p-2 rounded-lg border border-[#d1d2e0] w-48"
                      />
                      <input
                        type="text"
                        value={cf.value}
                        onChange={(e) => updateCustomField(cfIdx, 'value', e.target.value)}
                        placeholder="Valor del Atributo..."
                        className="text-xs text-[#2a2b3f] bg-white p-2 rounded-lg border border-[#d1d2e0] flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(cfIdx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold p-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* LIVE PREVIEW MULTI-PLANTILLA EN TIEMPO REAL */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-[#a374f9]/50 bg-[#fbf9fe] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#a374f9] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Live Preview en el Aula Virtual (Pestaña Métricas)</span>
                </span>
                <span className="text-[10px] text-[#9194ac]">Plantilla: {currentTemplate}</span>
              </div>

              {/* Renderizado de la tarjeta exactamente como se verá en el curso */}
              <div className="rounded-2xl border border-[#d1d2e0] bg-white shadow-xs p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a374f9]">
                      {selectedMetric.category || 'General'}
                    </span>
                    <h3 className="text-lg font-bold text-[#2a2b3f] leading-tight">{selectedMetric.label}</h3>
                    <p className="text-xs font-semibold text-[#595c73] mt-0.5">{selectedMetric.shortDescription}</p>
                  </div>
                  {selectedMetric.unit && (
                    <span className="bg-[#f6f7f9] border border-[#e9eaf2] px-3 py-1 rounded-lg text-xs font-mono font-bold text-[#2a2b3f] shrink-0">
                      {selectedMetric.unit}
                    </span>
                  )}
                </div>

                <div className="bg-[#fdfcff] p-4 rounded-xl border border-[#e9eaf2] text-xs text-[#2a2b3f] leading-relaxed">
                  {selectedMetric.definition}
                </div>

                {/* Vista previa Escala Visual */}
                {selectedMetric.visualLevels && selectedMetric.visualLevels.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-[#2a2b3f]">Niveles de Calificación Visual:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {selectedMetric.visualLevels.map((vl, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-[#e9eaf2] bg-[#f8fafc] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-extrabold text-[#6d28d2]">Score {vl.level}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              vl.status === 'optimal' ? 'bg-emerald-100 text-emerald-800' :
                              vl.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                              vl.status === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {vl.status}
                            </span>
                          </div>
                          <p className="font-bold text-[11px] text-[#0f172a]">{vl.title}</p>
                          <p className="text-[10px] text-[#475569] leading-snug">{vl.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vista previa Protocolo */}
                {selectedMetric.protocolSteps && selectedMetric.protocolSteps.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-[#2a2b3f]">Pasos del Procedimiento:</h4>
                    <div className="space-y-2">
                      {selectedMetric.protocolSteps.map((st, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-[#e9eaf2] bg-[#fafbfe] flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-[#6d28d2] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {st.stepNumber}
                          </span>
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#2a2b3f]">{st.title}</span>
                              {st.timing && <span className="text-[10px] text-[#6d28d2] font-mono">{st.timing}</span>}
                            </div>
                            <p className="text-[11px] text-[#475569] mt-0.5">{st.instructions}</p>
                            {st.criticalNote && (
                              <p className="text-[10px] text-amber-800 mt-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                                ⚠️ {st.criticalNote}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vista previa Matriz de Decisión */}
                {selectedMetric.decisionRows && selectedMetric.decisionRows.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-[#2a2b3f]">Matriz de Diagnóstico y Decisión:</h4>
                    <div className="border border-[#e9eaf2] rounded-xl overflow-hidden divide-y divide-[#e9eaf2] text-xs">
                      {selectedMetric.decisionRows.map((dr, idx) => (
                        <div key={idx} className="p-3 bg-white space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#0f172a]">Condición: {dr.condition}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              dr.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                              dr.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {dr.priority}
                            </span>
                          </div>
                          {dr.probableCause && <p className="text-[11px] text-[#64748b]">Causa: {dr.probableCause}</p>}
                          <p className="text-[11px] font-semibold text-emerald-700">Acción: {dr.recommendedAction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vista previa Glosario */}
                {selectedMetric.keyTakeaway && (
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950">
                    <strong>💡 Regla de Oro / Takeaway:</strong> {selectedMetric.keyTakeaway}
                  </div>
                )}

                {/* Vista previa Fórmula */}
                {selectedMetric.formula && (
                  <div className="bg-[#202230] p-3.5 rounded-xl border border-[#3d4055] text-emerald-400 font-mono text-xs shadow-inner">
                    ∑ {selectedMetric.formula}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#d1d2e0] p-12 text-center text-[#595c73] flex flex-col items-center justify-center min-h-[400px]">
            <Sparkles className="w-12 h-12 text-[#a374f9] opacity-40 mb-3" />
            <h3 className="font-bold text-base text-[#2a2b3f]">Ningún parámetro seleccionado</h3>
            <p className="text-xs text-[#9194ac] max-w-sm mt-1">
              Selecciona una métrica en el panel izquierdo o pulsa cualquiera de las plantillas rápidas en la parte superior.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
