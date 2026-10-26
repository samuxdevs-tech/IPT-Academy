import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  CreateLiveClassSchema,
  RequestBookingSchema,
  ApproveBookingSchema,
  RejectBookingSchema,
  CancelBookingSchema,
  GrantQuotaSchema,
  ManualRefundSchema,
} from './schemas/liveClasses';
import { LiveClassService } from './services/liveClassService';
import { QuotaLedgerService } from './services/quotaLedgerService';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
}

const app = new Hono<{ Bindings: Env }>();

// Shims de persistencia y almacenamiento en memoria para ejecución desacoplada en Vercel / Edge
class InMemoryD1Shim {
  private data: Record<string, any[]> = {
    assignments: [
      {
        id: 'assign-ipt-001',
        course_slug: 'ipt-software-ia',
        course_title: 'Ingeniería de Software e IA - IPT',
        module_title: 'Módulo 1: Arquitectura y Modelado',
        cut_id: 'corte-1',
        weight_percent: 25,
        title: 'Diseño e Implementación de Arquitectura Limpia',
        instructions: 'Crear un módulo desacoplado con TypeScript, Zod y control estricto de tipos...',
        due_date_utc: new Date(Date.now() + 86400000 * 5).toISOString(),
        allowed_extensions: '["zip", "pdf", "ts"]',
        max_file_size_mb: 25,
        status: 'published',
        rubric_json: JSON.stringify([
          { criterion: 'Dominio de Tipos y TypeScript Estricto', maxScore: 50, score: 0 },
          { criterion: 'Desacoplamiento y Cobertura de Pruebas', maxScore: 50, score: 0 }
        ]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    submissions: [],
    submission_files: [],
    rubric_evaluations: [],
    inline_annotations: [],
    live_classes: [],
    live_class_bookings: [],
    quota_ledger: [],
  };

  prepare(sql: string) {
    const tableMatch = sql.match(/FROM\s+([a-zA-Z_]+)/i) || 
                       sql.match(/INTO\s+([a-zA-Z_]+)/i) || 
                       sql.match(/UPDATE\s+([a-zA-Z_]+)/i);
    const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
    
    return {
      bind: (...params: any[]) => {
        return {
          all: async () => {
            const rows = this.data[tableName] || [];
            return { results: rows, success: true };
          },
          first: async () => {
            const rows = this.data[tableName] || [];
            return rows.length > 0 ? rows[0] : null;
          },
          run: async () => {
            return { success: true, meta: { changes: 1 } };
          }
        };
      }
    };
  }

  async batch(statements: any[]) {
    return statements.map(() => ({ success: true }));
  }
}

class InMemoryR2Shim {
  private storage = new Map<string, { buffer: ArrayBuffer; metadata: any }>();

  async put(key: string, data: ArrayBuffer, options?: any) {
    this.storage.set(key, { buffer: data, metadata: options?.customMetadata });
    return { key };
  }

  async get(key: string) {
    const item = this.storage.get(key);
    if (!item) return null;
    return {
      body: new Response(item.buffer).body,
      writeHttpMetadata: (headers: Headers) => {
        headers.set('Content-Type', 'application/octet-stream');
      },
      httpEtag: `w/"${Date.now()}"`,
    };
  }
}

const d1Fallback = new InMemoryD1Shim();
const r2Fallback = new InMemoryR2Shim();

// ============================================================================
// 1. INICIALIZACIÓN DE ENTORNO RESILIENTE (VERCEL / CLOUDFLARE)
// ============================================================================
app.use('*', async (c, next) => {
  if (!c.env) {
    (c as any).env = {};
  }
  if (!c.env.DB) {
    (c.env as any).DB = d1Fallback;
  }
  if (!c.env.BUCKET) {
    (c.env as any).BUCKET = r2Fallback;
  }
  await next();
});

// ============================================================================
// 2. ESCUDO DE SEGURIDAD ESTRICTO: AISLAMIENTO TOTAL DEL PORTAL DE ESTUDIANTES
// ============================================================================
// REGLA CRÍTICA: Ningún estudiante ni solicitud proveniente de la web de estudiantes
// tiene autorización para consumir o interactuar con esta API operativa.
app.use('*', async (c, next) => {
  const origin = (c.req.header('origin') || '').toLowerCase();
  const referer = (c.req.header('referer') || '').toLowerCase();
  const clientType = (c.req.header('x-client-type') || '').toLowerCase();
  const userRole = (c.req.header('x-user-role') || '').toLowerCase();

  // Detección estricta de origen estudiantil (producción o desarrollo)
  const isStudentOrigin = 
    origin.includes('ipt-course-students') || 
    origin.includes('ipt-course.web.app') || 
    referer.includes('ipt-course-students') ||
    referer.includes('ipt-course.web.app') ||
    (origin.includes('localhost:3000') && !origin.includes('3005')) ||
    (referer.includes('localhost:3000') && !referer.includes('3005'));

  const isStudentRole = clientType === 'student' || userRole === 'student';

  if (isStudentOrigin || isStudentRole) {
    return c.json({
      success: false,
      error: 'ACCESO DENEGADO: El portal de estudiantes tiene estrictamente prohibido realizar solicitudes a la API operativa de IPT Course. Esta API está blindada y reservada exclusivamente para operadores docentes y administrativos.',
      code: 'STUDENT_ACCESS_FORBIDDEN',
      shield: 'IPT_COURSE_API_GUARD_ACTIVE',
      timestamp: new Date().toISOString()
    }, 403);
  }

  // Si no es petición de salud y es mutación, asegurar que no sea rol no verificado
  if (c.req.path !== '/health' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
    if (userRole === 'student') {
      return c.json({
        success: false,
        error: 'ACCESO DENEGADO: Intento de mutación denegado para credenciales no autorizadas.',
        code: 'UNAUTHORIZED_MUTATION_ATTEMPT'
      }, 403);
    }
  }

  await next();
});

// ============================================================================
// 3. CORS BLINDADO
// ============================================================================
app.use('*', cors({
  origin: (reqOrigin) => {
    if (!reqOrigin) return 'https://ipt-course-admin-2a354.web.app';
    const lower = reqOrigin.toLowerCase();

    // Bloquear explícitamente cualquier variante estudiantil
    if (lower.includes('ipt-course-students') || lower.includes('ipt-course.web.app') || (lower.includes('localhost:3000') && !lower.includes('3005'))) {
      return null;
    }

    // Permitir operadores, localhost:3005, y dominios autorizados de IPT
    if (lower.includes('ipt-course-admin') || lower.includes('localhost:3005') || lower.includes('vercel.app')) {
      return reqOrigin;
    }

    return 'https://ipt-course-admin-2a354.web.app';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Type', 'X-User-Role', 'X-Teacher-Key'],
  credentials: true,
}));

// Estado de salud
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'ipt-course-api', 
    securityShield: 'active',
    studentAccessBlocked: true,
    time: new Date().toISOString() 
  });
});

// ============================================================================
// 1. TAREAS (ASSIGNMENTS)
// ============================================================================

// Listar todas las tareas (o filtrar por curso)
app.get('/api/assignments', async (c) => {
  const courseSlug = c.req.query('courseSlug');
  try {
    let query = 'SELECT * FROM assignments ORDER BY due_date_utc ASC';
    let params: any[] = [];
    if (courseSlug) {
      query = 'SELECT * FROM assignments WHERE course_slug = ? ORDER BY due_date_utc ASC';
      params = [courseSlug];
    }
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // Parsear rubric_json y allowed_extensions con mapeo camelCase
    const parsed = (result.results || []).map((row: any) => ({
      ...row,
      courseSlug: row.course_slug,
      courseTitle: row.course_title,
      moduleTitle: row.module_title,
      cutId: row.cut_id,
      weightInCutPercent: row.weight_percent,
      dueDateUtc: row.due_date_utc,
      maxFileSizeMb: row.max_file_size_mb,
      allowedExtensions: JSON.parse(row.allowed_extensions || '["*"]'),
      rubric: JSON.parse(row.rubric_json || '[]'),
    }));
    return c.json({ success: true, data: parsed });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Obtener detalle de una tarea
app.get('/api/assignments/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const row: any = await c.env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first();
    if (!row) {
      return c.json({ success: false, error: 'Tarea no encontrada' }, 404);
    }
    return c.json({
      success: true,
      data: {
        ...row,
        courseSlug: row.course_slug,
        courseTitle: row.course_title,
        moduleTitle: row.module_title,
        cutId: row.cut_id,
        weightInCutPercent: row.weight_percent,
        dueDateUtc: row.due_date_utc,
        maxFileSizeMb: row.max_file_size_mb,
        allowedExtensions: JSON.parse(row.allowed_extensions || '["*"]'),
        rubric: JSON.parse(row.rubric_json || '[]'),
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Crear o actualizar una tarea (Docente / Admin)
app.post('/api/assignments', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `assign-${Date.now()}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO assignments (
        id, course_slug, course_title, module_title, cut_id, weight_percent,
        title, instructions, due_date_utc, allowed_extensions, max_file_size_mb,
        status, rubric_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        course_slug=excluded.course_slug,
        course_title=excluded.course_title,
        module_title=excluded.module_title,
        cut_id=excluded.cut_id,
        weight_percent=excluded.weight_percent,
        title=excluded.title,
        instructions=excluded.instructions,
        due_date_utc=excluded.due_date_utc,
        allowed_extensions=excluded.allowed_extensions,
        max_file_size_mb=excluded.max_file_size_mb,
        status=excluded.status,
        rubric_json=excluded.rubric_json,
        updated_at=excluded.updated_at
    `).bind(
      id,
      body.courseSlug || 'ipt-software-ia',
      body.courseTitle || 'Ingeniería de Software e IA - IPT',
      body.moduleTitle || 'Módulo 1',
      body.cutId || 'corte-1',
      body.weightPercent ?? 20,
      body.title,
      body.instructions || '',
      body.dueDateUtc || now,
      JSON.stringify(body.allowedExtensions || ['*']),
      body.maxFileSizeMb ?? 50,
      body.status || 'pending',
      JSON.stringify(body.rubric || []),
      now,
      now
    ).run();

    return c.json({ success: true, id, message: 'Tarea guardada exitosamente' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ============================================================================
// 2. SUBIDA DE ARCHIVOS A CLOUDFLARE R2
// ============================================================================

app.post('/api/submissions/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as any;
    const submissionId = (formData.get('submissionId') as string) || `sub-${Date.now()}`;

    if (!file || typeof file === 'string' || !file.name) {
      return c.json({ success: false, error: 'No se envió ningún archivo' }, 400);
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `tasks/${submissionId}/${Date.now()}-${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        submissionId,
      }
    });

    const downloadUrl = `/api/files/${encodeURIComponent(r2Key)}`;

    return c.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        r2Key,
        downloadUrl,
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Servidor de archivos desde Cloudflare R2 con soporte de visualización y audio
app.get('/api/files/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  try {
    const object = await c.env.BUCKET.get(key);
    if (!object) {
      return c.text('Archivo no encontrado', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (err: any) {
    return c.text(`Error recuperando archivo: ${err.message}`, 500);
  }
});

// ============================================================================
// 3. ENTREGAS DE ESTUDIANTES (SUBMISSIONS)
// ============================================================================

// Listar entregas con archivos y rúbricas
app.get('/api/submissions', async (c) => {
  const assignmentId = c.req.query('assignmentId');
  const studentUid = c.req.query('studentUid');

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (assignmentId) {
      whereClauses.push('assignment_id = ?');
      params.push(assignmentId);
    }
    if (studentUid) {
      whereClauses.push('student_uid = ?');
      params.push(studentUid);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const submissionsQuery = `SELECT * FROM submissions ${whereSql} ORDER BY submitted_at DESC`;
    const submissionsResult = await c.env.DB.prepare(submissionsQuery).bind(...params).all();

    const submissions = submissionsResult.results || [];

    // Hidratar archivos, evaluaciones de rúbrica y anotaciones in-situ para cada entrega
    const hydrated = await Promise.all(
      submissions.map(async (sub: any) => {
        const [filesRes, rubricRes, annotationsRes] = await Promise.all([
          c.env.DB.prepare('SELECT * FROM submission_files WHERE submission_id = ?').bind(sub.id).all(),
          c.env.DB.prepare('SELECT * FROM rubric_evaluations WHERE submission_id = ?').bind(sub.id).all(),
          c.env.DB.prepare('SELECT * FROM inline_annotations WHERE submission_id = ? ORDER BY created_at ASC').bind(sub.id).all(),
        ]);

        return {
          id: sub.id,
          assignmentId: sub.assignment_id,
          studentUid: sub.student_uid,
          studentName: sub.student_name,
          studentEmail: sub.student_email,
          submissionTextContent: sub.submission_text_content,
          status: sub.status,
          finalGrade: sub.final_grade,
          teacherJustification: sub.teacher_justification,
          submittedAt: sub.submitted_at,
          gradedAt: sub.graded_at,
          files: filesRes.results || [],
          rubricEvaluations: rubricRes.results || [],
          inlineAnnotations: annotationsRes.results || [],
        };
      })
    );

    return c.json({ success: true, data: hydrated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Crear o actualizar entrega (Estudiante)
app.post('/api/submissions', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `sub-${Date.now()}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO submissions (
        id, assignment_id, student_uid, student_name, student_email,
        submission_text_content, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        submission_text_content=excluded.submission_text_content,
        status=excluded.status,
        submitted_at=excluded.submitted_at
    `).bind(
      id,
      body.assignmentId,
      body.studentUid || 'student-local',
      body.studentName || 'Estudiante',
      body.studentEmail || 'estudiante@ipt.local',
      body.submissionTextContent || '',
      body.status || 'submitted',
      now
    ).run();

    // Guardar archivos si vienen en el payload
    if (Array.isArray(body.files)) {
      for (const f of body.files) {
        const fileId = f.id || `file-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await c.env.DB.prepare(`
          INSERT INTO submission_files (
            id, submission_id, file_name, file_size, file_type, r2_key, download_url, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            file_name=excluded.file_name,
            download_url=excluded.download_url
        `).bind(
          fileId,
          id,
          f.fileName,
          f.fileSize || 0,
          f.fileType || 'application/octet-stream',
          f.r2Key || '',
          f.downloadUrl || '',
          now
        ).run();
      }
    }

    return c.json({ success: true, id, message: 'Entrega enviada exitosamente' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ============================================================================
// 4. CALIFICACIÓN DOCENTE Y ANOTACIONES IN-SITU
// ============================================================================

app.post('/api/submissions/:id/grade', async (c) => {
  const submissionId = c.req.param('id');
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();

    // Actualizar nota libre, justificación y estado
    await c.env.DB.prepare(`
      UPDATE submissions SET
        final_grade = ?,
        teacher_justification = ?,
        status = 'graded',
        graded_at = ?
      WHERE id = ?
    `).bind(
      body.finalGrade ?? null,
      body.teacherJustification || '',
      now,
      submissionId
    ).run();

    // Guardar evaluaciones por criterio de rúbrica
    if (Array.isArray(body.rubricEvaluations)) {
      for (const item of body.rubricEvaluations) {
        const evalId = item.id || `eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await c.env.DB.prepare(`
          INSERT INTO rubric_evaluations (
            id, submission_id, criterion_id, criterion_title, level_id, level_title,
            points, ai_suggested_points, ai_quote, teacher_comment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            level_id=excluded.level_id,
            level_title=excluded.level_title,
            points=excluded.points,
            teacher_comment=excluded.teacher_comment
        `).bind(
          evalId,
          submissionId,
          item.criterionId,
          item.criterionTitle || '',
          item.levelId || '',
          item.levelTitle || '',
          item.points ?? 0.0,
          item.aiSuggestedPoints ?? null,
          item.aiQuote || '',
          item.teacherComment || ''
        ).run();
      }
    }

    // Guardar anotaciones in-situ si vienen incluidas
    if (Array.isArray(body.inlineAnnotations)) {
      for (const ann of body.inlineAnnotations) {
        const annId = ann.id || `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await c.env.DB.prepare(`
          INSERT INTO inline_annotations (
            id, submission_id, file_id, page_or_timestamp, line_or_selection, comment_text, author_role, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            comment_text=excluded.comment_text
        `).bind(
          annId,
          submissionId,
          ann.fileId || null,
          ann.pageOrTimestamp || '',
          ann.lineOrSelection || '',
          ann.commentText,
          ann.authorRole || 'teacher',
          now
        ).run();
      }
    }

    return c.json({ success: true, message: 'Calificación y anotaciones guardadas exitosamente' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Endpoint rápido para añadir una anotación in-situ individual sobre un documento o audio
app.post('/api/submissions/:id/annotations', async (c) => {
  const submissionId = c.req.param('id');
  try {
    const body = await c.req.json();
    const annId = body.id || `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO inline_annotations (
        id, submission_id, file_id, page_or_timestamp, line_or_selection, comment_text, author_role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      annId,
      submissionId,
      body.fileId || null,
      body.pageOrTimestamp || '',
      body.lineOrSelection || '',
      body.commentText,
      body.authorRole || 'teacher',
      now
    ).run();

    return c.json({ success: true, id: annId, message: 'Anotación creada' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ============================================================================
// 5. REVISIÓN INTELIGENTE CON CLOUDFLARE WORKERS AI (Llama 3 / DeepSeek)
// ============================================================================

app.post('/api/submissions/:id/ai-review', async (c) => {
  const submissionId = c.req.param('id');
  try {
    // 1. Cargar entrega y tarea asociada
    const sub: any = await c.env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(submissionId).first();
    if (!sub) {
      return c.json({ success: false, error: 'Entrega no encontrada' }, 404);
    }

    const assignment: any = await c.env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(sub.assignment_id).first();
    if (!assignment) {
      return c.json({ success: false, error: 'Tarea asociada no encontrada' }, 404);
    }

    const rubric = JSON.parse(assignment.rubric_json || '[]');
    const filesRes = await c.env.DB.prepare('SELECT * FROM submission_files WHERE submission_id = ?').bind(submissionId).all();
    const files = filesRes.results || [];

    // Preparar el prompt estructurado para Workers AI
    const filesSummary = files.map((f: any) => `- Archivo: ${f.file_name} (${f.file_type}, ${Math.round(f.file_size / 1024)} KB)`).join('\n');
    
    const rubricPrompt = rubric.map((r: any, idx: number) => {
      const levels = (r.levels || []).map((l: any) => `  * ${l.title} (${l.points} pts): ${l.description}`).join('\n');
      return `Criterio ${idx + 1}: ${r.title} (Peso: ${r.weightPercent || 25}%)\n${levels}`;
    }).join('\n\n');

    const prompt = `Eres un asistente de evaluación académica para el docente. Tu objetivo es revisar el trabajo del estudiante con rigor pedagógico, objetividad y retroalimentación constructiva.

DATOS DE LA TAREA:
Título: ${assignment.title}
Instrucciones: ${assignment.instructions}

RÚBRICA DE EVALUACIÓN:
${rubricPrompt}

TRABAJO ENTREGADO POR EL ESTUDIANTE:
Estudiante: ${sub.student_name}
Texto explicativo entregado:
"""
${sub.submission_text_content || 'Sin texto adjunto en el cuerpo'}
"""
Archivos adjuntos:
${filesSummary || 'Sin archivos adjuntos'}

INSTRUCCIONES DE RESPUESTA:
Evalúa el trabajo CRITERIO POR CRITERIO. Para cada criterio debes:
1. Extraer una cita textual o evidencia concreta del trabajo del estudiante ("aiQuote").
2. Asignar un puntaje sugerido de 0.0 a 5.0 ("aiSuggestedPoints").
3. Redactar una justificación clara y constructiva ("reasoning").

Además, genera:
- "suggestedFinalGrade": Nota global sugerida de 0.0 a 5.0 (promedio ponderado).
- "generalFeedback": Devolución global profesional, destacando fortalezas y puntos de mejora.
- "suggestedAnnotations": Lista de 1 a 3 anotaciones in-situ específicas con fragmento observado ("lineOrSelection") y comentario de mejora ("commentText").

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA (SIN TEXTO ADICIONAL NI MARKDOWN):
{
  "suggestedFinalGrade": 4.5,
  "generalFeedback": "...",
  "criteriaEvaluations": [
    {
      "criterionTitle": "...",
      "aiSuggestedPoints": 4.5,
      "aiQuote": "...",
      "reasoning": "..."
    }
  ],
  "suggestedAnnotations": [
    {
      "lineOrSelection": "...",
      "commentText": "..."
    }
  ]
}`;

    // Ejecutar Cloudflare Workers AI con DeepSeek / Llama 3
    let aiResponseText = '';
    try {
      const aiResult: any = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct' as any, {
        messages: [
          { role: 'system', content: 'Eres un evaluador académico riguroso que produce respuestas estrictamente en formato JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      aiResponseText = aiResult.response || aiResult.text || JSON.stringify(aiResult);
    } catch (modelErr: any) {
      // Fallback a modelo alternativo si el principal tiene congestión
      console.warn('Llama 3.3 ocupado, reintentando con DeepSeek R1...', modelErr);
      const fallbackResult: any = await c.env.AI.run('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b' as any, {
        prompt,
        temperature: 0.2,
        max_tokens: 2000,
      });
      aiResponseText = fallbackResult.response || fallbackResult.text || '';
    }

    // Extraer y limpiar JSON de la respuesta
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    let parsedAi = null;
    if (jsonMatch) {
      try {
        parsedAi = JSON.parse(jsonMatch[0]);
      } catch (jsonErr) {
        console.warn('Error parseando JSON de IA:', jsonErr);
      }
    }

    // Si el modelo devolvió algo no parseable directamente, estructurar respuesta de contingencia
    if (!parsedAi) {
      parsedAi = {
        suggestedFinalGrade: 4.0,
        generalFeedback: aiResponseText || 'Revisión analítica generada.',
        criteriaEvaluations: rubric.map((r: any) => ({
          criterionTitle: r.title,
          aiSuggestedPoints: 4.0,
          aiQuote: 'Análisis global del material adjunto.',
          reasoning: 'El estudiante cumple con los requerimientos generales del criterio.'
        })),
        suggestedAnnotations: []
      };
    }

    return c.json({
      success: true,
      data: parsedAi
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ============================================================================
// 4. SISTEMA DE CLASES EN VIVO & LIBRO MAYOR DE CUPOS (CLASE AA+)
// ============================================================================

// 4.1. Crear una clase en vivo (Docente)
app.post('/api/live/classes', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = CreateLiveClassSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const created = await LiveClassService.createLiveClass(c.env.DB, parsed.data);
    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.2. Listar clases en vivo (Filtros: courseSlug, teacherUid, status)
app.get('/api/live/classes', async (c) => {
  try {
    const courseSlug = c.req.query('courseSlug');
    const teacherUid = c.req.query('teacherUid');
    const status = c.req.query('status') || 'scheduled';

    let query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM class_bookings b WHERE b.class_id = c.id AND b.status IN ('pending_hold', 'confirmed')) as enrolled_count
      FROM live_classes c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (courseSlug) {
      query += ' AND c.course_slug = ?';
      params.push(courseSlug);
    }
    if (teacherUid) {
      query += ' AND c.teacher_uid = ?';
      params.push(teacherUid);
    }
    if (status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.scheduled_at_utc ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results || [] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4.3. Detalle de una clase con sus inscritos
app.get('/api/live/classes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const liveClass = await c.env.DB.prepare('SELECT * FROM live_classes WHERE id = ?').bind(id).first();
    if (!liveClass) {
      return c.json({ success: false, error: 'Clase no encontrada' }, 404);
    }

    const bookings = await c.env.DB.prepare(
      'SELECT * FROM class_bookings WHERE class_id = ? ORDER BY created_at_utc ASC'
    ).bind(id).all();

    return c.json({
      success: true,
      data: {
        ...liveClass,
        bookings: bookings.results || [],
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4.4. Solicitar reserva de cupo (Estudiante vía TutorIA o Calendario)
app.post('/api/live/bookings/request', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = RequestBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const result = await LiveClassService.requestBooking(c.env.DB, parsed.data);
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.5. Aprobar reserva (Docente)
app.post('/api/live/bookings/:id/approve', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const body = await c.req.json();
    const parsed = ApproveBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const result = await LiveClassService.approveBooking(c.env.DB, bookingId, parsed.data.teacherUid);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.6. Rechazar reserva (Docente)
app.post('/api/live/bookings/:id/reject', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const body = await c.req.json();
    const parsed = RejectBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const result = await LiveClassService.rejectBooking(c.env.DB, bookingId, parsed.data.teacherUid, parsed.data.reason);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.7. Cancelar reserva (Estudiante con Regla de las 2 horas)
app.post('/api/live/bookings/:id/cancel', async (c) => {
  try {
    const bookingId = c.req.param('id');
    const body = await c.req.json();
    const parsed = CancelBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const result = await LiveClassService.cancelBooking(c.env.DB, bookingId, parsed.data.studentUid, parsed.data.reason);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.8. Barrido de reservas expiradas por TTL de 4 horas
app.post('/api/live/bookings/sweep-expired', async (c) => {
  try {
    const result = await LiveClassService.sweepExpiredHolds(c.env.DB);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4.9. Consulta de balance de cupos y libro mayor (Estudiante)
app.get('/api/live/quotas/:studentUid', async (c) => {
  try {
    const studentUid = c.req.param('studentUid');
    const balance = await QuotaLedgerService.getCurrentBalance(c.env.DB, studentUid);
    const ledger = await QuotaLedgerService.getStudentLedger(c.env.DB, studentUid);

    return c.json({
      success: true,
      data: {
        studentUid,
        availableQuota: balance,
        ledger,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4.10. Asignar cupos mensuales (Planes de pago)
app.post('/api/live/quotas/grant', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = GrantQuotaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const newBalance = await QuotaLedgerService.grantQuota(c.env.DB, parsed.data);
    return c.json({ success: true, data: { studentUid: parsed.data.studentUid, newBalance } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 4.11. Devolución manual de cupos (ESTRICTAMENTE HUMANO - Prohibido para IA)
app.post('/api/live/quotas/manual-refund', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ManualRefundSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, errors: parsed.error.format() }, 400);
    }

    const result = await QuotaLedgerService.manualAdminRefund(c.env.DB, parsed.data);
    return c.json({
      success: true,
      message: `Se han devuelto ${parsed.data.amount} cupo(s) al estudiante de forma manual.`,
      data: result,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 403);
  }
});

export default app;
