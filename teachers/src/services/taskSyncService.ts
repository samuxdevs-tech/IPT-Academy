/**
 * Servicio unificado de tareas, entregas y evaluación con Cloudflare Worker (D1 + R2 + Workers AI)
 * Con respaldo local offline transparente para garantizar disponibilidad total.
 */

export interface SubmissionFileItem {
  id?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  r2Key?: string;
  downloadUrl?: string;
  uploadedAt?: string;
}

export interface RubricEvalItem {
  id?: string;
  criterionId: string;
  criterionTitle: string;
  levelId?: string;
  levelTitle?: string;
  points: number;
  aiSuggestedPoints?: number;
  aiQuote?: string;
  teacherComment?: string;
}

export interface InlineAnnotationItem {
  id: string;
  fileId?: string;
  pageOrTimestamp?: string;
  lineOrSelection: string;
  commentText: string;
  authorRole: 'teacher' | 'ai';
  createdAt: string;
}

export interface FullSubmissionItem {
  id: string;
  assignmentId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  submissionTextContent?: string;
  status: 'submitted' | 'graded' | 'returned';
  finalGrade?: number;
  teacherJustification?: string;
  submittedAt: string;
  gradedAt?: string;
  files: SubmissionFileItem[];
  rubricEvaluations: RubricEvalItem[];
  inlineAnnotations: InlineAnnotationItem[];
}

export interface AiReviewResult {
  suggestedFinalGrade: number;
  generalFeedback: string;
  criteriaEvaluations: Array<{
    criterionTitle: string;
    aiSuggestedPoints: number;
    aiQuote: string;
    reasoning: string;
  }>;
  suggestedAnnotations: Array<{
    lineOrSelection: string;
    commentText: string;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_TASK_API_URL || 'https://ipt-course-api.samuxdevs.workers.dev';
const LOCAL_SUBMISSIONS_KEY = 'ipt_course_real_submissions_v1';

/**
 * Obtiene el almacenamiento local de respaldo
 */
function getLocalSubmissions(): FullSubmissionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda en el almacenamiento local de respaldo y emite evento global
 */
function saveLocalSubmissions(subs: FullSubmissionItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent('ipt-task-sync-update', { detail: subs }));
  } catch (err) {
    console.warn('Error guardando en caché local:', err);
  }
}

/**
 * Subir un archivo (PDF, Audio, DOCX, TXT, etc.) a Cloudflare R2
 */
export async function uploadFileToR2(file: File, submissionId?: string): Promise<SubmissionFileItem> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (submissionId) formData.append('submissionId', submissionId);

    const res = await fetch(`${API_BASE}/api/submissions/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Worker R2 offline o no disponible, usando almacenamiento simulado local:', err);
  }

  // Respaldo local si el Worker aún no está iniciado
  return {
    id: `file-${Date.now()}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    downloadUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Obtener entregas registradas para una tarea
 */
export async function fetchSubmissions(assignmentId?: string, studentUid?: string): Promise<FullSubmissionItem[]> {
  try {
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignmentId', assignmentId);
    if (studentUid) params.append('studentUid', studentUid);

    const res = await fetch(`${API_BASE}/api/submissions?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        // Sincronizar con caché local
        const current = getLocalSubmissions();
        const merged = [...json.data];
        saveLocalSubmissions(merged);
        return json.data;
      }
    }
  } catch (err) {
    // Modo offline/local
  }

  // Filtrar del almacenamiento local
  const local = getLocalSubmissions();
  return local.filter((s) => {
    if (assignmentId && s.assignmentId !== assignmentId) return false;
    if (studentUid && s.studentUid !== studentUid) return false;
    return true;
  });
}

/**
 * Enviar entrega completa del estudiante (Multiarchivos + Texto)
 */
export async function sendStudentSubmission(payload: {
  id?: string;
  assignmentId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  submissionTextContent?: string;
  files: SubmissionFileItem[];
}): Promise<FullSubmissionItem> {
  const subId = payload.id || `sub-${Date.now()}`;
  const now = new Date().toISOString();

  const newSubmission: FullSubmissionItem = {
    id: subId,
    assignmentId: payload.assignmentId,
    studentUid: payload.studentUid,
    studentName: payload.studentName,
    studentEmail: payload.studentEmail,
    submissionTextContent: payload.submissionTextContent || '',
    status: 'submitted',
    submittedAt: now,
    files: payload.files,
    rubricEvaluations: [],
    inlineAnnotations: [],
  };

  // Intentar persistir en Cloudflare Worker (D1)
  try {
    await fetch(`${API_BASE}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSubmission),
    });
  } catch (err) {
    console.warn('Worker D1 no disponible, guardando en base local:', err);
  }

  // Siempre persistir en base local para reactividad inmediata
  const local = getLocalSubmissions();
  const existingIdx = local.findIndex((s) => s.id === subId);
  if (existingIdx >= 0) {
    local[existingIdx] = newSubmission;
  } else {
    local.unshift(newSubmission);
  }
  saveLocalSubmissions(local);

  return newSubmission;
}

/**
 * Calificar entrega docente (Nota libre, Justificación, Rúbrica y Anotaciones in-situ)
 */
export async function gradeSubmissionByTeacher(
  submissionId: string,
  payload: {
    finalGrade: number;
    teacherJustification: string;
    rubricEvaluations: RubricEvalItem[];
    inlineAnnotations: InlineAnnotationItem[];
  }
): Promise<boolean> {
  const now = new Date().toISOString();

  // Intentar en Cloudflare Worker (D1)
  try {
    const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Worker D1 no disponible para calificar, aplicando en local:', err);
  }

  // Respaldo local
  const local = getLocalSubmissions();
  const sub = local.find((s) => s.id === submissionId);
  if (sub) {
    sub.finalGrade = payload.finalGrade;
    sub.teacherJustification = payload.teacherJustification;
    sub.rubricEvaluations = payload.rubricEvaluations;
    sub.inlineAnnotations = payload.inlineAnnotations;
    sub.status = 'graded';
    sub.gradedAt = now;
    saveLocalSubmissions(local);
  }

  return true;
}

/**
 * Solicitar Revisión con IA (Cloudflare Workers AI: Llama 3 / DeepSeek)
 */
export async function requestAiReviewFromWorker(submissionId: string): Promise<AiReviewResult> {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/ai-review`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Error al contactar el Worker de IA');
    throw new Error(`Cloudflare Workers AI no respondió correctamente: ${errorText}`);
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Respuesta inválida del servicio de IA');
  }

  return json.data as AiReviewResult;
}
