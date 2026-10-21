/**
 * Utilidades de licenciamiento y verificación de cursos de TecnoGan Academy.
 * Implementa funciones criptográficas estándar para firmas de acceso y control de permisos.
 */

import { Course } from '@/types';

/**
 * Cálculo síncrono estándar de digest SHA-256 en TypeScript puro.
 * Compatible universalmente con runtime de Node.js y navegador web sin dependencias externas.
 */
export function computeSHA256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * candidate; i < 312; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let formatted = ascii + '\x80';
  while (formatted.length % 64 !== 56) {
    formatted += '\x00';
  }

  for (let i = 0; i < formatted.length; i++) {
    const j = formatted.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];
    hash.length = 8;

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 =
        hash[7] +
        s1 +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = s0 + maj;

      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

const LICENSE_SALT = 'TG-ACADEMY-PRECISION-KEY-2026';

/**
 * Genera de forma transparente y determinista el identificador de licenciamiento para un curso.
 */
export function generateCourseLicenseToken(courseSlug: string): string {
  const cleanSlug = String(courseSlug || 'datagan-course').trim().toLowerCase();
  return computeSHA256(`${cleanSlug}:${LICENSE_SALT}`);
}

/**
 * Determina si el perfil del usuario posee la licencia activa para el curso.
 */
export function verifyUserHasCourseLicense(
  course: Course,
  userLicenses: Record<string, any> | string[] | undefined
): boolean {
  if (!course) return false;

  const expectedToken = course.licenseToken || generateCourseLicenseToken(course.slug);

  if (!userLicenses) return false;

  if (Array.isArray(userLicenses)) {
    return userLicenses.includes(expectedToken);
  }

  if (typeof userLicenses === 'object') {
    // Si viene como mapa { [slug]: token } o { [token]: true }
    if (userLicenses[course.slug] === expectedToken) {
      return true;
    }
    if (userLicenses[expectedToken] === true || userLicenses[expectedToken] === expectedToken) {
      return true;
    }
    return Object.values(userLicenses).some(val => val === expectedToken);
  }

  return false;
}

/**
 * Formatea con exactitud la hora de emisión de una credencial o certificado.
 */
export function formatExactIssueTime(isoString?: string): string {
  if (!isoString) return '--:--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--:--';

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}
