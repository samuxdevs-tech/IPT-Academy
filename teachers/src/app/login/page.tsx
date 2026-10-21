"use client";

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LEGAL_DOCUMENTS,
  LegalSectionId,
  recordUserLegalAcceptance,
  CURRENT_LEGAL_VERSION,
} from '@/lib/legalData';
import { Scale, X, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [previewLegalSection, setPreviewLegalSection] = useState<LegalSectionId | null>(null);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (!acceptedLegal) {
      setError(
        'Debes marcar la casilla de aceptación del Aviso Legal, Política de Privacidad (Habeas Data), Términos y Condiciones, Retracto y Política de Cookies para iniciar sesión.'
      );
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await recordUserLegalAcceptance(cred.user, 'email_login');
      router.push('/');
    } catch {
      setError('Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico para enviarte el enlace de recuperación.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage(
        'Te hemos enviado un correo con el enlace para cambiar tu contraseña. Revisa tu bandeja de entrada o la carpeta de correo no deseado.'
      );
    } catch {
      setError('No pudimos enviar el correo de recuperación. Verifica que la dirección esté bien escrita.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setResetMessage('');

    if (!acceptedLegal) {
      setError(
        'Antes de continuar con Google, marca la casilla de aceptación previa y expresa de nuestras Políticas Legales y de Privacidad (Habeas Data).'
      );
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await recordUserLegalAcceptance(cred.user, 'google_login');
      router.push('/');
    } catch {
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const activeDoc = previewLegalSection
    ? LEGAL_DOCUMENTS.find((d) => d.id === previewLegalSection) || LEGAL_DOCUMENTS[0]
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9eaf2] p-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#d1d2e0] p-7 sm:p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <img
              src="/logo.png"
              alt="IPT Course Studio"
              width={180}
              height={58}
              className="h-12 w-auto mx-auto object-contain"
            />
          </Link>
          <p className="text-[#595c73] text-sm">
            {isResetMode
              ? 'Recupera el acceso a tu cuenta'
              : 'Inicia sesión en IPT Course Studio para gestionar cursos, tareas y notas'}
          </p>
        </div>

        {error && (
          <div
            className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-5 border border-red-100 leading-relaxed"
            role="alert"
          >
            {error}
          </div>
        )}

        {resetMessage && (
          <div
            className="bg-emerald-50 text-emerald-700 p-3.5 rounded-lg text-xs font-medium mb-5 border border-emerald-200 leading-relaxed"
            role="status"
          >
            {resetMessage}
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-[#2a2b3f] mb-1">
                Correo electrónico registrado
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-hidden"
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1d4ed8] text-white rounded-lg py-2.5 font-bold hover:bg-[#1e40af] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setResetMessage('');
              }}
              className="w-full text-center text-sm font-semibold text-[#595c73] hover:text-[#2a2b3f] py-1.5 cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Casilla obligatoria de Autorización Legal y Habeas Data al momento del Login */}
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => {
                    setAcceptedLegal(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  className="w-4 h-4 mt-0.5 accent-[#1d4ed8] shrink-0 cursor-pointer"
                />
                <span className="text-[11px] text-[#1e293b] leading-relaxed">
                  Acepto de forma previa, expresa e informada el{' '}
                  <button
                    type="button"
                    onClick={() => setPreviewLegalSection('aviso_legal')}
                    className="text-[#1d4ed8] font-bold hover:underline"
                  >
                    Aviso Legal
                  </button>
                  , la{' '}
                  <button
                    type="button"
                    onClick={() => setPreviewLegalSection('privacidad')}
                    className="text-[#1d4ed8] font-bold hover:underline"
                  >
                    Política de Privacidad y Tratamiento de Datos (Habeas Data - Ley 1581 de 2012)
                  </button>
                  , los{' '}
                  <button
                    type="button"
                    onClick={() => setPreviewLegalSection('terminos')}
                    className="text-[#1d4ed8] font-bold hover:underline"
                  >
                    Términos y Condiciones
                  </button>
                  , las{' '}
                  <button
                    type="button"
                    onClick={() => setPreviewLegalSection('retracto_pagos')}
                    className="text-[#1d4ed8] font-bold hover:underline"
                  >
                    Condiciones de Compra, Retracto y Reversión de Pago (Ley 1480 de 2011)
                  </button>{' '}
                  y la{' '}
                  <button
                    type="button"
                    onClick={() => setPreviewLegalSection('cookies')}
                    className="text-[#1d4ed8] font-bold hover:underline"
                  >
                    Política de Cookies
                  </button>
                  .
                </span>
              </label>
              <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-1 border-t border-[#e2e8f0]">
                <span>Se generará constancia digital de aceptación ({CURRENT_LEGAL_VERSION})</span>
                <Link href="/legal" className="text-[#1d4ed8] font-semibold hover:underline">
                  Ver todo →
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white border border-[#d1d2e0] text-[#2a2b3f] rounded-lg py-2.5 font-bold hover:bg-[#f6f7f9] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 text-xs text-[#595c73]">
              <span className="flex-1 h-px bg-[#e9eaf2]" />
              <span>o con tu correo</span>
              <span className="flex-1 h-px bg-[#e9eaf2]" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-[#2a2b3f] mb-1">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-hidden"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-sm font-medium text-[#2a2b3f]">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError('');
                      setResetMessage('');
                    }}
                    className="text-xs font-semibold text-[#1d4ed8] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-hidden"
                  placeholder="Tu contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2a2b3f] text-white rounded-lg py-2.5 font-bold hover:bg-black disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? 'Iniciando y registrando aceptación...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-[#595c73] mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-[#1d4ed8] font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>

      {/* Modal rápido para consultar cualquiera de los 5 documentos legales sin salir del Login */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#cbd5e1] shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
            <div className="bg-[#0f172a] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Scale className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="font-bold text-sm truncate">{activeDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLegalSection(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-left">
              <p className="text-xs text-[#475569] bg-slate-50 p-3 rounded-xl border border-slate-200">
                {activeDoc.summary}
              </p>
              {activeDoc.clauses.map((c, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-[#0f172a]">{c.heading}</h4>
                  <p className="text-xs text-[#334155] leading-relaxed">{c.body}</p>
                  {c.bullets && (
                    <ul className="space-y-1 pl-1">
                      {c.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-1.5 text-xs text-[#1e293b]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAcceptedLegal(true);
                  setPreviewLegalSection(null);
                  setError('');
                }}
                className="px-4 py-2 rounded-xl bg-[#1d4ed8] text-white text-xs font-bold hover:bg-[#1e40af] cursor-pointer"
              >
                Aceptar y volver al Login
              </button>
              <button
                type="button"
                onClick={() => setPreviewLegalSection(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a] cursor-pointer"
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
