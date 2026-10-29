import { NextResponse } from 'next/server';

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

    // Sanitización básica para mitigar inyecciones en el prompt
    const cleanName = String(legalName || '').slice(0, 100).replace(/["\n\r]/g, '');
    const cleanDoc = String(docNumber || '').slice(0, 30).replace(/["\n\r]/g, '');

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
                text: `Determina con estricta rigurosidad si esta imagen es un documento de identidad oficial emitido por un gobierno (por ejemplo: Cédula de Ciudadanía, Tarjeta de Identidad, Cédula de Extranjería, DNI o Pasaporte) del titular "${cleanName}" con número aproximado "${cleanDoc}". Si la imagen es una foto cualquiera, captura de pantalla, meme, avatar, paisaje, documento no oficial u objeto no relacionado, debes marcar isValid: false. Responde EXCLUSIVAMENTE un JSON: {"isValid": boolean, "detectedType": string, "reason": string}`,
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
      return NextResponse.json({ error: 'Error en servicio de validación', details: errText }, { status: res.status });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.isValid === 'boolean') {
          return NextResponse.json(parsed);
        }
      } catch {}
    }

    // Fail-Closed seguro: si la IA no devuelve una confirmación estructurada válida, rechazar por defecto
    return NextResponse.json({
      isValid: false,
      detectedType: 'Documento no verificado',
      reason: 'No fue posible validar la autenticidad o legibilidad del documento. Por favor captura una imagen clara y bien iluminada de tu documento oficial.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error procesando documento', message: err?.message }, { status: 500 });
  }
}
