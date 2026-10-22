import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDynamicExpiresAt,
  evaluateCancellationPolicy,
  QuotaLedgerService,
} from '../services/quotaLedgerService';

// Mock en memoria de D1Database para pruebas unitarias de aislamiento
class MockD1Database {
  rows: any[] = [];

  prepare(sql: string) {
    const self = this;
    let boundParams: any[] = [];

    return {
      bind(...params: any[]) {
        boundParams = params;
        return this;
      },
      async first() {
        if (sql.includes('SELECT COALESCE(SUM(delta), 0) AS balance')) {
          const studentUid = boundParams[0];
          const sum = self.rows
            .filter((r) => r.student_uid === studentUid)
            .reduce((acc, r) => acc + r.delta, 0);
          return { balance: sum };
        }
        return null;
      },
      async all() {
        if (sql.includes('FROM quota_ledger')) {
          const studentUid = boundParams[0];
          const results = self.rows
            .filter((r) => r.student_uid === studentUid)
            .map((r) => ({
              id: r.id,
              studentUid: r.student_uid,
              bookingId: r.booking_id,
              action: r.action,
              delta: r.delta,
              balanceAfter: r.balance_after,
              reason: r.reason,
              idempotencyKey: r.idempotency_key,
              createdAtUtc: r.created_at_utc,
            }));
          return { results };
        }
        return { results: [] };
      },
      async run() {
        if (sql.includes('INSERT INTO quota_ledger')) {
          const [
            id,
            student_uid,
            booking_id,
            action,
            delta,
            balance_after,
            reason,
            idempotency_key,
            created_at_utc,
          ] = boundParams;

          self.rows.push({
            id,
            student_uid,
            booking_id,
            action,
            delta,
            balance_after,
            reason,
            idempotency_key,
            created_at_utc,
          });
          return { success: true };
        }
        return { success: true };
      },
    };
  }
}

test('1. TTL Dinámico: Respeta la regla de min(now + 4h, scheduledAt - 30m)', () => {
  const now = new Date('2026-10-22T10:00:00.000Z');

  // Caso A: Clase programada para mañana (a 24 horas de distancia)
  // El TTL debe ser exactamente 4 horas después de la solicitud
  const classFarAway = new Date('2026-10-23T10:00:00.000Z');
  const expiresA = calculateDynamicExpiresAt(now, classFarAway);
  assert.equal(expiresA, '2026-10-22T14:00:00.000Z');

  // Caso B: Clase programada dentro de 2 horas (a las 12:00)
  // min(10:00 + 4h = 14:00, 12:00 - 30m = 11:30) => Debe expirar a las 11:30 UTC
  const classClose = new Date('2026-10-22T12:00:00.000Z');
  const expiresB = calculateDynamicExpiresAt(now, classClose);
  assert.equal(expiresB, '2026-10-22T11:30:00.000Z');

  // Caso C: Clase programada dentro de 20 minutos (ventana cerrada)
  // Debe arrojar error impidiendo reservas en el limbo
  const classTooClose = new Date('2026-10-22T10:20:00.000Z');
  assert.throws(
    () => calculateDynamicExpiresAt(now, classTooClose),
    /RESERVATION_CLOSED_WINDOW/
  );
});

test('2. Política de Cancelación: Frontera exacta de 2 horas (Regla matemática del Senior)', () => {
  const scheduledAt = new Date('2026-10-22T18:00:00.000Z');

  // Caso A: 2 horas y 1 segundo antes (7,201,000 ms) => Reembolso
  const cancelEarly = new Date(scheduledAt.getTime() - 7201000);
  const resEarly = evaluateCancellationPolicy(cancelEarly, scheduledAt);
  assert.equal(resEarly.refund, true);

  // Caso B: Exactamente 2 horas antes (7,200,000 ms) => Sin reembolso
  const cancelExact = new Date(scheduledAt.getTime() - 7200000);
  const resExact = evaluateCancellationPolicy(cancelExact, scheduledAt);
  assert.equal(resExact.refund, false);

  // Caso C: 1 hora y 59 minutos antes (tardío) => Sin reembolso
  const cancelLate = new Date(scheduledAt.getTime() - 3600000);
  const resLate = evaluateCancellationPolicy(cancelLate, scheduledAt);
  assert.equal(resLate.refund, false);
});

test('3. Resolución del Fallo Contable del Senior: Transición de HOLD a CONFIRMADO no duplica cupos', async () => {
  const db = new MockD1Database();
  const studentUid = 'student_test_123';

  // 1. Asignar 4 cupos mensuales
  const initialBalance = await QuotaLedgerService.grantQuota(db, {
    studentUid,
    amount: 4,
    reason: 'Asignación mensual Plan Pro',
    idempotencyKey: 'grant_october_001',
  });
  assert.equal(initialBalance, 4);

  // 2. Alumno solicita reserva => Se retiene preventivamente 1 cupo (-1)
  const balanceAfterHold = await QuotaLedgerService.holdQuota(db, {
    studentUid,
    bookingId: 'bkg_001',
    idempotencyKey: 'hold_bkg_001',
  });
  assert.equal(balanceAfterHold, 3, 'El balance debe ser 3 tras retener el cupo');

  // 3. El docente aprueba la reserva (COMMIT_CONFIRMED)
  // AQUÍ ESTABA LA FUGA: El senior detectó que si no se modela bien, vuelve a aparecer como disponible.
  // Con el Ledger, delta es 0 y el balance disponible sigue siendo exactamente 3:
  const balanceAfterCommit = await QuotaLedgerService.commitConfirmed(db, {
    studentUid,
    bookingId: 'bkg_001',
    teacherUid: 'teacher_ivan_01',
  });
  assert.equal(balanceAfterCommit, 3, 'El balance disponible DEBE mantenerse en 3 (blindado contra fugas)');

  // 4. Verificar saldo acumulado total desde la base de datos
  const totalBalance = await QuotaLedgerService.getCurrentBalance(db, studentUid);
  assert.equal(totalBalance, 3, 'La suma algebraica inmutable del Ledger da 3');

  // 5. Si la clase se cancela a tiempo con reembolso, sube a 4
  const balanceAfterRefund = await QuotaLedgerService.releaseQuota(db, {
    studentUid,
    bookingId: 'bkg_001',
    action: 'REFUND_CANCELLED',
    reason: 'Cancelación con más de 2 horas',
  });
  assert.equal(balanceAfterRefund, 4, 'El balance vuelve a 4 tras el reembolso válido');
});

test('4. Protección de Saldo Insuficiente en el Ledger', async () => {
  const db = new MockD1Database();
  const studentUid = 'student_broke_456';

  // Alumno sin saldo intenta retener cupo
  await assert.rejects(
    async () => {
      await QuotaLedgerService.holdQuota(db, {
        studentUid,
        bookingId: 'bkg_illegal',
        idempotencyKey: 'idemp_illegal',
      });
    },
    /INSUFFICIENT_QUOTA/
  );
});

test('5. Integridad del Historial de Auditoría (Ledger Statement)', async () => {
  const db = new MockD1Database();
  const studentUid = 'student_audit_789';

  await QuotaLedgerService.grantQuota(db, {
    studentUid,
    amount: 8,
    reason: 'Plan Semestral',
    idempotencyKey: 'grant_semestral_01',
  });

  await QuotaLedgerService.holdQuota(db, {
    studentUid,
    bookingId: 'bkg_100',
    idempotencyKey: 'hold_100',
  });

  await QuotaLedgerService.commitConfirmed(db, {
    studentUid,
    bookingId: 'bkg_100',
    teacherUid: 'teacher_boss',
  });

  await QuotaLedgerService.settleConsumption(db, {
    studentUid,
    bookingId: 'bkg_100',
    action: 'CONSUME_ATTENDED',
    reason: 'Clase completada con 55 minutos de asistencia',
  });

  const history = await QuotaLedgerService.getStudentLedger(db, studentUid);
  assert.equal(history.length, 4, 'Deben existir exactamente 4 movimientos inmutables auditables');
  assert.equal(history[0].action, 'GRANT_MONTHLY');
  assert.equal(history[1].action, 'HOLD_RESERVATION');
  assert.equal(history[2].action, 'COMMIT_CONFIRMED');
  assert.equal(history[3].action, 'CONSUME_ATTENDED');

  const finalBalance = await QuotaLedgerService.getCurrentBalance(db, studentUid);
  assert.equal(finalBalance, 7, 'El balance final disponible debe ser exactamente 7');
});
