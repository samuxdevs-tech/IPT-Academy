import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

function sanitizeEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val
    .trim()
    .replace(/^["'`]+|["'`,;]+$/g, "")
    .trim();
  if (
    !cleaned ||
    cleaned === "undefined" ||
    cleaned === "null" ||
    cleaned.includes("<YOUR") ||
    cleaned.startsWith("tu-")
  ) {
    return fallback;
  }
  return cleaned;
}

function resolveDatabaseUrl(rawUrl: string | undefined, projectId: string): string {
  const defaultUrl = `https://${projectId}-default-rtdb.firebaseio.com`;
  const candidate = sanitizeEnv(rawUrl, defaultUrl);

  // Extract valid https://...firebaseio.com or https://...firebasedatabase.app URL if extra text was pasted
  const urlMatch = candidate.match(/https?:\/\/[a-zA-Z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)/i);
  if (urlMatch) {
    return urlMatch[0].replace(/^http:\/\//i, "https://");
  }

  // If user pasted only the subdomain or domain without https://
  const domainMatch = candidate.match(/([a-zA-Z0-9-]+(?:-default-rtdb)?\.(?:[a-z0-9-]+\.)?(?:firebaseio\.com|firebasedatabase\.app))/i);
  if (domainMatch) {
    return `https://${domainMatch[1]}`;
  }

  // If user pasted a URL to console.firebase.google.com or just a project slug, fall back to standard RTDB URL
  return defaultUrl;
}

const resolvedProjectId = sanitizeEnv(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "ipt-course"
);

const firebaseConfig = {
  apiKey: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "AIzaSyCjbPjcwHwmlgUTvMhjrB3uD0aTuWFKeFo"
  ),
  authDomain: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    `${resolvedProjectId}.firebaseapp.com`
  ),
  databaseURL: resolveDatabaseUrl(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://ipt-course-default-rtdb.firebaseio.com",
    resolvedProjectId
  ),
  projectId: resolvedProjectId,
  storageBucket: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    `${resolvedProjectId}.firebasestorage.app`
  ),
  messagingSenderId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "100172242630"
  ),
  appId: sanitizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:100172242630:web:58eba012840f7d981ac1c7"
  ),
};

// Initialize Firebase (prevent multiple initializations in Next.js dev mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app, firebaseConfig.databaseURL);

export default app;
