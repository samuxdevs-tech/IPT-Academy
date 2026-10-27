import { ref, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

export const CURRENT_LEGAL_VERSION = 'v2026.10-rev3';

export type LegalSectionId =
  | 'aviso_legal'
  | 'privacidad'
  | 'terminos'
  | 'litigios'
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
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedAtIso: string;
  authMethod: 'email_login' | 'google_login' | 'email_register' | 'google_register' | 'session_gate';
  cookiePreference: 'all' | 'essential_only';
  userAgent: string;
  sectionsAccepted: LegalSectionId[];
}

export const IPT_OWNER_INFO = {
  commercialName: 'Ivan Perez Tech (IPT) — IPT Course',
  legalOwner: 'Ivan Perez',
  identificationType: 'Persona Natural Comerciante con Matrícula Mercantil y Registro Único Tributario (RUT)',
  mercantileRegistry: 'Inscripción activa en la Cámara de Comercio de Montería (Córdoba, Colombia)',
  domicile: 'Montería, Córdoba, República de Colombia',
  officialEmail: 'ivanpereztech13@gmail.com',
  websiteUrl: 'https://iptapps.com',
  updatedDate: 'Octubre de 2026'
};

export const LEGAL_DOCUMENTS: LegalSectionDocument[] = [
  {
    id: 'aviso_legal',
    number: '1',
    title: '1. Aviso Legal e Identificación del Titular',
    shortTitle: 'Aviso Legal',
    lawReference: 'Código de Comercio de Colombia y Ley 527 de 1999',
    summary:
      'Identificación del titular del establecimiento mercantil, domicilio legal, jurisdicción aplicable y canales oficiales de notificación.',
    clauses: [
      {
        heading: '1.1. Información del Titular Responsable',
        body: 'En cumplimiento del deber legal de información consagrado en la legislación de la República de Colombia, se informa al público los datos de identificación del titular y operador de la plataforma:',
        bullets: [
          `Nombre Comercial: ${IPT_OWNER_INFO.commercialName}`,
          `Titular y Responsable Legal: ${IPT_OWNER_INFO.legalOwner}`,
          `Calidad Legal: ${IPT_OWNER_INFO.identificationType}`,
          `Registro Mercantil: ${IPT_OWNER_INFO.mercantileRegistry}`,
          `Domicilio Principal y Notificaciones: ${IPT_OWNER_INFO.domicile}`,
          `Canal Oficial Exclusivo de Notificaciones: ${IPT_OWNER_INFO.officialEmail}`,
          `Portal Oficial: ${IPT_OWNER_INFO.websiteUrl}`
        ]
      },
      {
        heading: '1.2. Alcance del Servicio Educativo Digital',
        body: 'IPT Course opera como un entorno de formación técnica digital, administración de cursos interactivos, verificación de evaluaciones y emisión de constancias académicas. La navegación y el uso de los servicios implican la aceptación plena e incondicional de los presentes avisos legales.'
      }
    ]
  },
  {
    id: 'privacidad',
    number: '2',
    title: '2. Política de Privacidad y Tratamiento de Datos Personales',
    shortTitle: 'Política de Privacidad',
    lawReference: 'Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013',
    summary:
      'Bases legales, finalidades estrictas y mecanismos constitucionales para el ejercicio de los derechos de Habeas Data frente al Responsable del Tratamiento.',
    clauses: [
      {
        heading: '2.1. Datos Personales Objeto de Tratamiento',
        body: 'En observancia de los principios de legalidad, finalidad y necesidad (Ley 1581 de 2012), se tratan exclusivamente las siguientes categorías de datos:',
        bullets: [
          'Datos de Identificación y Contacto: Nombre, apellidos y dirección de correo electrónico validada.',
          'Datos de Actividad Académica: Registro de módulos cursados, tiempo de visualización de sesiones, calificaciones de evaluaciones y certificados conferidos.',
          'Registros Técnicos y de Auditoría: Registro de fecha, hora de autenticación, dirección IP de conexión y constancia de aceptación de términos legales.',
          'Exclusión de Datos Sensibles: No se recolectan datos de filiación política, religiosa, biométricos ni información bancaria directa.'
        ]
      },
      {
        heading: '2.2. Finalidades Taxativas del Tratamiento',
        body: 'La información personal autorizada será destinada únicamente a:',
        bullets: [
          'Autenticación, provisión de acceso y seguridad de la cuenta del estudiante en la plataforma.',
          'Consolidación del progreso académico, evaluación de competencias y generación de certificados digitales.',
          'Envío de notificaciones estrictamente operativas (recuperación de acceso, cambios normativos o avisos de cursos activos).',
          'Custodia del consentimiento informado requerido por la Superintendencia de Industria y Comercio (SIC).'
        ]
      },
      {
        heading: '2.3. Derechos del Titular y Procedimiento de Ejercicio',
        body: `El titular de los datos podrá ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos personales conforme a los artículos 14 y 15 de la Ley 1581 de 2012 enviando una comunicación escrita al correo oficial ${IPT_OWNER_INFO.officialEmail}. Las consultas serán atendidas en un plazo máximo de diez (10) días hábiles y los reclamos en quince (15) días hábiles.`
      }
    ]
  },
  {
    id: 'terminos',
    number: '3',
    title: '3. Términos y Condiciones Generales de Uso',
    shortTitle: 'Términos de Uso',
    lawReference: 'Ley 23 de 1982, Decisión Andina 351 de 1993 y Código Civil',
    summary:
      'Régimen contractual aplicable al acceso, licencias de uso académico intransferible, propiedad intelectual y obligaciones de los usuarios.',
    clauses: [
      {
        heading: '3.1. Naturaleza de la Cuenta y Acceso',
        body: 'La creación de una cuenta en IPT Course otorga al usuario una licencia de acceso personal, individual, revocable y no transferible para uso exclusivamente formativo. Queda terminantemente prohibido ceder, arrendar o compartir credenciales de acceso con terceros.'
      },
      {
        heading: '3.2. Propiedad Intelectual y Restricciones de Uso',
        body: 'Todos los contenidos, lecciones audiovisuales, diagramas, códigos informáticos, marcas y diseños incorporados en la plataforma son de propiedad exclusiva de Ivan Perez (Ivan Perez Tech) y se encuentran amparados por la Ley 23 de 1982 y los tratados internacionales sobre derechos de autor.',
        bullets: [
          'Queda prohibida la reproducción, descarga no autorizada, redistribución pública o comunicación de materiales a través de cualquier medio.',
          'Queda expresamente prohibido someter los sistemas a ingeniería inversa, extracción masiva de datos (scraping) o descompilación.'
        ]
      },
      {
        heading: '3.3. Suspensión o Cancelación por Incumplimiento',
        body: 'IPT se reserva el derecho de suspender o cancelar de inmediato el acceso a cualquier usuario que infrinja las condiciones de uso, intente vulnerar la seguridad del sistema o use la plataforma para fines contrarios al orden público o la legislación colombiana.'
      }
    ]
  },
  {
    id: 'litigios',
    number: '4',
    title: '4. Resolución de Conflictos, Arbitraje y Limitación de Responsabilidad',
    shortTitle: 'Litigios y Arbitraje',
    lawReference: 'Ley 1563 de 2012 (Estatuto de Arbitraje), Ley 1480 de 2011 y Código General del Proceso',
    summary:
      'Procedimiento obligatorio de arreglo directo, cláusula compromisoria de arbitraje institucional, renuncia a acciones de clase y límite de indemnidad patrimonial.',
    clauses: [
      {
        heading: '4.1. Etapa Previa Obligatoria de Arreglo Directo',
        body: 'Cualquier diferencia, reclamación, controversia o conflicto surgido entre el usuario y el titular derivado de la ejecución, interpretación, terminación o uso de los servicios de IPT Course deberá someterse obligatoriamente a una etapa de arreglo directo previo por un término improrrogable de treinta (30) días calendario. La parte reclamante notificará motivadamente su solicitud a la dirección electrónica legal oficial: ivanpereztech13@gmail.com, detallando hechos, pretensiones y pruebas que sustenten su reclamación.'
      },
      {
        heading: '4.2. Cláusula Compromisoria / Arbitraje Institucional en Derecho',
        body: 'Vencido el término de arreglo directo sin que las partes hayan alcanzado un acuerdo total, toda controversia o diferencia relativa a este contrato o a la prestación de los servicios será resuelta de manera exclusiva y vinculante por un Tribunal de Arbitramento administrado por el Centro de Conciliación y Arbitraje de la Cámara de Comercio de Montería (Córdoba, República de Colombia), con sujeción a las siguientes reglas inmodificables:',
        bullets: [
          'El Tribunal se regirá por el reglamento del Centro de Conciliación y Arbitraje de la Cámara de Comercio de Montería y las disposiciones de la Ley 1563 de 2012.',
          'El Tribunal estará compuesto por un (1) árbitro único designado de mutuo acuerdo entre las partes; en caso de falta de acuerdo dentro de los diez (10) días hábiles siguientes a la solicitud, el árbitro será designado por el Centro de Arbitraje mediante sorteo.',
          'El procedimiento arbitral sesionará en Montería (Colombia) y el fallo será estrictamente en derecho.',
          'El laudo arbitral expedido será definitivo, inimpugnable y tendrá plenos efectos de cosa juzgada para las partes, renunciando expresamente a la jurisdicción ordinaria.'
        ]
      },
      {
        heading: '4.3. Renuncia Expresa a Acciones Colectivas (Class Action Waiver)',
        body: 'El usuario declara y acepta que cualquier procedimiento para resolver o litigar controversias se llevará a cabo exclusivamente de forma individual. El usuario renuncia irrevocablemente al derecho de iniciar, promover, coadyuvar o integrarse como demandante o miembro de grupo en cualquier acción colectiva, acción popular, acción de grupo o proceso multi-demandante frente a Ivan Perez o Ivan Perez Tech (IPT).'
      },
      {
        heading: '4.4. Límite Máximo de Responsabilidad Patrimonial',
        body: 'En la máxima medida autorizada por la ley aplicable, la responsabilidad total agregada y acumulada de Ivan Perez y de la marca Ivan Perez Tech (IPT), por cualquier daño, perjuicio, falta, incumplimiento contractual o extracontractual, se limita única y exclusivamente a la suma total efectivamente pagada por el usuario a IPT durante los tres (3) meses inmediatamente anteriores al hecho que dio origen al reclamo. En servicios o cuentas gratuitas, la responsabilidad máxima total no excederá en ningún caso el valor equivalente a un (1) Salario Mínimo Legal Diario Vigente (1 SMLDV).'
      },
      {
        heading: '4.5. Exclusión Taxativa de Daños Consecuenciales y Lucro Cesante',
        body: 'En ningún caso IPT responderá frente al usuario ni frente a terceros por daños indirectos, incidentales, punitivos, lucro cesante, pérdida de ingresos esperados, interrupción de actividades, pérdida de oportunidades de negocio o pérdida de información, cualquiera que sea su causa.'
      }
    ]
  },
  {
    id: 'retracto_pagos',
    number: '5',
    title: '5. Derecho de Retracto, Reversión de Pagos y Garantías',
    shortTitle: 'Retracto y Pagos',
    lawReference: 'Estatuto del Consumidor — Ley 1480 de 2011 (Arts. 47 y 51) y Decreto 587 de 2016',
    summary:
      'Garantías legales, causales procedentes de reversión de pagos electrónicos y condiciones para el ejercicio del derecho de retracto en servicios digitales.',
    clauses: [
      {
        heading: '5.1. Ejercicio del Derecho de Retracto',
        body: 'De conformidad con el artículo 47 de la Ley 1480 de 2011, en ventas de bienes y servicios por medios no tradicionales o a distancia, el comprador podrá ejercer el derecho de retracto dentro de los cinco (5) días hábiles siguientes a la compra.',
        bullets: [
          'Excepción legal expresa (Art. 47, numeral 8): El derecho de retracto no operará cuando el usuario haya iniciado la visualización del contenido digital, completado módulos o solicitado la expedición de certificados.',
          'En caso de retracto procedente, se devolverán las sumas pagadas sin deducciones en un plazo no superior a treinta (30) días calendario contados desde la notificación formal.'
        ]
      },
      {
        heading: '5.2. Reversión de Pagos Electrónicos',
        body: `Conforme al artículo 51 de la Ley 1480 de 2011 y el Decreto 587 de 2016, el comprador podrá solicitar la reversión ante fraudes o cobros indebidos dentro de los cinco (5) días hábiles siguientes a la fecha en que tuvo conocimiento, remitiendo su solicitud a ${IPT_OWNER_INFO.officialEmail}.`
      }
    ]
  },
  {
    id: 'cookies',
    number: '6',
    title: '6. Política de Almacenamiento Local y Cookies Técnicas',
    shortTitle: 'Cookies Técnicas',
    lawReference: 'Ley 1581 de 2012 y Guías de la Superintendencia de Industria y Comercio',
    summary:
      'Uso exclusivo de almacenamiento técnico esencial para la operación segura de la sesión y el estado de la aplicación.',
    clauses: [
      {
        heading: '6.1. Finalidad Exclusivamente Técnica',
        body: 'IPT Course emplea exclusivamente tecnologías de almacenamiento de sesión y cookies técnicas indispensables para preservar la seguridad de la cuenta, validar la firma del token criptográfico y recordar la preferencia de privacidad del usuario. No se emplean cookies de rastreo comercial ni se transfieren historiales de navegación a terceras partes.'
      }
    ]
  }
];

/**
 * Registra en Firebase Realtime Database (y en localStorage)
 * la constancia auditable de aceptación legal con doble check.
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
    acceptedTerms: true,
    acceptedPrivacy: true,
    acceptedAtIso: nowIso,
    authMethod,
    cookiePreference,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
    sectionsAccepted: [
      'aviso_legal',
      'privacidad',
      'terminos',
      'litigios',
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
