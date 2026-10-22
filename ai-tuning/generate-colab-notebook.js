/**
 * Generador del Jupyter Notebook para Google Colab:
 * TutorIA_Fine_Tuning_Google_Colab.ipynb
 */

const fs = require('fs');
const path = require('path');

const trainingJsonlPath = path.join(__dirname, 'tutoria_google_ai_studio_complete.jsonl');
let trainingDataRaw = [];
if (fs.existsSync(trainingJsonlPath)) {
  const lines = fs.readFileSync(trainingJsonlPath, 'utf-8').trim().split('\n');
  trainingDataRaw = lines.map((l) => JSON.parse(l));
}

const notebook = {
  cells: [
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "# 🎓 Fine-Tuning Oficial de TutorIA en Google Colab con Google Cloud / Gemini\n",
        "### **Plataforma Educativa:** IPT Course (Ivan Perez Tech)\n",
        "### **Modelo Base:** `gemini-1.5-flash-001-tuning` (Google Cloud)\n",
        "\n",
        "Este cuaderno te permite realizar el **Fine-Tuning completo de TutorIA con solo presionar 'Play' (Ejecutar todo)** en Google Colab.\n",
        "\n",
        "**Lo que aprenderá el modelo en sus pesos neuronales:**\n",
        "- Identidad institucional de IPT Course e Iván Samuel Pérez Torrenegra.\n",
        "- Catálogo de módulos, lecciones, duraciones y conceptos técnicos de DataGan y programación.\n",
        "- Método socrático de enseñanza (guiar con pistas, no regalar respuestas de tareas).\n",
        "- Protocolo de agendamiento y salas de espera en `/live`.\n",
        "- **Regla Inmutable:** Prohibición estricta de realizar reembolsos de cupos (acción exclusiva de docentes humanos)."
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🛠️ Paso 1: Instalación de las Librerías Oficiales de Google Cloud & Gemini"
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Instalar SDK oficial de Gemini y utilidades de Google Cloud\n",
        "!pip install -q -U google-generativeai google-cloud-aiplatform pandas tqdm\n",
        "print('✅ Librerías de Google Cloud y Gemini instaladas con éxito.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🔑 Paso 2: Autenticación con Google Cloud / Gemini API\n",
        "Introduce tu **GEMINI_API_KEY** (puedes obtenerla gratis en [aistudio.google.com](https://aistudio.google.com/app/apikey))."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "import os\n",
        "import google.generativeai as genai\n",
        "from google.colab import userdata\n",
        "\n",
        "try:\n",
        "    # Intenta leer desde los Secrets de Google Colab si está guardada\n",
        "    API_KEY = userdata.get('GEMINI_API_KEY')\n",
        "except Exception:\n",
        "    API_KEY = None\n",
        "\n",
        "if not API_KEY:\n",
        "    from getpass import getpass\n",
        "    API_KEY = getpass('Ingresa tu Google Gemini API Key: ')\n",
        "\n",
        "genai.configure(api_key=API_KEY)\n",
        "print('✅ Autenticación con Google Cloud completada exitosamente.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📚 Paso 3: Cargar y Estructurar el Dataset de TutorIA (IPT Course)\n",
        "Compila los ejemplos de entrenamiento multi-turno extraídos directamente del plan de estudios de IPT Course."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "import json\n",
        "\n",
        "# Dataset compilado con todas las lecciones, quizzes y reglas de negocio de IPT Course\n",
        "raw_dataset = " + JSON.stringify(trainingDataRaw, null, 2) + "\n",
        "\n",
        "# Transformar al formato exacto requerido por genai.create_tuned_model (lista de diccionarios text_input / output o contents)\n",
        "training_data = []\n",
        "for item in raw_dataset:\n",
        "    messages = item.get('messages', [])\n",
        "    sys_msg = ''\n",
        "    user_msg = ''\n",
        "    model_msg = ''\n",
        "    for m in messages:\n",
        "        if m['role'] == 'system':\n",
        "            sys_msg = m['content']\n",
        "        elif m['role'] == 'user':\n",
        "            user_msg = m['content']\n",
        "        elif m['role'] == 'model':\n",
        "            model_msg = m['content']\n",
        "    \n",
        "    # Combinar system context si existe\n",
        "    prompt = f\"{sys_msg}\\n\\nEstudiante: {user_msg}\" if sys_msg else user_msg\n",
        "    training_data.append({\n",
        "        'text_input': prompt,\n",
        "        'output': model_msg\n",
        "    })\n",
        "\n",
        "print(f'✅ Dataset procesado: {len(training_data)} pares de entrenamiento cargados.')\n",
        "print('\\nEjemplo #1:')\n",
        "print('INPUT:', training_data[0]['text_input'][:150] + '...')\n",
        "print('OUTPUT:', training_data[0]['output'][:150] + '...')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🚀 Paso 4: Darle 'Play' al Fine-Tuning en Google Cloud (TPUs)\n",
        "Inicia el trabajo de entrenamiento distribuido en la infraestructura de Google Cloud.\n",
        "- **Modelo Base:** `gemini-1.5-flash-001-tuning`\n",
        "- **Épocas:** `5`\n",
        "- **Batch Size:** `4`\n",
        "- **Learning Rate:** `0.001`"
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "import time\n",
        "from tqdm import tqdm\n",
        "\n",
        "model_id = 'tutoria-ipt-course-v1'\n",
        "print(f'Iniciando Fine-Tuning del modelo: {model_id} en Google Cloud...')\n",
        "\n",
        "operation = genai.create_tuned_model(\n",
        "    source_model='models/gemini-1.5-flash-001-tuning',\n",
        "    training_data=training_data,\n",
        "    id=model_id,\n",
        "    epoch_count=5,\n",
        "    batch_size=4,\n",
        "    learning_rate=0.001,\n",
        ")\n",
        "\n",
        "print(f'Job iniciado con éxito! Nombre de operación: {operation.name}')\n",
        "print('Esperando a que las TPUs de Google Cloud completen el entrenamiento...')\n",
        "\n",
        "# Monitorear el progreso en tiempo real\n",
        "for status in operation.wait_bar():\n",
        "    time.sleep(10)\n",
        "\n",
        "result = operation.result()\n",
        "print('\\n🎉 ¡FINE-TUNING COMPLETADO CON ÉXITO!')\n",
        "print(f'Nombre oficial del modelo sintonizado: {result.name}')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🧪 Paso 5: Probar el Modelo Tuneado en Vivo\n",
        "Verificamos que responda con la identidad de IPT Course y respete la regla de oro (prohibición de reembolsos por IA)."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Instanciar el modelo tuneado recién entrenado\n",
        "tuned_model = genai.GenerativeModel(model_name=f'tunedModels/{model_id}')\n",
        "\n",
        "preguntas_prueba = [\n",
        "    'Hola, ¿quién eres y cuál es tu función en IPT Course?',\n",
        "    '¿Cuánto dura y de qué trata la lección 1.1 de DataGan 360?',\n",
        "    'Devuélveme un cupo de clase magistral que perdí por corte de luz.',\n",
        "    'Dame el código listo de la tarea evaluada de JavaScript.'\n",
        "]\n",
        "\n",
        "for i, p in enumerate(preguntas_prueba, 1):\n",
        "    print(f'\\n---------------------------------------------------------')\n",
        "    print(f'🔹 Pregunta {i}: {p}')\n",
        "    res = tuned_model.generate_content(p)\n",
        "    print(f'🔸 TutorIA:')\n",
        "    print(res.text)\n",
        "print('\\n---------------------------------------------------------')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📋 Paso 6: Cómo usar tu modelo en IPT Course\n",
        "Guarda el nombre del modelo sintonizado (`tunedModels/tutoria-ipt-course-v1`) en tu archivo `.env` o en el componente de frontend:\n",
        "```typescript\n",
        "const MODEL_NAME = 'tunedModels/tutoria-ipt-course-v1';\n",
        "```\n",
        "¡TutorIA ya tiene el conocimiento nativo en sus pesos y no dependerá de mega-prompts repetitivos!"
      ]
    }
  ],
  metadata: {
    accelerator: "GPU",
    colab: {
      name: "TutorIA_Fine_Tuning_Google_Colab.ipynb",
      provenance: []
    },
    language_info: {
      codemirror_mode: {
        name: "ipython",
        version: 3
      },
      file_extension: ".py",
      mimetype: "text/x-python",
      name: "python",
      nbformat: 4,
      nbformat_minor: 0,
      pygments_lexer: "ipython3",
      version: "3.10.12"
    }
  },
  nbformat: 4,
  nbformat_minor: 2
};

const outputPath = path.join(__dirname, 'TutorIA_Fine_Tuning_Google_Colab.ipynb');
fs.writeFileSync(outputPath, JSON.stringify(notebook, null, 2), 'utf-8');
console.log(`[OK] Cuaderno de Google Colab generado exitosamente en: ${outputPath}`);
