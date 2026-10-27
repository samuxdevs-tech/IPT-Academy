"use client";

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      // 1. Crear usuario en Firebase Auth con correo y contraseña
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Actualizar displayName en Firebase Auth
      await updateProfile(user, { displayName: fullName });

      // 3. Guardar en RTDB con estructura estándar de perfil
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

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar con Google.');
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
          <h1 className="text-2xl font-bold text-[#2a2b3f] mb-1">Crear Cuenta</h1>
          <p className="text-[#595c73] text-sm">Únete a Datagan Academy</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6" role="alert">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white border border-[#d1d2e0] text-[#2a2b3f] rounded-lg py-2.5 font-bold hover:bg-[#f6f7f9] disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Registrarse con Google
        </button>

        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-[#d1d2e0]"></div>
          <span className="flex-shrink-0 mx-4 text-[#595c73] text-xs font-medium uppercase tracking-wider">O usa tu correo</span>
          <div className="flex-grow border-t border-[#d1d2e0]"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="register-firstname" className="block text-sm font-medium text-[#2a2b3f] mb-1">Nombre</label>
              <input
                id="register-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-lg px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
                placeholder="Carlos"
                required
              />
            </div>
            <div>
              <label htmlFor="register-lastname" className="block text-sm font-medium text-[#2a2b3f] mb-1">Apellido</label>
              <input
                id="register-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-[#d1d2e0] rounded-lg px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-[#2a2b3f] mb-1">Correo Electrónico</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#d1d2e0] rounded-lg px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-[#2a2b3f] mb-1">Contraseña</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#d1d2e0] rounded-lg px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#6d28d2] focus-visible:outline-hidden"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6d28d2] text-white rounded-lg py-2.5 font-bold hover:bg-[#5b21b6] disabled:opacity-50 mt-2 transition-all shadow-xs cursor-pointer"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-[#595c73] mt-8">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#6d28d2] font-bold hover:underline">
            Inicia Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
