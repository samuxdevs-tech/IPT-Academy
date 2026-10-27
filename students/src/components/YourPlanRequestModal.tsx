'use client';

import React, { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  X,
  Sparkles,
  Mail,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Loader2,
  Info
} from 'lucide-react';

interface YourPlanRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function YourPlanRequestModal({ isOpen, onClose }: YourPlanRequestModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDesc = description.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Por favor ingresa una dirección de Gmail o correo electrónico válida.');
      return;
    }

    if (!cleanDesc || cleanDesc.length < 15) {
      setError('Por favor describe con un poco más de detalle tus requerimientos o lo que deseas aprender (mínimo 15 caracteres).');
      return;
    }

    if (!consentAccepted) {
      setError('Debes aceptar la autorización de tratamiento de datos personales para procesar tu solicitud.');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const payload = {
        fullName: cleanName,
        email: cleanEmail,
        description: cleanDesc,
        consentAccepted: true,
        consentTimestamp: now.getTime(),
        status: 'pending', // 'pending' | 'accepted' | 'denied'
        createdAt: now.toISOString(),
        timestamp: now.getTime(),
        source: 'landing_pricing_your_plan'
      };

      // 1. Guardar solicitud en el nodo lms_your_plan_requests
      const reqRef = push(ref(db, 'lms_your_plan_requests'));
      await reqRef;
      const { set } = await import('firebase/database');
      await set(reqRef, { ...payload, id: reqRef.key });

      // 2. Notificar al panel de administración
      const notifRef = push(ref(db, 'admin_notifications'));
      await set(notifRef, {
        id: notifRef.key,
        type: 'your_plan_request',
        title: 'Nueva solicitud de Your Plan',
        message: `${cleanName} (${cleanEmail}) ha enviado una solicitud a la medida.`,
        email: cleanEmail,
        createdAt: now.toISOString(),
        read: false
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error enviando solicitud Your Plan:', err);
      setError('Hubo un inconveniente al enviar tu solicitud. Por favor verifica tu conexión o intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setFullName('');
    setEmail('');
    setDescription('');
    setConsentAccepted(false);
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-[#0d091b] border border-[#8052ff]/40 rounded-3xl shadow-[0_0_50px_rgba(128,82,255,0.25)] overflow-hidden text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-[#130d29]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8052ff]/20 border border-[#8052ff]/40 flex items-center justify-center text-[#ffb829]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Your Plan · Asesoría a la Medida
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Para cualquier persona con requerimientos y objetivos específicos.
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Cerrar formulario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Formulario */}
        <div className="p-6 overflow-y-auto space-y-5 text-left text-xs">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-white">
                  ¡Solicitud Enviada con Éxito!
                </h4>
                <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Hemos recibido tus requerimientos. Nuestro equipo evaluará la viabilidad técnica y académica, y el operador te responderá de forma personalizada a tu correo (<strong>{email}</strong>) con la <strong>aceptación o denegación</strong> del servicio.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="mt-4 px-6 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aviso Obligatorio de Evaluación */}
              <div className="p-3.5 rounded-2xl bg-violet-950/40 border border-violet-500/30 flex items-start gap-3">
                <Info className="w-4 h-4 text-[#ffb829] shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  <strong className="text-white">Aviso de procedimiento:</strong> Evaluaremos tus temas y alcance solicitados. En un plazo breve recibirás un correo electrónico personalizado con la <span className="text-[#ffb829] font-bold">aceptación o denegación</span> del servicio y las condiciones propuestas.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Campo Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  <span>Nombre completo</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161224] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#8052ff] transition-colors"
                />
              </div>

              {/* Campo Gmail / Correo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  <span>Gmail o correo de contacto</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu_correo@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161224] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#8052ff] transition-colors"
                />
              </div>

              {/* Campo Descripción */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-400" />
                  <span>¿Qué requieres o qué deseas aprender?</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe detalladamente tus requerimientos específicos, temas de interés, objetivos formativos o necesidades técnicas..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161224] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#8052ff] transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Checkbox Tratamiento de Datos */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#161224]/80 border border-white/5 hover:border-white/15 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#8052ff] shrink-0 cursor-pointer"
                />
                <span className="text-[11px] text-zinc-300 leading-relaxed">
                  Autorizo de manera libre, previa y voluntaria el tratamiento de mis datos personales conforme a la <strong>Política de Privacidad y Habeas Data (Ley 1581 de 2012)</strong> para el análisis de esta solicitud y el envío de la respuesta por correo.
                </span>
              </label>

              {/* Botón Enviar */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(128,82,255,0.35)] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Solicitud de Your Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
