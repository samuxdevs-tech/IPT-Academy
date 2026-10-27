# IPT Course Course — Documento de Concepto, Arquitectura y Visión de Producto

> **Plataforma EdTech y Academia de Certificación Oficial de IPT Course 360 & IPT Tech**  
> **Propiedad Intelectual y Desarrollo:** IPT (Ivan Perez Tech) — Iván Samuel Pérez Torrenegra  
> **Versión del Documento:** 1.0 (Producción)  
> **Entorno de Producción:** [https://IPT Course-course.web.app](https://IPT Course-course.web.app)  

---

## 1. Resumen Ejecutivo y Propuesta de Valor

### 1.1 El Problema en el Agro Latinoamericano
La ganadería en el trópico bajo y medio enfrenta una brecha crítica: el **analfabetismo digital operativo**. Aunque existen softwares ganaderos avanzados en el mercado (como IPT Course 360 y IPT Tech), la gran mayoría de los productores, mayordomos, zootecnistas y administradores de fincas:
1. Registran la información en cuadernos de papel o tablas de Excel desarticuladas.
2. Tienen miedo de cometer errores destructivos al interactuar con sistemas informáticos en vivo.
3. No conectan los números brutos (kilos, litros, días) con decisiones de rentabilidad real (costo por kilo producido, margen sobre alimentación, tasa de preñez al primer servicio).

### 1.2 La Solución: IPT Course Course
**IPT Course Course** es la plataforma de capacitación y certificación oficial diseñada para cerrar esa brecha. No es un simple visor de videos; es un **ecosistema de entrenamiento inmersivo en 3 fases progresivas** que acompaña al estudiante desde la teoría zootécnica guiada hasta la práctica sin riesgos en un simulador idéntico al software de producción.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IPT Course COURSE ECOSYSTEM                        │
├────────────────────┬────────────────────┬──────────────────────────────┤
│      FASE 1        │      FASE 2        │           FASE 3             │
│ Aprendizaje Guiado │ Reflejo Operativo  │     Sandbox Interactivo      │
│                    │                    │                              │
│ • Video Streaming  │ • Memoria Muscular │ • Clon Exacto de IPT Tech    │
│ • In-Video Checks  │ • Casos de Campo   │ • Base de Datos Ficticia     │
│ • Quizzes Finales  │ • Capturas de App  │ • Misiones con Validación    │
│ • 73 Métricas RTDB │ • Decisión Rápida  │ • Motor Multi-Misión en RTDB │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 2. Metodología Pedagógica en 3 Fases

### Fase 1: Aprendizaje Guiado con Telemetría Activa (Aula Virtual)
El núcleo formativo estructurado donde los instructores imparten la cátedra zootécnica y de software.
- **Reproducción Universal Dual:** Soporte simultáneo para videos en alta velocidad alojados en **Cloudflare R2** (sin costos de transferencia de salida) o incrustados desde **YouTube**.
- **In-Video Checkpoints (Interrupciones Didácticas):** Puntos de control configurables al segundo exacto. El reproductor detiene la reproducción y lanza un modal de evaluación. El alumno no puede continuar hasta demostrar comprensión del concepto recién explicado.
- **Checkpoint Quizzes de Cierre:** Exámenes de opción múltiple al final de cada lección con retroalimentación zootécnica inmediata y justificación técnica ICA/FEDEGAN.
- **Cuaderno de Notas Sincronizado por Timestamp:** Los estudiantes registran anotaciones privadas vinculadas al segundo exacto del video para repasos futuros.
- **Foro de Dudas Q&A Comunitario:** Muro de preguntas y respuestas por lección con sistema de votación colaborativa.
- **Asociación de Métricas IPT Course 360:** Cada lección despliega las fórmulas y parámetros oficiales involucrados en el tema.

### Fase 2: Reflejo Operativo (Gestor de Escenarios Visuales)
Diseñado para entrenar la **memoria muscular** y la agilidad de reacción de los operadores en el campo.
- **Dinámica del Escenario:** Se presenta una situación de campo imprevista (ej. *"El vaquero reporta que la vaca V-101 acaba de parir en el potrero El Mango"* o *"La báscula digital arrojó una caída de 150 g/día en el lote de ceba"*).
- **Inspección de Pantalla:** Se muestra una captura de pantalla en alta resolución de IPT Course 360.
- **Decisión de Navegación:** El alumno debe seleccionar con precisión qué módulo, submenú o botón debe presionar para registrar el evento según las buenas prácticas de la plataforma.
- **Ficha Técnica Asociada:** Cada escenario puede vincularse a una métrica del catálogo, permitiendo al estudiante consultar la regla agronómica antes o después de responder.

### Fase 3: Sandbox Interactivo (Entorno de Pruebas Ficticio)
Un entorno de pruebas 100% interactivo donde el usuario opera sobre una réplica visual y funcional de IPT Tech poblada con un hato ficticio.
- **Cero Riesgo de Datos Reales:** Los usuarios exploran, crean registros de partos, mueven animales de potrero y generan pesajes sin temor a corromper datos corporativos.
- **Banner Persistente de Misiones:** Una barra superior integrada que guía al alumno paso a paso:
  - Selección de Misión en tiempo real desde el catálogo de Firebase.
  - Contexto operativo e instrucciones de cumplimiento.
  - **Botón "Comprobar":** Evalúa automáticamente el estado de la base de datos local y los formularios del simulador contra un conjunto de reglas booleanas (`equals`, `greater_than`, `includes`).
  - **Botón "Autocompletar":** Rellena los datos sugeridos para que usuarios principiantes comprendan el flujo sin frustración.

---

## 3. Motor Multitemplate de las 73 Métricas Zootécnicas

IPT Course Course no almacena métricas como texto plano; incorpora un **motor polimórfico de 6 plantillas técnicas** capaz de modelar cualquier indicador del sector agropecuario:

| Plantilla | Propósito Zootécnico | Ejemplo Real en IPT Course 360 |
|---|---|---|
| **1. Fórmula Matemática** | Métricas cuantitativas continuas con fórmulas, benchmarks y rangos de semáforo. | *Litros por Vaca / Día*, *Ganancia Diaria de Peso (GDP)*, *Días Abiertos*, *Índice de Temperatura y Humedad (ITH)*. |
| **2. Escala Visual Cualitativa** | Evaluación fenotípica por grados o niveles de observación. | *Condición Corporal Bovina (Score CC 1 a 5)*, *Escala de Locomoción y Cojeras*, *Llenado Ruminal*. |
| **3. Protocolo Paso a Paso** | Procedimientos clínicos, hormonales o de manejo con tiempos estrictos. | *Protocolo IATF (Día 0, 8 y 10)*, *Protocolo de Curación de Ombligo*, *Tratamiento de Secado de Ubre*. |
| **4. Matriz de Decisión** | Tablas condicionales con causas probables, acciones recomendadas y prioridad. | *Diagnóstico de Mastitis Clínica vs. Subclínica*, *Plan de Emergencia por Estrés Calórico*. |
| **5. Concepto de Glosario** | Definición conceptual sin fórmula aritmética cerrada. | *Aforo Forrajero*, *Capacidad de Carga en UGM*, *Periodo de Retiro Farmacológico*. |
| **6. Parámetro Personalizado** | Esquema abierto con campos libres clave-valor y enlaces técnicos externos. | Parámetros específicos de cada ganadería o certificaciones de nicho. |

---

## 4. Arquitectura de Software e Infraestructura

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA DEL SISTEMA                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ NAVEGADOR DEL CLIENTE ]                                            │
│         │                                                              │
│         ├── HTTPS ──> [ Firebase Hosting (Edge CDN) ]                  │
│         │                 └── Next.js 16 SSG Static Export             │
│         │                 └── Headers: no-cache en HTML                │
│         │                 └── Headers: immutable en _next/static       │
│         │                                                              │
│         ├── WSS/HTTPS ──> [ Firebase Realtime Database (RTDB) ]        │
│         │                     ├── /courses (Cursos, Módulos, Clases)   │
│         │                     ├── /metrics (Catálogo Multitemplate)    │
│         │                     ├── /scenarios (Fase 2 Reflejo)          │
│         │                     ├── /missions (Fase 3 Misiones Sandbox)  │
│         │                     └── /progress/{uid} (Avance de Alumno)   │
│         │                                                              │
│         ├── HTTPS ──> [ Cloudflare R2 + Worker API ]                   │
│         │                 ├── PUT directo vía worker                   │
│         │                 └── GET público $0 egress CDN                │
│         │                                                              │
│         └── HTTPS ──> [ Firebase Auth ]                                │
│                           ├── Google OAuth Provider                    │
│                           ├── Email / Password                         │
│                           └── Phone SMS con reCAPTCHA invisible        │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Principios de Ingeniería
1. **Serverless Puro & Zero Egress Fees:** La plataforma se ejecuta íntegramente en cliente mediante un Static Site Generation (SSG) de Next.js, eliminando la necesidad de servidores Node.js dedicados en ejecución continua.
2. **Cloudflare R2 Direct Upload Engine:** La carga de videos de lecciones e imágenes de escenarios se realiza directamente al bucket de Cloudflare R2 a través de un Worker optimizado, garantizando **\$0 costo de transferencia** por reproducción de video y evitando sobrecostos de Firebase Storage.
3. **Resiliencia de Caché en Hosting:** Configuración estricta en `firebase.json` que previene el desfase de hashes CSS/JS de Turbopack:
   - `Cache-Control: no-cache, no-store, must-revalidate` para todas las páginas HTML y rutas limpias (`**`).
   - `Cache-Control: public, max-age=31536000, immutable` para los bundles de código estáticos (`/_next/static/**`).
4. **Política Anti-Prompt Leak en UI:** Ningún texto visible de cara al usuario final contiene jerga de inteligencia artificial, indicaciones internas de prompts o mensajes de depuración técnica.

---

## 5. Panel de Control Unificado (Studio Admin)

El panel administrativo ([`/admin`](https://IPT Course-course.web.app/admin)) proporciona un centro de comando centralizado para los creadores de contenido de IPT con una barra de navegación de 5 pestañas:

1. **Cursos y Temario (`/admin`):**
   - Árbol de navegación jerárquico de Módulos y Lecciones.
   - Uploader Drag-and-Drop de video directo a Cloudflare R2 con barra de progreso en tiempo real.
   - Editor de Puntos de Control en Video (In-Video Checkpoints) y Quizzes finales.
   - Vinculador de métricas zootécnicas por lección con buscador en vivo.
   - Carga masiva de cursos mediante archivos JSON estructurados.
   - Botón directo de "Ver Aula" para previsualización inmediata.

2. **Métricas Asociadas (`/admin/metrics`):**
   - Gestor multitemplate completo para crear, editar y eliminar métricas.
   - Selector dinámico de plantillas (Fórmula, Escala Visual, Protocolo, Matriz, Glosario, Personalizado).
   - Botón de **"Precargar Biblioteca Oficial"** que inyecta instantáneamente el catálogo de fábrica de IPT Course 360 en Firebase.

3. **Escenarios Visuales (`/admin/scenarios`):**
   - Diseñador de pruebas de Reflejo Operativo (Fase 2).
   - Uploader directo de capturas de pantalla de la aplicación hacia Cloudflare R2.
   - Selector de **Métrica de IPT Course Asociada** con tarjeta de previsualización técnica.
   - Editor de opciones de respuesta con retroalimentación zootécnica personalizada.

4. **Misiones Sandbox (`/admin/missions`):**
   - Configuración de las misiones interactivas del entorno de pruebas (Fase 3).
   - Editor de reglas de validación en tiempo real (módulo objetivo, campos a validar, operadores lógicos).
   - Definición de instrucciones y pasos de solución guiada.

5. **Analítica & Telemetría (`/admin/analytics`):**
   - Ranking de dificultad académica: identifica preguntas de quizzes y checkpoints con mayor tasa de error para orientar el refuerzo pedagógico.
   - Monitoreo de telemetría de interacción del alumnado.

---

## 6. Identidad Visual y Sistema de Diseño

IPT Course Course utiliza el sistema de diseño oficial de la marca:

- **Isotipo Oficial:** Hoja agropecuaria con sensor/antena de telemetría integrada de IPT Tech.
- **Colores de Marca:**
  - `Obsidian` (`#202230`): Fondos de encabezados oscuros y superficies de aula.
  - `Aubergine` (`#6d28d2`): Violeta de acento principal, botones primarios y badges de estado.
  - `Ink` (`#2a2b3f`): Tipografía principal y títulos de alto contraste.
  - `Steel` (`#595c73`): Subtítulos, textos secundarios y leyendas explicativas.
  - `Chalk` (`#d1d2e0`): Bordes finos y delimitadores estructurales.
  - `Porcelain` (`#e9eaf2`) y `Paper` (`#f6f7f9`): Fondos de interfaz claros y descansados.
- **Tipografía:** Tipografía geométrica humanista sans-serif optimizada para lectura técnica instruccional.

---

## 7. Mapa de Rutas del Sistema

| Ruta | Acceso | Función Principal |
|---|---|---|
| `/` | Público | Catálogo principal de cursos, banner de fases y bienvenida institucional. |
| `/login` | Público | Inicio de sesión unificado (Google, Correo, Teléfono SMS). |
| `/register` | Público | Registro de nuevos estudiantes con creación de perfil en Firebase. |
| `/course?id=:slug` | Alumnos | Aula Virtual: reproductor de video, notas, foros, quizzes y métricas. |
| `/scenarios` | Alumnos | Entrenador de Reflejo Operativo (Fase 2): resolución de casos visuales. |
| `/sandbox` | Alumnos | Simulador interactivo IPT Tech (Fase 3) con banner de misiones dinámicas. |
| `/admin` | Admin | Studio: gestión de catálogo, módulos, lecciones, videos y quizzes. |
| `/admin/metrics` | Admin | Gestor multitemplate de las 73 métricas zootécnicas. |
| `/admin/scenarios` | Admin | Gestor de escenarios de Reflejo Operativo. |
| `/admin/missions` | Admin | Gestor de misiones para el Sandbox interactivo. |
| `/admin/analytics` | Admin | Métricas de rendimiento académico y telemetría de fallos. |

---

## 8. Conclusión y Futuro de la Plataforma

**IPT Course Course** consolida la visión de **IPT (Ivan Perez Tech)** de convertir la digitalización ganadera en un estándar accesible, confiable y medible. Al combinar la solidez técnica de una arquitectura serverless costo-cero con la pedagogía inmersiva en tres fases (Video, Reflejo Operativo y Sandbox), la plataforma garantiza que cada alumno egresado domine las herramientas digitales de **IPT Course 360** para maximizar la rentabilidad del hato bovino en América Latina.
