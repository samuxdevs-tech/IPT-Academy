'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { IptLogoIcon } from '@/components/IptLogoIcon';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { IptAuthService } from '@/services/iptAuthService';
import {
  recordUserLegalAcceptance,
  LEGAL_DOCUMENTS,
  LegalSectionId
} from '@/lib/legalData';
import { AlertCircle, CheckCircle2, Scale, X, ArrowLeft } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetTokenParam = searchParams?.get('token') || '';
  const initialView = searchParams?.get('view') || '';
  const redirectTarget = searchParams?.get('redirect') || '/home';

  const [activeTab, setActiveTab] = useState<'personal' | 'corporate'>('personal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [corporateCode, setCorporateCode] = useState('');

  // Separación estricta de consentimiento legal
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [previewLegalSection, setPreviewLegalSection] = useState<LegalSectionId | null>(null);

  // Estados de recuperación de contraseña
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeResetToken, setActiveResetToken] = useState(resetTokenParam);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resetTokenParam) {
      setActiveResetToken(resetTokenParam);
      setIsResetMode(true);
    } else if (initialView === 'reset') {
      setIsResetMode(true);
    }
  }, [resetTokenParam, initialView]);

  const validateLegalCheckboxes = () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Debes marcar ambas casillas: aceptar el Aviso Legal / Términos y la Política de Privacidad.');
      return false;
    }
    return true;
  };

  // Manejo de Login Clásico / Personal
  const handlePersonalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateLegalCheckboxes()) return;

    setLoading(true);
    try {
      // 1. Autenticar primero contra el motor propio IPT Auth (Cloudflare D1)
      const res = await IptAuthService.login(email, password);

      if (!res.success) {
        // Fallback a Firebase Auth si es una cuenta que aún no sincronizó
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          await recordUserLegalAcceptance(cred.user, 'email_login');
          router.push(redirectTarget);
          return;
        } catch {
          setError(res.error || 'Credenciales incorrectas. Verifica tus datos o recupera tu contraseña.');
          setLoading(false);
          return;
        }
      }

      // 2. Conectar sesión en Firebase de forma sincronizada
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await recordUserLegalAcceptance(cred.user, 'email_login');
      } catch {}

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Acceso Corporativo / Institucional (SSO)
  const handleCorporateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateLegalCheckboxes()) return;

    setLoading(true);
    try {
      const res = await IptAuthService.verifyCorporateSSO(email, corporateCode);
      if (!res.success) {
        setError(res.error || 'Acceso corporativo no autorizado.');
        setLoading(false);
        return;
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error en autenticación institucional.');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Google OAuth Directo
  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');

    if (!validateLegalCheckboxes()) return;

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Sincronizar y registrar sesión en Cloudflare D1
      await IptAuthService.verifyGoogleOAuth(idToken);
      await recordUserLegalAcceptance(result.user, 'google_login');
      router.push('/');
    } catch (err: any) {
      setError('No se pudo completar el inicio de sesión con Google. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Solicitud de Recuperación de Contraseña (Despacho con Resend)
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa tu correo electrónico registrado.');
      return;
    }

    setLoading(true);
    try {
      const res = await IptAuthService.requestPasswordReset(email.trim());
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Error al solicitar recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmación de Nueva Contraseña con Token
  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await IptAuthService.confirmPasswordReset(activeResetToken, newPassword);
      if (!res.success) {
        setError(res.error || 'No se pudo actualizar la contraseña.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión.');
      setTimeout(() => {
        setIsResetMode(false);
        setActiveResetToken('');
        setPassword('');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el cambio de clave.');
    } finally {
      setLoading(false);
    }
  };

  const activeDoc = previewLegalSection
    ? LEGAL_DOCUMENTS.find((d) => d.id === previewLegalSection) || LEGAL_DOCUMENTS[0]
    : null;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-4 py-12 relative selection:bg-[#8052ff] selection:text-white">
      {/* Resplandor atmosférico Dala */}
      <div className="absolute inset-0 bg-radial from-[#8052ff]/10 via-transparent to-transparent pointer-events-none opacity-40 blur-3xl" />

      <div className="relative z-10 max-w-[480px] w-full bg-[#09090b] border border-[#ffffff]/15 rounded-[28px] p-8 sm:p-10 shadow-2xl animate-login-enter">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
            <IptLogoIcon className="w-9 h-9 transform group-hover:scale-105 transition-transform" />
            <span className="text-white text-[18px] font-semibold tracking-[-0.02em]">
              IPT <span className="font-light text-[#bdbdbd]">Academy</span>
            </span>
          </Link>
          <h1 className="text-[26px] font-normal text-white tracking-[-0.03em] mb-2">
            {isResetMode ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
          </h1>
          <p className="text-[13px] font-extralight text-[#9a9a9a]">
            {isResetMode
              ? 'Te enviaremos un enlace seguro para crear tu nueva clave'
              : 'Accede a tus cursos, evaluaciones y sesiones en vivo'}
          </p>
        </div>

        {/* Mensajes de Alerta */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#f43f5e]/10 border border-[#f43f5e]/30 flex items-start gap-3 text-[12px] text-white">
            <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-light">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#15846e]/15 border border-[#15846e]/40 flex items-start gap-3 text-[12px] text-white">
            <CheckCircle2 className="w-4 h-4 text-[#15846e] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-light">{successMessage}</span>
          </div>
        )}

        {isResetMode ? (
          /* =========================================================================
             MODO DE RECUPERACIÓN DE CONTRASEÑA
             ========================================================================= */
          activeResetToken ? (
            <form onSubmit={handleConfirmPasswordReset} className="space-y-5">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-[13px] font-semibold uppercase tracking-[0.025em] transition-all shadow-[0_0_20px_rgba(128,82,255,0.4)]"
              >
                {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestPasswordReset} className="space-y-5">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-2">
                  Correo Electrónico Registrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="estudiante@ejemplo.com"
                  className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-[13px] font-semibold uppercase tracking-[0.025em] transition-all shadow-[0_0_20px_rgba(128,82,255,0.4)]"
              >
                {loading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="text-[12px] text-[#9a9a9a] hover:text-white inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              </div>
            </form>
          )
        ) : (
          /* =========================================================================
             MODO DE INICIO DE SESIÓN
             ========================================================================= */
          <div>
            {/* Selector de Tipo de Acceso */}
            <div className="flex p-1 rounded-[24px] bg-[#000000] border border-[#ffffff]/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('personal');
                  setError('');
                }}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-[20px] transition-all ${
                  activeTab === 'personal'
                    ? 'bg-[#ffffff]/15 text-white'
                    : 'text-[#9a9a9a] hover:text-white'
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('corporate');
                  setError('');
                }}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-[20px] transition-all ${
                  activeTab === 'corporate'
                    ? 'bg-[#ffffff]/15 text-white'
                    : 'text-[#9a9a9a] hover:text-white'
                }`}
              >
                Corporativo / SSO
              </button>
            </div>

            {/* Botón de Google OAuth Oficial (Solo en pestaña personal) */}
            {activeTab === 'personal' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-[24px] bg-[#000000] border border-[#ffffff]/20 hover:border-[#8052ff] text-white text-[13px] font-semibold flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#ffffff]/10" />
                  </div>
                  <span className="relative px-4 bg-[#09090b] text-[11px] font-mono uppercase text-[#9a9a9a]">
                    O con correo
                  </span>
                </div>
              </>
            )}

            {/* Formulario según la pestaña */}
            {activeTab === 'personal' ? (
              <form onSubmit={handlePersonalLogin} className="space-y-4">
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-1.5">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudiante@ejemplo.com"
                    className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a]">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-[#ffb829] hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña secreta"
                    className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                    required
                  />
                </div>

                {/* Doble Casilla Legal Independiente */}
                <div className="space-y-2 pt-1">
                  {/* Check 1: Aviso Legal y Términos */}
                  <div className="p-3 rounded-2xl bg-[#000000] border border-[#ffffff]/10">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked && acceptedPrivacy) setError('');
                        }}
                        className="w-4 h-4 mt-0.5 accent-[#8052ff] shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-[#bdbdbd] font-extralight leading-relaxed">
                        Acepto el{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('aviso_legal')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Aviso Legal
                        </button>
                        , los{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('terminos')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Términos de Servicio
                        </button>{' '}
                        y las cláusulas de{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('litigios')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Litigios y Arbitraje
                        </button>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Check 2: Política de Privacidad y Habeas Data */}
                  <div className="p-3 rounded-2xl bg-[#000000] border border-[#ffffff]/10">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => {
                          setAcceptedPrivacy(e.target.checked);
                          if (e.target.checked && acceptedTerms) setError('');
                        }}
                        className="w-4 h-4 mt-0.5 accent-[#8052ff] shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-[#bdbdbd] font-extralight leading-relaxed">
                        Acepto la{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('privacidad')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Política de Privacidad
                        </button>{' '}
                        y autorizo el tratamiento de mis datos personales (Habeas Data - Ley 1581 de 2012).
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-[13px] font-semibold uppercase tracking-[0.025em] transition-all shadow-[0_0_20px_rgba(128,82,255,0.4)] mt-2"
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCorporateLogin} className="space-y-4">
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-1.5">
                    Correo Corporativo / Institucional
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] uppercase tracking-[0.05em] font-semibold text-[#9a9a9a] mb-1.5">
                    Código de Organización o Convenio
                  </label>
                  <input
                    type="text"
                    value={corporateCode}
                    onChange={(e) => setCorporateCode(e.target.value)}
                    placeholder="Ej: IPT-ORG-CORP o CORP2026"
                    className="w-full px-4 py-3 rounded-[20px] bg-[#000000] border border-[#ffffff]/20 text-white placeholder-[#9a9a9a]/50 text-[14px] focus:outline-none focus:border-[#8052ff] transition-colors uppercase font-mono"
                    required
                  />
                </div>

                {/* Doble Casilla Legal Independiente en Corporativo */}
                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-2xl bg-[#000000] border border-[#ffffff]/10">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked && acceptedPrivacy) setError('');
                        }}
                        className="w-4 h-4 mt-0.5 accent-[#8052ff] shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-[#bdbdbd] font-extralight leading-relaxed">
                        Acepto el{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('aviso_legal')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Aviso Legal
                        </button>{' '}
                        y las condiciones de acceso corporativo.
                      </span>
                    </label>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#000000] border border-[#ffffff]/10">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => {
                          setAcceptedPrivacy(e.target.checked);
                          if (e.target.checked && acceptedTerms) setError('');
                        }}
                        className="w-4 h-4 mt-0.5 accent-[#8052ff] shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] text-[#bdbdbd] font-extralight leading-relaxed">
                        Acepto la{' '}
                        <button
                          type="button"
                          onClick={() => setPreviewLegalSection('privacidad')}
                          className="text-[#8052ff] font-medium hover:underline"
                        >
                          Política de Privacidad
                        </button>{' '}
                        y tratamiento de datos empresariales.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-[24px] bg-[#8052ff] hover:bg-[#6e3df0] disabled:opacity-50 text-white text-[13px] font-semibold uppercase tracking-[0.025em] transition-all shadow-[0_0_20px_rgba(128,82,255,0.4)] mt-2"
                >
                  {loading ? 'Verificando con tu empresa...' : 'Ingresar con Cuenta Corporativa'}
                </button>
              </form>
            )}

            {/* Enlace al Registro */}
            <div className="pt-6 border-t border-[#ffffff]/10 text-center text-[13px] text-[#9a9a9a] font-light">
              ¿No tienes una cuenta aún?{' '}
              <Link href="/register" className="text-white font-medium hover:text-[#8052ff] transition-colors">
                Regístrate aquí
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Lectura Legal In-Situ */}
      {previewLegalSection && activeDoc && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#09090b] border border-[#ffffff]/15 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-[#ffffff]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#8052ff]" />
                <h3 className="text-[16px] font-semibold text-white">{activeDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLegalSection(null)}
                className="text-[#9a9a9a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-[13px] text-[#bdbdbd] font-extralight leading-relaxed">
              <p className="text-white font-medium mb-3">{activeDoc.summary}</p>
              {activeDoc.clauses?.map((c, i) => (
                <div key={i} className="mb-4">
                  <h4 className="text-white text-xs font-semibold mb-1">{c.heading}</h4>
                  <p className="text-xs text-[#9a9a9a] leading-relaxed">{c.body}</p>
                  {c.bullets && c.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4 list-disc text-[11px] text-[#888888]">
                      {c.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#ffffff]/10 flex items-center justify-between">
              <Link
                href={`/legal?tab=${activeDoc.id}`}
                target="_blank"
                className="text-xs text-[#8052ff] hover:underline"
              >
                Abrir documento completo en /legal
              </Link>
              <button
                type="button"
                onClick={() => setPreviewLegalSection(null)}
                className="px-5 py-2 rounded-full bg-white text-black text-[12px] font-semibold uppercase"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000000] text-white flex items-center justify-center text-xs">Cargando acceso seguro...</div>}>
      <LoginContent />
    </Suspense>
  );
}
