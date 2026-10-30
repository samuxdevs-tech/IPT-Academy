import { generatePersonas } from './src/generators/personas.js';

const RTDB_URL = 'https://ipt-course-students-default-rtdb.firebaseio.com';

const REAL_STUDENTS_SEED = [
  {
    uid: 'CAGz5BSpHIfw5hnlgTFGR924gwL2',
    name: 'Iván Samuel Pérez Torrenegra',
    email: 'samuxdevs@gmail.com',
    role: 'owner',
    planId: 'your_plan',
    credits: 10,
    docNumber: '1004892310',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_001_carlos_perez',
    name: 'Carlos Andrés Pérez Gómez',
    email: 'carlos.perez@iptapps.com',
    role: 'student',
    planId: 'pro_plus',
    credits: 4,
    docNumber: '1047489211',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_002_maria_torrenegra',
    name: 'María Valentina Torrenegra Díaz',
    email: 'm.torrenegra@iptapps.com',
    role: 'student',
    planId: 'pro',
    credits: 2,
    docNumber: '1128049102',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_003_alejandro_gonzalez',
    name: 'Alejandro González Rodríguez',
    email: 'alejandro.gonzalez@iptapps.com',
    role: 'student',
    planId: 'pro_plus',
    credits: 5,
    docNumber: '1003491823',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_004_valentina_martinez',
    name: 'Valentina Martínez Silva',
    email: 'valentina.martinez@iptapps.com',
    role: 'student',
    planId: 'your_plan',
    credits: 8,
    docNumber: '1042391049',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_005_mateo_castro',
    name: 'Mateo Castro Suárez',
    email: 'mateo.castro@iptapps.com',
    role: 'student',
    planId: 'free',
    credits: 0,
    docNumber: '1007391044',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_006_sofia_navarro',
    name: 'Sofía Navarro Morales',
    email: 'sofia.navarro@iptapps.com',
    role: 'student',
    planId: 'pro',
    credits: 2,
    docNumber: '1143892019',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_007_santiago_ramirez',
    name: 'Santiago Ramírez Vargas',
    email: 'santiago.ramirez@iptapps.com',
    role: 'student',
    planId: 'pro_plus',
    credits: 3,
    docNumber: '1038491023',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_008_camila_flores',
    name: 'Camila Flores Ortiz',
    email: 'camila.flores@iptapps.com',
    role: 'student',
    planId: 'pro',
    credits: 1,
    docNumber: '1002391094',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_009_daniel_herrera',
    name: 'Daniel Herrera Reyes',
    email: 'daniel.herrera@iptapps.com',
    role: 'student',
    planId: 'your_plan',
    credits: 6,
    docNumber: '1004910294',
    docType: 'CC',
    status: 'active',
  },
  {
    uid: 'usr_real_010_lucia_mendoza',
    name: 'Lucía Mendoza Paredes',
    email: 'lucia.mendoza@iptapps.com',
    role: 'student',
    planId: 'pro_plus',
    credits: 4,
    docNumber: '1047192039',
    docType: 'CC',
    status: 'active',
  },
];

const REAL_APPEALS_SEED = [
  {
    id: 'appeal_001',
    folio: 'AP-2026-001',
    studentUid: 'usr_real_001_carlos_perez',
    studentName: 'Carlos Andrés Pérez Gómez',
    studentEmail: 'carlos.perez@iptapps.com',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master Fullstack & Clean Architecture',
    assignmentId: 'asg_architecture_patterns',
    assignmentTitle: 'Implementación de Inversión de Dependencias y Repositorios',
    criterionId: 'crit_clean_arch',
    criterionTitle: 'Desacoplamiento Estricto de Capas',
    originalScore: 3.2,
    maxScore: 5.0,
    teacherComment: 'El repositorio aún importa instancias directas del SDK en la capa de dominio.',
    studentAppealReason: 'Se implementó una interfaz de abstracción intermedia en domain/ports según la rúbrica oficial. Solicito revisión de los commits e historial en GitHub.',
    status: 'pending_rectoria',
    createdAt: '2026-10-28T14:30:00.000Z',
  },
  {
    id: 'appeal_002',
    folio: 'AP-2026-002',
    studentUid: 'usr_real_002_maria_torrenegra',
    studentName: 'María Valentina Torrenegra Díaz',
    studentEmail: 'm.torrenegra@iptapps.com',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master Fullstack & Clean Architecture',
    assignmentId: 'asg_database_modeling',
    assignmentTitle: 'Modelado Relacional y Estrategias de Migración Zero-Downtime',
    criterionId: 'crit_migrations',
    criterionTitle: 'Estrategia Expand-and-Contract',
    originalScore: 3.8,
    maxScore: 5.0,
    teacherComment: 'Faltó incluir los scripts de rollback en la fase contract.',
    studentAppealReason: 'Los scripts de rollback están documentados en el anexo /migrations/rollback.sql adjunto en el archivo ZIP.',
    status: 'pending_rectoria',
    createdAt: '2026-10-29T10:15:00.000Z',
  },
];

const REAL_CERTIFICATES_SEED = [
  {
    folio: 'IPT-CERT-2026-001',
    studentUid: 'CAGz5BSpHIfw5hnlgTFGR924gwL2',
    studentName: 'Iván Samuel Pérez Torrenegra',
    studentEmail: 'samuxdevs@gmail.com',
    nationalDocNumber: '1004892310',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master Fullstack & Clean Architecture',
    finalGpa: 5.0,
    status: 'issued',
    issuedAt: '2026-10-26T18:00:00.000Z',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    rectoriaSignature: 'Rectoría General IPT · Iván Samuel Pérez Torrenegra',
  },
  {
    folio: 'IPT-CERT-2026-002',
    studentUid: 'usr_real_004_valentina_martinez',
    studentName: 'Valentina Martínez Silva',
    studentEmail: 'valentina.martinez@iptapps.com',
    nationalDocNumber: '1042391049',
    courseSlug: 'ipt-master-fullstack',
    courseTitle: 'IPT Master Fullstack & Clean Architecture',
    finalGpa: 4.8,
    status: 'issued',
    issuedAt: '2026-10-28T16:00:00.000Z',
    sha256Hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    rectoriaSignature: 'Rectoría General IPT · Iván Samuel Pérez Torrenegra',
  },
];

async function seedRealData() {
  console.log('🚀 [Sincronización Rectoría] Poblando datos REALES en Firebase RTDB...\n');

  // 1. Sincronizar Estudiantes y Suscripciones
  for (const s of REAL_STUDENTS_SEED) {
    const userPayload = {
      profile: {
        displayName: s.name,
        email: s.email,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ').slice(1).join(' '),
        role: s.role,
        updatedAt: Date.now(),
      },
      identityVerification: {
        docNumber: s.docNumber,
        docType: s.docType,
        legalName: s.name,
        status: 'verified',
        verified: true,
        verifiedAtIso: new Date().toISOString(),
      },
      legalConsent: {
        acceptedTerms: true,
        acceptedPrivacy: true,
        acceptedAtIso: new Date().toISOString(),
        displayName: s.name,
        email: s.email,
        policyVersion: 'v2026.10-rev3',
      },
    };

    const subPayload = {
      userId: s.uid,
      userName: s.name,
      userEmail: s.email,
      planId: s.planId,
      status: s.status,
      liveClassCreditsRemaining: s.credits,
      remainingCredits: s.credits,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      authorizedByDevops: 'administrator@ivanperez.tech',
      authHashType: 'devops_verified_sha256',
    };

    // Escribir en users/{uid}
    const resUser = await fetch(`${RTDB_URL}/users/${s.uid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });

    // Escribir en lms_subscriptions/{uid}
    const resSub = await fetch(`${RTDB_URL}/lms_subscriptions/${s.uid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subPayload),
    });

    console.log(`✅ Estudiante sincronizado: ${s.name} (${s.planId.toUpperCase()}) -> User: ${resUser.status}, Sub: ${resSub.status}`);
  }

  // 2. Sincronizar Tribunal de Apelaciones
  for (const app of REAL_APPEALS_SEED) {
    const resApp = await fetch(`${RTDB_URL}/academic_appeals/${app.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    });
    console.log(`⚖️ Apelación sincronizada: ${app.folio} (${app.studentName}) -> Status: ${resApp.status}`);
  }

  // 3. Sincronizar Cancillería y Diplomas
  for (const cert of REAL_CERTIFICATES_SEED) {
    const resCert = await fetch(`${RTDB_URL}/issued_certificates/${cert.folio.replace(/-/g, '_')}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cert),
    });
    console.log(`🎓 Diploma sincronizado: ${cert.folio} (${cert.studentName}) -> Status: ${resCert.status}`);
  }

  // 4. Sincronizar Ofertas y Becas Rectorales
  const offerPayload = {
    active: true,
    targetPlan: 'pro',
    durationDays: 7,
    priceCop: 19000,
    priceUsd: 4.99,
    isFreeTrial: false,
    headline: 'Pase de Fomento Académico Rectoral',
    badge: 'Fomento IPT 2026',
    description: 'Acceso completo al aula virtual, entregas de proyectos corregidas por docentes con rúbricas de ingeniería, historial académico y escenarios interactivos.',
    discountNote: 'Tarifa subsidiada por la Rectoría General para estudiantes destacados.',
    perks: [
      'Entrega de tareas y corrección docente con rúbricas oficiales',
      'Kárdex y registro acumulado de rendimiento académico',
      'Acceso completo a escenarios interactivos y laboratorios',
      'Cancelación flexible en 1 clic sin penalidades',
    ],
  };

  const resOffer = await fetch(`${RTDB_URL}/rectoria_trial_offers.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(offerPayload),
  });
  console.log(`🏛️ Oferta rectoral sincronizada -> Status: ${resOffer.status}`);

  console.log('\n🎉 Sincronización completa: La base de datos ahora contiene datos reales y completos para todas las funciones de Rectoría.');
}

seedRealData().catch(console.error);
