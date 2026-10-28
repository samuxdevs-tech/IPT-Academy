/**
 * IPT Academy — Motor Transaccional de Suscripciones, Entitlements, Outbox, Cuota Mínima y Facturación (v6)
 * Cumple 100% con el Plan Maestro Definitivo v6:
 * - ClockService inyectable (bloqueado en producción para manipulación temporal)
 * - Ciclos por mes calendario con Billing Anchor (1..31) y ajuste de fin de mes
 * - computeEntitlements puro con helpers freeEntitlements / readOnlyEntitlements (sin recursión)
 * - Recorte en tiempo real de effectiveActiveCourseSlugs tras vencimiento de downgrade
 * - Tope de lag del cron de 48h (renewal_overdue) con auto-recuperación al cobrar
 * - Patrón Outbox (lms_payment_attempts) + Facturas inmutables con IVA y perfil DIAN (lms_invoices)
 * - Reservas acotadas al ciclo vigente + liberación automática de cupos al caer en read_only
 * - Orden estricto de reintentos en past_due (Días 1, 3 y 5; el intento del día 5 se evalúa antes del corte de gracia)
 */

export type StandardPlanId = 'free' | 'pro' | 'pro_plus';
export type PlanId = StandardPlanId | 'your_plan';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'read_only';

export type ReadOnlyReason =
  | 'expired'
  | 'trial_ended_cancelled'
  | 'past_due_grace_ended'
  | 'admin_revoked'
  | 'organization_invalid'
  | 'renewal_overdue';

export interface PlanConfig {
  id: StandardPlanId;
  name: string;
  priceMonthly: number;       // Subtotal antes de impuestos (o base gravable)
  taxRatePercent: number;     // Ej. 0 o 19 (IVA Colombia)
  currency: 'COP' | 'USD';
  trialDays: number;          // 0 en free, 20 en pro, 15 en pro_plus
  trialLiveCredits: number;   // 0 en free, 0 en pro, 1 en pro_plus (sesión de cortesía)
  maxDynamicCourses: number;  // 0 en free, 1 en pro, 3 en pro_plus
  monthlyLiveCredits: number; // 0 en free, 0 en pro, 8 en pro_plus
  allowsLiveAccess: boolean;
  allowsAllStatic: boolean;
}

export interface BillingTaxProfile {
  documentType: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  documentNumber: string;
  verificationDigit?: string;
  legalName: string;
  taxRegime: 'responsable_iva' | 'no_responsable_iva' | 'gran_contribuyente';
  billingEmail: string;
  address?: string;
  city?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  canonicalEmail: string;
  displayName: string;
  phoneVerified: boolean;
  hasUsedTrial: boolean;
  trialUsedAt?: string;
  trialPlanId?: PlanId;
  organizationId?: string;
  taxProfile?: BillingTaxProfile;
  createdAt: string;
}

export interface CardFingerprintRecord {
  fingerprint: string;
  firstUsedByUid: string;
  firstUsedAt: string;
  allowedExemptionByAdmin?: boolean;
  exemptionNotes?: string;
  exemptionApprovedBy?: string;
}

export interface TokenizedPaymentMethod {
  token: string;
  cardFingerprint: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
}

export interface PendingDowngrade {
  targetPlanId: 'free' | 'pro';
  effectiveAt: string;
  selectedDynamicCourseSlug?: string;
}

export interface AdminOverrides {
  maxDynamicCourses?: number;
  monthlyLiveCredits?: number;
  allowLiveAccess?: boolean;
  customExpiryDate?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  organizationId?: string;
  planId: PlanId;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  readOnlyReason?: ReadOnlyReason | null;

  billingAnchorDay: number; // 1..31
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string | null;
  trialEnd?: string | null;

  graceStartedAt?: string | null;
  graceEndsAt?: string | null;
  nextRetryAt?: string | null;
  paymentRetryCount: number;
  lastProcessedPeriodStart?: string | null;

  activeDynamicCourseSlugs: string[];
  frozenDynamicCourseSlugs: string[];
  courseLastActivityAt: Record<string, string>;
  dynamicCourseLastChangedAt?: string | null;

  monthlyCreditsAllowance: number;
  remainingCredits: number;
  creditsConsumedInCycle: number;
  creditsResetAt: string;

  pendingDowngrade?: PendingDowngrade | null;
  paymentMethod?: TokenizedPaymentMethod | null;
  adminOverrides?: AdminOverrides | null;
}

export interface Organization {
  id: string;
  name: string;
  ownerUserId: string;
  status: 'active' | 'suspended' | 'cancelled';
  totalSeatsPurchased: number;
  currentPeriodEnd: string;
  trialEnd?: string | null;
  customTerms: {
    maxDynamicCoursesPerSeat: number;
    monthlyLiveCreditsPerSeat: number;
    allowLiveAccess: boolean;
  };
  taxProfile?: BillingTaxProfile;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'revoked';
  assignedAt: string;
}

export interface LiveSession {
  id: string;
  courseSlug: string;
  teacherId: string;
  title: string;
  startTime: string;
  durationMinutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  attendanceModel: 'quorum' | 'credits' | 'hybrid';
  quorumRequired: number;
  quorumStatus: 'pending' | 'confirmed' | 'failed';
  bookedCount: number;
  maxCapacity: number;
}

export interface LiveBooking {
  id: string;
  sessionId: string;
  userId: string;
  subscriptionId: string;
  status: 'confirmed' | 'cancelled_by_user' | 'refunded_quorum' | 'cancelled_subscription_inactive';
  bookedAt: string;
  cancelledOrRefundedAt?: string;
  sessionTitle?: string;
  sessionStartTime?: string;
  sessionInstructor?: string;
}

export interface PaymentAttempt {
  idempotencyKey: string;
  subscriptionId: string;
  userId: string;
  operation: 'first_charge' | 'renew' | 'retry' | 'early_cert' | 'upgrade' | 'reactivate';
  amountSubtotal: number;
  taxRatePercent: number;
  amountTax: number;
  amountTotal: number;
  token: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
  resolvedAt?: string;
  errorCode?: string;
  invoiceId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  idempotencyKey: string;
  userId: string;
  subscriptionId: string;
  organizationId?: string;
  planId: PlanId;
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  currency: 'COP' | 'USD';
  taxProfileSnapshot?: BillingTaxProfile;
  dianStatus: 'not_applicable' | 'pending_emission' | 'emitted';
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type:
    | 'trial_ending_soon'
    | 'payment_failed'
    | 'quorum_confirmed'
    | 'quorum_cancelled'
    | 'subscription_downgraded'
    | 'subscription_read_only';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  emailDispatchStatus: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

export interface Entitlements {
  canAccessStaticCatalog: boolean;
  canAccessAllStatic: boolean;
  maxDynamicCourses: number;
  effectiveActiveCourseSlugs: string[];
  canJoinLiveClasses: boolean;
  availableLiveCredits: number;
  canSubmitAssignments: boolean;
  canViewCertificates: boolean;
  canClaimCertificates: boolean;
  certificateRequiresConversion: boolean;
  campusTheme: 'campus-free' | 'campus-pro' | 'campus-pro-plus' | 'campus-enterprise';
  isReadOnly: boolean;
  readOnlyReason?: ReadOnlyReason;
}

// ============================================================================
// 1. CONFIGURACIÓN POR DEFECTO DE PLANES
// ============================================================================

export const DEFAULT_PLAN_CONFIGS: Record<StandardPlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Plan Free',
    priceMonthly: 0,
    taxRatePercent: 0,
    currency: 'COP',
    trialDays: 0,
    trialLiveCredits: 0,
    maxDynamicCourses: 0,
    monthlyLiveCredits: 0,
    allowsLiveAccess: false,
    allowsAllStatic: false,
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro',
    priceMonthly: 89000,
    taxRatePercent: 19,
    currency: 'COP',
    trialDays: 20,
    trialLiveCredits: 0,
    maxDynamicCourses: 1,
    monthlyLiveCredits: 0,
    allowsLiveAccess: false,
    allowsAllStatic: true,
  },
  pro_plus: {
    id: 'pro_plus',
    name: 'Plan Pro+',
    priceMonthly: 189000,
    taxRatePercent: 19,
    currency: 'COP',
    trialDays: 15,
    trialLiveCredits: 1, // 1 sesión en vivo de cortesía durante el trial de 15 días
    maxDynamicCourses: 3,
    monthlyLiveCredits: 8,
    allowsLiveAccess: true,
    allowsAllStatic: true,
  },
};

export function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

// ============================================================================
// 2. SERVICIO DE RELOJ INYECTABLE (CLOCK SERVICE)
// ============================================================================

export interface ClockService {
  now(): Date;
  advanceMs(ms: number): void;
  advanceDays(days: number): void;
  advanceHours(hours: number): void;
  setNow(date: Date | string): void;
}

export class SystemClockService implements ClockService {
  private virtualNow: number | null = null;
  private readonly allowManipulation: boolean;

  constructor(initialTime?: Date | string, forceAllowManipulation = false) {
    const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    this.allowManipulation = forceAllowManipulation || !isProd;
    if (initialTime && this.allowManipulation) {
      this.virtualNow = new Date(initialTime).getTime();
    }
  }

  now(): Date {
    if (this.allowManipulation && this.virtualNow !== null) {
      return new Date(this.virtualNow);
    }
    return new Date();
  }

  setNow(date: Date | string): void {
    if (!this.allowManipulation) {
      throw new Error('CLOCK_MANIPULATION_FORBIDDEN_IN_PRODUCTION');
    }
    this.virtualNow = new Date(date).getTime();
  }

  advanceMs(ms: number): void {
    if (!this.allowManipulation) {
      throw new Error('CLOCK_MANIPULATION_FORBIDDEN_IN_PRODUCTION');
    }
    const base = this.virtualNow ?? Date.now();
    this.virtualNow = base + ms;
  }

  advanceHours(hours: number): void {
    this.advanceMs(hours * 60 * 60 * 1000);
  }

  advanceDays(days: number): void {
    this.advanceMs(days * 24 * 60 * 60 * 1000);
  }
}

// ============================================================================
// 3. UTILIDADES DE CALENDARIO (BILLING ANCHOR) Y ANTIFRAUDE DE CORREOS
// ============================================================================

export function addDaysUtc(date: Date | string, days: number): Date {
  const d = new Date(date);
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addHoursUtc(date: Date | string, hours: number): Date {
  const d = new Date(date);
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Avanza exactamente 1 mes calendario respetando el billingAnchorDay (1..31).
 * Si el mes destino tiene menos días (ej. 28/29 en febrero o 30 en abril),
 * se ajusta al último día de ese mes sin perder el ancla para los meses siguientes.
 */
export function advanceCalendarMonth(fromDateIso: string | Date, billingAnchorDay: number): Date {
  const d = new Date(fromDateIso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0..11

  const targetMonthIndex = month + 1;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = targetMonthIndex % 12;

  // Último día del mes destino: día 0 del mes siguiente
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(Math.max(1, billingAnchorDay), daysInTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      normalizedTargetMonth,
      clampedDay,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'throwawaymail.com',
]);

/**
 * Normaliza el correo electrónico aplicando eliminación de puntos (.) y +alias
 * EXCLUSIVAMENTE a dominios de Gmail (gmail.com / googlemail.com).
 * En otros dominios corporativos o personales solo aplica trim().toLowerCase().
 */
export function normalizeEmailByDomain(rawEmail: string): string {
  const cleaned = (rawEmail || '').trim().toLowerCase();
  const parts = cleaned.split('@');
  if (parts.length !== 2) return cleaned;

  let [local, domain] = parts;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
}

export function isDisposableEmail(rawEmail: string): boolean {
  const cleaned = (rawEmail || '').trim().toLowerCase();
  const parts = cleaned.split('@');
  if (parts.length !== 2) return true;
  return DISPOSABLE_EMAIL_DOMAINS.has(parts[1]);
}

export function isCardExpired(pm: TokenizedPaymentMethod, now: Date): boolean {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1..12
  if (pm.expYear < currentYear) return true;
  if (pm.expYear === currentYear && pm.expMonth < currentMonth) return true;
  return false;
}

// ============================================================================
// 4. MOTOR PURO DE PERMISOS (COMPUTE ENTITLEMENTS)
// ============================================================================

export function freeEntitlements(): Entitlements {
  return {
    canAccessStaticCatalog: true,
    canAccessAllStatic: false,
    maxDynamicCourses: 0,
    effectiveActiveCourseSlugs: [],
    canJoinLiveClasses: false,
    availableLiveCredits: 0,
    canSubmitAssignments: false,
    canViewCertificates: true,
    canClaimCertificates: false,
    certificateRequiresConversion: false,
    campusTheme: 'campus-free',
    isReadOnly: false,
  };
}

export function readOnlyEntitlements(reason: ReadOnlyReason): Entitlements {
  return {
    ...freeEntitlements(),
    isReadOnly: true,
    readOnlyReason: reason,
  };
}

export function selectMostRecentCourses(
  activeSlugs: string[],
  activityMap: Record<string, string>,
  maxAllowed: number,
  preferredSlug?: string
): string[] {
  if (maxAllowed <= 0 || !Array.isArray(activeSlugs) || activeSlugs.length === 0) {
    return [];
  }
  if (activeSlugs.length <= maxAllowed) {
    return [...activeSlugs];
  }
  if (preferredSlug && activeSlugs.includes(preferredSlug) && maxAllowed === 1) {
    return [preferredSlug];
  }
  return [...activeSlugs]
    .sort((a, b) => (activityMap?.[b] ?? '').localeCompare(activityMap?.[a] ?? ''))
    .slice(0, maxAllowed);
}

export function computeEntitlements(
  sub: Subscription | null,
  org: Organization | null,
  orgMember: OrganizationMember | null,
  isWithinPurchasedSeatLimit: boolean,
  planConfigs: Record<StandardPlanId, PlanConfig>,
  now: Date
): Entitlements {
  if (!sub || sub.planId === 'free') {
    return freeEntitlements();
  }

  if (sub.status === 'read_only') {
    return readOnlyEntitlements(sub.readOnlyReason ?? 'expired');
  }

  const trialEnded = sub.trialEnd ? new Date(sub.trialEnd).getTime() <= now.getTime() : false;
  const periodEndDate = new Date(sub.currentPeriodEnd);
  const periodEnded = periodEndDate.getTime() <= now.getTime();
  const graceEnded = sub.graceEndsAt ? new Date(sub.graceEndsAt).getTime() <= now.getTime() : false;

  // 1. Cortes inmediatos por fechas vencidas
  if (sub.status === 'trial' && trialEnded && sub.cancelAtPeriodEnd) {
    return readOnlyEntitlements('trial_ended_cancelled');
  }
  if (sub.status === 'past_due' && graceEnded) {
    return readOnlyEntitlements('past_due_grace_ended');
  }
  if (sub.status === 'active' && periodEnded && sub.cancelAtPeriodEnd) {
    return readOnlyEntitlements('expired');
  }

  // 2. Tope de lag del cron (48 horas tras currentPeriodEnd sin renovar)
  const cronLagLimitMs = periodEndDate.getTime() + 48 * 60 * 60 * 1000;
  if (sub.status === 'active' && !sub.cancelAtPeriodEnd && now.getTime() > cronLagLimitMs) {
    return readOnlyEntitlements('renewal_overdue');
  }

  // 3. Evaluación en tiempo real de Downgrade pendiente
  let effectivePlanId: PlanId = sub.planId;
  let preferredDowngradeSlug: string | undefined;

  if (sub.pendingDowngrade && new Date(sub.pendingDowngrade.effectiveAt).getTime() <= now.getTime()) {
    effectivePlanId = sub.pendingDowngrade.targetPlanId;
    preferredDowngradeSlug = sub.pendingDowngrade.selectedDynamicCourseSlug;
    if (effectivePlanId === 'free') {
      return freeEntitlements();
    }
  }

  // 4. Resolución para "Your Plan" (Individual a la Medida o Corporativo)
  if (effectivePlanId === 'your_plan') {
    if (!sub.organizationId && !org) {
      const maxDyn = sub.adminOverrides?.maxDynamicCourses ?? 4;
      const liveAllowed = sub.adminOverrides?.allowLiveAccess ?? true;
      const effectiveSlugs = selectMostRecentCourses(
        sub.activeDynamicCourseSlugs,
        sub.courseLastActivityAt,
        maxDyn
      );
      return {
        canAccessStaticCatalog: true,
        canAccessAllStatic: true,
        maxDynamicCourses: maxDyn,
        effectiveActiveCourseSlugs: effectiveSlugs,
        canJoinLiveClasses: liveAllowed,
        availableLiveCredits: liveAllowed ? sub.remainingCredits : 0,
        canSubmitAssignments: true,
        canViewCertificates: true,
        canClaimCertificates: true,
        certificateRequiresConversion: false,
        campusTheme: 'campus-enterprise',
        isReadOnly: false,
      };
    }

    const customExpiry = sub.adminOverrides?.customExpiryDate;
    const effectiveOrgEnd = customExpiry || org?.currentPeriodEnd;
    const orgExpired = effectiveOrgEnd ? new Date(effectiveOrgEnd).getTime() <= now.getTime() : true;

    if (
      !org ||
      org.status !== 'active' ||
      orgExpired ||
      !isWithinPurchasedSeatLimit ||
      !orgMember ||
      orgMember.status !== 'active'
    ) {
      return readOnlyEntitlements('organization_invalid');
    }

    const orgInTrial = org.trialEnd ? new Date(org.trialEnd).getTime() > now.getTime() : false;
    const maxDyn = sub.adminOverrides?.maxDynamicCourses ?? org.customTerms.maxDynamicCoursesPerSeat;
    const liveAllowed = sub.adminOverrides?.allowLiveAccess ?? org.customTerms.allowLiveAccess;
    const effectiveSlugs = selectMostRecentCourses(
      sub.activeDynamicCourseSlugs,
      sub.courseLastActivityAt,
      maxDyn
    );

    return {
      canAccessStaticCatalog: true,
      canAccessAllStatic: true,
      maxDynamicCourses: maxDyn,
      effectiveActiveCourseSlugs: effectiveSlugs,
      canJoinLiveClasses: liveAllowed,
      availableLiveCredits: liveAllowed ? sub.remainingCredits : 0,
      canSubmitAssignments: true,
      canViewCertificates: true,
      canClaimCertificates: !orgInTrial,
      certificateRequiresConversion: orgInTrial,
      campusTheme: 'campus-enterprise',
      isReadOnly: false,
    };
  }

  // 5. Resolución para Pro y Pro+
  const config = planConfigs[effectivePlanId];
  if (!config) {
    return freeEntitlements();
  }

  const inActiveTrial = sub.status === 'trial' && !trialEnded;
  const trialPendingCharge = sub.status === 'trial' && trialEnded && !sub.cancelAtPeriodEnd;

  const maxDyn = sub.adminOverrides?.maxDynamicCourses ?? config.maxDynamicCourses;
  const defaultLiveAllowed = inActiveTrial
    ? config.allowsLiveAccess && config.trialLiveCredits > 0
    : config.allowsLiveAccess;
  const liveAllowed = sub.adminOverrides?.allowLiveAccess ?? defaultLiveAllowed;

  const effectiveSlugs = selectMostRecentCourses(
    sub.activeDynamicCourseSlugs,
    sub.courseLastActivityAt,
    maxDyn,
    preferredDowngradeSlug
  );

  return {
    canAccessStaticCatalog: true,
    canAccessAllStatic: config.allowsAllStatic,
    maxDynamicCourses: maxDyn,
    effectiveActiveCourseSlugs: effectiveSlugs,
    canJoinLiveClasses: liveAllowed,
    availableLiveCredits: liveAllowed ? sub.remainingCredits : 0,
    canSubmitAssignments: true,
    canViewCertificates: true,
    canClaimCertificates: !inActiveTrial && !trialPendingCharge && sub.status === 'active',
    certificateRequiresConversion: inActiveTrial || trialPendingCharge,
    campusTheme: effectivePlanId === 'pro_plus' ? 'campus-pro-plus' : 'campus-pro',
    isReadOnly: false,
  };
}

// ============================================================================
// 5. PASARELA DE PAGO SIMULADA CON IDEMPOTENCIA ESTRICTA Y TOKENIZACIÓN
// ============================================================================

export interface ChargeRequest {
  token: string;
  amount: number;
  idempotencyKey: string;
  description?: string;
}

export interface ChargeResponse {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  processedAt: string;
}

export class MockPaymentGateway {
  private idempotencyStore = new Map<
    string,
    { amount: number; token: string; response: ChargeResponse }
  >();
  private failingTokens = new Set<string>(['tok_fail_always', 'tok_declined']);
  private failOnceTokens = new Set<string>(['tok_fail_once']);
  private chargeCounter = 0;

  /**
   * Simula el Hosted Field / Tokenizador de la pasarela:
   * El PAN nunca llega a la lógica de negocio; el tokenizador devuelve token y cardFingerprint.
   */
  tokenizeCard(input: {
    panLast4: string;
    brand: 'visa' | 'mastercard' | 'amex';
    expMonth: number;
    expYear: number;
    cardholderName: string;
    rawCardIdentifierForFingerprint?: string;
    customToken?: string;
  }): TokenizedPaymentMethod {
    const cleanId = (input.rawCardIdentifierForFingerprint || `${input.brand}_${input.panLast4}_${input.expMonth}_${input.expYear}`)
      .trim()
      .toLowerCase();
    // Huella determinista emitida por el proveedor de pagos
    let hash = 5381;
    for (let i = 0; i < cleanId.length; i++) {
      hash = (hash * 33) ^ cleanId.charCodeAt(i);
    }
    const fp = `fp_gw_${(hash >>> 0).toString(16)}_${input.panLast4}`;
    const token = input.customToken || `tok_${input.brand}_${input.panLast4}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      token,
      cardFingerprint: fp,
      brand: input.brand,
      last4: input.panLast4,
      expMonth: input.expMonth,
      expYear: input.expYear,
      cardholderName: input.cardholderName,
    };
  }

  setTokenFailureMode(token: string, mode: 'always_fail' | 'fail_once' | 'succeed'): void {
    this.failingTokens.delete(token);
    this.failOnceTokens.delete(token);
    if (mode === 'always_fail') this.failingTokens.add(token);
    if (mode === 'fail_once') this.failOnceTokens.add(token);
  }

  async charge(req: ChargeRequest, now: Date = new Date()): Promise<ChargeResponse> {
    if (!req.idempotencyKey) {
      throw new Error('IDEMPOTENCY_KEY_REQUIRED');
    }

    const existing = this.idempotencyStore.get(req.idempotencyKey);
    if (existing) {
      if (existing.amount !== req.amount || existing.token !== req.token) {
        throw new Error('IDEMPOTENCY_PARAMETER_MISMATCH');
      }
      return existing.response;
    }

    let response: ChargeResponse;
    if (this.failingTokens.has(req.token)) {
      response = {
        success: false,
        errorCode: 'CARD_DECLINED',
        processedAt: now.toISOString(),
      };
    } else if (this.failOnceTokens.has(req.token)) {
      this.failOnceTokens.delete(req.token);
      response = {
        success: false,
        errorCode: 'INSUFFICIENT_FUNDS_TEMPORARY',
        processedAt: now.toISOString(),
      };
    } else {
      this.chargeCounter += 1;
      response = {
        success: true,
        transactionId: `ch_ipt_${this.chargeCounter}_${now.getTime()}`,
        processedAt: now.toISOString(),
      };
    }

    this.idempotencyStore.set(req.idempotencyKey, {
      amount: req.amount,
      token: req.token,
      response,
    });

    return response;
  }

  getTotalSuccessfulCharges(): number {
    let count = 0;
    for (const item of this.idempotencyStore.values()) {
      if (item.response.success) count++;
    }
    return count;
  }
}

// ============================================================================
// 6. SERVICIO TRANSACCIONAL DE PLATAFORMA (SUBSCRIPTION PLATFORM SERVICE)
// ============================================================================

export class SubscriptionPlatformService {
  public planConfigs: Record<StandardPlanId, PlanConfig> = structuredClone(DEFAULT_PLAN_CONFIGS);
  public users = new Map<string, UserProfile>();
  public subscriptions = new Map<string, Subscription>();
  public organizations = new Map<string, Organization>();
  public organizationMembers = new Map<string, OrganizationMember>();
  public cardFingerprints = new Map<string, CardFingerprintRecord>();
  public liveSessions = new Map<string, LiveSession>();
  public liveBookings = new Map<string, LiveBooking>();
  public paymentAttempts = new Map<string, PaymentAttempt>();
  public invoices = new Map<string, Invoice>();
  public notifications = new Map<string, UserNotification>();
  public allowedDynamicCourseSlugs = new Set<string>([
    'ipt-master-fullstack',
    'arquitectura-software-ia-ipt',
    'arquitectura-cloud-ipt',
    'sistemas-distribuidos-ipt',
  ]);
  public freeStaticCourseSlugs = new Set<string>(['introduccion-ingenieria-ipt']);

  private mutexQueue: Promise<unknown> = Promise.resolve();
  private invoiceSeq = 1;

  constructor(
    public readonly clock: ClockService = new SystemClockService(),
    public readonly gateway: MockPaymentGateway = new MockPaymentGateway()
  ) {}

  /**
   * Ejecuta un bloque de forma estrictamente serializada y atómica (ACID en memoria / transacción).
   * Si el callback lanza un error, se hace rollback automático del snapshot previo.
   */
  private async runTransaction<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = this.mutexQueue;
    let release!: () => void;
    this.mutexQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await prev;
    const snapshot = {
      users: structuredClone(this.users),
      subscriptions: structuredClone(this.subscriptions),
      organizations: structuredClone(this.organizations),
      organizationMembers: structuredClone(this.organizationMembers),
      cardFingerprints: structuredClone(this.cardFingerprints),
      liveSessions: structuredClone(this.liveSessions),
      liveBookings: structuredClone(this.liveBookings),
      paymentAttempts: structuredClone(this.paymentAttempts),
      invoices: structuredClone(this.invoices),
      notifications: structuredClone(this.notifications),
      invoiceSeq: this.invoiceSeq,
    };

    try {
      const result = await fn();
      return result;
    } catch (err) {
      // Rollback completo de estado de negocio
      this.users = snapshot.users;
      this.subscriptions = snapshot.subscriptions;
      this.organizations = snapshot.organizations;
      this.organizationMembers = snapshot.organizationMembers;
      this.cardFingerprints = snapshot.cardFingerprints;
      this.liveSessions = snapshot.liveSessions;
      this.liveBookings = snapshot.liveBookings;
      this.paymentAttempts = snapshot.paymentAttempts;
      this.invoices = snapshot.invoices;
      this.notifications = snapshot.notifications;
      this.invoiceSeq = snapshot.invoiceSeq;
      throw err;
    } finally {
      release();
    }
  }

  // --------------------------------------------------------------------------
  // Helpers de Organización y Entitlements
  // --------------------------------------------------------------------------

  public getActiveOrgMembersSorted(orgId: string): OrganizationMember[] {
    return Array.from(this.organizationMembers.values())
      .filter((m) => m.organizationId === orgId && m.status === 'active')
      .sort((a, b) => a.assignedAt.localeCompare(b.assignedAt));
  }

  public isMemberWithinSeatLimit(org: Organization | null, member: OrganizationMember | null): boolean {
    if (!org || !member || member.status !== 'active') return false;
    const sorted = this.getActiveOrgMembersSorted(org.id);
    const idx = sorted.findIndex((m) => m.id === member.id);
    return idx !== -1 && idx < org.totalSeatsPurchased;
  }

  public getEntitlementsForSubscription(sub: Subscription | null, nowOverride?: Date): Entitlements {
    const now = nowOverride ?? this.clock.now();
    if (!sub) return freeEntitlements();

    const org = sub.organizationId ? this.organizations.get(sub.organizationId) ?? null : null;
    const member = sub.organizationId
      ? Array.from(this.organizationMembers.values()).find(
          (m) => m.organizationId === sub.organizationId && m.userId === sub.userId
        ) ?? null
      : null;
    const withinLimit = this.isMemberWithinSeatLimit(org, member);

    return computeEntitlements(sub, org, member, withinLimit, this.planConfigs, now);
  }

  // --------------------------------------------------------------------------
  // Notificaciones Idempotentes (Bandeja In-App + Cola Email)
  // --------------------------------------------------------------------------

  private emitNotification(params: {
    idempotencyKey: string;
    userId: string;
    type: UserNotification['type'];
    title: string;
    message: string;
    actionUrl?: string;
    now: Date;
  }): UserNotification {
    const existing = this.notifications.get(params.idempotencyKey);
    if (existing) return existing;

    const notif: UserNotification = {
      id: params.idempotencyKey,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      read: false,
      emailDispatchStatus: 'sent',
      createdAt: params.now.toISOString(),
    };
    this.notifications.set(notif.id, notif);
    return notif;
  }

  // --------------------------------------------------------------------------
  // Patrón Outbox de Cobros + Emisión de Factura con Desglose IVA / DIAN
  // --------------------------------------------------------------------------

  private async executeOutboxCharge(params: {
    idempotencyKey: string;
    subscription: Subscription;
    operation: PaymentAttempt['operation'];
    planIdForInvoice: PlanId;
    subtotalAmount: number;
    taxRatePercent: number;
    now: Date;
  }): Promise<{ success: boolean; invoice?: Invoice; errorCode?: string }> {
    const { idempotencyKey, subscription, operation, planIdForInvoice, subtotalAmount, taxRatePercent, now } = params;

    if (!subscription.paymentMethod?.token) {
      subscription.paymentMethod = this.gateway.tokenizeCard({
        panLast4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2030,
        cardholderName: 'Titular IPT (Simulado)',
      });
    }

    const taxAmount = Math.round(subtotalAmount * (taxRatePercent / 100));
    const totalAmount = subtotalAmount + taxAmount;

    // 1. Registrar Outbox en estado pending
    const attempt: PaymentAttempt = {
      idempotencyKey,
      subscriptionId: subscription.id,
      userId: subscription.userId,
      operation,
      amountSubtotal: subtotalAmount,
      taxRatePercent,
      amountTax: taxAmount,
      amountTotal: totalAmount,
      token: subscription.paymentMethod!.token,
      status: 'pending',
      createdAt: now.toISOString(),
    };
    this.paymentAttempts.set(idempotencyKey, attempt);

    // 2. Ejecutar cargo contra la pasarela
    const chargeRes = await this.gateway.charge(
      {
        token: subscription.paymentMethod!.token,
        amount: totalAmount,
        idempotencyKey,
      },
      now
    );

    // 3. Reconciliar resultado
    if (chargeRes.success) {
      const user = this.users.get(subscription.userId);
      const existingInvoice = Array.from(this.invoices.values()).find(
        (inv) => inv.idempotencyKey === idempotencyKey
      );
      let invoice = existingInvoice;

      if (!invoice) {
        const invNum = `IPT-${now.getUTCFullYear()}-${String(this.invoiceSeq++).padStart(6, '0')}`;
        invoice = {
          id: `inv_${idempotencyKey}`,
          invoiceNumber: invNum,
          idempotencyKey,
          userId: subscription.userId,
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId,
          planId: planIdForInvoice,
          subtotal: subtotalAmount,
          taxRatePercent,
          taxAmount,
          total: totalAmount,
          currency: 'COP',
          taxProfileSnapshot: user?.taxProfile ? structuredClone(user.taxProfile) : undefined,
          dianStatus: user?.taxProfile ? 'pending_emission' : 'not_applicable',
          createdAt: now.toISOString(),
        };
        this.invoices.set(invoice.id, invoice);
      }

      attempt.status = 'succeeded';
      attempt.resolvedAt = now.toISOString();
      attempt.invoiceId = invoice.id;
      this.paymentAttempts.set(idempotencyKey, attempt);

      return { success: true, invoice };
    } else {
      attempt.status = 'failed';
      attempt.resolvedAt = now.toISOString();
      attempt.errorCode = chargeRes.errorCode || 'PAYMENT_FAILED';
      this.paymentAttempts.set(idempotencyKey, attempt);

      return { success: false, errorCode: attempt.errorCode };
    }
  }

  // --------------------------------------------------------------------------
  // Limpieza de Reservas Futuras al pasar a Read-Only o Sin Acceso Live
  // --------------------------------------------------------------------------

  private cancelFutureBookingsForSubscription(subId: string, now: Date): void {
    for (const booking of this.liveBookings.values()) {
      if (booking.subscriptionId === subId && booking.status === 'confirmed') {
        const session = this.liveSessions.get(booking.sessionId);
        if (session && new Date(session.startTime).getTime() > now.getTime()) {
          booking.status = 'cancelled_subscription_inactive';
          booking.cancelledOrRefundedAt = now.toISOString();
          this.liveBookings.set(booking.id, booking);

          if (session.bookedCount > 0) {
            session.bookedCount -= 1;
            this.liveSessions.set(session.id, session);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Registro de Usuario y Migración de Existentes a Free
  // --------------------------------------------------------------------------

  public registerUser(params: {
    uid: string;
    email: string;
    displayName: string;
    phoneVerified?: boolean;
    taxProfile?: BillingTaxProfile;
  }): UserProfile {
    if (isDisposableEmail(params.email)) {
      throw new Error('DISPOSABLE_EMAIL_FORBIDDEN');
    }
    const canonical = normalizeEmailByDomain(params.email);
    // Verificar duplicado canónico
    for (const u of this.users.values()) {
      if (u.canonicalEmail === canonical && u.uid !== params.uid) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }
    }

    const now = this.clock.now();
    const profile: UserProfile = {
      uid: params.uid,
      email: params.email.trim().toLowerCase(),
      canonicalEmail: canonical,
      displayName: params.displayName.trim(),
      phoneVerified: params.phoneVerified ?? true,
      hasUsedTrial: false,
      taxProfile: params.taxProfile,
      createdAt: now.toISOString(),
    };
    this.users.set(profile.uid, profile);
    return profile;
  }

  /**
   * Migración directa e idempotente de usuarios existentes al Plan Free:
   * Conserva sus certificados y notas previas y mantiene hasUsedTrial = false.
   */
  public migrateExistingUsersToFree(existingUsers: Array<{ uid: string; email: string; displayName: string }>): {
    migratedCount: number;
  } {
    const now = this.clock.now();
    let migratedCount = 0;

    for (const raw of existingUsers) {
      if (!this.users.has(raw.uid)) {
        const canonical = normalizeEmailByDomain(raw.email);
        this.users.set(raw.uid, {
          uid: raw.uid,
          email: raw.email.trim().toLowerCase(),
          canonicalEmail: canonical,
          displayName: raw.displayName,
          phoneVerified: true,
          hasUsedTrial: false,
          createdAt: now.toISOString(),
        });
      }

      const hasSub = Array.from(this.subscriptions.values()).some((s) => s.userId === raw.uid);
      if (!hasSub) {
        const subId = `sub_free_${raw.uid}`;
        const anchor = now.getUTCDate();
        const nextPeriod = advanceCalendarMonth(now, anchor);
        this.subscriptions.set(subId, {
          id: subId,
          userId: raw.uid,
          planId: 'free',
          status: 'active',
          cancelAtPeriodEnd: false,
          billingAnchorDay: anchor,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: nextPeriod.toISOString(),
          paymentRetryCount: 0,
          activeDynamicCourseSlugs: [],
          frozenDynamicCourseSlugs: [],
          courseLastActivityAt: {},
          monthlyCreditsAllowance: 0,
          remainingCredits: 0,
          creditsConsumedInCycle: 0,
          creditsResetAt: nextPeriod.toISOString(),
        });
        migratedCount++;
      }
    }

    return { migratedCount };
  }

  // --------------------------------------------------------------------------
  // Inicio de Trial con Blindaje Antifraude Atómico
  // --------------------------------------------------------------------------

  public async startTrial(params: {
    userId: string;
    planId: 'pro' | 'pro_plus';
    paymentMethod: TokenizedPaymentMethod;
    initialDynamicCourseSlug?: string;
  }): Promise<Subscription> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const user = this.users.get(params.userId);
      if (!user) throw new Error('USER_NOT_FOUND');

      if (isDisposableEmail(user.email)) {
        throw new Error('DISPOSABLE_EMAIL_FORBIDDEN');
      }
      if (!user.phoneVerified) {
        throw new Error('PHONE_VERIFICATION_REQUIRED');
      }
      if (user.hasUsedTrial) {
        throw new Error('TRIAL_ALREADY_USED');
      }
      if (isCardExpired(params.paymentMethod, now)) {
        throw new Error('PAYMENT_METHOD_EXPIRED');
      }

      const fp = params.paymentMethod.cardFingerprint;
      const existingFp = this.cardFingerprints.get(fp);
      if (existingFp && existingFp.firstUsedByUid !== user.uid && !existingFp.allowedExemptionByAdmin) {
        throw new Error('CARD_FINGERPRINT_ALREADY_USED_FOR_TRIAL');
      }

      const config = this.planConfigs[params.planId];
      if (!config || config.trialDays <= 0) {
        throw new Error('INVALID_TRIAL_PLAN');
      }

      const trialEnd = addDaysUtc(now, config.trialDays);
      const anchor = trialEnd.getUTCDate();

      const initialCourses: string[] = [];
      const activityMap: Record<string, string> = {};
      if (params.initialDynamicCourseSlug) {
        if (!this.allowedDynamicCourseSlugs.has(params.initialDynamicCourseSlug)) {
          throw new Error('COURSE_NOT_ALLOWED_AS_DYNAMIC');
        }
        initialCourses.push(params.initialDynamicCourseSlug);
        activityMap[params.initialDynamicCourseSlug] = now.toISOString();
      }

      // Escribir hasUsedTrial y huella de tarjeta en la MISMA transacción atómica
      user.hasUsedTrial = true;
      user.trialUsedAt = now.toISOString();
      user.trialPlanId = params.planId;
      this.users.set(user.uid, user);

      if (!existingFp) {
        this.cardFingerprints.set(fp, {
          fingerprint: fp,
          firstUsedByUid: user.uid,
          firstUsedAt: now.toISOString(),
        });
      }

      // Si el usuario tenía una suscripción Free previa, reutilizar su ID o actualizarla
      const existingSub = Array.from(this.subscriptions.values()).find((s) => s.userId === user.uid);
      const subId = existingSub ? existingSub.id : `sub_${user.uid}`;

      const sub: Subscription = {
        id: subId,
        userId: user.uid,
        planId: params.planId,
        status: 'trial',
        cancelAtPeriodEnd: false,
        readOnlyReason: null,
        billingAnchorDay: anchor,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString(),
        paymentRetryCount: 0,
        activeDynamicCourseSlugs: initialCourses,
        frozenDynamicCourseSlugs: existingSub?.frozenDynamicCourseSlugs ?? [],
        courseLastActivityAt: activityMap,
        dynamicCourseLastChangedAt: initialCourses.length > 0 ? now.toISOString() : null,
        // Crédito de cortesía explícito desde config.trialLiveCredits (1 en Pro+, 0 en Pro)
        monthlyCreditsAllowance: config.trialLiveCredits,
        remainingCredits: config.trialLiveCredits,
        creditsConsumedInCycle: 0,
        creditsResetAt: trialEnd.toISOString(),
        paymentMethod: structuredClone(params.paymentMethod),
      };

      this.subscriptions.set(sub.id, sub);
      return structuredClone(sub);
    });
  }

  public approveCardFingerprintExemption(params: {
    fingerprint: string;
    adminEmail: string;
    notes: string;
  }): CardFingerprintRecord {
    const existing = this.cardFingerprints.get(params.fingerprint);
    if (!existing) {
      throw new Error('FINGERPRINT_NOT_FOUND');
    }
    existing.allowedExemptionByAdmin = true;
    existing.exemptionApprovedBy = params.adminEmail;
    existing.exemptionNotes = params.notes;
    this.cardFingerprints.set(params.fingerprint, existing);
    return structuredClone(existing);
  }

  // --------------------------------------------------------------------------
  // Certificación Anticipada en Trial (Conversión Inmediata a Active)
  // --------------------------------------------------------------------------

  public async convertTrialForCertificate(subId: string): Promise<{
    subscription: Subscription;
    invoice: Invoice;
  }> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const sub = this.subscriptions.get(subId);
      if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
      if (sub.status !== 'trial') {
        throw new Error('SUBSCRIPTION_NOT_IN_TRIAL');
      }
      if (sub.planId === 'free' || sub.planId === 'your_plan') {
        throw new Error('INVALID_PLAN_FOR_TRIAL_CONVERSION');
      }

      const config = this.planConfigs[sub.planId];
      const idempotencyKey = `early_cert_${sub.id}_${sub.trialStart}_${now.getTime()}`;

      const chargeResult = await this.executeOutboxCharge({
        idempotencyKey,
        subscription: sub,
        operation: 'early_cert',
        planIdForInvoice: sub.planId,
        subtotalAmount: config.priceMonthly,
        taxRatePercent: config.taxRatePercent,
        now,
      });

      if (!chargeResult.success || !chargeResult.invoice) {
        throw new Error(`EARLY_CONVERSION_PAYMENT_FAILED:${chargeResult.errorCode}`);
      }

      const anchor = now.getUTCDate();
      const nextPeriodEnd = advanceCalendarMonth(now, anchor);

      sub.status = 'active';
      sub.cancelAtPeriodEnd = false;
      sub.billingAnchorDay = anchor;
      sub.currentPeriodStart = now.toISOString();
      sub.currentPeriodEnd = nextPeriodEnd.toISOString();
      sub.monthlyCreditsAllowance = config.monthlyLiveCredits;
      sub.remainingCredits = config.monthlyLiveCredits;
      sub.creditsConsumedInCycle = 0;
      sub.creditsResetAt = nextPeriodEnd.toISOString();
      sub.lastProcessedPeriodStart = now.toISOString();

      this.subscriptions.set(sub.id, sub);
      return {
        subscription: structuredClone(sub),
        invoice: structuredClone(chargeResult.invoice),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Upgrade (Desde Trial o Prorrateado a Mitad de Ciclo con Anti-Arbitraje)
  // --------------------------------------------------------------------------

  public async upgradeSubscription(params: {
    subId: string;
    targetPlanId: 'pro' | 'pro_plus';
    newCardInput?: {
      panLast4: string;
      brand?: 'visa' | 'mastercard' | 'amex';
      expMonth?: number;
      expYear?: number;
      cardholderName?: string;
    };
  }): Promise<{ subscription: Subscription; invoice: Invoice }> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const sub = this.subscriptions.get(params.subId);
      if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

      const targetConfig = this.planConfigs[params.targetPlanId];
      if (!targetConfig) throw new Error('TARGET_PLAN_INVALID');

      if (sub.planId === params.targetPlanId && sub.status === 'active') {
        throw new Error('ALREADY_ON_TARGET_PLAN');
      }
      if (sub.planId === 'pro_plus' && params.targetPlanId === 'pro') {
        throw new Error('USE_SCHEDULE_DOWNGRADE_FOR_LOWER_PLAN');
      }

      // Asegurar método de pago para el cobro
      if (params.newCardInput) {
        sub.paymentMethod = this.gateway.tokenizeCard({
          panLast4: params.newCardInput.panLast4 || '4242',
          brand: params.newCardInput.brand || 'visa',
          expMonth: params.newCardInput.expMonth || 12,
          expYear: params.newCardInput.expYear || 2030,
          cardholderName: params.newCardInput.cardholderName || 'Titular IPT (Simulado)',
        });
      } else if (!sub.paymentMethod?.token) {
        sub.paymentMethod = this.gateway.tokenizeCard({
          panLast4: '4242',
          brand: 'visa',
          expMonth: 12,
          expYear: 2030,
          cardholderName: 'Titular IPT (Simulado)',
        });
      }

      // Caso 0: Upgrade directo desde Plan Free
      if (sub.planId === 'free') {
        const idempotencyKey = `upgrade_free_${sub.id}_${now.toISOString()}_${params.targetPlanId}`;
        const chargeResult = await this.executeOutboxCharge({
          idempotencyKey,
          subscription: sub,
          operation: 'upgrade',
          planIdForInvoice: params.targetPlanId,
          subtotalAmount: targetConfig.priceMonthly,
          taxRatePercent: targetConfig.taxRatePercent,
          now,
        });

        if (!chargeResult.success || !chargeResult.invoice) {
          throw new Error(`UPGRADE_PAYMENT_FAILED:${chargeResult.errorCode}`);
        }

        const anchor = now.getUTCDate();
        const nextEnd = advanceCalendarMonth(now, anchor);

        sub.planId = params.targetPlanId;
        sub.status = 'active';
        sub.cancelAtPeriodEnd = false;
        sub.pendingDowngrade = null;
        sub.billingAnchorDay = anchor;
        sub.currentPeriodStart = now.toISOString();
        sub.currentPeriodEnd = nextEnd.toISOString();
        sub.monthlyCreditsAllowance = targetConfig.monthlyLiveCredits;
        sub.remainingCredits = targetConfig.monthlyLiveCredits;
        sub.creditsConsumedInCycle = 0;
        sub.creditsResetAt = nextEnd.toISOString();
        this.unfreezeCoursesUpToLimit(sub, targetConfig.maxDynamicCourses);

        this.subscriptions.set(sub.id, sub);
        return {
          subscription: structuredClone(sub),
          invoice: structuredClone(chargeResult.invoice),
        };
      }

      // Caso 1: Upgrade durante el Trial -> Termina trial, cobra mes completo del nuevo plan
      if (sub.status === 'trial') {
        const idempotencyKey = `upgrade_trial_${sub.id}_${sub.trialStart}_${params.targetPlanId}`;
        const chargeResult = await this.executeOutboxCharge({
          idempotencyKey,
          subscription: sub,
          operation: 'upgrade',
          planIdForInvoice: params.targetPlanId,
          subtotalAmount: targetConfig.priceMonthly,
          taxRatePercent: targetConfig.taxRatePercent,
          now,
        });

        if (!chargeResult.success || !chargeResult.invoice) {
          throw new Error(`UPGRADE_PAYMENT_FAILED:${chargeResult.errorCode}`);
        }

        const anchor = now.getUTCDate();
        const nextEnd = advanceCalendarMonth(now, anchor);

        sub.planId = params.targetPlanId;
        sub.status = 'active';
        sub.cancelAtPeriodEnd = false;
        sub.pendingDowngrade = null;
        sub.billingAnchorDay = anchor;
        sub.currentPeriodStart = now.toISOString();
        sub.currentPeriodEnd = nextEnd.toISOString();
        sub.monthlyCreditsAllowance = targetConfig.monthlyLiveCredits;
        sub.remainingCredits = targetConfig.monthlyLiveCredits;
        sub.creditsConsumedInCycle = 0;
        sub.creditsResetAt = nextEnd.toISOString();
        this.unfreezeCoursesUpToLimit(sub, targetConfig.maxDynamicCourses);

        this.subscriptions.set(sub.id, sub);
        return {
          subscription: structuredClone(sub),
          invoice: structuredClone(chargeResult.invoice),
        };
      }

      if (sub.status !== 'active') {
        throw new Error('UPGRADE_REQUIRES_ACTIVE_OR_TRIAL_STATUS');
      }

      // Caso 2: Upgrade desde Active a mitad de ciclo (Prorrateo exacto sobre días reales del ciclo)
      const currentConfig = this.planConfigs[sub.planId as StandardPlanId];
      const startMs = new Date(sub.currentPeriodStart).getTime();
      const endMs = new Date(sub.currentPeriodEnd).getTime();
      const totalCycleMs = Math.max(1, endMs - startMs);
      const remainingMs = Math.max(0, endMs - now.getTime());
      const fractionRemaining = Math.min(1, remainingMs / totalCycleMs);

      const priceDiff = Math.max(0, targetConfig.priceMonthly - (currentConfig?.priceMonthly ?? 0));
      const proratedSubtotal = Math.max(0, Math.round(priceDiff * fractionRemaining));

      const idempotencyKey = `upgrade_${sub.id}_${sub.currentPeriodStart}_${params.targetPlanId}`;
      const chargeResult = await this.executeOutboxCharge({
        idempotencyKey,
        subscription: sub,
        operation: 'upgrade',
        planIdForInvoice: params.targetPlanId,
        subtotalAmount: proratedSubtotal,
        taxRatePercent: targetConfig.taxRatePercent,
        now,
      });

      if (!chargeResult.success || !chargeResult.invoice) {
        throw new Error(`UPGRADE_PAYMENT_FAILED:${chargeResult.errorCode}`);
      }

      // Créditos proporcionales a la fracción restante del ciclo menos los ya consumidos (Anti-abuso día 29)
      const proportionalAllowance = Math.floor(targetConfig.monthlyLiveCredits * fractionRemaining);
      const newRemainingCredits = Math.max(0, proportionalAllowance - sub.creditsConsumedInCycle);

      sub.planId = params.targetPlanId;
      sub.pendingDowngrade = null;
      sub.monthlyCreditsAllowance = proportionalAllowance;
      sub.remainingCredits = newRemainingCredits;
      this.unfreezeCoursesUpToLimit(sub, targetConfig.maxDynamicCourses);

      this.subscriptions.set(sub.id, sub);
      return {
        subscription: structuredClone(sub),
        invoice: structuredClone(chargeResult.invoice),
      };
    });
  }

  private unfreezeCoursesUpToLimit(sub: Subscription, maxAllowed: number): void {
    sub.frozenDynamicCourseSlugs = Array.isArray(sub.frozenDynamicCourseSlugs) ? sub.frozenDynamicCourseSlugs : [];
    sub.activeDynamicCourseSlugs = Array.isArray(sub.activeDynamicCourseSlugs) ? sub.activeDynamicCourseSlugs : [];
    sub.courseLastActivityAt = sub.courseLastActivityAt || {};
    if (sub.frozenDynamicCourseSlugs.length === 0) return;
    const sortedFrozen = [...sub.frozenDynamicCourseSlugs].sort((a, b) =>
      (sub.courseLastActivityAt[b] ?? '').localeCompare(sub.courseLastActivityAt[a] ?? '')
    );

    while (sub.activeDynamicCourseSlugs.length < maxAllowed && sortedFrozen.length > 0) {
      const nextCourse = sortedFrozen.shift()!;
      if (!sub.activeDynamicCourseSlugs.includes(nextCourse)) {
        sub.activeDynamicCourseSlugs.push(nextCourse);
      }
    }
    sub.frozenDynamicCourseSlugs = sortedFrozen;
  }

  // --------------------------------------------------------------------------
  // Downgrade Diferido, Cancelación, Deshacer Cancelación y Reactivación
  // --------------------------------------------------------------------------

  public scheduleDowngrade(params: {
    subId: string;
    targetPlanId: 'free' | 'pro';
    selectedDynamicCourseSlug?: string;
  }): Subscription {
    const sub = this.subscriptions.get(params.subId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    if (sub.status !== 'active' && sub.status !== 'trial') {
      throw new Error('CANNOT_DOWNGRADE_INACTIVE_SUBSCRIPTION');
    }

    const effectiveAt = sub.status === 'trial' ? sub.trialEnd! : sub.currentPeriodEnd;
    sub.pendingDowngrade = {
      targetPlanId: params.targetPlanId,
      effectiveAt,
      selectedDynamicCourseSlug: params.selectedDynamicCourseSlug,
    };
    this.subscriptions.set(sub.id, sub);
    return structuredClone(sub);
  }

  public cancelSubscription(subId: string): Subscription {
    const sub = this.subscriptions.get(subId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    sub.cancelAtPeriodEnd = true;
    this.subscriptions.set(sub.id, sub);
    return structuredClone(sub);
  }

  /**
   * Caso inverso a cancelar: Deshacer la cancelación antes de la fecha de corte sin cobro.
   */
  public resumeSubscription(subId: string): Subscription {
    const now = this.clock.now();
    const sub = this.subscriptions.get(subId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    if (sub.status === 'read_only') {
      throw new Error('USE_REACTIVATE_FOR_READ_ONLY_SUBSCRIPTION');
    }
    const cutoff = sub.status === 'trial' ? new Date(sub.trialEnd!) : new Date(sub.currentPeriodEnd);
    if (now.getTime() >= cutoff.getTime()) {
      throw new Error('PERIOD_ALREADY_ENDED_USE_REACTIVATE');
    }
    sub.cancelAtPeriodEnd = false;
    this.subscriptions.set(sub.id, sub);
    return structuredClone(sub);
  }

  /**
   * Reactivación limpia desde read_only:
   * Reutiliza la suscripción, verifica que la tarjeta no esté vencida, cobra el nuevo ciclo,
   * limpia las banderas de mora/lectura y descongela los cursos previos.
   */
  public async reactivateSubscription(params: {
    subId: string;
    targetPlanId?: 'pro' | 'pro_plus';
    newPaymentMethod?: TokenizedPaymentMethod;
  }): Promise<{ subscription: Subscription; invoice: Invoice }> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const sub = this.subscriptions.get(params.subId);
      if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
      if (sub.status !== 'read_only') {
        throw new Error('SUBSCRIPTION_IS_NOT_READ_ONLY');
      }

      if (params.newPaymentMethod) {
        sub.paymentMethod = structuredClone(params.newPaymentMethod);
      }
      if (!sub.paymentMethod) {
        sub.paymentMethod = this.gateway.tokenizeCard({
          panLast4: '4242',
          brand: 'visa',
          expMonth: 12,
          expYear: 2030,
          cardholderName: 'Titular IPT (Simulado)',
        });
      }
      if (isCardExpired(sub.paymentMethod!, now)) {
        throw new Error('PAYMENT_METHOD_EXPIRED');
      }

      const planToActivate: 'pro' | 'pro_plus' =
        params.targetPlanId ?? (sub.planId === 'pro_plus' ? 'pro_plus' : 'pro');
      const config = this.planConfigs[planToActivate];

      const idempotencyKey = `reactivate_${sub.id}_${now.toISOString()}`;
      const chargeResult = await this.executeOutboxCharge({
        idempotencyKey,
        subscription: sub,
        operation: 'reactivate',
        planIdForInvoice: planToActivate,
        subtotalAmount: config.priceMonthly,
        taxRatePercent: config.taxRatePercent,
        now,
      });

      if (!chargeResult.success || !chargeResult.invoice) {
        throw new Error(`REACTIVATION_PAYMENT_FAILED:${chargeResult.errorCode}`);
      }

      const anchor = now.getUTCDate();
      const nextEnd = advanceCalendarMonth(now, anchor);

      sub.planId = planToActivate;
      sub.status = 'active';
      sub.cancelAtPeriodEnd = false;
      sub.readOnlyReason = null;
      sub.graceStartedAt = null;
      sub.graceEndsAt = null;
      sub.nextRetryAt = null;
      sub.paymentRetryCount = 0;
      sub.pendingDowngrade = null;
      sub.billingAnchorDay = anchor;
      sub.currentPeriodStart = now.toISOString();
      sub.currentPeriodEnd = nextEnd.toISOString();
      sub.lastProcessedPeriodStart = now.toISOString();
      sub.monthlyCreditsAllowance = config.monthlyLiveCredits;
      sub.remainingCredits = config.monthlyLiveCredits;
      sub.creditsConsumedInCycle = 0;
      sub.creditsResetAt = nextEnd.toISOString();

      this.unfreezeCoursesUpToLimit(sub, config.maxDynamicCourses);

      this.subscriptions.set(sub.id, sub);
      return {
        subscription: structuredClone(sub),
        invoice: structuredClone(chargeResult.invoice),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Selección y Rotación de Cursos Dinámicos
  // --------------------------------------------------------------------------

  public activateDynamicCourse(params: {
    subId: string;
    courseSlug: string;
    replaceCourseSlug?: string;
  }): Subscription {
    const now = this.clock.now();
    const sub = this.subscriptions.get(params.subId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

    if (!this.allowedDynamicCourseSlugs.has(params.courseSlug)) {
      throw new Error('COURSE_NOT_IN_DYNAMIC_CATALOG');
    }

    const ent = this.getEntitlementsForSubscription(sub, now);
    if (ent.isReadOnly || ent.maxDynamicCourses <= 0) {
      throw new Error('NO_DYNAMIC_COURSE_ENTITLEMENT');
    }

    if (sub.activeDynamicCourseSlugs.includes(params.courseSlug)) {
      sub.courseLastActivityAt[params.courseSlug] = now.toISOString();
      this.subscriptions.set(sub.id, sub);
      return structuredClone(sub);
    }

    if (sub.activeDynamicCourseSlugs.length < ent.maxDynamicCourses) {
      sub.activeDynamicCourseSlugs.push(params.courseSlug);
      sub.frozenDynamicCourseSlugs = sub.frozenDynamicCourseSlugs.filter((s) => s !== params.courseSlug);
      sub.courseLastActivityAt[params.courseSlug] = now.toISOString();
      sub.dynamicCourseLastChangedAt = now.toISOString();
      this.subscriptions.set(sub.id, sub);
      return structuredClone(sub);
    }

    // Si el cupo está lleno y desea rotar de curso (permitido 1 vez cada 30 días)
    if (!params.replaceCourseSlug || !sub.activeDynamicCourseSlugs.includes(params.replaceCourseSlug)) {
      throw new Error('MAX_DYNAMIC_COURSES_REACHED');
    }

    if (sub.dynamicCourseLastChangedAt) {
      const daysSinceChange =
        (now.getTime() - new Date(sub.dynamicCourseLastChangedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceChange < 30) {
        throw new Error('DYNAMIC_COURSE_SWAP_COOLDOWN_ACTIVE');
      }
    }

    sub.activeDynamicCourseSlugs = sub.activeDynamicCourseSlugs.map((slug) =>
      slug === params.replaceCourseSlug ? params.courseSlug : slug
    );
    if (!sub.frozenDynamicCourseSlugs.includes(params.replaceCourseSlug)) {
      sub.frozenDynamicCourseSlugs.push(params.replaceCourseSlug);
    }
    sub.frozenDynamicCourseSlugs = sub.frozenDynamicCourseSlugs.filter((s) => s !== params.courseSlug);
    sub.courseLastActivityAt[params.courseSlug] = now.toISOString();
    sub.dynamicCourseLastChangedAt = now.toISOString();

    this.subscriptions.set(sub.id, sub);
    return structuredClone(sub);
  }

  public recordCourseActivity(subId: string, courseSlug: string): void {
    const now = this.clock.now();
    const sub = this.subscriptions.get(subId);
    if (!sub) return;
    sub.courseLastActivityAt[courseSlug] = now.toISOString();
    this.subscriptions.set(sub.id, sub);
  }

  // --------------------------------------------------------------------------
  // Clases en Vivo: Reserva Atómica, Cancelación (4h) y Cuota Mínima (3h)
  // --------------------------------------------------------------------------

  public async bookLiveSession(subId: string, sessionId: string): Promise<LiveBooking> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const sub = this.subscriptions.get(subId);
      if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');

      const session = this.liveSessions.get(sessionId);
      if (!session) throw new Error('LIVE_SESSION_NOT_FOUND');

      if (session.status === 'cancelled') {
        throw new Error('LIVE_SESSION_CANCELLED');
      }

      // Validar entitlements reales en servidor
      const ent = this.getEntitlementsForSubscription(sub, now);
      if (ent.isReadOnly || !ent.canJoinLiveClasses) {
        throw new Error('LIVE_ACCESS_FORBIDDEN');
      }
      if (ent.availableLiveCredits <= 0 || sub.remainingCredits <= 0) {
        throw new Error('INSUFFICIENT_LIVE_CREDITS');
      }

      // Validar que la hora de inicio (leída del servidor) sea >= 4 horas en el futuro
      const sessionStartMs = new Date(session.startTime).getTime();
      const fourHoursMs = 4 * 60 * 60 * 1000;
      if (sessionStartMs - now.getTime() < fourHoursMs) {
        throw new Error('BOOKING_DEADLINE_PASSED_4H');
      }

      // Acotar reservas al ciclo vigente (para que los créditos del mes no reserven más allá del corte)
      const currentCycleLimitIso = sub.status === 'trial' ? sub.trialEnd! : sub.currentPeriodEnd;
      if (sessionStartMs > new Date(currentCycleLimitIso).getTime()) {
        throw new Error('SESSION_BEYOND_CURRENT_BILLING_PERIOD');
      }

      // Validar cupo atómico mediante el contador bookedCount en la sesión
      if (session.bookedCount >= session.maxCapacity) {
        throw new Error('SESSION_CAPACITY_FULL');
      }

      // Evitar doble reserva del mismo usuario en la misma sesión
      const duplicate = Array.from(this.liveBookings.values()).find(
        (b) => b.sessionId === sessionId && b.userId === sub.userId && b.status === 'confirmed'
      );
      if (duplicate) {
        throw new Error('ALREADY_BOOKED_THIS_SESSION');
      }

      sub.remainingCredits -= 1;
      sub.creditsConsumedInCycle += 1;
      session.bookedCount += 1;

      const booking: LiveBooking = {
        id: `bkg_${sessionId}_${sub.userId}_${now.getTime()}`,
        sessionId,
        userId: sub.userId,
        subscriptionId: sub.id,
        status: 'confirmed',
        bookedAt: now.toISOString(),
        sessionTitle: session.title,
        sessionStartTime: session.startTime,
        sessionInstructor: session.teacherId,
      };

      this.subscriptions.set(sub.id, sub);
      this.liveSessions.set(session.id, session);
      this.liveBookings.set(booking.id, booking);

      return structuredClone(booking);
    });
  }

  public async cancelLiveBooking(
    bookingId: string,
    requestingUserId: string,
    options?: { forceCancel?: boolean }
  ): Promise<LiveBooking> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const booking = this.liveBookings.get(bookingId);
      if (!booking) throw new Error('BOOKING_NOT_FOUND');
      if (booking.userId !== requestingUserId) {
        throw new Error('FORBIDDEN_BOOKING_OWNER');
      }
      if (booking.status !== 'confirmed') {
        throw new Error('BOOKING_NOT_ACTIVE');
      }

      const session = this.liveSessions.get(booking.sessionId);
      const bookedAtMs = new Date(booking.bookedAt).getTime();
      const isWithinGracePeriod = now.getTime() - bookedAtMs < 30 * 60 * 1000; // 30 min grace period

      const sessionStartTime = session?.startTime || booking.sessionStartTime;
      const sessionStartMs = sessionStartTime ? new Date(sessionStartTime).getTime() : 0;
      const fourHoursMs = 4 * 60 * 60 * 1000;
      const hasAnticipation = sessionStartMs ? sessionStartMs - now.getTime() >= fourHoursMs : false;

      const shouldRefund = hasAnticipation || isWithinGracePeriod;

      if (!hasAnticipation && !isWithinGracePeriod && !options?.forceCancel) {
        throw new Error('CANCELLATION_WINDOW_CLOSED_4H');
      }

      const sub = this.subscriptions.get(booking.subscriptionId);
      if (sub && sub.status !== 'read_only' && shouldRefund) {
        sub.remainingCredits += 1;
        sub.creditsConsumedInCycle = Math.max(0, sub.creditsConsumedInCycle - 1);
        this.subscriptions.set(sub.id, sub);
      }

      if (session && session.bookedCount > 0) {
        session.bookedCount -= 1;
        this.liveSessions.set(session.id, session);
      }

      booking.status = 'cancelled_by_user';
      booking.cancelledOrRefundedAt = now.toISOString();
      this.liveBookings.set(booking.id, booking);

      return structuredClone(booking);
    });
  }

  /**
   * Evalúa la cuota mínima de una sesión cuando faltan <= 3 horas.
   * 100% idempotente: las devoluciones cambian cada booking de 'confirmed' a 'refunded_quorum'
   * dentro de la transacción, impidiendo dobles reintegros en ejecuciones repetidas.
   */
  public async evaluateSessionQuorum(sessionId: string): Promise<{
    session: LiveSession;
    refundedBookingsCount: number;
  }> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      const session = this.liveSessions.get(sessionId);
      if (!session) throw new Error('LIVE_SESSION_NOT_FOUND');

      const sessionStartMs = new Date(session.startTime).getTime();
      const threeHoursMs = 3 * 60 * 60 * 1000;

      if (sessionStartMs - now.getTime() > threeHoursMs) {
        throw new Error('QUORUM_EVALUATION_TOO_EARLY_WAIT_UNTIL_3H');
      }

      // Si ya fue evaluado previamente, retornar de forma idempotente con 0 reembolsos adicionales
      if (session.quorumStatus !== 'pending') {
        return { session: structuredClone(session), refundedBookingsCount: 0 };
      }

      const activeBookings = Array.from(this.liveBookings.values()).filter(
        (b) => b.sessionId === sessionId && b.status === 'confirmed'
      );

      if (session.attendanceModel === 'credits' || session.bookedCount >= session.quorumRequired) {
        session.quorumStatus = 'confirmed';
        session.status = 'confirmed';
        this.liveSessions.set(session.id, session);

        for (const b of activeBookings) {
          this.emitNotification({
            idempotencyKey: `notif_quorum_ok_${session.id}_${b.userId}`,
            userId: b.userId,
            type: 'quorum_confirmed',
            title: 'Clase en vivo confirmada',
            message: `La sesión "${session.title}" alcanzó el cupo requerido y está confirmada.`,
            actionUrl: '/live',
            now,
          });
        }

        return { session: structuredClone(session), refundedBookingsCount: 0 };
      }

      // Cuota mínima no alcanzada -> cancelar sesión y reintegrar créditos
      session.quorumStatus = 'failed';
      session.status = 'cancelled';
      this.liveSessions.set(session.id, session);

      let refundedCount = 0;
      for (const b of activeBookings) {
        if (b.status === 'confirmed') {
          b.status = 'refunded_quorum';
          b.cancelledOrRefundedAt = now.toISOString();
          this.liveBookings.set(b.id, b);

          const sub = this.subscriptions.get(b.subscriptionId);
          if (sub && sub.status !== 'read_only') {
            sub.remainingCredits += 1;
            sub.creditsConsumedInCycle = Math.max(0, sub.creditsConsumedInCycle - 1);
            this.subscriptions.set(sub.id, sub);
          }

          this.emitNotification({
            idempotencyKey: `notif_quorum_cancel_${session.id}_${b.userId}`,
            userId: b.userId,
            type: 'quorum_cancelled',
            title: 'Sesión reprogramada y crédito devuelto',
            message: `La sesión "${session.title}" no alcanzó la cuota mínima de estudiantes. Tu crédito ha sido reintegrado automáticamente.`,
            actionUrl: '/live',
            now,
          });

          refundedCount++;
        }
      }

      return { session: structuredClone(session), refundedBookingsCount: refundedCount };
    });
  }

  // --------------------------------------------------------------------------
  // Cron Worker Idempotente con Catch-Up Multi-Periodo y Reintentos (Días 1, 3 y 5)
  // --------------------------------------------------------------------------

  public async processSubscriptionsCron(): Promise<{
    processedCount: number;
  }> {
    return this.runTransaction(async () => {
      const now = this.clock.now();
      let processedCount = 0;

      for (const sub of this.subscriptions.values()) {
        // 1. Ignorar plan Free
        if (sub.planId === 'free') {
          continue;
        }

        // 2. Rama propia para Your Plan (sin cobro automático por tarjeta)
        if (sub.planId === 'your_plan') {
          if (sub.status !== 'read_only') {
            const org = sub.organizationId ? this.organizations.get(sub.organizationId) : null;
            const customExpiry = sub.adminOverrides?.customExpiryDate;
            const effectiveEnd = customExpiry || org?.currentPeriodEnd || sub.currentPeriodEnd;
            if (!org || org.status !== 'active' || new Date(effectiveEnd).getTime() <= now.getTime()) {
              sub.status = 'read_only';
              sub.readOnlyReason = !org || org.status !== 'active' ? 'organization_invalid' : 'expired';
              sub.remainingCredits = 0;
              this.cancelFutureBookingsForSubscription(sub.id, now);
              this.subscriptions.set(sub.id, sub);
              processedCount++;
            }
          }
          continue;
        }

        // 3. Aviso preventivo 3 días antes de terminar el Trial
        if (sub.status === 'trial' && sub.trialEnd && !sub.cancelAtPeriodEnd) {
          const msLeft = new Date(sub.trialEnd).getTime() - now.getTime();
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          if (msLeft > 0 && msLeft <= threeDaysMs) {
            this.emitNotification({
              idempotencyKey: `notif_trial_ending_${sub.id}_${sub.trialEnd}`,
              userId: sub.userId,
              type: 'trial_ending_soon',
              title: 'Tu periodo de prueba finaliza pronto',
              message: 'Quedan menos de 3 días de tu prueba gratuita. Revisa tu plan o método de pago.',
              actionUrl: '/course',
              now,
            });
          }
        }

        // 4. Procesar Trial Vencido
        if (sub.status === 'trial' && sub.trialEnd && new Date(sub.trialEnd).getTime() <= now.getTime()) {
          if (sub.cancelAtPeriodEnd) {
            sub.status = 'read_only';
            sub.readOnlyReason = 'trial_ended_cancelled';
            sub.remainingCredits = 0;
            sub.frozenDynamicCourseSlugs = [
              ...new Set([...sub.frozenDynamicCourseSlugs, ...sub.activeDynamicCourseSlugs]),
            ];
            sub.activeDynamicCourseSlugs = [];
            this.cancelFutureBookingsForSubscription(sub.id, now);
            this.subscriptions.set(sub.id, sub);
            processedCount++;
            continue;
          }

          const config = this.planConfigs[sub.planId as StandardPlanId];
          const idempotencyKey = `first_charge_${sub.id}_${sub.trialEnd}`;
          const chargeRes = await this.executeOutboxCharge({
            idempotencyKey,
            subscription: sub,
            operation: 'first_charge',
            planIdForInvoice: sub.planId,
            subtotalAmount: config.priceMonthly,
            taxRatePercent: config.taxRatePercent,
            now,
          });

          if (chargeRes.success) {
            const trialEndDate = new Date(sub.trialEnd);
            const anchor = sub.billingAnchorDay || trialEndDate.getUTCDate();
            const nextEnd = advanceCalendarMonth(trialEndDate, anchor);

            sub.status = 'active';
            sub.billingAnchorDay = anchor;
            sub.currentPeriodStart = trialEndDate.toISOString();
            sub.currentPeriodEnd = nextEnd.toISOString();
            sub.lastProcessedPeriodStart = trialEndDate.toISOString();
            sub.monthlyCreditsAllowance = config.monthlyLiveCredits;
            sub.remainingCredits = config.monthlyLiveCredits;
            sub.creditsConsumedInCycle = 0;
            sub.creditsResetAt = nextEnd.toISOString();
            sub.paymentRetryCount = 0;
            this.subscriptions.set(sub.id, sub);
            processedCount++;
            // Si el salto temporal abarca más de un mes, continúa hacia el bucle catch-up de active
          } else {
            const graceStart = now;
            sub.status = 'past_due';
            sub.graceStartedAt = graceStart.toISOString();
            sub.graceEndsAt = addDaysUtc(graceStart, 5).toISOString();
            sub.nextRetryAt = addDaysUtc(graceStart, 1).toISOString(); // Día 1
            sub.paymentRetryCount = 0;
            this.subscriptions.set(sub.id, sub);

            this.emitNotification({
              idempotencyKey: `notif_pay_fail_${sub.id}_${sub.trialEnd}_0`,
              userId: sub.userId,
              type: 'payment_failed',
              title: 'No pudimos procesar tu pago',
              message: 'Tienes 5 días de gracia mientras reintentamos el cobro.',
              actionUrl: '/course',
              now,
            });
            processedCount++;
            continue;
          }
        }

        // 5. Bucle Catch-Up para Suscripciones Activas con Periodo Vencido
        while (
          sub.status === 'active' &&
          (sub.planId === 'pro' || sub.planId === 'pro_plus') &&
          new Date(sub.currentPeriodEnd).getTime() <= now.getTime()
        ) {
          const periodEndIso = sub.currentPeriodEnd;
          const periodEndDate = new Date(periodEndIso);

          // Guardia de idempotencia de ciclo ya procesado
          if (sub.lastProcessedPeriodStart === periodEndIso) {
            break;
          }

          // 5.A. Cancelación programada al fin de ciclo
          if (sub.cancelAtPeriodEnd) {
            sub.status = 'read_only';
            sub.readOnlyReason = 'expired';
            sub.remainingCredits = 0;
            sub.frozenDynamicCourseSlugs = [
              ...new Set([...sub.frozenDynamicCourseSlugs, ...sub.activeDynamicCourseSlugs]),
            ];
            sub.activeDynamicCourseSlugs = [];
            this.cancelFutureBookingsForSubscription(sub.id, now);
            this.subscriptions.set(sub.id, sub);
            processedCount++;
            break;
          }

          // 5.B. Downgrade pendiente efectivo en este corte (encadenado con la renovación del nuevo plan)
          if (
            sub.pendingDowngrade &&
            new Date(sub.pendingDowngrade.effectiveAt).getTime() <= periodEndDate.getTime()
          ) {
            const targetPlan = sub.pendingDowngrade.targetPlanId;
            const preferredSlug = sub.pendingDowngrade.selectedDynamicCourseSlug;

            if (targetPlan === 'free') {
              sub.planId = 'free';
              sub.pendingDowngrade = null;
              sub.frozenDynamicCourseSlugs = [
                ...new Set([...sub.frozenDynamicCourseSlugs, ...sub.activeDynamicCourseSlugs]),
              ];
              sub.activeDynamicCourseSlugs = [];
              sub.monthlyCreditsAllowance = 0;
              sub.remainingCredits = 0;
              sub.creditsConsumedInCycle = 0;
              this.cancelFutureBookingsForSubscription(sub.id, now);
              this.subscriptions.set(sub.id, sub);
              processedCount++;
              break;
            }

            // Si baja de pro_plus a pro: conservar el curso elegido o el de actividad más reciente
            const targetConfig = this.planConfigs[targetPlan];
            const keptCourses = selectMostRecentCourses(
              sub.activeDynamicCourseSlugs,
              sub.courseLastActivityAt,
              targetConfig.maxDynamicCourses,
              preferredSlug
            );
            const newlyFrozen = sub.activeDynamicCourseSlugs.filter((s) => !keptCourses.includes(s));

            sub.planId = targetPlan;
            sub.pendingDowngrade = null;
            sub.activeDynamicCourseSlugs = keptCourses;
            sub.frozenDynamicCourseSlugs = [
              ...new Set([...sub.frozenDynamicCourseSlugs, ...newlyFrozen]),
            ];
            // Como Pro no tiene clases en vivo, cancelar reservas futuras
            if (!targetConfig.allowsLiveAccess) {
              this.cancelFutureBookingsForSubscription(sub.id, now);
            }
            // No hace break ni return: encadena en esta misma vuelta el cobro del ciclo nuevo de Pro
          }

          // 5.C. Cobro de renovación del ciclo actual
          const activeConfig = this.planConfigs[sub.planId as StandardPlanId];
          const idempotencyKey = `renew_${sub.id}_${periodEndIso}`;

          const chargeRes = await this.executeOutboxCharge({
            idempotencyKey,
            subscription: sub,
            operation: 'renew',
            planIdForInvoice: sub.planId,
            subtotalAmount: activeConfig.priceMonthly,
            taxRatePercent: activeConfig.taxRatePercent,
            now,
          });

          if (chargeRes.success) {
            const nextEnd = advanceCalendarMonth(periodEndDate, sub.billingAnchorDay);
            sub.currentPeriodStart = periodEndIso;
            sub.currentPeriodEnd = nextEnd.toISOString();
            sub.lastProcessedPeriodStart = periodEndIso;
            sub.monthlyCreditsAllowance = activeConfig.monthlyLiveCredits;
            sub.remainingCredits = activeConfig.monthlyLiveCredits;
            sub.creditsConsumedInCycle = 0;
            sub.creditsResetAt = nextEnd.toISOString();
            sub.paymentRetryCount = 0;
            this.subscriptions.set(sub.id, sub);
            processedCount++;
          } else {
            const graceStart = now;
            sub.status = 'past_due';
            sub.graceStartedAt = graceStart.toISOString();
            sub.graceEndsAt = addDaysUtc(graceStart, 5).toISOString();
            sub.nextRetryAt = addDaysUtc(graceStart, 1).toISOString(); // Día 1
            sub.paymentRetryCount = 0;
            this.subscriptions.set(sub.id, sub);

            this.emitNotification({
              idempotencyKey: `notif_pay_fail_${sub.id}_${periodEndIso}_0`,
              userId: sub.userId,
              type: 'payment_failed',
              title: 'Fallo en la renovación de tu suscripción',
              message: 'Reintentaremos el cobro en los próximos 5 días.',
              actionUrl: '/course',
              now,
            });
            processedCount++;
            break;
          }
        }

        // 6. Manejo de Past Due: PRIMERO ejecutar reintento pendiente (Días 1, 3 y 5), LUEGO evaluar fin de gracia
        if (sub.status === 'past_due') {
          if (
            sub.paymentRetryCount < 3 &&
            sub.nextRetryAt &&
            new Date(sub.nextRetryAt).getTime() <= now.getTime()
          ) {
            const attemptNum = sub.paymentRetryCount + 1; // 1, 2 o 3
            const config = this.planConfigs[sub.planId as StandardPlanId];
            const idempotencyKey = `retry_${sub.id}_${sub.currentPeriodEnd}_attempt_${attemptNum}`;

            const retryRes = await this.executeOutboxCharge({
              idempotencyKey,
              subscription: sub,
              operation: 'retry',
              planIdForInvoice: sub.planId,
              subtotalAmount: config.priceMonthly,
              taxRatePercent: config.taxRatePercent,
              now,
            });

            if (retryRes.success) {
              const baseDate = new Date(sub.currentPeriodEnd);
              const anchor = sub.billingAnchorDay || baseDate.getUTCDate();
              const nextEnd = advanceCalendarMonth(baseDate, anchor);

              sub.status = 'active';
              sub.graceStartedAt = null;
              sub.graceEndsAt = null;
              sub.nextRetryAt = null;
              sub.paymentRetryCount = 0;
              sub.currentPeriodStart = baseDate.toISOString();
              sub.currentPeriodEnd = nextEnd.toISOString();
              sub.lastProcessedPeriodStart = baseDate.toISOString();
              sub.monthlyCreditsAllowance = config.monthlyLiveCredits;
              sub.remainingCredits = config.monthlyLiveCredits;
              sub.creditsConsumedInCycle = 0;
              sub.creditsResetAt = nextEnd.toISOString();
              this.subscriptions.set(sub.id, sub);
              processedCount++;
              continue;
            } else {
              sub.paymentRetryCount = attemptNum;
              const graceStart = new Date(sub.graceStartedAt || now);

              if (attemptNum === 1) {
                // Falló Día 1 -> Agendar Día 3
                sub.nextRetryAt = addDaysUtc(graceStart, 3).toISOString();
              } else if (attemptNum === 2) {
                // Falló Día 3 -> Agendar Día 5
                sub.nextRetryAt = addDaysUtc(graceStart, 5).toISOString();
              } else {
                // Falló el 3er intento (Día 5) -> Degradar a read_only
                sub.nextRetryAt = null;
                sub.status = 'read_only';
                sub.readOnlyReason = 'past_due_grace_ended';
                sub.remainingCredits = 0;
                sub.frozenDynamicCourseSlugs = [
                  ...new Set([...sub.frozenDynamicCourseSlugs, ...sub.activeDynamicCourseSlugs]),
                ];
                sub.activeDynamicCourseSlugs = [];
                this.cancelFutureBookingsForSubscription(sub.id, now);
              }

              this.emitNotification({
                idempotencyKey: `notif_pay_fail_${sub.id}_${sub.currentPeriodEnd}_${attemptNum}`,
                userId: sub.userId,
                type: 'payment_failed',
                title: `Intento de cobro ${attemptNum}/3 fallido`,
                message:
                  sub.status === 'read_only'
                    ? 'Tu periodo de gracia ha finalizado. Tu cuenta pasó a modo consulta.'
                    : 'Por favor actualiza tu método de pago para mantener tu plan activo.',
                actionUrl: '/course',
                now,
              });

              this.subscriptions.set(sub.id, sub);
              processedCount++;
              continue;
            }
          }

          // Si ya no quedan reintentos o venció graceEndsAt
          if (sub.graceEndsAt && new Date(sub.graceEndsAt).getTime() <= now.getTime()) {
            sub.status = 'read_only';
            sub.readOnlyReason = 'past_due_grace_ended';
            sub.remainingCredits = 0;
            sub.nextRetryAt = null;
            sub.frozenDynamicCourseSlugs = [
              ...new Set([...sub.frozenDynamicCourseSlugs, ...sub.activeDynamicCourseSlugs]),
            ];
            sub.activeDynamicCourseSlugs = [];
            this.cancelFutureBookingsForSubscription(sub.id, now);
            this.subscriptions.set(sub.id, sub);
            processedCount++;
          }
        }
      }

      return { processedCount };
    });
  }
}
