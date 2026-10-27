import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBbCW8YA2Lf_d1fTKMt7RmWRMW8D4IoqtI",
  authDomain: "datagan-edu.firebaseapp.com",
  databaseURL: "https://datagan-edu-default-rtdb.firebaseio.com",
  projectId: "datagan-edu",
  storageBucket: "datagan-edu.firebasestorage.app",
  messagingSenderId: "67562731574",
  appId: "1:67562731574:web:bcdb2c5c05a0ab12e24097"
};

// Initialize Firebase (prevent multiple initializations in Next.js dev mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;
