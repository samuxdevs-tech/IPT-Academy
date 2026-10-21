'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  LogOut,
  BookOpen,
  ChevronRight,
  Settings,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import ProfileSettingsModal from './ProfileSettingsModal';
import { UserProfile } from '@/types';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

interface UserProfileMenuProps {
  courseSlug?: string;
  className?: string;
}

export default function UserProfileMenu({ className = '' }: UserProfileMenuProps) {
  const { user, userRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const fetchProfile = () => {
    if (!user) return;
    get(ref(db, `users/${user.uid}/profile`))
      .then((snap) => {
        if (snap.exists()) {
          setUserProfile(snap.val());
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  if (!user) return null;

  const effectiveRole = user.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2' ? 'owner' : userRole;

  const avatarPhoto = userProfile?.photoURL || user.photoURL;
  const userInitial = userProfile?.firstName
    ? userProfile.firstName[0].toUpperCase()
    : user.email
    ? user.email[0].toUpperCase()
    : 'A';

  const fullDisplayName =
    (userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userProfile?.displayName || user.displayName || user.email?.split('@')[0]) || 'Administrador';

  return (
    <>
      <div className={`relative ${className}`} ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#202230] to-[#3a3d54] text-white flex items-center justify-center font-bold text-sm shadow-md hover:ring-2 hover:ring-[#6d28d2] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#444760] overflow-hidden"
          title={`Perfil: ${fullDisplayName}`}
          aria-label="Abrir menú de administrador"
        >
          {avatarPhoto ? (
            <Image src={avatarPhoto} alt={fullDisplayName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span>{userInitial}</span>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2.5 w-[min(calc(100vw-32px),320px)] bg-white rounded-2xl shadow-2xl border border-[#d1d2e0] py-3 text-[#2a2b3f] z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f7f9] border-b border-[#e9eaf2] flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[#202230] text-white flex items-center justify-center font-extrabold text-base shrink-0 border-2 border-[#6d28d2]">
                {avatarPhoto ? (
                  <Image src={avatarPhoto} alt={fullDisplayName} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#2a2b3f] truncate">{fullDisplayName}</p>
                <p className="text-[10px] text-[#595c73] truncate font-mono">ID: {user.uid}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ROLE_DEFINITIONS[effectiveRole]?.badgeClass}`}
                  >
                    {ROLE_DEFINITIONS[effectiveRole]?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-2 py-2 space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[#065fd4]" />
                  <span>Configuración del Perfil</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9194ac]" />
              </button>

              <a
                href="/?step=catalog"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#1d4ed8]" />
                  <span>Catálogo y Editor de Cursos</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9194ac]" />
              </a>

              <a
                href="/assignments"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Tareas y Calificaciones</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9194ac]" />
              </a>

              <a
                href="/roles"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#065fd4] bg-[#065fd4]/5 hover:bg-[#065fd4]/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#065fd4]" />
                  <span className="font-semibold">Roles y Licencias (RBAC)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#065fd4]" />
              </a>
            </div>

            <div className="pt-2 px-2 border-t border-[#e9eaf2] mt-1">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onProfileUpdated={fetchProfile}
      />
    </>
  );
}
