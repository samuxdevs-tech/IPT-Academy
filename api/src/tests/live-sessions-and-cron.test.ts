import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SystemClockService,
  SubscriptionPlatformService,
  advanceCalendarMonth,
} from '../services/subscriptionEngine';

test('Live & Concurrency 1: Dos reservas simultáneas con 1 solo crédito o 1 último cupo, bloqueo en read_only y límite de ciclo', async () => {
  const clock = new SystemClockService('2026-10-10T10:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const user = service.registerUser({
    uid: 'usr_live_1',
    email: 'live1@ivanperez.tech',
    displayName: 'Alumno Live',
  });
  const card = service.gateway.tokenizeCard({
    panLast4: '4242',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Alumno Live',
  });

  // Inicia trial de Pro+ -> tiene exactamente 1 crédito de cortesía y trialEnd = 2026-10-25T10:00:00.000Z
  const sub = await service.startTrial({
    userId: user.uid,
    planId: 'pro_plus',
    paymentMethod: card,
  });
  assert.equal(sub.remainingCredits, 1);

  // Crear 2 sesiones dentro del periodo y 1 sesión fuera del periodo
  service.liveSessions.set('sess_a', {
    id: 'sess_a',
    courseSlug: 'ipt-master-fullstack',
    teacherId: 't_1',
    title: 'Arquitectura Cloud A',
    startTime: '2026-10-12T18:00:00.000Z',
    durationMinutes: 60,
    status: 'scheduled',
    attendanceModel: 'quorum',
    quorumRequired: 2,
    quorumStatus: 'pending',
    bookedCount: 0,
    maxCapacity: 10,
  });
  service.liveSessions.set('sess_b', {
    id: 'sess_b',
    courseSlug: 'ipt-master-fullstack',
    teacherId: 't_1',
    title: 'Arquitectura Cloud B',
    startTime: '2026-10-13T18:00:00.000Z',
    durationMinutes: 60,
    status: 'scheduled',
    attendanceModel: 'quorum',
    quorumRequired: 2,
    quorumStatus: 'pending',
    bookedCount: 0,
    maxCapacity: 10,
  });
  service.liveSessions.set('sess_beyond', {
    id: 'sess_beyond',
    courseSlug: 'ipt-master-fullstack',
    teacherId: 't_1',
    title: 'Sesión Mes Siguiente',
    startTime: '2026-11-05T18:00:00.000Z', // Más allá de trialEnd (25 oct)
    durationMinutes: 60,
    status: 'scheduled',
    attendanceModel: 'quorum',
    quorumRequired: 2,
    quorumStatus: 'pending',
    bookedCount: 0,
    maxCapacity: 10,
  });

  // 1. Intento de reservar más allá de la fecha de corte vigente -> rechazado
  await assert.rejects(
    () => service.bookLiveSession(sub.id, 'sess_beyond'),
    /SESSION_BEYOND_CURRENT_BILLING_PERIOD/
  );

  // 2. Dos reservas simultáneas (Promise.all) cuando solo tiene 1 crédito -> exactamente 1 pasa y 1 falla
  const results = await Promise.allSettled([
    service.bookLiveSession(sub.id, 'sess_a'),
    service.bookLiveSession(sub.id, 'sess_b'),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

  assert.equal(fulfilled.length, 1, 'Solo una reserva simultánea puede consumir el único crédito');
  assert.equal(rejected.length, 1);
  assert.match(String(rejected[0].reason), /INSUFFICIENT_LIVE_CREDITS/);
  assert.equal(service.subscriptions.get(sub.id)?.remainingCredits, 0);

  // 3. Si una suscripción está en read_only, aunque tuviera remainingCredits > 0 en BD, bookLiveSession lo rechaza
  const subReadOnly = service.subscriptions.get(sub.id)!;
  subReadOnly.status = 'read_only';
  subReadOnly.readOnlyReason = 'expired';
  subReadOnly.remainingCredits = 5;
  service.subscriptions.set(subReadOnly.id, subReadOnly);

  await assert.rejects(
    () => service.bookLiveSession(sub.id, 'sess_b'),
    /LIVE_ACCESS_FORBIDDEN/
  );
});

test('Live & Concurrency 2: Frontera exacta de 4h en cancelación y evaluación idempotente de quórum a <= 3h', async () => {
  const clock = new SystemClockService('2026-10-10T10:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const user = service.registerUser({
    uid: 'usr_q1',
    email: 'q1@ivanperez.tech',
    displayName: 'Alumno Quórum',
  });
  const card = service.gateway.tokenizeCard({
    panLast4: '3333',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Alumno Quórum',
  });

  const sub = await service.startTrial({
    userId: user.uid,
    planId: 'pro_plus',
    paymentMethod: card,
  });

  // Sesión programada para el 12 de oct a las 18:00:00.000Z (requiere quórum de 3 alumnos)
  service.liveSessions.set('sess_q', {
    id: 'sess_q',
    courseSlug: 'ipt-master-fullstack',
    teacherId: 't_1',
    title: ' Diseño de Sistemas Distribuidos',
    startTime: '2026-10-12T18:00:00.000Z',
    durationMinutes: 60,
    status: 'scheduled',
    attendanceModel: 'quorum',
    quorumRequired: 3,
    quorumStatus: 'pending',
    bookedCount: 0,
    maxCapacity: 10,
  });

  const bkg = await service.bookLiveSession(sub.id, 'sess_q');
  assert.equal(service.subscriptions.get(sub.id)?.remainingCredits, 0);
  assert.equal(service.liveSessions.get('sess_q')?.bookedCount, 1);

  // 1. A las 14:00:00.000Z (exactamente 4h 00m 00s antes de las 18:00) -> cancelación permitida y devuelve el crédito
  clock.setNow('2026-10-12T14:00:00.000Z');
  await service.cancelLiveBooking(bkg.id, user.uid);
  assert.equal(service.subscriptions.get(sub.id)?.remainingCredits, 1);
  assert.equal(service.liveSessions.get('sess_q')?.bookedCount, 0);

  // 2. Volvemos a las 13:00 para reservar de nuevo, y luego intentamos cancelar a las 14:00:00.001Z (3h 59m 59.999s antes) -> rechazado
  clock.setNow('2026-10-12T13:00:00.000Z');
  const bkg2 = await service.bookLiveSession(sub.id, 'sess_q');

  clock.setNow('2026-10-12T14:00:00.001Z');
  await assert.rejects(
    () => service.cancelLiveBooking(bkg2.id, user.uid),
    /CANCELLATION_WINDOW_CLOSED_4H/
  );

  // 3. A las 15:00:00.000Z (exactamente 3 horas antes) -> se evalúa el quórum (hay 1 inscrito de 3 requeridos -> falla)
  clock.setNow('2026-10-12T15:00:00.000Z');
  const qRes1 = await service.evaluateSessionQuorum('sess_q');
  assert.equal(qRes1.session.status, 'cancelled');
  assert.equal(qRes1.session.quorumStatus, 'failed');
  assert.equal(qRes1.refundedBookingsCount, 1);
  assert.equal(service.subscriptions.get(sub.id)?.remainingCredits, 1, 'Crédito reintegrado por falta de quórum');

  // 4. Segunda ejecución consecutiva de evaluateSessionQuorum -> 100% idempotente, NO devuelve un segundo crédito
  const qRes2 = await service.evaluateSessionQuorum('sess_q');
  assert.equal(qRes2.refundedBookingsCount, 0);
  assert.equal(service.subscriptions.get(sub.id)?.remainingCredits, 1, 'No debe duplicar el reintegro');
});

test('Cron 1: Reintentos en past_due (Días 1, 3 y 5 con orden correcto en el Día 5), Your Plan sin tarjeta y Liberación de Reservas', async () => {
  const clock = new SystemClockService('2026-10-01T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  // A. Suscripción Your Plan sin paymentMethod no debe tronar el cron
  service.organizations.set('org_1', {
    id: 'org_1',
    name: 'Empresa IPT',
    ownerUserId: 'usr_corp',
    status: 'active',
    totalSeatsPurchased: 5,
    currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    customTerms: {
      maxDynamicCoursesPerSeat: 3,
      monthlyLiveCreditsPerSeat: 10,
      allowLiveAccess: true,
    },
    createdAt: '2026-10-01T00:00:00.000Z',
  });
  service.subscriptions.set('sub_your_plan', {
    id: 'sub_your_plan',
    userId: 'usr_corp',
    organizationId: 'org_1',
    planId: 'your_plan',
    status: 'active',
    cancelAtPeriodEnd: false,
    billingAnchorDay: 1,
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    paymentRetryCount: 0,
    activeDynamicCourseSlugs: ['ipt-master-fullstack'],
    frozenDynamicCourseSlugs: [],
    courseLastActivityAt: {},
    monthlyCreditsAllowance: 10,
    remainingCredits: 10,
    creditsConsumedInCycle: 0,
    creditsResetAt: '2026-11-01T00:00:00.000Z',
    paymentMethod: null, // Sin tarjeta
  });

  // B. Usuario Pro+ cuyo cobro falla en el corte y entra en calendario de reintentos (Días 1, 3 y 5)
  const user = service.registerUser({
    uid: 'usr_retry',
    email: 'retry@ivanperez.tech',
    displayName: 'Alumno Mora',
  });
  const card = service.gateway.tokenizeCard({
    panLast4: '7777',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Alumno Mora',
  });

  const sub = await service.startTrial({
    userId: user.uid,
    planId: 'pro_plus',
    paymentMethod: card,
  });

  // Falla el cobro al vencer el trial (Día 15: 2026-10-16T00:00:00.000Z)
  service.gateway.setTokenFailureMode(card.token, 'always_fail');
  clock.setNow('2026-10-16T00:00:00.000Z');
  await service.processSubscriptionsCron();

  let currentSub = service.subscriptions.get(sub.id)!;
  assert.equal(currentSub.status, 'past_due');
  assert.equal(currentSub.paymentRetryCount, 0);
  assert.equal(currentSub.nextRetryAt, '2026-10-17T00:00:00.000Z'); // Día 1
  assert.equal(currentSub.graceEndsAt, '2026-10-21T00:00:00.000Z'); // Día 5

  // Si el cron corre 6 horas después (antes de nextRetryAt), NO hace ningún intento de cobro
  clock.advanceHours(6);
  await service.processSubscriptionsCron();
  assert.equal(service.subscriptions.get(sub.id)?.paymentRetryCount, 0);

  // Día 1 (2026-10-17): falla el intento 1 -> agenda Día 3 (2026-10-19)
  clock.setNow('2026-10-17T00:00:00.000Z');
  await service.processSubscriptionsCron();
  currentSub = service.subscriptions.get(sub.id)!;
  assert.equal(currentSub.paymentRetryCount, 1);
  assert.equal(currentSub.nextRetryAt, '2026-10-19T00:00:00.000Z');

  // Día 3 (2026-10-19): falla el intento 2 -> agenda Día 5 (2026-10-21)
  clock.setNow('2026-10-19T00:00:00.000Z');
  await service.processSubscriptionsCron();
  currentSub = service.subscriptions.get(sub.id)!;
  assert.equal(currentSub.paymentRetryCount, 2);
  assert.equal(currentSub.nextRetryAt, '2026-10-21T00:00:00.000Z');

  // Día 5 (2026-10-21T00:00:00.000Z): coincide exactamente con graceEndsAt!
  // Si el usuario arregló su tarjeta para el 3er intento del Día 5, el reintento se evalúa PRIMERO y recupera la cuenta a active!
  service.gateway.setTokenFailureMode(card.token, 'succeed');
  clock.setNow('2026-10-21T00:00:00.000Z');
  await service.processSubscriptionsCron();

  currentSub = service.subscriptions.get(sub.id)!;
  assert.equal(currentSub.status, 'active', 'El 3er intento en el Día 5 debe ejecutarse antes del corte de gracia y recuperar la suscripción');
  assert.equal(currentSub.paymentRetryCount, 0);
  assert.equal(currentSub.remainingCredits, 8);
});

test('Cron 2: Downgrade encadenado, doble ejecución idempotente y Catch-up con Billing Anchor (31 Ene -> 28 Feb -> 31 Mar)', async () => {
  const clock = new SystemClockService('2026-01-31T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  // Verificar función de calendario con ancla día 31:
  // 31 Ene -> 28 Feb -> 31 Mar -> 30 Abr
  const febEnd = advanceCalendarMonth('2026-01-31T00:00:00.000Z', 31);
  assert.equal(febEnd.toISOString(), '2026-02-28T00:00:00.000Z');
  const marEnd = advanceCalendarMonth(febEnd, 31);
  assert.equal(marEnd.toISOString(), '2026-03-31T00:00:00.000Z');
  const aprEnd = advanceCalendarMonth(marEnd, 31);
  assert.equal(aprEnd.toISOString(), '2026-04-30T00:00:00.000Z');

  const user = service.registerUser({
    uid: 'usr_chain',
    email: 'chain@ivanperez.tech',
    displayName: 'Alumno Downgrade',
  });
  const card = service.gateway.tokenizeCard({
    panLast4: '6666',
    brand: 'mastercard',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Alumno Downgrade',
  });

  service.subscriptions.set('sub_chain_1', {
    id: 'sub_chain_1',
    userId: user.uid,
    planId: 'pro_plus',
    status: 'active',
    cancelAtPeriodEnd: false,
    billingAnchorDay: 31,
    currentPeriodStart: '2026-01-31T00:00:00.000Z',
    currentPeriodEnd: '2026-02-28T00:00:00.000Z',
    paymentRetryCount: 0,
    activeDynamicCourseSlugs: [
      'ipt-master-fullstack',
      'arquitectura-software-ia-ipt',
      'arquitectura-cloud-ipt',
    ],
    frozenDynamicCourseSlugs: [],
    courseLastActivityAt: {
      'ipt-master-fullstack': '2026-02-05T00:00:00.000Z',
      'arquitectura-software-ia-ipt': '2026-02-20T00:00:00.000Z', // El más reciente
      'arquitectura-cloud-ipt': '2026-02-10T00:00:00.000Z',
    },
    monthlyCreditsAllowance: 8,
    remainingCredits: 5,
    creditsConsumedInCycle: 3,
    creditsResetAt: '2026-02-28T00:00:00.000Z',
    paymentMethod: card,
  });

  // Programar downgrade a Pro sin elegir curso manualmente -> debe conservar 'arquitectura-software-ia-ipt'
  service.scheduleDowngrade({
    subId: 'sub_chain_1',
    targetPlanId: 'pro',
  });

  // Saltamos 2 meses hasta el 31 de marzo de 2026 (Catch-up de 2 periodos: 28 Feb y 31 Mar)
  clock.setNow('2026-03-31T00:00:00.000Z');
  await service.processSubscriptionsCron();

  const updated = service.subscriptions.get('sub_chain_1')!;
  assert.equal(updated.planId, 'pro');
  assert.deepEqual(updated.activeDynamicCourseSlugs, ['arquitectura-software-ia-ipt']);
  assert.equal(updated.frozenDynamicCourseSlugs.length, 2);
  assert.equal(updated.currentPeriodEnd, '2026-04-30T00:00:00.000Z');
  assert.equal(service.gateway.getTotalSuccessfulCharges(), 2, 'Catch-up de 2 meses debe cobrar exactamente los 2 ciclos vencidos');

  // Si ejecutamos el cron una segunda vez inmediatamente con el mismo reloj -> 0 cargos adicionales (idempotente)
  await service.processSubscriptionsCron();
  assert.equal(service.gateway.getTotalSuccessfulCharges(), 2, 'Doble ejecución del cron no debe duplicar cobros');
});
