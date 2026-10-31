/**
 * creditHashCore.ts
 * Motor criptográfico para créditos de IPT Course y códigos efímeros de sesión (8 dígitos).
 */

export interface CreditToken {
  serial: string;
  hash: string;
  studentUid: string;
  createdAt: number;
  consumed: boolean;
  signature?: string; // {bookingId}: {consumedHash}
}

export interface LiveSessionRecord {
  sessionCode8: string;
  teacherUid: string;
  teacherName: string;
  courseTitle: string;
  mode: 'fixed' | 'manual';
  status: 'live' | 'ended';
  createdAt: number;
  allowed_live_students: Array<{
    studentUid: string;
    studentName: string;
    creditSignature: string; // {id}: {Hash}
  }>;
}

export async function createCreditHash(studentUid: string, serial: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback pseudo-hash
    return `hash_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
  }
  const encoder = new TextEncoder();
  const raw = `IPT_CREDIT:${studentUid}:${serial}:TIME_${Date.now()}`;
  const data = encoder.encode(raw);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSessionCode8(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
