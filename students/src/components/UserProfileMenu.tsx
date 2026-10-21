'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLms } from '@/context/LmsContext';
import {
  Award,
  LogOut,
  ExternalLink,
  BookOpen,
  Layers,
  ChevronRight,
  Sparkles,
  Settings,
  User as UserIcon,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import CertificateModal from './CertificateModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import { Certificate, UserProfile } from '@/types';

interface UserProfileMenuProps {
  courseSlug?: string;
  className?: string;
}

export default function UserProfileMenu({ courseSlug: propCourseSlug, className = '' }: UserProfileMenuProps) {
  const { user, isAdmin, logout, userLicenses } = useAuth();
  const { courses } = useLms();
  const [isOpen, setIsOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Perfil del usuario
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Determinar curso activo real o primer curso matriculado
  const enrolledSlugs = useMemo(() => Object.keys(userLicenses || {}), [userLicenses]);

  const [activeCourseSlug, setActiveCourseSlug] = useState<string>(() => {
    return propCourseSlug || enrolledSlugs[0] || courses[0]?.slug || '';
  });

  useEffect(() => {
    if (propCourseSlug) {
      setActiveCourseSlug(propCourseSlug);
      return;
    }
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlCourse = sp.get('course') || sp.get('slug');
      if (urlCourse) {
        setActiveCourseSlug(urlCourse);
        return;
      }
    }
    if (enrolledSlugs.length > 0) {
      setActiveCourseSlug(enrolledSlugs[0]);
    } else if (courses.length > 0) {
      setActiveCourseSlug(courses[0].slug);
    }
  }, [propCourseSlug, enrolledSlugs, courses]);

  // Datos de certificación y progreso
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState(6);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [existingCert, setExistingCert] = useState<Certificate | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic o tocar afuera
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

  // Cargar perfil desde RTDB
  const fetchProfile = () => {
    if (!user) return;
    get(ref(db, `users/${user.uid}/profile`)).then((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setUserProfile(val);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Cargar progreso del usuario y estado de certificado
  useEffect(() => {
    if (!user || !activeCourseSlug) {
      setCompletedLessonsCount(0);
      setHasCertificate(false);
      setExistingCert(null);
      return;
    }

    const certRef = ref(db, `users/${user.uid}/certificates/${activeCourseSlug}`);
    get(certRef).then(async (snap) => {
      if (snap.exists()) {
        setHasCertificate(true);
        const certId = snap.val();
        const fullCertSnap = await get(ref(db, `certificates/${certId}`));
        if (fullCertSnap.exists()) {
          setExistingCert(fullCertSnap.val());
        }
      } else {
        setHasCertificate(false);
        setExistingCert(null);
      }
    }).catch(() => {});

    const progressRef = ref(db, `progress/${user.uid}/${activeCourseSlug}`);
    get(progressRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.completedLessons && Array.isArray(data.completedLessons)) {
          setCompletedLessonsCount(data.completedLessons.length);
        } else if (data.completedLessons && typeof data.completedLessons === 'object') {
          setCompletedLessonsCount(Object.values(data.completedLessons).filter(Boolean).length);
        } else {
          setCompletedLessonsCount(0);
        }
      } else {
        setCompletedLessonsCount(0);
      }
    }).catch(() => {});

    get(ref(db, `courses/${activeCourseSlug}`)).then((snap) => {
      if (snap.exists()) {
        const c = snap.val();
        if (c.modules) {
          let count = 0;
          c.modules.forEach((m: any) => {
            if (m.lessons) count += m.lessons.length;
          });
          if (count > 0) setTotalLessonsCount(count);
        }
      }
    }).catch(() => {});
  }, [user, activeCourseSlug]);

  if (!user) return null;

  const progressPercent = Math.min(100, Math.round((completedLessonsCount / (totalLessonsCount || 1)) * 100));
  const isEligible = progressPercent >= 80;

  const avatarPhoto = userProfile?.photoURL || user.photoURL;
  const userInitial = userProfile?.firstName
    ? userProfile.firstName[0].toUpperCase()
    : user.email
    ? user.email[0].toUpperCase()
    : 'U';

  const fullDisplayName =
    (userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userProfile?.displayName || user.displayName || user.email?.split('@')[0]) || 'Estudiante';

  return (
    <>
      <div className={`relative ${className}`} ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#202230] to-[#3a3d54] text-white flex items-center justify-center font-bold text-sm shadow-md hover:ring-2 hover:ring-[#6d28d2] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#444760] overflow-hidden"
          title={`Perfil: ${fullDisplayName}`}
          aria-label="Abrir menú de usuario"
        >
          {avatarPhoto ? (
            <Image src={avatarPhoto} alt={fullDisplayName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span>{userInitial}</span>
          )}

          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
              isEligible ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2.5 w-[min(calc(100vw-32px),320px)] bg-white rounded-2xl shadow-2xl border border-[#d1d2e0] py-3 text-[#2a2b3f] z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            
            <div className="px-4 py-3 bg-[#f6f7f9] border-b border-[#e9eaf2] flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[#202230] text-white flex items-center justify-center font-extrabold text-base shrink-0 border-2 border-[#065fd4]">
                {avatarPhoto ? (
                  <Image src={avatarPhoto} alt={fullDisplayName} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#2a2b3f] truncate">{fullDisplayName}</p>
                <p className="text-[11px] text-[#595c73] truncate font-mono">{user.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isEligible
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isEligible ? 'Diploma disponible' : 'En curso'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-[#e9eaf2] bg-gradient-to-b from-[#065fd4]/[0.03] to-transparent">
              <div className="p-3 rounded-xl border border-[#065fd4]/20 bg-[#065fd4]/[0.04] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#065fd4] truncate max-w-[200px]">
                    <Award className="w-4 h-4 shrink-0 text-[#065fd4]" />
                    <span className="truncate">
                      {courses.find((c) => c.slug === activeCourseSlug)?.title || 'Diploma IPT Course'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#065fd4] bg-[#065fd4]/10 px-1.5 py-0.5 rounded">
                    {progressPercent}%
                  </span>
                </div>

                <div className="w-full bg-[#e9eaf2] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#065fd4] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#595c73]">
                  <span>Clases: {completedLessonsCount}/{totalLessonsCount}</span>
                  <span className="font-semibold text-[#065fd4]">
                    {isEligible ? 'Meta completada' : 'Se requiere 80%'}
                  </span>
                </div>

                {isEligible ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsCertModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 bg-[#065fd4] hover:bg-[#054db2] text-white"
                  >
                    <Award className="w-4 h-4" />
                    <span>Ver Diploma ({progressPercent}%)</span>
                  </button>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>El diploma se activa al completar el 80% del curso.</span>
                  </div>
                )}

                <a
                  href={activeCourseSlug ? `/certificate?course=${activeCourseSlug}` : '/certificate'}
                  onClick={() => setIsOpen(false)}
                  className="w-full py-1.5 text-center text-[11px] font-bold text-[#065fd4] hover:underline block"
                >
                  Ir a mis diplomas →
                </a>
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
                href="/course"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#6d28d2]" />
                  <span>Clases en Video</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9194ac]" />
              </a>

              <a
                href="/scenarios"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#595c73] hover:text-[#2a2b3f] hover:bg-[#f6f7f9] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#c4710d]" />
                  <span>Casos Prácticos</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9194ac]" />
              </a>
            </div>

            {/* SECCIÓN 3: CERRAR SESIÓN */}
            <div className="pt-2 px-2 border-t border-[#e9eaf2] mt-1">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Modal del Diploma Oficial */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        user={user}
        courseSlug={activeCourseSlug}
        courseTitle={courses.find((c) => c.slug === activeCourseSlug)?.title}
        defaultStudentName={fullDisplayName}
        progressPercent={progressPercent}
        initialCertificate={existingCert}
      />

      {/* Modal de Configuración de Perfil */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onProfileUpdated={(updated) => {
          setUserProfile(updated);
        }}
      />
    </>
  );
}
