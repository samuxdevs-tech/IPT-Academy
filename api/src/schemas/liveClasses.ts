import { z } from 'zod';

// Esquema para creación de clases en vivo por parte del docente
export const CreateLiveClassSchema = z.object({
  courseSlug: z.string().min(1, 'El slug del curso es obligatorio'),
  courseTitle: z.string().min(1, 'El título del curso es obligatorio'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional().default(''),
  scheduledAtUtc: z.string().datetime({ message: 'scheduledAtUtc debe ser una fecha ISO-8601 válida en UTC' }),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  maxCapacity: z.number().int().min(1).max(100).default(15),
  autoApprove: z.boolean().default(false),
  teacherUid: z.string().min(1, 'El UID del docente es obligatorio'),
  teacherName: z.string().min(1, 'El nombre del docente es obligatorio'),
  teacherEmail: z.string().email('El correo del docente no es válido'),
});

export type CreateLiveClassInput = z.infer<typeof CreateLiveClassSchema>;

// Esquema para solicitud de reserva de cupo por el estudiante
export const RequestBookingSchema = z.object({
  classId: z.string().min(1, 'El ID de la clase es obligatorio'),
  studentUid: z.string().min(1, 'El UID del estudiante es obligatorio'),
  studentName: z.string().min(1, 'El nombre del estudiante es obligatorio'),
  studentEmail: z.string().email('El correo del estudiante no es válido'),
  idempotencyKey: z.string().min(8, 'Se requiere una clave de idempotencia única'),
});

export type RequestBookingInput = z.infer<typeof RequestBookingSchema>;

// Esquema para aprobación por el docente
export const ApproveBookingSchema = z.object({
  teacherUid: z.string().min(1, 'El UID del docente es obligatorio para autorizar la aprobación'),
});

// Esquema para rechazo por el docente
export const RejectBookingSchema = z.object({
  teacherUid: z.string().min(1, 'El UID del docente es obligatorio para autorizar el rechazo'),
  reason: z.string().optional().default('Horario no disponible o sobrecupo'),
});

// Esquema para cancelación por el estudiante
export const CancelBookingSchema = z.object({
  studentUid: z.string().min(1, 'El UID del estudiante es obligatorio para autorizar la cancelación'),
  reason: z.string().optional().default('Cancelación voluntaria por el estudiante'),
});

// Esquema para asignación de cupos mensuales (Planes de pago)
export const GrantQuotaSchema = z.object({
  studentUid: z.string().min(1, 'El UID del estudiante es obligatorio'),
  amount: z.number().int().min(1, 'La cantidad de cupos debe ser mayor a 0'),
  reason: z.string().min(3, 'El motivo de asignación es obligatorio'),
  idempotencyKey: z.string().min(8, 'Se requiere clave de idempotencia'),
});

export type GrantQuotaInput = z.infer<typeof GrantQuotaSchema>;

// Tipos de estados
export type LiveClassStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingStatus =
  | 'pending_hold'
  | 'confirmed'
  | 'attended'
  | 'noshow'
  | 'cancelled_refunded'
  | 'cancelled_penalty'
  | 'expired_released'
  | 'rejected_released';

export type LedgerAction =
  | 'GRANT_MONTHLY'
  | 'HOLD_RESERVATION'
  | 'COMMIT_CONFIRMED'
  | 'CONSUME_ATTENDED'
  | 'CONSUME_NOSHOW'
  | 'RELEASE_EXPIRED'
  | 'RELEASE_REJECTED'
  | 'REFUND_CANCELLED'
  | 'ADMIN_ADJUST';
