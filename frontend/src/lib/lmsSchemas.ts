import { z } from 'zod';

export const AllowedExtensionsSchema = z.enum([
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.zip',
  '.tar.gz',
  '.py',
  '.ts',
  '.js',
  '.ipynb',
  '.sql',
  '.md',
  '.txt',
]);

export const SubmissionUploadSchema = z.object({
  assignmentId: z.string().min(2, 'Selecciona una tarea'),
  fileName: z.string().min(3, 'Escribe el nombre del archivo'),
  extension: z.string().startsWith('.', 'El nombre del archivo debe terminar en .pdf, .docx, etc.'),
  sizeMb: z.number().positive('El archivo no puede estar vacío'),
  maxAllowedMb: z.number().positive(),
  studentNotes: z.string().max(4000, 'El mensaje es demasiado largo').optional(),
}).refine((data) => data.sizeMb <= data.maxAllowedMb, {
  message: 'El archivo es más pesado que el tamaño máximo permitido en esta tarea.',
  path: ['sizeMb'],
});

export const DynamicCalendarEventInputSchema = z.object({
  title: z.string().min(4, 'Escribe un nombre corto para la actividad (mínimo 4 letras)').max(120),
  description: z.string().min(6, 'Escribe una breve explicación de lo que hay que hacer').max(600),
  category: z.enum(['assignment_due', 'exam', 'live_class', 'institutional', 'tutoring']),
  courseSlug: z.string().min(2),
  courseTitle: z.string().min(2),
  startUtc: z.string().datetime({ offset: true }).or(z.string().min(10)),
  durationMinutes: z.number().min(15).max(480),
  locationOrUrl: z.string().min(3, 'Indica el lugar o enlace'),
});

export const LiveSessionCreateSchema = z.object({
  title: z.string().min(5, 'Escribe un nombre para la clase en vivo'),
  provider: z.enum(['ms_teams', 'google_meet', 'zoom']),
  courseSlug: z.string().min(2),
  moduleId: z.string().min(1),
  startTimeUtc: z.string().min(10),
  durationMinutes: z.number().min(15).max(300),
  autoRecordToCloud: z.boolean(),
});

export const TeacherFeedbackInputSchema = z.object({
  assignmentId: z.string().min(1),
  writtenFeedback: z.string().min(5, 'Escribe un comentario breve para el estudiante'),
  voiceNoteDurationSec: z.number().min(0).optional(),
  correctedAttachmentName: z.string().optional(),
});
