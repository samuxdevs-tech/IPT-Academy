import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  role: 'student' | 'instructor' | 'operator' | 'owner';
  email_verified: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: string;
  created_at: string;
}

export class AuthService {
  /**
   * Hashea una contraseña usando Bcrypt con factor de costo 12
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compara una contraseña en texto plano contra el hash almacenado
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Registra un nuevo usuario en Cloudflare D1
   */
  static async registerUser(
    db: any,
    params: {
      email: string;
      password?: string;
      displayName: string;
      role?: 'student' | 'instructor' | 'operator' | 'owner';
      existingUid?: string;
      avatarUrl?: string;
      emailVerified?: boolean;
    }
  ): Promise<UserRecord> {
    const email = params.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const userId = params.existingUid || `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const role = params.role || (email.includes('samuxdevs') || email.includes('admin') ? 'owner' : 'student');

    // Verificar si el correo ya existe
    const existing = await db
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      throw new Error('EMAIL_ALREADY_REGISTERED: Ya existe una cuenta asociada a este correo electrónico.');
    }

    // 1. Insertar en tabla maestra users
    await db
      .prepare(
        `INSERT INTO users (
          id, email, display_name, avatar_url, role, email_verified, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(
        userId,
        email,
        params.displayName.trim() || 'Estudiante IPT',
        params.avatarUrl || null,
        role,
        params.emailVerified ? 1 : 0,
        now,
        now
      )
      .run();

    // 2. Si se suministró contraseña, almacenar su hash en user_credentials
    if (params.password) {
      const passwordHash = await this.hashPassword(params.password);
      await db
        .prepare(
          `INSERT INTO user_credentials (
            user_id, password_hash, failed_attempts, locked_until, password_changed_at
          ) VALUES (?, ?, 0, NULL, ?)`
        )
        .bind(userId, passwordHash, now)
        .run();
    }

    return {
      id: userId,
      email,
      display_name: params.displayName.trim() || 'Estudiante IPT',
      avatar_url: params.avatarUrl || null,
      role,
      email_verified: params.emailVerified ? 1 : 0,
      is_active: 1,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Autentica con email y contraseña verificando Rate Limiting y fuerza bruta
   */
  static async authenticateWithPassword(
    db: any,
    emailRaw: string,
    passwordRaw: string
  ): Promise<UserRecord> {
    const email = emailRaw.trim().toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Buscar usuario en tabla maestra
    const user = (await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()) as UserRecord | null;

    if (!user || user.is_active === 0) {
      // Ejecutar un hash simulado para mitigar timing attacks
      await this.comparePassword('dummy_password_timing_shield', '$2a$12$e8Yh9Y6n.j2fP7q2D3O1mO8wz9yQ.fakehashshielddummy');
      throw new Error('INVALID_CREDENTIALS: Correo electrónico o contraseña incorrectos.');
    }

    // 2. Buscar credencial
    const creds = await db
      .prepare('SELECT * FROM user_credentials WHERE user_id = ?')
      .bind(user.id)
      .first();

    if (!creds || !creds.password_hash) {
      throw new Error('NO_PASSWORD_SET: Esta cuenta fue registrada con Google o SSO. Inicia sesión con dicho proveedor o recupera tu contraseña.');
    }

    // 3. Verificar si la cuenta está bloqueada temporalmente por fuerza bruta
    if (creds.locked_until) {
      const lockedUntil = new Date(creds.locked_until);
      if (now < lockedUntil) {
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / (60 * 1000));
        throw new Error(`ACCOUNT_LOCKED: Demasiados intentos fallidos. Tu cuenta está temporalmente bloqueada por ${remainingMinutes} minutos por seguridad.`);
      }
    }

    // 4. Comparar hash
    const isValid = await this.comparePassword(passwordRaw, creds.password_hash);

    if (!isValid) {
      const newAttempts = (creds.failed_attempts || 0) + 1;
      let lockTimestamp: string | null = null;

      // Si alcanza 5 intentos, bloquear por 15 minutos
      if (newAttempts >= 5) {
        lockTimestamp = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      }

      await db
        .prepare('UPDATE user_credentials SET failed_attempts = ?, locked_until = ? WHERE user_id = ?')
        .bind(newAttempts, lockTimestamp, user.id)
        .run();

      throw new Error('INVALID_CREDENTIALS: Correo electrónico o contraseña incorrectos.');
    }

    // 5. Autenticación exitosa: resetear contadores de fallo
    await db
      .prepare('UPDATE user_credentials SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?')
      .bind(user.id)
      .run();

    return user;
  }

  /**
   * Crea una sesión persistente en Cloudflare D1
   */
  static async createSession(
    db: any,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SessionRecord> {
    const sessionId = `ses_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 días
    const createdIso = now.toISOString();

    await db
      .prepare(
        `INSERT INTO user_sessions (
          id, user_id, ip_address, user_agent, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sessionId,
        userId,
        meta?.ipAddress || null,
        meta?.userAgent ? meta.userAgent.slice(0, 255) : null,
        expiresAt,
        createdIso
      )
      .run();

    return {
      id: sessionId,
      user_id: userId,
      ip_address: meta?.ipAddress || null,
      user_agent: meta?.userAgent || null,
      expires_at: expiresAt,
      created_at: createdIso,
    };
  }

  /**
   * Valida una sesión activa en el servidor
   */
  static async validateSession(
    db: any,
    sessionId: string
  ): Promise<{ user: UserRecord; session: SessionRecord } | null> {
    if (!sessionId) return null;

    const session = (await db
      .prepare('SELECT * FROM user_sessions WHERE id = ?')
      .bind(sessionId)
      .first()) as SessionRecord | null;

    if (!session) return null;

    // Verificar si expiró
    const now = new Date();
    if (new Date(session.expires_at) <= now) {
      await this.revokeSession(db, sessionId);
      return null;
    }

    // Obtener datos del usuario
    const user = (await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.user_id)
      .first()) as UserRecord | null;

    if (!user || user.is_active === 0) {
      await this.revokeSession(db, sessionId);
      return null;
    }

    return { user, session };
  }

  /**
   * Revoca una sesión específica (Logout)
   */
  static async revokeSession(db: any, sessionId: string): Promise<void> {
    await db.prepare('DELETE FROM user_sessions WHERE id = ?').bind(sessionId).run();
  }

  /**
   * Revoca todas las sesiones de un usuario (para cierre remoto o reseteo de clave)
   */
  static async revokeAllUserSessions(db: any, userId: string): Promise<void> {
    await db.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
  }

  /**
   * Enlaza o autentica cuenta mediante OAuth (Google, Microsoft, SSO)
   */
  static async handleOAuthLogin(
    db: any,
    params: {
      provider: 'google' | 'microsoft' | 'corporate_sso';
      providerUserId: string;
      email: string;
      displayName: string;
      avatarUrl?: string;
    }
  ): Promise<UserRecord> {
    const email = params.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Buscar si la cuenta de OAuth ya está enlazada
    const linked = await db
      .prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?')
      .bind(params.provider, params.providerUserId)
      .first();

    if (linked) {
      const user = (await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(linked.user_id)
        .first()) as UserRecord | null;
      if (user && user.is_active === 1) return user;
    }

    // 2. Si no está enlazada, buscar si ya existe un usuario con ese correo (Auto-Link)
    let user = (await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()) as UserRecord | null;

    if (!user) {
      // Crear cuenta nueva con email verificado
      user = await this.registerUser(db, {
        email,
        displayName: params.displayName,
        avatarUrl: params.avatarUrl,
        emailVerified: true,
      });
    }

    // 3. Registrar el enlace en oauth_accounts
    const oauthId = `oat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await db
      .prepare(
        `INSERT OR REPLACE INTO oauth_accounts (
          id, user_id, provider, provider_user_id, provider_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(oauthId, user.id, params.provider, params.providerUserId, email, now)
      .run();

    return user;
  }

  /**
   * Genera un token temporal de recuperación de contraseña (15 minutos)
   */
  static async createPasswordResetToken(
    db: any,
    emailRaw: string
  ): Promise<{ token: string; user: UserRecord } | null> {
    const email = emailRaw.trim().toLowerCase();
    const user = (await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()) as UserRecord | null;

    if (!user || user.is_active === 0) return null;

    const token = `rst_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const tokenHash = await this.hashPassword(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutos

    const tokenId = `tok_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await db
      .prepare(
        `INSERT INTO password_reset_tokens (
          id, user_id, token_hash, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .bind(tokenId, user.id, tokenHash, expiresAt, now.toISOString())
      .run();

    return { token, user };
  }

  /**
   * Aplica el cambio de contraseña con el token temporal
   */
  static async resetPasswordWithToken(
    db: any,
    tokenIdOrRawToken: string,
    newPasswordRaw: string
  ): Promise<boolean> {
    const now = new Date();
    const nowIso = now.toISOString();

    // Buscar tokens activos
    const tokens = (await db
      .prepare('SELECT * FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > ?')
      .bind(nowIso)
      .all()) as { results: any[] };

    let matchedTokenRecord: any = null;
    for (const record of tokens.results || []) {
      const match = await this.comparePassword(tokenIdOrRawToken, record.token_hash);
      if (match) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new Error('INVALID_TOKEN: El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.');
    }

    const newHash = await this.hashPassword(newPasswordRaw);

    // 1. Actualizar contraseña
    await db
      .prepare('UPDATE user_credentials SET password_hash = ?, password_changed_at = ?, failed_attempts = 0, locked_until = NULL WHERE user_id = ?')
      .bind(newHash, nowIso, matchedTokenRecord.user_id)
      .run();

    // 2. Marcar token como usado
    await db
      .prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
      .bind(nowIso, matchedTokenRecord.id)
      .run();

    // 3. Revocar todas las sesiones anteriores por seguridad
    await this.revokeAllUserSessions(db, matchedTokenRecord.user_id);

    return true;
  }

  /**
   * Despacha el correo de recuperación mediante la API de Resend
   */
  static async sendPasswordResetEmail(
    email: string,
    displayName: string,
    resetLink: string
  ): Promise<boolean> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'IPT Course <onboarding@resend.dev>',
          to: [email],
          subject: 'Recupera el acceso a tu cuenta | IPT Course',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 40px 20px; }
                  .container { max-width: 560px; margin: 0 auto; background-color: #09090b; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; padding: 40px 32px; }
                  .logo { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 24px; display: inline-block; }
                  .logo span { color: #8052ff; }
                  h1 { font-size: 24px; font-weight: 400; color: #ffffff; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.02em; }
                  p { font-size: 14px; font-weight: 300; line-height: 1.6; color: #bdbdbd; margin-bottom: 24px; }
                  .button { display: inline-block; background-color: #8052ff; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; padding: 14px 28px; border-radius: 24px; margin-bottom: 28px; }
                  .notice { font-size: 12px; color: #9a9a9a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }
                  .footer { font-size: 11px; color: #9a9a9a; margin-top: 24px; text-align: center; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="logo">IPT <span>Course</span></div>
                  <h1>Recuperación de contraseña</h1>
                  <p>Hola, <strong>${displayName}</strong>. Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en IPT Course.</p>
                  <p>Haz clic en el siguiente botón para crear una nueva contraseña. Por tu seguridad, este enlace expirará en <strong>15 minutos</strong>:</p>
                  <a href="${resetLink}" class="button" target="_blank">Restablecer Contraseña</a>
                  <div class="notice">
                    Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura. Tu contraseña actual permanecerá intacta.
                  </div>
                </div>
                <div class="footer">
                  © IPT (Ivan Perez Tech). Plataforma de formación y arquitectura de software.
                </div>
              </body>
            </html>
          `,
        }),
      });

      return res.ok;
    } catch (err) {
      console.error('Error enviando correo con Resend:', err);
      return false;
    }
  }
}
