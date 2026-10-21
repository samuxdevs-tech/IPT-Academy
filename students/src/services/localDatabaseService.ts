import initialMockDb from '@/data/localMockDatabase.json';
import {
  Course,
  AssignmentItem,
  InstitutionalCalendarEvent,
  Scenario,
  Certificate,
} from '@/types';

export interface LocalStudentUser {
  uid: string;
  displayName: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
}

export interface LocalDatabaseState {
  student: LocalStudentUser;
  courses: Course[];
  assignments: AssignmentItem[];
  calendar: InstitutionalCalendarEvent[];
  scenarios: Scenario[];
  certificates: Certificate[];
  progress: Record<string, { completedLessons: string[]; progressPercent: number }>;
}

const STORAGE_KEY = 'ipt_local_database_state_v1';

/**
 * Obtiene el estado actual de la base de datos local JSON.
 * Carga desde localStorage si existe, o inicializa desde localMockDatabase.json.
 */
export function getLocalDatabase(): LocalDatabaseState {
  if (typeof window === 'undefined') {
    return initialMockDb as unknown as LocalDatabaseState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.courses && parsed.student) {
        return parsed as LocalDatabaseState;
      }
    }
  } catch (err) {
    console.warn('Error leyendo base de datos local de localStorage:', err);
  }

  // Inicializar en localStorage si no existe
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockDb));
  } catch {}

  return initialMockDb as unknown as LocalDatabaseState;
}

/**
 * Guarda cambios en la base de datos local JSON.
 */
export function saveLocalDatabase(updated: Partial<LocalDatabaseState>): LocalDatabaseState {
  const current = getLocalDatabase();
  const next: LocalDatabaseState = {
    ...current,
    ...updated,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Notificar a listeners locales para reactividad instantánea
      window.dispatchEvent(new CustomEvent('ipt-local-db-updated', { detail: next }));
    } catch (err) {
      console.warn('Error guardando en base de datos local:', err);
    }
  }

  return next;
}

/**
 * Actualiza el nombre del estudiante de prueba localmente sin requerir cuenta ni contraseña.
 */
export function setLocalStudentName(name: string): LocalStudentUser {
  const clean = name.trim() || 'Estudiante de Prueba';
  const db = getLocalDatabase();
  const updatedStudent: LocalStudentUser = {
    ...db.student,
    displayName: clean,
    email: `${clean.toLowerCase().replace(/\s+/g, '.')}@ipt.local`,
  };

  saveLocalDatabase({ student: updatedStudent });
  return updatedStudent;
}

/**
 * Restablece la base de datos local a su estado inicial.
 */
export function resetLocalDatabase(): LocalDatabaseState {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockDb));
      window.dispatchEvent(new CustomEvent('ipt-local-db-updated', { detail: initialMockDb }));
    } catch {}
  }
  return initialMockDb as unknown as LocalDatabaseState;
}
