'use client';

import React, { useState, useEffect } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { ref, get, update, set } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { setLocalStudentName, getLocalDatabase } from '@/services/localDatabaseService';
import {
  ShieldAlert,
  User as UserIcon,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export default function IdentityVerificationPrompt() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;

    // Verificar si ya se ha completado el registro de identidad formal
    const checkIdentity = async () => {
      // 1. En almacenamiento local para sesiones offline/mock
      const localStatus = localStorage.getItem(`ipt_identity_confirmed_${user.uid}`);
      if (localStatus === 'true') {
        return;
      }

      // Si es el usuario mock local y tiene nombre por defecto, verificar si ya fue confirmado
      if (user.uid.startsWith('local-student')) {
        const localDb = getLocalDatabase();
        if ((localDb.student as any).identityConfirmed) {
          return;
        }
      }

      // 2. Verificar en Firebase si tiene el flag identityConfirmed
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

      // Si no ha sido confirmado formalmente, abrir el prompt modal/toast
      setIsOpen(true);
      if (user.displayName && !user.displayName.includes('@')) {
        setFullName(user.displayName);
      }
    };

    checkIdentity();
  }, [user]);

  if (!isOpen || !user) return null;

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
      const currentLocal = getLocalDatabase();
      (currentLocal.student as any).identityConfirmed = true;
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-[#065fd4]/30 shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Encabezado con Icono Institucional */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#065fd4]/10 border border-[#065fd4]/25 flex items-center justify-center text-[#065fd4] shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#065fd4] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Confirmación de Identidad Académica
            </span>
            <h2 id="identity-prompt-title" className="text-lg sm:text-xl font-black text-[#0f0f0f] leading-snug">
              Escribe tu nombre y apellidos reales
            </h2>
          </div>
        </div>

        {/* Explicación de por qué se solicita */}
        <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">
          Al ingresar con tu cuenta de correo o Google, muchas veces el nombre de usuario de la cuenta no coincide con tu nombre oficial para documentos.
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="official-student-name" className="block text-xs font-bold text-[#0f0f0f]">
              Nombre completo para diplomas y certificaciones:
            </label>
            <input
              id="official-student-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Iván Samuel Pérez Torrenegra"
              required
              className="w-full px-4 py-3 rounded-xl border border-[#d0d0d0] text-sm font-semibold text-[#0f0f0f] placeholder-[#909090] focus:outline-none focus:border-[#065fd4] focus:ring-2 focus:ring-[#065fd4]/20 transition-all"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          {/* AVISO REGLAMENTARIO OBLIGATORIO */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[#7a5200] text-xs space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Aviso de Validez Académica (IPT Course)</span>
            </div>
            <p className="text-[11.5px]">
              Este nombre será el que se imprima oficialmente en todos tus diplomas, constancias y formatos de grado. <strong>Cualquier modificación futura requerirá validación manual por parte de un administrador de IPT.</strong>
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Guardando...' : 'Confirmar Identidad y Continuar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
