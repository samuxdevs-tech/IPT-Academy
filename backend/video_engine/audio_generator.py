"""
Professional Multi-Voice Pedagogical Audio Pipeline - Zero Language Contamination
- es-CO-SalomeNeural: Warm Colombian Spanish instruction ONLY (0 English words).
- en-US-JennyNeural: Native US English female speaker.
- en-US-GuyNeural: Native US English male speaker.
"""

import asyncio
import os
import subprocess
import json
import edge_tts

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_audio")
os.makedirs(TEMP_DIR, exist_ok=True)

# Master pedagogical script with 100% strict language separation
SCRIPT_LINES = [
    # Scene 1: Welcome & Affective Filter
    ("es", "es-CO-SalomeNeural", "+0%", "¡Hola! Te doy la bienvenida a tu curso de inglés en Aipi-tí Cors.", 0.25),
    ("es", "es-CO-SalomeNeural", "+0%", "Sé que empezar desde cero puede dar un poquito de nervios, pero aquí vamos paso a paso.", 0.25),
    ("es", "es-CO-SalomeNeural", "+0%", "Hoy aprenderás lo más importante: saludar y presentarte con total seguridad.", 0.5),

    # Scene 2: Vocabulary "Hello"
    ("es", "es-CO-SalomeNeural", "+0%", "Para saludar a cualquier persona en cualquier momento, la palabra universal es:", 0.25),
    ("en_f", "en-US-JennyNeural", "-12%", "Hello!", 0.2),
    ("en_f", "en-US-JennyNeural", "-12%", "Hello.", 0.4),
    ("es", "es-CO-SalomeNeural", "+0%", "En inglés, la letra H suena como un suspiro suave de aire tibio, no como la J fuerte del español. Escucha la diferencia:", 0.25),
    ("en_f", "en-US-JennyNeural", "-12%", "Hello.", 0.5),

    # Scene 3: Grammar Rule "I am / I'm"
    ("es", "es-CO-SalomeNeural", "+0%", "Ahora, para decir quién eres, en inglés no decimos yo me llamo ni yo tengo. Simplemente decimos yo soy:", 0.25),
    ("en_f", "en-US-JennyNeural", "-12%", "I am.", 0.2),
    ("es", "es-CO-SalomeNeural", "+0%", "O en su forma más común y natural:", 0.2),
    ("en_f", "en-US-JennyNeural", "-12%", "I'm.", 0.4),
    ("en_m", "en-US-GuyNeural", "-10%", "I'm Carlos.", 0.3),
    ("en_f", "en-US-JennyNeural", "-10%", "I'm Ana.", 0.4),
    ("es", "es-CO-SalomeNeural", "+0%", "Sujeto en azul, verbo en rojo y tu nombre en verde.", 0.5),

    # Scene 4: Courtesy "Nice to meet you" & Realistic Dialogue
    ("es", "es-CO-SalomeNeural", "+0%", "Y para responder con cortesía cuando conoces a alguien por primera vez, decimos:", 0.25),
    ("en_f", "en-US-JennyNeural", "-10%", "Nice to meet you!", 0.3),
    ("es", "es-CO-SalomeNeural", "+0%", "Significa: mucho gusto en conocerte. Escuchemos este saludo entre David y Ana:", 0.35),
    ("en_m", "en-US-GuyNeural", "-8%", "Hello! I'm David.", 0.3),
    ("en_f", "en-US-JennyNeural", "-8%", "Hello David! Nice to meet you.", 0.5),

    # Scene 5: Student Guided Practice (100% Pure: Jenny models English, Salomé guides in Spanish)
    ("es", "es-CO-SalomeNeural", "+0%", "¡Ahora es tu turno! Escucha el modelo y repite la frase completa con tu propio nombre:", 0.25),
    ("en_f", "en-US-JennyNeural", "-10%", "Hello, I'm Carlos. Nice to meet you!", 0.35),
    ("es", "es-CO-SalomeNeural", "+0%", "Dilo tú en voz alta. Tienes tres segundos a partir de ahora.", 0.25),
    # SILENCE GAP: 3.5 seconds of pure silence for student output
    ("__silence__", None, None, None, 3.5),
    ("es", "es-CO-SalomeNeural", "+0%", "¡Excelente trabajo! Acabas de completar tu primera conversación en inglés.", 0.3),
    ("es", "es-CO-SalomeNeural", "+0%", "Justo aquí abajo tienes tu quiz interactivo y la práctica con micrófono para evaluar tu voz. ¡Nos vemos en la siguiente lección!", 0.6),
]

async def generate_single_line(idx, speaker, voice, rate, text):
    out_file = os.path.join(TEMP_DIR, f"line_{idx:03d}.mp3")
    comm = edge_tts.Communicate(text, voice, rate=rate)
    await comm.save(out_file)
    return out_file

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

async def build_master_audio(output_wav_path):
    timeline = []
    current_time = 0.0
    concat_list_path = os.path.join(TEMP_DIR, "concat.txt")
    concat_lines = []
    
    for i, item in enumerate(SCRIPT_LINES):
        speaker, voice, rate, text, pause = item
        
        if speaker == "__silence__":
            silence_file = os.path.join(TEMP_DIR, f"gap_silence_{i:03d}.wav")
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
                "-t", str(pause), "-c:a", "pcm_s16le", silence_file
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            concat_lines.append(f"file '{silence_file.replace(os.sep, '/')}'")
            timeline.append({
                "line_index": i,
                "speaker": "silence",
                "voice": None,
                "text": "[Turno de habla del estudiante]",
                "start": current_time,
                "end": current_time + pause,
                "duration": pause
            })
            current_time += pause
            continue
            
        print(f"Generating audio line {i+1}/{len(SCRIPT_LINES)}: [{speaker}] {text[:35]}...")
        mp3_file = await generate_single_line(i, speaker, voice, rate, text)
        wav_file = os.path.join(TEMP_DIR, f"line_{i:03d}.wav")
        subprocess.run([
            "ffmpeg", "-y", "-i", mp3_file, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wav_file
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        
        dur = get_audio_duration(wav_file)
        timeline.append({
            "line_index": i,
            "speaker": speaker,
            "voice": voice,
            "text": text,
            "start": current_time,
            "end": current_time + dur,
            "duration": dur
        })
        concat_lines.append(f"file '{wav_file.replace(os.sep, '/')}'")
        current_time += dur
        
        if pause and pause > 0:
            pause_file = os.path.join(TEMP_DIR, f"pause_{i:03d}.wav")
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
                "-t", str(pause), "-c:a", "pcm_s16le", pause_file
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            concat_lines.append(f"file '{pause_file.replace(os.sep, '/')}'")
            current_time += pause

    with open(concat_list_path, "w", encoding="utf-8") as f:
        f.write("\n".join(concat_lines))
        
    print(f"Stitching master audio to {output_wav_path} (Total duration: {current_time:.2f}s)...")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-c:a", "pcm_s16le", output_wav_path
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    
    meta = {
        "total_duration": current_time,
        "lines": timeline
    }
    meta_path = os.path.splitext(output_wav_path)[0] + "_timeline.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        
    return meta

if __name__ == "__main__":
    out_wav = os.path.join(os.path.dirname(__file__), "master_audio.wav")
    asyncio.run(build_master_audio(out_wav))
    print("Done!")
