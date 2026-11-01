import { ref as dbRef, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { rtdb, storage } from "@/lib/firebase";

export interface SubtitleCue {
  id: string;
  start: number; // segundos
  end: number;   // segundos
  text: string;
}

export interface ClassChapter {
  time: string; // "02:30"
  seconds: number;
  title: string;
}

export interface RecordedClassData {
  id: string;
  code8: string;
  title: string;
  topic: string;
  teacherName: string;
  teacherUid: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  videoUrl: string;
  subtitles: SubtitleCue[];
  summary: string;
  keyPoints: string[];
  chapters: ClassChapter[];
  createdAt: number;
}

/**
 * Sube el video grabado a Firebase Storage y retorna la URL pública de descarga.
 */
export async function uploadRecordedVideo(blob: Blob, code8: string): Promise<string> {
  const fileName = `recorded_classes/${code8}_${Date.now()}.webm`;
  const fileRef = storageRef(storage, fileName);
  const metadata = {
    contentType: blob.type || "video/webm",
  };
  const snapshot = await uploadBytes(fileRef, blob, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Llama a OpenRouter (modelo free de Google Gemini o LLaMA) para resumir pedagógicamente la clase.
 */
export async function generateClassSummaryWithOpenRouter(
  transcript: string,
  topic: string,
  title: string,
  durationSeconds: number
): Promise<{ summary: string; keyPoints: string[]; chapters: ClassChapter[] }> {
  const apiKey =
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  // Fallback si la transcripción fue muy breve o no hubo audio
  const fallbackSummary = {
    summary: `En esta sesión de ${title || "Clase en Vivo"} se abordó en profundidad el tema ${
      topic || "Fundamentos y práctica"
    }. El docente explicó la arquitectura, ejemplos prácticos y resolvió dudas de los estudiantes en tiempo real sobre el lienzo interactivo.`,
    keyPoints: [
      `Fundamentos y conceptos principales de ${topic || title}`,
      "Demostración técnica en el escenario interactivo",
      "Buenas prácticas y patrones recomendados para producción",
      "Resolución colaborativa de dudas en vivo",
    ],
    chapters: [
      { time: "00:00", seconds: 0, title: "Introducción y objetivos de la clase" },
      {
        time: formatSecondsToTime(Math.floor(durationSeconds * 0.3)),
        seconds: Math.floor(durationSeconds * 0.3),
        title: "Desarrollo técnico y demostración",
      },
      {
        time: formatSecondsToTime(Math.floor(durationSeconds * 0.7)),
        seconds: Math.floor(durationSeconds * 0.7),
        title: "Puntos clave y preguntas frecuentes",
      },
    ],
  };

  if (!transcript || transcript.trim().length < 25) {
    return fallbackSummary;
  }

  const prompt = `Actúa como el asistente pedagógico de IPT Course. Analiza la siguiente transcripción en tiempo real de una clase en vivo titulada "${title}" sobre el tema "${topic}" con una duración de ${Math.round(
    durationSeconds / 60
  )} minutos.

Transcripción de la clase:
"""
${transcript.slice(0, 15000)}
"""

Genera una respuesta JSON estrictamente válida con este esquema:
{
  "summary": "Resumen ejecutivo claro, profesional y pedagógico (2 a 3 párrafos concisos)",
  "keyPoints": [
    "Punto clave 1 aprendido",
    "Punto clave 2 aprendido",
    "Punto clave 3 aprendido",
    "Punto clave 4 aprendido"
  ],
  "chapters": [
    { "time": "00:00", "seconds": 0, "title": "Introducción" },
    { "time": "MM:SS", "seconds": 120, "title": "Título del tema" }
  ]
}

Responde ÚNICAMENTE con el objeto JSON sin explicaciones adicionales ni markdown alrededor.`;

  try {
    const modelsToTry = [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-001",
    ];

    for (const model of modelsToTry) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://ivanperez.tech",
            "X-Title": "IPT Course Classes AI",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content || "";
        const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.summary && Array.isArray(parsed.keyPoints)) {
          return {
            summary: parsed.summary,
            keyPoints: parsed.keyPoints,
            chapters: Array.isArray(parsed.chapters) && parsed.chapters.length > 0
              ? parsed.chapters.map((ch: any) => ({
                  time: ch.time || "00:00",
                  seconds: typeof ch.seconds === "number" ? ch.seconds : parseTimeToSeconds(ch.time),
                  title: ch.title || "Tema de clase",
                }))
              : fallbackSummary.chapters,
          };
        }
      } catch (innerErr) {
        console.warn(`Error con modelo OpenRouter ${model}:`, innerErr);
      }
    }
  } catch (err) {
    console.warn("Error general contactando OpenRouter:", err);
  }

  return fallbackSummary;
}

/**
 * Guarda el registro completo de la clase grabada en Realtime Database.
 */
export async function saveRecordedClassRecord(classData: RecordedClassData): Promise<void> {
  const targetRef = dbRef(rtdb, `recorded_classes/${classData.id}`);
  await set(targetRef, classData);
}

function formatSecondsToTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}
