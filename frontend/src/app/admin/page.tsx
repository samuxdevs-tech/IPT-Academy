'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Check,
  Video,
  Layers,
  Search,
  ExternalLink,
  Clock,
  Sparkles,
  BookOpen,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Film,
  Target,
  Settings,
  Award,
  FileText,
  X,
  GripVertical,
  SlidersHorizontal,
  ClipboardCheck,
  Play,
  HelpCircle,
  AlertCircle,
  Download,
  Lock
} from 'lucide-react';
import {
  Course,
  Lesson,
  Module,
  Metric,
  QuizQuestion,
  InVideoCheckpoint,
  Resource,
  ResourceType,
  ProgressionMode
} from '@/types';
import { ref, get, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  normalizeCourse,
  cleanForFirebase,
  validateCourseStructure,
  exportCourseAsJson
} from '@/lib/courseUtils';
import { generateCourseLicenseToken } from '@/lib/licenseUtils';

type StudioStep = 'catalog' | 'curriculum' | 'lesson' | 'assessments';
type AssessmentSubTab = 'quiz' | 'invideo' | 'resources' | 'metrics';

function extractYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

function AdminStudioWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sincronizar paso activo con ?step= en la URL
  const stepParam = searchParams.get('step') as StudioStep | null;
  const activeStep: StudioStep =
    stepParam && ['catalog', 'curriculum', 'lesson', 'assessments'].includes(stepParam)
      ? stepParam
      : 'catalog';

  const setActiveStep = (nextStep: StudioStep) => {
    router.push(`/admin?step=${nextStep}`, { scroll: false });
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [metricsList, setMetricsList] = useState<Metric[]>([]);

  // Menú y Modal de Cursos
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [draggedModIndex, setDraggedModIndex] = useState<number | null>(null);

  // Sub-pestaña en el Paso 4 (Quizzes, In-Video, Recursos, Métricas)
  const [assessmentTab, setAssessmentTab] = useState<AssessmentSubTab>('quiz');

  // Formulario de Nuevo Curso
  const [newCourseForm, setNewCourseForm] = useState({
    slug: '',
    title: '',
    subtitle: '',
    description: '',
    category: 'Gestión Ganadera',
    level: 'Intermedio',
    thumbnail: 'https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2',
    instructorName: 'Equipo Técnico TecnoGan',
    instructorRole: 'Especialista en Zootecnia y Datos Ganaderos',
    instructorAvatar: '/images/logo.webp',
    approxHours: '20 horas',
    progressionMode: 'lesson_strict' as ProgressionMode,
    phase2Visible: true,
    phase3Visible: true,
    phase3Mode: 'global' as 'global' | 'in_course',
    visibility: 'public' as 'public' | 'draft',
    accessType: 'free' as 'free' | 'paid',
    price: 0
  });

  // Índices de Módulo y Lección Seleccionados
  const [selectedModIdx, setSelectedModIdx] = useState<number>(0);
  const [selectedLesIdx, setSelectedLesIdx] = useState<number>(0);

  // Estados de persistencia
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Uploads a Cloudflare R2
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputBulkRef = useRef<HTMLInputElement>(null);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [targetResourceIdxForUpload, setTargetResourceIdxForUpload] = useState<number | null>(null);

  // Buscador de métricas
  const [metricSearch, setMetricSearch] = useState('');

  // Cargar cursos desde Firebase
  const loadCourses = async () => {
    try {
      const snap = await get(ref(db, 'courses'));
      if (snap.exists()) {
        const data = snap.val();
        const coursesArray = Object.keys(data).map((key) =>
          normalizeCourse({
            ...data[key],
            slug: data[key].slug || key
          })
        );
        setCourses(coursesArray);
        if (coursesArray.length > 0 && !selectedCourse) {
          setSelectedCourse(coursesArray[0]);
        }
      }
    } catch (e) {
      console.error('Error cargando cursos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();

    get(ref(db, 'metrics'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setMetricsList(Object.keys(data).map((key) => data[key]));
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSaveCourse = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const normalized = normalizeCourse(selectedCourse);
      const cleanData = cleanForFirebase(normalized);
      await set(ref(db, `courses/${normalized.slug}`), cleanData);
      setSaveSuccess(true);
      setSelectedCourse(normalized);
      setCourses((prev) =>
        prev.map((c) => (c.slug === normalized.slug ? normalized : c))
      );
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error guardando curso:', err);
      alert(`Error guardando el curso en Firebase: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Subir archivo a Cloudflare R2
  const uploadFileToR2 = async (file: File, folder: string): Promise<string> => {
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    const filename = `${folder}/${Date.now()}_${cleanName}`;
    const workerUrl = `https://sweet-heart-d578.samuxdevs.workers.dev/${filename}`;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText(`Subiendo ${file.name} a Cloudflare R2...`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', workerUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          let publicUrl = `https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/${filename}`;
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.url) publicUrl = data.url;
          } catch (e) {}
          resolve(publicUrl);
        } else {
          reject(new Error(`Status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        reject(new Error('Network error'));
      };

      xhr.send(file);
    });
  };

  // Crear Nuevo Curso
  const handleCreateNewCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newCourseForm.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    if (!cleanSlug) {
      alert('El slug del curso es obligatorio (ej. datagan-nutricion).');
      return;
    }

    const isDraft = newCourseForm.visibility === 'draft';

    const newCourseObj: Course = {
      slug: cleanSlug,
      title: newCourseForm.title.trim() || 'Nuevo Curso Especializado',
      subtitle: newCourseForm.subtitle.trim() || 'Formación Técnica Avanzada',
      description:
        newCourseForm.description.trim() || 'Descripción del nuevo curso zootécnico.',
      thumbnail: newCourseForm.thumbnail.trim(),
      category: newCourseForm.category,
      level: newCourseForm.level,
      instructor: {
        name: newCourseForm.instructorName.trim(),
        role: newCourseForm.instructorRole.trim(),
        avatar: newCourseForm.instructorAvatar.trim()
      },
      rating: 5.0,
      ratingsCount: 1,
      published: !isDraft,
      visibility: isDraft ? 'draft' : 'public',
      accessType: newCourseForm.accessType || 'free',
      price: Number(newCourseForm.price) || 0,
      licenseToken: generateCourseLicenseToken(cleanSlug),
      approxHours: newCourseForm.approxHours,
      whatYouWillLearn: [
        'Diagnóstico y análisis zootécnico de precisión.',
        'Manejo de registros operativos y sanitarios.',
        'Interpretación de curvas y proyecciones de campo.'
      ],
      progressionMode: newCourseForm.progressionMode,
      phase2Visible: newCourseForm.phase2Visible,
      phase3Visible: newCourseForm.phase3Visible,
      phase3Mode: newCourseForm.phase3Mode,
      modules: [
        {
          id: `mod-${Date.now()}`,
          title: 'Módulo 1: Fundamentos y Parámetros Iniciales',
          description: 'Introducción y conceptos clave del curso.',
          order: 1,
          lessons: [
            {
              id: `les-${Date.now()}`,
              title: '1.1 Lección Introductoria',
              description: 'Panorama general de la materia.',
              order: 1,
              videoType: 'youtube',
              videoUrl: '',
              duration: '15 min',
              metrics: [],
              checkpointQuiz: [],
              resources: []
            }
          ]
        }
      ]
    };

    try {
      setIsSaving(true);
      const normalized = normalizeCourse(newCourseObj);
      const cleanPayload = cleanForFirebase(normalized);
      await set(ref(db, `courses/${cleanSlug}`), cleanPayload);
      setCourses((prev) => [...prev.filter((c) => c.slug !== cleanSlug), normalized]);
      setSelectedCourse(normalized);
      setSelectedModIdx(0);
      setSelectedLesIdx(0);
      setIsCreateCourseModalOpen(false);
      alert(`¡Curso "${normalized.title}" creado con éxito en modo ${isDraft ? 'Borrador' : 'Público'}!`);
    } catch (err) {
      console.error(err);
      alert('Error creando el curso en Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar Curso
  const handleDeleteCurrentCourse = async () => {
    if (!selectedCourse) return;
    const confirmName = prompt(
      `¿Estás seguro de eliminar permanentemente el curso "${selectedCourse.title}"?\n\nPara confirmar, escribe el slug exacto: "${selectedCourse.slug}"`
    );
    if (confirmName !== selectedCourse.slug) {
      if (confirmName !== null) alert('El slug no coincide. Operación cancelada.');
      return;
    }

    try {
      setIsSaving(true);
      await remove(ref(db, `courses/${selectedCourse.slug}`));
      const remaining = courses.filter((c) => c.slug !== selectedCourse.slug);
      setCourses(remaining);
      setSelectedCourse(remaining.length > 0 ? remaining[0] : null);
      setSelectedModIdx(0);
      setSelectedLesIdx(0);
      alert('Curso eliminado de la base de datos.');
    } catch (e) {
      console.error(e);
      alert('Error eliminando el curso.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportStarter = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/datagan_course_complete.json');
      if (!res.ok) throw new Error('No se encontro la plantilla de DataGan');
      const parsed = await res.json();
      const normalized = normalizeCourse(parsed.course || parsed);
      const cleanPayload = cleanForFirebase(normalized);
      await set(ref(db, `courses/${normalized.slug}`), cleanPayload);
      setCourses((prev) => [...prev.filter((c) => c.slug !== normalized.slug), normalized]);
      setSelectedCourse(normalized);
      setSelectedModIdx(0);
      setSelectedLesIdx(0);
      alert(`¡Curso de DataGan "${normalized.title}" importado con éxito!`);
    } catch (e: any) {
      console.error(e);
      alert(`Error importando plantilla: ${e?.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          alert(`El archivo seleccionado no es un JSON válido:\n${jsonErr.message}`);
          return;
        }

        const validation = validateCourseStructure(parsed);
        if (!validation.valid) {
          alert(`Estructura de Curso inválida:\n\n- ${validation.errors.join('\n- ')}`);
          return;
        }

        const normalized = normalizeCourse(parsed);
        const cleanPayload = cleanForFirebase(normalized);

        setIsLoading(true);
        await set(ref(db, `courses/${normalized.slug}`), cleanPayload);
        setCourses((prev) => [...prev.filter((c) => c.slug !== normalized.slug), normalized]);
        setSelectedCourse(normalized);
        setSelectedModIdx(0);
        setSelectedLesIdx(0);
        alert(`¡Carga exitosa! Se importó el curso "${normalized.title}" con ${normalized.modules.length} módulos.`);
      } catch (err: any) {
        console.error('Error al importar JSON:', err);
        alert(`Error al procesar o guardar el JSON en Firebase:\n${err?.message || err}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    if (fileInputBulkRef.current) {
      fileInputBulkRef.current.value = '';
    }
  };

  const handleExportJson = () => {
    if (!selectedCourse) {
      alert('No hay ningún curso seleccionado para exportar.');
      return;
    }
    try {
      exportCourseAsJson(selectedCourse);
    } catch (e: any) {
      console.error(e);
      alert(`Error al exportar JSON: ${e?.message || e}`);
    }
  };

  const currentModule = selectedCourse?.modules?.[selectedModIdx] || selectedCourse?.modules?.[0];
  const currentLesson =
    currentModule?.lessons?.[selectedLesIdx] || currentModule?.lessons?.[0];

  const updateModuleField = (modIdx: number, field: keyof Module, value: any) => {
    if (!selectedCourse) return;
    const updatedModules = [...selectedCourse.modules];
    updatedModules[modIdx] = { ...updatedModules[modIdx], [field]: value };
    setSelectedCourse({ ...selectedCourse, modules: updatedModules });
  };

  const updateLesson = (field: keyof Lesson, value: any) => {
    if (!selectedCourse || !currentModule || !currentLesson) return;
    const updated = { ...selectedCourse };
    (updated.modules[selectedModIdx].lessons[selectedLesIdx] as any)[field] = value;
    setSelectedCourse(updated);
  };

  const updateCourseField = (field: keyof Course, value: any) => {
    setSelectedCourse((prev) => {
      if (!prev) return null as any;
      const updated = {
        ...prev,
        [field]: value
      };
      setCourses((prevList) =>
        prevList.map((c) => (c.slug === prev.slug ? updated : c))
      );
      return updated;
    });
  };

  const updateCourseFields = (fields: Partial<Course>) => {
    setSelectedCourse((prev) => {
      if (!prev) return null as any;
      const updated = {
        ...prev,
        ...fields
      };
      setCourses((prevList) =>
        prevList.map((c) => (c.slug === prev.slug ? updated : c))
      );
      return updated;
    });
  };

  // Cambiar visibilidad (Público / Borrador) con sincronización inmediata a Firebase RTDB
  const handleUpdateCourseVisibility = async (courseSlug: string, newVisibility: 'public' | 'draft') => {
    const isDraft = newVisibility === 'draft';
    const published = !isDraft;

    setSelectedCourse((prev) => {
      if (!prev || prev.slug !== courseSlug) return prev;
      return { ...prev, visibility: newVisibility, published };
    });

    setCourses((prevList) =>
      prevList.map((c) =>
        c.slug === courseSlug ? { ...c, visibility: newVisibility, published } : c
      )
    );

    try {
      await update(ref(db, `courses/${courseSlug}`), {
        visibility: newVisibility,
        published
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error al actualizar visibilidad en Firebase:', err);
      alert(`Error al guardar visibilidad en Firebase: ${err?.message || err}`);
    }
  };

  // Cambiar modalidad de acceso (Gratuito / De Pago) con sincronización inmediata
  const handleUpdateCourseAccessType = async (courseSlug: string, newAccessType: 'free' | 'paid', price?: number) => {
    setSelectedCourse((prev) => {
      if (!prev || prev.slug !== courseSlug) return prev;
      return {
        ...prev,
        accessType: newAccessType,
        price: price !== undefined ? price : prev.price
      };
    });

    setCourses((prevList) =>
      prevList.map((c) =>
        c.slug === courseSlug
          ? { ...c, accessType: newAccessType, price: price !== undefined ? price : c.price }
          : c
      )
    );

    try {
      const payload: Record<string, any> = { accessType: newAccessType };
      if (price !== undefined) payload.price = price;
      await update(ref(db, `courses/${courseSlug}`), payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error al actualizar modalidad de acceso en Firebase:', err);
    }
  };

  // Reordenar Módulos (Secciones)
  const moveModule = (modIdx: number, direction: 'up' | 'down') => {
    if (!selectedCourse) return;
    const targetIdx = direction === 'up' ? modIdx - 1 : modIdx + 1;
    if (targetIdx < 0 || targetIdx >= selectedCourse.modules.length) return;

    const updated = [...selectedCourse.modules];
    const [moved] = updated.splice(modIdx, 1);
    updated.splice(targetIdx, 0, moved);
    updated.forEach((m, i) => {
      m.order = i + 1;
    });

    setSelectedCourse({ ...selectedCourse, modules: updated });
    setSelectedModIdx(targetIdx);
  };

  const reorderModulesDrag = (fromIdx: number, toIdx: number) => {
    if (!selectedCourse || fromIdx === toIdx) return;
    const updated = [...selectedCourse.modules];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    updated.forEach((m, i) => {
      m.order = i + 1;
    });

    setSelectedCourse({ ...selectedCourse, modules: updated });
    setSelectedModIdx(toIdx);
  };

  // Reordenar Lecciones
  const moveLesson = (modIdx: number, lesIdx: number, direction: 'up' | 'down') => {
    if (!selectedCourse) return;
    const lessons = [...selectedCourse.modules[modIdx].lessons];
    const targetIdx = direction === 'up' ? lesIdx - 1 : lesIdx + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;

    const [moved] = lessons.splice(lesIdx, 1);
    lessons.splice(targetIdx, 0, moved);
    lessons.forEach((l, i) => {
      l.order = i + 1;
    });

    const updatedModules = [...selectedCourse.modules];
    updatedModules[modIdx].lessons = lessons;

    setSelectedCourse({ ...selectedCourse, modules: updatedModules });
    setSelectedLesIdx(targetIdx);
  };

  // Crear módulo / lección
  const addNewModule = () => {
    if (!selectedCourse) return;
    const newMod: Module = {
      id: `mod-${Date.now()}`,
      title: `Módulo ${selectedCourse.modules.length + 1}: Nueva Sección Temática`,
      description: 'Descripción breve de la sección temática...',
      order: selectedCourse.modules.length + 1,
      lessons: [
        {
          id: `les-${Date.now()}`,
          title: `${selectedCourse.modules.length + 1}.1 Lección Inicial`,
          description: 'Objetivo pedagógico de la sesión...',
          order: 1,
          videoType: 'youtube',
          videoUrl: '',
          duration: '15 min',
          metrics: [],
          checkpointQuiz: [],
          resources: []
        }
      ]
    };
    setSelectedCourse({
      ...selectedCourse,
      modules: [...selectedCourse.modules, newMod]
    });
    setSelectedModIdx(selectedCourse.modules.length);
    setSelectedLesIdx(0);
  };

  const addNewLessonToModule = (modIdx: number) => {
    if (!selectedCourse) return;
    const updated = { ...selectedCourse };
    const targetMod = updated.modules[modIdx];
    if (!targetMod.lessons) targetMod.lessons = [];
    const nextNum = targetMod.lessons.length + 1;
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: `${modIdx + 1}.${nextNum} Nueva Clase Técnica`,
      description: 'Objetivos de la sesión...',
      order: nextNum,
      videoType: 'youtube',
      videoUrl: '',
      duration: '15 min',
      metrics: [],
      checkpointQuiz: [],
      resources: []
    };
    targetMod.lessons.push(newLesson);
    setSelectedCourse(updated);
    setSelectedModIdx(modIdx);
    setSelectedLesIdx(targetMod.lessons.length - 1);
  };

  // Gestión de Recursos de la Lección
  const addLessonResource = (type: ResourceType) => {
    if (!currentLesson) return;
    const currentList = currentLesson.resources || [];
    const newRes: Resource = {
      id: `res-${Date.now()}`,
      title:
        type === 'popquiz'
          ? 'Pop Quiz de Comprobación Rápida'
          : type === 'document'
          ? 'Guía Zootécnica en Word / PDF'
          : 'Enlace a Recurso Complementario',
      type,
      url: '',
      description: 'Material de refuerzo para esta sesión.',
      popQuizQuestions:
        type === 'popquiz'
          ? [
              {
                id: `pq-${Date.now()}`,
                prompt: 'Pregunta de refuerzo sobre la lección...',
                options: ['Opción A', 'Opción B (Correcta)', 'Opción C', 'Opción D'],
                correctIndex: 1,
                explanation: 'Fundamento técnico de la respuesta correcta.'
              }
            ]
          : undefined
    };
    updateLesson('resources', [...currentList, newRes]);
  };

  const updateLessonResource = (rIdx: number, field: keyof Resource, val: any) => {
    if (!currentLesson?.resources) return;
    const updated = [...currentLesson.resources];
    updated[rIdx] = { ...updated[rIdx], [field]: val };
    updateLesson('resources', updated);
  };

  const removeLessonResource = (rIdx: number) => {
    if (!currentLesson?.resources) return;
    const updated = [...currentLesson.resources];
    updated.splice(rIdx, 1);
    updateLesson('resources', updated);
  };

  // Pop Quiz dentro de Recursos
  const addPopQuizQuestionToResource = (rIdx: number) => {
    if (!currentLesson?.resources) return;
    const res = currentLesson.resources[rIdx];
    const qList = res.popQuizQuestions || [];
    const newQ: QuizQuestion = {
      id: `pq-${Date.now()}`,
      prompt: 'Nueva pregunta de comprobación...',
      options: ['Opción 1', 'Opción 2 (Correcta)', 'Opción 3', 'Opción 4'],
      correctIndex: 1,
      explanation: 'Fundamento agronómico o zootécnico.'
    };
    updateLessonResource(rIdx, 'popQuizQuestions', [...qList, newQ]);
  };

  const updatePopQuizQuestionInResource = (
    rIdx: number,
    qIdx: number,
    field: keyof QuizQuestion,
    val: any
  ) => {
    if (!currentLesson?.resources) return;
    const res = currentLesson.resources[rIdx];
    if (!res.popQuizQuestions) return;
    const updatedQuestions = [...res.popQuizQuestions];
    (updatedQuestions[qIdx] as any)[field] = val;
    updateLessonResource(rIdx, 'popQuizQuestions', updatedQuestions);
  };

  const removePopQuizQuestionFromResource = (rIdx: number, qIdx: number) => {
    if (!currentLesson?.resources) return;
    const res = currentLesson.resources[rIdx];
    if (!res.popQuizQuestions) return;
    const updatedQuestions = [...res.popQuizQuestions];
    updatedQuestions.splice(qIdx, 1);
    updateLessonResource(rIdx, 'popQuizQuestions', updatedQuestions);
  };

  // Subir recurso tipo documento
  const handleUploadResourceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetResourceIdxForUpload === null) return;

    try {
      const publicUrl = await uploadFileToR2(file, 'resources');
      updateLessonResource(targetResourceIdxForUpload, 'url', publicUrl);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext) updateLessonResource(targetResourceIdxForUpload, 'extension', ext);
      alert(`Archivo "${file.name}" subido a R2 y vinculado al recurso con éxito.`);
    } catch (err) {
      console.error(err);
      alert('Error subiendo el archivo a Cloudflare R2.');
    } finally {
      if (resourceFileInputRef.current) resourceFileInputRef.current.value = '';
      setTargetResourceIdxForUpload(null);
    }
  };

  // Subir video
  const handleUploadVideoFile = async (file: File) => {
    try {
      const publicUrl = await uploadFileToR2(file, 'videos');
      if (selectedCourse && currentModule && currentLesson) {
        const updated = { ...selectedCourse };
        const les = updated.modules[selectedModIdx].lessons[selectedLesIdx];
        les.videoType = 'local';
        les.videoUrl = publicUrl;
        setSelectedCourse(updated);
        await set(ref(db, `courses/${updated.slug}`), updated);
        alert('Video subido a Cloudflare R2 y guardado en la lección.');
      }
    } catch (err) {
      console.error(err);
      alert('Error subiendo video.');
    }
  };

  // Subir portada del curso
  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadFileToR2(file, 'images');
      updateCourseField('thumbnail', `${publicUrl}?v=${Date.now()}`);
      alert('Portada subida a Cloudflare R2 y actualizada.');
    } catch (err) {
      console.error(err);
      alert('Error subiendo imagen de portada.');
    } finally {
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  // Habilidades ¿Qué aprendió?
  const addLearningOutcome = () => {
    if (!selectedCourse) return;
    const current = selectedCourse.whatYouWillLearn || [];
    setSelectedCourse({
      ...selectedCourse,
      whatYouWillLearn: [...current, 'Nueva competencia zootécnica o tecnológica...']
    });
  };

  const updateLearningOutcome = (index: number, value: string) => {
    if (!selectedCourse?.whatYouWillLearn) return;
    const updated = [...selectedCourse.whatYouWillLearn];
    updated[index] = value;
    setSelectedCourse({
      ...selectedCourse,
      whatYouWillLearn: updated
    });
  };

  const removeLearningOutcome = (index: number) => {
    if (!selectedCourse?.whatYouWillLearn) return;
    const updated = [...selectedCourse.whatYouWillLearn];
    updated.splice(index, 1);
    setSelectedCourse({
      ...selectedCourse,
      whatYouWillLearn: updated
    });
  };

  // Checkpoint Quiz (Evaluación Fin de Lección)
  const addQuizQuestion = () => {
    if (!currentLesson) return;
    const newQ: QuizQuestion = {
      id: `chk-${Date.now()}`,
      prompt: 'Escribe aquí la pregunta de comprobación zootécnica...',
      options: ['Opción A', 'Opción B (Correcta)', 'Opción C', 'Opción D'],
      correctIndex: 1,
      explanation: 'Explicación del fundamento agronómico o zootécnico...'
    };
    const currentQuiz = currentLesson.checkpointQuiz || [];
    updateLesson('checkpointQuiz', [...currentQuiz, newQ]);
  };

  const updateQuizQuestion = (qIdx: number, field: keyof QuizQuestion, val: any) => {
    if (!currentLesson?.checkpointQuiz) return;
    const updatedQuiz = [...currentLesson.checkpointQuiz];
    (updatedQuiz[qIdx] as any)[field] = val;
    updateLesson('checkpointQuiz', updatedQuiz);
  };

  const removeQuizQuestion = (qIdx: number) => {
    if (!currentLesson?.checkpointQuiz) return;
    const updatedQuiz = [...currentLesson.checkpointQuiz];
    updatedQuiz.splice(qIdx, 1);
    updateLesson('checkpointQuiz', updatedQuiz);
  };

  // In-Video Checkpoint
  const addInVideoCheckpoint = () => {
    if (!currentLesson) return;
    const newCp: InVideoCheckpoint = {
      id: `invideo-${Date.now()}`,
      timestampSeconds: 60,
      prompt: 'Pregunta durante el video (comprobación de atención)...',
      options: ['Opción A', 'Opción B (Correcta)', 'Opción C', 'Opción D'],
      correctIndex: 1,
      explanation: 'Explicación del concepto clave mostrado en este minuto...'
    };
    const currentList = currentLesson.inVideoCheckpoints || [];
    updateLesson('inVideoCheckpoints', [...currentList, newCp]);
  };

  const updateInVideoCheckpoint = (
    qIdx: number,
    field: keyof InVideoCheckpoint,
    val: any
  ) => {
    if (!currentLesson?.inVideoCheckpoints) return;
    const updated = [...currentLesson.inVideoCheckpoints];
    (updated[qIdx] as any)[field] = val;
    updateLesson('inVideoCheckpoints', updated);
  };

  const removeInVideoCheckpoint = (qIdx: number) => {
    if (!currentLesson?.inVideoCheckpoints) return;
    const updated = [...currentLesson.inVideoCheckpoints];
    updated.splice(qIdx, 1);
    updateLesson('inVideoCheckpoints', updated);
  };

  const filteredMetrics = metricsList.filter(
    (m) =>
      m.label.toLowerCase().includes(metricSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(metricSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#595c73]">
            Cargando Arquitectura Curricular en Studio...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-[#d1d2e0] p-8 text-center space-y-4">
          <h2 className="text-xl font-extrabold text-[#2a2b3f]">Ningún curso encontrado</h2>
          <p className="text-[#595c73] text-xs">
            Crea tu primer curso para comenzar a estructurar módulos, videos y evaluaciones.
          </p>
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateCourseModalOpen(true)}
              className="w-full py-3 bg-[#6d28d2] text-white text-xs font-bold rounded-xl hover:bg-[#5b21b6] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Curso</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputBulkRef.current?.click()}
              className="w-full py-2.5 bg-white border border-[#d1d2e0] text-[#2a2b3f] text-xs font-bold rounded-xl hover:bg-[#f6f7f9] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
            >
              <Upload className="w-4 h-4 text-[#595c73]" />
              <span>Importar Curso (.json)</span>
            </button>
            <button
              type="button"
              onClick={handleImportStarter}
              className="w-full py-2 bg-[#6d28d2]/10 hover:bg-[#6d28d2]/20 text-[#6d28d2] text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar Plantilla Oficial DataGan 360</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estadísticas rápidas del curso activo
  const totalModulesCount = selectedCourse.modules?.length || 0;
  const totalLessonsCount = (selectedCourse.modules || []).reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  );
  const lessonsWithVideoCount = (selectedCourse.modules || []).reduce(
    (acc, m) =>
      acc + (m.lessons || []).filter((l) => l.videoUrl && l.videoUrl.trim() !== '').length,
    0
  );
  const totalAssessmentsCount = (selectedCourse.modules || []).reduce(
    (acc, m) =>
      acc +
      (m.lessons || []).reduce(
        (sum, l) =>
          sum +
          (l.checkpointQuiz?.length || 0) +
          (l.inVideoCheckpoints?.length || 0) +
          (l.resources?.length || 0),
        0
      ),
    0
  );

  // Componente lateral compacto para cambiar de clase en Pasos 3 y 4
  const renderCompactLessonSwitcher = () => (
    <aside className="w-full lg:w-80 bg-white rounded-2xl border border-[#d1d2e0] shadow-2xs flex flex-col shrink-0 overflow-hidden max-h-[78vh]">
      <div className="p-3.5 bg-[#f8f9fc] border-b border-[#e2e4f0] flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
            Selector Rápido
          </span>
          <h3 className="text-xs font-extrabold text-[#2a2b3f]">Módulos y Clases</h3>
        </div>
        <button
          type="button"
          onClick={() => setActiveStep('curriculum')}
          className="text-[11px] font-bold text-[#6d28d2] hover:underline flex items-center gap-1"
        >
          <Layers className="w-3 h-3" />
          <span>Ver Árbol</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#eef0f6]">
        {selectedCourse.modules.map((mod, mIdx) => (
          <div key={mod.id || mIdx} className="bg-white">
            <div
              onClick={() => {
                setSelectedModIdx(mIdx);
                setSelectedLesIdx(0);
              }}
              className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                selectedModIdx === mIdx
                  ? 'bg-purple-50/80 text-[#6d28d2] font-bold'
                  : 'hover:bg-[#f8f9fc] text-[#2a2b3f] font-semibold'
              }`}
            >
              <span className="text-xs truncate">
                {mIdx + 1}. {mod.title}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#eef0f6] text-[#595c73] font-mono shrink-0">
                {mod.lessons?.length || 0}
              </span>
            </div>

            {selectedModIdx === mIdx && (
              <div className="bg-[#f8f9fc] divide-y divide-[#eef0f6] pl-2">
                {(mod.lessons || []).map((les, lIdx) => {
                  const isActive = selectedModIdx === mIdx && selectedLesIdx === lIdx;
                  const quizCount = les.checkpointQuiz?.length || 0;
                  const resCount = les.resources?.length || 0;
                  const hasVideo = Boolean(les.videoUrl && les.videoUrl.trim());
                  return (
                    <button
                      key={les.id || lIdx}
                      type="button"
                      onClick={() => {
                        setSelectedModIdx(mIdx);
                        setSelectedLesIdx(lIdx);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-all ${
                        isActive
                          ? 'bg-white text-[#6d28d2] font-bold border-l-3 border-[#6d28d2] shadow-2xs'
                          : 'text-[#595c73] hover:bg-white/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">
                          <span className="font-mono text-[10px] text-[#9194ac] mr-1.5">
                            {mIdx + 1}.{lIdx + 1}
                          </span>
                          {les.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              hasVideo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {hasVideo ? (les.videoType === 'local' ? 'R2 MP4' : 'YouTube') : 'Sin video'}
                          </span>
                          {quizCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-[#6d28d2] font-bold">
                              {quizCount} quiz
                            </span>
                          )}
                          {resCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-100 text-[#6d28d2] font-bold">
                              {resCount} rec
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => addNewLessonToModule(mIdx)}
                  className="w-full py-2 text-[11px] font-bold text-[#6d28d2] hover:bg-white flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir Lección Aquí</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* SUBHEADER CONTEXTUAL DEL CURSO ACTIVO + ACCIONES DE GUARDADO */}
      <div className="bg-white border-b border-[#e2e4f0] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Curso Activo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCourseMenuOpen(!isCourseMenuOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[#d1d2e0] bg-[#f8f9fc] hover:bg-white text-xs font-bold text-[#2a2b3f] transition-all shadow-2xs"
            >
              <Image
                src={selectedCourse.thumbnail || '/images/datagan-course-cover-v2.jpeg'}
                alt="Mini"
                width={24}
                height={24}
                className="w-6 h-6 rounded-md object-cover border border-[#d1d2e0]"
                unoptimized
              />
              <div className="text-left">
                <span className="block text-[9px] uppercase tracking-wider font-extrabold text-[#6d28d2]">
                  Curso Activo en Edición
                </span>
                <span className="max-w-[200px] sm:max-w-[280px] truncate block leading-tight">
                  {selectedCourse.title}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#595c73] shrink-0 ml-1" />
            </button>

            {isCourseMenuOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-84 bg-white rounded-2xl shadow-2xl border border-[#d1d2e0] p-3 space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#f6f7f9] px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#595c73]">
                    Cursos en Catálogo ({courses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCourseMenuOpen(false);
                      setIsCreateCourseModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#6d28d2] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Curso</span>
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {courses.map((c) => (
                    <div
                      key={c.slug}
                      onClick={() => {
                        setSelectedCourse(c);
                        setSelectedModIdx(0);
                        setSelectedLesIdx(0);
                        setIsCourseMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                        selectedCourse.slug === c.slug
                          ? 'bg-[#6d28d2]/10 border border-[#6d28d2]/30 text-[#6d28d2]'
                          : 'hover:bg-[#f6f7f9] text-[#2a2b3f]'
                      }`}
                    >
                      <Image
                        src={c.thumbnail || '/images/datagan-course-cover-v2.jpeg'}
                        alt={c.title}
                        width={40}
                        height={28}
                        className="w-10 h-7 rounded object-cover border border-[#d1d2e0] shrink-0"
                        unoptimized
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate leading-tight">{c.title}</p>
                          {(c.visibility === 'draft' || c.published === false) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold shrink-0">
                              Borrador
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#595c73] truncate">
                          {c.category || 'General'} • {c.modules?.length || 0} secciones
                        </p>
                      </div>
                      {selectedCourse.slug === c.slug && (
                        <CheckCircle2 className="w-4 h-4 text-[#6d28d2] shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Rápido de Estado (Borrador / Público) para el Curso Activo */}
          {selectedCourse && (
            <button
              type="button"
              onClick={() => {
                const isCurrentlyDraft = selectedCourse.visibility === 'draft' || selectedCourse.published === false;
                handleUpdateCourseVisibility(selectedCourse.slug, isCurrentlyDraft ? 'public' : 'draft');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 ${
                selectedCourse.visibility === 'draft' || selectedCourse.published === false
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-purple-50 hover:bg-purple-100 text-[#6d28d2] border border-[#d1d2e0]'
              }`}
              title="Haz clic para alternar entre Borrador y Público en tiempo real"
            >
              {selectedCourse.visibility === 'draft' || selectedCourse.published === false ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Borrador (Oculto a alumnos)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-[#6d28d2]" />
                  <span>Público (En catálogo)</span>
                </>
              )}
            </button>
          )}

          {/* Indicador de Lección Activa cuando está en Paso 3 o Paso 4 */}
          {(activeStep === 'lesson' || activeStep === 'assessments') && currentLesson && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f4f5f9] border border-[#e2e4f0] text-xs">
              <span className="font-bold text-[#595c73]">Clase seleccionada:</span>
              <span className="font-extrabold text-[#6d28d2] truncate max-w-[240px]">
                {selectedModIdx + 1}.{selectedLesIdx + 1} {currentLesson.title}
              </span>
            </div>
          )}
        </div>

        {/* Acciones Globales de Curso */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputBulkRef}
            onChange={handleBulkUpload}
          />
          <button
            type="button"
            onClick={() => fileInputBulkRef.current?.click()}
            className="px-3 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#6d28d2] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
            title="Importar curso completo desde archivo JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#6d28d2] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
            title="Descargar copia de respaldo del curso en JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar JSON</span>
          </button>

          <Link
            href={`/course?id=${selectedCourse.slug}`}
            target="_blank"
            className="px-3 py-2 rounded-xl border border-[#d1d2e0] text-[#595c73] hover:text-[#2a2b3f] text-xs font-bold flex items-center gap-1.5 transition-all bg-white"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previsualizar Aula</span>
          </Link>

          <button
            type="button"
            onClick={handleSaveCourse}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#6d28d2] text-white hover:bg-[#591fb0]'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>
              {isSaving ? 'Guardando...' : saveSuccess ? '¡Cambios Guardados!' : 'Guardar Curso'}
            </span>
          </button>
        </div>
      </div>

      {/* STEPPER HORIZONTAL DE 4 ETAPAS DEL EDITOR CURRICULAR */}
      <div className="bg-[#f8f9fc] border-b border-[#e2e4f0] px-6 py-2.5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            {
              step: 'catalog' as StudioStep,
              num: 'Paso 1',
              title: 'Catálogo y Configuración',
              desc: `${courses.length} cursos • Reglas y Fases`,
              icon: BookOpen
            },
            {
              step: 'curriculum' as StudioStep,
              num: 'Paso 2',
              title: 'Estructura de Módulos',
              desc: `${totalModulesCount} secciones • ${totalLessonsCount} clases`,
              icon: Layers
            },
            {
              step: 'lesson' as StudioStep,
              num: 'Paso 3',
              title: 'Editor de Lección y Video',
              desc: currentLesson ? currentLesson.title : 'Selecciona una clase',
              icon: Film
            },
            {
              step: 'assessments' as StudioStep,
              num: 'Paso 4',
              title: 'Quizzes, Recursos y Métricas',
              desc: currentLesson
                ? `${currentLesson.checkpointQuiz?.length || 0} quiz • ${
                    currentLesson.resources?.length || 0
                  } rec`
                : 'Evaluaciones de clase',
              icon: ClipboardCheck
            }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-white border-[#6d28d2] shadow-xs ring-2 ring-[#6d28d2]/10'
                    : 'bg-white/60 border-[#e2e4f0] hover:bg-white hover:border-[#d1d2e0]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-[#6d28d2] text-white'
                      : 'bg-[#eef0f6] text-[#595c73]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                      isActive ? 'text-[#6d28d2]' : 'text-[#9194ac]'
                    }`}
                  >
                    {item.num}
                  </span>
                  <p className="text-xs font-extrabold text-[#2a2b3f] truncate">{item.title}</p>
                  <p className="text-[10px] text-[#595c73] truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner de progreso de subida a Cloudflare R2 si está activo */}
      {isUploading && (
        <div className="bg-[#151726] text-white px-6 py-2.5 flex items-center justify-between text-xs border-b border-[#2d314d]">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold">{uploadStatusText}</span>
          </div>
          <span className="font-mono font-extrabold text-emerald-400">{uploadProgress}%</span>
        </div>
      )}

      {/* CONTENEDOR DE VISTAS POR PASO */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* =========================================================
            PASO 1: CATÁLOGO DE CURSOS Y CONFIGURACIÓN GLOBAL
           ========================================================= */}
        {activeStep === 'catalog' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Directorio Visual de Cursos */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#2a2b3f]">
                    Catálogo General de Cursos ({courses.length})
                  </h2>
                  <p className="text-xs text-[#595c73]">
                    Selecciona el curso que deseas administrar o crea un nuevo programa de formación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateCourseModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#2a2b3f] hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Crear Nuevo Curso</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const isSelected = course.slug === selectedCourse.slug;
                  const modCount = course.modules?.length || 0;
                  const lesCount = (course.modules || []).reduce(
                    (acc, m) => acc + (m.lessons?.length || 0),
                    0
                  );
                  return (
                    <div
                      key={course.slug}
                      onClick={() => {
                        setSelectedCourse(course);
                        setSelectedModIdx(0);
                        setSelectedLesIdx(0);
                      }}
                      className={`group rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col justify-between bg-white ${
                        isSelected
                          ? 'border-2 border-[#6d28d2] shadow-md ring-3 ring-[#6d28d2]/10'
                          : 'border-[#d1d2e0] hover:border-[#6d28d2]/60 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="relative h-36 bg-[#1e2135] overflow-hidden">
                          <Image
                            src={
                              course.thumbnail || '/images/datagan-course-cover-v2.jpeg'
                            }
                            alt={course.title}
                            width={320}
                            height={144}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[75%] z-10">
                            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                              {course.category || 'Zootecnia'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentDraft = course.visibility === 'draft' || course.published === false;
                                handleUpdateCourseVisibility(course.slug, currentDraft ? 'public' : 'draft');
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-2xs transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 ${
                                course.visibility === 'draft' || course.published === false
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white ring-1 ring-white/30'
                                  : 'bg-[#6d28d2] hover:bg-[#5b21b6] text-white ring-1 ring-white/30'
                              }`}
                              title={
                                course.visibility === 'draft' || course.published === false
                                  ? 'Curso en Borrador (Oculto a alumnos). Haz clic para publicar.'
                                  : 'Curso Público. Haz clic para cambiar a Borrador.'
                              }
                            >
                              {course.visibility === 'draft' || course.published === false ? (
                                <>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Borrador</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Público</span>
                                </>
                              )}
                            </button>
                            {course.accessType === 'paid' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold shadow-2xs">
                                ${course.price || 0} USD
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold shadow-2xs">
                                Gratis
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#6d28d2] text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              Activo
                            </span>
                          )}
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <h3 className="text-sm font-extrabold leading-snug line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="text-[11px] text-gray-200 truncate">
                              Slug: <span className="font-mono">{course.slug}</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <p className="text-xs text-[#595c73] line-clamp-2 min-h-[2rem]">
                            {course.description || course.subtitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#2a2b3f]">
                            <span className="px-2 py-0.5 rounded bg-[#f4f5f9] border border-[#e2e4f0]">
                              {modCount} secciones
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#f4f5f9] border border-[#e2e4f0]">
                              {lesCount} clases
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#f4f5f9] border border-[#e2e4f0]">
                              {course.approxHours || '20h'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-[#f8f9fc] border-t border-[#eef0f6] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentDraft = course.visibility === 'draft' || course.published === false;
                            handleUpdateCourseVisibility(course.slug, currentDraft ? 'public' : 'draft');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                            course.visibility === 'draft' || course.published === false
                              ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                              : 'bg-purple-50 border-[#d1d2e0] text-[#6d28d2] hover:bg-purple-100'
                          }`}
                          title="Alternar entre Público y Borrador"
                        >
                          {course.visibility === 'draft' || course.published === false ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Cambiar a Público</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-[#6d28d2]" />
                              <span>Cambiar a Borrador</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourse(course);
                            setSelectedModIdx(0);
                            setSelectedLesIdx(0);
                            setActiveStep('curriculum');
                          }}
                          className="text-xs font-extrabold text-[#6d28d2] hover:underline flex items-center gap-1"
                        >
                          <span>Editar Módulos</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Panel de Configuración Global del Curso Seleccionado */}
            <section className="bg-white rounded-2xl border border-[#d1d2e0] shadow-xs p-6 sm:p-8 space-y-8">
              <div className="border-b border-[#e9eaf2] pb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#6d28d2] uppercase tracking-wider">
                    <Settings className="w-4 h-4" />
                    <span>Ficha Técnica y Reglas del Curso Seleccionado</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#2a2b3f] mt-1">
                    {selectedCourse.title}
                  </h3>
                  <p className="text-xs text-[#595c73]">
                    Ajusta la portada oficial, metadatos académicos, reglas de desbloqueo, fases interactivas y competencias del certificado.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteCurrentCourse}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Curso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('curriculum')}
                    className="px-4 py-2 rounded-xl bg-[#2a2b3f] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Ir al Paso 2: Módulos</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Columna Izquierda: Datos Principales y Portada */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                        Título del Curso
                      </label>
                      <input
                        type="text"
                        value={selectedCourse.title}
                        onChange={(e) => updateCourseField('title', e.target.value)}
                        className="w-full text-xs font-bold text-[#2a2b3f] px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                        Slug URL (Identificador Único)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedCourse.slug}
                        className="w-full text-xs bg-[#f6f7f9] text-[#595c73] font-mono px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#595c73] mb-1">
                      Subtítulo Comercial / Pedagógico
                    </label>
                    <input
                      type="text"
                      value={selectedCourse.subtitle || ''}
                      onChange={(e) => updateCourseField('subtitle', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#595c73] mb-1">
                      Descripción General del Programa
                    </label>
                    <textarea
                      rows={3}
                      value={selectedCourse.description || ''}
                      onChange={(e) => updateCourseField('description', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#595c73] mb-1">
                        Categoría
                      </label>
                      <input
                        type="text"
                        value={selectedCourse.category || ''}
                        onChange={(e) => updateCourseField('category', e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#595c73] mb-1">
                        Nivel Académico
                      </label>
                      <select
                        value={selectedCourse.level || 'Intermedio'}
                        onChange={(e) => updateCourseField('level', e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl bg-white"
                      >
                        <option value="Principiante">Principiante</option>
                        <option value="Intermedio">Intermedio</option>
                        <option value="Avanzado">Avanzado</option>
                        <option value="Especialización">Especialización</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#595c73] mb-1">
                        Horas Acreditadas
                      </label>
                      <input
                        type="text"
                        value={selectedCourse.approxHours || ''}
                        onChange={(e) => updateCourseField('approxHours', e.target.value)}
                        placeholder="Ej: 34 horas (aprox)"
                        className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Portada del Curso con Previsualización y Carga a R2 */}
                  <div className="p-4 rounded-2xl bg-[#f8f9fc] border border-[#d1d2e0] space-y-3">
                    <label className="block text-xs font-bold text-[#2a2b3f]">
                      Portada Oficial del Curso (Cloudflare R2)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <Image
                        src={
                          selectedCourse.thumbnail || '/images/datagan-course-cover-v2.jpeg'
                        }
                        alt="Portada"
                        width={176}
                        height={104}
                        className="w-44 h-26 object-cover rounded-xl border border-[#d1d2e0] bg-white shadow-2xs shrink-0"
                        unoptimized
                      />
                      <div className="flex-1 w-full space-y-2">
                        <input
                          type="text"
                          value={selectedCourse.thumbnail || ''}
                          onChange={(e) => updateCourseField('thumbnail', e.target.value)}
                          placeholder="https://pub-..."
                          className="w-full text-xs px-3 py-2 bg-white border border-[#d1d2e0] rounded-lg font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={thumbnailInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleUploadThumbnail}
                          />
                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="px-3.5 py-2 bg-[#6d28d2] text-white text-xs font-bold rounded-lg hover:bg-[#5b21b6] transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Nueva Portada a R2</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Reglas de Avance, Fases 2/3 y Competencias */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Regla de Avance Secuencial */}
                  <div className="p-5 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#6d28d2]" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2a2b3f]">
                        Regla de Avance Secuencial
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'lesson_strict',
                          title: 'Estricto por Lección',
                          desc: 'Cada clase requiere aprobar la anterior para desbloquearse.'
                        },
                        {
                          id: 'module_strict',
                          title: 'Estricto por Módulo',
                          desc: 'Requiere completar la sección previa para abrir la siguiente.'
                        },
                        {
                          id: 'free',
                          title: 'Navegación Libre',
                          desc: 'El estudiante puede consultar cualquier clase sin bloqueos.'
                        }
                      ].map((m) => {
                        const isSelected =
                          (selectedCourse.progressionMode || 'lesson_strict') === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => updateCourseField('progressionMode', m.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#6d28d2] bg-purple-50/70'
                                : 'border-[#d1d2e0] bg-white hover:border-[#6d28d2]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? 'text-[#6d28d2]' : 'text-[#2a2b3f]'
                                }`}
                              >
                                {m.title}
                              </span>
                              <input
                                type="radio"
                                name="progressionMode"
                                checked={isSelected}
                                onChange={() => updateCourseField('progressionMode', m.id)}
                                className="accent-[#6d28d2]"
                              />
                            </div>
                            <p className="text-[11px] text-[#595c73] mt-0.5">{m.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Control de Fase 2 y Fase 3 */}
                  <div className="p-5 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#6d28d2]" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2a2b3f]">
                        Laboratorios Prácticos (Fase 2 y Fase 3)
                      </h4>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#d1d2e0] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#2a2b3f]">
                          Fase 2: Escenarios Visuales
                        </p>
                        <p className="text-[11px] text-[#595c73]">
                          Simulador de decisiones operativas
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCourse.phase2Visible !== false}
                          onChange={(e) =>
                            updateCourseField('phase2Visible', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#6d28d2]" />
                      </label>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#d1d2e0] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#2a2b3f]">
                            Fase 3: Sandbox DataGan 360
                          </p>
                          <p className="text-[11px] text-[#595c73]">
                            Finca ficticia con misiones evaluadas
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCourse.phase3Visible !== false}
                            onChange={(e) =>
                              updateCourseField('phase3Visible', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5.5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#6d28d2]" />
                        </label>
                      </div>

                      {selectedCourse.phase3Visible !== false && (
                        <div className="pt-2.5 border-t border-[#eef0f6] flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#595c73]">
                            Ubicación de Fase 3:
                          </span>
                          <select
                            value={selectedCourse.phase3Mode || 'global'}
                            onChange={(e) =>
                              updateCourseField('phase3Mode', e.target.value)
                            }
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#d1d2e0] bg-[#f8f9fc] font-bold text-[#2a2b3f]"
                          >
                            <option value="global">Global (En Portada y Aula)</option>
                            <option value="in_course">In-Course (Sólo dentro del Aula)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visibilidad y Condiciones de Acceso */}
                  <div className="p-5 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#6d28d2]" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2a2b3f]">
                        Visibilidad y Modelo de Acceso
                      </h4>
                    </div>

                    {/* Selector de Visibilidad */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-[#2a2b3f]">
                          Visibilidad en Catálogo
                        </label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          (selectedCourse.visibility === 'draft' || selectedCourse.published === false)
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-purple-100 text-[#6d28d2] border border-[#d1d2e0]'
                        }`}>
                          {(selectedCourse.visibility === 'draft' || selectedCourse.published === false) ? 'Modo Borrador Activo' : 'Modo Público Activo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateCourseVisibility(selectedCourse.slug, 'public')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            (selectedCourse.visibility !== 'draft' && selectedCourse.published !== false)
                              ? 'border-[#6d28d2] bg-purple-50/70 text-[#6d28d2] font-bold shadow-2xs ring-2 ring-[#6d28d2]/20'
                              : 'border-[#d1d2e0] bg-white text-[#595c73] hover:border-[#6d28d2]/40'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-[#6d28d2]" />
                            <span className="text-xs">Público</span>
                          </div>
                          <div className="text-[10px] text-[#595c73] font-normal mt-0.5">Visible a todos los alumnos</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCourseVisibility(selectedCourse.slug, 'draft')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            (selectedCourse.visibility === 'draft' || selectedCourse.published === false)
                              ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold shadow-2xs ring-2 ring-amber-500/20'
                              : 'border-[#d1d2e0] bg-white text-[#595c73] hover:border-amber-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs">Borrador</span>
                          </div>
                          <div className="text-[10px] text-[#595c73] font-normal mt-0.5">Exclusivo administradores</div>
                        </button>
                      </div>
                    </div>

                    {/* Modelo de Cobro */}
                    <div className="space-y-2 pt-2 border-t border-[#eef0f6]">
                      <label className="block text-[11px] font-bold text-[#2a2b3f]">
                        Modalidad de Matrícula
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateCourseAccessType(selectedCourse.slug, 'free')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            (selectedCourse.accessType || 'free') === 'free'
                              ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 font-bold shadow-2xs ring-2 ring-emerald-600/20'
                              : 'border-[#d1d2e0] bg-white text-[#595c73] hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="text-xs">Gratuito</div>
                          <div className="text-[10px] text-[#595c73] font-normal mt-0.5">Acceso inmediato</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCourseAccessType(selectedCourse.slug, 'paid')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedCourse.accessType === 'paid'
                              ? 'border-[#6d28d2] bg-purple-50/70 text-[#6d28d2] font-bold shadow-2xs ring-2 ring-[#6d28d2]/20'
                              : 'border-[#d1d2e0] bg-white text-[#595c73] hover:border-[#6d28d2]/40'
                          }`}
                        >
                          <div className="text-xs">De Pago</div>
                          <div className="text-[10px] text-[#595c73] font-normal mt-0.5">Requiere matrícula</div>
                        </button>
                      </div>

                      {selectedCourse.accessType === 'paid' && (
                        <div className="pt-2 animate-in fade-in duration-150">
                          <label className="block text-[11px] font-bold text-[#2a2b3f] mb-1">
                            Precio de Matrícula (USD)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#595c73]">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={selectedCourse.price ?? 49}
                              onChange={(e) => updateCourseField('price', Number(e.target.value))}
                              placeholder="49"
                              className="w-full text-xs font-bold text-[#2a2b3f] pl-7 pr-3 py-2 bg-white border border-[#d1d2e0] rounded-xl focus:outline-hidden focus:border-[#6d28d2]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Competencias Certificadas en el Diploma */}
              <div className="pt-6 border-t border-[#e9eaf2] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#2a2b3f] flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>Competencias Certificadas en el Diploma ({selectedCourse.whatYouWillLearn?.length || 0})</span>
                    </h4>
                    <p className="text-xs text-[#595c73]">
                      Habilidades verificables que aparecerán impresas en el certificado digital del graduado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLearningOutcome}
                    className="px-3.5 py-2 rounded-xl bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Competencia</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedCourse.whatYouWillLearn || []).map((outcome, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold flex items-center justify-center shrink-0 border border-emerald-200">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={outcome}
                        onChange={(e) => updateLearningOutcome(idx, e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                      />
                      <button
                        type="button"
                        onClick={() => removeLearningOutcome(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar competencia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================
            PASO 2: ESTRUCTURA DE MÓDULOS Y ÁRBOL DE LECCIONES
           ========================================================= */}
        {activeStep === 'curriculum' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Tarjetas de Resumen Estructural */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#d1d2e0] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#595c73]">
                  Secciones / Módulos
                </span>
                <p className="text-2xl font-extrabold text-[#2a2b3f] mt-1">
                  {totalModulesCount}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#d1d2e0] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#595c73]">
                  Total de Lecciones
                </span>
                <p className="text-2xl font-extrabold text-[#6d28d2] mt-1">
                  {totalLessonsCount}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#d1d2e0] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#595c73]">
                  Clases con Video
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {lessonsWithVideoCount} / {totalLessonsCount}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#d1d2e0] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#595c73]">
                  Quizzes y Recursos
                </span>
                <p className="text-2xl font-extrabold text-[#6d28d2] mt-1">
                  {totalAssessmentsCount}
                </p>
              </div>
            </div>

            {/* Cabecera del Constructor de Módulos */}
            <div className="bg-white rounded-2xl border border-[#d1d2e0] p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div>
                <h2 className="text-lg font-extrabold text-[#2a2b3f]">
                  Arquitectura de Módulos y Secuencia de Clases
                </h2>
                <p className="text-xs text-[#595c73]">
                  Arrastra los módulos o usa las flechas para reorganizar el temario. Haz clic en cualquier lección para abrir su Estudio de Video (Paso 3) o su Banco de Quizzes (Paso 4).
                </p>
              </div>
              <button
                type="button"
                onClick={addNewModule}
                className="px-4 py-2.5 bg-[#6d28d2] hover:bg-[#5b21b6] text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Nueva Sección (Módulo)</span>
              </button>
            </div>

            {/* Lista de Módulos Expandidos */}
            <div className="space-y-5">
              {selectedCourse.modules.map((mod, modIdx) => (
                <div
                  key={mod.id || modIdx}
                  draggable
                  onDragStart={() => setDraggedModIndex(modIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedModIndex !== null) {
                      reorderModulesDrag(draggedModIndex, modIdx);
                      setDraggedModIndex(null);
                    }
                  }}
                  className="bg-white rounded-2xl border border-[#d1d2e0] shadow-2xs overflow-hidden transition-all"
                >
                  {/* Barra Superior del Módulo: Edición de Título y Reordenamiento */}
                  <div className="bg-[#f8f9fc] border-b border-[#e2e4f0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 flex-1">
                      <span
                        className="cursor-grab text-[#9194ac] hover:text-[#2a2b3f] p-1.5 rounded-lg bg-white border border-[#e2e4f0]"
                        title="Arrastra para reordenar sección"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#6d28d2] text-white text-xs font-extrabold shrink-0">
                        Módulo {modIdx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) =>
                            updateModuleField(modIdx, 'title', e.target.value)
                          }
                          placeholder="Título del módulo..."
                          className="text-xs font-extrabold text-[#2a2b3f] bg-white px-3 py-2 rounded-xl border border-[#d1d2e0] focus:outline-none focus:border-[#6d28d2]"
                        />
                        <input
                          type="text"
                          value={mod.description || ''}
                          onChange={(e) =>
                            updateModuleField(modIdx, 'description', e.target.value)
                          }
                          placeholder="Objetivo breve del módulo..."
                          className="text-xs text-[#595c73] bg-white px-3 py-2 rounded-xl border border-[#d1d2e0] focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveModule(modIdx, 'up')}
                        disabled={modIdx === 0}
                        className="p-2 rounded-lg border border-[#d1d2e0] bg-white text-[#595c73] hover:text-[#6d28d2] disabled:opacity-30"
                        title="Subir módulo"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(modIdx, 'down')}
                        disabled={modIdx === selectedCourse.modules.length - 1}
                        className="p-2 rounded-lg border border-[#d1d2e0] bg-white text-[#595c73] hover:text-[#6d28d2] disabled:opacity-30"
                        title="Bajar módulo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addNewLessonToModule(modIdx)}
                        className="px-3 py-2 rounded-lg bg-[#6d28d2]/10 text-[#6d28d2] hover:bg-[#6d28d2] hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva Clase</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Eliminar la sección "${mod.title}" y todas sus lecciones?`
                            )
                          ) {
                            const updated = { ...selectedCourse };
                            updated.modules.splice(modIdx, 1);
                            setSelectedCourse(updated);
                            setSelectedModIdx(0);
                            setSelectedLesIdx(0);
                          }
                        }}
                        className="p-2 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                        title="Eliminar sección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tabla / Lista de Lecciones del Módulo */}
                  <div className="divide-y divide-[#eef0f6]">
                    {(mod.lessons || []).length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#595c73]">
                        Este módulo no tiene clases aún. Pulsa &ldquo;+ Nueva Clase&rdquo; para crear la primera.
                      </div>
                    ) : (
                      mod.lessons.map((les, lesIdx) => {
                        const hasVideo = Boolean(les.videoUrl && les.videoUrl.trim());
                        const quizLen = les.checkpointQuiz?.length || 0;
                        const inVideoLen = les.inVideoCheckpoints?.length || 0;
                        const resLen = les.resources?.length || 0;
                        const metLen = les.metrics?.length || 0;

                        return (
                          <div
                            key={les.id || lesIdx}
                            className="p-4 hover:bg-[#fafbff] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <span className="px-2.5 py-1 rounded-lg bg-[#f4f5f9] border border-[#e2e4f0] font-mono text-xs font-extrabold text-[#595c73] shrink-0">
                                {modIdx + 1}.{lesIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-[#2a2b3f] truncate">
                                  {les.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-[#595c73] font-medium">
                                    <Clock className="w-3 h-3" />
                                    {les.duration || '15 min'}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      hasVideo
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {hasVideo
                                      ? les.videoType === 'local'
                                        ? 'Video R2 MP4'
                                        : 'YouTube'
                                      : 'Sin Video Asignado'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#6d28d2] border border-purple-200 text-[10px] font-bold">
                                    {quizLen} preg. fin de clase
                                  </span>
                                  {inVideoLen > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                      {inVideoLen} checkpoints in-video
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#6d28d2] border border-teal-200 text-[10px] font-bold">
                                    {resLen} recursos
                                  </span>
                                  {metLen > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                      {metLen} métricas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Acciones Directas de la Lección */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModIdx(modIdx);
                                  setSelectedLesIdx(lesIdx);
                                  setActiveStep('lesson');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#6d28d2] hover:bg-[#5b21b6] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                <Film className="w-3.5 h-3.5" />
                                <span>Editar Video y Clase</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModIdx(modIdx);
                                  setSelectedLesIdx(lesIdx);
                                  setActiveStep('assessments');
                                }}
                                className="px-3 py-1.5 rounded-xl border border-[#6d28d2] text-[#6d28d2] hover:bg-[#6d28d2] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Quizzes y Recursos</span>
                              </button>

                              <div className="flex items-center gap-1 pl-1 border-l border-[#e2e4f0]">
                                <button
                                  type="button"
                                  onClick={() => moveLesson(modIdx, lesIdx, 'up')}
                                  disabled={lesIdx === 0}
                                  className="p-1.5 rounded-lg text-[#595c73] hover:bg-[#eef0f6] disabled:opacity-30"
                                  title="Subir clase"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLesson(modIdx, lesIdx, 'down')}
                                  disabled={lesIdx === mod.lessons.length - 1}
                                  className="p-1.5 rounded-lg text-[#595c73] hover:bg-[#eef0f6] disabled:opacity-30"
                                  title="Bajar clase"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Eliminar la lección "${les.title}"?`)) {
                                      const updated = { ...selectedCourse };
                                      updated.modules[modIdx].lessons.splice(lesIdx, 1);
                                      setSelectedCourse(updated);
                                      setSelectedLesIdx(0);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                                  title="Eliminar clase"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            PASO 3: EDITOR DE LECCIÓN Y ESTUDIO DE VIDEO (R2 / YOUTUBE)
           ========================================================= */}
        {activeStep === 'lesson' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-150">
            {renderCompactLessonSwitcher()}

            <main className="flex-1 w-full bg-white rounded-2xl border border-[#d1d2e0] shadow-2xs p-6 sm:p-8 space-y-6">
              {currentLesson ? (
                <>
                  {/* Cabecera de la Lección */}
                  <div className="border-b border-[#e9eaf2] pb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-1 rounded-full bg-purple-100 text-[#6d28d2] text-[10px] font-extrabold uppercase tracking-wider">
                        Módulo {selectedModIdx + 1} • Clase {selectedModIdx + 1}.{selectedLesIdx + 1}
                      </span>
                      <h2 className="text-xl font-extrabold text-[#2a2b3f] mt-2">
                        {currentLesson.title}
                      </h2>
                      <p className="text-xs text-[#595c73]">
                        Configura los metadatos de la sesión, el reproductor de video y la carga directa a Cloudflare R2.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep('assessments')}
                        className="px-4 py-2 rounded-xl bg-[#6d28d2] hover:bg-[#591fb0] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Ir a Quizzes y Recursos de esta Clase →</span>
                      </button>
                    </div>
                  </div>

                  {/* Formulario de Datos y Fuente de Video */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                          Título de la Lección
                        </label>
                        <input
                          type="text"
                          value={currentLesson.title}
                          onChange={(e) => updateLesson('title', e.target.value)}
                          className="w-full text-sm font-bold text-[#2a2b3f] px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                          Duración Estimada
                        </label>
                        <input
                          type="text"
                          value={currentLesson.duration}
                          onChange={(e) => updateLesson('duration', e.target.value)}
                          placeholder="ej. 15 min"
                          className="w-full text-xs px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#595c73] mb-1">
                        Resumen / Objetivo Pedagógico de la Clase
                      </label>
                      <textarea
                        rows={2}
                        value={currentLesson.description || ''}
                        onChange={(e) => updateLesson('description', e.target.value)}
                        placeholder="Describe brevemente qué aprenderá el productor o estudiante en esta sesión..."
                        className="w-full text-xs px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                          Proveedor de Video
                        </label>
                        <select
                          value={currentLesson.videoType}
                          onChange={(e) =>
                            updateLesson('videoType', e.target.value as any)
                          }
                          className="w-full text-xs font-bold px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl bg-white"
                        >
                          <option value="youtube">Embebido de YouTube</option>
                          <option value="local">Cloudflare R2 / Archivo MP4 Directo</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                          URL del Video
                        </label>
                        <input
                          type="text"
                          value={currentLesson.videoUrl}
                          onChange={(e) => {
                          const val = e.target.value;
                          updateLesson('videoUrl', val);
                          if (val.includes('r2.dev') || val.includes('.mp4') || (!val.includes('youtube.com') && !val.includes('youtu.be') && val.startsWith('http'))) {
                            updateLesson('videoType', 'local');
                          } else if (val.includes('youtube.com') || val.includes('youtu.be')) {
                            updateLesson('videoType', 'youtube');
                          }
                        }}
                          placeholder="https://www.youtube.com/watch?v=... o https://pub-...r2.dev/videos/..."
                          className="w-full text-xs font-mono px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>
                    </div>

                    {/* Tarjeta de Carga Directa a Cloudflare R2 */}
                    <div className="p-4 rounded-2xl bg-[#f8f9fc] border border-[#d1d2e0] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6d28d2]/10 text-[#6d28d2] flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-[#2a2b3f]">
                            Almacenamiento de Video en Cloudflare R2
                          </h4>
                          <p className="text-[11px] text-[#595c73]">
                            Sube un archivo `.mp4` o `.webm` desde tu equipo; se cambiará automáticamente a modo R2 y se guardará la URL pública.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-[#6d28d2] text-white text-xs font-extrabold rounded-xl hover:bg-[#5b21b6] transition-colors flex items-center gap-2 shadow-xs"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Subir Archivo MP4 a R2</span>
                      </button>
                    </div>

                    {/* Previsualizador Audiovisual en Vivo */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-[#595c73]">
                        Vista Previa del Reproductor
                      </label>
                      {currentLesson.videoUrl && currentLesson.videoUrl.trim() !== '' ? (
                        <div className="rounded-2xl overflow-hidden bg-black aspect-video border border-[#d1d2e0] shadow-inner">
                          {currentLesson.videoType === 'youtube' &&
                          extractYouTubeEmbedUrl(currentLesson.videoUrl) ? (
                            <iframe
                              src={extractYouTubeEmbedUrl(currentLesson.videoUrl)!}
                              title={currentLesson.title}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              key={currentLesson.videoUrl}
                              src={currentLesson.videoUrl}
                              controls
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[#f8f9fc] border-2 border-dashed border-[#d1d2e0] h-56 flex flex-col items-center justify-center text-center p-6 gap-2">
                          <Play className="w-8 h-8 text-[#9194ac]" />
                          <p className="text-xs font-bold text-[#2a2b3f]">
                            Esta clase aún no tiene un video vinculado
                          </p>
                          <p className="text-[11px] text-[#595c73] max-w-md">
                            Pega un enlace de YouTube o sube un archivo MP4 directo a nuestro bucket de Cloudflare R2 para previsualizarlo aquí.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-xs text-[#595c73]">
                  Selecciona una clase del selector izquierdo para editar su contenido.
                </div>
              )}
            </main>
          </div>
        )}

        {/* =========================================================
            PASO 4: BANCO DE QUIZZES, CHECKPOINTS, RECURSOS Y MÉTRICAS
           ========================================================= */}
        {activeStep === 'assessments' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-150">
            {renderCompactLessonSwitcher()}

            <main className="flex-1 w-full bg-white rounded-2xl border border-[#d1d2e0] shadow-2xs p-6 sm:p-8 space-y-6">
              {currentLesson ? (
                <>
                  {/* Cabecera del Centro Evaluativo de la Lección */}
                  <div className="border-b border-[#e9eaf2] pb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-1 rounded-full bg-teal-100 text-[#6d28d2] text-[10px] font-extrabold uppercase tracking-wider">
                        Centro de Evaluación y Material • Clase {selectedModIdx + 1}.{selectedLesIdx + 1}
                      </span>
                      <h2 className="text-xl font-extrabold text-[#2a2b3f] mt-2">
                        {currentLesson.title}
                      </h2>
                      <p className="text-xs text-[#595c73]">
                        Administra el examen obligatorio de cierre de clase, preguntas interactivas durante el video, recursos descargables y métricas asociadas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStep('lesson')}
                      className="px-3.5 py-2 rounded-xl border border-[#d1d2e0] text-[#2a2b3f] hover:bg-[#f8f9fc] text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Film className="w-3.5 h-3.5 text-[#6d28d2]" />
                      <span>← Volver al Video de la Clase</span>
                    </button>
                  </div>

                  {/* Sub-pestañas del Paso 4 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f4f5f9] p-1.5 rounded-2xl border border-[#e2e4f0]">
                    {[
                      {
                        id: 'quiz' as AssessmentSubTab,
                        label: 'Quiz Fin de Clase',
                        count: currentLesson.checkpointQuiz?.length || 0,
                        icon: Award
                      },
                      {
                        id: 'invideo' as AssessmentSubTab,
                        label: 'Checkpoints In-Video',
                        count: currentLesson.inVideoCheckpoints?.length || 0,
                        icon: Clock
                      },
                      {
                        id: 'resources' as AssessmentSubTab,
                        label: 'Recursos y Pop Quiz',
                        count: currentLesson.resources?.length || 0,
                        icon: FolderOpen
                      },
                      {
                        id: 'metrics' as AssessmentSubTab,
                        label: 'Métricas Vinculadas',
                        count: currentLesson.metrics?.length || 0,
                        icon: Sparkles
                      }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = assessmentTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAssessmentTab(tab.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                            active
                              ? 'bg-white text-[#6d28d2] shadow-xs border border-[#d1d2e0]'
                              : 'text-[#595c73] hover:text-[#2a2b3f]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                              active
                                ? 'bg-[#6d28d2] text-white'
                                : 'bg-[#e2e4f0] text-[#595c73]'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SUB-VISTA 1: EVALUACIÓN OBLIGATORIA DE FIN DE LECCIÓN */}
                  {assessmentTab === 'quiz' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f9fc] p-4 rounded-2xl border border-[#e2e4f0]">
                        <div>
                          <h3 className="text-sm font-extrabold text-[#2a2b3f] flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>
                              Evaluación Obligatoria de Fin de Lección ({currentLesson.checkpointQuiz?.length || 0})
                            </span>
                          </h3>
                          <p className="text-xs text-[#595c73]">
                            Estas preguntas se despliegan automáticamente cuando el video de la clase llega al final para acreditar la lección.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addQuizQuestion}
                          className="px-4 py-2 rounded-xl bg-[#6d28d2] text-white text-xs font-bold hover:bg-[#5b21b6] transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Añadir Pregunta Evaluativa</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {(currentLesson.checkpointQuiz || []).length === 0 ? (
                          <div className="p-8 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] text-center space-y-2">
                            <HelpCircle className="w-7 h-7 text-[#9194ac] mx-auto" />
                            <p className="text-xs font-bold text-[#2a2b3f]">
                              Sin preguntas obligatorias de cierre
                            </p>
                            <p className="text-[11px] text-[#595c73]">
                              Agrega al menos una pregunta para validar que el estudiante comprendió la clase al terminar el video.
                            </p>
                          </div>
                        ) : (
                          currentLesson.checkpointQuiz?.map((q, qIdx) => (
                            <div
                              key={q.id || qIdx}
                              className="p-5 bg-[#fbfbfd] rounded-2xl border border-[#d1d2e0] space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-[#6d28d2] text-xs font-extrabold">
                                  Pregunta Evaluativa #{qIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQuizQuestion(qIdx)}
                                  className="p-1.5 text-[#9194ac] hover:text-rose-500 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#595c73] mb-1">
                                  Enunciado de la Pregunta
                                </label>
                                <input
                                  type="text"
                                  value={q.prompt}
                                  onChange={(e) =>
                                    updateQuizQuestion(qIdx, 'prompt', e.target.value)
                                  }
                                  placeholder="Enunciado de la pregunta..."
                                  className="w-full text-xs font-bold text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[11px] font-semibold text-[#595c73]">
                                  Opciones de Respuesta (Selecciona el círculo de la opción correcta):
                                </label>
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2.5">
                                    <input
                                      type="radio"
                                      name={`correct-${q.id || qIdx}`}
                                      checked={q.correctIndex === optIdx}
                                      onChange={() =>
                                        updateQuizQuestion(qIdx, 'correctIndex', optIdx)
                                      }
                                      className="accent-[#6d28d2] w-4 h-4"
                                    />
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...q.options];
                                        newOpts[optIdx] = e.target.value;
                                        updateQuizQuestion(qIdx, 'options', newOpts);
                                      }}
                                      className={`flex-1 text-xs p-2 rounded-xl border ${
                                        q.correctIndex === optIdx
                                          ? 'bg-emerald-50/50 border-emerald-400 font-bold text-emerald-950'
                                          : 'bg-white border-[#d1d2e0]'
                                      }`}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                                  Retroalimentación / Fundamento Zootécnico
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.explanation}
                                  onChange={(e) =>
                                    updateQuizQuestion(qIdx, 'explanation', e.target.value)
                                  }
                                  placeholder="Explicación técnica que verá el alumno tras responder..."
                                  className="w-full text-xs bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-VISTA 2: CHECKPOINTS INTERACTIVOS IN-VIDEO */}
                  {assessmentTab === 'invideo' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f9fc] p-4 rounded-2xl border border-[#e2e4f0]">
                        <div>
                          <h3 className="text-sm font-extrabold text-[#2a2b3f] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#6d28d2]" />
                            <span>
                              Checkpoints Interactivos Durante el Video ({currentLesson.inVideoCheckpoints?.length || 0})
                            </span>
                          </h3>
                          <p className="text-xs text-[#595c73]">
                            Pausan automáticamente la reproducción en el segundo indicado para hacer una pregunta rápida de atención.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addInVideoCheckpoint}
                          className="px-4 py-2 rounded-xl bg-[#6d28d2] text-white text-xs font-bold hover:bg-[#5b21b6] transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Añadir Checkpoint en Video</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {(currentLesson.inVideoCheckpoints || []).length === 0 ? (
                          <div className="p-8 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] text-center space-y-2">
                            <Clock className="w-7 h-7 text-[#9194ac] mx-auto" />
                            <p className="text-xs font-bold text-[#2a2b3f]">
                              No hay intervenciones configuradas durante el video
                            </p>
                            <p className="text-[11px] text-[#595c73]">
                              Puedes añadir preguntas en segundos clave (ej. segundo 90) para mantener la atención activa del estudiante.
                            </p>
                          </div>
                        ) : (
                          currentLesson.inVideoCheckpoints?.map((cp, cpIdx) => (
                            <div
                              key={cp.id || cpIdx}
                              className="p-5 bg-[#fbfbfd] rounded-2xl border border-[#d1d2e0] space-y-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-extrabold">
                                    Checkpoint #{cpIdx + 1}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-[#595c73]">
                                      Segundo de disparo:
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={cp.timestampSeconds}
                                      onChange={(e) =>
                                        updateInVideoCheckpoint(
                                          cpIdx,
                                          'timestampSeconds',
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-20 px-2 py-1 border border-[#d1d2e0] rounded-lg bg-white font-mono text-xs font-bold text-[#2a2b3f]"
                                    />
                                    <span className="text-[11px] text-[#9194ac]">seg</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeInVideoCheckpoint(cpIdx)}
                                  className="p-1.5 text-[#9194ac] hover:text-rose-500 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={cp.prompt}
                                onChange={(e) =>
                                  updateInVideoCheckpoint(cpIdx, 'prompt', e.target.value)
                                }
                                placeholder="Pregunta que aparecerá sobre el video..."
                                className="w-full text-xs font-bold text-[#2a2b3f] bg-white p-2.5 rounded-xl border border-[#d1d2e0]"
                              />

                              <div className="space-y-2">
                                {cp.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`invideo-correct-${cp.id || cpIdx}`}
                                      checked={cp.correctIndex === optIdx}
                                      onChange={() =>
                                        updateInVideoCheckpoint(
                                          cpIdx,
                                          'correctIndex',
                                          optIdx
                                        )
                                      }
                                      className="accent-[#6d28d2]"
                                    />
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const nextOpts = [...cp.options];
                                        nextOpts[optIdx] = e.target.value;
                                        updateInVideoCheckpoint(cpIdx, 'options', nextOpts);
                                      }}
                                      className="flex-1 text-xs bg-white p-2 rounded-xl border border-[#d1d2e0]"
                                    />
                                  </div>
                                ))}
                              </div>

                              <input
                                type="text"
                                value={cp.explanation}
                                onChange={(e) =>
                                  updateInVideoCheckpoint(
                                    cpIdx,
                                    'explanation',
                                    e.target.value
                                  )
                                }
                                placeholder="Explicación breve tras responder..."
                                className="w-full text-xs bg-white p-2 rounded-xl border border-[#d1d2e0]"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-VISTA 3: RECURSOS DESCARGABLES Y POP QUIZZES */}
                  {assessmentTab === 'resources' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f9fc] p-4 rounded-2xl border border-[#e2e4f0]">
                        <div>
                          <h3 className="font-extrabold text-sm text-[#2a2b3f] flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-[#6d28d2]" />
                            <span>
                              Material Descargable y Pop Quizzes ({currentLesson.resources?.length || 0})
                            </span>
                          </h3>
                          <p className="text-xs text-[#595c73]">
                            Adjunta guías en PDF/Word/Excel alojadas en Cloudflare R2, enlaces técnicos o Pop Quizzes de práctica.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addLessonResource('document')}
                            className="px-3 py-2 bg-white border border-[#d1d2e0] hover:border-[#6d28d2] text-[#6d28d2] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>+ Documento</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addLessonResource('popquiz')}
                            className="px-3 py-2 bg-[#6d28d2] hover:bg-[#5b21b6] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>+ Pop Quiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addLessonResource('link')}
                            className="px-3 py-2 bg-white border border-[#d1d2e0] hover:border-[#2a2b3f] text-[#595c73] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>+ Enlace</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(currentLesson.resources || []).length === 0 ? (
                          <div className="p-8 rounded-2xl bg-[#f8f9fc] border border-[#e2e4f0] text-center space-y-1">
                            <p className="text-xs font-bold text-[#2a2b3f]">
                              Esta lección no tiene recursos complementarios adjuntos
                            </p>
                            <p className="text-[11px] text-[#595c73]">
                              Añade un documento técnico, una plantilla Excel o un Pop Quiz interactivo.
                            </p>
                          </div>
                        ) : (
                          currentLesson.resources?.map((res, rIdx) => (
                            <div
                              key={res.id || rIdx}
                              className="p-5 rounded-2xl border border-[#d1d2e0] bg-[#fbfbfd] space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                      res.type === 'popquiz'
                                        ? 'bg-[#6d28d2]/15 text-[#6d28d2]'
                                        : res.type === 'document'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {res.type === 'popquiz'
                                      ? 'Pop Quiz'
                                      : res.type === 'document'
                                      ? 'Documento Descargable'
                                      : 'Enlace Externo'}
                                  </span>
                                  <span className="text-xs font-bold text-[#2a2b3f]">
                                    Recurso #{rIdx + 1}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeLessonResource(rIdx)}
                                  className="p-1 text-[#9194ac] hover:text-rose-500 rounded transition-colors"
                                  title="Eliminar recurso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                                    Título del Recurso
                                  </label>
                                  <input
                                    type="text"
                                    value={res.title}
                                    onChange={(e) =>
                                      updateLessonResource(rIdx, 'title', e.target.value)
                                    }
                                    className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl bg-white font-semibold"
                                  />
                                </div>

                                {res.type !== 'popquiz' && (
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#595c73] mb-1">
                                      {res.type === 'document'
                                        ? 'URL del Archivo o Subir a R2'
                                        : 'URL del Enlace'}
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={res.url || ''}
                                        onChange={(e) =>
                                          updateLessonResource(rIdx, 'url', e.target.value)
                                        }
                                        placeholder="https://..."
                                        className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl bg-white"
                                      />
                                      {res.type === 'document' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setTargetResourceIdxForUpload(rIdx);
                                            resourceFileInputRef.current?.click();
                                          }}
                                          className="px-3 py-2 bg-[#6d28d2] text-white text-xs font-bold rounded-xl hover:bg-[#591fb0] transition-colors shrink-0 flex items-center gap-1"
                                          title="Subir archivo a Cloudflare R2"
                                        >
                                          <Upload className="w-3.5 h-3.5" />
                                          <span>Subir R2</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {res.type === 'popquiz' && (
                                <div className="pt-3 border-t border-[#e9eaf2] space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#6d28d2] flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>
                                        Preguntas del Pop Quiz ({res.popQuizQuestions?.length || 0})
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addPopQuizQuestionToResource(rIdx)}
                                      className="text-xs text-[#6d28d2] font-bold hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Añadir Pregunta</span>
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {(res.popQuizQuestions || []).map((pq, pqIdx) => (
                                      <div
                                        key={pq.id || pqIdx}
                                        className="p-3.5 bg-white rounded-xl border border-[#e9eaf2] space-y-2"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-[#595c73]">
                                            Pregunta {pqIdx + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removePopQuizQuestionFromResource(rIdx, pqIdx)
                                            }
                                            className="text-rose-500 hover:text-rose-700 p-0.5"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <input
                                          type="text"
                                          value={pq.prompt}
                                          onChange={(e) =>
                                            updatePopQuizQuestionInResource(
                                              rIdx,
                                              pqIdx,
                                              'prompt',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Enunciado de la pregunta rápida..."
                                          className="w-full text-xs p-2 border border-[#d1d2e0] rounded-lg font-semibold"
                                        />

                                        <div className="space-y-1.5">
                                          <span className="text-[10px] text-[#9194ac]">
                                            Opciones (Marca la correcta):
                                          </span>
                                          {pq.options.map((opt, oIdx) => (
                                            <div
                                              key={oIdx}
                                              className="flex items-center gap-2"
                                            >
                                              <input
                                                type="radio"
                                                name={`pq-${res.id}-${pq.id || pqIdx}`}
                                                checked={pq.correctIndex === oIdx}
                                                onChange={() =>
                                                  updatePopQuizQuestionInResource(
                                                    rIdx,
                                                    pqIdx,
                                                    'correctIndex',
                                                    oIdx
                                                  )
                                                }
                                                className="accent-[#6d28d2]"
                                              />
                                              <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                  const updatedOpts = [...pq.options];
                                                  updatedOpts[oIdx] = e.target.value;
                                                  updatePopQuizQuestionInResource(
                                                    rIdx,
                                                    pqIdx,
                                                    'options',
                                                    updatedOpts
                                                  );
                                                }}
                                                className="flex-1 text-xs p-1.5 border border-[#d1d2e0] rounded-md bg-[#f6f7f9]"
                                              />
                                            </div>
                                          ))}
                                        </div>

                                        <input
                                          type="text"
                                          value={pq.explanation || ''}
                                          onChange={(e) =>
                                            updatePopQuizQuestionInResource(
                                              rIdx,
                                              pqIdx,
                                              'explanation',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Explicación técnica / fundamento..."
                                          className="w-full text-[11px] p-2 border border-[#d1d2e0] rounded-lg text-[#595c73]"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-VISTA 4: MÉTRICAS ZOOTÉCNICAS VINCULADAS */}
                  {assessmentTab === 'metrics' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f9fc] p-4 rounded-2xl border border-[#e2e4f0]">
                        <div>
                          <h3 className="font-extrabold text-sm text-[#2a2b3f] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#6d28d2]" />
                            <span>
                              Parámetros y Métricas Vinculadas a esta Clase ({currentLesson.metrics?.length || 0})
                            </span>
                          </h3>
                          <p className="text-xs text-[#595c73]">
                            Selecciona qué indicadores de la Enciclopedia Zootécnica aparecerán como fichas de consulta durante esta lección.
                          </p>
                        </div>

                        <Link
                          href="/admin/metrics"
                          className="px-3.5 py-2 rounded-xl border border-[#6d28d2] text-[#6d28d2] text-xs font-bold hover:bg-[#6d28d2] hover:text-white transition-colors"
                        >
                          <span>Abrir Enciclopedia de Métricas →</span>
                        </Link>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-[#595c73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar métrica por nombre o categoría (ej. IEP, Peso al Destete, Condición Corporal)..."
                          value={metricSearch}
                          onChange={(e) => setMetricSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#f8f9fc] border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto p-1">
                        {filteredMetrics.map((m) => {
                          const isSelected = currentLesson.metrics?.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const current = currentLesson.metrics || [];
                                const next = isSelected
                                  ? current.filter((id) => id !== m.id)
                                  : [...current, m.id];
                                updateLesson('metrics', next);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                                isSelected
                                  ? 'bg-purple-50/80 border-[#6d28d2] text-[#2a2b3f] shadow-2xs'
                                  : 'bg-white border-[#d1d2e0] hover:border-[#6d28d2]/50 text-[#595c73]'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6d28d2] block">
                                  {m.category}
                                </span>
                                <p className="text-xs font-bold text-[#2a2b3f] truncate">
                                  {m.label}
                                </p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-[#6d28d2] text-white'
                                    : 'border border-[#d1d2e0] bg-[#f8f9fc]'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-xs text-[#595c73]">
                  Selecciona una clase del panel izquierdo para gestionar sus evaluaciones y recursos.
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Inputs ocultos para subida de archivos a R2 */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/webm,video/mkv,video/quicktime"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadVideoFile(e.target.files[0]);
          }
        }}
      />

      <input
        type="file"
        ref={resourceFileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        className="hidden"
        onChange={handleUploadResourceFile}
      />

      {/* MODAL CREAR NUEVO CURSO */}
      {isCreateCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#d1d2e0] shadow-2xl overflow-hidden my-8">
            <div className="bg-[#151726] text-white p-5 flex items-center justify-between border-b border-[#262940]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Crear Nuevo Curso en Catálogo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="text-[#8589a6] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateNewCourse}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Título del Curso
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Nutrición y Balance de Dietas Ganaderas"
                  value={newCourseForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setNewCourseForm({ ...newCourseForm, title, slug: autoSlug });
                  }}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2] font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2a2b3f] mb-1">
                  Slug URL (Identificador)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. nutricion-dietas-ganaderas"
                  value={newCourseForm.slug}
                  onChange={(e) =>
                    setNewCourseForm({ ...newCourseForm, slug: e.target.value })
                  }
                  className="w-full text-xs font-mono px-3.5 py-2 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                />
                <p className="text-[10px] text-[#9194ac] mt-1">
                  Se usará en la URL: /course?id=tu-slug
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#595c73] mb-1">
                  Descripción Breve
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Resumen del contenido y objetivos de aprendizaje..."
                  value={newCourseForm.description}
                  onChange={(e) =>
                    setNewCourseForm({ ...newCourseForm, description: e.target.value })
                  }
                  className="w-full text-xs px-3.5 py-2 border border-[#d1d2e0] rounded-xl focus:outline-none focus:border-[#6d28d2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#595c73] mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={newCourseForm.category}
                    onChange={(e) =>
                      setNewCourseForm({ ...newCourseForm, category: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#595c73] mb-1">
                    Nivel
                  </label>
                  <select
                    value={newCourseForm.level}
                    onChange={(e) =>
                      setNewCourseForm({ ...newCourseForm, level: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-xl bg-white"
                  >
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#595c73] mb-1">
                  URL de Portada (Thumbnail)
                </label>
                <input
                  type="text"
                  value={newCourseForm.thumbnail}
                  onChange={(e) =>
                    setNewCourseForm({ ...newCourseForm, thumbnail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d1d2e0] rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#f6f7f9] border border-[#d1d2e0] space-y-2">
                <span className="text-xs font-bold text-[#2a2b3f] block">
                  Regla de Avance Secuencial
                </span>
                <select
                  value={newCourseForm.progressionMode}
                  onChange={(e) =>
                    setNewCourseForm({
                      ...newCourseForm,
                      progressionMode: e.target.value as any
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-lg bg-white"
                >
                  <option value="lesson_strict">
                    Estricto por Lección (Completar previa)
                  </option>
                  <option value="module_strict">
                    Estricto por Sección (Completar módulo previo)
                  </option>
                  <option value="free">Libre (Sin bloqueos)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#f6f7f9] border border-[#d1d2e0]">
                <div>
                  <span className="text-xs font-bold text-[#2a2b3f] block mb-1">
                    Visibilidad Inicial
                  </span>
                  <select
                    value={newCourseForm.visibility}
                    onChange={(e) =>
                      setNewCourseForm({
                        ...newCourseForm,
                        visibility: e.target.value as any
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-lg bg-white"
                  >
                    <option value="public">Público (En catálogo)</option>
                    <option value="draft">Borrador (Oculto a alumnos)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-bold text-[#2a2b3f] block mb-1">
                    Modalidad de Acceso
                  </span>
                  <select
                    value={newCourseForm.accessType}
                    onChange={(e) =>
                      setNewCourseForm({
                        ...newCourseForm,
                        accessType: e.target.value as any
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-[#d1d2e0] rounded-lg bg-white"
                  >
                    <option value="free">Gratuito</option>
                    <option value="paid">De Pago</option>
                  </select>
                </div>

                {newCourseForm.accessType === 'paid' && (
                  <div className="sm:col-span-2 pt-1">
                    <span className="text-xs font-bold text-[#2a2b3f] block mb-1">
                      Precio de Matrícula (USD)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={newCourseForm.price}
                      onChange={(e) =>
                        setNewCourseForm({
                          ...newCourseForm,
                          price: Number(e.target.value)
                        })
                      }
                      placeholder="49"
                      className="w-full text-xs font-bold px-3 py-2 border border-[#d1d2e0] rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e9eaf2]">
                <button
                  type="button"
                  onClick={() => setIsCreateCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#595c73] hover:text-[#2a2b3f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#6d28d2] text-white text-xs font-bold rounded-xl hover:bg-[#5b21b6] transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear y Abrir en Studio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-[#6d28d2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminStudioWorkspace />
    </Suspense>
  );
}
