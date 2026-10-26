export interface PermissionItem {
  id: string;
  name: string;
  category: 'courses' | 'grading' | 'live' | 'tutoria' | 'certificates' | 'students' | 'legal' | 'infra';
  description: string;
}

export const CATEGORY_LABELS: Record<PermissionItem['category'], string> = {
  courses: 'Cursos y Lecciones',
  grading: 'Rúbricas y Calificaciones',
  live: 'Clases en Vivo y Cupos',
  tutoria: 'TutorIA y Directivas',
  certificates: 'Certificados y Diplomas',
  students: 'Estudiantes y Licencias',
  legal: 'Cumplimiento Legal y Litigios',
  infra: 'Infraestructura y Seguridad',
};

export const EXTENSIVE_PERMISSIONS: PermissionItem[] = [
  // 1. Cursos y Lecciones (10)
  { id: 'course.view', name: 'Ver catálogo de cursos', category: 'courses', description: 'Acceso de lectura al árbol de módulos y lecciones.' },
  { id: 'course.create', name: 'Crear nuevos cursos', category: 'courses', description: 'Habilidad de inicializar nuevos programas y definir metadatos.' },
  { id: 'course.edit_metadata', name: 'Editar datos del curso', category: 'courses', description: 'Modificar títulos, descripciones, instructores y portadas.' },
  { id: 'course.reorder_modules', name: 'Reordenar módulos y clases', category: 'courses', description: 'Modificar la secuencia pedagógica mediante drag & drop.' },
  { id: 'course.delete', name: 'Eliminar cursos', category: 'courses', description: 'Eliminación permanente o archivo de programas completos.' },
  { id: 'lesson.create', name: 'Crear lecciones y videos', category: 'courses', description: 'Añadir lecciones con video, descripciones y marcadores de tiempo.' },
  { id: 'lesson.edit_checkpoints', name: 'Configurar checkpoints interactivos', category: 'courses', description: 'Insertar preguntas que pausan el video en minutos clave.' },
  { id: 'lesson.manage_resources', name: 'Adjuntar archivos y guías (.docx, .pdf)', category: 'courses', description: 'Subir documentos complementarios para los estudiantes.' },
  { id: 'lesson.delete', name: 'Eliminar lecciones', category: 'courses', description: 'Remover lecciones del plan de estudio.' },
  { id: 'course.manage_conditionals', name: 'Establecer control de condicionales', category: 'courses', description: 'Bloquear lecciones o módulos hasta aprobar evaluaciones previas.' },

  // 2. Rúbricas y Calificaciones (8)
  { id: 'rubric.view', name: 'Ver rúbricas y criterios', category: 'grading', description: 'Consultar las tablas de criterios de evaluación.' },
  { id: 'rubric.create', name: 'Diseñar y editar rúbricas', category: 'grading', description: 'Crear matrices de evaluación con niveles y ponderaciones de 0.0 a 5.0.' },
  { id: 'assignment.create', name: 'Publicar tareas y entregas', category: 'grading', description: 'Configurar fechas de vencimiento, cortes y extensiones permitidas.' },
  { id: 'grade.evaluate_submission', name: 'Calificar entregas de alumnos', category: 'grading', description: 'Asignar puntajes y observaciones criterio por criterio.' },
  { id: 'grade.ai_assisted_review', name: 'Ejecutar revisión asistida por IA', category: 'grading', description: 'Generar propuestas de corrección y citas textuales con Workers AI.' },
  { id: 'grade.record_voice_feedback', name: 'Grabar retroalimentación por voz', category: 'grading', description: 'Adjuntar notas de audio directas a las correcciones de tareas.' },
  { id: 'grade.override', name: 'Anular o recalificar notas oficiales', category: 'grading', description: 'Modificar calificaciones consolidadas en el libro de notas.' },
  { id: 'grade.export_matrix', name: 'Exportar matriz de calificaciones', category: 'grading', description: 'Descargar el consolidated gradebook a hojas de cálculo Excel/CSV.' },

  // 3. Clases en Vivo y Cupos (8)
  { id: 'live.view_scheduled', name: 'Ver calendario de clases en vivo', category: 'live', description: 'Consultar las sesiones sincrónicas programadas.' },
  { id: 'live.create_session', name: 'Programar sesión en vivo', category: 'live', description: 'Establecer fecha, hora, cupo máximo y enlace de videollamada.' },
  { id: 'live.start_studio', name: 'Iniciar split view de videollamada', category: 'live', description: 'Abrir sala interactiva con visor de recursos y quizzes en vivo.' },
  { id: 'live.verify_attendance_quota', name: 'Verificar y descontar cupo a asistentes', category: 'live', description: 'Validar que el alumno tiene cupo disponible antes de dar inicio.' },
  { id: 'live.manage_bookings', name: 'Aprobar o rechazar reservas de cupos', category: 'live', description: 'Gestionar las solicitudes de estudiantes para sesiones en vivo.' },
  { id: 'live.launch_in_call_quiz', name: 'Lanzar quiz en tiempo real en la llamada', category: 'live', description: 'Enviar preguntas a los asistentes durante la transmisión.' },
  { id: 'quota.grant_monthly', name: 'Asignar cupos a estudiantes', category: 'live', description: 'Recargar saldo de clases en vivo según el plan comercial.' },
  { id: 'quota.refund_manual', name: 'Devolver cupos manualmente (Regla Humana)', category: 'live', description: 'Reintegrar cupos cancelados de forma justificada en el libro mayor.' },

  // 4. TutorIA y Directivas (6)
  { id: 'tutoria.chat_directives', name: 'Canal privado de directivas con TutorIA', category: 'tutoria', description: 'Instruir al agente sobre horarios recomendados y reglas pedagógicas.' },
  { id: 'tutoria.block_hours', name: 'Bloquear franjas horarias al asistente', category: 'tutoria', description: 'Impedir que TutorIA recomiende horarios no disponibles.' },
  { id: 'tutoria.view_student_logs', name: 'Ver consultas de estudiantes a TutorIA', category: 'tutoria', description: 'Supervisar dudas recurrentes y temas difíciles para el grupo.' },
  { id: 'tutoria.customize_prompts', name: 'Ajustar prompt pedagógico del asistente', category: 'tutoria', description: 'Configurar tono, nivel de exigencia y restricciones de respuesta.' },
  { id: 'tutoria.manage_knowledge_base', name: 'Actualizar base de conocimiento de TutorIA', category: 'tutoria', description: 'Sincronizar documentos técnicos y transcripciones de clase.' },
  { id: 'tutoria.override_responses', name: 'Corregir respuestas inexactas de TutorIA', category: 'tutoria', description: 'Entrenar el historial de sintonización con casos reales.' },

  // 5. Certificados y Diplomas (5)
  { id: 'certificate.view_registry', name: 'Ver registro oficial de diplomas', category: 'certificates', description: 'Consultar el libro de folios y certificados expedidos.' },
  { id: 'certificate.issue_manual', name: 'Expedir diploma manualmente', category: 'certificates', description: 'Generar certificado a alumnos que completaron requisitos.' },
  { id: 'certificate.revoke', name: 'Revocar o anular diploma expedido', category: 'certificates', description: 'Inhabilitar verificación pública de un diploma por faltas.' },
  { id: 'certificate.export_audit', name: 'Exportar padrón de graduados', category: 'certificates', description: 'Descargar reporte con hashes de verificación, fechas y horas.' },
  { id: 'certificate.customize_templates', name: 'Editar diseño de diplomas y firmas', category: 'certificates', description: 'Configurar firmas digitales, logos y texto de acreditación.' },

  // 6. Estudiantes y Licencias (8)
  { id: 'student.view_directory', name: 'Ver directorio de estudiantes activos', category: 'students', description: 'Consultar perfil de estudiantes con latido de vida y actividad.' },
  { id: 'student.view_progress', name: 'Ver progreso individual detallado', category: 'students', description: 'Inspeccionar avance porcentual, videos vistos y notas por alumno.' },
  { id: 'student.assign_license', name: 'Asignar licencia de curso', category: 'students', description: 'Habilitar acceso formal a un estudiante en un programa específico.' },
  { id: 'student.revoke_license', name: 'Revocar licencia de curso', category: 'students', description: 'Suspender el acceso por terminación de contrato o mora.' },
  { id: 'student.send_advisory_invite', name: 'Enviar citación de asesoría individual', category: 'students', description: 'Agendar sesión de refuerzo en el calendario para alumnos rezagados.' },
  { id: 'student.export_roster', name: 'Exportar lista de estudiantes a Excel', category: 'students', description: 'Descargar datos de contacto, licencias y última conexión.' },
  { id: 'student.filter_inactive', name: 'Filtrar cuentas inactivas sin actividad', category: 'students', description: 'Depurar reportes excluyendo usuarios sin interacción.' },
  { id: 'student.reset_attempt', name: 'Reiniciar intento de examen', category: 'students', description: 'Permitir a un estudiante repetir una evaluación bloqueada.' },

  // 7. Cumplimiento Legal y Litigios (5)
  { id: 'legal.view_consents', name: 'Ver logs de aceptación de litigios', category: 'legal', description: 'Acceso a la bitácora de firmas de términos y consentimientos.' },
  { id: 'legal.export_excel', name: 'Exportar evidencias de consentimiento a Excel', category: 'legal', description: 'Generar archivo con IP, timestamp UTC, documento y versión.' },
  { id: 'legal.export_pdf', name: 'Exportar acta probatoria legal en PDF', category: 'legal', description: 'Generar documento formal con membrete y validez probatoria.' },
  { id: 'legal.update_terms', name: 'Publicar nueva versión de términos y políticas', category: 'legal', description: 'Requerir nueva aceptación a todos los estudiantes.' },
  { id: 'legal.manage_jurisdictions', name: 'Configurar cláusulas de arbitraje y litigio', category: 'legal', description: 'Parametrizar jurisdicción de cámara de comercio y resolución.' },

  // 8. Infraestructura y Seguridad (8)
  { id: 'admin.view_security_roles', name: 'Ver matriz de roles y permisos', category: 'infra', description: 'Consultar qué puede hacer cada rol en la plataforma.' },
  { id: 'admin.manage_custom_roles', name: 'Crear y editar roles personalizados', category: 'infra', description: 'Definir perfiles a la medida combinando más de 50 permisos.' },
  { id: 'admin.assign_user_role', name: 'Cambiar rol a cuentas de usuario', category: 'infra', description: 'Promover o degradar cuentas de forma inmediata.' },
  { id: 'admin.monitor_system_load', name: 'Monitorear carga del sistema en tiempo real', category: 'infra', description: 'Gráficas en vivo de CPU, RAM, almacenamiento y ancho de banda.' },
  { id: 'admin.manage_concurrency', name: 'Supervisar CCU y reglas de auto-escalado', category: 'infra', description: 'Ajustar umbrales para picos de exámenes masivos.' },
  { id: 'admin.view_audit_logs', name: 'Auditar bitácora centralizada de eventos', category: 'infra', description: 'Registros de seguridad, accesos fallidos y cambios críticos.' },
  { id: 'admin.export_audit_trail', name: 'Exportar pistas de auditoría forense', category: 'infra', description: 'Descarga inmutable de eventos de seguridad.' },
  { id: 'admin.manage_api_keys', name: 'Administrar integraciones y llaves API', category: 'infra', description: 'Configurar tokens de Cloudflare, Firebase y servicios de correo.' },
];

export interface CustomRoleDefinition {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  permissions: string[];
}

export const INITIAL_ROLES: CustomRoleDefinition[] = [
  {
    id: 'teacher',
    name: 'Docente / Instructor',
    description: 'Gestión académica total: cursos, rúbricas, notas, videollamadas con split view y directivas de TutorIA.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: [
      'course.view', 'course.create', 'course.edit_metadata', 'course.reorder_modules',
      'lesson.create', 'lesson.edit_checkpoints', 'lesson.manage_resources', 'course.manage_conditionals',
      'rubric.view', 'rubric.create', 'assignment.create', 'grade.evaluate_submission',
      'grade.ai_assisted_review', 'grade.record_voice_feedback', 'grade.export_matrix',
      'live.view_scheduled', 'live.create_session', 'live.start_studio', 'live.verify_attendance_quota',
      'live.manage_bookings', 'live.launch_in_call_quiz',
      'tutoria.chat_directives', 'tutoria.block_hours', 'tutoria.view_student_logs',
      'certificate.view_registry', 'certificate.issue_manual',
      'student.view_directory', 'student.view_progress', 'student.send_advisory_invite',
      'student.export_roster', 'student.filter_inactive', 'student.reset_attempt'
    ]
  },
  {
    id: 'admin',
    name: 'Administrador de Gobernanza',
    description: 'Acceso a infraestructura, matriz de seguridad, auto-escalado, litigios y gestión de cuentas registradas.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    permissions: EXTENSIVE_PERMISSIONS.map(p => p.id) // Todos los permisos
  },
  {
    id: 'operator',
    name: 'Operador Comercial & Licencias',
    description: 'Activación de licencias, libro mayor de cupos, consultas comerciales y verificación de diplomas.',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    permissions: [
      'course.view', 'certificate.view_registry', 'certificate.export_audit',
      'student.view_directory', 'student.assign_license', 'student.revoke_license',
      'student.export_roster', 'quota.grant_monthly', 'quota.refund_manual',
      'legal.view_consents', 'legal.export_excel'
    ]
  }
];
