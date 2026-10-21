'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Eye,
  X,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface EmbeddedFileViewerProps {
  fileName: string;
  fileUrl?: string;
  fileSizeMb?: number;
  uploadedAtUtc?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export default function EmbeddedFileViewer({
  fileName,
  fileUrl,
  fileSizeMb,
  uploadedAtUtc,
  className = '',
  defaultExpanded = false
}: EmbeddedFileViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [loadError, setLoadError] = useState(false);

  const cleanName = fileName.trim();
  const ext = (cleanName.split('.').pop() || '').toLowerCase();

  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isDocx = ['docx', 'doc'].includes(ext);
  const isXlsx = ['xlsx', 'xls', 'csv'].includes(ext);

  // Fallback demo file URLs if only a filename is passed
  const effectiveUrl = fileUrl && fileUrl.startsWith('http')
    ? fileUrl
    : isPdf
    ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    : isImage
    ? 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&q=80'
    : isDocx
    ? 'https://calibre-ebook.com/downloads/demos/demo.docx'
    : fileUrl || '';

  // Google Docs Viewer URL for embedded DOCX / PDF
  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    effectiveUrl
  )}&embedded=true`;

  const officeOnlineViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    effectiveUrl
  )}`;

  return (
    <div
      className={`rounded-2xl border border-[#e5e5e5] bg-[#ffffff] overflow-hidden transition-all duration-200 ${
        isExpanded ? 'shadow-md' : 'shadow-2xs'
      } ${className}`}
    >
      {/* Barra superior del archivo */}
      <div className="px-4 py-3 bg-[#fafafa] border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center shrink-0">
            {isPdf && <FileText className="w-4 h-4 text-rose-600" />}
            {isImage && <ImageIcon className="w-4 h-4 text-emerald-600" />}
            {isDocx && <FileText className="w-4 h-4 text-blue-600" />}
            {isXlsx && <FileSpreadsheet className="w-4 h-4 text-emerald-700" />}
            {!isPdf && !isImage && !isDocx && !isXlsx && (
              <FileText className="w-4 h-4 text-[#606060]" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#0f0f0f] truncate max-w-[260px] sm:max-w-md">
              {cleanName}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-[#606060]">
              <span className="uppercase font-semibold tracking-wider font-mono text-[10px]">
                {ext || 'archivo'}
              </span>
              {typeof fileSizeMb === 'number' && (
                <>
                  <span>•</span>
                  <span>{fileSizeMb} MB</span>
                </>
              )}
              {uploadedAtUtc && (
                <>
                  <span>•</span>
                  <span>
                    {(() => {
                      try {
                        const d = new Date(uploadedAtUtc);
                        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                      } catch {
                        return '';
                      }
                    })()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveUrl && (
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e5e5] hover:bg-[#f2f2f2] text-[11px] font-semibold text-[#0f0f0f] inline-flex items-center gap-1"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#606060]" />
              <span className="hidden sm:inline">Pestaña nueva</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-[#0f0f0f] hover:bg-[#272727] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Ocultar visor</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Vista previa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área del visor interactivo embebido */}
      {isExpanded && (
        <div className="bg-[#f8f8f8] p-3 sm:p-4">
          {/* VISOR DE IMÁGENES (PNG, JPG, JPEG, WEBP, SVG) */}
          {isImage && (
            <div className="relative rounded-xl border border-[#e5e5e5] bg-white overflow-hidden flex items-center justify-center p-2 min-h-[300px] max-h-[600px]">
              <img
                src={effectiveUrl}
                alt={cleanName}
                className="max-h-[560px] max-w-full object-contain rounded-lg"
                onError={() => setLoadError(true)}
              />
              {loadError && (
                <div className="p-4 text-center text-xs text-[#606060]">
                  No se pudo renderizar la imagen directamente. Puedes usar el botón de pestaña nueva.
                </div>
              )}
            </div>
          )}

          {/* VISOR DE PDF EMBEBIDO */}
          {isPdf && (
            <div className="space-y-2">
              <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-2xs">
                <iframe
                  src={`${effectiveUrl}#toolbar=1&navpanes=0`}
                  title={`Visor PDF: ${cleanName}`}
                  className="w-full h-[380px] sm:h-[520px] lg:h-[600px] border-0"
                />
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-[#606060]">
                <span>Visor nativo PDF interactivo</span>
                <a
                  href={googleDocsViewerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#065fd4] hover:underline"
                >
                  ¿Problemas al visualizar? Abrir en Google Docs Viewer
                </a>
              </div>
            </div>
          )}

          {/* VISOR DE DOCUMENTOS WORD / DOCX EMBEBIDO */}
          {isDocx && (
            <div className="space-y-2">
              <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-2xs">
                <iframe
                  src={officeOnlineViewerUrl}
                  title={`Visor Word: ${cleanName}`}
                  className="w-full h-[380px] sm:h-[520px] lg:h-[600px] border-0"
                />
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-[#606060]">
                <span>Renderizado seguro de documento Word (Office Online / Google Viewer)</span>
                <a
                  href={googleDocsViewerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#065fd4] hover:underline"
                >
                  Abrir visor alternativo
                </a>
              </div>
            </div>
          )}

          {/* VISOR DE EXCEL / CSV / OTROS ARCHIVOS */}
          {isXlsx && (
            <div className="space-y-2">
              <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-2xs">
                <iframe
                  src={officeOnlineViewerUrl}
                  title={`Visor Hoja de Cálculo: ${cleanName}`}
                  className="w-full h-[380px] sm:h-[520px] lg:h-[600px] border-0"
                />
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-[#606060]">
                <span>Visor de Hoja de Cálculo (Office Online)</span>
                <a
                  href={effectiveUrl}
                  download={cleanName}
                  className="text-[#065fd4] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Descargar archivo</span>
                </a>
              </div>
            </div>
          )}

          {/* ARCHIVOS SIN VISOR DIRECTO */}
          {!isPdf && !isImage && !isDocx && !isXlsx && (
            <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f2f2f2] text-[#0f0f0f] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-[#606060]" />
              </div>
              <h5 className="text-xs font-bold text-[#0f0f0f]">
                Archivo {ext ? `.${ext.toUpperCase()}` : ''} listo para revisar
              </h5>
              <p className="text-xs text-[#606060] max-w-sm mx-auto">
                Para este formato, descárgalo o ábrelo en una nueva pestaña para inspeccionarlo en tu equipo.
              </p>
              {effectiveUrl && (
                <a
                  href={effectiveUrl}
                  download={cleanName}
                  className="px-4 py-2 rounded-xl bg-[#0f0f0f] text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-[#272727]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar archivo</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
