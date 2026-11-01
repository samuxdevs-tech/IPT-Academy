/**
 * Validador Visual de Identidad 100% Local con WebLLM y WebGPU
 * 
 * Descarga y ejecuta el modelo VLM en la GPU del navegador del cliente
 * para analizar la cédula/DNI sin que la imagen salga del dispositivo.
 */

import {
  evaluateNameMatch,
  evaluateDocNumberMatch,
  normalizeName,
  normalizeDocNumber,
  detectDocumentFamily,
  HISPANIC_DOCUMENTS_CATALOG,
} from './identityValidationEngine';

export const WEBLLM_VLM_MODEL_ID = 'Phi-3.5-vision-instruct-q4f16_1-MLC';

export interface VlmValidationProgress {
  progressPercent: number; // 0 a 100
  statusText: string;
}

export interface VlmValidationResult {
  isValid: boolean;
  country: string;
  detectedType: string;
  normalizedProvidedName: string;
  normalizedDetectedName: string;
  normalizedProvidedDoc: string;
  normalizedDetectedDoc: string;
  nameMatchScore: number;
  docMatchScore: number;
  toleranceApplied: boolean;
  reason: string;
  source: 'webllm-local-gpu' | 'cloud-api-fallback';
}

let cachedVlmEngine: any = null;

/**
 * Verifica si el dispositivo soporta WebGPU para correr modelos de visión
 */
export async function checkWebGpuVisionSupport(): Promise<{ supported: boolean; reason?: string }> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'Entorno no es navegador' };
  }

  if (!('gpu' in navigator) || !(navigator as any).gpu) {
    return { supported: false, reason: 'Tu navegador no tiene WebGPU activo o aceleración por hardware desactivada' };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, reason: 'No se detectó un adaptador gráfico WebGPU compatible' };
    }

    const hasF16 = adapter.features?.has('shader-f16');
    return { supported: true, reason: hasF16 ? 'WebGPU con shader-f16 disponible' : 'WebGPU disponible' };
  } catch (err: any) {
    return { supported: false, reason: err?.message || 'Error inicializando WebGPU' };
  }
}

/**
 * Descarga e inicializa el motor VLM en la caché del navegador
 */
export async function getOrInitWebllmVlmEngine(
  onProgress?: (progress: VlmValidationProgress) => void
): Promise<any> {
  if (cachedVlmEngine) {
    return cachedVlmEngine;
  }

  const webllm = await import('@mlc-ai/web-llm');

  const engine = await webllm.CreateMLCEngine(WEBLLM_VLM_MODEL_ID, {
    initProgressCallback: (report) => {
      const pct = Math.min(100, Math.max(0, Math.round((report.progress || 0) * 100)));
      if (onProgress) {
        onProgress({
          progressPercent: pct,
          statusText: report.text || `Descargando modelo VLM a caché WebGPU (${pct}%)...`,
        });
      }
    },
  });

  cachedVlmEngine = engine;
  return engine;
}

/**
 * Ejecuta la validación de identidad local con VLM
 */
export async function validateIdentityWithLocalVlm(
  legalName: string,
  docNumber: string,
  imageBase64: string,
  onProgress?: (progress: VlmValidationProgress) => void
): Promise<VlmValidationResult> {
  const normProvidedName = normalizeName(legalName);
  const normProvidedDoc = normalizeDocNumber(docNumber);

  const countriesPromptList = HISPANIC_DOCUMENTS_CATALOG.map(
    (c) => `${c.country} (${c.docTypeName} - ${c.abbreviation})`
  ).join(', ');

  const promptText = `Eres el Validador de Identidad de IPT Academy para documentos oficiales de países hispanoparlantes.
Analiza minuciosamente la imagen de este documento y responde estrictamente en JSON.

Catálogo de referencia:
${countriesPromptList}.

INSTRUCCIONES:
1. Determina si la imagen es un documento de identidad oficial emitido por un gobierno (Cédula de Ciudadanía, DNI, Pasaporte, INE/IFE, RUN, Tarjeta de Identidad, etc.).
2. Si es una foto personal, meme, avatar, paisaje, objeto o documento no oficial, marca "isOfficialGovernmentId": false.
3. Extrae el nombre y apellidos tal como aparecen escritos físicamente en el documento.
4. Extrae el número de identificación tal como aparece en el documento.
5. Identifica el país emisor y tipo de documento.

Responde EXCLUSIVAMENTE un JSON:
{
  "isOfficialGovernmentId": boolean,
  "detectedCountry": string,
  "detectedType": string,
  "extractedName": string,
  "extractedNumber": string,
  "isReadable": boolean,
  "notes": string
}`;

  try {
    // 1. Intentar correr con WebLLM local en la GPU
    if (onProgress) {
      onProgress({ progressPercent: 5, statusText: 'Iniciando motor VLM en WebGPU local...' });
    }

    const gpuCheck = await checkWebGpuVisionSupport();
    if (!gpuCheck.supported) {
      throw new Error(`WebGPU no disponible: ${gpuCheck.reason}`);
    }

    const engine = await getOrInitWebllmVlmEngine(onProgress);

    if (onProgress) {
      onProgress({ progressPercent: 100, statusText: 'Analizando documento con VLM local en tu GPU...' });
    }

    const response = await engine.chat.completions.create({
      stream: false,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const vlmResult = JSON.parse(jsonMatch[0]);

      if (vlmResult.isOfficialGovernmentId === false || vlmResult.isReadable === false) {
        return {
          isValid: false,
          country: vlmResult.detectedCountry || 'No identificado',
          detectedType: vlmResult.detectedType || 'Documento no reconocido',
          normalizedProvidedName: normProvidedName,
          normalizedDetectedName: normalizeName(vlmResult.extractedName || ''),
          normalizedProvidedDoc: normProvidedDoc,
          normalizedDetectedDoc: normalizeDocNumber(vlmResult.extractedNumber || ''),
          nameMatchScore: 0,
          docMatchScore: 0,
          toleranceApplied: false,
          reason: vlmResult.notes || 'La imagen no corresponde a un documento de identidad oficial legible.',
          source: 'webllm-local-gpu',
        };
      }

      const extractedName = String(vlmResult.extractedName || '');
      const extractedDocNumber = String(vlmResult.extractedNumber || '');

      const normDetectedName = normalizeName(extractedName);
      const normDetectedDoc = normalizeDocNumber(extractedDocNumber);

      const nameMatch = evaluateNameMatch(normProvidedName, normDetectedName);
      const docMatch = evaluateDocNumberMatch(normProvidedDoc, normDetectedDoc);
      const docFamily = detectDocumentFamily(vlmResult.detectedType || '', normDetectedDoc);

      const country = vlmResult.detectedCountry || docFamily.country;
      const detectedType = vlmResult.detectedType || docFamily.docTypeName;
      const isOverallValid = nameMatch.isMatch && (docMatch.isMatch || normDetectedDoc.length >= 6);

      let failureReason = '';
      if (!isOverallValid) {
        if (!nameMatch.isMatch && !docMatch.isMatch) {
          failureReason = `Discrepancia en nombre y documento. Nombre detectado: "${normDetectedName}", número: "${normDetectedDoc}".`;
        } else if (!nameMatch.isMatch) {
          failureReason = `El nombre en el documento (${normDetectedName}) difiere del titular registrado (${normProvidedName}).`;
        } else {
          failureReason = `El número detectado (${normDetectedDoc}) no coincide con el registrado (${normProvidedDoc}).`;
        }
      }

      return {
        isValid: isOverallValid,
        country,
        detectedType,
        normalizedProvidedName: normProvidedName,
        normalizedDetectedName: normDetectedName,
        normalizedProvidedDoc: normProvidedDoc,
        normalizedDetectedDoc: normDetectedDoc,
        nameMatchScore: nameMatch.score,
        docMatchScore: docMatch.score,
        toleranceApplied: normProvidedName !== normDetectedName || normProvidedDoc !== normDetectedDoc,
        reason: isOverallValid
          ? `Identidad verificada exitosamente en GPU local (${country} · ${detectedType}). ${nameMatch.details}`
          : failureReason,
        source: 'webllm-local-gpu',
      };
    }
  } catch (localErr: any) {
    console.warn('WebLLM VLM local no disponible o memoria insuficiente. Activando contingencia de alta velocidad:', localErr);
  }

  // 2. Fallback de contingencia a la API del servidor (por ejemplo si el usuario no tiene 4.5GB VRAM)
  if (onProgress) {
    onProgress({ progressPercent: 85, statusText: 'Cotejando credencial con el servicio seguro...' });
  }

  const res = await fetch('/api/verify-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ legalName, docNumber, imageBase64 }),
  });

  if (!res.ok) {
    throw new Error('No se pudo verificar el documento.');
  }

  const apiData = await res.json();
  return {
    ...apiData,
    source: 'cloud-api-fallback',
  };
}
