"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Save, Trash2, CheckCircle2, 
  ExternalLink, Target, Sparkles, BookOpen, Layers,
  Check, AlertCircle, RefreshCw, ChevronRight, HelpCircle,
  MousePointerClick, BarChart3
} from 'lucide-react';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { SandboxMission, MissionRule, Course } from '@/types';

// Pre-configured Default Missions for Datagan
const DEFAULT_MISSIONS: SandboxMission[] = [
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

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<SandboxMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<SandboxMission | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterCourseSlug, setFilterCourseSlug] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar misiones desde Firebase
      const snapMissions = await get(ref(db, 'missions'));
      if (snapMissions.exists()) {
        const data = snapMissions.val();
        const loaded: SandboxMission[] = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })).sort((a, b) => (a.order || 0) - (b.order || 0));
        setMissions(loaded);
        if (loaded.length > 0) setSelectedMission(loaded[0]);
      } else {
        // Sembrar las 3 misiones predeterminadas si la base de datos está vacía
        setMissions(DEFAULT_MISSIONS);
        setSelectedMission(DEFAULT_MISSIONS[0]);
        // Guardar automáticamente en Firebase
        for (const m of DEFAULT_MISSIONS) {
          await set(ref(db, `missions/${m.id}`), m);
        }
      }

      // 2. Cargar cursos disponibles para vinculación
      const snapCourses = await get(ref(db, 'courses'));
      if (snapCourses.exists()) {
        const cData = snapCourses.val();
        setCourses(Object.keys(cData).map(k => cData[k]));
      }
    } catch (err) {
      console.error("Error loading missions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const nextOrder = missions.length + 1;
    const newMission: SandboxMission = {
      id: `mision-${nextOrder}`,
      order: nextOrder,
      title: `Nueva Misión ${nextOrder}: Caso Operativo`,
      category: 'Manejo General',
      courseSlug: courses[0]?.slug || 'datagan-master-pro',
      targetModule: 'animales',
      summary: 'Descripción breve de la tarea zootécnica requerida.',
      context: 'Describe aquí el caso ganadero real que motiva esta misión...',
      instructions: [
        'Abre el módulo correspondiente en el menú lateral.',
        'Completa los datos requeridos en el formulario.',
        'Guarda el registro y pulsa Comprobar en el banner.'
      ],
      rules: [
        { field: 'id', operator: 'not_empty', value: '', label: 'Registro debe contar con identificador' }
      ],
      solutionSteps: [
        'Dirígete al módulo asignado.',
        'Ingresa los datos solicitados y guarda.'
      ],
      autoFillPayload: {},
      published: true
    };

    setMissions(prev => [...prev, newMission]);
    setSelectedMission(newMission);
  };

  const handleSave = async () => {
    if (!selectedMission) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const cleanMission = JSON.parse(JSON.stringify(selectedMission));
      await set(ref(db, `missions/${selectedMission.id}`), cleanMission);
      setMissions(prev => prev.map(m => m.id === selectedMission.id ? cleanMission : m));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error("Error saving mission:", err);
      alert(`Error al guardar en Firebase: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la misión "${id}"?`)) return;
    try {
      await remove(ref(db, `missions/${id}`));
      const remaining = missions.filter(m => m.id !== id);
      setMissions(remaining);
      setSelectedMission(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      console.error("Error deleting mission:", err);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm("¿Deseas restablecer las 3 misiones oficiales predeterminadas?")) return;
    setLoading(true);
    try {
      for (const m of DEFAULT_MISSIONS) {
        await set(ref(db, `missions/${m.id}`), m);
      }
      setMissions(DEFAULT_MISSIONS);
      setSelectedMission(DEFAULT_MISSIONS[0]);
      alert("Misiones oficiales restablecidas con éxito.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof SandboxMission, value: any) => {
    if (!selectedMission) return;
    setSelectedMission({ ...selectedMission, [field]: value });
  };

  const addInstruction = () => {
    if (!selectedMission) return;
    updateField('instructions', [...selectedMission.instructions, 'Nuevo paso de instrucción...']);
  };

  const updateInstruction = (idx: number, val: string) => {
    if (!selectedMission) return;
    const list = [...selectedMission.instructions];
    list[idx] = val;
    updateField('instructions', list);
  };

  const removeInstruction = (idx: number) => {
    if (!selectedMission) return;
    const list = [...selectedMission.instructions];
    list.splice(idx, 1);
    updateField('instructions', list);
  };

  const addRule = () => {
    if (!selectedMission) return;
    const newRule: MissionRule = {
      field: 'id',
      operator: 'equals',
      value: '',
      label: 'Regla de verificación'
    };
    updateField('rules', [...selectedMission.rules, newRule]);
  };

  const updateRule = (idx: number, field: keyof MissionRule, val: any) => {
    if (!selectedMission) return;
    const list = [...selectedMission.rules];
    list[idx] = { ...list[idx], [field]: val };
    updateField('rules', list);
  };

  const removeRule = (idx: number) => {
    if (!selectedMission) return;
    const list = [...selectedMission.rules];
    list.splice(idx, 1);
    updateField('rules', list);
  };

  const addSolutionStep = () => {
    if (!selectedMission) return;
    updateField('solutionSteps', [...(selectedMission.solutionSteps || []), 'Paso guiado de solución...']);
  };

  const updateSolutionStep = (idx: number, val: string) => {
    if (!selectedMission) return;
    const list = [...(selectedMission.solutionSteps || [])];
    list[idx] = val;
    updateField('solutionSteps', list);
  };

  const removeSolutionStep = (idx: number) => {
    if (!selectedMission) return;
    const list = [...(selectedMission.solutionSteps || [])];
    list.splice(idx, 1);
    updateField('solutionSteps', list);
  };

  const filteredMissions = missions.filter(m => 
    (filterCourseSlug === 'all' || m.courseSlug === filterCourseSlug) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#202230] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#10b981]" />
          <span className="text-sm font-semibold">Cargando Gestor de Misiones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f4f5f9] flex flex-col font-sans">
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
            Fase 3 • Simulador Finca Ficticia DataGan 360
          </span>
          <h1 className="text-base font-extrabold text-[#2a2b3f]">
            Gestor de Misiones y Reglas de Validación
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRestoreDefaults}
            className="px-3.5 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#6d28d2] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
            title="Restablecer las 3 misiones ganaderas oficiales"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restablecer Base</span>
          </button>

          <a
            href="/sandbox"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Probar en Sandbox</span>
          </a>

          <button
            onClick={handleSave}
            disabled={isSaving || !selectedMission}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#6d28d2] text-white hover:bg-[#591fb0]'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Guardando...' : saveSuccess ? '¡Guardado!' : 'Guardar Misión'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Two Column Layout) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Mission Directory */}
        <aside className="w-80 bg-white border-r border-[#d1d2e0] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#e9eaf2] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#595c73]">Misiones ({missions.length})</h3>
              <button
                onClick={handleCreateNew}
                className="p-1.5 rounded-lg bg-[#6d28d2] text-white hover:bg-[#591fb0] text-xs font-bold flex items-center gap-1 transition-all"
                title="Crear nueva misión"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="Buscar misiones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
            />
            <select
              value={filterCourseSlug}
              onChange={(e) => setFilterCourseSlug(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-[#d1d2e0] rounded-lg bg-white font-medium text-[#2a2b3f]"
            >
              <option value="all">Todos los Cursos</option>
              {courses.map((c) => (
                <option key={c.slug} value={c.slug}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#e9eaf2]">
            {filteredMissions.map((m) => {
              const isSelected = selectedMission?.id === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedMission(m)}
                  className={`w-full text-left p-4 cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden ${
                    isSelected
                      ? 'bg-[#6d28d2]/10 ring-1 ring-[#6d28d2]/30 rounded-lg'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#6d28d2] text-white font-mono">
                      M{m.order || 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.published ? 'Publicada' : 'Borrador'}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[#2a2b3f] line-clamp-1">{m.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-[#595c73] mt-2">
                    <span className="capitalize text-[#6d28d2] font-semibold">{m.targetModule}</span>
                    <span>{m.rules?.length || 0} reglas</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Column: Mission Editor Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {selectedMission ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Box */}
              <div className="bg-white p-6 rounded-2xl border border-[#d1d2e0] shadow-xs flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6d28d2]">Configuración de Misión</span>
                  <h2 className="text-xl font-black text-[#2a2b3f] mt-1">{selectedMission.title}</h2>
                  <p className="text-xs text-[#595c73] mt-1">ID del sistema: <code className="font-mono text-[#6d28d2]">{selectedMission.id}</code></p>
                </div>
                <button
                  onClick={() => handleDelete(selectedMission.id)}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Eliminar misión"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bloque 1: Identificación y Metadatos */}
              <div className="bg-white p-6 rounded-2xl border border-[#d1d2e0] shadow-xs space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#2a2b3f]">1. Identificación y Parámetros</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Título de la Misión</label>
                    <input
                      type="text"
                      value={selectedMission.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Orden / Número</label>
                    <input
                      type="number"
                      value={selectedMission.order || 1}
                      onChange={(e) => updateField('order', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Categoría Zootécnica</label>
                    <input
                      type="text"
                      value={selectedMission.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Módulo en Sandbox</label>
                    <select
                      value={selectedMission.targetModule}
                      onChange={(e) => updateField('targetModule', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                    >
                      <option value="nacimiento">Nacimientos (Partos)</option>
                      <option value="animales">Animales (Inventario)</option>
                      <option value="potreros">Potreros (Rotación)</option>
                      <option value="pesaje">Pesaje (Control GDP)</option>
                      <option value="leche">Leche (Ordeño Diario)</option>
                      <option value="veterinaria">Veterinaria (Sanidad)</option>
                      <option value="lotes">Lotes (Organización)</option>
                      <option value="inventario">Inventario (Bodega)</option>
                      <option value="ventas">Ventas (Comercial)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Estado de Publicación</label>
                    <select
                      value={selectedMission.published ? 'true' : 'false'}
                      onChange={(e) => updateField('published', e.target.value === 'true')}
                      className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                    >
                      <option value="true">Publicada (Visible al alumno)</option>
                      <option value="false">Borrador (Oculta)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Resumen Corto</label>
                  <input
                    type="text"
                    value={selectedMission.summary || ''}
                    onChange={(e) => updateField('summary', e.target.value)}
                    placeholder="Descripción resumida para tarjetas..."
                    className="w-full px-3 py-2 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                  />
                </div>
              </div>

              {/* Bloque 2: Contexto del Caso y Guía al Estudiante */}
              <div className="bg-white p-6 rounded-2xl border border-[#d1d2e0] shadow-xs space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#2a2b3f]">2. Caso Ganadero y Desafío</h3>
                <div>
                  <label className="block text-xs font-bold text-[#595c73] uppercase mb-1">Situación en Campo (Contexto)</label>
                  <textarea
                    rows={3}
                    value={selectedMission.context}
                    onChange={(e) => updateField('context', e.target.value)}
                    placeholder="Explica qué ocurrió en la finca y por qué se requiere la acción..."
                    className="w-full p-3 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2] leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[#595c73] uppercase">Pasos de Instrucción para el Estudiante</label>
                    <button
                      onClick={addInstruction}
                      className="text-xs font-bold text-[#6d28d2] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Paso</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedMission.instructions?.map((inst, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={inst}
                          onChange={(e) => updateInstruction(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                        />
                        <button
                          onClick={() => removeInstruction(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloque 3: Reglas de Validación (El Oráculo) */}
              <div className="bg-white p-6 rounded-2xl border border-[#d1d2e0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#2a2b3f]">3. Reglas de Validación Automática (Oráculo)</h3>
                    <p className="text-[11px] text-[#595c73] mt-0.5">El botón "Comprobar" verificará que el registro cumpla con estos criterios en LocalStorage.</p>
                  </div>
                  <button
                    onClick={addRule}
                    className="px-3 py-1.5 rounded-lg bg-[#6d28d2]/10 text-[#6d28d2] hover:bg-[#6d28d2]/20 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Regla</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedMission.rules?.map((rule, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Campo Evaluado</label>
                        <input
                          type="text"
                          value={rule.field}
                          onChange={(e) => updateRule(idx, 'field', e.target.value)}
                          placeholder="ej. madreId, peso"
                          className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded-md bg-white focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Operador</label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded-md bg-white focus:outline-none focus:border-[#6d28d2]"
                        >
                          <option value="equals">Es Igual A (==)</option>
                          <option value="greater_than">Es Mayor Que (&gt;)</option>
                          <option value="includes">Contiene Texto</option>
                          <option value="not_empty">No Está Vacío</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Valor Esperado</label>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => updateRule(idx, 'value', e.target.value)}
                          placeholder="ej. V-101 o 30"
                          className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded-md bg-white focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Etiqueta de Regla</label>
                          <input
                            type="text"
                            value={rule.label}
                            onChange={(e) => updateRule(idx, 'label', e.target.value)}
                            placeholder="Descripción humana..."
                            className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded-md bg-white focus:outline-none focus:border-[#6d28d2]"
                          />
                        </div>
                        <button
                          onClick={() => removeRule(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors mt-3"
                          title="Quitar regla"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloque 4: Asistencia Pedagógica (Botón Rendirse) */}
              <div className="bg-white p-6 rounded-2xl border border-[#d1d2e0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#2a2b3f]">4. Solución Guiada y Demostración (Botón "Rendirse")</h3>
                    <p className="text-[11px] text-[#595c73] mt-0.5">Contenido pedagógico que se desplegará si el estudiante pide ayuda o se rinde.</p>
                  </div>
                  <button
                    onClick={addSolutionStep}
                    className="text-xs font-bold text-[#6d28d2] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Paso</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedMission.solutionSteps?.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => updateSolutionStep(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-[#d1d2e0] rounded-lg bg-[#f8fafc] focus:outline-none focus:border-[#6d28d2]"
                      />
                      <button
                        onClick={() => removeSolutionStep(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="max-w-sm space-y-3">
                <Target className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">Ninguna misión seleccionada</h3>
                <p className="text-xs text-slate-500">Selecciona una misión del panel izquierdo o haz clic en "Nueva" para diseñar un reto.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
