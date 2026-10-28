import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, User, IdTokenResult } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

function sanitizeEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^["'`]+|["'`,;]+$/g, "").trim();
  if (
    !cleaned ||
    cleaned === "undefined" ||
    cleaned === "null" ||
    cleaned.includes("<YOUR")
  ) {
    return fallback;
  }
  return cleaned;
}

const resolvedDatabaseUrl = sanitizeEnv(
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  "https://ipt-course-students-default-rtdb.firebaseio.com"
);

const firebaseConfig = {
  apiKey: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "AIzaSyCUl6THRfhQEEcTtrfSKmSG9sAZGMbX1No"
  ),
  authDomain: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "ipt-course-admin-2a354.firebaseapp.com"
  ),
  databaseURL: resolvedDatabaseUrl,
  projectId: "ipt-course-admin",
  storageBucket: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "ipt-course-admin.firebasestorage.app"
  ),
  messagingSenderId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "628909926872"
  ),
  appId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:628909926872:web:f1fb3a00c2b745a708eaad"
  ),
};

export const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app, resolvedDatabaseUrl);

export interface OperatorUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "teacher" | "admin" | "operator" | "student" | "owner";
  isAdmin: boolean;
  isTeacher: boolean;
  claims?: Record<string, any>;
  photoURL?: string | null;
}

export interface ParsedIptStudent {
  uid: string;
  name: string;
  email: string;
  role: string;
  provider: string;
  hasUsedTrial: boolean;
  planId: string;
  subscriptionStatus: string;
  subStatus: string;
  activeDynamicCourses: string[];
  liveCreditsRemaining: number;
  remainingLiveCredits: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  hasDiploma: boolean;
  diplomaFolio?: string;
  diplomaDateUtc?: string;
  coursesProgress: Array<{
    courseSlug: string;
    courseTitle: string;
    completedLessons: string[];
    completedCount: number;
    totalLessons: number;
    progressPercent: number;
    corte1Grade: number;
    corte2Grade: number;
    corte3Grade: number;
    finalAverage: number;
    certificateId?: string;
  }>;
  certificates: Array<{
    id: string;
    courseSlug: string;
    courseTitle: string;
    issueDate: string;
  }>;
  licenseHashes: string[];
  groups: string[];
  lastActivityIso: string;
  lastActiveIso: string;
  legalConsentAccepted: boolean;
  legalConsentAt?: string;
  identityVerified: boolean;
  identityDocType?: string;
  identityDocNumber?: string;
  identityLegalName?: string;
  identityVerifiedAtIso?: string;
}

/**
 * Extrae y normaliza un usuario de la base de datos en vivo de ipt-course (Firebase RTDB)
 * contemplando tanto nodos anidados (`u.profile`, `u.legalConsent`, `progress/{uid}/{courseSlug}`)
 * como propiedades de nivel raíz.
 */
export function parseStudentRecordFromRtdb(
  uid: string,
  u: any,
  progMap: Record<string, any> = {},
  subsMap: Record<string, any> = {},
  certsMap: Record<string, any> = {},
  coursesList: any[] = []
): ParsedIptStudent {
  const profile = u?.profile || {};
  const legal = u?.legalConsent || {};

  const email =
    profile.email ||
    legal.email ||
    (typeof u?.email === "string" ? u.email : "") ||
    "sin-correo@ipt.local";

  const fullNameFromParts = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const name =
    profile.displayName ||
    fullNameFromParts ||
    legal.displayName ||
    u?.displayName ||
    u?.name ||
    (email && !email.startsWith("sin-correo") ? email.split("@")[0] : `Usuario ${uid.slice(0, 6)}`);

  const role = (profile.role || u?.role || "student").toLowerCase();
  const provider = profile.provider || legal.authMethod || "email";

  // Suscripción activa en lms_subscriptions/{uid}
  const sub =
    subsMap[uid] ||
    Object.values(subsMap).find((s: any) => s?.userId === uid) ||
    null;

  const planId = sub?.planId || "free";
  const subscriptionStatus = sub?.status || "active";
  const activeDynamicCourses = Array.isArray(sub?.activeDynamicCourseSlugs)
    ? sub.activeDynamicCourseSlugs
    : [];
  const liveCreditsRemaining = Number(sub?.liveClassCreditsRemaining ?? 0);

  // Progreso por curso en progress/{uid}/{courseSlug}
  const userProgRoot = progMap[uid] || {};
  const coursesProgress: ParsedIptStudent["coursesProgress"] = [];
  let totalCompletedAcrossCourses = 0;

  // Mapear todos los cursos que existen en coursesList o en progress/{uid}
  const courseSlugsSet = new Set<string>();
  coursesList.forEach((c) => {
    if (c?.slug) courseSlugsSet.add(c.slug);
  });
  Object.keys(userProgRoot).forEach((k) => {
    if (
      k !== "completedLessons" &&
      k !== "progressPercent" &&
      k !== "lastUpdatedAt" &&
      typeof userProgRoot[k] === "object"
    ) {
      courseSlugsSet.add(k);
    }
  });

  courseSlugsSet.forEach((slug) => {
    const courseObj = coursesList.find((c) => c?.slug === slug);
    const totalLessonsInCourse =
      courseObj?.modules?.reduce(
        (acc: number, m: any) =>
          acc + (Array.isArray(m?.lessons) ? m.lessons.length : Object.keys(m?.lessons || {}).length),
        0
      ) || 1;

    const cProg = userProgRoot[slug] || {};
    const rawCompleted = cProg.completedLessons || [];
    const completedLessons: string[] = Array.isArray(rawCompleted)
      ? rawCompleted.filter(Boolean)
      : typeof rawCompleted === "object"
      ? Object.keys(rawCompleted).filter((k) => rawCompleted[k])
      : [];

    totalCompletedAcrossCourses += completedLessons.length;

    const pct =
      typeof cProg.progressPercent === "number"
        ? cProg.progressPercent
        : Math.min(100, Math.round((completedLessons.length / Math.max(1, totalLessonsInCourse)) * 100));

    const c1 = Number(cProg.corte1Grade ?? cProg.c1 ?? 0);
    const c2 = Number(cProg.corte2Grade ?? cProg.c2 ?? 0);
    const c3 = Number(cProg.corte3Grade ?? cProg.c3 ?? 0);
    const avg =
      typeof cProg.finalGrade === "number"
        ? cProg.finalGrade
        : Number((c1 * 0.3 + c2 * 0.3 + c3 * 0.4).toFixed(2));

    coursesProgress.push({
      courseSlug: slug,
      courseTitle: courseObj?.title || slug,
      completedLessons,
      completedCount: completedLessons.length,
      totalLessons: totalLessonsInCourse,
      progressPercent: pct,
      corte1Grade: c1,
      corte2Grade: c2,
      corte3Grade: c3,
      finalAverage: avg,
      certificateId: cProg.certificateId || u?.certificates?.[slug],
    });
  });

  // Fallback si el progreso estaba guardado directamente en la raíz de progress/{uid}
  if (coursesProgress.length === 0 && userProgRoot.completedLessons) {
    const rawC = userProgRoot.completedLessons;
    const listC = Array.isArray(rawC) ? rawC : Object.keys(rawC);
    totalCompletedAcrossCourses = listC.length;
  }

  const maxProgressPct =
    coursesProgress.length > 0
      ? Math.max(...coursesProgress.map((cp) => cp.progressPercent))
      : Number(userProgRoot.progressPercent || 0);

  // Certificados emitidos a este estudiante
  const certificates: ParsedIptStudent["certificates"] = [];
  Object.values(certsMap).forEach((cert: any) => {
    if (cert && (cert.userId === uid || cert.studentEmail === email)) {
      certificates.push({
        id: cert.id || "IPT-CERT",
        courseSlug: cert.courseSlug || "ipt-master-fullstack",
        courseTitle: cert.courseTitle || "Curso Oficial IPT",
        issueDate: cert.issueDateFormatted || cert.issueDate || "",
      });
    }
  });

  // Licencias y grupos
  const rawLicenses = u?.licenses || {};
  const licenseHashes = Array.isArray(rawLicenses)
    ? rawLicenses
    : typeof rawLicenses === "object"
    ? Object.keys(rawLicenses).filter((k) => rawLicenses[k])
    : [];

  const rawIdentity = u?.identityVerification || {};
  const identityVerified = Boolean(rawIdentity.verified || rawIdentity.status === 'verified');
  const identityDocType = rawIdentity.docType || undefined;
  const identityDocNumber = rawIdentity.docNumber ? String(rawIdentity.docNumber) : undefined;
  const identityLegalName = rawIdentity.legalName || undefined;
  const identityVerifiedAtIso = rawIdentity.verifiedAtIso || undefined;

  const rawGroups = u?.groups || {};
  const groups = Array.isArray(rawGroups)
    ? rawGroups
    : typeof rawGroups === "object"
    ? Object.keys(rawGroups).filter((k) => rawGroups[k])
    : [];

  const rawTs =
    profile.updatedAt ||
    u?.updatedAt ||
    u?.lastHeartbeat ||
    legal.acceptedAtIso ||
    sub?.updatedAt ||
    null;

  let lastActivityIso = "";
  if (typeof rawTs === "number") {
    lastActivityIso = new Date(rawTs).toISOString();
  } else if (typeof rawTs === "string") {
    lastActivityIso = rawTs;
  }

  const totalLessonsAcrossCourses =
    coursesProgress.reduce((acc, cp) => acc + cp.totalLessons, 0) || 1;
  const firstCert = certificates[0];
  const hasDiploma = certificates.length > 0 || maxProgressPct >= 100;

  return {
    uid,
    name,
    email,
    role,
    provider,
    hasUsedTrial: Boolean(u?.hasUsedTrial),
    planId,
    subscriptionStatus,
    subStatus: subscriptionStatus,
    activeDynamicCourses,
    liveCreditsRemaining,
    remainingLiveCredits: liveCreditsRemaining,
    completedLessonsCount: totalCompletedAcrossCourses,
    totalLessonsCount: totalLessonsAcrossCourses,
    progressPercent: maxProgressPct,
    hasDiploma,
    diplomaFolio: firstCert?.id || (hasDiploma ? `IPT-CERT-${uid.slice(0, 6).toUpperCase()}` : undefined),
    diplomaDateUtc: firstCert?.issueDate || (hasDiploma ? "2026-10-26" : undefined),
    coursesProgress,
    certificates,
    licenseHashes,
    groups,
    lastActivityIso,
    lastActiveIso: lastActivityIso,
    legalConsentAccepted: Boolean(legal?.accepted),
    legalConsentAt: legal?.acceptedAtIso,
    identityVerified,
    identityDocType,
    identityDocNumber,
    identityLegalName,
    identityVerifiedAtIso,
  };
}

export async function getOperatorProfile(user: User): Promise<OperatorUserProfile> {
  const tokenResult: IdTokenResult = await user.getIdTokenResult(true);
  const claims = tokenResult.claims;

  const hasAdminClaim =
    claims.admin === true || claims.role === "admin" || claims.role === "owner";

  let rtdbRole: string | null = null;
  try {
    const roleSnap = await get(ref(rtdb, `roles/${user.uid}`));
    if (roleSnap.exists()) {
      rtdbRole = roleSnap.val();
    }
  } catch (err) {
    console.warn("No se pudo leer roles en RTDB:", err);
  }

  const effectiveRole = (
    hasAdminClaim ? "admin" : rtdbRole || "teacher"
  ) as OperatorUserProfile["role"];
  const isAdmin = effectiveRole === "admin" || hasAdminClaim;
  const isTeacher = effectiveRole === "teacher" || effectiveRole === "admin";

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split("@")[0] || "Operador",
    role: effectiveRole,
    isAdmin,
    isTeacher,
    claims,
  };
}
