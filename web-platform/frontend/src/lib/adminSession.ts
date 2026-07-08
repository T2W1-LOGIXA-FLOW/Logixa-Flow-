// src/lib/adminSession.ts
//
// The admin token is kept in localStorage for client-side page logic, but the
// Next.js edge middleware (middleware.ts) that guards /admin/* routes runs on
// the server and cannot read localStorage — it only sees cookies. These
// helpers mirror the token into a cookie so the middleware check actually
// works, instead of redirecting every request back to /admin/login.

const ADMIN_TOKEN_COOKIE = "adminToken";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // matches the backend's 12h token expiry
const ADMIN_TOKEN_STORAGE_KEYS = ["adminToken", "logixa_token"];

export function getAdminSessionToken() {
  if (typeof window === "undefined") return "";
  for (const key of ADMIN_TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return "";
}

export function setAdminSession(token: string) {
  if (typeof document === "undefined") return;
  localStorage.setItem("adminToken", token);
  localStorage.setItem("logixa_token", token);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAdminSession() {
  if (typeof document === "undefined") return;
  for (const key of ADMIN_TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  document.cookie = `${ADMIN_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
