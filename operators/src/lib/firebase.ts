import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User, IdTokenResult } from "firebase/auth";
import { getDatabase, ref, get, set, update, onValue, push } from "firebase/database";

function sanitizeEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^["'`]+|["'`,;]+$/g, "").trim();
  if (!cleaned || cleaned === "undefined" || cleaned === "null" || cleaned.includes("<YOUR")) {
    return fallback;
  }
  return cleaned;
}

const resolvedProjectId = sanitizeEnv(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "ipt-course-admin"
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
  databaseURL: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    "https://ipt-course-students-default-rtdb.firebaseio.com"
  ),
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
  )
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export interface OperatorUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'teacher' | 'admin' | 'operator' | 'student' | 'owner';
  isAdmin: boolean;
  isTeacher: boolean;
  claims?: Record<string, any>;
  photoURL?: string | null;
}

// Obtener perfil completo y evaluar claims criptográficas
export async function getOperatorProfile(user: User): Promise<OperatorUserProfile> {
  const tokenResult: IdTokenResult = await user.getIdTokenResult(true);
  const claims = tokenResult.claims;

  // 1. Revisar si tiene claim admin
  const hasAdminClaim = claims.admin === true || claims.role === 'admin' || claims.role === 'owner';
  
  // 2. Revisar base de datos RTDB para respaldo
  let rtdbRole: string | null = null;
  try {
    const roleSnap = await get(ref(rtdb, `roles/${user.uid}`));
    if (roleSnap.exists()) {
      rtdbRole = roleSnap.val();
    }
  } catch (err) {
    console.warn("No se pudo leer roles en RTDB:", err);
  }

  const effectiveRole = (hasAdminClaim ? 'admin' : (rtdbRole || 'teacher')) as OperatorUserProfile['role'];
  const isAdmin = effectiveRole === 'admin' || hasAdminClaim;
  const isTeacher = effectiveRole === 'teacher' || effectiveRole === 'admin';

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Operador',
    role: effectiveRole,
    isAdmin,
    isTeacher,
    claims
  };
}
