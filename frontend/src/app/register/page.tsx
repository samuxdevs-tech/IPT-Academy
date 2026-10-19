"use client";

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scale, ShieldCheck, X } from 'lucide-react';
import {
  LEGAL_DOCUMENTS,
  LegalSectionId,
  IPT_OWNER_INFO,
  recordUserLegalAcceptance,
} from '@/lib/legalData';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [previewLegalTab, setPreviewLegalTab] = useState<LegalSectionId | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedLegal) {
      setError(
        'Debes aceptar la Política de Tratamiento de Datos (Habeas Data), los Términos y Condiciones y las Condiciones Legales antes de crear tu cuenta.'
      );
      return;
    }

    setLoading(true);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError('Por favor ingresa tu nombre y apellido.');
      setLoading(false);
      return;
    }

    const fullName = `${trimmedFirstName} ${trimmedLastName}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      await set(ref(db, `users/${user.uid}/profile`), {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        displayName: fullName,
        email: user.email,
        updatedAt: Date.now()
      });

      await set(ref(db, `users/${user.uid}/info`), {
        username: fullName,
        email: user.email,
        createdAt: Date.now()
      });

      await recordUserLegalAcceptance(user, 'email_register');

      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado. Inicia sesión.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Ocurrió un error al registrar la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');

    if (!acceptedLegal) {
      setError(
        'Por favor marca la casilla de autorización de Tratamiento de Datos Personales (Habeas Data) y Términos Legales antes de registrarte con Google.'
      );
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const displayName = user.displayName || '';
      const nameParts = displayName.trim().split(' ');
      const parsedFirst = nameParts[0] || (user.email ? user.email.split('@')[0] : 'Usuario');
      const parsedLast = nameParts.slice(1).join(' ') || '';

      await set(ref(db, `users/${user.uid}/profile`), {
        firstName: parsedFirst,
        lastName: parsedLast,
        displayName: displayName || parsedFirst,
        photoURL: user.photoURL || '',
        email: user.email,
        updatedAt: Date.now()
      });

      await set(ref(db, `users/${user.uid}/info`), {
        username: displayName || parsedFirst,
        email: user.email,
        createdAt: Date.now()
      });

      await recordUserLegalAcceptance(user, 'google_register');

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar con Google.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDoc = previewLegalTab
    ? LEGAL_DOCUMENTS.find((d) => d.id === previewLegalTab) || LEGAL_DOCUMENTS[0]
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e5e5e5] p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <img
              src="/logo.webp"
              alt="IPT Course"
              width={180}
              height={58}
              className="h-14 w-auto mx-auto object-contain"
            />
          </Link>
          <h1 className="text-2xl font-bold text-[#0f0f0f] mb-1">Crear Cuenta</h1>
          <p className="text-[#606060] text-sm">Regístrate en IPT Course</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-xs font-medium mb-5" role="alert">
            {error}
          </div>
        )}

        {/* Casilla de autorización previa, expresa e informada (Ley 1581 de 2012) */}
        <div
          className={`mb-5 p-3.5 rounded-xl border transition-colors ${
            acceptedLegal
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'bg-[#f8f9fa] border-[#dcdcdc]'
          }`}
        >
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => {
                setAcceptedLegal(e.target.checked);
                if (e.target.checked && error) setError('');
              }}
              className="mt-0.5 w-4 h-4 accent-[#0f0f0f] rounded cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-[#303030] leading-relaxed">
              Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la{' '}
              <button
                type="button"
                onClick={() => setPreviewLegalTab('privacidad')}
                className="font-bold text-[#0f0f0f] underline hover:text-blue-700"
              >
                Política de Privacidad (Ley 1581 de 2012)
              </button>
              , y acepto el{' '}
              <button
                type="button"
                onClick={() => setPreviewLegalTab('aviso_legal')}
                className="font-bold text-[#0f0f0f] underline hover:text-blue-700"
              >
                Aviso Legal
              </button>
              , los{' '}
              <button
                type="button"
                onClick={() => setPreviewLegalTab('terminos')}
                className="font-bold text-[#0f0f0f] underline hover:text-blue-700"
              >
                Términos y Condiciones
              </button>
              , las{' '}
              <button
                type="button"
                onClick={() => setPreviewLegalTab('retracto_pagos')}
                className="font-bold text-[#0f0f0f] underline hover:text-blue-700"
              >
                Condiciones de Compra y Retracto
              </button>{' '}
              y la{' '}
              <button
                type="button"
                onClick={() => setPreviewLegalTab('cookies')}
                className="font-bold text-[#0f0f0f] underline hover:text-blue-700"
              >
                Política de Cookies
              </button>
              .
            </span>
          </label>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white border border-[#d1d2e0] text-[#0f0f0f] rounded-xl py-2.5 text-sm font-bold hover:bg-[#f6f7f9] disabled:opacity-50 flex items-center justify-center gap-2 mb-5 cursor-pointer transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Registrarse con Google
        </button>

        <div className="relative flex items-center py-2 mb-5">
          <div className="flex-grow border-t border-[#e5e5e5]"></div>
          <span className="flex-shrink-0 mx-4 text-[#606060] text-xs font-medium uppercase tracking-wider">O usa tu correo</span>
          <div className="flex-grow border-t border-[#e5e5e5]"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="register-firstname" className="block text-sm font-medium text-[#0f0f0f] mb-1">Nombre</label>
              <input
                id="register-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-xl px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#0f0f0f] focus-visible:outline-hidden"
                placeholder="Carlos"
                required
              />
            </div>
            <div>
              <label htmlFor="register-lastname" className="block text-sm font-medium text-[#0f0f0f] mb-1">Apellido</label>
              <input
                id="register-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-xl px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#0f0f0f] focus-visible:outline-hidden"
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-[#0f0f0f] mb-1">Correo Electrónico</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#d1d2e0] rounded-xl px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#0f0f0f] focus-visible:outline-hidden"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-[#0f0f0f] mb-1">Contraseña</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#d1d2e0] rounded-xl px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#0f0f0f] focus-visible:outline-hidden"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f0f0f] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#272727] disabled:opacity-50 mt-2 transition-all shadow-xs cursor-pointer"
          >
            {loading ? 'Creando cuenta...' : 'Aceptar y Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-[#606060] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#0f0f0f] font-bold hover:underline">
            Inicia Sesión
          </Link>
        </p>

        <div className="mt-6 pt-4 border-t border-[#f0f0f0] text-center">
          <Link
            href="/legal"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#606060] hover:text-[#0f0f0f]"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Consultar Centro Legal y Normativo de {IPT_OWNER_INFO.commercialName}</span>
          </Link>
        </div>
      </div>

      {/* Modal rápido para consultar cualquiera de los 5 documentos legales sin salir del registro */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewLegalTab(null)}
        >
          <div
            className="bg-white border border-[#e5e5e5] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#0f0f0f]" />
                <h2 className="text-sm font-bold text-[#0f0f0f]">{selectedDoc.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLegalTab(null)}
                className="p-1.5 rounded-full hover:bg-[#ececec] text-[#606060] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-2.5 bg-[#f4f4f4] border-b border-[#e5e5e5] flex items-center gap-1.5 overflow-x-auto">
              {LEGAL_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setPreviewLegalTab(doc.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedDoc.id === doc.id
                      ? 'bg-[#0f0f0f] text-white'
                      : 'bg-white text-[#303030] border border-[#dcdcdc]'
                  }`}
                >
                  {doc.shortTitle}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs text-[#303030]">
              <p className="text-[11px] font-semibold text-[#606060]">{selectedDoc.lawReference}</p>
              <p className="leading-relaxed bg-[#f8f9fa] p-3 rounded-xl border border-[#ececec]">
                {selectedDoc.summary}
              </p>
              {selectedDoc.clauses.map((clause, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#eaeaea]">
                  <h3 className="font-bold text-[#0f0f0f] mb-1">{clause.heading}</h3>
                  <p className="leading-relaxed text-[#454545]">{clause.body}</p>
                  {clause.bullets && clause.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1 list-disc list-inside text-[#454545]">
                      {clause.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-3.5 border-t border-[#e5e5e5] bg-[#fafafa] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setAcceptedLegal(true);
                  setPreviewLegalTab(null);
                }}
                className="px-4 py-2 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>He leído y acepto las condiciones legales</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewLegalTab(null)}
                className="px-4 py-2 rounded-full border border-[#d0d0d0] text-xs font-semibold text-[#303030] hover:bg-[#f2f2f2] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
