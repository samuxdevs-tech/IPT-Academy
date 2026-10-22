'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  FileCheck2,
  Calendar,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { useLms } from '@/context/LmsContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPaletteModal({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { courses, assignments } = useLms();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allItems = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      icon: any;
      action: () => void;
    }> = [
      {
        id: 'action-courses',
        title: 'Ver Catálogo y Editor de Cursos',
        category: 'Navegación',
        icon: BookOpen,
        action: () => {
          router.push('/?view=courses');
          onClose();
        },
      },
      {
        id: 'action-assignments',
        title: 'Gestor de Tareas y Calificaciones',
        category: 'Navegación',
        icon: FileCheck2,
        action: () => {
          router.push('/assignments');
          onClose();
        },
      },
      {
        id: 'action-calendar',
        title: 'Calendario y Sesiones en Vivo',
        category: 'Navegación',
        icon: Calendar,
        action: () => {
          router.push('/calendar');
          onClose();
        },
      },
      {
        id: 'action-students',
        title: 'Estudiantes y Radar de Rezago',
        category: 'Navegación',
        icon: Users,
        action: () => {
          router.push('/analytics');
          onClose();
        },
      },
      {
        id: 'action-roles',
        title: 'Roles de Acceso y Licencias (RBAC)',
        category: 'Seguridad',
        icon: ShieldCheck,
        action: () => {
          router.push('/roles');
          onClose();
        },
      },
      {
        id: 'action-metrics',
        title: 'Biblioteca de Parámetros y Fórmulas',
        category: 'Biblioteca',
        icon: Sparkles,
        action: () => {
          router.push('/metrics');
          onClose();
        },
      },
      {
        id: 'action-student-portal',
        title: 'Abrir Portal de Estudiantes (ipt-course.web.app)',
        category: 'Enlaces Externos',
        icon: ExternalLink,
        action: () => {
          window.open('https://ipt-course.web.app', '_blank');
          onClose();
        },
      },
    ];

    // Cursos dinámicos
    courses.forEach((c) => {
      list.push({
        id: `course-${c.slug}`,
        title: `Curso: ${c.title}`,
        category: 'Cursos Activos',
        icon: BookOpen,
        action: () => {
          router.push(`/?view=courses&course=${c.slug}`);
          onClose();
        },
      });
    });

    // Tareas dinámicas
    assignments.forEach((a) => {
      list.push({
        id: `asg-${a.id}`,
        title: `Tarea: ${a.title} (${a.courseTitle})`,
        category: 'Actividades',
        icon: FileCheck2,
        action: () => {
          router.push(`/assignments?id=${a.id}`);
          onClose();
        },
      });
    });

    return list;
  }, [courses, assignments, router, onClose]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8);
    const q = query.toLowerCase().trim();
    return allItems
      .filter((item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allItems, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#e5e5ea] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input de Búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e5e5ea] bg-[#fafafa]">
          <Search className="w-4 h-4 text-[#8e8e93]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Escribe para buscar cursos, tareas, estudiantes o comandos..."
            className="flex-1 bg-transparent text-sm text-[#1d1d1f] placeholder:text-[#8e8e93] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-neutral-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-neutral-100">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8e8e93]">
              No se encontraron elementos que coincidan con tu búsqueda.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#0071e3] text-white' : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#e5e5ea] text-[#1d1d1f]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{item.title}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer con atajos */}
        <div className="px-4 py-2 border-t border-[#e5e5ea] bg-[#f5f5f7] flex items-center justify-between text-[11px] text-[#8e8e93]">
          <span>Presiona ESC para cerrar</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#d1d1d6] font-mono text-[10px] text-[#1d1d1f]">
              Ctrl+K
            </kbd>
            <span>para abrir en cualquier lugar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
