/**
 * Servicio de Clases en Vivo y Gestión de Reservas para Docentes (IPT Course)
 * Conectado con Cloudflare Worker API (D1) y con sincronización local de contingencia.
 */

const API_BASE = process.env.NEXT_PUBLIC_TASK_API_URL || 'https://ipt-course-api.samuxdevs.workers.dev';
const LOCAL_LIVE_CLASSES_KEY = 'ipt_course_live_classes_cache_v1';
const LOCAL_BOOKINGS_KEY = 'ipt_course_bookings_cache_v1';

export interface LiveClassItem {
  id: string;
  course_slug: string;
  course_title: string;
  title: string;
  description: string;
  scheduled_at_utc: string;
  duration_minutes: number;
  max_capacity: number;
  auto_approve: number; // 0: manual, 1: auto
  teacher_uid: string;
  teacher_name: string;
  teacher_email: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  jitsi_room_name: string;
  recording_drive_url?: string | null;
  started_at_utc?: string | null;
  ended_at_utc?: string | null;
  created_at_utc: string;
  enrolled_count?: number;
}

export interface ClassBookingItem {
  id: string;
  class_id: string;
  student_uid: string;
  student_name: string;
  student_email: string;
  status:
    | 'pending_hold'
    | 'confirmed'
    | 'attended'
    | 'noshow'
    | 'cancelled_refunded'
    | 'cancelled_penalty'
    | 'expired_released'
    | 'rejected_released';
  expires_at_utc: string;
  attended: number;
  attendance_minutes: number;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface CreateLiveClassPayload {
  courseSlug: string;
  courseTitle: string;
  title: string;
  description?: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  maxCapacity: number;
  autoApprove: boolean;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
}

// Helpers locales para persistencia offline transparente
function getLocalClasses(): LiveClassItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LIVE_CLASSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalClasses(classes: LiveClassItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_LIVE_CLASSES_KEY, JSON.stringify(classes));
  } catch (err) {
    console.warn('Error guardando clases en local:', err);
  }
}

function getLocalBookings(): ClassBookingItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBookings(bookings: ClassBookingItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.warn('Error guardando bookings en local:', err);
  }
}

export class LiveClassesService {
  /**
   * Obtiene la lista de clases en vivo desde la API centralizada
   */
  static async fetchClasses(courseSlug?: string, teacherUid?: string): Promise<LiveClassItem[]> {
    try {
      const params = new URLSearchParams();
      if (courseSlug) params.append('courseSlug', courseSlug);
      if (teacherUid) params.append('teacherUid', teacherUid);

      const res = await fetch(`${API_BASE}/api/live/classes?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          saveLocalClasses(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Fallo conectando a Worker API, usando cache local de clases:', err);
    }
    return getLocalClasses();
  }

  /**
   * Obtiene una clase con sus reservas activas
   */
  static async fetchClassDetails(classId: string): Promise<{ classItem: LiveClassItem; bookings: ClassBookingItem[] } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/live/classes/${classId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { bookings, ...classItem } = json.data;
          return { classItem, bookings: bookings || [] };
        }
      }
    } catch (err) {
      console.warn('Error fetching class details from worker:', err);
    }

    const localClass = getLocalClasses().find((c) => c.id === classId);
    if (localClass) {
      const localBookings = getLocalBookings().filter((b) => b.class_id === classId);
      return { classItem: localClass, bookings: localBookings };
    }

    return null;
  }

  /**
   * Crea una nueva clase en vivo programada
   */
  static async createClass(payload: CreateLiveClassPayload): Promise<LiveClassItem> {
    try {
      const res = await fetch(`${API_BASE}/api/live/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const fullClass: LiveClassItem = {
            id: json.data.id,
            course_slug: payload.courseSlug,
            course_title: payload.courseTitle,
            title: payload.title,
            description: payload.description || '',
            scheduled_at_utc: payload.scheduledAtUtc,
            duration_minutes: payload.durationMinutes,
            max_capacity: payload.maxCapacity,
            auto_approve: payload.autoApprove ? 1 : 0,
            teacher_uid: payload.teacherUid,
            teacher_name: payload.teacherName,
            teacher_email: payload.teacherEmail,
            status: 'scheduled',
            jitsi_room_name: json.data.jitsiRoomName,
            created_at_utc: new Date().toISOString(),
            enrolled_count: 0,
          };

          const current = getLocalClasses();
          saveLocalClasses([fullClass, ...current]);
          return fullClass;
        }
      } else {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al crear la clase');
      }
    } catch (err: any) {
      // Fallback local para desarrollo o modo offline
      const fallbackClass: LiveClassItem = {
        id: `cls_${Date.now()}`,
        course_slug: payload.courseSlug,
        course_title: payload.courseTitle,
        title: payload.title,
        description: payload.description || '',
        scheduled_at_utc: payload.scheduledAtUtc,
        duration_minutes: payload.durationMinutes,
        max_capacity: payload.maxCapacity,
        auto_approve: payload.autoApprove ? 1 : 0,
        teacher_uid: payload.teacherUid,
        teacher_name: payload.teacherName,
        teacher_email: payload.teacherEmail,
        status: 'scheduled',
        jitsi_room_name: `ipt-live-${Date.now().toString(36)}`,
        created_at_utc: new Date().toISOString(),
        enrolled_count: 0,
      };

      const current = getLocalClasses();
      saveLocalClasses([fallbackClass, ...current]);
      return fallbackClass;
    }
    throw new Error('No se pudo crear la clase');
  }

  /**
   * El docente aprueba una reserva pendiente
   */
  static async approveBooking(bookingId: string, teacherUid: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/live/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid }),
      });

      if (res.ok) {
        const json = await res.json();
        return !!json.success;
      }
    } catch (err) {
      console.warn('Error aprobando reserva en worker:', err);
    }

    // Actualización local en caso de offline
    const bookings = getLocalBookings();
    const updated = bookings.map((b) =>
      b.id === bookingId ? { ...b, status: 'confirmed' as const, updated_at_utc: new Date().toISOString() } : b
    );
    saveLocalBookings(updated);
    return true;
  }

  /**
   * El docente rechaza una reserva pendiente y libera el cupo de inmediato
   */
  static async rejectBooking(bookingId: string, teacherUid: string, reason?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/live/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid, reason: reason || 'Horario no disponible' }),
      });

      if (res.ok) {
        const json = await res.json();
        return !!json.success;
      }
    } catch (err) {
      console.warn('Error rechazando reserva en worker:', err);
    }

    // Actualización local
    const bookings = getLocalBookings();
    const updated = bookings.map((b) =>
      b.id === bookingId ? { ...b, status: 'rejected_released' as const, updated_at_utc: new Date().toISOString() } : b
    );
    saveLocalBookings(updated);
    return true;
  }

  /**
   * Ejecuta el barrido de reservas expiradas por TTL de 4 horas
   */
  static async sweepExpiredBookings(): Promise<number> {
    try {
      const res = await fetch(`${API_BASE}/api/live/bookings/sweep-expired`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        return json.data?.sweptCount || 0;
      }
    } catch (err) {
      console.warn('Error sweeping expired bookings:', err);
    }
    return 0;
  }

  /**
   * Devolución manual de cupos autorizada EXCLUSIVAMENTE por un humano
   */
  static async manualRefund(params: {
    studentUid: string;
    amount: number;
    reason: string;
    authorizedByAdminUid: string;
  }): Promise<{ success: boolean; message: string; newBalance: number }> {
    const idempotencyKey = `ref_manual_${Date.now()}_${params.studentUid}`;
    try {
      const res = await fetch(`${API_BASE}/api/live/quotas/manual-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          message: json.message || 'Cupos devueltos con éxito.',
          newBalance: json.data?.newBalance || 0,
        };
      } else {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al autorizar la devolución manual.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Error de conexión.');
    }
  }
}
