'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { cleanForFirebase } from '@/lib/courseUtils';
import {
  Subscription,
  PlanConfig,
  StandardPlanId,
  PlanId,
  DEFAULT_PLAN_CONFIGS,
  Entitlements,
  Invoice,
  UserNotification,
  LiveBooking,
  BillingTaxProfile,
  TokenizedPaymentMethod,
  Organization,
  OrganizationMember,
  SubscriptionPlatformService,
  SystemClockService,
  computeEntitlements,
  freeEntitlements,
} from '@/lib/subscriptionEngine';

export interface YourPlanExecutiveRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  organizationName: string;
  seatsRequested: number;
  desiredDynamicCourses: number;
  desiredWeeklyLiveSessions: number;
  desiredTrialDays: number;
  contactPhone: string;
  preferredScheduleNotes: string;
  status: 'pending_call' | 'proposal_sent' | 'approved' | 'rejected';
  proposedPriceMonthly?: number;
  approvedTrialDays?: number;
  createdAt: string;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  entitlements: Entitlements;
  planConfigs: Record<StandardPlanId, PlanConfig>;
  invoices: Invoice[];
  notifications: UserNotification[];
  liveBookings: LiveBooking[];
  yourPlanRequests: YourPlanExecutiveRequest[];
  serverNow: Date;
  isPricingModalOpen: boolean;
  preselectedModalPlan: PlanId | null;
  openPricingModal: (plan?: PlanId) => void;
  closePricingModal: () => void;
  startTrial: (params: {
    planId: 'pro' | 'pro_plus';
    cardInput: {
      panLast4: string;
      brand: 'visa' | 'mastercard' | 'amex';
      expMonth: number;
      expYear: number;
      cardholderName: string;
      rawCardIdentifierForFingerprint?: string;
    };
    phoneNumber: string;
    taxProfile?: BillingTaxProfile;
    initialDynamicCourseSlug?: string;
  }) => Promise<Subscription>;
  convertTrialForCertificate: () => Promise<{ subscription: Subscription; invoice: Invoice }>;
  upgradeSubscription: (
    targetPlanId: 'pro' | 'pro_plus',
    newCardInput?: {
      panLast4: string;
      brand?: 'visa' | 'mastercard' | 'amex';
      expMonth?: number;
      expYear?: number;
      cardholderName?: string;
    }
  ) => Promise<{ subscription: Subscription; invoice: Invoice }>;
  scheduleDowngrade: (
    targetPlanId: 'free' | 'pro',
    selectedDynamicCourseSlug?: string
  ) => Promise<Subscription>;
  cancelSubscription: () => Promise<Subscription>;
  resumeSubscription: () => Promise<Subscription>;
  reactivateSubscription: (params?: {
    targetPlanId?: 'pro' | 'pro_plus';
    newCardInput?: {
      panLast4: string;
      brand: 'visa' | 'mastercard' | 'amex';
      expMonth: number;
      expYear: number;
      cardholderName: string;
    };
  }) => Promise<{ subscription: Subscription; invoice: Invoice }>;
  activateDynamicCourse: (courseSlug: string, replaceCourseSlug?: string) => Promise<Subscription>;
  bookLiveSession: (
    sessionId: string,
    sessionData?: {
      courseSlug: string;
      teacherId: string;
      title: string;
      startTime: string;
      durationMinutes: number;
      quorumRequired?: number;
      maxCapacity?: number;
    }
  ) => Promise<LiveBooking>;
  cancelLiveBooking: (bookingId: string, options?: { forceCancel?: boolean }) => Promise<LiveBooking>;
  submitYourPlanRequest: (
    input: Omit<
      YourPlanExecutiveRequest,
      'id' | 'userId' | 'userEmail' | 'userName' | 'status' | 'createdAt'
    >
  ) => Promise<YourPlanExecutiveRequest>;
  markNotificationRead: (notifId: string) => Promise<void>;
  advanceVirtualClockDays: (days: number) => Promise<void>;
  switchDemoTier: (targetPlanId: 'free' | 'pro' | 'pro_plus' | 'your_plan') => Promise<void>;
  zeroSumAccounting: {
    issuedCredits: number;
    availableCredits: number;
    reservedInEscrow: number;
    consumedCredits: number;
    netDelta: number;
    isBalanced: boolean;
  };
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ipt_course_subscription_state_v6';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const clockRef = useRef<SystemClockService>(new SystemClockService(undefined, true));
  const engineRef = useRef<SubscriptionPlatformService>(
    new SubscriptionPlatformService(clockRef.current)
  );

  const [serverNow, setServerNow] = useState<Date>(() => clockRef.current.now());
  const [planConfigs, setPlanConfigs] = useState<Record<StandardPlanId, PlanConfig>>(
    () => structuredClone(DEFAULT_PLAN_CONFIGS)
  );
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgMember, setOrgMember] = useState<OrganizationMember | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [liveBookings, setLiveBookings] = useState<LiveBooking[]>([]);
  const [yourPlanRequests, setYourPlanRequests] = useState<YourPlanExecutiveRequest[]>([]);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
  const [preselectedModalPlan, setPreselectedModalPlan] = useState<PlanId | null>(null);

  const effectiveUid = user?.uid || 'guest_student_local';
  const effectiveEmail = user?.email || 'estudiante@ivanperez.tech';
  const effectiveName = user?.displayName || 'Estudiante IPT';

  const syncEngineToStorageAndRtdb = useCallback(
    async (uid: string) => {
      const engine = engineRef.current;
      const sub = Array.from(engine.subscriptions.values()).find((s) => s.userId === uid) || null;
      const userInvoices = Array.from(engine.invoices.values()).filter((i) => i.userId === uid);
      const userNotifs = Array.from(engine.notifications.values()).filter((n) => n.userId === uid);
      const userBookings = Array.from(engine.liveBookings.values()).filter((b) => b.userId === uid);

      setSubscription(sub ? structuredClone(sub) : null);
      setInvoices(structuredClone(userInvoices));
      setNotifications(structuredClone(userNotifs));
      setLiveBookings(structuredClone(userBookings));
      setServerNow(clockRef.current.now());

      try {
        const snapshot = {
          sub,
          userProfile: engine.users.get(uid) || null,
          invoices: userInvoices,
          notifications: userNotifs,
          bookings: userBookings,
          virtualTimeIso: clockRef.current.now().toISOString(),
        };
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${uid}`, JSON.stringify(snapshot));
      } catch {
        // Ignore storage errors
      }

      if (user?.uid && sub) {
        try {
          await set(ref(db, `lms_subscriptions/${uid}`), cleanForFirebase(sub));
          const uProf = engine.users.get(uid);
          if (uProf) {
            await set(ref(db, `users/${uid}/hasUsedTrial`), Boolean(uProf.hasUsedTrial));
            if (uProf.taxProfile) {
              await set(ref(db, `users/${uid}/taxProfile`), cleanForFirebase(uProf.taxProfile));
            }
          }
          for (const inv of userInvoices) {
            await set(ref(db, `lms_invoices/${inv.id}`), cleanForFirebase(inv));
          }
          for (const notif of userNotifs) {
            await set(ref(db, `lms_notifications/${uid}/${notif.id}`), cleanForFirebase(notif));
          }
          for (const bkg of userBookings) {
            await set(ref(db, `lms_live_bookings/${bkg.id}`), cleanForFirebase(bkg));
          }
        } catch {
          // Offline resilience
        }
      }
    },
    [user?.uid]
  );

  // 1. Escuchar lms_plan_configs en tiempo real desde Firebase RTDB
  useEffect(() => {
    const plansRef = ref(db, 'lms_plan_configs');
    const unsub = onValue(
      plansRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const merged: Record<StandardPlanId, PlanConfig> = {
            free: { ...DEFAULT_PLAN_CONFIGS.free, ...(val.free || {}) },
            pro: { ...DEFAULT_PLAN_CONFIGS.pro, ...(val.pro || {}) },
            pro_plus: { ...DEFAULT_PLAN_CONFIGS.pro_plus, ...(val.pro_plus || {}) },
          };
          engineRef.current.planConfigs = merged;
          setPlanConfigs(merged);
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // 2. Inicializar o migrar al usuario actual a Plan Free conservando certificados e historial
  useEffect(() => {
    const engine = engineRef.current;

    // Cargar estado previo local si existe
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${effectiveUid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userProfile) {
          engine.users.set(effectiveUid, parsed.userProfile);
        }
        if (parsed.sub) {
          engine.subscriptions.set(parsed.sub.id, parsed.sub);
        }
        if (Array.isArray(parsed.invoices)) {
          parsed.invoices.forEach((inv: Invoice) => engine.invoices.set(inv.id, inv));
        }
        if (Array.isArray(parsed.notifications)) {
          parsed.notifications.forEach((n: UserNotification) => engine.notifications.set(n.id, n));
        }
        if (Array.isArray(parsed.bookings)) {
          parsed.bookings.forEach((b: LiveBooking) => engine.liveBookings.set(b.id, b));
        }
      }
    } catch {}

    // Asegurar migración idempotente a Free si no tiene suscripción aún
    engine.migrateExistingUsersToFree([
      {
        uid: effectiveUid,
        email: effectiveEmail,
        displayName: effectiveName,
      },
    ]);

    syncEngineToStorageAndRtdb(effectiveUid);

    if (!user?.uid) return;

    // Suscripción reactiva en RTDB a lms_subscriptions/${user.uid}
    const subRef = ref(db, `lms_subscriptions/${user.uid}`);
    const unsubSub = onValue(
      subRef,
      async (snap) => {
        if (snap.exists()) {
          const remoteSub = snap.val() as Subscription;
          remoteSub.activeDynamicCourseSlugs = Array.isArray(remoteSub.activeDynamicCourseSlugs)
            ? remoteSub.activeDynamicCourseSlugs
            : [];
          remoteSub.frozenDynamicCourseSlugs = Array.isArray(remoteSub.frozenDynamicCourseSlugs)
            ? remoteSub.frozenDynamicCourseSlugs
            : [];
          remoteSub.courseLastActivityAt = remoteSub.courseLastActivityAt || {};
          engine.subscriptions.set(remoteSub.id, remoteSub);
          setSubscription(remoteSub);

          if (remoteSub.organizationId) {
            const orgSnap = await get(
              ref(db, `lms_organizations/${remoteSub.organizationId}`)
            ).catch(() => null);
            if (orgSnap && orgSnap.exists()) {
              const orgData = orgSnap.val() as Organization;
              engine.organizations.set(orgData.id, orgData);
              setOrganization(orgData);
            }
            const memSnap = await get(
              ref(
                db,
                `lms_organization_members/mem_${remoteSub.organizationId}_${user.uid}`
              )
            ).catch(() => null);
            if (memSnap && memSnap.exists()) {
              const memData = memSnap.val() as OrganizationMember;
              engine.organizationMembers.set(memData.id, memData);
              setOrgMember(memData);
            }
          }
        }
      },
      () => {}
    );

    const reqsRef = ref(db, 'lms_your_plan_requests');
    const unsubReqs = onValue(
      reqsRef,
      (snap) => {
        if (snap.exists()) {
          const all = Object.values(snap.val()) as YourPlanExecutiveRequest[];
          setYourPlanRequests(all.filter((r) => r.userId === user.uid));
        }
      },
      () => {}
    );

    return () => {
      unsubSub();
      unsubReqs();
    };
  }, [effectiveUid, effectiveEmail, effectiveName, user?.uid, syncEngineToStorageAndRtdb]);

  const entitlements = useMemo<Entitlements>(() => {
    if (!subscription) return freeEntitlements();
    const withinSeats = organization && orgMember
      ? engineRef.current.isMemberWithinSeatLimit(organization, orgMember)
      : true;
    return computeEntitlements(
      subscription,
      organization,
      orgMember,
      withinSeats,
      planConfigs,
      serverNow
    );
  }, [subscription, organization, orgMember, planConfigs, serverNow]);

  const openPricingModal = useCallback((plan?: PlanId) => {
    if (plan) setPreselectedModalPlan(plan);
    setIsPricingModalOpen(true);
  }, []);

  const closePricingModal = useCallback(() => {
    setIsPricingModalOpen(false);
    setPreselectedModalPlan(null);
  }, []);

  const startTrial = useCallback(
    async (params: {
      planId: 'pro' | 'pro_plus';
      cardInput: {
        panLast4: string;
        brand: 'visa' | 'mastercard' | 'amex';
        expMonth: number;
        expYear: number;
        cardholderName: string;
        rawCardIdentifierForFingerprint?: string;
      };
      phoneNumber: string;
      taxProfile?: BillingTaxProfile;
      initialDynamicCourseSlug?: string;
    }) => {
      const engine = engineRef.current;
      const existingUser = engine.users.get(effectiveUid);
      if (existingUser) {
        existingUser.phoneVerified = Boolean(
          params.phoneNumber ? params.phoneNumber.trim().length >= 7 : true
        );
        if (params.taxProfile) {
          existingUser.taxProfile = params.taxProfile;
        }
        engine.users.set(effectiveUid, existingUser);
      }

      const tokenized = engine.gateway.tokenizeCard(params.cardInput);
      const created = await engine.startTrial({
        userId: effectiveUid,
        planId: params.planId,
        paymentMethod: tokenized,
        initialDynamicCourseSlug: params.initialDynamicCourseSlug || 'ipt-master-fullstack',
      });

      // Persistir huella de tarjeta en RTDB para antifraude multi-cuenta
      try {
        const fpRecord = engine.cardFingerprints.get(tokenized.cardFingerprint);
        if (fpRecord) {
          await set(
            ref(db, `fraud_card_fingerprints/${tokenized.cardFingerprint}`),
            cleanForFirebase(fpRecord)
          );
        }
      } catch {}

      await syncEngineToStorageAndRtdb(effectiveUid);
      return created;
    },
    [effectiveUid, syncEngineToStorageAndRtdb]
  );

  const convertTrialForCertificate = useCallback(async () => {
    if (!subscription) throw new Error('No hay suscripción activa.');
    const res = await engineRef.current.convertTrialForCertificate(subscription.id);
    await syncEngineToStorageAndRtdb(effectiveUid);
    return res;
  }, [subscription, effectiveUid, syncEngineToStorageAndRtdb]);

  const upgradeSubscription = useCallback(
    async (
      targetPlanId: 'pro' | 'pro_plus',
      newCardInput?: {
        panLast4: string;
        brand?: 'visa' | 'mastercard' | 'amex';
        expMonth?: number;
        expYear?: number;
        cardholderName?: string;
      }
    ) => {
      if (!subscription) throw new Error('No hay suscripción activa.');
      const res = await engineRef.current.upgradeSubscription({
        subId: subscription.id,
        targetPlanId,
        newCardInput,
      });
      await syncEngineToStorageAndRtdb(effectiveUid);
      return res;
    },
    [subscription, effectiveUid, syncEngineToStorageAndRtdb]
  );

  const scheduleDowngrade = useCallback(
    async (targetPlanId: 'free' | 'pro', selectedDynamicCourseSlug?: string) => {
      if (!subscription) throw new Error('No hay suscripción activa.');
      const res = engineRef.current.scheduleDowngrade({
        subId: subscription.id,
        targetPlanId,
        selectedDynamicCourseSlug,
      });
      await syncEngineToStorageAndRtdb(effectiveUid);
      return res;
    },
    [subscription, effectiveUid, syncEngineToStorageAndRtdb]
  );

  const cancelSubscription = useCallback(async () => {
    if (!subscription) throw new Error('No hay suscripción activa.');
    const res = engineRef.current.cancelSubscription(subscription.id);
    await syncEngineToStorageAndRtdb(effectiveUid);
    return res;
  }, [subscription, effectiveUid, syncEngineToStorageAndRtdb]);

  const resumeSubscription = useCallback(async () => {
    if (!subscription) throw new Error('No hay suscripción activa.');
    const res = engineRef.current.resumeSubscription(subscription.id);
    await syncEngineToStorageAndRtdb(effectiveUid);
    return res;
  }, [subscription, effectiveUid, syncEngineToStorageAndRtdb]);

  const reactivateSubscription = useCallback(
    async (params?: {
      targetPlanId?: 'pro' | 'pro_plus';
      newCardInput?: {
        panLast4: string;
        brand: 'visa' | 'mastercard' | 'amex';
        expMonth: number;
        expYear: number;
        cardholderName: string;
      };
    }) => {
      if (!subscription) throw new Error('No hay suscripción para reactivar.');
      const newPm = params?.newCardInput
        ? engineRef.current.gateway.tokenizeCard(params.newCardInput)
        : undefined;
      const res = await engineRef.current.reactivateSubscription({
        subId: subscription.id,
        targetPlanId: params?.targetPlanId,
        newPaymentMethod: newPm,
      });
      await syncEngineToStorageAndRtdb(effectiveUid);
      return res;
    },
    [subscription, effectiveUid, syncEngineToStorageAndRtdb]
  );

  const activateDynamicCourse = useCallback(
    async (courseSlug: string, replaceCourseSlug?: string) => {
      if (!subscription) throw new Error('No hay suscripción activa.');
      engineRef.current.allowedDynamicCourseSlugs.add(courseSlug);
      const res = engineRef.current.activateDynamicCourse({
        subId: subscription.id,
        courseSlug,
        replaceCourseSlug,
      });
      await syncEngineToStorageAndRtdb(effectiveUid);
      return res;
    },
    [subscription, effectiveUid, syncEngineToStorageAndRtdb]
  );

  const bookLiveSession = useCallback(
    async (
      sessionId: string,
      sessionData?: {
        courseSlug: string;
        teacherId: string;
        title: string;
        startTime: string;
        durationMinutes: number;
        quorumRequired?: number;
        maxCapacity?: number;
      }
    ) => {
      if (!subscription) throw new Error('No hay suscripción activa.');
      const engine = engineRef.current;
      if (!engine.liveSessions.has(sessionId) && sessionData) {
        engine.liveSessions.set(sessionId, {
          id: sessionId,
          courseSlug: sessionData.courseSlug,
          teacherId: sessionData.teacherId,
          title: sessionData.title,
          startTime: sessionData.startTime,
          durationMinutes: sessionData.durationMinutes,
          status: 'scheduled',
          attendanceModel: 'hybrid',
          quorumRequired: sessionData.quorumRequired ?? 3,
          quorumStatus: 'pending',
          bookedCount: 0,
          maxCapacity: sessionData.maxCapacity ?? 25,
        });
      }
      const bkg = await engine.bookLiveSession(subscription.id, sessionId);
      await syncEngineToStorageAndRtdb(effectiveUid);
      return bkg;
    },
    [subscription, effectiveUid, syncEngineToStorageAndRtdb]
  );

  const cancelLiveBooking = useCallback(
    async (bookingId: string, options?: { forceCancel?: boolean }) => {
      const bkg = await engineRef.current.cancelLiveBooking(bookingId, effectiveUid, options);
      await syncEngineToStorageAndRtdb(effectiveUid);
      return bkg;
    },
    [effectiveUid, syncEngineToStorageAndRtdb]
  );

  const submitYourPlanRequest = useCallback(
    async (
      input: Omit<
        YourPlanExecutiveRequest,
        'id' | 'userId' | 'userEmail' | 'userName' | 'status' | 'createdAt'
      >
    ) => {
      const now = clockRef.current.now().toISOString();
      const req: YourPlanExecutiveRequest = {
        ...input,
        id: `ypr_${effectiveUid}_${Date.now()}`,
        userId: effectiveUid,
        userEmail: effectiveEmail,
        userName: effectiveName,
        status: 'pending_call',
        createdAt: now,
      };
      setYourPlanRequests((prev) => [req, ...prev]);
      try {
        await set(ref(db, `lms_your_plan_requests/${req.id}`), cleanForFirebase(req));
      } catch {}
      return req;
    },
    [effectiveUid, effectiveEmail, effectiveName]
  );

  const markNotificationRead = useCallback(
    async (notifId: string) => {
      const notif = engineRef.current.notifications.get(notifId);
      if (notif) {
        notif.read = true;
        engineRef.current.notifications.set(notifId, notif);
      }
      await syncEngineToStorageAndRtdb(effectiveUid);
    },
    [effectiveUid, syncEngineToStorageAndRtdb]
  );

  const advanceVirtualClockDays = useCallback(
    async (days: number) => {
      clockRef.current.advanceDays(days);
      await engineRef.current.processSubscriptionsCron();
      await syncEngineToStorageAndRtdb(effectiveUid);
    },
    [effectiveUid, syncEngineToStorageAndRtdb]
  );

  const switchDemoTier = useCallback(
    async (targetPlanId: 'free' | 'pro' | 'pro_plus' | 'your_plan') => {
      const engine = engineRef.current;
      const now = clockRef.current.now();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let existingSub = Array.from(engine.subscriptions.values()).find(
        (s) => s.userId === effectiveUid
      );

      const defaultSlugs =
        targetPlanId === 'free'
          ? []
          : targetPlanId === 'pro'
          ? ['ipt-master-fullstack']
          : ['ipt-master-fullstack', 'arquitectura-cloud-ipt', 'sistemas-distribuidos-ipt'];

      const creditsAllowance =
        targetPlanId === 'free' || targetPlanId === 'pro'
          ? 0
          : targetPlanId === 'pro_plus'
          ? 8
          : 12;

      const updatedSub: Subscription = {
        id: existingSub?.id || `sub_${effectiveUid}`,
        userId: effectiveUid,
        planId: targetPlanId,
        status: 'active',
        cancelAtPeriodEnd: false,
        readOnlyReason: null,
        billingAnchorDay: now.getUTCDate(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: nextMonth.toISOString(),
        trialStart: null,
        trialEnd: null,
        paymentRetryCount: 0,
        activeDynamicCourseSlugs: defaultSlugs,
        frozenDynamicCourseSlugs: [],
        courseLastActivityAt: {
          'ipt-master-fullstack': now.toISOString(),
          'arquitectura-cloud-ipt': now.toISOString(),
          'sistemas-distribuidos-ipt': now.toISOString(),
        },
        monthlyCreditsAllowance: creditsAllowance,
        remainingCredits: creditsAllowance,
        creditsConsumedInCycle: 0,
        creditsResetAt: nextMonth.toISOString(),
        pendingDowngrade: null,
        adminOverrides:
          targetPlanId === 'your_plan'
            ? { maxDynamicCourses: 4, monthlyLiveCredits: 12, allowLiveAccess: true }
            : null,
      };

      engine.subscriptions.set(updatedSub.id, updatedSub);
      await syncEngineToStorageAndRtdb(effectiveUid);
    },
    [effectiveUid, syncEngineToStorageAndRtdb]
  );

  // Sistema de Contabilidad de Igualación a 0 (Partida Doble de Créditos)
  const zeroSumAccounting = useMemo(() => {
    const reservedCount = liveBookings.filter((b) => b.status === 'confirmed').length;
    const available = subscription ? subscription.remainingCredits : 0;
    const consumed = Math.max(0, (subscription?.creditsConsumedInCycle || 0) - reservedCount);
    const issued = available + reservedCount + consumed;
    const netDelta = issued - (available + reservedCount + consumed);
    return {
      issuedCredits: issued,
      availableCredits: available,
      reservedInEscrow: reservedCount,
      consumedCredits: consumed,
      netDelta,
      isBalanced: netDelta === 0,
    };
  }, [subscription, liveBookings]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      entitlements,
      planConfigs,
      invoices,
      notifications,
      liveBookings,
      yourPlanRequests,
      serverNow,
      isPricingModalOpen,
      preselectedModalPlan,
      openPricingModal,
      closePricingModal,
      startTrial,
      convertTrialForCertificate,
      upgradeSubscription,
      scheduleDowngrade,
      cancelSubscription,
      resumeSubscription,
      reactivateSubscription,
      activateDynamicCourse,
      bookLiveSession,
      cancelLiveBooking,
      submitYourPlanRequest,
      markNotificationRead,
      advanceVirtualClockDays,
      switchDemoTier,
      zeroSumAccounting,
    }),
    [
      subscription,
      entitlements,
      planConfigs,
      invoices,
      notifications,
      liveBookings,
      yourPlanRequests,
      serverNow,
      isPricingModalOpen,
      preselectedModalPlan,
      openPricingModal,
      closePricingModal,
      startTrial,
      convertTrialForCertificate,
      upgradeSubscription,
      scheduleDowngrade,
      cancelSubscription,
      resumeSubscription,
      reactivateSubscription,
      activateDynamicCourse,
      bookLiveSession,
      cancelLiveBooking,
      submitYourPlanRequest,
      markNotificationRead,
      advanceVirtualClockDays,
      switchDemoTier,
      zeroSumAccounting,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription debe utilizarse dentro de un SubscriptionProvider');
  }
  return ctx;
}
