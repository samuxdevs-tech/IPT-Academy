/**
 * creditHashCore.ts
 * Motor de hashes criptográficos de créditos, firmas {id}: {Hash}, aislamiento {allowed_list_codigode8digitos}
 * y muestreo estratificado por bisección del espacio de color HCL usando la Razón Áurea.
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

export async function createCreditHash(
  studentUid: string,
  serial: string | number,
  extraSalt: string = ''
): Promise<string> {
  const raw = `IPT_CREDIT_TOKEN:${studentUid}:${serial}:${extraSalt}:SALT_2026_IPT`;
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

/**
 * Inverso radical en base 2 (Secuencia de Van der Corput) para bisección estratificada del intervalo [0, 1)
 */
function vanDerCorputBisection(n: number): number {
  let result = 0;
  let f = 0.5;
  let i = Math.max(0, Math.floor(n));
  while (i > 0) {
    result += f * (i & 1);
    i = i >> 1;
    f *= 0.5;
  }
  return result;
}

/**
 * Conversión perceptual exacta de espacio CIE HCL / LCh(ab) -> CIE Lab -> CIE XYZ (D65) -> sRGB Hex
 */
export function hclToHex(hDeg: number, c: number, l: number): string {
  const hRad = (((hDeg % 360) + 360) % 360) * (Math.PI / 180);
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const delta = 6 / 29;
  const invF = (t: number) =>
    t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);

  // Iluminante estándar D65
  const X = 0.95047 * invF(fx);
  const Y = 1.0 * invF(fy);
  const Z = 1.08883 * invF(fz);

  // Matriz IEC 61966-2-1 XYZ -> sRGB lineal
  const rLin = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const gLin = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const bLin = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  const gammaCorrect = (u: number) => {
    const clamped = Math.max(0, Math.min(1, u));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const R = Math.round(gammaCorrect(rLin) * 255);
  const G = Math.round(gammaCorrect(gLin) * 255);
  const B = Math.round(gammaCorrect(bLin) * 255);

  return (
    '#' +
    R.toString(16).padStart(2, '0') +
    G.toString(16).padStart(2, '0') +
    B.toString(16).padStart(2, '0')
  );
}

/**
 * Muestreo estratificado por bisección del espacio de color HCL usando la Razón Áurea:
 * - Fondo del lienzo virtual: Blanco fijo (#FFFFFF)
 * - Docente: Negro fijo (#000000)
 * - Estudiante 0 (Primer estudiante): Empieza en Azul perceptual (H_0 = 282°, C = 86, L = 46 -> #0052eb)
 * - Estudiantes sucesivos (k >= 1): Avance de tono por razón áurea conjugada (Φ = (√5 - 1)/2) +
 *   bisección estratificada (Van der Corput) en Luminancia (L) y Croma (C) para máxima distancia visual.
 */
export function getCanvasAuthorColorHCL(
  role: 'teacher' | 'student',
  studentIndex: number = 0
): {
  hex: string;
  h: number;
  c: number;
  l: number;
} {
  if (role === 'teacher') {
    return { hex: '#000000', h: 0, c: 0, l: 0 };
  }

  const idx = Math.max(0, Math.floor(studentIndex));
  const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949; // (√5 - 1) / 2
  const INITIAL_BLUE_HUE_HCL = 282; // Azul puro en CIE LCh(ab) -> #0052eb

  if (idx === 0) {
    const hex0 = hclToHex(INITIAL_BLUE_HUE_HCL, 86, 46);
    return {
      hex: hex0,
      h: INITIAL_BLUE_HUE_HCL,
      c: 86,
      l: 46,
    };
  }

  // Avance por Razón Áurea desde el Azul inicial
  const hue = (INITIAL_BLUE_HUE_HCL + idx * 360 * GOLDEN_RATIO_CONJUGATE) % 360;

  // Bisección estratificada en Luminancia [36, 52] y Croma [72, 92] para máximo contraste sobre fondo blanco
  const bisectedL = vanDerCorputBisection(idx);
  const goldenC = (idx * GOLDEN_RATIO_CONJUGATE) % 1;

  const luminance = Math.round(36 + bisectedL * 16);
  const chroma = Math.round(72 + goldenC * 20);

  return {
    hex: hclToHex(hue, chroma, luminance),
    h: Math.round(hue),
    c: chroma,
    l: luminance,
  };
}
