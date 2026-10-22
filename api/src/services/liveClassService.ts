import {
  CreateLiveClassInput,
  RequestBookingInput,
} from '../schemas/liveClasses';
import {
  QuotaLedgerService,
  calculateDynamicExpiresAt,
  evaluateCancellationPolicy,
} from './quotaLedgerService';

export class LiveClassService {
  /**
   * Crea una nueva clase en vivo programada por el docente
   */
  static async createLiveClass(db: any, input: CreateLiveClassInput) {
    const scheduledAt = new Date(input.scheduledAtUtc);
    const now = new Date();

    if (scheduledAt.getTime() <= now.getTime()) {
      throw new Error('INVALID_SCHEDULE_DATE: La fecha programada debe estar en el futuro.');
    }

    const classId = `cls_${crypto.randomUUID()}`;
    const jitsiRoomName = `ipt-live-${crypto.randomUUID().slice(0, 13)}`;
    const nowIso = now.toISOString();

    await db.prepare(
      `INSERT INTO live_classes (
        id, course_slug, course_title, title, description,
        scheduled_at_utc, duration_minutes, max_capacity, auto_approve,
        teacher_uid, teacher_name, teacher_email, status,
        jitsi_room_name, created_at_utc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`
    ).bind(
      classId,
      input.courseSlug,
      input.courseTitle,
      input.title,
      input.description || '',
      input.scheduledAtUtc,
      input.durationMinutes,
      input.maxCapacity,
      input.autoApprove ? 1 : 0,
      input.teacherUid,
      input.teacherName,
      input.teacherEmail,
      jitsiRoomName,
      nowIso
    ).run();

    return {
      id: classId,
      jitsiRoomName,
      scheduledAtUtc: input.scheduledAtUtc,
      maxCapacity: input.maxCapacity,
      autoApprove: input.autoApprove,
    };
  }

  /**
   * Procesa la solicitud de reserva del estudiante aplicando:
   * 1. Verificación de aforo
   * 2. Deducción preventiva en el Ledger de cupos
   * 3. TTL dinámico: min(now + 4h, scheduledAt - 30m)
   * 4. Auto-aprobación si la clase lo tiene configurado
   */
  static async requestBooking(db: any, input: RequestBookingInput) {
    const liveClass = await db.prepare(
      'SELECT * FROM live_classes WHERE id = ?'
    ).bind(input.classId).first();

    if (!liveClass) {
      throw new Error('CLASS_NOT_FOUND: La clase en vivo especificada no existe.');
    }

    if (liveClass.status !== 'scheduled') {
      throw new Error(`CLASS_NOT_AVAILABLE: La clase está en estado ${liveClass.status} y no admite reservas.`);
    }

    // Verificar si el estudiante ya tiene una reserva activa
    const existingBooking = await db.prepare(
      `SELECT * FROM class_bookings 
       WHERE class_id = ? AND student_uid = ? AND status IN ('pending_hold', 'confirmed')`
    ).bind(input.classId, input.studentUid).first();

    if (existingBooking) {
      throw new Error('ALREADY_BOOKED: El estudiante ya cuenta con una reserva activa para esta clase.');
    }

    // Verificar aforo actual
    const activeCountRow = await db.prepare(
      `SELECT COUNT(*) as count FROM class_bookings 
       WHERE class_id = ? AND status IN ('pending_hold', 'confirmed')`
    ).bind(input.classId).first();

    const activeCount = activeCountRow && typeof activeCountRow.count === 'number' ? activeCountRow.count : 0;
    if (activeCount >= liveClass.max_capacity) {
      throw new Error('CAPACITY_FULL: La clase ha alcanzado el aforo máximo de estudiantes.');
    }

    const now = new Date();
    const scheduledAt = new Date(liveClass.scheduled_at_utc);
    const expiresAtUtc = calculateDynamicExpiresAt(now, scheduledAt);

    const bookingId = `bkg_${crypto.randomUUID()}`;
    const isAutoApprove = liveClass.auto_approve === 1;
    const initialStatus = isAutoApprove ? 'confirmed' : 'pending_hold';
    const nowIso = now.toISOString();

    // 1. Retención contable en el Ledger (-1)
    await QuotaLedgerService.holdQuota(db, {
      studentUid: input.studentUid,
      bookingId,
      idempotencyKey: input.idempotencyKey,
    });

    // 2. Si es auto-aprobada, registrar commit inmediato
    if (isAutoApprove) {
      await QuotaLedgerService.commitConfirmed(db, {
        studentUid: input.studentUid,
        bookingId,
        teacherUid: liveClass.teacher_uid,
      });
    }

    // 3. Insertar reserva
    await db.prepare(
      `INSERT INTO class_bookings (
        id, class_id, student_uid, student_name, student_email,
        status, expires_at_utc, created_at_utc, updated_at_utc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      bookingId,
      input.classId,
      input.studentUid,
      input.studentName,
      input.studentEmail,
      initialStatus,
      expiresAtUtc,
      nowIso,
      nowIso
    ).run();

    return {
      bookingId,
      status: initialStatus,
      expiresAtUtc,
      classId: input.classId,
      scheduledAtUtc: liveClass.scheduled_at_utc,
    };
  }

  /**
   * El docente aprueba una reserva pendiente
   */
  static async approveBooking(db: any, bookingId: string, teacherUid: string) {
    const booking = await db.prepare(
      `SELECT b.*, c.teacher_uid, c.status as class_status 
       FROM class_bookings b
       JOIN live_classes c ON b.class_id = c.id
       WHERE b.id = ?`
    ).bind(bookingId).first();

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND: Reserva no encontrada.');
    }

    if (booking.teacher_uid !== teacherUid) {
      throw new Error('UNAUTHORIZED_TEACHER: Solo el docente titular puede aprobar esta reserva.');
    }

    if (booking.status !== 'pending_hold') {
      throw new Error(`INVALID_TRANSITION: La reserva está en estado ${booking.status} y no puede ser aprobada.`);
    }

    // Verificar si expiró el TTL antes de que el docente pulsara aprobar
    const now = new Date();
    if (new Date(booking.expires_at_utc).getTime() <= now.getTime()) {
      throw new Error('BOOKING_EXPIRED: El tiempo límite (TTL) para aprobar esta reserva ha expirado.');
    }

    const nowIso = now.toISOString();

    // Actualizar estado a confirmada
    await db.prepare(
      `UPDATE class_bookings SET status = 'confirmed', updated_at_utc = ? WHERE id = ?`
    ).bind(nowIso, bookingId).run();

    // Asentar confirmación en el Ledger (Delta 0, retención blindada)
    await QuotaLedgerService.commitConfirmed(db, {
      studentUid: booking.student_uid,
      bookingId,
      teacherUid,
    });

    return { success: true, bookingId, status: 'confirmed' };
  }

  /**
   * El docente rechaza una reserva pendiente y libera el cupo de inmediato (+1)
   */
  static async rejectBooking(db: any, bookingId: string, teacherUid: string, reason: string) {
    const booking = await db.prepare(
      `SELECT b.*, c.teacher_uid 
       FROM class_bookings b
       JOIN live_classes c ON b.class_id = c.id
       WHERE b.id = ?`
    ).bind(bookingId).first();

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND: Reserva no encontrada.');
    }

    if (booking.teacher_uid !== teacherUid) {
      throw new Error('UNAUTHORIZED_TEACHER: Solo el docente titular puede rechazar esta reserva.');
    }

    if (booking.status !== 'pending_hold') {
      throw new Error(`INVALID_TRANSITION: La reserva está en estado ${booking.status} y no puede ser rechazada.`);
    }

    const nowIso = new Date().toISOString();

    // Actualizar estado a rechazada
    await db.prepare(
      `UPDATE class_bookings SET status = 'rejected_released', updated_at_utc = ? WHERE id = ?`
    ).bind(nowIso, bookingId).run();

    // Reembolsar cupo en Ledger (+1)
    await QuotaLedgerService.releaseQuota(db, {
      studentUid: booking.student_uid,
      bookingId,
      action: 'RELEASE_REJECTED',
      reason: `Reserva rechazada por el docente: ${reason}`,
    });

    return { success: true, bookingId, status: 'rejected_released' };
  }

  /**
   * El estudiante cancela su reserva aplicando la Regla de las 2 Horas
   */
  static async cancelBooking(db: any, bookingId: string, studentUid: string, reason: string) {
    const booking = await db.prepare(
      `SELECT b.*, c.scheduled_at_utc, c.status as class_status
       FROM class_bookings b
       JOIN live_classes c ON b.class_id = c.id
       WHERE b.id = ?`
    ).bind(bookingId).first();

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND: Reserva no encontrada.');
    }

    if (booking.student_uid !== studentUid) {
      throw new Error('UNAUTHORIZED_STUDENT: No tienes permiso para cancelar esta reserva.');
    }

    if (!['pending_hold', 'confirmed'].includes(booking.status)) {
      throw new Error(`INVALID_TRANSITION: No se puede cancelar una reserva con estado ${booking.status}.`);
    }

    const now = new Date();
    const scheduledAt = new Date(booking.scheduled_at_utc);
    const policy = evaluateCancellationPolicy(now, scheduledAt);
    const nowIso = now.toISOString();

    if (policy.refund) {
      // Cancelación con reembolso (+1 en Ledger)
      await db.prepare(
        `UPDATE class_bookings SET status = 'cancelled_refunded', updated_at_utc = ? WHERE id = ?`
      ).bind(nowIso, bookingId).run();

      await QuotaLedgerService.releaseQuota(db, {
        studentUid,
        bookingId,
        action: 'REFUND_CANCELLED',
        reason: `${reason} (${policy.reason})`,
      });

      return { success: true, status: 'cancelled_refunded', refund: true, message: policy.reason };
    } else {
      // Cancelación tardía (penalización, cupo consumido sin reembolso)
      await db.prepare(
        `UPDATE class_bookings SET status = 'cancelled_penalty', updated_at_utc = ? WHERE id = ?`
      ).bind(nowIso, bookingId).run();

      return { success: true, status: 'cancelled_penalty', refund: false, message: policy.reason };
    }
  }

  /**
   * Tarea periódica de limpieza de TTLs vencidos
   */
  static async sweepExpiredHolds(db: any) {
    const nowIso = new Date().toISOString();

    const expiredBookingsResult = await db.prepare(
      `SELECT id, student_uid, expires_at_utc 
       FROM class_bookings 
       WHERE status = 'pending_hold' AND expires_at_utc <= ?`
    ).bind(nowIso).all();

    const expiredList = expiredBookingsResult.results || [];
    let sweptCount = 0;

    for (const b of expiredList) {
      // Transicionar a expirada
      await db.prepare(
        `UPDATE class_bookings SET status = 'expired_released', updated_at_utc = ? WHERE id = ?`
      ).bind(nowIso, b.id).run();

      // Devolver cupo en el ledger (+1)
      await QuotaLedgerService.releaseQuota(db, {
        studentUid: b.student_uid,
        bookingId: b.id,
        action: 'RELEASE_EXPIRED',
        reason: 'TTL de 4 horas vencido sin respuesta del docente: cupo liberado automáticamente.',
      });

      sweptCount++;
    }

    return { sweptCount, timestamp: nowIso };
  }
}
