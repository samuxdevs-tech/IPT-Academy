/**
 * Servicio de Clases en Vivo y Gestión de Cupos para Estudiantes (IPT Academy)
 * Conectado con Cloudflare Worker API (D1) y con sincronización en tiempo real vía Firebase.
 */

const API_BASE = process.env.NEXT_PUBLIC_TASK_API_URL || 'https://ipt-course-api.samuxdevs.workers.dev';
const LOCAL_STUDENT_QUOTA_KEY = 'ipt_course_student_quota_v1';
const LOCAL_STUDENT_BOOKINGS_KEY = 'ipt_course_student_bookings_v1';

export interface StudentLiveClassItem {
  id: string;
  course_slug: string;
  course_title: string;
  title: string;
  description: string;
  scheduled_at_utc: string;
  duration_minutes: number;
  max_capacity: number;
  auto_approve: number;
  teacher_name: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  jitsi_room_name: string;
  recording_drive_url?: string | null;
  enrolled_count?: number;
}

export interface StudentBookingInfo {
  bookingId: string;
  status: 'pending_hold' | 'confirmed' | 'attended' | 'noshow' | 'cancelled_refunded' | 'cancelled_penalty' | 'expired_released' | 'rejected_released';
  expiresAtUtc: string;
  classId: string;
  scheduledAtUtc: string;
}

export interface StudentQuotaInfo {
  studentUid: string;
  availableQuota: number;
  ledger: Array<{
    id: string;
    action: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    createdAtUtc: string;
  }>;
}

export class LiveStudentService {
  /**
   * Obtiene las clases disponibles para reservar
   */
  static async fetchAvailableClasses(courseSlug?: string): Promise<StudentLiveClassItem[]> {
    try {
      const params = new URLSearchParams();
      if (courseSlug) params.append('courseSlug', courseSlug);
      params.append('status', 'scheduled');

      const res = await fetch(`${API_BASE}/api/live/classes?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Error fetching classes for student:', err);
    }
    return [];
  }

  /**
   * Consulta el saldo de cupos y el libro mayor del estudiante
   */
  static async getStudentQuota(studentUid: string): Promise<StudentQuotaInfo> {
    try {
      const res = await fetch(`${API_BASE}/api/live/quotas/${studentUid}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          localStorage.setItem(LOCAL_STUDENT_QUOTA_KEY, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Error fetching quota from worker:', err);
    }

    // Fallback de saldo local (por defecto 4 cupos en plan activo)
    const cached = localStorage.getItem(LOCAL_STUDENT_QUOTA_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    return {
      studentUid,
      availableQuota: 4,
      ledger: [],
    };
  }

  /**
   * Solicita la reserva de un cupo en una clase
   */
  static async requestBooking(params: {
    classId: string;
    studentUid: string;
    studentName: string;
    studentEmail: string;
  }): Promise<StudentBookingInfo> {
    const idempotencyKey = `req_${params.studentUid}_${params.classId}_${Date.now()}`;

    try {
      const res = await fetch(`${API_BASE}/api/live/bookings/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: params.classId,
          studentUid: params.studentUid,
          studentName: params.studentName,
          studentEmail: params.studentEmail,
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const booking: StudentBookingInfo = json.data;
          // Guardar localmente
          const current = this.getLocalStudentBookings();
          localStorage.setItem(
            LOCAL_STUDENT_BOOKINGS_KEY,
            JSON.stringify([booking, ...current.filter((b) => b.classId !== params.classId)])
          );
          return booking;
        }
      } else {
        const errJson = await res.json();
        throw new Error(errJson.error || 'No se pudo reservar el cupo');
      }
    } catch (err: any) {
      if (err.message.includes('INSUFFICIENT_QUOTA')) {
        throw new Error('No tienes cupos disponibles en tu plan este mes.');
      }
      if (err.message.includes('CAPACITY_FULL')) {
        throw new Error('Esta clase ya alcanzó su aforo máximo de estudiantes.');
      }
      if (err.message.includes('RESERVATION_CLOSED_WINDOW')) {
        throw new Error('Las reservas cierran 30 minutos antes del inicio de la clase.');
      }

      // Modo offline o fallback
      const fallbackBooking: StudentBookingInfo = {
        bookingId: `bkg_local_${Date.now()}`,
        status: 'pending_hold',
        expiresAtUtc: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        classId: params.classId,
        scheduledAtUtc: new Date().toISOString(),
      };
      return fallbackBooking;
    }

    throw new Error('No se pudo procesar la solicitud');
  }

  /**
   * Cancela una reserva aplicando la regla de las 2 horas
   */
  static async cancelBooking(bookingId: string, studentUid: string): Promise<{ refund: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/live/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUid,
          reason: 'Cancelación voluntaria por el estudiante',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          refund: json.data?.refund ?? true,
          message: json.data?.message || 'Reserva cancelada.',
        };
      }
    } catch (err) {
      console.warn('Error cancelando reserva:', err);
    }

    return {
      refund: true,
      message: 'Reserva cancelada con éxito.',
    };
  }

  static getLocalStudentBookings(): StudentBookingInfo[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STUDENT_BOOKINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
