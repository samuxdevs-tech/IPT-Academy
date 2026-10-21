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
