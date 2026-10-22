-- Tabla principal de Tareas
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_slug TEXT NOT NULL,
  course_title TEXT NOT NULL,
  module_title TEXT NOT NULL,
  cut_id TEXT NOT NULL,
  weight_percent INTEGER NOT NULL DEFAULT 20,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  due_date_utc TEXT NOT NULL,
  allowed_extensions TEXT NOT NULL DEFAULT '["*"]',
  max_file_size_mb INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  rubric_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tabla de Entregas de Estudiantes
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_uid TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  submission_text_content TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
  final_grade REAL, -- 0.0 a 5.0
  teacher_justification TEXT DEFAULT '',
  submitted_at TEXT NOT NULL,
  graded_at TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Archivos Adjuntos de la Entrega (almacenados en Cloudflare R2)
CREATE TABLE IF NOT EXISTS submission_files (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Desglose Criterio por Criterio de Rúbrica (Evaluación Manual y Sugerencias de IA)
CREATE TABLE IF NOT EXISTS rubric_evaluations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  criterion_title TEXT NOT NULL,
  level_id TEXT,
  level_title TEXT,
  points REAL NOT NULL DEFAULT 0.0,
  ai_suggested_points REAL,
  ai_quote TEXT,
  teacher_comment TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Anotaciones In-Situ dentro del Documento / Audio / Código
CREATE TABLE IF NOT EXISTS inline_annotations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  file_id TEXT,
  page_or_timestamp TEXT,
  line_or_selection TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'teacher', -- 'teacher' o 'ai'
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_uid);
CREATE INDEX IF NOT EXISTS idx_files_submission ON submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_annotations_submission ON inline_annotations(submission_id);


-- ============================================================================
-- SISTEMA DE CLASES EN VIVO Y LIBRO MAYOR DE CUPOS (CLASE AA+)
-- ============================================================================

-- Tabla de Clases en Vivo (Programadas por el docente)
CREATE TABLE IF NOT EXISTS live_classes (
  id TEXT PRIMARY KEY,
  course_slug TEXT NOT NULL,
  course_title TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  scheduled_at_utc TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_capacity INTEGER NOT NULL DEFAULT 15,
  auto_approve INTEGER NOT NULL DEFAULT 0, -- 0: requiere aprobación manual, 1: auto-aprobación
  teacher_uid TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  teacher_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  jitsi_room_name TEXT NOT NULL UNIQUE,
  recording_drive_url TEXT,
  started_at_utc TEXT,
  ended_at_utc TEXT,
  created_at_utc TEXT NOT NULL
);

-- Tabla de Reservas de Estudiantes (Separada del ciclo de vida de la clase)
CREATE TABLE IF NOT EXISTS class_bookings (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_uid TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_hold', -- 'pending_hold', 'confirmed', 'attended', 'noshow', 'cancelled_refunded', 'cancelled_penalty', 'expired_released', 'rejected_released'
  expires_at_utc TEXT NOT NULL, -- min(requested_at + 4h, scheduled_at - 30m)
  attended INTEGER NOT NULL DEFAULT 0,
  attendance_minutes INTEGER NOT NULL DEFAULT 0,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES live_classes(id) ON DELETE CASCADE,
  UNIQUE(class_id, student_uid) -- Evita reservas duplicadas del mismo alumno
);

-- Libro Mayor Inmutable de Cupos (Audit Ledger Financiero)
CREATE TABLE IF NOT EXISTS quota_ledger (
  id TEXT PRIMARY KEY,
  student_uid TEXT NOT NULL,
  booking_id TEXT,
  action TEXT NOT NULL, -- 'GRANT_MONTHLY', 'HOLD_RESERVATION', 'COMMIT_CONFIRMED', 'CONSUME_ATTENDED', 'CONSUME_NOSHOW', 'RELEASE_EXPIRED', 'RELEASE_REJECTED', 'REFUND_CANCELLED', 'ADMIN_ADJUST'
  delta INTEGER NOT NULL, -- -1 para retención/consumo, +1 para devolución, +N para recarga
  balance_after INTEGER NOT NULL, -- Saldo exacto tras la transacción
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE, -- Protección contra reintentos duplicados
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES class_bookings(id) ON DELETE SET NULL
);

-- Índices de alto rendimiento para consultas concurrentes
CREATE INDEX IF NOT EXISTS idx_live_classes_teacher ON live_classes(teacher_uid, scheduled_at_utc);
CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_classes(course_slug, scheduled_at_utc);
CREATE INDEX IF NOT EXISTS idx_class_bookings_class ON class_bookings(class_id, status);
CREATE INDEX IF NOT EXISTS idx_class_bookings_student ON class_bookings(student_uid, status);
CREATE INDEX IF NOT EXISTS idx_quota_ledger_student ON quota_ledger(student_uid, created_at_utc);
