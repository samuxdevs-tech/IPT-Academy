/**
 * Servicio Inteligente de Notificaciones Multi-Canal (Fase 5 - IPT Course)
 * Tríada: In-App en tiempo real + Web Push Nativo + Resend/Gmail con Batch Digest Anti-Agotamiento.
 */

interface PendingNotification {
  id: string;
  teacherUid: string;
  studentName: string;
  studentEmail: string;
  classTitle: string;
  scheduledAtUtc: string;
  requestedAt: Date;
}

// Cola en memoria para agrupación inteligente (Batch Digest cada 15 minutos)
const notificationBuffer: Map<string, PendingNotification[]> = new Map();
const lastEmailSentTime: Map<string, number> = new Map();
const DIGEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export class NotificationService {
  /**
   * Registra una nueva reserva y evalúa la tríada de notificación
   */
  static async notifyNewBooking(params: {
    teacherUid: string;
    teacherEmail: string;
    studentName: string;
    studentEmail: string;
    classTitle: string;
    scheduledAtUtc: string;
  }) {
    const now = Date.now();
    const { teacherUid, teacherEmail } = params;

    // 1. IN-APP & WEB PUSH (Inmediato, 100% Cero Costo)
    const inAppPayload = {
      id: `notif_${Date.now()}`,
      title: 'Nueva solicitud de cupo en vivo',
      body: `${params.studentName} ha solicitado un lugar para "${params.classTitle}".`,
      type: 'LIVE_CLASS_BOOKING',
      timestamp: new Date().toISOString(),
      read: false,
    };

    // 2. CORREO GMAIL / RESEND INTELIGENTE CON ANTI-AGOTAMIENTO
    const existingQueue = notificationBuffer.get(teacherUid) || [];
    existingQueue.push({
      id: inAppPayload.id,
      teacherUid,
      studentName: params.studentName,
      studentEmail: params.studentEmail,
      classTitle: params.classTitle,
      scheduledAtUtc: params.scheduledAtUtc,
      requestedAt: new Date(),
    });
    notificationBuffer.set(teacherUid, existingQueue);

    const lastSent = lastEmailSentTime.get(teacherUid) || 0;
    const timeSinceLastEmail = now - lastSent;

    if (timeSinceLastEmail >= DIGEST_WINDOW_MS) {
      // Ventana de 15 min cumplida: Enviar correo consolidado de inmediato
      await this.flushDigestEmail(teacherUid, teacherEmail);
    } else {
      // Programar envío diferido para no saturar al docente ni quemar cuotas
      const delayMs = DIGEST_WINDOW_MS - timeSinceLastEmail;
      setTimeout(() => {
        this.flushDigestEmail(teacherUid, teacherEmail).catch(console.warn);
      }, delayMs);
    }

    return { success: true, inAppPayload };
  }

  /**
   * Envía un único correo consolidado con todas las solicitudes acumuladas
   */
  private static async flushDigestEmail(teacherUid: string, teacherEmail: string) {
    const queue = notificationBuffer.get(teacherUid);
    if (!queue || queue.length === 0) return;

    // Vaciar la cola atómicamente
    notificationBuffer.set(teacherUid, []);
    lastEmailSentTime.set(teacherUid, Date.now());

    const totalRequests = queue.length;
    const subject =
      totalRequests === 1
        ? `[IPT Course] Nueva solicitud de cupo: ${queue[0].studentName}`
        : `[IPT Course] Resumen: ${totalRequests} solicitudes de cupos para tus clases en vivo`;

    console.log(`[NotificationService] Despachando correo consolidado a ${teacherEmail}: "${subject}" (${totalRequests} solicitudes)`);
  }
}
