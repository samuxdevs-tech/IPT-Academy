/**
 * Motor Maestro de Validación de Identidad Académica e Internacional (IPT Academy)
 * 
 * Diseñado para cotejar documentos de identidad oficiales de países hispanoparlantes
 * con tolerancia inteligente a tildes, mayúsculas/minúsculas, puntos, guiones y
 * pequeñas variaciones de nombres (ej: "Ivan Perez" vs "IVÁN SAMUEL PÉREZ TORRENEGRA").
 */

export interface HispanicDocumentSpec {
  country: string;
  countryCode: string;
  docTypeName: string;
  abbreviation: string;
  description: string;
  numberPatternRegex: RegExp;
  cleanFormatExample: string;
}

/**
 * Catálogo Oficial de Documentos de Identidad de Países Hispanoparlantes
 */
export const HISPANIC_DOCUMENTS_CATALOG: HispanicDocumentSpec[] = [
  // 🇨🇴 Colombia
  {
    country: "Colombia",
    countryCode: "CO",
    docTypeName: "Cédula de Ciudadanía",
    abbreviation: "CC",
    description: "Cédula amarilla con hologramas o Cédula Digital de policarbonato",
    numberPatternRegex: /^[0-9]{6,10}$/,
    cleanFormatExample: "1098765432",
  },
  {
    country: "Colombia",
    countryCode: "CO",
    docTypeName: "Tarjeta de Identidad",
    abbreviation: "TI",
    description: "Documento oficial para menores de edad",
    numberPatternRegex: /^[0-9]{10,11}$/,
    cleanFormatExample: "1098765432",
  },
  {
    country: "Colombia",
    countryCode: "CO",
    docTypeName: "Cédula de Extranjería",
    abbreviation: "CE",
    description: "Documento de residencia legal en Colombia",
    numberPatternRegex: /^[0-9]{5,8}$/,
    cleanFormatExample: "450123",
  },

  // 🇲🇽 México
  {
    country: "México",
    countryCode: "MX",
    docTypeName: "Credencial para Votar (INE / IFE)",
    abbreviation: "INE",
    description: "Credencial oficial emitida por el Instituto Nacional Electoral",
    numberPatternRegex: /^[A-Z0-9]{9,18}$/,
    cleanFormatExample: "PRTRIV90010109H100",
  },
  {
    country: "México",
    countryCode: "MX",
    docTypeName: "CURP",
    abbreviation: "CURP",
    description: "Clave Única de Registro de Población",
    numberPatternRegex: /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/,
    cleanFormatExample: "PETI900101HDFRRN01",
  },

  // 🇦🇷 Argentina
  {
    country: "Argentina",
    countryCode: "AR",
    docTypeName: "Documento Nacional de Identidad (DNI)",
    abbreviation: "DNI",
    description: "DNI formato tarjeta emitido por el Renaper",
    numberPatternRegex: /^[0-9]{7,8}$/,
    cleanFormatExample: "38945120",
  },

  // 🇨🇱 Chile
  {
    country: "Chile",
    countryCode: "CL",
    docTypeName: "Cédula de Identidad (RUN / RUT)",
    abbreviation: "RUN",
    description: "Documento oficial con Rol Único Nacional y dígito verificador",
    numberPatternRegex: /^[0-9]{7,8}[0-9K]$/,
    cleanFormatExample: "18234567K",
  },

  // 🇵🇪 Perú
  {
    country: "Perú",
    countryCode: "PE",
    docTypeName: "Documento Nacional de Identidad (DNI)",
    abbreviation: "DNI",
    description: "DNI Azul o DNI Electrónico emitido por RENIEC",
    numberPatternRegex: /^[0-9]{8}$/,
    cleanFormatExample: "45892314",
  },

  // 🇪🇸 España
  {
    country: "España",
    countryCode: "ES",
    docTypeName: "Documento Nacional de Identidad (DNI / NIF)",
    abbreviation: "DNI",
    description: "DNI electrónico con chip emitido por el Cuerpo Nacional de Policía",
    numberPatternRegex: /^[0-9]{8}[A-Z]$/,
    cleanFormatExample: "12345678Z",
  },
  {
    country: "España",
    countryCode: "ES",
    docTypeName: "Número de Identidad de Extranjero (NIE)",
    abbreviation: "NIE",
    description: "Documento para residentes extranjeros en España",
    numberPatternRegex: /^[XYZ][0-9]{7}[A-Z]$/,
    cleanFormatExample: "X1234567L",
  },

  // 🇪🇨 Ecuador
  {
    country: "Ecuador",
    countryCode: "EC",
    docTypeName: "Cédula de Ciudadanía",
    abbreviation: "CC",
    description: "Cédula de identidad de 10 dígitos emitida por el Registro Civil",
    numberPatternRegex: /^[0-9]{10}$/,
    cleanFormatExample: "1712345678",
  },

  // 🇻🇪 Venezuela
  {
    country: "Venezuela",
    countryCode: "VE",
    docTypeName: "Cédula de Identidad (C.I.)",
    abbreviation: "CI",
    description: "Cédula laminada o electrónica con prefijo V o E",
    numberPatternRegex: /^(V|E)?[0-9]{6,8}$/,
    cleanFormatExample: "V18456789",
  },

  // 🌐 Internacional / Pasaporte Común
  {
    country: "Internacional",
    countryCode: "INT",
    docTypeName: "Pasaporte Oficial",
    abbreviation: "PAS",
    description: "Pasaporte diplomático u ordinario biométrico internacional",
    numberPatternRegex: /^[A-Z0-9]{6,12}$/,
    cleanFormatExample: "PA1234567",
  },
];

/**
 * Normaliza nombres eliminando tildes, diacríticos, caracteres especiales y espacios redundantes.
 * Ejemplo: "  Iván Samuel  Pérez Torrenegra  " -> "IVAN SAMUEL PEREZ TORRENEGRA"
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes
    .replace(/[^a-zA-Z0-9\s]/g, " ") // Reemplaza comas, puntos, guiones por espacios
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normaliza números de documento eliminando puntos, comas, guiones y espacios.
 * Ejemplo: "1.098.765.432" -> "1098765432"
 * Ejemplo: "18.234.567-K" -> "18234567K"
 */
export function normalizeDocNumber(doc: string): string {
  if (!doc) return "";
  return doc
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de texto normalizadas.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // Eliminación
        d[i][j - 1] + 1,      // Inserción
        d[i - 1][j - 1] + cost // Sustitución
      );
    }
  }
  return d[m][n];
}

/**
 * Evalúa si dos tokens son equivalentes con tolerancia a 1 caracter tipográfico.
 */
function areTokensFuzzyEqual(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;
  if (tokenA.length <= 2 || tokenB.length <= 2) return tokenA === tokenB;
  const dist = levenshteinDistance(tokenA, tokenB);
  return dist <= 1;
}

/**
 * Compara dos nombres con tolerancia inteligente a nombres incompletos, orden o tildes.
 * 
 * Por ejemplo:
 * - Registrado: "Ivan Perez"
 * - En Cédula: "IVAN SAMUEL PEREZ TORRENEGRA"
 * => Match Score: 100% (porque todos los nombres provistos por el alumno están en la cédula).
 */
export function evaluateNameMatch(
  providedName: string,
  detectedNameInDocument: string
): { score: number; isMatch: boolean; details: string } {
  const normProvided = normalizeName(providedName);
  const normDetected = normalizeName(detectedNameInDocument);

  if (!normProvided || !normDetected) {
    return { score: 0, isMatch: false, details: "Nombre no detectable en el documento." };
  }

  // Coincidencia exacta directa
  if (normProvided === normDetected) {
    return { score: 100, isMatch: true, details: "Coincidencia exacta de nombre completo." };
  }

  const providedTokens = normProvided.split(" ").filter((t) => t.length > 1);
  const detectedTokens = normDetected.split(" ").filter((t) => t.length > 1);

  if (providedTokens.length === 0 || detectedTokens.length === 0) {
    return { score: 0, isMatch: false, details: "Nombres vacíos tras normalización." };
  }

  // Contar cuántos tokens del nombre provisto aparecen en el documento
  let matchedTokens = 0;
  for (const pToken of providedTokens) {
    const found = detectedTokens.some((dToken) => areTokensFuzzyEqual(pToken, dToken));
    if (found) {
      matchedTokens++;
    }
  }

  const coveragePercent = Math.round((matchedTokens / providedTokens.length) * 100);

  // Si al menos el 70% de los tokens provistos (ej: Nombre y Apellido) están en la cédula, es match
  const isMatch = coveragePercent >= 70;

  return {
    score: coveragePercent,
    isMatch,
    details: isMatch
      ? `Coincidencia aceptada (${coveragePercent}% de nombres reconocidos sin conflicto de tildes o puntos).`
      : `Discrepancia en nombres: solo se reconoció el ${coveragePercent}% de las palabras.`,
  };
}

/**
 * Compara dos números de documento con tolerancia a ceros a la izquierda y prefijos.
 */
export function evaluateDocNumberMatch(
  providedDoc: string,
  detectedDocInDocument: string
): { score: number; isMatch: boolean; details: string } {
  const normProvided = normalizeDocNumber(providedDoc);
  const normDetected = normalizeDocNumber(detectedDocInDocument);

  if (!normProvided || !normDetected) {
    return { score: 0, isMatch: false, details: "Número de documento ausente o ilegible." };
  }

  if (normProvided === normDetected) {
    return { score: 100, isMatch: true, details: "Número de documento idéntico." };
  }

  // Tolerancia: si uno contiene al otro (por ejemplo por prefijo "CC" o "V")
  const digitsOnlyProvided = normProvided.replace(/\D/g, "");
  const digitsOnlyDetected = normDetected.replace(/\D/g, "");

  if (
    digitsOnlyProvided.length >= 6 &&
    digitsOnlyDetected.length >= 6 &&
    digitsOnlyProvided === digitsOnlyDetected
  ) {
    return {
      score: 100,
      isMatch: true,
      details: "Número de documento coincide exactamente en sus dígitos principales.",
    };
  }

  if (
    digitsOnlyProvided.length >= 6 &&
    digitsOnlyDetected.length >= 6 &&
    (digitsOnlyDetected.includes(digitsOnlyProvided) || digitsOnlyProvided.includes(digitsOnlyDetected))
  ) {
    return {
      score: 95,
      isMatch: true,
      details: "Número de documento aceptado por inclusión de dígitos base.",
    };
  }

  return {
    score: 0,
    isMatch: false,
    details: `El número detectado (${normDetected}) no coincide con el registrado (${normProvided}).`,
  };
}

/**
 * Detecta qué país y tipo de documento hispanoparlante se aproxima más a los datos
 */
export function detectDocumentFamily(
  detectedTypeName: string,
  cleanDocNumber: string
): HispanicDocumentSpec {
  const normType = normalizeName(detectedTypeName);

  for (const doc of HISPANIC_DOCUMENTS_CATALOG) {
    const normCatalogName = normalizeName(doc.docTypeName);
    const normAbbr = normalizeName(doc.abbreviation);

    if (
      normType.includes(normCatalogName) ||
      normType.includes(normAbbr) ||
      (doc.numberPatternRegex.test(cleanDocNumber) && doc.country === "Colombia") // Preferencia Colombia como sede de IPT
    ) {
      return doc;
    }
  }

  // Fallback si es genérico
  return {
    country: "Hispanoamérica",
    countryCode: "LATAM",
    docTypeName: detectedTypeName || "Documento Nacional Oficial",
    abbreviation: "DOC",
    description: "Documento oficial reconocido de identidad",
    numberPatternRegex: /^[A-Z0-9]{5,20}$/,
    cleanFormatExample: cleanDocNumber,
  };
}
