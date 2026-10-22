import { LedgerAction } from '../schemas/liveClasses';

export interface LedgerRecord {
  id: string;
  studentUid: string;
  bookingId?: string | null;
  action: LedgerAction;
  delta: number;
  balanceAfter: number;
  reason: string;
  idempotencyKey?: string | null;
  createdAtUtc: string;
}

/**
 * Calcula la expiración dinámica del TTL de reserva
 * Regla de Oro del Senior: min(requestedAt + 4h, scheduledAt - 30m)
 */
export function calculateDynamicExpiresAt(requestedAt: Date, scheduledAt: Date): string {
  const diffToClassMs = scheduledAt.getTime() - requestedAt.getTime();
  const thirtyMinutesMs = 30 * 60 * 1000;

  if (diffToClassMs < thirtyMinutesMs) {
    throw new Error('RESERVATION_CLOSED_WINDOW: No se permiten solicitudes con menos de 30 minutos de antelación a la clase.');
  }

  const fourHoursMs = 4 * 60 * 60 * 1000;
  const fourHoursLater = new Date(requestedAt.getTime() + fourHoursMs);
  const thirtyMinBeforeClass = new Date(scheduledAt.getTime() - thirtyMinutesMs);

  // min(fourHoursLater, thirtyMinBeforeClass)
  const effectiveExpiresAt = fourHoursLater.getTime() < thirtyMinBeforeClass.getTime()
    ? fourHoursLater
    : thirtyMinBeforeClass;

  return effectiveExpiresAt.toISOString();
}

/**
 * Evalúa con precisión matemática el límite de cancelación (Regla de las 2 horas)
 * > 2h (7200000 ms)  => Reembolso con devolución de cupo (+1)
 * <= 2h              => Penalización por cancelación tardía (cupo consumido)
 */
export function evaluateCancellationPolicy(now: Date, scheduledAt: Date): { refund: boolean; reason: string } {
  const diffMs = scheduledAt.getTime() - now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (diffMs > twoHoursMs) {
    return {
      refund: true,
      reason: 'Cancelación con más de 2 horas de anticipación: Cupo devuelto al balance del estudiante.',
    };
  }

  return {
    refund: false,
    reason: 'Cancelación dentro de las 2 horas previas a la clase: Cupo consumido sin reembolso.',
  };
}

export class QuotaLedgerService {
  /**
   * Obtiene el saldo disponible real del estudiante mediante la suma algebraica del libro mayor (Ledger)
   */
  static async getCurrentBalance(db: any, studentUid: string): Promise<number> {
    const row = await db.prepare(
      'SELECT COALESCE(SUM(delta), 0) AS balance FROM quota_ledger WHERE student_uid = ?'
    ).bind(studentUid).first();

    return row && typeof row.balance === 'number' ? row.balance : 0;
  }

  /**
   * Registra una recarga o asignación inicial de cupos mensuales
   */
  static async grantQuota(
    db: any,
    params: { studentUid: string; amount: number; reason: string; idempotencyKey: string }
  ): Promise<number> {
    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    const newBalance = currentBalance + params.amount;
    const nowIso = new Date().toISOString();
    const id = `qld_${crypto.randomUUID()}`;

    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      null,
      'GRANT_MONTHLY',
      params.amount,
      newBalance,
      params.reason,
      params.idempotencyKey,
      nowIso
    ).run();

    return newBalance;
  }

  /**
   * Retiene preventivamente un cupo al solicitar la reserva (-1)
   */
  static async holdQuota(
    db: any,
    params: { studentUid: string; bookingId: string; idempotencyKey: string }
  ): Promise<number> {
    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    if (currentBalance <= 0) {
      throw new Error('INSUFFICIENT_QUOTA: El estudiante no cuenta con cupos disponibles en su plan.');
    }

    const newBalance = currentBalance - 1;
    const nowIso = new Date().toISOString();
    const id = `qld_${crypto.randomUUID()}`;

    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      params.bookingId,
      'HOLD_RESERVATION',
      -1,
      newBalance,
      'Retención temporal de cupo por solicitud de reserva',
      params.idempotencyKey,
      nowIso
    ).run();

    return newBalance;
  }

  /**
   * Asienta contablemente la confirmación de la reserva.
   * RESUELVE LA OBJECIÓN DEL SENIOR: El cupo ya fue descontado en HOLD (-1).
   * Al confirmarse, el delta es 0, impidiendo que el cupo vuelva a aparecer en el saldo disponible.
   */
  static async commitConfirmed(
    db: any,
    params: { studentUid: string; bookingId: string; teacherUid: string }
  ): Promise<number> {
    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    const nowIso = new Date().toISOString();
    const id = `qld_${crypto.randomUUID()}`;

    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      params.bookingId,
      'COMMIT_CONFIRMED',
      0,
      currentBalance,
      `Reserva confirmada por el docente (${params.teacherUid})`,
      null,
      nowIso
    ).run();

    return currentBalance;
  }

  /**
   * Libera un cupo retenido devolviéndolo al saldo (+1)
   */
  static async releaseQuota(
    db: any,
    params: {
      studentUid: string;
      bookingId: string;
      action: 'RELEASE_EXPIRED' | 'RELEASE_REJECTED' | 'REFUND_CANCELLED';
      reason: string;
    }
  ): Promise<number> {
    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    const newBalance = currentBalance + 1;
    const nowIso = new Date().toISOString();
    const id = `qld_${crypto.randomUUID()}`;

    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      params.bookingId,
      params.action,
      1,
      newBalance,
      params.reason,
      null,
      nowIso
    ).run();

    return newBalance;
  }

  /**
   * Asienta el consumo definitivo por asistencia o por inasistencia (No-Show)
   */
  static async settleConsumption(
    db: any,
    params: {
      studentUid: string;
      bookingId: string;
      action: 'CONSUME_ATTENDED' | 'CONSUME_NOSHOW';
      reason: string;
    }
  ): Promise<number> {
    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    const nowIso = new Date().toISOString();
    const id = `qld_${crypto.randomUUID()}`;

    // Delta 0 porque ya fue descontado en HOLD
    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      params.bookingId,
      params.action,
      0,
      currentBalance,
      params.reason,
      null,
      nowIso
    ).run();

    return currentBalance;
  }

  /**
   * Obtiene el historial inmutable de movimientos de un estudiante para auditoría
   */
  static async getStudentLedger(db: any, studentUid: string): Promise<LedgerRecord[]> {
    const result = await db.prepare(
      `SELECT id, student_uid as studentUid, booking_id as bookingId, action, delta,
              balance_after as balanceAfter, reason, idempotency_key as idempotencyKey,
              created_at_utc as createdAtUtc
       FROM quota_ledger
       WHERE student_uid = ?
       ORDER BY created_at_utc DESC`
    ).bind(studentUid).all();

    return result.results || [];
  }

  /**
   * Devolución o ajuste manual de cupos ejecutado EXCLUSIVAMENTE por un humano autorizado.
   * La IA (TutorIA) tiene PROHIBIDO invocar este método.
   */
  static async manualAdminRefund(
    db: any,
    params: {
      studentUid: string;
      amount: number;
      reason: string;
      authorizedByAdminUid: string;
      idempotencyKey: string;
      bookingId?: string;
    }
  ): Promise<{ newBalance: number; transactionId: string }> {
    const callerId = params.authorizedByAdminUid.toLowerCase();
    if (!params.authorizedByAdminUid || callerId.includes('ai') || callerId.includes('bot') || callerId.includes('tutoria')) {
      throw new Error('HUMAN_AUTHORIZATION_REQUIRED: Solo un docente o administrador humano verificado puede autorizar la devolución de cupos.');
    }

    const currentBalance = await this.getCurrentBalance(db, params.studentUid);
    const newBalance = currentBalance + params.amount;
    const nowIso = new Date().toISOString();
    const id = `qld_human_${crypto.randomUUID()}`;

    await db.prepare(
      `INSERT INTO quota_ledger (id, student_uid, booking_id, action, delta, balance_after, reason, idempotency_key, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      params.studentUid,
      params.bookingId || null,
      'ADMIN_ADJUST',
      params.amount,
      newBalance,
      `[Devolución Manual Autorizada por Humano - Admin ${params.authorizedByAdminUid}]: ${params.reason}`,
      params.idempotencyKey,
      nowIso
    ).run();

    return { newBalance, transactionId: id };
  }
}
