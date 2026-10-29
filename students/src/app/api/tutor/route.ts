import { NextResponse } from 'next/server';

const GROQ_MODEL = 'openai/gpt-oss-120b';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API Key no configurada en el servidor.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { messages, tools, temperature, max_tokens } = body;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        tools,
        temperature: temperature ?? 0.3,
        max_tokens: max_tokens ?? 600,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: 'Error del motor de IA', details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error procesando solicitud de tutor', message: err?.message },
      { status: 500 }
    );
  }
}
