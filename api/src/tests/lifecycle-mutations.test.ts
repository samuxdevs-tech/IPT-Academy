import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmailByDomain,
  isDisposableEmail,
  SystemClockService,
  SubscriptionPlatformService,
  MockPaymentGateway,
} from '../services/subscriptionEngine';

test('Lifecycle 1: Normalización de correo exclusiva para Gmail y bloqueo de dominios desechables', () => {
  // Gmail quita puntos y +alias
  assert.equal(normalizeEmailByDomain('Ivan.Perez+prueba@Gmail.com'), 'ivanperez@gmail.com');
  assert.equal(normalizeEmailByDomain('ivan.perez@googlemail.com'), 'ivanperez@gmail.com');

  // Dominios corporativos o propios NO pierden puntos ni +alias
  assert.equal(
    normalizeEmailByDomain('Juan.Perez+ventas@IvanPerez.tech'),
    'juan.perez+ventas@ivanperez.tech'
  );

  assert.equal(isDisposableEmail('hacker@10minutemail.com'), true);
  assert.equal(isDisposableEmail('estudiante@ivanperez.tech'), false);
});

test('Lifecycle 2: Antifraude en Trial (hasUsedTrial en User, cardFingerprint en transacción y excepción de Admin)', async () => {
  const clock = new SystemClockService('2026-10-01T10:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const u1 = service.registerUser({
    uid: 'usr_1',
    email: 'alumno1@gmail.com',
    displayName: 'Alumno Uno',
  });
  const u2 = service.registerUser({
    uid: 'usr_2',
    email: 'familiar2@gmail.com',
    displayName: 'Familiar Dos',
  });

  const sharedCard = service.gateway.tokenizeCard({
    panLast4: '4242',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Familia Perez',
    rawCardIdentifierForFingerprint: 'card_unique_family_001',
  });

  // 1. Alumno 1 inicia trial de Pro+ -> recibe 1 crédito de cortesía
  const sub1 = await service.startTrial({
    userId: u1.uid,
    planId: 'pro_plus',
    paymentMethod: sharedCard,
    initialDynamicCourseSlug: 'ipt-master-fullstack',
  });

  assert.equal(sub1.status, 'trial');
  assert.equal(sub1.remainingCredits, 1, 'Trial de Pro+ debe inicializar 1 crédito de cortesía');
  assert.equal(service.users.get(u1.uid)?.hasUsedTrial, true);

  // 2. Si se borra el documento de suscripción, hasUsedTrial en el usuario sigue impidiendo otro trial (anti-chaining)
  service.subscriptions.delete(sub1.id);
  const secondCard = service.gateway.tokenizeCard({
    panLast4: '9999',
    brand: 'mastercard',
    expMonth: 10,
    expYear: 2029,
    cardholderName: 'Alumno Uno',
    rawCardIdentifierForFingerprint: 'card_other_002',
  });
  await assert.rejects(
    () =>
      service.startTrial({
        userId: u1.uid,
        planId: 'pro',
        paymentMethod: secondCard,
      }),
    /TRIAL_ALREADY_USED/
  );

  // 3. Familiar 2 intenta iniciar trial con la misma tarjeta (sharedCard) -> bloqueado por cardFingerprint
  await assert.rejects(
    () =>
      service.startTrial({
        userId: u2.uid,
        planId: 'pro',
        paymentMethod: sharedCard,
      }),
    /CARD_FINGERPRINT_ALREADY_USED_FOR_TRIAL/
  );

  // 4. Administrador aprueba excepción manual para tarjeta familiar -> ahora Familiar 2 sí puede iniciar su trial
  service.approveCardFingerprintExemption({
    fingerprint: sharedCard.cardFingerprint,
    adminEmail: 'administrator@ivanperez.tech',
    notes: 'Hermanos verificados que comparten tarjeta familiar',
  });

  const sub2 = await service.startTrial({
    userId: u2.uid,
    planId: 'pro',
    paymentMethod: sharedCard,
  });
  assert.equal(sub2.status, 'trial');
  assert.equal(sub2.remainingCredits, 0, 'Trial de Pro tiene 0 créditos en vivo');
});

test('Lifecycle 3: Certificación anticipada en Trial (cobra ciclo 1 con IVA, emite factura DIAN y desbloquea certificado)', async () => {
  const clock = new SystemClockService('2026-10-05T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const user = service.registerUser({
    uid: 'usr_fast',
    email: 'fast@ivanperez.tech',
    displayName: 'Estudiante Veloz',
    taxProfile: {
      documentType: 'CC',
      documentNumber: '1020304050',
      legalName: 'Estudiante Veloz',
      taxRegime: 'no_responsable_iva',
      billingEmail: 'fast@ivanperez.tech',
    },
  });

  const card = service.gateway.tokenizeCard({
    panLast4: '1111',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Estudiante Veloz',
  });

  const sub = await service.startTrial({
    userId: user.uid,
    planId: 'pro_plus',
    paymentMethod: card,
  });

  // En trial: no puede reclamar certificado gratis, pero certificateRequiresConversion es true
  const entTrial = service.getEntitlementsForSubscription(sub);
  assert.equal(entTrial.canClaimCertificates, false);
  assert.equal(entTrial.certificateRequiresConversion, true);

  // Si el pago falla al intentar convertir, el estado queda intacto en trial
  service.gateway.setTokenFailureMode(card.token, 'always_fail');
  await assert.rejects(
    () => service.convertTrialForCertificate(sub.id),
    /EARLY_CONVERSION_PAYMENT_FAILED/
  );
  assert.equal(service.subscriptions.get(sub.id)?.status, 'trial');

  // Si el pago funciona -> pasa a active, reinicia créditos a 8, emite factura con IVA 19% y habilita certificado
  service.gateway.setTokenFailureMode(card.token, 'succeed');
  clock.advanceDays(3); // Día 8 de oct
  const { subscription: converted, invoice } = await service.convertTrialForCertificate(sub.id);

  assert.equal(converted.status, 'active');
  assert.equal(converted.remainingCredits, 8);
  assert.equal(invoice.subtotal, 189000);
  assert.equal(invoice.taxRatePercent, 19);
  assert.equal(invoice.taxAmount, Math.round(189000 * 0.19));
  assert.equal(invoice.total, 189000 + Math.round(189000 * 0.19));
  assert.equal(invoice.dianStatus, 'pending_emission');

  const entActive = service.getEntitlementsForSubscription(converted);
  assert.equal(entActive.canClaimCertificates, true);
  assert.equal(entActive.certificateRequiresConversion, false);
});

test('Lifecycle 4: Upgrade con prorrateo anti-arbitraje (Día 29 vs Mitad de ciclo) y descongelamiento de cursos', async () => {
  const clock = new SystemClockService('2026-09-01T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const user = service.registerUser({
    uid: 'usr_upg',
    email: 'upg@ivanperez.tech',
    displayName: 'Usuario Upgrade',
  });
  const card = service.gateway.tokenizeCard({
    panLast4: '5555',
    brand: 'mastercard',
    expMonth: 11,
    expYear: 2028,
    cardholderName: 'Usuario Upgrade',
  });

  // Crear suscripción Pro activa (ciclo de 30 días en septiembre: 1 sep -> 1 oct)
  // con 2 cursos previamente congelados de un ciclo anterior
  const subId = 'sub_upg_1';
  service.subscriptions.set(subId, {
    id: subId,
    userId: user.uid,
    planId: 'pro',
    status: 'active',
    cancelAtPeriodEnd: false,
    billingAnchorDay: 1,
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    paymentRetryCount: 0,
    activeDynamicCourseSlugs: ['ipt-master-fullstack'],
    frozenDynamicCourseSlugs: ['arquitectura-software-ia-ipt', 'arquitectura-cloud-ipt'],
    courseLastActivityAt: {
      'ipt-master-fullstack': '2026-09-10T00:00:00.000Z',
      'arquitectura-software-ia-ipt': '2026-09-05T00:00:00.000Z',
      'arquitectura-cloud-ipt': '2026-09-08T00:00:00.000Z',
    },
    monthlyCreditsAllowance: 0,
    remainingCredits: 0,
    creditsConsumedInCycle: 0,
    creditsResetAt: '2026-10-01T00:00:00.000Z',
    paymentMethod: card,
  });

  // Caso A: Intento de arbitraje subiendo el día 30 de septiembre (queda 1/30 del ciclo)
  clock.setNow('2026-09-30T00:00:00.000Z');
  const { subscription: upgDay29, invoice: invDay29 } = await service.upgradeSubscription({
    subId,
    targetPlanId: 'pro_plus',
  });

  // Diferencia mensual: 189000 - 89000 = 100000. 1/30 de 100000 = 3333 COP subtotal
  assert.equal(invDay29.subtotal, Math.round(100000 * (1 / 30)));
  // Créditos proporcionales: floor(8 * (1/30)) = 0 créditos (bloquea usar 8 clases por 3333 pesos)
  assert.equal(upgDay29.remainingCredits, 0, 'En el día 29/30 no debe regalar los 8 créditos completos');
  // Los 2 cursos congelados se descongelaron automáticamente al subir a Pro+ (tope 3)
  assert.equal(upgDay29.activeDynamicCourseSlugs.length, 3);
  assert.equal(upgDay29.frozenDynamicCourseSlugs.length, 0);
});

test('Lifecycle 5: Cancelar, Deshacer Cancelación (resumeSubscription) y Reactivación desde read_only con validación de tarjeta', async () => {
  const clock = new SystemClockService('2026-10-10T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const user = service.registerUser({
    uid: 'usr_react',
    email: 'react@ivanperez.tech',
    displayName: 'Usuario Reactivación',
  });
  const validCard = service.gateway.tokenizeCard({
    panLast4: '8888',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
    cardholderName: 'Usuario Reactivación',
  });

  const sub = await service.startTrial({
    userId: user.uid,
    planId: 'pro_plus',
    paymentMethod: validCard,
    initialDynamicCourseSlug: 'ipt-master-fullstack',
  });

  // 1. Cancela y luego se arrepiente antes del corte (resumeSubscription sin cobro)
  const cancelled = service.cancelSubscription(sub.id);
  assert.equal(cancelled.cancelAtPeriodEnd, true);

  const resumed = service.resumeSubscription(sub.id);
  assert.equal(resumed.cancelAtPeriodEnd, false);
  assert.equal(service.gateway.getTotalSuccessfulCharges(), 0);

  // 2. Vuelve a cancelar y dejamos vencer el trial -> el cron lo pasa a read_only
  service.cancelSubscription(sub.id);
  clock.advanceDays(16);
  await service.processSubscriptionsCron();

  const readOnlySub = service.subscriptions.get(sub.id)!;
  assert.equal(readOnlySub.status, 'read_only');
  assert.equal(readOnlySub.readOnlyReason, 'trial_ended_cancelled');
  assert.deepEqual(readOnlySub.activeDynamicCourseSlugs, []);
  assert.deepEqual(readOnlySub.frozenDynamicCourseSlugs, ['ipt-master-fullstack']);

  // 3. Intenta reactivar con una tarjeta vencida -> debe fallar y mantener read_only
  const expiredCard = service.gateway.tokenizeCard({
    panLast4: '0001',
    brand: 'visa',
    expMonth: 1,
    expYear: 2025,
    cardholderName: 'Usuario Reactivación',
  });
  await assert.rejects(
    () =>
      service.reactivateSubscription({
        subId: sub.id,
        newPaymentMethod: expiredCard,
      }),
    /PAYMENT_METHOD_EXPIRED/
  );
  assert.equal(service.subscriptions.get(sub.id)?.status, 'read_only');

  // 4. Reactiva con tarjeta vigente -> limpia banderas, cobra ciclo y descongela su curso
  const { subscription: reactivated } = await service.reactivateSubscription({
    subId: sub.id,
    newPaymentMethod: validCard,
  });
  assert.equal(reactivated.status, 'active');
  assert.equal(reactivated.cancelAtPeriodEnd, false);
  assert.equal(reactivated.readOnlyReason, null);
  assert.equal(reactivated.remainingCredits, 8);
  assert.deepEqual(reactivated.activeDynamicCourseSlugs, ['ipt-master-fullstack']);
  assert.deepEqual(reactivated.frozenDynamicCourseSlugs, []);
});

test('Lifecycle 6: Contrato de Idempotencia del Gateway Mock y Migración de Usuarios Existentes a Free', async () => {
  const gw = new MockPaymentGateway();
  const r1 = await gw.charge({
    token: 'tok_visa_123',
    amount: 100000,
    idempotencyKey: 'key_unique_1',
  });
  assert.equal(r1.success, true);

  // Misma clave y mismos parámetros -> devuelve exactamente el mismo recibo
  const r2 = await gw.charge({
    token: 'tok_visa_123',
    amount: 100000,
    idempotencyKey: 'key_unique_1',
  });
  assert.equal(r2.transactionId, r1.transactionId);

  // Misma clave pero monto distinto -> lanza IDEMPOTENCY_PARAMETER_MISMATCH
  await assert.rejects(
    () =>
      gw.charge({
        token: 'tok_visa_123',
        amount: 250000,
        idempotencyKey: 'key_unique_1',
      }),
    /IDEMPOTENCY_PARAMETER_MISMATCH/
  );

  // Migración de usuarios existentes a Free con hasUsedTrial = false
  const service = new SubscriptionPlatformService();
  const mig = service.migrateExistingUsersToFree([
    { uid: 'legacy_1', email: 'legacy1@ipt.com', displayName: 'Legacy Uno' },
    { uid: 'legacy_2', email: 'legacy2@ipt.com', displayName: 'Legacy Dos' },
  ]);
  assert.equal(mig.migratedCount, 2);
  assert.equal(service.users.get('legacy_1')?.hasUsedTrial, false);
  const subLegacy = service.subscriptions.get('sub_free_legacy_1')!;
  const entLegacy = service.getEntitlementsForSubscription(subLegacy);
  assert.equal(entLegacy.campusTheme, 'campus-free');
  assert.equal(entLegacy.canViewCertificates, true);
});
