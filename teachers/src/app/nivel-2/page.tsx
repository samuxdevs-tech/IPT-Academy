'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Calendar,
  FileCheck2,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/lib/rbac';

export default function Nivel2InstructorPanel() {
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
          <span className="text-[#2a2b3f] font-bold">Consola de Instructor</span>
        </nav>
      </div>

      {/* Cabecera del Panel */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-6 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                Nivel 2 · Panel del Instructor
              </span>
              <span className="text-xs text-[#595c73] font-medium">
                Gestión académica y pedagógica
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2a2b3f]">
              Consola Operativa del Instructor
            </h1>
            <p className="text-xs text-[#595c73] max-w-2xl">
              Como Instructor (Nivel 2) puedes estructurar módulos, lecciones en video, programar el calendario académico y calificar entregas de tareas con el visor interactivo de documentos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/assignments"
              className="px-4 py-2.5 rounded-xl bg-[#1d4ed8] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Calificar Tareas</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* TARJETAS DE ACCESO DIRECTO PARA NIVEL 2 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] border border-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Editor de Cursos y Clases
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Organiza el catálogo, añade módulos temáticos, conecta clases en video (R2 MP4 o YouTube) y configura recursos descargables.
              </p>
            </div>
            <Link
              href="/?step=curriculum"
              className="text-xs font-bold text-[#1d4ed8] hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Abrir editor curricular</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6d28d2] border border-purple-100 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Revisión de Tareas y Rúbricas
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Inspecciona archivos entregados con visores embebidos (PDF, DOCX, XLSX, JPG), asigna puntajes por rúbrica y graba notas de voz.
              </p>
            </div>
            <Link
              href="/assignments"
              className="text-xs font-bold text-[#6d28d2] hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Ir a consola de revisión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2a2b3f]">
                Calendario y Clases en Vivo
              </h3>
              <p className="text-xs text-[#595c73] leading-relaxed">
                Programa fechas de tutorías, evaluaciones y enlaces a videollamadas que se sincronizan de inmediato en el portal del alumno.
              </p>
            </div>
            <Link
              href="/calendar"
              className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1.5 pt-2"
            >
              <span>Abrir calendario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ALCANCE Y LÍMITES DEL NIVEL 2 */}
        <section className="bg-white rounded-2xl border border-[#d1d2e0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#f0f1f7] pb-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-extrabold text-[#2a2b3f]">
              Alcance de Permisos del Nivel 2 (Instructor)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-2">
              <h4 className="font-bold text-[#2a2b3f] flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Acciones autorizadas para Instructor:</span>
              </h4>
              <ul className="space-y-1.5 text-[#595c73] list-disc list-inside">
                <li>Crear y estructurar módulos y lecciones de cursos</li>
                <li>Subir videos a Cloudflare R2 o enlazar YouTube</li>
                <li>Publicar tareas, ponderaciones y rúbricas evaluativas</li>
                <li>Calificar entregas con notas de voz y visores embebidos</li>
                <li>Programar eventos y sesiones en el calendario</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-2">
              <h4 className="font-bold text-[#2a2b3f] flex items-center gap-1.5 text-amber-700">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Funciones reservadas para Niveles 3 y 4:</span>
              </h4>
              <ul className="space-y-1.5 text-[#595c73] list-disc list-inside">
                <li>Otorgar o revocar licencias comerciales (Operador)</li>
                <li>Eliminar cursos permanentemente del catálogo (Administrador Principal)</li>
                <li>Asignar o modificar roles de cuentas (Administrador Principal)</li>
                <li>Auditar el libro de firmas legales y Habeas Data (Administrador Principal)</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
