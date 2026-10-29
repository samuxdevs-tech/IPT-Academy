/**
 * Generador oficial de folios de certificación IPT Academy
 * Estructura oficial: IPT-{timestep hasta minutos}-{2 numeros de confirmacion/aleatoriedad}{caracter especial comun}
 * Ejemplo: IPT-202610291832-42# o IPT-202610291832-87@
 */

export const COMMON_SPECIAL_CHARS = ['#', '@', '*', '!', '+', '_'] as const;

export function generateIptCertificateFolio(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Timestep hasta minutos: YYYYMMDDHHmm
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const timestepMin = `${year}${month}${day}${hours}${minutes}`;

  // 2 números de confirmación / aleatoriedad (00 a 99)
  const random2Digits = pad(Math.floor(Math.random() * 100));

  // Carácter especial común
  const specialChar = COMMON_SPECIAL_CHARS[Math.floor(Math.random() * COMMON_SPECIAL_CHARS.length)];

  return `IPT-${timestepMin}-${random2Digits}${specialChar}`;
}

/**
 * Sanitiza una clave para su almacenamiento seguro como path en Firebase Realtime Database
 * evitando caracteres prohibidos (., #, $, [, ]) mientras preserva el folio íntegro en la propiedad de datos.
 */
export function sanitizeRtdbKey(key: string): string {
  return key.replace(/[.#$\[\]]/g, '_');
}
