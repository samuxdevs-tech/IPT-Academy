/**
 * Servicio de Cliente para IPT Auth (Sistema Propio de Autenticación)
 * Comunicación directa con el backend Hono / Cloudflare D1 en el Edge.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_TASK_API_URL ||
  'https://ipt-course-api.samuxdevs.workers.dev';

export interface IptAuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'instructor' | 'operator' | 'owner';
}

export interface AuthResponse {
  success: boolean;
  user?: IptAuthUser;
  error?: string;
  message?: string;
}

export class IptAuthService {
  /**
   * Inicia sesión con correo electrónico y contraseña
   */
  static async login(emailRaw: string, passwordRaw: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailRaw, password: passwordRaw }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Credenciales inválidas o cuenta no registrada.',
        };
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('ipt_auth_user_v3', JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con el servidor de autenticación.' };
    }
  }

  /**
   * Registra una nueva cuenta de estudiante con email y contraseña
   */
  static async register(
    emailRaw: string,
    passwordRaw: string,
    displayNameRaw: string
  ): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailRaw,
          password: passwordRaw,
          displayName: displayNameRaw,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'No se pudo completar el registro.',
        };
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('ipt_auth_user_v3', JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al registrar cuenta.' };
    }
  }

  /**
   * Autenticación directa con credencial de Google OAuth
   */
  static async verifyGoogleOAuth(idToken: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/oauth/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Error verificando la credencial de Google.',
        };
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('ipt_auth_user_v3', JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error conectando con Google OAuth.' };
    }
  }

  /**
   * Autenticación institucional o corporativa (SSO)
   */
  static async verifyCorporateSSO(
    email: string,
    corporateCode: string,
    displayName?: string
  ): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/sso/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, corporateCode, displayName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Acceso corporativo denegado o código inválido.',
        };
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('ipt_auth_user_v3', JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error conectando con el servicio SSO.' };
    }
  }

  /**
   * Solicita el enlace de recuperación de contraseña (despachado por Resend)
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      return {
        success: data.success ?? true,
        message: data.message || 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error solicitando recuperación de contraseña.',
      };
    }
  }

  /**
   * Restablece la contraseña usando el token temporal recibido por email
   */
  static async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.error || 'El enlace de recuperación es inválido o expiró.',
          error: data.error,
        };
      }

      return {
        success: true,
        message: data.message || 'Contraseña actualizada correctamente.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al restablecer la contraseña.',
        error: err.message,
      };
    }
  }

  /**
   * Consulta el usuario autenticado actualmente mediante la cookie segura
   */
  static async getCurrentUser(): Promise<IptAuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ipt_auth_user_v3', JSON.stringify(data.user));
        }
        return data.user;
      }
      return null;
    } catch {
      // Fallback a localStorage si la red falla temporalmente
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('ipt_auth_user_v3');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {}
        }
      }
      return null;
    }
  }

  /**
   * Cierra sesión y revoca la cookie en el servidor
   */
  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('ipt_auth_user_v3');
      sessionStorage.clear();
    }
  }
}
