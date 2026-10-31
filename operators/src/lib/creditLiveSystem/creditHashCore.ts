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

export async function createCreditHash(studentUid: string, serial: string): Promise<string> {
  const raw = `IPT_CREDIT_TOKEN:${studentUid}:${serial}:SALT_2026_IPT`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
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

export function generateSessionCode8(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
