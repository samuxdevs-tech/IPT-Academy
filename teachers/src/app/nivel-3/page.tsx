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
  ChevronRight
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export default function Nivel3OperatorPanel() {
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
          <span className="text-[#2a2b3f] font-bold">Consola de Operador</span>
        </nav>
      </div>

      {/* Cabecera del Panel */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-6 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                Nivel 3 · Panel del Operador
              </span>
              <span className="text-xs text-[#595c73] font-medium">
                Gestión comercial, licencias y certificados
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2a2b3f]">
              Consola Operativa y Licencias
            </h1>
            <p className="text-xs text-[#595c73] max-w-2xl">
              Como Operador (Nivel 3) puedes activar y revocar licencias de cursos para estudiantes, auditar certificados emitidos, consultar el avance de alumnos y acceder a las herramientas del Nivel 2.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/roles"
              className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar Licencias</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* HERRAMIENTAS PRINCIPALES DEL NIVEL 3 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Gestión de Licencias de Cursos
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Activa o revoca el acceso a cursos específicos para cualquier estudiante con un solo clic.
              </p>
            </div>
            <Link
              href="/roles"
              className="text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Abrir gestor de licencias</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Certificados y Progreso
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Supervisa alumnos graduados, avance porcentual de clases y valida códigos QR de diplomas emitidos.
              </p>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Ver seguimiento y diplomas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* HERENCIA JERÁRQUICA: ACCESO A NIVEL 2 */}
          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Acceso a Nivel 2 (Instructor)
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Por jerarquía superior, como Operador tienes autorización completa para ingresar a las herramientas de Instructor.
              </p>
            </div>
            <Link
              href="/nivel-2"
              className="text-xs font-bold text-[#1d4ed8] hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Ir al panel de Nivel 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ALCANCE Y LÍMITES DEL NIVEL 3 */}
        <section className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f0f1f7] pb-3">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-extrabold text-[#2a2b3f]">
              Alcance de Permisos del Nivel 3 (Operador)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-2">
              <h4 className="font-bold text-[#2a2b3f] flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Acciones autorizadas para Operador:</span>
              </h4>
              <ul className="space-y-1.5 text-[#595c73] list-disc list-inside">
                <li>Activar y revocar licencias de acceso a cursos</li>
                <li>Monitorear el avance académico de estudiantes</li>
                <li>Verificar certificados emitidos y firmas</li>
                <li>Acceder a las herramientas pedagógicas de Nivel 2</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-2">
              <h4 className="font-bold text-[#2a2b3f] flex items-center gap-1.5 text-purple-700">
                <Lock className="w-4 h-4 text-[#6d28d2]" />
                <span>Funciones exclusivas de Nivel 4 (Administrador Principal):</span>
              </h4>
              <ul className="space-y-1.5 text-[#595c73] list-disc list-inside">
                <li>Asignar y cambiar roles de cuentas</li>
                <li>Eliminar cursos permanentemente de la base de datos</li>
                <li>Auditar firmas de consentimiento legal oficial</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
