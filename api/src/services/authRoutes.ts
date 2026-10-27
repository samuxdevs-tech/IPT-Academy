import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { AuthService } from './authService';

export function registerAuthRoutes(app: Hono<any>) {
  const SESSION_COOKIE_NAME = 'ipt_session_v3';

  // Helper para extraer la base de datos (D1 o Shim)
  const getDb = (c: any) => c.env?.DB || (c.get && c.get('DB'));

  // 1. Registro con Email y Contraseña
  app.post('/api/v1/auth/register', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const displayName = (body.displayName || body.fullName || '').trim();

      if (!email || !email.includes('@')) {
        return c.json({ success: false, error: 'Ingresa un correo electrónico válido.' }, 400);
      }

      if (!password || password.length < 6) {
        return c.json({ success: false, error: 'La contraseña debe contener al menos 6 caracteres.' }, 400);
      }

      const user = await AuthService.registerUser(db, {
        email,
        password,
        displayName: displayName || 'Estudiante IPT',
        role: 'student',
      });

      // Crear sesión en Cloudflare D1
      const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip');
      const userAgent = c.req.header('user-agent');
      const session = await AuthService.createSession(db, user.id, { ipAddress: ip, userAgent });

      // Settear Cookie HttpOnly
      setCookie(c, SESSION_COOKIE_NAME, session.id, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60, // 30 días
      });

      return c.json({
        success: true,
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
        },
      });
    } catch (err: any) {
      const message = err.message || 'Error registrando la cuenta.';
      const status = message.includes('ALREADY_REGISTERED') ? 409 : 500;
      return c.json({ success: false, error: message }, status);
    }
  });

  // 2. Inicio de Sesión con Email y Contraseña
  app.post('/api/v1/auth/login', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      if (!email || !password) {
        return c.json({ success: false, error: 'Correo electrónico y contraseña requeridos.' }, 400);
      }

      const user = await AuthService.authenticateWithPassword(db, email, password);

      // Crear sesión en Cloudflare D1
      const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip');
      const userAgent = c.req.header('user-agent');
      const session = await AuthService.createSession(db, user.id, { ipAddress: ip, userAgent });

      // Settear Cookie HttpOnly
      setCookie(c, SESSION_COOKIE_NAME, session.id, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60,
      });

      return c.json({
        success: true,
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
        },
      });
    } catch (err: any) {
      const message = err.message || 'Error iniciando sesión.';
      const status = message.includes('INVALID_CREDENTIALS') ? 401 : message.includes('ACCOUNT_LOCKED') ? 429 : 500;
      return c.json({ success: false, error: message }, status);
    }
  });

  // 3. Verificación de Sesión Actual (/me)
  app.get('/api/v1/auth/me', async (c) => {
    try {
      const db = getDb(c);
      const sessionId = getCookie(c, SESSION_COOKIE_NAME) || c.req.header('authorization')?.replace('Bearer ', '');

      if (!sessionId) {
        return c.json({ success: false, user: null }, 401);
      }

      const validated = await AuthService.validateSession(db, sessionId);
      if (!validated) {
        deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
        return c.json({ success: false, user: null }, 401);
      }

      return c.json({
        success: true,
        user: {
          uid: validated.user.id,
          email: validated.user.email,
          displayName: validated.user.display_name,
          role: validated.user.role,
        },
      });
    } catch (err: any) {
      return c.json({ success: false, user: null, error: err.message }, 500);
    }
  });

  // 4. Cierre de Sesión (Logout)
  app.post('/api/v1/auth/logout', async (c) => {
    try {
      const db = getDb(c);
      const sessionId = getCookie(c, SESSION_COOKIE_NAME);
      if (sessionId) {
        await AuthService.revokeSession(db, sessionId);
      }
      deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
      return c.json({ success: true, message: 'Sesión finalizada con éxito.' });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // 5. Solicitud de Recuperación de Contraseña (Despacho con Resend)
  app.post('/api/v1/auth/password/forgot', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const email = (body.email || '').trim().toLowerCase();

      if (!email || !email.includes('@')) {
        return c.json({ success: false, error: 'Ingresa un correo electrónico válido.' }, 400);
      }

      const resetData = await AuthService.createPasswordResetToken(db, email);

      if (resetData) {
        const origin = c.req.header('origin') || 'https://ipt-course-students.web.app';
        const resetLink = `${origin}/login?token=${encodeURIComponent(resetData.token)}&view=reset`;
        // Enviar correo transaccional de forma asíncrona
        await AuthService.sendPasswordResetEmail(email, resetData.user.display_name, resetLink);
      }

      // Por seguridad y privacidad, siempre devolver éxito para evitar enumeración de usuarios
      return c.json({
        success: true,
        message: 'Si la cuenta existe en nuestra plataforma, recibirás un enlace de recuperación en los próximos minutos.',
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // 6. Aplicar Cambio de Contraseña
  app.post('/api/v1/auth/password/reset', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const token = (body.token || '').trim();
      const newPassword = body.newPassword || '';

      if (!token) {
        return c.json({ success: false, error: 'El token de recuperación es requerido.' }, 400);
      }

      if (!newPassword || newPassword.length < 6) {
        return c.json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, 400);
      }

      await AuthService.resetPasswordWithToken(db, token, newPassword);

      return c.json({
        success: true,
        message: 'Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión.',
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message || 'Error restableciendo la contraseña.' }, 400);
    }
  });

  // 7. Google OAuth Directo (Verificación de ID Token o Credencial de Google)
  app.post('/api/v1/auth/oauth/google/verify', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const idToken = body.idToken || body.credential;

      if (!idToken) {
        return c.json({ success: false, error: 'Credencial de Google no recibida.' }, 400);
      }

      // Validar directamente con el endpoint de verificación oficial de Google
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!googleRes.ok) {
        return c.json({ success: false, error: 'Token de Google inválido o expirado.' }, 401);
      }

      const googlePayload = (await googleRes.json()) as any;
      const googleEmail = (googlePayload.email || '').trim().toLowerCase();
      const googleSub = googlePayload.sub;
      const googleName = googlePayload.name || 'Estudiante Google';
      const googleAvatar = googlePayload.picture;

      if (!googleEmail || !googleSub) {
        return c.json({ success: false, error: 'No se pudo verificar el correo de Google.' }, 400);
      }

      // Manejar Login / Auto-Link en Cloudflare D1
      const user = await AuthService.handleOAuthLogin(db, {
        provider: 'google',
        providerUserId: googleSub,
        email: googleEmail,
        displayName: googleName,
        avatarUrl: googleAvatar,
      });

      // Crear sesión segura
      const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip');
      const userAgent = c.req.header('user-agent');
      const session = await AuthService.createSession(db, user.id, { ipAddress: ip, userAgent });

      setCookie(c, SESSION_COOKIE_NAME, session.id, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60,
      });

      return c.json({
        success: true,
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
        },
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message || 'Error en autenticación con Google.' }, 500);
    }
  });

  // 8. Acceso Corporativo / Institucional (SSO)
  app.post('/api/v1/auth/sso/verify', async (c) => {
    try {
      const db = getDb(c);
      const body = await c.req.json();
      const ssoEmail = (body.email || '').trim().toLowerCase();
      const corporateCode = (body.corporateCode || '').trim();
      const displayName = (body.displayName || '').trim();

      if (!ssoEmail || !corporateCode) {
        return c.json({ success: false, error: 'Correo institucional y código de organización requeridos.' }, 400);
      }

      // Validar dominio institucional autorizado (ej. @empresa.com, @universidad.edu.co o código válido)
      const allowedDomains = ['@ivanperez.tech', '@ipt.com'];
      const hasAllowedDomain = allowedDomains.some((dom) => ssoEmail.endsWith(dom));
      const hasValidCode = corporateCode.toUpperCase().startsWith('IPT-ORG-') || corporateCode === 'CORP2026';

      if (!hasAllowedDomain && !hasValidCode) {
        return c.json({
          success: false,
          error: 'Organización no autorizada. Contacta al administrador de tu empresa para habilitar el convenio SSO.',
        }, 403);
      }

      // Manejar acceso corporativo en D1
      const user = await AuthService.handleOAuthLogin(db, {
        provider: 'corporate_sso',
        providerUserId: `sso_${corporateCode}_${ssoEmail}`,
        email: ssoEmail,
        displayName: displayName || `Miembro Institucional (${corporateCode})`,
      });

      const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip');
      const userAgent = c.req.header('user-agent');
      const session = await AuthService.createSession(db, user.id, { ipAddress: ip, userAgent });

      setCookie(c, SESSION_COOKIE_NAME, session.id, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60,
      });

      return c.json({
        success: true,
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
        },
      });
    } catch (err: any) {
      return c.json({ success: false, error: err.message || 'Error en autenticación corporativa SSO.' }, 500);
    }
  });
}
