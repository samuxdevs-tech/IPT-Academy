'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Code2,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  MessageSquarePlus,
  Trash2,
  Check,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface InlineAnnotationItem {
  id: string;
  fileId?: string;
  pageOrTimestamp?: string; // e.g. "01:24" for audio or "Pág 2" / "Línea 14"
  lineOrSelection: string; // The quoted text or segment
  commentText: string;
  authorRole: 'teacher' | 'ai';
  createdAt: string;
}

interface UnifiedDeliveryViewerProps {
  fileName: string;
  fileUrl?: string;
  fileSizeMb?: number;
  uploadedAtUtc?: string;
  textContent?: string; // For text/code/markdown submissions
  annotations?: InlineAnnotationItem[];
  canAnnotate?: boolean; // True for teacher, false for student
  onAddAnnotation?: (annotation: Omit<InlineAnnotationItem, 'id' | 'createdAt'>) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export default function UnifiedDeliveryViewer({
  fileName,
  fileUrl,
  fileSizeMb,
  uploadedAtUtc,
  textContent,
  annotations = [],
  canAnnotate = false,
  onAddAnnotation,
  onDeleteAnnotation,
  className = '',
  defaultExpanded = true,
}: UnifiedDeliveryViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'content' | 'annotations'>('content');

  // Estado para crear nueva anotación in-situ
  const [selectedSegment, setSelectedSegment] = useState('');
  const [newAnnotationComment, setNewAnnotationComment] = useState('');
  const [newAnnotationAnchor, setNewAnnotationAnchor] = useState('');
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);

  const cleanName = fileName.trim();
  const ext = (cleanName.split('.').pop() || '').toLowerCase();

  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'weba'].includes(ext);
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isCodeOrText = ['txt', 'md', 'json', 'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'html', 'css'].includes(ext);
  const isDocx = ['docx', 'doc', 'odt'].includes(ext);

  const effectiveUrl = fileUrl || '';

  const handleCreateAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotationComment.trim() || !onAddAnnotation) return;

    onAddAnnotation({
      fileId: cleanName,
      lineOrSelection: selectedSegment.trim() || 'Observación general en documento',
      pageOrTimestamp: newAnnotationAnchor.trim() || (isAudio ? 'Audio' : 'General'),
      commentText: newAnnotationComment.trim(),
      authorRole: 'teacher',
    });

    setNewAnnotationComment('');
    setSelectedSegment('');
    setNewAnnotationAnchor('');
    setIsCreatingAnnotation(false);
  };

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs transition-all ${className}`}>
      {/* Barra de cabecera del archivo */}
      <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
            {isAudio && <Music className="w-4 h-4 text-purple-600" />}
            {isPdf && <FileText className="w-4 h-4 text-rose-600" />}
            {isImage && <ImageIcon className="w-4 h-4 text-emerald-600" />}
            {isCodeOrText && <Code2 className="w-4 h-4 text-amber-600" />}
            {!isAudio && !isPdf && !isImage && !isCodeOrText && (
              <FileText className="w-4 h-4 text-neutral-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-neutral-900 truncate max-w-[220px] sm:max-w-md">
                {cleanName}
              </h4>
              {annotations.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  {annotations.length} {annotations.length === 1 ? 'nota' : 'notas'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="uppercase font-semibold tracking-wider font-mono text-[10px]">
                {ext || 'archivo'}
              </span>
              {typeof fileSizeMb === 'number' && (
                <>
                  <span>•</span>
                  <span>{fileSizeMb} MB</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de la cabecera */}
        <div className="flex items-center gap-1.5">
          {annotations.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'annotations' ? 'content' : 'annotations')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                activeTab === 'annotations'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {activeTab === 'annotations' ? 'Ver Archivo' : `Ver Notas (${annotations.length})`}
            </button>
          )}

          {canAnnotate && !isCreatingAnnotation && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingAnnotation(true);
                setIsExpanded(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Anotar in-situ</span>
            </button>
          )}

          {effectiveUrl && (
            <a
              href={effectiveUrl}
              download={cleanName}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Descargar archivo original"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            title={isExpanded ? 'Plegar vista' : 'Desplegar vista'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido desplegable */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Formulario rápido para que el docente agregue una anotación in-situ */}
          {canAnnotate && isCreatingAnnotation && (
            <form onSubmit={handleCreateAnnotation} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <MessageSquarePlus className="w-3.5 h-3.5 text-amber-700" />
                  Nueva anotación in-situ para "{cleanName}"
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingAnnotation(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Ubicación / Timestamp
                  </label>
                  <input
                    type="text"
                    placeholder={isAudio ? 'Ej. 01:45 o Inicio' : 'Ej. Pág 1, Línea 12'}
                    value={newAnnotationAnchor}
                    onChange={(e) => setNewAnnotationAnchor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Cita o fragmento observado
                  </label>
                  <input
                    type="text"
                    placeholder="Fragmento específico del trabajo..."
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Comentario u observación docente
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Escribe la corrección, sugerencia pedagógica o felicitación..."
                  value={newAnnotationComment}
                  onChange={(e) => setNewAnnotationComment(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingAnnotation(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  Guardar anotación
                </button>
              </div>
            </form>
          )}

          {/* Pestaña de Notas Ancladas */}
          {activeTab === 'annotations' && annotations.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span>Anotaciones y correcciones en este archivo:</span>
                <span className="text-[11px] font-normal text-neutral-500">
                  {annotations.length} {annotations.length === 1 ? 'observación' : 'observaciones'}
                </span>
              </div>
              <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-neutral-50/50">
                {annotations.map((ann) => (
                  <div key={ann.id} className="p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800">
                          {ann.pageOrTimestamp || 'Nota'}
                        </span>
                        {ann.authorRole === 'ai' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            <Sparkles className="w-2.5 h-2.5" /> IA
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Docente
                          </span>
                        )}
                      </div>
                      {canAnnotate && onDeleteAnnotation && (
                        <button
                          type="button"
                          onClick={() => onDeleteAnnotation(ann.id)}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                          title="Eliminar anotación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {ann.lineOrSelection && (
                      <p className="text-[11px] text-neutral-600 italic bg-white p-1.5 rounded border border-neutral-200 font-mono">
                        "{ann.lineOrSelection}"
                      </p>
                    )}
                    <p className="text-neutral-900 font-medium">
                      {ann.commentText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pestaña de Contenido del Archivo */}
          {activeTab === 'content' && (
            <div>
              {/* 1. VISOR DE AUDIO */}
              {isAudio && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                    <span className="flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-purple-700" />
                      Reproductor de audio entregado
                    </span>
                    <span className="font-mono text-[11px] text-purple-700 uppercase">{ext}</span>
                  </div>
                  {effectiveUrl ? (
                    <audio
                      controls
                      src={effectiveUrl}
                      className="w-full rounded-lg shadow-2xs"
                    >
                      Tu navegador no soporta el reproductor de audio.
                    </audio>
                  ) : (
                    <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs text-neutral-600">
                      Archivo de audio cargado localmente ({cleanName}).
                    </div>
                  )}
                </div>
              )}

              {/* 2. VISOR DE PDF */}
              {isPdf && (
                <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-900">
                  {effectiveUrl ? (
                    <iframe
                      src={effectiveUrl}
                      title={cleanName}
                      className="w-full h-80 sm:h-96 border-none"
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-neutral-400">
                      Previsualización de PDF lista al sincronizar con almacenamiento.
                    </div>
                  )}
                </div>
              )}

              {/* 3. VISOR DE IMAGEN */}
              {isImage && (
                <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 flex items-center justify-center p-2">
                  <img
                    src={effectiveUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&q=80'}
                    alt={cleanName}
                    className="max-h-80 w-auto object-contain rounded-lg shadow-2xs"
                  />
                </div>
              )}

              {/* 4. VISOR DE CÓDIGO / MARKDOWN / TEXTO */}
              {(isCodeOrText || textContent) && (
                <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-950 text-neutral-100 font-mono text-xs">
                  <div className="px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>{cleanName || 'texto-entrega.txt'}</span>
                    <span>{ext || 'txt'}</span>
                  </div>
                  <pre className="p-3.5 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {textContent || '// Contenido textual del archivo registrado'}
                  </pre>
                </div>
              )}

              {/* 5. ARCHIVOS DE OFICINA (DOCX, XLSX, ETC.) */}
              {isDocx && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                      {ext}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-neutral-900">{cleanName}</h5>
                      <p className="text-[11px] text-neutral-500">Documento de texto estructurado</p>
                    </div>
                  </div>
                  {effectiveUrl && (
                    <a
                      href={effectiveUrl}
                      download={cleanName}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  )}
                </div>
              )}

              {/* LISTA RÁPIDA DE ANOTACIONES AL PIE */}
              {annotations.length > 0 && activeTab === 'content' && (
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="text-[11px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
                    <span>Notas del profesor en este documento:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {annotations.map((ann) => (
                      <button
                        key={ann.id}
                        type="button"
                        onClick={() => setActiveTab('annotations')}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                        📍 {ann.pageOrTimestamp || 'Nota'}: {ann.commentText.slice(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
