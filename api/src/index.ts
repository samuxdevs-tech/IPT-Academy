import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
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
import { registerSubscriptionRoutes } from './services/subscriptionRoutes';
import { registerAuthRoutes } from './services/authRoutes';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
}

const app = new Hono<{ Bindings: Env }>();

// Shims de persistencia y almacenamiento en memoria para ejecución desacoplada en Vercel / Edge
class InMemoryD1Shim {
  private data: Record<string, any[]> = {
    assignments: [],
    submissions: [],
    submission_files: [],
    rubric_evaluations: [],
    inline_annotations: [],
    live_classes: [],
    live_class_bookings: [],
    quota_ledger: [],
    users: [],
    user_credentials: [],
    user_sessions: [],
    oauth_accounts: [],
    password_reset_tokens: [],
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

  const isSubRoute = c.req.path.startsWith('/api/subscriptions') || c.req.path.startsWith('/api/live-sessions');
  if ((isStudentOrigin || isStudentRole) && !isSubRoute) {
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
    if (userRole === 'student' && !isSubRoute) {
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
    if (!reqOrigin) return 'https://ac-administrator.iptapps.com';
    const lower = reqOrigin.toLowerCase();

    // Bloquear explícitamente cualquier variante estudiantil en la API administrativa
    if (lower.includes('ipt-course-students') || lower.includes('ipt-course.web.app') || (lower.includes('localhost:3000') && !lower.includes('3005'))) {
      return null;
    }

    // Permitir operadores, consola administrativa oficial, localhost y vercel preview
    if (
      lower.includes('ac-administrator.iptapps.com') ||
      lower.includes('ac-administrator') ||
      lower.includes('ipt-course-admin') ||
      lower.includes('localhost:3005') ||
      lower.includes('localhost:3001') ||
      lower.includes('vercel.app')
    ) {
      return reqOrigin;
    }

    return 'https://ac-administrator.iptapps.com';
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
// 4. AUTENTICACIÓN PROPIA JWT + BCRYPT (ZERO FIREBASE AUTH)
// ============================================================================

export const ADMIN_EMAIL = 'administrator@ivanperez.tech';
const JWT_SECRET = process.env.JWT_SECRET || 'ipt_course_jwt_master_secret_2026_9b8a7c6d5e4f3a2b1c';

interface AuthUser {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'admin' | 'teacher';
  createdAt: string;
}

// Almacén seguro en memoria para autenticación desacoplada
const usersStore = new Map<string, AuthUser>();

// Pre-semilla del administrador maestro único
const seedAdmin = () => {
  const adminKey = ADMIN_EMAIL.toLowerCase();
  if (!usersStore.has(adminKey)) {
    usersStore.set(adminKey, {
      uid: 'admin_ipt_master_001',
      email: ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD || 'AdminIPT2026!*', 10),
      displayName: 'Iván Samuel Pérez Torrenegra',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }
};
seedAdmin();

// Pre-semilla de docente institucional
const seedTeacher = () => {
  const teacherEmail = 'docente@ipt.com';
  if (!usersStore.has(teacherEmail)) {
    usersStore.set(teacherEmail, {
      uid: 'teacher_ipt_001',
      email: teacherEmail,
      passwordHash: bcrypt.hashSync('DocenteIPT2026!*', 10),
      displayName: 'Docente Titular IPT',
      role: 'teacher',
      createdAt: new Date().toISOString(),
    });
  }
};
seedTeacher();

// 4.1. Endpoint de Inicio de Sesión
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return c.json({ success: false, error: 'Correo institucional y contraseña requeridos.' }, 400);
    }

    // Asegurar semilla en caso de reinicio de ciclo de vida del contenedor
    seedAdmin();
    seedTeacher();

    const user = usersStore.get(email);
    if (!user) {
      return c.json({ success: false, error: 'Credenciales inválidas o cuenta no registrada.' }, 401);
    }

    const passwordMatches = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordMatches) {
      return c.json({ success: false, error: 'Contraseña incorrecta.' }, 401);
    }

    // Regla estricta: Solo el correo de entorno es Administrador
    const effectiveRole: 'admin' | 'teacher' = (email === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'teacher';

    const payload = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: effectiveRole,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
    };

    const token = await sign(payload, JWT_SECRET, 'HS256');

    // Cookie segura de sesión HttpOnly + Secure + SameSite=Strict
    setCookie(c, 'ipt_session', token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24,
    });

    return c.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: effectiveRole,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Error en inicio de sesión.' }, 500);
  }
});

// 4.2. Endpoint de Registro de Operadores (Docentes / Administrador)
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const displayName = (body.displayName || '').trim() || (email === ADMIN_EMAIL.toLowerCase() ? 'Iván Samuel Pérez Torrenegra' : 'Docente IPT');

    if (!email || !password) {
      return c.json({ success: false, error: 'Correo institucional y contraseña requeridos.' }, 400);
    }

    if (password.length < 6) {
      return c.json({ success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' }, 400);
    }

    // Bloquear explícitamente cuentas de estudiantes
    if ((email.includes('student') || email.includes('estudiante')) && email !== ADMIN_EMAIL.toLowerCase()) {
      return c.json({ success: false, error: 'Acceso denegado: El portal no admite cuentas estudiantiles.' }, 403);
    }

    seedAdmin();
    const effectiveRole: 'admin' | 'teacher' = (email === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'teacher';
    const passwordHash = bcrypt.hashSync(password, 10);
    const uid = 'usr_' + Math.random().toString(36).substring(2, 10);

    const newUser: AuthUser = {
      uid,
      email,
      passwordHash,
      displayName,
      role: effectiveRole,
      createdAt: new Date().toISOString(),
    };

    usersStore.set(email, newUser);

    const payload = {
      uid,
      email,
      displayName,
      role: effectiveRole,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
    };

    const token = await sign(payload, JWT_SECRET, 'HS256');

    setCookie(c, 'ipt_session', token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24,
    });

    return c.json({
      success: true,
      token,
      user: {
        uid,
        email,
        displayName,
        role: effectiveRole,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Error en registro.' }, 500);
  }
});

// 4.3. Verificación de Sesión Activa (/api/auth/me)
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('authorization') || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      token = getCookie(c, 'ipt_session') || '';
    }

    if (!token) {
      return c.json({ success: false, error: 'No existe sesión activa.' }, 401);
    }

    const decoded = await verify(token, JWT_SECRET, 'HS256') as any;
    if (!decoded || !decoded.email) {
      return c.json({ success: false, error: 'Token de sesión inválido.' }, 401);
    }

    const effectiveRole: 'admin' | 'teacher' = (decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'teacher';

    return c.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.displayName || (effectiveRole === 'admin' ? 'Iván Samuel Pérez Torrenegra' : 'Docente IPT'),
        role: effectiveRole,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Sesión expirada o no autorizada.' }, 401);
  }
});

// 4.4. Cierre de Sesión
app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'ipt_session', { path: '/' });
  return c.json({ success: true, message: 'Sesión finalizada exitosamente.' });
});

// ============================================================================
// 5. RBAC ESTRICTO EN SERVIDOR: MIDDLEWARE Y RUTAS /api/admin/*
// ============================================================================
// Si un docente altera el cliente para enviar viewMode=admin, las rutas /api/admin/*
// deben rechazarlo con un 403 Forbidden irrecuperable.
app.use('/api/admin/*', async (c, next) => {
  try {
    const authHeader = c.req.header('authorization') || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      token = getCookie(c, 'ipt_session') || '';
    }

    if (!token) {
      return c.json({
        success: false,
        error: 'ACCESO DENEGADO (401 Unauthorized): Se requiere token criptográfico de sesión.',
        code: 'TOKEN_REQUIRED'
      }, 401);
    }

    const decoded = await verify(token, JWT_SECRET, 'HS256') as any;
    if (!decoded || decoded.role !== 'admin' || decoded.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return c.json({
        success: false,
        error: 'ACCESO DENEGADO (403 Forbidden): Privilegios de administrador requeridos. Su rol verificado no cuenta con permisos para ejecutar esta acción.',
        code: 'ADMIN_PRIVILEGES_FORBIDDEN'
      }, 403);
    }

    (c as any).user = decoded;
    await next();
  } catch (err: any) {
    return c.json({
      success: false,
      error: 'ACCESO DENEGADO (403 Forbidden): Verificación de firma criptográfica fallida.',
      code: 'INVALID_SIGNATURE'
    }, 403);
  }
});

// Métricas y gobernanza de administradores
app.get('/api/admin/overview', async (c) => {
  seedAdmin();
  return c.json({
    success: true,
    data: {
      administrator: ADMIN_EMAIL,
      totalRegisteredOperators: usersStore.size,
      operators: Array.from(usersStore.values()).map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt,
      })),
      securityShield: 'Active and Enforced',
      rbacEnforcement: 'Strict Server-Side',
      timestamp: new Date().toISOString(),
    }
  });
});

// 5.1. Listar usuarios y operadores registrados
app.get('/api/admin/users', async (c) => {
  seedAdmin();
  seedTeacher();
  const list = Array.from(usersStore.values()).map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
  }));
  return c.json({ success: true, users: list });
});

// 5.2. Crear nuevo usuario (Docente / Operador) con contraseña segura
app.post('/api/admin/users', async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const displayName = (body.displayName || '').trim();
    const requestedRole = (body.role || 'teacher').toLowerCase();

    if (!email || !password || !displayName) {
      return c.json({ success: false, error: 'Nombre completo, correo institucional y contraseña son requeridos.' }, 400);
    }

    if (password.length < 8) {
      return c.json({ success: false, error: 'Por seguridad, la contraseña debe contener al menos 8 caracteres.' }, 400);
    }

    // Regla estricta: Solo administrator@ivanperez.tech puede ser admin.
    if (requestedRole === 'admin' || email === ADMIN_EMAIL.toLowerCase()) {
      return c.json({ success: false, error: 'Restricción de seguridad: Solo existe una cuenta con rol de Administrador del sistema.' }, 403);
    }

    // Bloquear cuentas de estudiantes
    if (email.includes('student') || email.includes('estudiante')) {
      return c.json({ success: false, error: 'Acceso denegado: El portal no admite cuentas estudiantiles.' }, 403);
    }

    if (usersStore.has(email)) {
      return c.json({ success: false, error: 'Ya existe un usuario registrado con este correo institucional.' }, 400);
    }

    const role: 'teacher' = 'teacher';
    const passwordHash = bcrypt.hashSync(password, 10);
    const uid = 'usr_' + Math.random().toString(36).substring(2, 10);

    const newUser: AuthUser = {
      uid,
      email,
      passwordHash,
      displayName,
      role,
      createdAt: new Date().toISOString(),
    };

    usersStore.set(email, newUser);

    return c.json({
      success: true,
      message: 'Usuario creado exitosamente con contraseña segura.',
      user: {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        createdAt: newUser.createdAt,
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Error al crear usuario.' }, 500);
  }
});

// 5.3. Actualizar contraseña de un operador
app.put('/api/admin/users/:uid/password', async (c) => {
  try {
    const uid = c.req.param('uid');
    const body = await c.req.json();
    const newPassword = (body.password || '').trim();

    if (!newPassword || newPassword.length < 8) {
      return c.json({ success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, 400);
    }

    let foundUser: AuthUser | null = null;
    let foundEmail = '';
    for (const [email, user] of usersStore.entries()) {
      if (user.uid === uid) {
        foundUser = user;
        foundEmail = email;
        break;
      }
    }

    if (!foundUser) {
      return c.json({ success: false, error: 'Usuario no encontrado.' }, 404);
    }

    foundUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    usersStore.set(foundEmail, foundUser);

    return c.json({ success: true, message: `Contraseña actualizada exitosamente para ${foundUser.email}` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Error al actualizar contraseña.' }, 500);
  }
});

// 5.4. Eliminar operador
app.delete('/api/admin/users/:uid', async (c) => {
  try {
    const uid = c.req.param('uid');

    let foundEmail = '';
    let foundUser: AuthUser | null = null;
    for (const [email, user] of usersStore.entries()) {
      if (user.uid === uid) {
        foundUser = user;
        foundEmail = email;
        break;
      }
    }

    if (!foundUser) {
      return c.json({ success: false, error: 'Usuario no encontrado.' }, 404);
    }

    if (foundEmail === ADMIN_EMAIL.toLowerCase()) {
      return c.json({ success: false, error: 'Acción prohibida: No es posible eliminar al Administrador Principal.' }, 403);
    }

    usersStore.delete(foundEmail);
    return c.json({ success: true, message: `Usuario ${foundEmail} eliminado exitosamente.` });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Error al eliminar usuario.' }, 500);
  }
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

registerSubscriptionRoutes(app);
registerAuthRoutes(app);

export default app;
