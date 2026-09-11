import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const ADMIN_PASS_KEY = "spin_wheel_admin_password_v1";
const ADMIN_SESSION_KEY = "spin_wheel_admin_session_v1";

export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "admin123";

let cachedCloudPassword: string | null = null;

if (typeof window !== "undefined" && db) {
  try {
    const authRef = doc(db, "settings", "auth");
    onSnapshot(
      authRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.["password"]) {
            cachedCloudPassword = String(data["password"]);
            try {
              localStorage.setItem(ADMIN_PASS_KEY, String(data["password"]));
            } catch (e) {}
          }
        }
      },
      (err) => {
        console.warn("Firestore admin auth snapshot error:", err?.message || err);
      }
    );
  } catch (e) {}
}

export function getAdminPassword(): string {
  if (typeof window === "undefined") return DEFAULT_PASSWORD;
  return (
    cachedCloudPassword ||
    localStorage.getItem(ADMIN_PASS_KEY) ||
    DEFAULT_PASSWORD
  );
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  if (typeof window === "undefined") return;
  const cleanPass = newPassword.trim();
  localStorage.setItem(ADMIN_PASS_KEY, cleanPass);
  cachedCloudPassword = cleanPass;

  if (db) {
    try {
      const authRef = doc(db, "settings", "auth");
      await setDoc(
        authRef,
        {
          password: cleanPass,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Failed to save admin password to Cloud Firestore:", e);
    }
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  if (auth?.currentUser) return true;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export async function loginWithFirebaseOrLocal(
  emailOrUsernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string }> {
  const input = emailOrUsernameInput.trim();

  // Try Firebase Auth if input is an email and auth SDK is initialized
  if (auth && input.includes("@")) {
    try {
      await signInWithEmailAndPassword(auth, input, passwordInput);
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      return { success: true };
    } catch (err: any) {
      console.warn("Firebase Auth attempt failed:", err?.code || err?.message);
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        return { success: false, error: "Invalid Firebase email or password." };
      }
    }
  }

  // Fallback to local admin credentials
  const currentPassword = getAdminPassword();
  if (
    (input.toLowerCase() === DEFAULT_USERNAME || input.includes("@")) &&
    passwordInput === currentPassword
  ) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    return { success: true };
  }

  return {
    success: false,
    error: "Invalid login. Use your Firebase Email/Password or default admin / admin123.",
  };
}

export async function logoutAdminAuth(): Promise<void> {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  if (auth && auth.currentUser) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase SignOut error", e);
    }
  }
}

export function subscribeAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
