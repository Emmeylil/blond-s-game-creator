const ADMIN_PASS_KEY = "spin_wheel_admin_password_v1";
const ADMIN_SESSION_KEY = "spin_wheel_admin_session_v1";

export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "admin123";

export function getAdminPassword(): string {
  if (typeof window === "undefined") return DEFAULT_PASSWORD;
  return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;
}

export function setAdminPassword(newPassword: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_PASS_KEY, newPassword);
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function loginAdmin(usernameInput: string, passwordInput: string): boolean {
  const currentPassword = getAdminPassword();
  if (usernameInput.trim().toLowerCase() === DEFAULT_USERNAME && passwordInput === currentPassword) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
