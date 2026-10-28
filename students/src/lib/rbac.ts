export type UserRole = 'student' | 'instructor' | 'operator' | 'owner';

export type PermissionKey =
  | 'view_student_portal'
  | 'view_admin_panel'
  | 'manage_courses'
  | 'delete_courses'
  | 'grade_submissions'
  | 'manage_licenses'
  | 'view_student_analytics'
  | 'audit_legal_consents'
  | 'manage_roles';

export interface RoleDefinition {
  id: UserRole;
  level: number;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  permissions: PermissionKey[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  student: {
    id: 'student',
    level: 1,
    label: 'Nivel 1 · Estudiante',
    shortLabel: 'Estudiante',
    description:
      'Accede a las clases en video de los cursos con licencia activa, consulta el TutorIA, entrega tareas, revisa su calendario, consulta sus notas y descarga sus propios certificados.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    permissions: ['view_student_portal'],
  },
  instructor: {
    id: 'instructor',
    level: 2,
    label: 'Nivel 2 · Instructor / Creador',
    shortLabel: 'Instructor',
    description:
      'Crea y edita cursos, módulos, clases en video y calendario; revisa entregas de alumnos, asigna calificaciones y consulta el avance académico. No puede otorgar licencias comerciales, borrar cursos ni auditar firmas legales.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: [
      'view_student_portal',
      'view_admin_panel',
      'manage_courses',
      'grade_submissions',
      'view_student_analytics',
    ],
  },
  operator: {
    id: 'operator',
    level: 3,
    label: 'Nivel 3 · Operador / Soporte Comercial',
    shortLabel: 'Operador',
    description:
      'Activa o revoca licencias de cursos para estudiantes, verifica certificados emitidos y descarga reportes de progreso comercial. No puede modificar clases, borrar cursos ni cambiar roles.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    permissions: [
      'view_student_portal',
      'view_admin_panel',
      'manage_licenses',
      'view_student_analytics',
    ],
  },
  owner: {
    id: 'owner',
    level: 4,
    label: 'Nivel 4 · Propietario / Superadministrador',
    shortLabel: 'Propietario',
    description:
      'Control total e irrestricto de IPT Academy: asigna roles (IAM/RBAC), administra y elimina cursos, otorga licencias, califica y audita el libro oficial de firmas digitales de Habeas Data y Aceptación Legal.',
    badgeClass: 'bg-purple-50 text-[#6d28d2] border-purple-200',
    permissions: [
      'view_student_portal',
      'view_admin_panel',
      'manage_courses',
      'delete_courses',
      'grade_submissions',
      'manage_licenses',
      'view_student_analytics',
      'audit_legal_consents',
      'manage_roles',
    ],
  },
};

export interface RbacMatrixRow {
  permission: PermissionKey;
  moduleName: string;
  description: string;
  student: boolean;
  instructor: boolean;
  operator: boolean;
  owner: boolean;
}

export const RBAC_MATRIX_TABLE: RbacMatrixRow[] = [
  {
    permission: 'view_student_portal',
    moduleName: 'Ver clases, usar TutorIA, entregar tareas y descargar su certificado',
    description: 'Acceso al aula virtual en los cursos con licencia activa y verificación en /verify.',
    student: true,
    instructor: true,
    operator: true,
    owner: true,
  },
  {
    permission: 'grade_submissions',
    moduleName: 'Calificar tareas y dar retroalimentación a estudiantes',
    description: 'Revisión de entregas académicas, asignación de nota y comentarios.',
    student: false,
    instructor: true,
    operator: false,
    owner: true,
  },
  {
    permission: 'manage_courses',
    moduleName: 'Crear y editar cursos, módulos, videos y calendario',
    description: 'Edición del catálogo, lecciones, recursos descargables, misiones y fechas.',
    student: false,
    instructor: true,
    operator: false,
    owner: true,
  },
  {
    permission: 'delete_courses',
    moduleName: 'Eliminar cursos o módulos completos del catálogo',
    description: 'Protección contra borrado accidental o no autorizado de contenido.',
    student: false,
    instructor: false,
    operator: false,
    owner: true,
  },
  {
    permission: 'manage_licenses',
    moduleName: 'Otorgar o revocar licencias de acceso a cursos',
    description: 'Activación de matrículas y licencias para estudiantes que adquirieron un curso.',
    student: false,
    instructor: false,
    operator: true,
    owner: true,
  },
  {
    permission: 'view_student_analytics',
    moduleName: 'Ver analítica de progreso y certificados emitidos',
    description: 'Consulta de avance por alumno, graduados y exportación de reportes académicos.',
    student: false,
    instructor: true,
    operator: true,
    owner: true,
  },
  {
    permission: 'audit_legal_consents',
    moduleName: 'Auditar y exportar firmas legales (Habeas Data / Ley 1581)',
    description: 'Acceso exclusivo al registro de aceptación legal firmado en el login y registro.',
    student: false,
    instructor: false,
    operator: false,
    owner: true,
  },
  {
    permission: 'manage_roles',
    moduleName: 'Gestionar usuarios y asignar roles (IAM / RBAC)',
    description: 'Promover o degradar usuarios entre Estudiante, Instructor, Operador y Propietario.',
    student: false,
    instructor: false,
    operator: false,
    owner: true,
  },
];

export function normalizeUserRole(rawRole?: string | null): UserRole {
  if (!rawRole) return 'student';
  const clean = rawRole.toLowerCase().trim();
  if (clean === 'owner' || clean === 'superadmin' || clean === 'admin') return 'owner';
  if (clean === 'operator' || clean === 'support') return 'operator';
  if (clean === 'instructor' || clean === 'teacher') return 'instructor';
  return 'student';
}

export function hasRolePermission(role: UserRole, permission: PermissionKey): boolean {
  const def = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.student;
  return def.permissions.includes(permission);
}
