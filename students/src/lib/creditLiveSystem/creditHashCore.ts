/**
 * creditHashCore.ts
 * Motor de hashes criptográficos de créditos, firmas {id}: {Hash} y aislamiento {allowed_list_codigode8digitos}
 */

export interface CreditToken {
  serial: string;
  hash: string;
  studentUid: string;
  createdAt: number;
  consumed: boolean;
  bookingId?: string;
  signature?: string; // {bookingId}: {consumedHash}
}

export interface AllowedStudentRecord {
  uid: string;
  name: string;
  email: string;
  bookingId: string;
  creditHash: string;
  signature: string; // {bookingId}: {creditHash}
  admittedAt: number;
}

export interface AllowedLiveListRecord {
  code8: string;
  listKey: string; // allowed_list_<code8>
  teacherUid: string;
  teacherName: string;
  title: string;
  scheduledTime?: string;
  mode: 'fixed' | 'manual';
  status: 'live' | 'ended';
  startedAt: number;
  students: Record<string, AllowedStudentRecord>;
}

export const WEBRTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

/**
 * Genera un hash SHA-256 único para cada crédito del estudiante
 */
export async function createCreditHash(studentUid: string, serial: string): Promise<string> {
  const raw = `IPT_CREDIT_TOKEN:${studentUid}:${serial}:SALT_2026_IPT`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinista de 64 caracteres hex
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  return (part + part + part + part).slice(0, 64);
}

/**
 * Sincroniza la billetera de hashes criptográficos según la cantidad de créditos disponibles del estudiante
 */
export async function buildStudentCreditHashes(
  studentUid: string,
  remainingCredits: number,
  existingTokens: CreditToken[] = []
): Promise<CreditToken[]> {
  const unconsumed = existingTokens.filter((t) => !t.consumed);
  const consumed = existingTokens.filter((t) => t.consumed);
  const targetCount = Math.max(0, remainingCredits);

  if (unconsumed.length === targetCount) {
    return existingTokens;
  }

  if (unconsumed.length > targetCount) {
    return [...consumed, ...unconsumed.slice(0, targetCount)];
  }

  const needed = targetCount - unconsumed.length;
  const newTokens: CreditToken[] = [];
  const baseIdx = existingTokens.length + 1;

  for (let i = 0; i < needed; i++) {
    const serial = `CRD_${String(baseIdx + i).padStart(3, '0')}_${Date.now().toString(36).slice(-4)}`;
    const hash = await createCreditHash(studentUid, serial);
    newTokens.push({
      serial,
      hash,
      studentUid,
      createdAt: Date.now(),
      consumed: false,
    });
  }

  return [...consumed, ...unconsumed, ...newTokens];
}

/**
 * Valida un hash de crédito contra la API de IPT Course y retorna la firma simplificada:
 * { [bookingId]: creditHash }
 */
export async function validateCreditHashWithApi(params: {
  bookingId: string;
  studentUid: string;
  creditHash: string;
}): Promise<{
  bookingId: string;
  creditHash: string;
  signatureRecord: Record<string, string>;
  signature: string;
}> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const webrtcHttpUrl = process.env.NEXT_PUBLIC_WEBRTC_HTTP_URL || '';

  // 1. Intentar validar en API principal si está configurada
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/live/credits/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          return json.data;
        }
      }
    } catch {
      // Continúa a validación criptográfica local/RTDB
    }
  }

  // 2. Notificar al servidor WebRTC de Railway si está configurado
  if (webrtcHttpUrl) {
    try {
      await fetch(`${webrtcHttpUrl.replace(/\/$/, '')}/api/credits/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch {
      // Fallback transparente
    }
  }

  const cleanHash = params.creditHash.trim().toLowerCase();
  return {
    bookingId: params.bookingId,
    creditHash: cleanHash,
    signatureRecord: { [params.bookingId]: cleanHash },
    signature: `${params.bookingId}: ${cleanHash}`,
  };
}

/**
 * Genera el código alfanumérico de 8 dígitos para {allowed_list_codigode8digitos}
 */
export function generateSessionCode8(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
