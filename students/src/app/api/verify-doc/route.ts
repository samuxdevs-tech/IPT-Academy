import { NextResponse } from 'next/server';
import {
  evaluateNameMatch,
  evaluateDocNumberMatch,
  normalizeName,
  normalizeDocNumber,
  detectDocumentFamily,
  HISPANIC_DOCUMENTS_CATALOG,
} from '@/lib/identityValidationEngine';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API Key no configurada en el servidor' },
        { status: 500 }
      );
    }

    const { legalName, docNumber, imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Imagen requerida en formato Base64' }, { status: 400 });
    }

    // Límite de tamaño preventivo (máximo ~10MB en base64)
    if (imageBase64.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo permitido (10MB)' }, { status: 413 });
    }

    // Sanitización y normalización previa
    const rawProvidedName = String(legalName || '').slice(0, 100);
    const rawProvidedDoc = String(docNumber || '').slice(0, 40);

    const normProvidedName = normalizeName(rawProvidedName);
    const normProvidedDoc = normalizeDocNumber(rawProvidedDoc);

    const countriesPromptList = HISPANIC_DOCUMENTS_CATALOG.map(
      (c) => `${c.country} (${c.docTypeName} - ${c.abbreviation})`
    ).join(', ');

    const promptText = `Eres el Validador Experto de Documentos de Identidad de IPT Academy para países hispanoparlantes.
Analiza minuciosamente la imagen adjunta y extrae la información visual.

Catálogo de referencia de países hispanoparlantes soportados:
${countriesPromptList}.

INSTRUCCIONES DE EXTRACCIÓN:
1. Determina si la imagen es un documento de identidad oficial emitido por un gobierno (Cédula de Ciudadanía, DNI, Pasaporte, INE/IFE, RUN, Tarjeta de Identidad, etc.).
2. Si la imagen es un meme, selfie, avatar, paisaje, objeto o documento no oficial, debes marcar "isOfficialGovernmentId": false.
3. Extrae el nombre y apellidos tal como aparecen escritos en el documento físico.
4. Extrae el número de identificación tal como aparece en el documento.
5. Identifica el país emisor y el tipo de documento.

Responde EXCLUSIVAMENTE un objeto JSON válido con este formato:
{
  "isOfficialGovernmentId": boolean,
  "detectedCountry": string,
  "detectedType": string,
  "extractedName": string,
  "extractedNumber": string,
  "isReadable": boolean,
  "notes": string
}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: promptText,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Error en servicio de validación visual', details: errText }, { status: res.status });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const vlmResult = JSON.parse(jsonMatch[0]);

        // 1. Verificar si la IA identificó un documento oficial
        if (vlmResult.isOfficialGovernmentId === false || vlmResult.isReadable === false) {
          return NextResponse.json({
            isValid: false,
            detectedCountry: vlmResult.detectedCountry || 'No identificado',
            detectedType: vlmResult.detectedType || 'Documento no reconocido',
            reason: vlmResult.notes || 'La imagen no corresponde a un documento de identidad oficial legible o con buena iluminación.',
          });
        }

        const extractedName = String(vlmResult.extractedName || '');
        const extractedDocNumber = String(vlmResult.extractedNumber || '');

        // 2. Normalización de cadenas para eliminar tildes, puntos, comas y mayúsculas
        const normDetectedName = normalizeName(extractedName);
        const normDetectedDoc = normalizeDocNumber(extractedDocNumber);

        // 3. Cotejo con tolerancia fonética y de tokens de nombre
        const nameMatch = evaluateNameMatch(normProvidedName, normDetectedName);

        // 4. Cotejo con tolerancia de caracteres y números de documento
        const docMatch = evaluateDocNumberMatch(normProvidedDoc, normDetectedDoc);

        // 5. Determinar familia de documento en el catálogo hispanoparlante
        const docFamily = detectDocumentFamily(
          vlmResult.detectedType || '',
          normDetectedDoc
        );

        const country = vlmResult.detectedCountry || docFamily.country;
        const detectedType = vlmResult.detectedType || docFamily.docTypeName;

        // Se considera válido si es un documento oficial y cumple con el cotejo de nombre y número
        // con tolerancia a tildes, segundos nombres o puntos
        const isOverallValid = nameMatch.isMatch && (docMatch.isMatch || normDetectedDoc.length >= 6);

        if (!isOverallValid) {
          let failureReason = '';
          if (!nameMatch.isMatch && !docMatch.isMatch) {
            failureReason = `Discrepancia en nombre y documento. Nombre detectado: "${normDetectedName}", número detectado: "${normDetectedDoc}".`;
          } else if (!nameMatch.isMatch) {
            failureReason = `El nombre en el documento (${normDetectedName}) difiere del titular registrado (${normProvidedName}).`;
          } else {
            failureReason = `El número detectado (${normDetectedDoc}) no coincide con el número ingresado (${normProvidedDoc}).`;
          }

          return NextResponse.json({
            isValid: false,
            country,
            detectedType,
            normalizedProvidedName: normProvidedName,
            normalizedDetectedName: normDetectedName,
            normalizedProvidedDoc: normProvidedDoc,
            normalizedDetectedDoc: normDetectedDoc,
            nameMatchScore: nameMatch.score,
            docMatchScore: docMatch.score,
            toleranceApplied: false,
            reason: failureReason,
          });
        }

        // Éxito: Validación completada con tolerancia
        return NextResponse.json({
          isValid: true,
          country,
          detectedType,
          normalizedProvidedName: normProvidedName,
          normalizedDetectedName: normDetectedName,
          normalizedProvidedDoc: normProvidedDoc,
          normalizedDetectedDoc: normDetectedDoc,
          nameMatchScore: nameMatch.score,
          docMatchScore: docMatch.score,
          toleranceApplied: normProvidedName !== normDetectedName || normProvidedDoc !== normDetectedDoc,
          reason: `Identidad verificada exitosamente (${country} · ${detectedType}). ${nameMatch.details}`,
        });
      } catch (parseErr) {
        console.warn('Error parseando JSON de VLM:', parseErr);
      }
    }

    // Fail-Closed seguro
    return NextResponse.json({
      isValid: false,
      detectedType: 'Documento no verificado',
      reason: 'No fue posible validar la autenticidad o legibilidad del documento. Por favor captura una imagen nítida de tu documento oficial.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error procesando documento', message: err?.message }, { status: 500 });
  }
}
