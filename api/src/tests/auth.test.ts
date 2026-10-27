import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../services/authService';

// Mock de base de datos en memoria para pruebas unitarias de D1
class MockD1Db {
  public users: any[] = [];
  public credentials: any[] = [];
  public sessions: any[] = [];
  public oauthAccounts: any[] = [];
  public resetTokens: any[] = [];

  prepare(sql: string) {
    const s = sql.trim().toUpperCase();

    return {
      bind: (...args: any[]) => {
        return {
          first: async () => {
            if (s.includes('FROM USERS WHERE EMAIL = ?')) {
              return this.users.find((u) => u.email === args[0]) || null;
            }
            if (s.includes('FROM USERS WHERE ID = ?')) {
              return this.users.find((u) => u.id === args[0]) || null;
            }
            if (s.includes('FROM USER_CREDENTIALS WHERE USER_ID = ?')) {
              return this.credentials.find((c) => c.user_id === args[0]) || null;
            }
            if (s.includes('FROM USER_SESSIONS WHERE ID = ?')) {
              return this.sessions.find((sess) => sess.id === args[0]) || null;
            }
            if (s.includes('FROM OAUTH_ACCOUNTS WHERE PROVIDER = ? AND PROVIDER_USER_ID = ?')) {
              return this.oauthAccounts.find((o) => o.provider === args[0] && o.provider_user_id === args[1]) || null;
            }
            return null;
          },
          all: async () => {
            if (s.includes('FROM PASSWORD_RESET_TOKENS WHERE USED_AT IS NULL')) {
              const now = new Date(args[0]);
              const valid = this.resetTokens.filter((r) => !r.used_at && new Date(r.expires_at) > now);
              return { results: valid };
            }
            return { results: [] };
          },
          run: async () => {
            if (s.includes('INSERT INTO USERS')) {
              this.users.push({
                id: args[0],
                email: args[1],
                display_name: args[2],
                avatar_url: args[3],
                role: args[4],
                email_verified: args[5],
                is_active: 1,
                created_at: args[6],
                updated_at: args[7],
              });
            } else if (s.includes('INSERT INTO USER_CREDENTIALS')) {
              this.credentials.push({
                user_id: args[0],
                password_hash: args[1],
                failed_attempts: 0,
                locked_until: null,
                password_changed_at: args[2],
              });
            } else if (s.includes('UPDATE USER_CREDENTIALS SET FAILED_ATTEMPTS = ?, LOCKED_UNTIL = ?')) {
              const cred = this.credentials.find((c) => c.user_id === args[2]);
              if (cred) {
                cred.failed_attempts = args[0];
                cred.locked_until = args[1];
              }
            } else if (s.includes('UPDATE USER_CREDENTIALS SET FAILED_ATTEMPTS = 0, LOCKED_UNTIL = NULL')) {
              const cred = this.credentials.find((c) => c.user_id === args[0]);
              if (cred) {
                cred.failed_attempts = 0;
                cred.locked_until = null;
              }
            } else if (s.includes('INSERT INTO USER_SESSIONS')) {
              this.sessions.push({
                id: args[0],
                user_id: args[1],
                ip_address: args[2],
                user_agent: args[3],
                expires_at: args[4],
                created_at: args[5],
              });
            } else if (s.includes('DELETE FROM USER_SESSIONS WHERE ID = ?')) {
              this.sessions = this.sessions.filter((sess) => sess.id !== args[0]);
            } else if (s.includes('DELETE FROM USER_SESSIONS WHERE USER_ID = ?')) {
              this.sessions = this.sessions.filter((sess) => sess.user_id !== args[0]);
            } else if (s.includes('INSERT OR REPLACE INTO OAUTH_ACCOUNTS')) {
              this.oauthAccounts.push({
                id: args[0],
                user_id: args[1],
                provider: args[2],
                provider_user_id: args[3],
                provider_email: args[4],
                created_at: args[5],
              });
            } else if (s.includes('INSERT INTO PASSWORD_RESET_TOKENS')) {
              this.resetTokens.push({
                id: args[0],
                user_id: args[1],
                token_hash: args[2],
                expires_at: args[3],
                used_at: null,
                created_at: args[4],
              });
            } else if (s.includes('UPDATE USER_CREDENTIALS SET PASSWORD_HASH = ?')) {
              const cred = this.credentials.find((c) => c.user_id === args[2]);
              if (cred) {
                cred.password_hash = args[0];
                cred.password_changed_at = args[1];
                cred.failed_attempts = 0;
                cred.locked_until = null;
              }
            } else if (s.includes('UPDATE PASSWORD_RESET_TOKENS SET USED_AT = ?')) {
              const tok = this.resetTokens.find((r) => r.id === args[1]);
              if (tok) tok.used_at = args[0];
            }
            return { success: true };
          },
        };
      },
    };
  }
}

describe('IPT Auth — Sistema de Autenticación Propio', () => {
  it('1. Registra un usuario y hashea su contraseña con Bcrypt', async () => {
    const db = new MockD1Db();
    const user = await AuthService.registerUser(db, {
      email: 'alumno@ipt.com',
      password: 'SuperPassword2026!*',
      displayName: 'Carlos Alumno',
      role: 'student',
    });

    assert.strictEqual(user.email, 'alumno@ipt.com');
    assert.strictEqual(user.role, 'student');
    assert.strictEqual(db.users.length, 1);
    assert.strictEqual(db.credentials.length, 1);

    // Verificar que la contraseña no se guarde en texto plano
    assert.notStrictEqual(db.credentials[0].password_hash, 'SuperPassword2026!*');
    assert.ok(db.credentials[0].password_hash.startsWith('$2'));
  });

  it('2. Autentica exitosamente con credenciales válidas', async () => {
    const db = new MockD1Db();
    await AuthService.registerUser(db, {
      email: 'estudiante@ipt.com',
      password: 'CorrectPassword123!',
      displayName: 'Estudiante Prueba',
    });

    const authenticatedUser = await AuthService.authenticateWithPassword(
      db,
      'estudiante@ipt.com',
      'CorrectPassword123!'
    );

    assert.strictEqual(authenticatedUser.email, 'estudiante@ipt.com');
  });

  it('3. Falla con credenciales incorrectas e incrementa el contador de fallos', async () => {
    const db = new MockD1Db();
    await AuthService.registerUser(db, {
      email: 'seguridad@ipt.com',
      password: 'SecurePassword123!',
      displayName: 'Usuario Seguro',
    });

    await assert.rejects(
      async () => {
        await AuthService.authenticateWithPassword(db, 'seguridad@ipt.com', 'ClaveIncorrecta');
      },
      { message: /INVALID_CREDENTIALS/ }
    );

    assert.strictEqual(db.credentials[0].failed_attempts, 1);
  });

  it('4. Bloquea la cuenta temporalmente tras 5 intentos fallidos (Protección Fuerza Bruta)', async () => {
    const db = new MockD1Db();
    await AuthService.registerUser(db, {
      email: 'bruteforce@ipt.com',
      password: 'SecretPassword999!',
      displayName: 'Víctima de Ataque',
    });

    for (let i = 0; i < 5; i++) {
      try {
        await AuthService.authenticateWithPassword(db, 'bruteforce@ipt.com', 'IntentoErrado');
      } catch {}
    }

    assert.strictEqual(db.credentials[0].failed_attempts, 5);
    assert.ok(db.credentials[0].locked_until !== null);

    // El 6to intento debe ser rechazado inmediatamente por ACCOUNT_LOCKED
    await assert.rejects(
      async () => {
        await AuthService.authenticateWithPassword(db, 'bruteforce@ipt.com', 'SecretPassword999!');
      },
      { message: /ACCOUNT_LOCKED/ }
    );
  });

  it('5. Crea y valida sesiones en servidor, y las revoca instantáneamente (Logout)', async () => {
    const db = new MockD1Db();
    const user = await AuthService.registerUser(db, {
      email: 'sesiones@ipt.com',
      displayName: 'Usuario Sesión',
    });

    const session = await AuthService.createSession(db, user.id, {
      ipAddress: '190.25.10.5',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    assert.ok(session.id.startsWith('ses_'));
    assert.strictEqual(db.sessions.length, 1);

    // Validar sesión activa
    const validated = await AuthService.validateSession(db, session.id);
    assert.ok(validated !== null);
    assert.strictEqual(validated?.user.id, user.id);

    // Revocar sesión
    await AuthService.revokeSession(db, session.id);
    assert.strictEqual(db.sessions.length, 0);

    const afterRevoke = await AuthService.validateSession(db, session.id);
    assert.strictEqual(afterRevoke, null);
  });

  it('6. Maneja OAuth con Google y vinculación automática (Auto-Link)', async () => {
    const db = new MockD1Db();

    // 1er Login con Google (Crea la cuenta automáticamente)
    const userGoogle = await AuthService.handleOAuthLogin(db, {
      provider: 'google',
      providerUserId: 'google_sub_1092830192',
      email: 'samuel@gmail.com',
      displayName: 'Samuel Google',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
    });

    assert.strictEqual(userGoogle.email, 'samuel@gmail.com');
    assert.strictEqual(db.oauthAccounts.length, 1);

    // 2do Login con el mismo Google ID (reconoce la cuenta existente)
    const userGoogleAgain = await AuthService.handleOAuthLogin(db, {
      provider: 'google',
      providerUserId: 'google_sub_1092830192',
      email: 'samuel@gmail.com',
      displayName: 'Samuel Google',
    });

    assert.strictEqual(userGoogleAgain.id, userGoogle.id);
  });

  it('7. Flujo completo de recuperación de contraseña con token temporal', async () => {
    const db = new MockD1Db();
    const user = await AuthService.registerUser(db, {
      email: 'olvido@ipt.com',
      password: 'OldPassword123!',
      displayName: 'Usuario Olvidadizo',
    });

    // 1. Crear token de 15 minutos
    const resetData = await AuthService.createPasswordResetToken(db, 'olvido@ipt.com');
    assert.ok(resetData !== null);
    assert.ok(resetData.token.startsWith('rst_'));
    assert.strictEqual(db.resetTokens.length, 1);

    // 2. Aplicar cambio con el token
    const success = await AuthService.resetPasswordWithToken(
      db,
      resetData.token,
      'NewSecurePassword999!*'
    );
    assert.strictEqual(success, true);
    assert.ok(db.resetTokens[0].used_at !== null);

    // 3. Iniciar sesión con la nueva contraseña
    const loggedIn = await AuthService.authenticateWithPassword(
      db,
      'olvido@ipt.com',
      'NewSecurePassword999!*'
    );
    assert.strictEqual(loggedIn.id, user.id);

    // 4. La contraseña vieja ya no funciona
    await assert.rejects(
      async () => {
        await AuthService.authenticateWithPassword(db, 'olvido@ipt.com', 'OldPassword123!');
      },
      { message: /INVALID_CREDENTIALS/ }
    );
  });
});
