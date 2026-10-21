'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileCheck2,
  BookOpen,
  Calendar,
  Layers,
  Crown,
  ChevronRight
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export default function Nivel4OwnerPanel() {
  const { user, userRole } = useAuth();
  const effectiveRole = user?.uid === 'fIBITLfS50bRxE72fqgzC5nnArX2' ? 'owner' : userRole;

  return (
    <div className="flex-1 bg-[#f4f5f9] text-[#2a2b3f] font-sans pb-20">
      {/* Breadcrumb de navegación */}
      <div className="bg-white px-6 pt-3 pb-1 border-b border-[#f0f1f7]">
        <nav className="flex items-center gap-2 text-xs text-[#595c73]" aria-label="Migas de pan">
          <Link href="/" className="hover:text-[#6d28d2] font-semibold transition-colors">
            Panel Principal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#a0a3bd]" />
          <span className="text-[#2a2b3f] font-bold">Consola de Administrador Principal</span>
        </nav>
      </div>

      {/* Cabecera del Panel */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-6 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#065fd4] border border-blue-200 inline-flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Nivel 4 · Panel del Propietario (Owner)</span>
              </span>
              <span className="text-xs text-[#595c73] font-medium">
                Control de gestión de IPT Course Studio
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2a2b3f]">
              Centro de Mando Máximo (Superadministrador)
            </h1>
            <p className="text-xs text-[#595c73] max-w-2xl">
              Como Administrador Principal (Nivel 4), tienes acceso a toda la infraestructura: asignación de roles a cualquier cuenta, gestión de licencias, auditoría legal de Habeas Data, administración de cursos y acceso jerárquico a los paneles de Nivel 3 y Nivel 2.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/roles"
              className="px-4 py-2.5 rounded-xl bg-[#065fd4] text-white text-xs font-bold hover:bg-[#054db2] transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Matriz de Permisos y Roles</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* HERENCIA JERÁRQUICA TOTAL: ACCESO DIRECTO A PANELES INFERIORES */}
        <section className="bg-gradient-to-r from-blue-50 via-white to-slate-50 border border-blue-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#065fd4]" />
              <h2 className="text-sm font-extrabold text-[#2a2b3f]">
                Jerarquía: Acceso del Nivel 4 a Paneles Operativos
              </h2>
            </div>
            <span className="text-xs font-bold text-[#065fd4]">
              Supervisión multinivel activa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/nivel-3"
              className="p-4 rounded-2xl bg-white border border-[#d1d2e0] hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  N3
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#2a2b3f] group-hover:text-amber-700">
                    Ingresar a Panel de Nivel 3 (Operador)
                  </h4>
                  <p className="text-[11px] text-[#595c73]">
                    Licencias comerciales, seguimiento y diplomas emitidos
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7e8299] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/nivel-2"
              className="p-4 rounded-2xl bg-white border border-[#d1d2e0] hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] flex items-center justify-center font-bold">
                  N2
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#2a2b3f] group-hover:text-[#1d4ed8]">
                    Ingresar a Panel de Nivel 2 (Instructor)
                  </h4>
                  <p className="text-[11px] text-[#595c73]">
                    Editor de cursos, revisión de tareas y calendario
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7e8299] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* HERRAMIENTAS EXCLUSIVAS DEL NIVEL 4 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#065fd4] border border-blue-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Asignación de Roles y Accesos
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Asigna y actualiza los niveles de autorización de cualquier usuario registrado por nombre, correo o identificador.
              </p>
            </div>
            <Link
              href="/roles"
              className="text-xs font-bold text-[#065fd4] hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Abrir gestor de roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Administración y Borrado de Cursos
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Control definitivo del catálogo, importación masiva de JSON, cambio de visibilidad pública/borrador y borrado permanente.
              </p>
            </div>
            <Link
              href="/?step=catalog"
              className="text-xs font-bold text-[#1d4ed8] hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Abrir catálogo de cursos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Auditoría Legal y Graduados
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Revisa el libro oficial de consentimiento legal, marcas de tiempo, certificados emitidos y métricas de retención.
              </p>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Ver auditoría completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* TABLA DE PRIVILEGIOS DE NIVEL 4 */}
        <section className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f0f1f7] pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-[#2a2b3f]">
              Matriz de Poderes Exclusivos de Nivel 4 (Owner)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#595c73]">
            <ul className="space-y-2 list-disc list-inside">
              <li>Poder para promover o degradar usuarios a Niveles 1, 2, 3 o 4</li>
              <li>Protección inmutable de la propia cuenta Owner (no puede ser degradada)</li>
              <li>Capacidad de otorgar y revocar licencias de cursos individualmente</li>
              <li>Acceso irrestricto a los paneles /nivel-2 y /nivel-3</li>
            </ul>
            <ul className="space-y-2 list-disc list-inside">
              <li>Permiso único para eliminar cursos del catálogo con confirmación por slug</li>
              <li>Auditoría forense de firmas digitales y aceptación de políticas</li>
              <li>Exportación e importación completa de la arquitectura en JSON</li>
              <li>Supervisión de calificaciones y tareas en tiempo real</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
