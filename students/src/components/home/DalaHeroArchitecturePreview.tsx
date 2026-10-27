'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  Sparkles,
  Lock
} from 'lucide-react';
import { IptLogoIcon } from '@/components/IptLogoIcon';

export default function DalaHeroArchitecturePreview() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const pipelineNodes = [
    { name: 'Gateway', tech: 'Edge Router', status: 'Online' },
    { name: 'IPT Auth', tech: 'Cloudflare D1', status: 'Protected' },
    { name: 'Sandbox Engine', tech: 'Isolated VM', status: 'Operational' },
    { name: 'Ledger Audit', tech: 'Cryptographic', status: 'Verified' },
  ];

  return (
    <div className="relative w-full max-w-[480px] p-6 rounded-[28px] bg-[#09090b]/90 border border-[#ffffff]/15 shadow-2xl backdrop-blur-xl space-y-5 animate-fade-in">
      {/* Resplandor atmosférico contenido */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#8052ff]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera del Panel de Control */}
      <div className="flex items-center justify-between pb-4 border-b border-[#ffffff]/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#8052ff]/20 flex items-center justify-center text-[#8052ff]">
            <IptLogoIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-tight">ipt-runtime-node-01</span>
              <span className="w-2 h-2 rounded-full bg-[#15846e] animate-ping" />
            </div>
            <p className="text-[10px] text-[#9a9a9a] font-mono">Infraestructura Operativa en Vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ffffff]/5 border border-[#ffffff]/10 text-[10px] font-mono text-[#9a9a9a]">
          <Activity className="w-3 h-3 text-[#15846e]" />
          <span>4ms latency</span>
        </div>
      </div>

      {/* Diagrama de Tubería de Microservicios */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#9a9a9a] px-1">
          <span>TOPOLOGÍA DE SISTEMAS</span>
          <span className="text-[#8052ff]">MODO REAL 100%</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {pipelineNodes.map((node, idx) => {
            const isHighlight = activeStep === idx;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  isHighlight
                    ? 'bg-[#8052ff]/15 border-[#8052ff] shadow-[0_0_20px_rgba(128,82,255,0.3)]'
                    : 'bg-[#000000] border-[#ffffff]/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-white">{node.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isHighlight ? 'bg-[#ffb829]' : 'bg-[#15846e]'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#9a9a9a]">
                  <span>{node.tech}</span>
                  <span className={isHighlight ? 'text-white' : 'text-[#8052ff]'}>
                    {node.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consola de Comandos y Telemetría */}
      <div className="p-3.5 rounded-2xl bg-[#000000] border border-[#ffffff]/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#9a9a9a]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#ffb829]" />
            <span>ipt-console · terminal de auditoría</span>
          </div>
          <span className="text-[#15846e] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> sync
          </span>
        </div>

        <div className="text-[11px] font-mono text-[#bdbdbd] space-y-1 pt-1 border-t border-[#ffffff]/5">
          <p className="flex items-center gap-2">
            <span className="text-[#8052ff]">&gt;</span>
            <span>ipt-auth: session verified [AES-256-GCM]</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-[#8052ff]">&gt;</span>
            <span className="text-[#ffb829]">sandbox-instance: tecno-gan booted (0.8s)</span>
          </p>
          <p className="flex items-center gap-2 text-[10px] text-[#9a9a9a]">
            <span className="text-[#15846e]">&gt;</span>
            <span>rubric-evaluator: waiting for student commit...</span>
          </p>
        </div>
      </div>

      {/* Barra de Certificación Rápida */}
      <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-[#9a9a9a]">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#8052ff]" />
          <span>Firma Criptográfica SHA-256</span>
        </span>
        <span className="font-mono text-white text-[10px] bg-[#ffffff]/10 px-2 py-0.5 rounded-md">
          v2026.10
        </span>
      </div>
    </div>
  );
}
