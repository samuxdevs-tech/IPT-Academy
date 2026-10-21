import React from 'react';
import {
  Home,
  PlaySquare,
  FileCheck2,
  BarChart2,
  Calendar,
  Layers,
  Award,
  LucideIcon,
} from 'lucide-react';
import { Course, AssignmentItem } from '@/types';

export type StudentNavItemId =
  | 'home'
  | 'classes'
  | 'assignments'
  | 'grades'
  | 'calendar'
  | 'scenarios'
  | 'certificates';

export interface StudentNavItemDefinition {
  id: StudentNavItemId;
  label: string;
  shortLabel?: string;
  description: string;
  icon: LucideIcon;
  match: string;
  inBottomBar: boolean;
  getHref: (context: StudentNavigationContext) => string;
  getBadge?: (context: StudentNavigationContext) => string | undefined;
}

export interface StudentNavigationContext {
  courses?: Course[];
  assignments?: AssignmentItem[];
  currentPathname?: string;
}

export interface StudentResolvedNavItem {
  id: StudentNavItemId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  match: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: string;
  inBottomBar: boolean;
}

/**
 * Catálogo centralizado de botones y rutas de navegación del estudiante.
 * Modificar aquí actualiza automáticamente el Sidebar, el Drawer móvil y la Barra inferior.
 */
export const STUDENT_NAV_DEFINITIONS: StudentNavItemDefinition[] = [
  {
    id: 'home',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Catálogo de cursos y clases disponibles',
    icon: Home,
    match: '/',
    inBottomBar: true,
    getHref: () => '/',
  },
  {
    id: 'classes',
    label: 'Clases',
    shortLabel: 'Clases',
    description: 'Reproductor y lecciones del curso activo',
    icon: PlaySquare,
    match: '/course',
    inBottomBar: true,
    getHref: (ctx) => {
      const visible = (ctx.courses || []).filter(
        (c) => c.visibility !== 'draft' && c.published !== false
      );
      const primary = visible[0] || (ctx.courses && ctx.courses[0]);
      return primary?.slug
        ? `/course?course=${encodeURIComponent(primary.slug)}`
        : '/course?course=datagan-master-pro';
    },
  },
  {
    id: 'assignments',
    label: 'Tareas',
    shortLabel: 'Tareas',
    description: 'Actividades asignadas y entregas con visor',
    icon: FileCheck2,
    match: '/assignments',
    inBottomBar: true,
    getHref: () => '/assignments',
    getBadge: (ctx) => {
      const count = (ctx.assignments || []).filter(
        (a) => a.status === 'pending'
      ).length;
      return count > 0 ? String(count) : undefined;
    },
  },
  {
    id: 'grades',
    label: 'Calificaciones',
    shortLabel: 'Notas',
    description: 'Registro de calificaciones y promedio acumulado',
    icon: BarChart2,
    match: '/grades',
    inBottomBar: true,
    getHref: () => '/grades',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    shortLabel: 'Fechas',
    description: 'Agenda de entregas, clases y sesiones en vivo',
    icon: Calendar,
    match: '/calendar',
    inBottomBar: false,
    getHref: () => '/calendar',
  },
  {
    id: 'scenarios',
    label: 'Casos Prácticos',
    shortLabel: 'Casos',
    description: 'Simulaciones interactivas de toma de decisiones',
    icon: Layers,
    match: '/scenarios',
    inBottomBar: false,
    getHref: () => '/scenarios',
  },
  {
    id: 'certificates',
    label: 'Certificados',
    shortLabel: 'Diploma',
    description: 'Diplomas y constancias oficiales de finalización',
    icon: Award,
    match: '/certificate',
    inBottomBar: false,
    getHref: () => '/certificate',
  },
];

/**
 * Evalúa si una ruta coincide con la ruta activa actual.
 */
export function isStudentRouteActive(match: string, currentPathname: string = '/'): boolean {
  if (match === '/') {
    return currentPathname === '/';
  }
  return currentPathname.startsWith(match);
}

/**
 * Evalúa si alguna de las secciones del menú secundario 'Más' está activa.
 */
export function isMoreSectionActive(currentPathname: string = '/'): boolean {
  return (
    currentPathname.startsWith('/calendar') ||
    currentPathname.startsWith('/scenarios') ||
    currentPathname.startsWith('/certificate')
  );
}

/**
 * Servicio centralizado: resuelve la lista completa de botones con sus rutas, estados activos y badges.
 */
export function resolveStudentNavItems(context: StudentNavigationContext): StudentResolvedNavItem[] {
  const currentPath = context.currentPathname || '/';

  return STUDENT_NAV_DEFINITIONS.map((def) => {
    const href = def.getHref(context);
    const badge = def.getBadge ? def.getBadge(context) : undefined;
    const isActive = isStudentRouteActive(def.match, currentPath);

    return {
      id: def.id,
      label: def.label,
      shortLabel: def.shortLabel || def.label,
      description: def.description,
      href,
      match: def.match,
      icon: def.icon,
      isActive,
      badge,
      inBottomBar: def.inBottomBar,
    };
  });
}
