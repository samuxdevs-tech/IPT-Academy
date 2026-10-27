import { Course, Module, Lesson, QuizQuestion, InVideoCheckpoint, Resource } from '@/types';
import { generateCourseLicenseToken } from '@/lib/licenseUtils';

/**
 * Limpia recursivamente un objeto para Firebase Realtime Database.
 * Elimina valores `undefined` que causan errores fatales en `set(ref(db, ...))`
 * y convierte arrays u objetos anidados a estructuras serializables.
 */
export function cleanForFirebase<T = any>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirebase(item)) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      cleaned[key] = cleanForFirebase(val);
    }
  }
  return cleaned as any;
}

/**
 * Normaliza y repara cualquier objeto JSON de curso (incluso si fue exportado desde RTDB
 * con índices de objeto en vez de arrays, o con campos faltantes) para que cumpla
 * estrictamente con la interfaz `Course` y nunca rompa llamadas a `.map()` o `.reduce()`.
 */
export function normalizeCourse(raw: any): Course {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El objeto de curso proporcionado es nulo o inválido.');
  }

  // Si viene encapsulado en { course: {...} } o { courses: { [slug]: {...} } } o array
  let source = raw;
  if (Array.isArray(source)) {
    source = source[0] || {};
  } else if (source.course && typeof source.course === 'object') {
    source = source.course;
  } else if (source.courses && typeof source.courses === 'object') {
    const keys = Object.keys(source.courses);
    source = keys.length > 0 ? source.courses[keys[0]] : {};
  } else if (source.data && typeof source.data === 'object' && source.data.slug) {
    source = source.data;
  }

  const slug = String(source.slug || source.id || `datagan-course-${Date.now()}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

  const title = String(source.title || 'Curso de Gestión Ganadera DataGan 360').trim();
  const subtitle = String(source.subtitle || 'Programa Oficial de Certificación en Ganadería de Precisión').trim();
  const description = String(source.description || '').trim();
  const thumbnail = String(
    source.thumbnail ||
    'https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2'
  );

  const category = String(source.category || 'Gestión Ganadera').trim();
  const level = String(source.level || 'Intermedio').trim();
  const rating = typeof source.rating === 'number' ? source.rating : 4.9;
  const ratingsCount = typeof source.ratingsCount === 'number' ? source.ratingsCount : 128;
  const visibility: 'public' | 'draft' = source.visibility === 'draft' || source.published === false ? 'draft' : 'public';
  const accessType: 'free' | 'paid' = source.accessType === 'paid' ? 'paid' : 'free';
  const price = typeof source.price === 'number' ? Math.max(0, source.price) : (source.price ? Number(source.price) || 0 : 0);
  const licenseToken = String(source.licenseToken || generateCourseLicenseToken(slug)).trim();
  const published = visibility === 'public';
  const approxHours = String(source.approxHours || '24 horas').trim();
  const progressionMode = source.progressionMode || 'lesson_strict';
  const phase2Visible = source.phase2Visible !== false;
  const phase3Visible = source.phase3Visible !== false;
  const phase3Mode = source.phase3Mode === 'in_course' ? 'in_course' : 'global';

  // Instructor
  const instructor = {
    name: String(source.instructor?.name || 'Equipo Técnico TecnoGan / DataGan 360').trim(),
    role: String(source.instructor?.role || 'Especialistas en Zootecnia y Datos Ganaderos').trim(),
    avatar: String(source.instructor?.avatar || '/images/logo.webp').trim()
  };

  // What you will learn
  let whatYouWillLearn: string[] = [];
  if (Array.isArray(source.whatYouWillLearn)) {
    whatYouWillLearn = source.whatYouWillLearn.map((item: any) => String(item).trim()).filter(Boolean);
  }

  // Normalizar módulos (convierte objetos de RTDB { "0": {...}, "1": {...} } a Array real)
  let rawModules = source.modules;
  if (rawModules && !Array.isArray(rawModules) && typeof rawModules === 'object') {
    rawModules = Object.keys(rawModules)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => rawModules[k]);
  } else if (!Array.isArray(rawModules)) {
    rawModules = [];
  }

  const modules: Module[] = (rawModules as any[]).map((m: any, mIdx: number) => {
    const modOrder = typeof m?.order === 'number' ? m.order : mIdx + 1;
    const modId = String(m?.id || `module-${modOrder}`);
    const modTitle = String(m?.title || `Módulo ${modOrder}`).trim();
    const modDescription = String(m?.description || '').trim();

    // Normalizar lecciones del módulo
    let rawLessons = m?.lessons;
    if (rawLessons && !Array.isArray(rawLessons) && typeof rawLessons === 'object') {
      rawLessons = Object.keys(rawLessons)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => rawLessons[k]);
    } else if (!Array.isArray(rawLessons)) {
      rawLessons = [];
    }

    const lessons: Lesson[] = (rawLessons as any[]).map((l: any, lIdx: number) => {
      const lesOrder = typeof l?.order === 'number' ? l.order : lIdx + 1;
      const lesId = String(l?.id || `mod-${modOrder}-les-${lesOrder}`);
      const lesTitle = String(l?.title || `Lección ${modOrder}.${lesOrder}`).trim();
      const lesDescription = String(l?.description || '').trim();
      const videoUrl = String(l?.videoUrl || '').trim();
      const isDirectVideo =
        l?.videoType === 'local' ||
        videoUrl.includes('.mp4') ||
        videoUrl.includes('.webm') ||
        videoUrl.includes('r2.dev') ||
        videoUrl.includes('firebasestorage') ||
        videoUrl.startsWith('blob:') ||
        (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be') && videoUrl.startsWith('http'));
      const videoType: 'youtube' | 'local' = isDirectVideo ? 'local' : 'youtube';
      const duration = String(l?.duration || '12:00').trim();
      const durationSeconds = typeof l?.durationSeconds === 'number' ? l?.durationSeconds : 720;

      // Métricas asociadas
      const metrics: string[] = Array.isArray(l?.metrics)
        ? l.metrics.map((met: any) => String(met).trim()).filter(Boolean)
        : [];

      // Recursos descargables
      let rawResources = l?.resources;
      if (rawResources && !Array.isArray(rawResources) && typeof rawResources === 'object') {
        rawResources = Object.keys(rawResources).map((k) => rawResources[k]);
      }
      const resources: Resource[] = Array.isArray(rawResources)
        ? (rawResources as any[]).map((r: any, rIdx: number) => ({
            id: String(r?.id || `res-${lesId}-${rIdx + 1}`),
            title: String(r?.title || `Recurso ${rIdx + 1}`).trim(),
            url: String(r?.url || '').trim(),
            type: (r?.type || 'document') as any,
            description: String(r?.description || '').trim(),
            fileSize: String(r?.fileSize || '1.2 MB').trim(),
            extension: String(r?.extension || 'pdf').trim(),
            popQuizQuestions: Array.isArray(r?.popQuizQuestions) ? r.popQuizQuestions : []
          }))
        : [];

      // Checkpoint Quiz de fin de clase
      let rawQuiz = l?.checkpointQuiz;
      if (rawQuiz && !Array.isArray(rawQuiz) && typeof rawQuiz === 'object') {
        rawQuiz = Object.keys(rawQuiz).map((k) => rawQuiz[k]);
      }
      const checkpointQuiz: QuizQuestion[] = Array.isArray(rawQuiz)
        ? (rawQuiz as any[]).map((q: any, qIdx: number) => ({
            id: String(q?.id || `quiz-${lesId}-${qIdx + 1}`),
            prompt: String(q?.prompt || '').trim(),
            options: Array.isArray(q?.options) ? q.options.map((opt: any) => String(opt).trim()) : [],
            correctIndex: typeof q?.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: String(q?.explanation || '').trim()
          }))
        : [];

      // In-Video Checkpoints interactivos
      let rawInVideo = l?.inVideoCheckpoints;
      if (rawInVideo && !Array.isArray(rawInVideo) && typeof rawInVideo === 'object') {
        rawInVideo = Object.keys(rawInVideo).map((k) => rawInVideo[k]);
      }
      const inVideoCheckpoints: InVideoCheckpoint[] = Array.isArray(rawInVideo)
        ? (rawInVideo as any[]).map((iv: any, ivIdx: number) => ({
            id: String(iv?.id || `iv-${lesId}-${ivIdx + 1}`),
            timestampSeconds: typeof iv?.timestampSeconds === 'number' ? iv.timestampSeconds : 180,
            prompt: String(iv?.prompt || '').trim(),
            options: Array.isArray(iv?.options) ? iv.options.map((opt: any) => String(opt).trim()) : [],
            correctIndex: typeof iv?.correctIndex === 'number' ? iv.correctIndex : 0,
            explanation: String(iv?.explanation || '').trim()
          }))
        : [];

      return {
        id: lesId,
        title: lesTitle,
        description: lesDescription,
        order: lesOrder,
        videoType,
        videoUrl,
        duration,
        durationSeconds,
        metrics,
        resources,
        checkpointQuiz,
        inVideoCheckpoints
      };
    });

    return {
      id: modId,
      title: modTitle,
      description: modDescription,
      order: modOrder,
      lessons
    };
  });

  return {
    slug,
    title,
    subtitle,
    description,
    thumbnail,
    instructor,
    category,
    level,
    rating,
    ratingsCount,
    published,
    visibility,
    accessType,
    price,
    licenseToken,
    approxHours,
    whatYouWillLearn,
    progressionMode,
    phase2Visible,
    phase3Visible,
    phase3Mode,
    modules
  };
}

/**
 * Valida la consistencia estructural del curso antes de persistirlo.
 */
export function validateCourseStructure(course: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!course) {
    return { valid: false, errors: ['El archivo no contiene un JSON válido.'] };
  }

  if (!course.slug && !course.id) {
    errors.push('Falta el identificador único ("slug" o "id") del curso.');
  }

  if (!course.title) {
    errors.push('Falta el título principal del curso ("title").');
  }

  const rawModules = course.modules;
  const isModulesValid = Array.isArray(rawModules) || (rawModules && typeof rawModules === 'object');
  if (!isModulesValid) {
    errors.push('El curso debe contener una lista o colección de módulos ("modules").');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descarga en el navegador el curso seleccionado en formato JSON formateado.
 */
export function exportCourseAsJson(course: Course) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeCourse(course);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(normalized, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${normalized.slug || 'datagan-course'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
