import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEntitlements,
  DEFAULT_PLAN_CONFIGS,
  Subscription,
  Organization,
  OrganizationMember,
  SystemClockService,
  SubscriptionPlatformService,
} from '../services/subscriptionEngine';

function createBaseSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_test_1',
    userId: 'usr_1',
    planId: 'pro',
    status: 'active',
    cancelAtPeriodEnd: false,
    readOnlyReason: null,
    billingAnchorDay: 1,
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    trialStart: null,
    trialEnd: null,
    graceStartedAt: null,
    graceEndsAt: null,
    nextRetryAt: null,
    paymentRetryCount: 0,
    lastProcessedPeriodStart: '2026-10-01T00:00:00.000Z',
    activeDynamicCourseSlugs: ['ipt-master-fullstack'],
    frozenDynamicCourseSlugs: [],
    courseLastActivityAt: { 'ipt-master-fullstack': '2026-10-10T00:00:00.000Z' },
    dynamicCourseLastChangedAt: '2026-10-01T00:00:00.000Z',
    monthlyCreditsAllowance: 0,
    remainingCredits: 0,
    creditsConsumedInCycle: 0,
    creditsResetAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

test('Entitlements 1: Fronteras exactas (now == trialEnd, now == graceEndsAt) y sellado del limbo trial-cron', () => {
  const trialEndIso = '2026-10-21T12:00:00.000Z';
  const subTrial = createBaseSubscription({
    planId: 'pro_plus',
    status: 'trial',
    trialStart: '2026-10-06T12:00:00.000Z',
    trialEnd: trialEndIso,
    currentPeriodEnd: trialEndIso,
    monthlyCreditsAllowance: 1,
    remainingCredits: 1,
  });

  // 1 ms antes de trialEnd -> en trial activo con 1 crédito de cortesía y canJoinLiveClasses: true
  const beforeEnd = new Date('2026-10-21T11:59:59.999Z');
  const entBefore = computeEntitlements(subTrial, null, null, false, DEFAULT_PLAN_CONFIGS, beforeEnd);
  assert.equal(entBefore.isReadOnly, false);
  assert.equal(entBefore.canJoinLiveClasses, true);
  assert.equal(entBefore.availableLiveCredits, 1);
  assert.equal(entBefore.canClaimCertificates, false);
  assert.equal(entBefore.certificateRequiresConversion, true);

  // Exactamente en now == trialEnd (sin cancelar, pero el cron aún no ha cobrado)
  // NO debe regalar certificados gratis: sigue requiriendo conversión
  const exactEnd = new Date(trialEndIso);
  const entLimbo = computeEntitlements(subTrial, null, null, false, DEFAULT_PLAN_CONFIGS, exactEnd);
  assert.equal(entLimbo.isReadOnly, false);
  assert.equal(entLimbo.canClaimCertificates, false, 'En el limbo trial-cron no puede certificar gratis');
  assert.equal(entLimbo.certificateRequiresConversion, true);

  // Si además tenía cancelAtPeriodEnd: true, en now == trialEnd cae de inmediato a read_only
  const subTrialCancelled = createBaseSubscription({
    ...subTrial,
    cancelAtPeriodEnd: true,
  });
  const entCancelled = computeEntitlements(subTrialCancelled, null, null, false, DEFAULT_PLAN_CONFIGS, exactEnd);
  assert.equal(entCancelled.isReadOnly, true);
  assert.equal(entCancelled.readOnlyReason, 'trial_ended_cancelled');
  assert.equal(entCancelled.availableLiveCredits, 0);
  assert.equal(entCancelled.canViewCertificates, true);
  assert.equal(entCancelled.canClaimCertificates, false);

  // Exactamente en now == graceEndsAt -> cae a past_due_grace_ended
  const graceEndIso = '2026-11-06T00:00:00.000Z';
  const subPastDue = createBaseSubscription({
    planId: 'pro_plus',
    status: 'past_due',
    graceEndsAt: graceEndIso,
    remainingCredits: 5,
  });
  const entGraceExact = computeEntitlements(
    subPastDue,
    null,
    null,
    false,
    DEFAULT_PLAN_CONFIGS,
    new Date(graceEndIso)
  );
  assert.equal(entGraceExact.isReadOnly, true);
  assert.equal(entGraceExact.readOnlyReason, 'past_due_grace_ended');
  assert.equal(entGraceExact.availableLiveCredits, 0);
});

test('Entitlements 2: Tope de lag del cron de 48h (renewal_overdue) y preservación de readOnlyReason histórico', () => {
  const subActive = createBaseSubscription({
    planId: 'pro_plus',
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    trialEnd: '2026-05-01T00:00:00.000Z', // Tuvo trial hace 6 meses
    remainingCredits: 4,
  });

  // A las +24h tras currentPeriodEnd (dentro de la tolerancia de 48h de lag del cron) -> mantiene acceso
  const at24h = new Date('2026-11-02T00:00:00.000Z');
  const ent24h = computeEntitlements(subActive, null, null, false, DEFAULT_PLAN_CONFIGS, at24h);
  assert.equal(ent24h.isReadOnly, false);
  assert.equal(ent24h.canClaimCertificates, true);

  // A las +48h y 1 segundo sin que el cron haya renovado -> proyecta renewal_overdue en memoria
  const at48hPlus = new Date('2026-11-03T00:00:01.000Z');
  const entOverdue = computeEntitlements(subActive, null, null, false, DEFAULT_PLAN_CONFIGS, at48hPlus);
  assert.equal(entOverdue.isReadOnly, true);
  assert.equal(entOverdue.readOnlyReason, 'renewal_overdue');

  // Si canceló formalmente después de meses pagando -> el motivo es 'expired', jamás 'trial_ended_cancelled'
  const subCancelledAfterMonths = createBaseSubscription({
    ...subActive,
    cancelAtPeriodEnd: true,
  });
  const entExpired = computeEntitlements(
    subCancelledAfterMonths,
    null,
    null,
    false,
    DEFAULT_PLAN_CONFIGS,
    new Date('2026-11-01T00:00:00.000Z')
  );
  assert.equal(entExpired.isReadOnly, true);
  assert.equal(entExpired.readOnlyReason, 'expired');
});

test('Entitlements 3: Downgrade pendiente aplica plan destino y recorta cursos activos en tiempo real antes del cron', () => {
  const effectiveAt = '2026-11-01T00:00:00.000Z';
  const subDowngrading = createBaseSubscription({
    planId: 'pro_plus',
    status: 'active',
    currentPeriodEnd: effectiveAt,
    remainingCredits: 6,
    activeDynamicCourseSlugs: [
      'ipt-master-fullstack',
      'arquitectura-software-ia-ipt',
      'arquitectura-cloud-ipt',
    ],
    courseLastActivityAt: {
      'ipt-master-fullstack': '2026-10-10T00:00:00.000Z',
      'arquitectura-software-ia-ipt': '2026-10-28T00:00:00.000Z',
      'arquitectura-cloud-ipt': '2026-10-15T00:00:00.000Z',
    },
    pendingDowngrade: {
      targetPlanId: 'pro',
      effectiveAt,
      // Sin selectedDynamicCourseSlug -> debe elegir 'arquitectura-software-ia-ipt' por actividad más reciente
    },
  });

  const entAfterCutoff = computeEntitlements(
    subDowngrading,
    null,
    null,
    false,
    DEFAULT_PLAN_CONFIGS,
    new Date('2026-11-01T01:00:00.000Z')
  );

  assert.equal(entAfterCutoff.campusTheme, 'campus-pro');
  assert.equal(entAfterCutoff.maxDynamicCourses, 1);
  assert.deepEqual(entAfterCutoff.effectiveActiveCourseSlugs, ['arquitectura-software-ia-ipt']);
  assert.equal(entAfterCutoff.canJoinLiveClasses, false);
  assert.equal(entAfterCutoff.availableLiveCredits, 0, 'En Pro los créditos en vivo disponibles deben ser 0');
});

test('Entitlements 4: Your Plan Fail-Closed y protección por asiento sin tumbar a toda la organización', () => {
  const clock = new SystemClockService('2026-10-15T00:00:00.000Z', true);
  const service = new SubscriptionPlatformService(clock);

  const org: Organization = {
    id: 'org_acme',
    name: 'ACME Corp',
    ownerUserId: 'usr_owner',
    status: 'active',
    totalSeatsPurchased: 2, // Solo compró 2 asientos
    currentPeriodEnd: '2026-12-31T00:00:00.000Z',
    trialEnd: '2026-10-25T00:00:00.000Z', // En trial corporativo hasta el 25 de oct
    customTerms: {
      maxDynamicCoursesPerSeat: 4,
      monthlyLiveCreditsPerSeat: 10,
      allowLiveAccess: true,
    },
    createdAt: '2026-10-01T00:00:00.000Z',
  };
  service.organizations.set(org.id, org);

  const m1: OrganizationMember = {
    id: 'mem_1',
    organizationId: org.id,
    userId: 'usr_1',
    role: 'owner',
    status: 'active',
    assignedAt: '2026-10-01T01:00:00.000Z',
  };
  const m2: OrganizationMember = {
    id: 'mem_2',
    organizationId: org.id,
    userId: 'usr_2',
    role: 'member',
    status: 'active',
    assignedAt: '2026-10-01T02:00:00.000Z',
  };
  const m3Excess: OrganizationMember = {
    id: 'mem_3',
    organizationId: org.id,
    userId: 'usr_3',
    role: 'member',
    status: 'active',
    assignedAt: '2026-10-01T03:00:00.000Z', // 3er asiento (excede totalSeatsPurchased = 2)
  };
  service.organizationMembers.set(m1.id, m1);
  service.organizationMembers.set(m2.id, m2);
  service.organizationMembers.set(m3Excess.id, m3Excess);

  const sub1 = createBaseSubscription({
    id: 'sub_corp_1',
    userId: 'usr_1',
    organizationId: org.id,
    planId: 'your_plan',
    remainingCredits: 10,
  });
  const sub3 = createBaseSubscription({
    id: 'sub_corp_3',
    userId: 'usr_3',
    organizationId: org.id,
    planId: 'your_plan',
    remainingCredits: 10,
  });

  // Miembro 1 (dentro del cupo de 2 asientos) -> conserva acceso completo, y como está en trial corporativo requiere conversión para certificar
  const ent1 = service.getEntitlementsForSubscription(sub1);
  assert.equal(ent1.isReadOnly, false);
  assert.equal(ent1.campusTheme, 'campus-enterprise');
  assert.equal(ent1.maxDynamicCourses, 4);
  assert.equal(ent1.availableLiveCredits, 10);
  assert.equal(ent1.canClaimCertificates, false);
  assert.equal(ent1.certificateRequiresConversion, true);

  // Miembro 3 (excede los 2 asientos) -> falla cerrado solo para él, sin afectar al Miembro 1
  const ent3 = service.getEntitlementsForSubscription(sub3);
  assert.equal(ent3.isReadOnly, true);
  assert.equal(ent3.readOnlyReason, 'organization_invalid');

  // Si la organización es nula -> falla cerrado
  const entNoOrg = computeEntitlements(sub1, null, m1, true, DEFAULT_PLAN_CONFIGS, clock.now());
  assert.equal(entNoOrg.isReadOnly, true);
  assert.equal(entNoOrg.readOnlyReason, 'organization_invalid');
});
