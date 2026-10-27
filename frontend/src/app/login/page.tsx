"use client";

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError('Correo o contraseña incorrectos.');
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
      setResetMessage('Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o carpeta de spam.');
    } catch (err: any) {
      setError('No pudimos enviar el correo de recuperación. Verifica que la dirección sea correcta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err: any) {
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#d1d2e0] p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <Image src="/logo.webp" alt="TecnoGan" width={160} height={64} priority className="h-16 w-auto mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-[#2a2b3f] mb-1">Datagan Academy</h1>
          <p className="text-[#595c73] text-sm">
            {isResetMode
              ? 'Recupera el acceso a tu cuenta'
              : 'Inicia sesión para continuar con tus cursos'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100" role="alert">
            {error}
          </div>
        )}

        {resetMessage && (
          <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-lg text-sm mb-6 border border-emerald-200 leading-relaxed" role="status">
            {resetMessage}
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-[#2a2b3f] mb-1">
                Correo Electrónico Registrado
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6d28d2] text-white rounded-lg py-2.5 font-bold hover:bg-[#591fb0] disabled:opacity-50 transition-all cursor-pointer"
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
          <div className="space-y-6">
            <button
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
                <label htmlFor="login-email" className="block text-sm font-medium text-[#2a2b3f] mb-1">Correo Electrónico</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-sm font-medium text-[#2a2b3f]">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError('');
                      setResetMessage('');
                    }}
                    className="text-xs font-semibold text-[#6d28d2] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#d1d2e0] rounded-lg px-4 py-2 focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
                  placeholder="Tu contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2a2b3f] text-white rounded-lg py-2.5 font-bold hover:bg-black disabled:opacity-50 mt-2"
              >
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-[#595c73] mt-8">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-[#6d28d2] font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
