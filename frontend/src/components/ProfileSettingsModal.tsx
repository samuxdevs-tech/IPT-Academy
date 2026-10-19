'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User, updateProfile } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { X, Camera, Check, User as UserIcon, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { UserProfile } from '@/types';
import { useModalA11y } from '@/hooks/useModalA11y';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onProfileUpdated?: (profile: UserProfile) => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  user,
  onProfileUpdated
}: ProfileSettingsModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { containerRef } = useModalA11y({ isOpen, onClose });

  // Cargar datos actuales
  useEffect(() => {
    if (!isOpen || !user) return;

    // Inicializar desde Auth
    const currentDisplayName = user.displayName || '';
    const parts = currentDisplayName.trim().split(' ');
    const initialFirst = parts[0] || (user.email ? user.email.split('@')[0] : '');
    const initialLast = parts.slice(1).join(' ') || '';

    setFirstName(initialFirst);
    setLastName(initialLast);
    setPhotoURL(user.photoURL || '');

    // Intentar leer desde RTDB si ya se había guardado
    get(ref(db, `users/${user.uid}/profile`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val() as UserProfile;
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.photoURL) setPhotoURL(data.photoURL);
      }
    }).catch(err => console.error(err));
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  // Manejar subida de archivo de imagen local y comprimir a micro-avatar < 2048 caracteres
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen no debe superar los 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setErrorMsg('No se pudo procesar la imagen');
            return;
          }

          // Recorte cuadrado centrado
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Comprimir a JPEG con calidad controlada para cumplir límite estricto de 2048 caracteres
          let compressed = canvas.toDataURL('image/jpeg', 0.6);
          if (compressed.length > 2000) {
            compressed = canvas.toDataURL('image/jpeg', 0.45);
          }
          if (compressed.length > 2048) {
            canvas.width = 48;
            canvas.height = 48;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 48, 48);
            compressed = canvas.toDataURL('image/jpeg', 0.4);
          }

          setPhotoURL(compressed);
          setErrorMsg('');
        } catch {
          setErrorMsg('Error al optimizar la imagen');
        }
      };
      img.onerror = () => {
        setErrorMsg('El archivo seleccionado no es una imagen válida');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg('El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const fullDisplayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const trimmedPhoto = photoURL.trim();

      // Firebase Auth limita photoURL a URLs válidas y max 2048 caracteres
      const isHttp = /^https?:\/\//i.test(trimmedPhoto);
      const isShortData = trimmedPhoto.startsWith('data:image/') && trimmedPhoto.length <= 2048;
      const safeAuthPhoto = (isHttp && trimmedPhoto.length <= 2048) || isShortData
        ? trimmedPhoto
        : null;

      // 1. Guardar en Firebase Auth con tolerancia a restricciones de URL
      try {
        await updateProfile(user, {
          displayName: fullDisplayName,
          photoURL: safeAuthPhoto
        });
      } catch (authErr) {
        console.warn('updateProfile con photoURL advertencia en Firebase Auth:', authErr);
        await updateProfile(user, {
          displayName: fullDisplayName,
          photoURL: isHttp && trimmedPhoto.length <= 2048 ? trimmedPhoto : null
        });
      }

      // 2. Guardar en Firebase RTDB
      const profileData: UserProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: fullDisplayName,
        photoURL: trimmedPhoto,
        email: user.email || '',
        updatedAt: new Date().toISOString()
      };

      await set(ref(db, `users/${user.uid}/profile`), profileData);

      setSuccessMsg(true);
      if (onProfileUpdated) {
        onProfileUpdated(profileData);
      }

      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      setErrorMsg(err.message || 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#d1d2e0] overflow-hidden flex flex-col outline-hidden"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9eaf2] bg-[#f6f7f9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#065fd4]/10 text-[#065fd4] flex items-center justify-center font-bold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 id="profile-settings-title" className="font-extrabold text-sm text-[#2a2b3f]">Configuración del Perfil</h3>
              <p className="text-[11px] text-[#595c73]">Datos para acreditación y certificados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración de perfil"
            className="p-1.5 rounded-lg text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#e9eaf2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Zona de Foto de Perfil */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#065fd4] shadow-md bg-[#202230] flex items-center justify-center">
                {photoURL ? (
                  <Image
                    src={photoURL}
                    alt="Foto de perfil"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    onError={() => setPhotoURL('')}
                    unoptimized
                  />
                ) : (
                  <span className="text-white font-extrabold text-3xl">
                    {firstName ? firstName[0].toUpperCase() : 'U'}
                  </span>
                )}
              </div>

              <label
                htmlFor="avatar-file-input"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#065fd4] text-white shadow-lg cursor-pointer hover:bg-[#054db2] transition-transform active:scale-90"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[11px] text-[#595c73]">
              Sube una foto o selecciona un avatar predeterminado
            </p>

            {/* Opciones de avatares rápidos */}
            <div className="flex items-center gap-2">
              {defaultAvatars.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoURL(url)}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform active:scale-95 ${
                    photoURL === url ? 'border-[#065fd4] scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={url} alt={`Avatar ${i}`} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                </button>
              ))}
              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className="text-[10px] text-rose-500 font-bold ml-1 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Campos de Nombre y Apellido */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Andrés Felipe"
                required
                className="w-full px-3.5 py-2 text-sm border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#065fd4] focus:ring-1 focus:ring-[#065fd4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2a2b3f] mb-1">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: García Pérez"
                className="w-full px-3.5 py-2 text-sm border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#065fd4] focus:ring-1 focus:ring-[#065fd4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#595c73] mb-1">Correo Electrónico (No editable)</label>
              <input
                type="text"
                value={user.email || ''}
                disabled
                className="w-full px-3.5 py-2 text-xs border border-[#e9eaf2] bg-[#f6f7f9] text-[#9194ac] rounded-xl font-mono cursor-not-allowed"
              />
            </div>
          </div>

          {/* Mensajes de feedback */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 shrink-0" />
              <span>¡Perfil actualizado con éxito!</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e9eaf2]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#065fd4] hover:bg-[#054db2] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
