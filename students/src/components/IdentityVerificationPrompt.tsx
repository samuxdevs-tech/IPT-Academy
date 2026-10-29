'use client';

import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { setLocalStudentName, getLocalDatabase } from '@/services/localDatabaseService';
import {
  ShieldAlert,
  User as UserIcon,
  Lock,
  ArrowRight,
  AlertTriangle,
  X
} from 'lucide-react';

export default function IdentityVerificationPrompt() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;

    // Verificar si ya se ha completado el registro de identidad formal o se postergó en la sesión
    const checkIdentity = async () => {
      // 1. Si el usuario ya lo cerró en esta sesión de navegación, no volver a molestarlo
      if (sessionStorage.getItem(`ipt_identity_dismissed_${user.uid}`) === 'true') {
        return;
      }

      // 2. En almacenamiento local para confirmación permanente
      const localStatus = localStorage.getItem(`ipt_identity_confirmed_${user.uid}`);
      if (localStatus === 'true') {
        return;
      }

      // 3. Verificar en Firebase si tiene el flag identityConfirmed
      try {
        const snap = await get(ref(db, `users/${user.uid}/profile`));
        if (snap.exists()) {
          const profile = snap.val();
          if (profile.identityConfirmed === true) {
            localStorage.setItem(`ipt_identity_confirmed_${user.uid}`, 'true');
            return;
          }
        }
      } catch (err) {
        console.warn('Verificando identidad de forma local:', err);
      }

      // Si no ha sido confirmado formalmente, mostrar el prompt
      setIsOpen(true);
      if (user.displayName && !user.displayName.includes('@')) {
        setFullName(user.displayName);
      }
    };

    checkIdentity();
  }, [user]);

  if (!isOpen || !user) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`ipt_identity_dismissed_${user.uid}`, 'true');
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();

    if (!cleanName || cleanName.split(' ').length < 2) {
      setErrorMsg('Por favor escribe tu nombre y al menos un apellido real (ej. Iván Pérez).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Guardar en Auth si es cuenta real
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: cleanName });
        }
      } catch {}

      // 2. Guardar en Firebase RTDB con el flag inmutable
      try {
        const parts = cleanName.split(' ');
        const firstName = parts[0] || cleanName;
        const lastName = parts.slice(1).join(' ') || '';

        await update(ref(db, `users/${user.uid}/profile`), {
          displayName: cleanName,
          firstName,
          lastName,
          identityConfirmed: true,
          identityConfirmedAt: new Date().toISOString(),
          provider: (user.providerData && user.providerData[0]?.providerId) || 'google',
        });
      } catch {}

      // 3. Guardar en Base de Datos Local / localStorage
      setLocalStudentName(cleanName);
      localStorage.setItem(`ipt_identity_confirmed_${user.uid}`, 'true');

      // Cerrar prompt
      setIsOpen(false);
    } catch (err) {
      console.error('Error confirmando identidad:', err);
      setErrorMsg('Ocurrió un error guardando tu nombre. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de confirmación de identidad"
      className="fixed bottom-5 right-5 z-[90] max-w-md w-[calc(100vw-2.5rem)] animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-[#09090b] rounded-3xl border border-[#ffffff]/15 shadow-2xl p-5 sm:p-6 space-y-4 text-white backdrop-blur-xl">
        
        {/* Encabezado con Botón de Cerrar/Posponer para no bloquear navegación */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8052ff]/10 border border-[#8052ff]/25 flex items-center justify-center text-[#8052ff] shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8052ff] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Identidad Académica
              </span>
              <h2 className="text-sm font-black text-white leading-tight">
                Confirma tu nombre oficial
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            title="Posponer para más tarde"
            className="p-1.5 rounded-full text-[#9a9a9a] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11.5px] text-[#bdbdbd] leading-relaxed">
          Verifica que este sea tu nombre y apellido reales para tus futuros certificados.
        </p>

        {/* Formulario Compacto no invasivo */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre y apellido completo..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#d0d0d0] text-xs font-semibold text-white placeholder-[#909090] focus:outline-none focus:border-[#8052ff] focus:ring-1 focus:ring-[#8052ff]"
          />

          {errorMsg && (
            <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          {/* Micro-aviso reglamentario */}
          <div className="p-2.5 rounded-xl bg-[#ffb829]/10 border border-[#ffb829]/20 text-[#ffb829] text-[10.5px] leading-tight flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-[#ffb829] shrink-0 mt-0.5" />
            <span>
              Este nombre se imprimirá en tus diplomas. Modificaciones posteriores requerirán aprobación de administración.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-bold text-[#707070] hover:text-white px-2 py-1 cursor-pointer"
            >
              Más tarde
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#8052ff] hover:bg-[#6e3df0] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Guardando...' : 'Confirmar'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
