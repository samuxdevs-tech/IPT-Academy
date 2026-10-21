"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ref, get, set, remove, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Scenario, ScenarioOption, Metric, Course } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, Plus, Save, Trash2, Image as ImageIcon, 
  CheckCircle2, MousePointerClick, MessageSquare, HelpCircle,
  Upload, Layers, Sparkles, Target, BarChart3, ExternalLink, ChevronRight
} from 'lucide-react';

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterCourseSlug, setFilterCourseSlug] = useState<string>('all');
  const [metricsList, setMetricsList] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedScenario) return;

    setIsUploadingImage(true);
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    const filename = `images/${Date.now()}_${cleanName}`;
    const workerUrl = `https://sweet-heart-d578.samuxdevs.workers.dev/${filename}`;

    try {
      const res = await fetch(workerUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/png' },
        body: file
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const publicUrl = data?.url || `https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/${filename}`;
        setSelectedScenario({ ...selectedScenario, imageUrl: publicUrl });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result && typeof reader.result === 'string') {
            setSelectedScenario({ ...selectedScenario, imageUrl: reader.result });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error subiendo a R2:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setSelectedScenario({ ...selectedScenario, imageUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const [scenSnap, metSnap, courseSnap] = await Promise.all([
        get(ref(db, 'scenarios')),
        get(ref(db, 'metrics')),
        get(ref(db, 'courses'))
      ]);

      if (scenSnap.exists()) {
        const data = scenSnap.val();
        const loaded: Scenario[] = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setScenarios(loaded);
      } else {
        setScenarios([]);
      }

      if (metSnap.exists()) {
        const metData = metSnap.val();
        setMetricsList(Object.keys(metData).map(k => metData[k]));
      }

      if (courseSnap.exists()) {
        const cData = courseSnap.val();
        setCourses(Object.keys(cData).map(k => ({ ...cData[k], slug: cData[k].slug || k })));
      }
    } catch (err) {
      console.error("Error loading scenarios or metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const createNewScenario = () => {
    const defaultSlug = filterCourseSlug !== 'all' ? filterCourseSlug : (courses[0]?.slug || 'datagan-master-pro');
    const newScenario: Scenario = {
      id: Date.now().toString(),
      courseSlug: defaultSlug,
      imageUrl: '',
      metricId: '',
      context: 'Nueva situación en campo...',
      question: '¿Qué módulo abres para...?',
      options: [
        { id: 'a', text: 'Opción 1', isCorrect: true },
        { id: 'b', text: 'Opción 2', isCorrect: false },
        { id: 'c', text: 'Opción 3', isCorrect: false },
        { id: 'd', text: 'Opción 4', isCorrect: false },
      ],
      explanation: 'Explicación de la respuesta correcta...'
    };
    setSelectedScenario(newScenario);
  };

  const handleSave = async () => {
    if (!selectedScenario) return;
    setIsSaving(true);
    try {
      await set(ref(db, `scenarios/${selectedScenario.id}`), selectedScenario);
      alert('Escenario guardado correctamente en Firebase');
      await loadScenarios();
    } catch (e) {
      console.error(e);
      alert('Error al guardar el escenario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este escenario visual?')) return;
    try {
      await remove(ref(db, `scenarios/${id}`));
      setSelectedScenario(null);
      await loadScenarios();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar');
    }
  };

  const updateOption = (optId: string, field: keyof ScenarioOption, value: any) => {
    if (!selectedScenario) return;
    const newOptions = selectedScenario.options.map(opt => {
      if (opt.id === optId) {
        // If we are setting this option to correct, unset others
        if (field === 'isCorrect' && value === true) {
          return { ...opt, isCorrect: true };
        }
        return { ...opt, [field]: value };
      }
      // If we are setting another option to correct, this one must be false
      if (field === 'isCorrect' && value === true) {
        return { ...opt, isCorrect: false };
      }
      return opt;
    });
    setSelectedScenario({ ...selectedScenario, options: newOptions });
  };

  return (
    <div className="flex-1 bg-[#f4f5f9] flex flex-col">
      {/* Breadcrumb de navegación */}
      <div className="bg-white px-6 pt-3 pb-1 border-b border-[#f0f1f7]">
        <nav className="flex items-center gap-2 text-xs text-[#595c73]" aria-label="Migas de pan">
          <Link href="/" className="hover:text-[#6d28d2] font-semibold transition-colors">
            Panel Principal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#a0a3bd]" />
          <span className="text-[#2a2b3f] font-bold">Escenarios Visuales</span>
        </nav>
      </div>

      <div className="bg-white border-b border-[#e2e4f0] px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
            Fase 2 • Entrenamiento de Reflejo Operativo
          </span>
          <h1 className="text-base font-extrabold text-[#2a2b3f]">
            Gestor de Escenarios Visuales Interactivos
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/scenarios"
            target="_blank"
            className="px-3.5 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Probar Simulador Fase 2</span>
          </Link>

          <button
            onClick={handleSave}
            disabled={!selectedScenario || isSaving}
            className="flex items-center gap-2 bg-[#6d28d2] text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-[#5b21b6] disabled:opacity-50 transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Escenario'}</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel lateral: Lista de escenarios */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#d1d2e0] shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-[88px]">
          <div className="p-4 border-b border-[#d1d2e0] flex items-center justify-between">
            <h3 className="font-bold text-[#2a2b3f]">Tus Escenarios</h3>
            <button
              onClick={createNewScenario}
              className="p-1.5 bg-[#6d28d2]/10 text-[#6d28d2] rounded-md hover:bg-[#6d28d2]/20"
              title="Nuevo Escenario"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de filtro por curso */}
          <div className="p-3 bg-[#f6f7f9] border-b border-[#d1d2e0]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#595c73] mb-1">
              Filtrar por Curso:
            </label>
            <select
              value={filterCourseSlug}
              onChange={(e) => setFilterCourseSlug(e.target.value)}
              className="w-full text-xs p-1.5 rounded-lg border border-[#d1d2e0] bg-white font-semibold text-[#2a2b3f]"
            >
              <option value="all">Todos los Cursos</option>
              {courses.map((c) => (
                <option key={c.slug} value={c.slug}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-[#9194ac]">Cargando...</div>
            ) : scenarios.filter(sc => filterCourseSlug === 'all' || sc.courseSlug === filterCourseSlug).length === 0 ? (
              <div className="p-4 text-center text-sm text-[#9194ac]">No hay escenarios para este curso.</div>
            ) : (
              scenarios
                .filter(sc => filterCourseSlug === 'all' || sc.courseSlug === filterCourseSlug)
                .map((sc, idx) => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedScenario?.id === sc.id ? 'bg-[#6d28d2] text-white font-medium shadow-md' : 'text-[#595c73] hover:bg-[#f6f7f9]'}`}
                  >
                    <div className="line-clamp-1">#{idx + 1} - {sc.question}</div>
                    <div className="text-[10px] opacity-70 truncate mt-0.5">{sc.courseSlug || 'datagan-master-pro'}</div>
                  </button>
                ))
            )}
          </div>
        </div>

        {/* Editor Principal */}
        {selectedScenario ? (
          <div className="lg:col-span-9 space-y-6">
            <div className="bg-white rounded-xl border border-[#d1d2e0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#2a2b3f]">Información General</h2>
                <button
                  onClick={() => handleDelete(selectedScenario.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#2a2b3f] mb-1.5 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#6d28d2]" />
                    <span>Curso Asociado (Fase 2 de este curso)</span>
                  </label>
                  <select
                    value={selectedScenario.courseSlug || (courses[0]?.slug || 'datagan-master-pro')}
                    onChange={e => setSelectedScenario({ ...selectedScenario, courseSlug: e.target.value })}
                    className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg text-sm font-medium"
                  >
                    {courses.map(c => (
                      <option key={c.slug} value={c.slug}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#2a2b3f] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#9194ac]" />
                      <span>Captura de Pantalla / Imagen del Escenario</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6d28d2] bg-[#6d28d2]/10 hover:bg-[#6d28d2]/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Subiendo a R2...' : 'Subir Imagen (Cloudflare R2)'}</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={selectedScenario.imageUrl}
                    onChange={e => setSelectedScenario({ ...selectedScenario, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2] text-sm"
                    placeholder="https://ejemplo.com/captura.jpg o /images/mi-captura.png"
                  />

                  {/* Caja de Ayuda para Recursos Locales */}
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#595c73] space-y-1">
                    <p className="font-bold text-[#2a2b3f] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#6d28d2]" />
                      <span>¿Cómo usar imágenes y videos locales?</span>
                    </p>
                    <p>• <strong>Opción 1 (Directo desde PC):</strong> Haz clic en el botón morado <em>&ldquo;Subir Imagen desde mi PC&rdquo;</em> para incrustar la imagen directamente en la base de datos sin configurar servidores.</p>
                    <p>• <strong>Opción 2 (Carpeta Public):</strong> Coloca tu imagen en <code>frontend/public/images/</code> y escribe la ruta <code>/images/tu-captura.png</code>.</p>
                    <p>• <strong>Opción 3 (Web externa):</strong> Pega directamente cualquier URL https:// de tu imagen.</p>
                  </div>

                  {selectedScenario.imageUrl && (
                    <div className="mt-3 aspect-video max-w-sm rounded-lg border border-[#d1d2e0] overflow-hidden bg-black/5 flex items-center justify-center relative">
                      <Image src={selectedScenario.imageUrl} alt="Preview" width={384} height={216} className="max-w-full max-h-full object-contain" unoptimized />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2a2b3f] mb-1.5 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#9194ac]" />
                    Contexto (El Escenario en Campo)
                  </label>
                  <textarea
                    value={selectedScenario.context}
                    onChange={e => setSelectedScenario({ ...selectedScenario, context: e.target.value })}
                    className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2] text-sm h-20 resize-none"
                    placeholder="Ej: El capataz te informa que..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2a2b3f] mb-1.5 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#9194ac]" />
                    Pregunta
                  </label>
                  <input
                    type="text"
                    value={selectedScenario.question}
                    onChange={e => setSelectedScenario({ ...selectedScenario, question: e.target.value })}
                    className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2] text-sm font-medium"
                    placeholder="¿Qué módulo abres para...?"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#2a2b3f] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6d28d2]" />
                      <span>Métrica de DataGan Asociada (Opcional)</span>
                    </label>
                    <Link
                      href="/metrics"
                      prefetch={true}
                      className="text-xs font-semibold text-[#6d28d2] hover:underline flex items-center gap-1"
                    >
                      <span>Configurar Parámetros</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <select
                    value={selectedScenario.metricId || ''}
                    onChange={e => setSelectedScenario({ ...selectedScenario, metricId: e.target.value })}
                    className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2] text-sm font-medium"
                  >
                    <option value="">-- Sin métrica asociada (Escenario general) --</option>
                    {metricsList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.category || 'Métrica'})
                      </option>
                    ))}
                  </select>

                  {/* Tarjeta de previsualización de la métrica vinculada */}
                  {selectedScenario.metricId && (() => {
                    const linked = metricsList.find(m => m.id === selectedScenario.metricId);
                    if (!linked) return null;
                    return (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#6d28d2] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {linked.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-200/70 text-purple-800 text-[10px] font-bold uppercase">
                            {linked.templateType === 'formula' ? 'Fórmula' : linked.templateType === 'visual_scale' ? 'Escala Visual' : linked.templateType === 'protocol' ? 'Protocolo' : linked.templateType === 'decision_matrix' ? 'Matriz' : 'Glosario'}
                          </span>
                        </div>
                        <p className="text-[#595c73]">{linked.shortDescription || linked.definition}</p>
                        {linked.formula && (
                          <div className="p-2 rounded bg-white border border-purple-200 font-mono text-[11px] text-purple-900 truncate">
                            {linked.formula}
                          </div>
                        )}
                        {linked.unit && (
                          <span className="inline-block text-[10px] font-bold text-[#595c73]">
                            Unidad de medida: <strong>{linked.unit}</strong>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#d1d2e0] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2a2b3f] mb-4">Opciones de Respuesta</h2>
              <div className="space-y-3">
                {selectedScenario.options.map((opt, i) => (
                  <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border ${opt.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-[#d1d2e0] bg-white'}`}>
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => updateOption(opt.id, 'isCorrect', true)}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => updateOption(opt.id, 'text', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                      placeholder={`Opción ${i + 1}`}
                    />
                    {opt.isCorrect && (
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full">
                        Correcta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#d1d2e0] p-6 shadow-sm">
              <label className="block text-sm font-semibold text-[#2a2b3f] mb-1.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#9194ac]" />
                Retroalimentación (Explicación)
              </label>
              <textarea
                value={selectedScenario.explanation}
                onChange={e => setSelectedScenario({ ...selectedScenario, explanation: e.target.value })}
                className="w-full px-4 py-2 bg-[#f6f7f9] border border-[#d1d2e0] rounded-lg focus:outline-none focus:border-[#6d28d2] text-sm h-24 resize-none"
                placeholder="Explicación agronómica o de software que aparece al responder..."
              />
            </div>
          </div>
        ) : (
          <div className="lg:col-span-9 bg-white rounded-xl border border-[#d1d2e0] p-12 flex flex-col items-center justify-center text-center shadow-sm h-[600px]">
            <div className="w-16 h-16 bg-[#f6f7f9] rounded-full flex items-center justify-center text-[#9194ac] mb-4">
              <MousePointerClick className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[#2a2b3f] mb-2">Ningún escenario seleccionado</h2>
            <p className="text-[#595c73] max-w-md">
              Selecciona un escenario del panel lateral para editarlo, o crea uno nuevo para tu práctica de Reflejo Operativo.
            </p>
            <button
              onClick={createNewScenario}
              className="mt-6 bg-[#6d28d2] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#5b21b6] transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crear Nuevo Escenario
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
