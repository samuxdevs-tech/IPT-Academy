import { Hono } from 'hono';
import {
  SubscriptionPlatformService,
  StandardPlanId,
  PlanConfig,
  Organization,
  OrganizationMember,
} from './subscriptionEngine';

export const subscriptionPlatform = new SubscriptionPlatformService();

export function registerSubscriptionRoutes(app: Hono<any>) {
  // 1. Obtener catálogo público de configuración de planes (Free, Pro, Pro+)
  app.get('/api/subscriptions/plans', (c) => {
    return c.json({
      success: true,
      plans: subscriptionPlatform.planConfigs,
      serverTime: subscriptionPlatform.clock.now().toISOString(),
    });
  });

  // 2. Consultar suscripción activa, entitlements en tiempo real, facturas y notificaciones de un usuario
  app.get('/api/subscriptions/user/:userId', (c) => {
    const userId = c.req.param('userId');
    const now = subscriptionPlatform.clock.now();
    const user = subscriptionPlatform.users.get(userId) || null;
    const sub =
      Array.from(subscriptionPlatform.subscriptions.values()).find((s) => s.userId === userId) ||
      null;
    const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub, now);
    const invoices = Array.from(subscriptionPlatform.invoices.values()).filter(
      (i) => i.userId === userId
    );
    const notifications = Array.from(subscriptionPlatform.notifications.values()).filter(
      (n) => n.userId === userId
    );

    return c.json({
      success: true,
      serverTime: now.toISOString(),
      user,
      subscription: sub,
      entitlements,
      invoices,
      notifications,
    });
  });

  // 3. Registrar perfil de estudiante y validar correo (normalización exclusiva Gmail + bloqueo desechables)
  app.post('/api/subscriptions/register-user', async (c) => {
    try {
      const body = await c.req.json();
      const profile = subscriptionPlatform.registerUser({
        uid: body.uid,
        email: body.email,
        displayName: body.displayName,
        phoneVerified: body.phoneVerified ?? true,
        taxProfile: body.taxProfile,
      });
      return c.json({ success: true, user: profile }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 4. Tokenizar método de pago (Simulador de Hosted Fields sin exponer ni guardar PAN completo)
  app.post('/api/subscriptions/tokenize-card', async (c) => {
    try {
      const body = await c.req.json();
      const tokenized = subscriptionPlatform.gateway.tokenizeCard({
        panLast4: String(body.panLast4 || '4242').slice(-4),
        brand: body.brand || 'visa',
        expMonth: Number(body.expMonth || 12),
        expYear: Number(body.expYear || 2028),
        cardholderName: body.cardholderName || 'Titular IPT',
        rawCardIdentifierForFingerprint: body.rawCardIdentifierForFingerprint,
      });
      return c.json({ success: true, paymentMethod: tokenized });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 5. Iniciar periodo de prueba (Pro = 20d, Pro+ = 15d con 1 crédito de cortesía)
  app.post('/api/subscriptions/start-trial', async (c) => {
    try {
      const body = await c.req.json();
      const sub = await subscriptionPlatform.startTrial({
        userId: body.userId,
        planId: body.planId,
        paymentMethod: body.paymentMethod,
        initialDynamicCourseSlug: body.initialDynamicCourseSlug,
      });
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub);
      return c.json({ success: true, subscription: sub, entitlements }, 201);
    } catch (err: any) {
      const status = err.message.includes('ALREADY_USED') ? 403 : 400;
      return c.json({ success: false, error: err.message }, status);
    }
  });

  // 6. Conversión anticipada en Trial para emitir Certificado Oficial
  app.post('/api/subscriptions/:subId/convert-early-certificate', async (c) => {
    try {
      const subId = c.req.param('subId');
      const res = await subscriptionPlatform.convertTrialForCertificate(subId);
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(res.subscription);
      return c.json({
        success: true,
        subscription: res.subscription,
        invoice: res.invoice,
        entitlements,
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 7. Upgrade de plan (Desde Trial o con prorrateo anti-arbitraje a mitad de ciclo)
  app.post('/api/subscriptions/:subId/upgrade', async (c) => {
    try {
      const subId = c.req.param('subId');
      const body = await c.req.json();
      const res = await subscriptionPlatform.upgradeSubscription({
        subId,
        targetPlanId: body.targetPlanId,
      });
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(res.subscription);
      return c.json({
        success: true,
        subscription: res.subscription,
        invoice: res.invoice,
        entitlements,
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 8. Programar Downgrade diferido para el fin del ciclo actual
  app.post('/api/subscriptions/:subId/downgrade', async (c) => {
    try {
      const subId = c.req.param('subId');
      const body = await c.req.json();
      const sub = subscriptionPlatform.scheduleDowngrade({
        subId,
        targetPlanId: body.targetPlanId,
        selectedDynamicCourseSlug: body.selectedDynamicCourseSlug,
      });
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub);
      return c.json({ success: true, subscription: sub, entitlements });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 9. Cancelar suscripción al corte y Deshacer cancelación (resume)
  app.post('/api/subscriptions/:subId/cancel', (c) => {
    try {
      const subId = c.req.param('subId');
      const sub = subscriptionPlatform.cancelSubscription(subId);
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub);
      return c.json({ success: true, subscription: sub, entitlements });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.post('/api/subscriptions/:subId/resume', (c) => {
    try {
      const subId = c.req.param('subId');
      const sub = subscriptionPlatform.resumeSubscription(subId);
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub);
      return c.json({ success: true, subscription: sub, entitlements });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 10. Reactivar suscripción desde Modo Archivo (read_only)
  app.post('/api/subscriptions/:subId/reactivate', async (c) => {
    try {
      const subId = c.req.param('subId');
      const body = await c.req.json().catch(() => ({}));
      const res = await subscriptionPlatform.reactivateSubscription({
        subId,
        targetPlanId: body.targetPlanId,
        newPaymentMethod: body.newPaymentMethod,
      });
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(res.subscription);
      return c.json({
        success: true,
        subscription: res.subscription,
        invoice: res.invoice,
        entitlements,
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 11. Activar o rotar curso dinámico (con validación estricta en servidor)
  app.post('/api/subscriptions/:subId/dynamic-course', async (c) => {
    try {
      const subId = c.req.param('subId');
      const body = await c.req.json();
      const sub = subscriptionPlatform.activateDynamicCourse({
        subId,
        courseSlug: body.courseSlug,
        replaceCourseSlug: body.replaceCourseSlug,
      });
      const entitlements = subscriptionPlatform.getEntitlementsForSubscription(sub);
      return c.json({ success: true, subscription: sub, entitlements });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 403);
    }
  });

  // 12. Reservar clase en vivo, cancelar reserva y evaluar quórum
  app.post('/api/live-sessions/:sessionId/book', async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      const body = await c.req.json();
      const booking = await subscriptionPlatform.bookLiveSession(body.subId, sessionId);
      return c.json({ success: true, booking }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 403);
    }
  });

  app.post('/api/live-sessions/bookings/:bookingId/cancel', async (c) => {
    try {
      const bookingId = c.req.param('bookingId');
      const body = await c.req.json();
      const booking = await subscriptionPlatform.cancelLiveBooking(bookingId, body.userId);
      return c.json({ success: true, booking });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.post('/api/live-sessions/:sessionId/evaluate-quorum', async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      const res = await subscriptionPlatform.evaluateSessionQuorum(sessionId);
      return c.json({ success: true, ...res });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  // 13. Cron Worker idempotente
  app.post('/api/cron/process-subscriptions', async (c) => {
    try {
      const res = await subscriptionPlatform.processSubscriptionsCron();
      return c.json({
        success: true,
        ...res,
        serverTime: subscriptionPlatform.clock.now().toISOString(),
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // 14. Endpoints exclusivos de /api/admin/* (Protegidos por el middleware RBAC de index.ts)
  app.put('/api/admin/subscriptions/plans/:planId', async (c) => {
    try {
      const planId = c.req.param('planId') as StandardPlanId;
      const existing = subscriptionPlatform.planConfigs[planId];
      if (!existing) {
        return c.json({ success: false, error: 'Plan no encontrado.' }, 404);
      }
      const body = (await c.req.json()) as Partial<PlanConfig>;
      subscriptionPlatform.planConfigs[planId] = {
        ...existing,
        ...body,
        id: planId,
      };
      return c.json({
        success: true,
        plan: subscriptionPlatform.planConfigs[planId],
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.post('/api/admin/organizations', async (c) => {
    try {
      const body = await c.req.json();
      const now = subscriptionPlatform.clock.now().toISOString();
      const org: Organization = {
        id: body.id || `org_${Date.now()}`,
        name: body.name,
        ownerUserId: body.ownerUserId,
        status: body.status || 'active',
        totalSeatsPurchased: Number(body.totalSeatsPurchased || 5),
        currentPeriodEnd: body.currentPeriodEnd,
        trialEnd: body.trialEnd || null,
        customTerms: {
          maxDynamicCoursesPerSeat: Number(body.maxDynamicCoursesPerSeat ?? 4),
          monthlyLiveCreditsPerSeat: Number(body.monthlyLiveCreditsPerSeat ?? 10),
          allowLiveAccess: Boolean(body.allowLiveAccess ?? true),
        },
        taxProfile: body.taxProfile,
        createdAt: now,
      };
      subscriptionPlatform.organizations.set(org.id, org);
      return c.json({ success: true, organization: org }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.post('/api/admin/organizations/:orgId/members', async (c) => {
    try {
      const orgId = c.req.param('orgId');
      const org = subscriptionPlatform.organizations.get(orgId);
      if (!org) return c.json({ success: false, error: 'Organización no encontrada.' }, 404);

      const activeMembers = subscriptionPlatform.getActiveOrgMembersSorted(orgId);
      if (activeMembers.length >= org.totalSeatsPurchased) {
        return c.json(
          {
            success: false,
            error: 'SEATS_LIMIT_REACHED: Se alcanzó el máximo de asientos contratados.',
          },
          403
        );
      }

      const body = await c.req.json();
      const now = subscriptionPlatform.clock.now().toISOString();
      const member: OrganizationMember = {
        id: `mem_${orgId}_${body.userId}`,
        organizationId: orgId,
        userId: body.userId,
        role: body.role || 'member',
        status: 'active',
        assignedAt: now,
      };
      subscriptionPlatform.organizationMembers.set(member.id, member);

      return c.json({ success: true, member }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.post('/api/admin/antifraud/exempt-fingerprint', async (c) => {
    try {
      const body = await c.req.json();
      const rec = subscriptionPlatform.approveCardFingerprintExemption({
        fingerprint: body.fingerprint,
        adminEmail: body.adminEmail || 'administrator@ivanperez.tech',
        notes: body.notes || 'Excepción aprobada manualmente',
      });
      return c.json({ success: true, record: rec });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });
}
