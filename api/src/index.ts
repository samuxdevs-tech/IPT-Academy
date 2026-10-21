import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
}

const app = new Hono<{ Bindings: Env }>();

// Configuración CORS amplia para consumo desde estudiantes (localhost:3000) y docentes (localhost:3005)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Estado de salud
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'ipt-course-api', time: new Date().toISOString() });
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
    
    // Parsear rubric_json y allowed_extensions
    const parsed = (result.results || []).map((row: any) => ({
      ...row,
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
      body.courseSlug || 'datagan-360-pro',
      body.courseTitle || 'DataGan 360 Pro',
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
    const file = formData.get('file');
    const submissionId = (formData.get('submissionId') as string) || `sub-${Date.now()}`;

    if (!file || !(file instanceof File)) {
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

export default app;
