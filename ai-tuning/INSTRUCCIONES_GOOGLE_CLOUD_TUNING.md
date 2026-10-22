# Guía Maestra de Fine-Tuning para TutorIA en Google Cloud
**Plataforma Educativa:** IPT Course (Ivan Perez Tech)  
**Modelos Compatibles:** Gemini 1.5 Flash / Gemini 1.5 Pro  
**Formatos Generados:** Vertex AI (`tutoria_vertex_train.jsonl`, `tutoria_vertex_validation.jsonl`) y Google AI Studio (`tutoria_google_ai_studio_complete.jsonl`)

---

## 1. Archivos Listos para Importar en esta Carpeta

| Archivo | Destino Recomendado | Descripción |
| :--- | :--- | :--- |
| `tutoria_google_ai_studio_complete.jsonl` | **Google AI Studio** | Dataset completo con estructura `messages` multi-turno, listo para subir y pulsar "Tune". |
| `tutoria_vertex_train.jsonl` | **Google Cloud Vertex AI** | Dataset de entrenamiento (85% del corpus) con formato oficial `contents` + `systemInstruction`. |
| `tutoria_vertex_validation.jsonl` | **Google Cloud Vertex AI** | Dataset de validación (15% del corpus) para calcular la curva de pérdida (*loss*). |
| `build-tuning-dataset.js` | Local (Node.js) | Generador automático que ingesta `database_seed.json` y `curso-demo-visuales.json`. |

---

## 2. Método 1: Google AI Studio (Recomendado — En 3 Clics y Cero Configuración de Infraestructura)

Google AI Studio ofrece la vía más directa para entrenar Gemini 1.5 Flash con tu dataset sin necesidad de crear buckets ni configurar VPCs.

1. Ingresa a [https://aistudio.google.com/](https://aistudio.google.com/) con tu cuenta de Google Cloud / Workspace.
2. En la barra lateral izquierda, haz clic en **"Tune a model"** (o en el botón `+ Create Tuned Model`).
3. **Configuración del Modelo:**
   - **Base Model:** Selecciona `gemini-1.5-flash-002` (alta velocidad, bajo costo y soporte nativo de ventana de contexto larga).
   - **Dataset Source:** Selecciona **Upload file** y sube el archivo:  
     `D:\My Apps\IPT Course\ai-tuning\tutoria_google_ai_studio_complete.jsonl`
   - **Tuned Model Name:** `tutoria-ipt-course-v1`
4. **Hiperparámetros (Recomendados):**
   - **Epochs:** `4` o `5` (óptimo para consolidar la personalidad sin sobreajuste).
   - **Learning rate multiplier:** `1.0` (por defecto).
5. Haz clic en **"Tune Model"**.
6. Google procesará el entrenamiento en sus TPUs. Al finalizar (toma entre 5 y 15 minutos), obtendrás un identificador de modelo como:  
   `tunedModels/tutoria-ipt-course-v1-xxxx`
7. Ya puedes invocarlo directamente con tu API Key habitual de Gemini en tu código frontend o backend.

---

## 3. Método 2: Google Cloud Vertex AI (Grado Empresarial)

Si deseas el entrenamiento administrado dentro de la consola corporativa de Google Cloud con Cloud Storage:

### Paso 1: Subir los Datasets a Cloud Storage
```bash
# Crear bucket si no existe
gcloud storage buckets create gs://ipt-course-ai-tuning --location=us-central1

# Subir los archivos JSONL
gcloud storage cp tutoria_vertex_train.jsonl gs://ipt-course-ai-tuning/
gcloud storage cp tutoria_vertex_validation.jsonl gs://ipt-course-ai-tuning/
```

### Paso 2: Lanzar el Job de Sintonización
1. Ve a la consola de [Google Cloud Console > Vertex AI > Generative AI Studio > Model Garden](https://console.cloud.google.com/vertex-ai/generative/model-garden).
2. Busca la tarjeta **Gemini 1.5 Flash** y haz clic en **"Tune"**.
3. En **Training data**, especifica:  
   `gs://ipt-course-ai-tuning/tutoria_vertex_train.jsonl`
4. En **Validation data (opcional)**, especifica:  
   `gs://ipt-course-ai-tuning/tutoria_vertex_validation.jsonl`
5. En **Destination**, indica la carpeta del bucket para almacenar los artefactos del modelo.
6. Clic en **"Start Tuning Job"**.
7. Una vez completado, Vertex AI creará el endpoint administrado listo para desplegar.

---

## 4. Diferencia Crítica de Arquitectura: Fine-Tuning vs. Grounding / RAG

Para lograr que TutorIA sea un asistente con "conocimiento real y no prompts fijos", la arquitectura de alto nivel de Google Cloud separa dos responsabilidades:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      TutorIA en Google Cloud                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐    ┌───────────────────────────────────┐
│     Fine-Tuned Model (Pesos)         │    │   Grounding / Live Search (Datos) │
├──────────────────────────────────────┤    ├───────────────────────────────────┤
│ • Identidad institucional (IPT).     │    │ • Cursos activos en Firebase.     │
│ • Tono pedagógico socrático.         │    │ • Notas y tareas del estudiante.  │
│ • Protocolo de búsqueda de info.     │    │ • Fechas del Calendario y /live.  │
│ • REGLA INMUTABLE: NUNCA devolver    │    │ • Gigas de PDFs, videos o docs.   │
│   cupos (exclusivo de humanos).      │    │                                   │
└──────────────────────────────────────┘    └───────────────────────────────────┘
```

1. **Lo que el Fine-Tuning resuelve:**
   - Evita prompts gigantescos de 20 páginas en cada llamada.
   - El modelo ya "nace sabiendo" quién es Iván Pérez, cómo responde IPT Course, cómo guiar con el método socrático y qué restricciones éticas y contables debe cumplir.
2. **Lo que el Grounding / RAG resuelve (Gigas de información):**
   - Cuando subas 10 cursos nuevos o 500 clases grabadas, no necesitas volver a pagar ni esperar horas de fine-tuning.
   - El modelo tuneado sabe exactamente **cuándo invocar una búsqueda** para consultar los datos frescos de la plataforma.
