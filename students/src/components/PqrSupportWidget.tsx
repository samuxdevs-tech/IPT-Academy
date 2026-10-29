'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MessageSquareText, X, Send, AlertCircle, CheckCircle2, ShieldCheck, LogIn } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function PqrSupportWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const [tipo, setTipo] = useState<'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'soporte'>('peticion');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pathname = usePathname();

  // El canal flotante de PQRS / Solicitudes solo existe en la Home (/); desaparece al salir
  if (pathname !== '/') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    const trimmedAsunto = asunto.trim();
    const trimmedMensaje = mensaje.trim();

    if (!trimmedAsunto || !trimmedMensaje) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);

    try {
      const now = Date.now();
      const ticketCode = `PQR-${now.toString().slice(-6)}`;
      const pqrRef = push(ref(db, 'pqr_tickets'));
      const notifRef = push(ref(db, 'admin_notifications'));

      const ticketData = {
        id: pqrRef.key,
        code: ticketCode,
        uid: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'Estudiante IPT',
        tipo,
        asunto: trimmedAsunto,
        mensaje: trimmedMensaje,
        status: 'pending',
        createdAt: now,
      };

      const notifData = {
        id: notifRef.key,
        type: 'pqr_ticket',
        title: `Nueva PQR (${tipo.toUpperCase()}): ${trimmedAsunto}`,
        ticketId: pqrRef.key,
        ticketCode,
        userEmail: user.email || '',
        createdAt: now,
        read: false,
      };

      await Promise.all([
        set(pqrRef, ticketData),
        set(notifRef, notifData),
      ]);

      setSuccessTicket(ticketCode);
      setAsunto('');
      setMensaje('');
    } catch (err: any) {
      setError('No se pudo enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón Flotante en la esquina inferior izquierda */}
      <aside aria-label="Canal de atención y solicitudes" className="fixed bottom-6 left-4 sm:left-6 z-50">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSuccessTicket(null);
            setError('');
          }}
          className="group p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-[#09090b]/90 hover:bg-[#12131a] border border-[#ffffff]/20 hover:border-[#8052ff] text-white shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold tracking-[-0.01em] transition-all hover:scale-105 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#8052ff]/20 flex items-center justify-center text-[#8052ff] group-hover:bg-[#8052ff] group-hover:text-white transition-colors">
            <MessageSquareText className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline">PQRS / Solicitudes</span>
        </button>
      </aside>

      {/* Modal / Ventana de Atención */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09090b] border border-[#ffffff]/15 rounded-[24px] max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-[#ffffff]/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8052ff]/20 flex items-center justify-center text-[#8052ff]">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Canal Oficial de Solicitudes y PQRS</h3>
                  <p className="text-[11px] text-[#9a9a9a]">Ivan Perez Tech · Atención Institucional</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#9a9a9a] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido según estado de autenticación */}
            <div className="p-6">
              {!user ? (
                /* Caso 1: Usuario NO autenticado (Mensaje cordial sin bloqueo forzoso) */
                <div className="py-4 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#ffb829]/15 border border-[#ffb829]/30 flex items-center justify-center mx-auto text-[#ffb829]">
                    <LogIn className="w-6 h-6" />
                  </div>

                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h4 className="text-base font-normal text-white">Identificación Requerida</h4>
                    <p className="text-xs text-[#9a9a9a] leading-relaxed">
                      Para radicar una solicitud, queja, reclamo o petición formal, primero debes iniciar sesión con tu cuenta de estudiante.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] text-white text-xs font-semibold uppercase tracking-[0.03em] transition-all shadow-[0_0_20px_rgba(128,82,255,0.4)]"
                    >
                      Iniciar Sesión
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#ffffff]/10 hover:bg-[#ffffff]/15 text-[#bdbdbd] text-xs font-semibold transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : successTicket ? (
                /* Caso 2: Solicitud enviada exitosamente */
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#15846e]/20 border border-[#15846e]/40 flex items-center justify-center mx-auto text-[#15846e]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-semibold text-white">Solicitud Radicada con Éxito</h4>
                    <p className="text-xs text-[#9a9a9a] leading-relaxed">
                      Se ha generado tu número de radicado:
                    </p>
                    <span className="inline-block px-3 py-1 rounded-lg bg-[#ffffff]/10 text-white font-mono text-sm font-semibold">
                      {successTicket}
                    </span>
                    <p className="text-[11px] text-[#9a9a9a] pt-2">
                      El administrador ha recibido la notificación y responderá a tu correo registrado ({user.email}).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSuccessTicket(null);
                      setIsOpen(false);
                    }}
                    className="px-6 py-2 rounded-full bg-white text-black text-xs font-semibold uppercase tracking-[0.03em] hover:bg-slate-200 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                /* Caso 3: Formulario directo para el usuario autenticado */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-[#f43f5e]/15 border border-[#f43f5e]/30 flex items-center gap-2 text-xs text-white">
                      <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold text-[#9a9a9a] mb-1 font-mono">
                      Tipo de Solicitud
                    </label>
                    <select
                      value={tipo}
                      onChange={(e: any) => setTipo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/20 text-white text-xs focus:outline-none focus:border-[#8052ff] transition-colors"
                    >
                      <option value="peticion">Petición / Consulta Académica</option>
                      <option value="queja">Queja sobre el Servicio o Contenido</option>
                      <option value="reclamo">Reclamo Formal / Calificación</option>
                      <option value="sugerencia">Sugerencia de Mejora</option>
                      <option value="soporte">Soporte Técnico de Plataforma</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold text-[#9a9a9a] mb-1 font-mono">
                      Asunto de la Solicitud
                    </label>
                    <input
                      type="text"
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      placeholder="Breve título descriptivo..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-xs focus:outline-none focus:border-[#8052ff] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.06em] font-semibold text-[#9a9a9a] mb-1 font-mono">
                      Detalle y Mensaje
                    </label>
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Escribe aquí los detalles de tu solicitud..."
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-xs focus:outline-none focus:border-[#8052ff] transition-colors resize-none"
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#9a9a9a]">
                      Radicando como: <strong className="text-white">{user.email}</strong>
                    </span>

                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-full bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(128,82,255,0.4)] cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{loading ? 'Enviando...' : 'Radicar Solicitud'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
