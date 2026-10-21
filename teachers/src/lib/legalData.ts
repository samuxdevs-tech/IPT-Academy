import { ref, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

export const CURRENT_LEGAL_VERSION = 'v2026.10';

export type LegalSectionId =
  | 'aviso_legal'
  | 'privacidad'
  | 'terminos'
  | 'retracto_pagos'
  | 'cookies';

export interface LegalSectionDocument {
  id: LegalSectionId;
  number: string;
  title: string;
  shortTitle: string;
  lawReference: string;
  summary: string;
  clauses: Array<{
    heading: string;
    body: string;
    bullets?: string[];
  }>;
}

export interface LegalAcceptanceRecord {
  uid: string;
  email: string;
  displayName: string;
  policyVersion: string;
  accepted: boolean;
  acceptedAtIso: string;
  authMethod: 'email_login' | 'google_login' | 'email_register' | 'google_register' | 'session_gate';
  cookiePreference: 'all' | 'essential_only';
  userAgent: string;
  sectionsAccepted: LegalSectionId[];
}

export const IPT_OWNER_INFO = {
  commercialName: 'Ivan Perez Tech (IPT) — IPT Course',
  legalOwner: 'Iván Samuel Pérez Torrenegra',
  identificationType: 'Persona Natural Comerciante con Matrícula Mercantil y RUT (Colombia)',
  mercantileRegistry: 'Inscrito formalmente en la Cámara de Comercio municipal correspondiente',
  domicile: 'República de Colombia',
  officialEmail: 'ivanpereztech13@gmail.com',
  websiteUrl: 'https://ipt-course.web.app',
  updatedDate: 'Octubre de 2026'
};

export const LEGAL_DOCUMENTS: LegalSectionDocument[] = [
  {
    id: 'aviso_legal',
    number: '1',
    title: '1. Aviso Legal e Identificación del Propietario',
    shortTitle: 'Aviso Legal',
    lawReference: 'Código de Comercio de Colombia y Ley 527 de 1999',
    summary:
      'Información oficial sobre el titular legítimo, registro mercantil, domicilio y canales de contacto de la plataforma educativa IPT Course.',
    clauses: [
      {
        heading: '1.1. Titularidad e Identificación Oficial',
        body: 'En cumplimiento del deber de información transparente en medios electrónicos y comercio digital en la República de Colombia, se informa a los visitantes, estudiantes y clientes los datos de identificación del propietario y responsable de esta plataforma web:',
        bullets: [
          `Nombre o Razón Comercial: ${IPT_OWNER_INFO.commercialName}`,
          `Propietario y Representante Legal: ${IPT_OWNER_INFO.legalOwner}`,
          `Calidad Tributaria y Mercantil: ${IPT_OWNER_INFO.identificationType}`,
          `Registro Mercantil: ${IPT_OWNER_INFO.mercantileRegistry}`,
          `Domicilio Principal: ${IPT_OWNER_INFO.domicile}`,
          `Correo Electrónico Oficial de Contacto y Notificaciones Judiciales: ${IPT_OWNER_INFO.officialEmail}`,
          `Dirección Web Oficial: ${IPT_OWNER_INFO.websiteUrl}`
        ]
      },
      {
        heading: '1.2. Objeto del Portal Web',
        body: 'IPT Course es una plataforma de formación en línea, gestión de clases en video, entrega de actividades académicas, seguimiento de calificaciones y emisión de certificados digitales administrada por Ivan Perez Tech (IPT).'
      }
    ]
  },
  {
    id: 'privacidad',
    number: '2',
    title: '2. Política de Privacidad y Tratamiento de Datos (Habeas Data)',
    shortTitle: 'Privacidad y Habeas Data',
    lawReference: 'Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013',
    summary:
      'Regula cómo recolectamos, protegemos y utilizamos tus datos personales, y garantiza tus derechos constitucionales de conocer, actualizar, rectificar y suprimir tu información.',
    clauses: [
      {
        heading: '2.1. Datos Personales que Recolectamos',
        body: 'Bajo el principio de minimización y finalidad legítima de la Ley 1581 de 2012, IPT Course recolecta únicamente los datos necesarios para la operación académica y administrativa:',
        bullets: [
          'Datos de identificación y contacto: nombre completo, apellidos y dirección de correo electrónico.',
          'Datos académicos: cursos inscritos, progreso de visualización de clases, entregas de tareas, calificaciones obtenidas, consultas al asistente académico y certificados emitidos.',
          'Datos técnicos y de auditoría legal: fecha y hora de inicio de sesión, constancia de aceptación de términos legales y preferencias de cookies.',
          'No recolección de datos sensibles: IPT Course no solicita datos sobre origen racial, orientación política, convicciones religiosas ni almacena directamente números de tarjetas de crédito.'
        ]
      },
      {
        heading: '2.2. Finalidad del Tratamiento de la Información',
        body: 'Los datos personales autorizados por el usuario serán utilizados exclusivamente para:',
        bullets: [
          'Crear y administrar la cuenta personal de estudiante o instructor dentro de la plataforma.',
          'Sincronizar el avance de lecciones en video, recepcionar tareas, registrar calificaciones y expedir certificados verificables.',
          'Personalizar la asistencia académica del tutor local de estudio según el progreso real del estudiante.',
          'Enviar avisos académicos sobre fechas de entrega, clases en vivo o recuperación de contraseña.',
          'Conservar el soporte probatorio de la autorización de tratamiento de datos exigido por la Superintendencia de Industria y Comercio (SIC).'
        ]
      },
      {
        heading: '2.3. Derechos de los Titulares (Derechos ARCO)',
        body: 'Conforme al artículo 8 de la Ley 1581 de 2012, todo usuario titular de sus datos tiene derecho en cualquier momento y de forma gratuita a:',
        bullets: [
          'Conocer, actualizar y rectificar sus datos personales frente a Ivan Perez Tech (IPT).',
          'Solicitar prueba de la autorización otorgada al momento del registro o inicio de sesión.',
          'Ser informado sobre el uso que se le ha dado a sus datos personales.',
          'Revocar la autorización y/o solicitar la supresión total de su cuenta y sus datos personales.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones al régimen de protección de datos.'
        ]
      },
      {
        heading: '2.4. Canal y Plazos para Ejercer tus Derechos',
        body: `Puedes ejercer tus derechos enviando una solicitud al correo oficial ${IPT_OWNER_INFO.officialEmail}. Las consultas serán atendidas en un plazo máximo de diez (10) días hábiles y los reclamos o solicitudes de supresión en un máximo de quince (15) días hábiles conforme a los artículos 14 y 15 de la Ley 1581 de 2012.`
      }
    ]
  },
  {
    id: 'terminos',
    number: '3',
    title: '3. Términos y Condiciones de Uso',
    shortTitle: 'Términos y Condiciones',
    lawReference: 'Ley 23 de 1982, Decisión Andina 351 de 1993 y Código Civil',
    summary:
      'Contrato digital entre el usuario e IPT Course sobre el uso adecuado de la plataforma, derechos de autor y solución de controversias.',
    clauses: [
      {
        heading: '3.1. Condiciones de Acceso y Uso de la Cuenta',
        body: 'El acceso a IPT Course requiere el registro o inicio de sesión del usuario y la aceptación expresa de las presentes políticas. Las credenciales de acceso son personales e intransferibles; el usuario se compromete a hacer un uso lícito, ético y académico de la plataforma.'
      },
      {
        heading: '3.2. Propiedad Intelectual y Derechos de Autor',
        body: 'Todos los cursos, videos, guías descargables, evaluaciones, código fuente, diseño visual, logotipos y marcas de IPT Course e Ivan Perez Tech están protegidos por la Ley 23 de 1982 y normas internacionales de derechos de autor.',
        bullets: [
          'La inscripción en un curso otorga al estudiante una licencia de uso personal, no exclusiva e intransferible con fines estrictamente formativos.',
          'Queda prohibida la descarga no autorizada, reventa, redistribución pública, copia comercial o ingeniería inversa de los videos, materiales y software de la plataforma.'
        ]
      },
      {
        heading: '3.3. Limitación de Responsabilidad',
        body: 'El contenido de los cursos y las respuestas del asistente de estudio tienen carácter formativo y educativo. Ivan Perez Tech procura una disponibilidad continua del servicio en línea, sin ser responsable por interrupciones atribuibles al proveedor de internet del usuario o casos de fuerza mayor.'
      },
      {
        heading: '3.4. Modificaciones y Resolución de Conflictos',
        body: 'IPT podrá actualizar estos Términos notificando la nueva versión en la plataforma. Cualquier diferencia se resolverá inicialmente mediante arreglo directo en un plazo de quince (15) días hábiles a través del correo oficial y, en su defecto, bajo las leyes y jueces competentes de la República de Colombia.'
      }
    ]
  },
  {
    id: 'retracto_pagos',
    number: '4',
    title: '4. Condiciones de Compra, Retracto y Reversión de Pago',
    shortTitle: 'Compras, Retracto y Reversión',
    lawReference: 'Estatuto del Consumidor — Ley 1480 de 2011 (Arts. 47 y 51)',
    summary:
      'Reglas transparentes sobre cursos gratuitos y de pago, entrega de accesos, derecho de retracto y reversión de pagos electrónicos.',
    clauses: [
      {
        heading: '4.1. Precios, Impuestos y Activación de Cursos',
        body: 'Cada curso del catálogo indica de forma visible si es de acceso Gratuito o De Pago, mostrando su valor total antes de cualquier contratación. Al tratarse de servicios educativos digitales en línea, no existen costos de envío físico y la activación del acceso en la cuenta del estudiante se realiza de forma inmediata tras la confirmación del pago o matrícula.'
      },
      {
        heading: '4.2. Derecho de Retracto (Artículo 47, Ley 1480 de 2011)',
        body: 'En la adquisición de cursos o licencias de pago por medios electrónicos, el comprador tiene derecho a ejercer el retracto dentro de los cinco (5) días hábiles siguientes a la compra, siempre que no haya iniciado el consumo del contenido digital ni emitido el certificado del curso (Art. 47, numeral 8 de la Ley 1480 de 2011). Ejercido el retracto procedente, IPT devolverá el 100% del dinero pagado en un plazo máximo de treinta (30) días calendario.'
      },
      {
        heading: '4.3. Reversión del Pago (Artículo 51, Ley 1480 de 2011 y Decreto 587 de 2016)',
        body: 'Cuando el pago de un curso se realice mediante tarjeta de crédito, débito o cualquier otro instrumento de pago electrónico, el comprador podrá solicitar la reversión del pago dentro de los cinco (5) días hábiles siguientes a la fecha en que tuvo noticia de la operación en los siguientes casos:',
        bullets: [
          'Cuando el comprador sea objeto de fraude o corresponda a una operación no solicitada.',
          'Cuando el acceso al curso adquirido no haya sido habilitado en su cuenta.',
          'Cuando el servicio habilitado no corresponda a lo ofrecido en el catálogo.'
        ]
      },
      {
        heading: '4.4. Procedimiento para Solicitar Retracto o Reversión',
        body: `Para radicar una solicitud de retracto, garantía o reversión de pago, envía un correo a ${IPT_OWNER_INFO.officialEmail} con el asunto "SOLICITUD DE RETRACTO / REVERSIÓN", indicando tu nombre completo, correo de cuenta y comprobante de la operación.`
      }
    ]
  },
  {
    id: 'cookies',
    number: '5',
    title: '5. Política de Cookies y Almacenamiento Local',
    shortTitle: 'Política de Cookies',
    lawReference: 'Ley 1581 de 2012, Guía SIC y Estándares Internacionales (RGPD)',
    summary:
      'Información clara sobre el uso de cookies técnicas, memoria en navegador y control para aceptar, rechazar o configurar preferencias.',
    clauses: [
      {
        heading: '5.1. ¿Qué Cookies y Tecnologías de Almacenamiento Utilizamos?',
        body: 'IPT Course utiliza almacenamiento local del navegador y cookies clasificadas en dos categorías:',
        bullets: [
          'Cookies y almacenamiento estrictamente necesarios (Técnicos): Indispensables para mantener tu sesión autenticada de forma segura (Firebase Auth), recordar tus preferencias de lectura, guardar tu decisión de cookies y almacenar en caché el asistente educativo local en tu navegador.',
          'Cookies analíticas y de mejora académica (Opcionales): Permiten medir de forma agregada la estabilidad de reproducción de las clases y el rendimiento de la plataforma. No utilizamos cookies de publicidad invasiva ni vendemos perfiles a terceros.'
        ]
      },
      {
        heading: '5.2. Control para Aceptar, Rechazar o Configurar Cookies',
        body: 'Al ingresar por primera vez a IPT Course, se presenta un aviso inferior donde puedes aceptar todas las cookies, rechazar las opcionales (dejando activas únicamente las técnicas necesarias para iniciar sesión) o configurar tus preferencias en cualquier momento desde el pie de página.'
      }
    ]
  }
];

/**
 * Registra en Firebase Realtime Database (y en localStorage como respaldo)
 * la constancia auditable de aceptación legal del usuario al momento del login o registro.
 */
export async function recordUserLegalAcceptance(
  user: User,
  authMethod: LegalAcceptanceRecord['authMethod']
): Promise<LegalAcceptanceRecord> {
  const cookiePrefRaw =
    typeof window !== 'undefined'
      ? localStorage.getItem('ipt_cookie_consent_v1')
      : null;
  const cookiePreference: 'all' | 'essential_only' =
    cookiePrefRaw === 'essential_only' ? 'essential_only' : 'all';

  const nowIso = new Date().toISOString();
  const displayName =
    user.displayName ||
    (user.email ? user.email.split('@')[0] : 'Usuario IPT Course');

  const record: LegalAcceptanceRecord = {
    uid: user.uid,
    email: user.email || '',
    displayName,
    policyVersion: CURRENT_LEGAL_VERSION,
    accepted: true,
    acceptedAtIso: nowIso,
    authMethod,
    cookiePreference,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
    sectionsAccepted: [
      'aviso_legal',
      'privacidad',
      'terminos',
      'retracto_pagos',
      'cookies'
    ]
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `ipt_legal_accepted_${user.uid}`,
        JSON.stringify(record)
      );
      if (!cookiePrefRaw) {
        localStorage.setItem('ipt_cookie_consent_v1', 'all');
      }
    } catch {}
  }

  try {
    await Promise.all([
      set(ref(db, `users/${user.uid}/legalConsent`), {
        ...record,
        serverTimestamp: serverTimestamp()
      }),
      set(ref(db, `legal_consents/${user.uid}`), {
        ...record,
        serverTimestamp: serverTimestamp()
      })
    ]);
  } catch (err) {
    console.error('Error guardando constancia legal en Firebase:', err);
  }

  return record;
}
