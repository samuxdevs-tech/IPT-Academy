"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  FileText,
  FileSpreadsheet,
  FileCode,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  ExternalLink,
  Download,
  RefreshCw,
  Search,
  Copy,
  Check,
  AlertCircle,
  Eye,
  File
} from "lucide-react";

export interface PreviewableFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface UniversalFilePreviewModalProps {
  file: PreviewableFile | null;
  onClose: () => void;
}

type FileCategory =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "csv"
  | "audio"
  | "video"
  | "image"
  | "code"
  | "unknown";

type DocumentEngine = "microsoft" | "google" | "native";

export function UniversalFilePreviewModal({ file, onClose }: UniversalFilePreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [engine, setEngine] = useState<DocumentEngine>("microsoft");
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [csvFilter, setCsvFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Escuchar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Clasificar extensión del archivo
  const { category, ext } = useMemo<{ category: FileCategory; ext: string }>(() => {
    if (!file?.name && !file?.url) return { category: "unknown", ext: "" };
    const raw = (file.name || file.url).split("?")[0];
    const extension = (raw.split(".").pop() || "").toLowerCase();

    if (extension === "pdf") return { category: "pdf", ext: extension };
    if (["docx", "doc", "odt", "rtf"].includes(extension)) return { category: "word", ext: extension };
    if (["xlsx", "xls", "ods", "xlsm", "xlsb"].includes(extension)) return { category: "excel", ext: extension };
    if (["pptx", "ppt", "odp"].includes(extension)) return { category: "powerpoint", ext: extension };
    if (["csv", "tsv"].includes(extension)) return { category: "csv", ext: extension };
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "weba"].includes(extension))
      return { category: "audio", ext: extension };
    if (["mp4", "webm", "mov", "mkv", "m4v"].includes(extension))
      return { category: "video", ext: extension };
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(extension))
      return { category: "image", ext: extension };
    if (
      [
        "txt",
        "md",
        "json",
        "js",
        "jsx",
        "ts",
        "tsx",
        "py",
        "java",
        "html",
        "css",
        "sql",
        "xml",
        "yaml",
        "yml",
        "sh",
        "c",
        "cpp",
        "cs",
        "php",
        "rb",
        "go",
        "rs",
      ].includes(extension)
    )
      return { category: "code", ext: extension };

    return { category: "unknown", ext: extension };
  }, [file]);

  // Cargar contenido de archivos de texto / código o CSV
  useEffect(() => {
    if (!file?.url) return;
    if (category !== "code" && category !== "csv") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setTextContent(null);
    setCsvData(null);

    fetch(file.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (category === "csv") {
          // Parser rápido de CSV
          const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 0) {
            const parseLine = (line: string): string[] => {
              const result: string[] = [];
              let current = "";
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' || char === "'") {
                  inQuotes = !inQuotes;
                } else if ((char === "," || char === ";") && !inQuotes) {
                  result.push(current.trim());
                  current = "";
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            };

            const headers = parseLine(lines[0]);
            const rows = lines.slice(1).map(parseLine);
            setCsvData({ headers, rows });
          }
        } else {
          setTextContent(raw);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("No se pudo cargar contenido directo:", err);
        setFetchError("No se pudo leer el archivo en texto plano directamente. Puedes intentar con los visores en la nube.");
        setLoading(false);
      });
  }, [file?.url, category]);

  // URLs de los visores externos gratuitos de Microsoft y Google
  const officeEmbedUrl = useMemo(() => {
    if (!file?.url) return "";
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;
  }, [file?.url]);

  const googleDocsEmbedUrl = useMemo(() => {
    if (!file?.url) return "";
    return `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
  }, [file?.url]);

  const copyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredCsvRows = useMemo(() => {
    if (!csvData) return [];
    if (!csvFilter.trim()) return csvData.rows;
    const q = csvFilter.toLowerCase();
    return csvData.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [csvData, csvFilter]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full bg-[#0d0d12] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] max-w-none rounded-xl"
            : "max-w-5xl h-[88vh]"
        }`}
      >
        {/* Cabecera Pro del Visor */}
        <div className="px-5 py-3.5 bg-[#14141c] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              {category === "word" && <FileText className="w-4 h-4 text-blue-400" />}
              {category === "excel" && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              {category === "powerpoint" && <File className="w-4 h-4 text-amber-400" />}
              {category === "pdf" && <FileText className="w-4 h-4 text-rose-400" />}
              {category === "csv" && <FileSpreadsheet className="w-4 h-4 text-teal-400" />}
              {category === "audio" && <Music className="w-4 h-4 text-purple-400" />}
              {category === "video" && <VideoIcon className="w-4 h-4 text-sky-400" />}
              {category === "image" && <ImageIcon className="w-4 h-4 text-pink-400" />}
              {category === "code" && <FileCode className="w-4 h-4 text-indigo-400" />}
              {category === "unknown" && <File className="w-4 h-4 text-zinc-400" />}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-md sm:max-w-lg">
                {file.name || "Archivo adjunto"}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                <span className="uppercase px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-300 text-[10px]">
                  {ext || "ARCHIVO"}
                </span>
                {file.size && <span>• {Math.round(file.size / 1024)} KB</span>}
                <span>• Visualización en Vivo</span>
              </div>
            </div>
          </div>

          {/* Opciones de Motor y Controles de Ventana */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Si es Office / PDF, permitir alternar el motor de renderizado */}
            {(category === "word" || category === "excel" || category === "powerpoint" || category === "pdf") && (
              <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 hidden sm:inline">
                  Visor:
                </span>
                <button
                  type="button"
                  onClick={() => setEngine("microsoft")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    engine === "microsoft"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Visor oficial Microsoft Office Online (Alta Fidelidad)"
                >
                  Office Live
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("google")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    engine === "google"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Visor oficial Google Docs Viewer (Rápido & Ligero)"
                >
                  Google Docs
                </button>
                {category === "pdf" && (
                  <button
                    type="button"
                    onClick={() => setEngine("native")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      engine === "native"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    title="Visor nativo integrado del navegador"
                  >
                    Nativo
                  </button>
                )}
              </div>
            )}

            {/* Alternar Pantalla Completa */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-colors cursor-pointer"
              title={isFullscreen ? "Restaurar tamaño" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Abrir en pestaña nueva */}
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
              title="Abrir enlace original en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Cerrar modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor según el tipo de archivo */}
        <div className="flex-1 overflow-auto bg-[#08080c] relative flex flex-col">
          {/* 1. VISOR DE VIDEO (MP4, WEBM, MOV) */}
          {category === "video" && (
            <div className="flex-1 flex items-center justify-center p-4 bg-black/60">
              <video
                src={file.url}
                controls
                playsInline
                autoPlay
                className="max-h-full max-w-full rounded-xl shadow-2xl object-contain border border-white/10"
              />
            </div>
          )}

          {/* 2. VISOR DE AUDIO (MP3, WAV, OGG, M4A) */}
          {category === "audio" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#101018] to-[#08080c] space-y-6">
              <div className="w-24 h-24 rounded-3xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_50px_rgba(128,82,255,0.25)] animate-pulse">
                <Music className="w-12 h-12" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">{file.name}</h4>
                <p className="text-xs text-zinc-400 font-mono">Audio estéreo entregado por el estudiante</p>
              </div>
              <div className="w-full max-w-lg p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl">
                <audio src={file.url} controls autoPlay className="w-full" />
              </div>
            </div>
          )}

          {/* 3. VISOR DE IMAGEN (PNG, JPG, WEBP, SVG) */}
          {category === "image" && (
            <div className="flex-1 flex items-center justify-center p-4 bg-black/80 overflow-auto">
              <img
                src={file.url}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>
          )}

          {/* 4. VISOR DE DOCUMENTOS OFFICE (WORD, EXCEL, POWERPOINT) */}
          {(category === "word" || category === "excel" || category === "powerpoint") && (
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={engine === "microsoft" ? officeEmbedUrl : googleDocsEmbedUrl}
                title={file.name}
                className="w-full h-full border-none"
                allowFullScreen
              />
            </div>
          )}

          {/* 5. VISOR DE PDF */}
          {category === "pdf" && (
            <div className="flex-1 w-full h-full relative">
              {engine === "native" ? (
                <iframe src={file.url} title={file.name} className="w-full h-full border-none" />
              ) : (
                <iframe
                  src={engine === "microsoft" ? officeEmbedUrl : googleDocsEmbedUrl}
                  title={file.name}
                  className="w-full h-full border-none"
                  allowFullScreen
                />
              )}
            </div>
          )}

          {/* 6. VISOR DE TABLA INTERACTIVA CSV / TSV */}
          {category === "csv" && (
            <div className="flex-1 flex flex-col p-4 space-y-3">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : fetchError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-xs text-zinc-300 max-w-md">{fetchError}</p>
                  <iframe src={googleDocsEmbedUrl} title={file.name} className="w-full h-96 rounded-xl border border-white/10" />
                </div>
              ) : csvData ? (
                <>
                  <div className="flex items-center justify-between gap-3 bg-[#121217] p-2.5 rounded-xl border border-white/10">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar en celdas del archivo..."
                        value={csvFilter}
                        onChange={(e) => setCsvFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-violet-500"
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {filteredCsvRows.length} de {csvData.rows.length} filas
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-[#0c0c12]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#181824] border-b border-white/10 text-zinc-300 font-mono sticky top-0 z-10">
                          <th className="p-2.5 text-zinc-500 w-12 text-center">#</th>
                          {csvData.headers.map((h, i) => (
                            <th key={i} className="p-2.5 font-bold uppercase tracking-wider text-[11px] text-violet-300 whitespace-nowrap border-r border-white/5 last:border-r-0">
                              {h || `Columna ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                        {filteredCsvRows.slice(0, 500).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                            <td className="p-2.5 text-zinc-600 text-center select-none bg-black/20">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 text-zinc-300 whitespace-pre border-r border-white/5 last:border-r-0">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* 7. VISOR DE CÓDIGO Y TEXTO PLANO */}
          {category === "code" && (
            <div className="flex-1 flex flex-col p-4 space-y-3">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : textContent !== null ? (
                <>
                  <div className="flex items-center justify-between bg-[#121217] px-3.5 py-2 rounded-xl border border-white/10">
                    <span className="text-xs font-mono text-zinc-400">
                      {textContent.split("\n").length} líneas de código fuente
                    </span>
                    <button
                      type="button"
                      onClick={copyText}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copiado" : "Copiar todo"}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-[#0a0a0f] p-4 font-mono text-xs text-zinc-200">
                    <pre className="whitespace-pre leading-relaxed select-text font-mono">
                      {textContent}
                    </pre>
                  </div>
                </>
              ) : fetchError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-xs text-zinc-300 max-w-md">{fetchError}</p>
                  <iframe src={googleDocsEmbedUrl} title={file.name} className="w-full h-96 rounded-xl border border-white/10" />
                </div>
              ) : null}
            </div>
          )}

          {/* 8. ARCHIVO DESCONOCIDO O GENÉRICO */}
          {category === "unknown" && (
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={googleDocsEmbedUrl}
                title={file.name}
                className="w-full h-full border-none"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Pie con selector directo */}
        <div className="px-5 py-2.5 bg-[#14141c] border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-violet-400" />
            <span>Visor Universal IPT · Documentos y Multimedia protegidos</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Esc para salir
          </span>
        </div>
      </div>
    </div>
  );
}
