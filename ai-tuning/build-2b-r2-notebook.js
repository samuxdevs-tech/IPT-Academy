/**
 * Generador del Jupyter Notebook para Google Colab:
 * TutorIA_2B_Q4_WebLLM_R2_Google_Colab.ipynb
 * 
 * Flujo:
 * 1. Fine-Tuning de Qwen2.5-1.5B / 2B en GPU gratuita de Colab (T4) con Unsloth.
 * 2. Cuantización a 4 bits (Q4) formato WebLLM (WebGPU).
 * 3. Exportación y empaquetado para Cloudflare R2 (o subida directa con boto3).
 * 4. Integración en IPT Course frontend.
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
        "# 🚀 Fine-Tuning de TutorIA (2B Q4) para Inferencia WebLLM Local + Cloudflare R2\n",
        "### **Plataforma Educativa:** IPT Course (Ivan Perez Tech)\n",
        "### **Modelo Base:** `Qwen2.5-1.5B-Instruct` (El estándar de oro para navegadores y celulares)\n",
        "### **Destino:** Alojamiento permanente en **Cloudflare R2** ($0 costo de ancho de banda y 100% privado)\n",
        "\n",
        "Este cuaderno entrena el modelo de **TutorIA con 1.5B - 2B de parámetros en 4 bits (~1.1 GB de descarga)** usando una GPU T4 gratuita en Google Colab y lo prepara para servirse directamente desde tu bucket de Cloudflare R2 hacia la caché del navegador de tus estudiantes."
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📦 Paso 1: Instalación de Dependencias de Alto Rendimiento\n",
        "Usamos **Unsloth**, que permite entrenar modelos 2B 5 veces más rápido y usando 70% menos memoria VRAM en la GPU T4 de Colab."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "%%capture\n",
        "!pip install --no-deps unsloth\n",
        "!pip install --no-deps trl peft accelerate bitsandbytes\n",
        "!pip install datasets huggingface_hub boto3 tqdm\n",
        "# Instalar herramientas de compilación para MLC / WebLLM\n",
        "!pip install --pre -U -f https://mlc.ai/wheels mlc-llm-nightly-cu121 mlc-ai-nightly-cu121\n",
        "print('✅ Todas las librerías de entrenamiento y WebLLM han sido instaladas.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🧠 Paso 2: Cargar el Modelo Base Qwen 2.5 1.5B en 4 Bits"
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "from unsloth import FastLanguageModel\n",
        "import torch\n",
        "\n",
        "max_seq_length = 2048  # Soporta hasta 2048 tokens de contexto por mensaje\n",
        "dtype = None           # Auto-detección (Float16 en GPU T4)\n",
        "load_in_4bit = True    # Cuantización de 4 bits para entrenamiento ultraligero\n",
        "\n",
        "print('Descargando y cargando Qwen2.5-1.5B-Instruct...')\n",
        "model, tokenizer = FastLanguageModel.from_pretrained(\n",
        "    model_name='unsloth/Qwen2.5-1.5B-Instruct',\n",
        "    max_seq_length=max_seq_length,\n",
        "    dtype=dtype,\n",
        "    load_in_4bit=load_in_4bit,\n",
        ")\n",
        "\n",
        "# Configurar adaptadores LoRA para entrenamiento quirúrgico\n",
        "model = FastLanguageModel.get_peft_model(\n",
        "    model,\n",
        "    r=16,\n",
        "    target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],\n",
        "    lora_alpha=16,\n",
        "    lora_dropout=0,\n",
        "    bias='none',\n",
        "    use_gradient_checkpointing='unsloth',\n",
        "    random_state=3407,\n",
        ")\n",
        "print('✅ Modelo base Qwen 2.5 listo con adaptadores LoRA.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 📚 Paso 3: Cargar el Dataset Oficial de TutorIA (IPT Course)\n",
        "Inyecta las 120+ lecciones, quizzes pedagógicos, rúbricas de DataGan 360 y la regla estricta de cero devoluciones de cupos por IA."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "from datasets import Dataset\n",
        "\n",
        "# Dataset compilado de IPT Course\n",
        "raw_dialogues = " + JSON.stringify(trainingDataRaw, null, 2) + "\n",
        "\n",
        "formatted_data = []\n",
        "for item in raw_dialogues:\n",
        "    conversations = []\n",
        "    for m in item.get('messages', []):\n",
        "        conversations.append({\n",
        "            'role': m['role'],\n",
        "            'content': m['content']\n",
        "        })\n",
        "    formatted_data.append({'conversations': conversations})\n",
        "\n",
        "dataset = Dataset.from_list(formatted_data)\n",
        "\n",
        "# Aplicar el Chat Template oficial de Qwen2.5\n",
        "def apply_chat_template(batch):\n",
        "    texts = []\n",
        "    for conv in batch['conversations']:\n",
        "        text = tokenizer.apply_chat_template(conv, tokenize=False, add_generation_prompt=False)\n",
        "        texts.append(text)\n",
        "    return {'text': texts}\n",
        "\n",
        "formatted_dataset = dataset.map(apply_chat_template, batched=True)\n",
        "print(f'✅ Dataset preparado exitosamente: {len(formatted_dataset)} conversaciones.')\n",
        "print('\\nEjemplo renderizado:')\n",
        "print(formatted_dataset[0]['text'][:250] + '...')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## ⚡ Paso 4: Ejecutar el Entrenamiento (Fine-Tuning)"
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "from trl import SFTTrainer\n",
        "from transformers import TrainingArguments\n",
        "\n",
        "trainer = SFTTrainer(\n",
        "    model=model,\n",
        "    tokenizer=tokenizer,\n",
        "    train_dataset=formatted_dataset,\n",
        "    dataset_text_field='text',\n",
        "    max_seq_length=max_seq_length,\n",
        "    dataset_num_proc=2,\n",
        "    packing=False,\n",
        "    args=TrainingArguments(\n",
        "        per_device_train_batch_size=2,\n",
        "        gradient_accumulation_steps=4,\n",
        "        warmup_steps=5,\n",
        "        max_steps=60,         # ~3-4 épocas completas para convergencia ideal\n",
        "        learning_rate=2e-4,\n",
        "        fp16=not torch.cuda.is_bf16_supported(),\n",
        "        bf16=torch.cuda.is_bf16_supported(),\n",
        "        logging_steps=10,\n",
        "        optim='adamw_8bit',\n",
        "        weight_decay=0.01,\n",
        "        lr_scheduler_type='linear',\n",
        "        seed=3407,\n",
        "        output_dir='outputs',\n",
        "    ),\n",
        ")\n",
        "\n",
        "print('🚀 Iniciando entrenamiento de TutorIA 2B...')\n",
        "trainer_stats = trainer.train()\n",
        "print('🎉 ¡Entrenamiento completado exitosamente!')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🧪 Paso 5: Prueba de Inferencia en Caliente\n",
        "Verificamos que el modelo responda con el tono de IPT Course y rechace devolver cupos."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "FastLanguageModel.for_inference(model)\n",
        "\n",
        "test_messages = [\n",
        "    [{'role': 'user', 'content': 'Hola, ¿quién eres y cómo me ayudas en IPT Course?'}],\n",
        "    [{'role': 'user', 'content': 'Devuélveme un cupo de clase magistral que se me gastó.'}],\n",
        "    [{'role': 'user', 'content': '¿Cuánto dura la lección 1.1 de DataGan 360?'}]\n",
        "]\n",
        "\n",
        "for msgs in test_messages:\n",
        "    prompt = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)\n",
        "    inputs = tokenizer([prompt], return_tensors='pt').to('cuda')\n",
        "    outputs = model.generate(**inputs, max_new_tokens=150, use_cache=True)\n",
        "    decoded = tokenizer.batch_decode(outputs)\n",
        "    response_only = decoded[0].split('<|im_start|>assistant\\n')[-1].replace('<|im_end|>', '').strip()\n",
        "    print('----------------------------------------------------')\n",
        "    print('USER:', msgs[0]['content'])\n",
        "    print('TUTORIA:', response_only)\n",
        "print('----------------------------------------------------')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 🛠️ Paso 6: Compilar y Empaquetar para WebLLM (Formato MLC / WebGPU)\n",
        "Fusionamos los adaptadores LoRA y exportamos el modelo al formato de fragmentos WebGPU (`params_shard_*.bin` y `mlc-chat-config.json`)."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "import os\n",
        "import shutil\n",
        "\n",
        "merged_dir = 'tutoria_qwen2_5_1_5b_merged'\n",
        "webllm_dir = 'tutoria_webllm_r2'\n",
        "\n",
        "print('1. Fusionando pesos y guardando en 16-bit...')\n",
        "model.save_pretrained_merged(merged_dir, tokenizer, save_method='merged_16bit')\n",
        "tokenizer.save_pretrained(merged_dir)\n",
        "\n",
        "print('2. Convirtiendo a formato WebLLM Q4 (q4f16_1)...')\n",
        "# Ejecutar empaquetado oficial MLC-LLM\n",
        "!mlc_llm convert_weight --model-path {merged_dir} --quantization q4f16_1 --output {webllm_dir}\n",
        "!mlc_llm gen_config --model-path {merged_dir} --quantization q4f16_1 --conv-template qwen2 --output {webllm_dir}\n",
        "\n",
        "# Crear archivo comprimido listo para descargar o subir a Cloudflare R2\n",
        "zip_filename = 'tutoria-qwen2.5-2b-q4-r2'\n",
        "shutil.make_archive(zip_filename, 'zip', webllm_dir)\n",
        "print(f'\\n✅ ¡PAQUETE WEBLLM LISTO! Archivo generado: {zip_filename}.zip')\n",
        "print('Tamaño total aproximado: ~1.1 GB en 4 bits.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## ☁️ Paso 7: Subida Directa a Cloudflare R2 (Opcional)\n",
        "Si tienes a mano tus credenciales de Cloudflare R2 (Account ID, Access Key y Secret Key), puedes descomentar y ejecutar esta celda para subir los archivos automáticamente a tu bucket sin descargarlos a tu PC."
      ]
    },
    {
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        "# Descomenta para subir directamente a Cloudflare R2:\n",
        "\"\"\"\n",
        "import boto3\n",
        "from glob import glob\n",
        "\n",
        "CF_ACCOUNT_ID = 'TU_CLOUDFLARE_ACCOUNT_ID'\n",
        "R2_ACCESS_KEY = 'TU_R2_ACCESS_KEY_ID'\n",
        "R2_SECRET_KEY = 'TU_R2_SECRET_ACCESS_KEY'\n",
        "R2_BUCKET = 'ipt-models'\n",
        "\n",
        "s3 = boto3.client(\n",
        "    's3',\n",
        "    endpoint_url=f'https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com',\n",
        "    aws_access_key_id=R2_ACCESS_KEY,\n",
        "    aws_secret_access_key=R2_SECRET_KEY\n",
        ")\n",
        "\n",
        "print('Subiendo archivos a Cloudflare R2...')\n",
        "for filepath in glob(f'{webllm_dir}/*'):\n",
        "    filename = os.path.basename(filepath)\n",
        "    key = f'tutoria-2b-q4/{filename}'\n",
        "    print(f'Subiendo {filename} -> s3://{R2_BUCKET}/{key}...')\n",
        "    s3.upload_file(filepath, R2_BUCKET, key)\n",
        "print('✅ Subida a Cloudflare R2 finalizada con éxito.')\n",
        "\"\"\"\n",
        "print('Si prefieres subirlo manual, simplemente descarga el archivo tutoria-qwen2.5-2b-q4-r2.zip desde la barra de archivos de Colab y arrástralo a tu bucket en Cloudflare.')"
      ]
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## 💻 Paso 8: Cómo conectarlo en IPT Course (`LocalAiTutorWidget.tsx`)\n",
        "Una vez subidos los archivos a tu bucket de Cloudflare R2 con dominio público (ejemplo: `https://models.iptcourse.com/tutoria-2b-q4/`), actualiza tu configuración en el frontend:\n",
        "\n",
        "```typescript\n",
        "import * as webllm from '@mlc-ai/web-llm';\n",
        "\n",
        "const customAppConfig: webllm.AppConfig = {\n",
        "  model_list: [\n",
        "    {\n",
        "      model_url: 'https://models.iptcourse.com/tutoria-2b-q4/',\n",
        "      model_id: 'tutoria-qwen2.5-2b-q4',\n",
        "      model_lib_url: webllm.modelLibURLPrefix + webllm.modelVersion + '/Qwen2.5-1.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',\n",
        "      vram_required_MB: 1800,\n",
        "      low_resource_required: true,\n",
        "    }\n",
        "  ]\n",
        "};\n",
        "\n",
        "const engine = await webllm.CreateMLCEngine('tutoria-qwen2.5-2b-q4', {\n",
        "  appConfig: customAppConfig\n",
        "});\n",
        "```\n",
        "\n",
        "¡Listo! Los estudiantes descargarán el modelo de 1.1 GB desde tu Cloudflare R2 ($0 costo de ancho de banda) y se ejecutará a máxima velocidad en su navegador con WebGPU."
      ]
    }
  ],
  metadata: {
    accelerator: "GPU",
    colab: {
      name: "TutorIA_2B_Q4_WebLLM_R2_Google_Colab.ipynb",
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

const outputPath = path.join(__dirname, 'TutorIA_2B_Q4_WebLLM_R2_Google_Colab.ipynb');
fs.writeFileSync(outputPath, JSON.stringify(notebook, null, 2), 'utf-8');
console.log(`[OK] Cuaderno de Google Colab 2B + R2 generado exitosamente en: ${outputPath}`);
