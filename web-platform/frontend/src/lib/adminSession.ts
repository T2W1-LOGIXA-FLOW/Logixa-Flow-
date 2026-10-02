// src/lib/adminSession.ts
//
// Supabase Auth access/refresh tokens are kept in localStorage for the
// client-side admin API. The access token is mirrored into a cookie because
// Next.js middleware can only see cookies when guarding /admin/* routes.

const ADMIN_TOKEN_COOKIE = "adminToken";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ADMIN_TOKEN_STORAGE_KEYS = ["adminToken", "logixa_token"];
const REFRESH_TOKEN_STORAGE_KEY = "adminRefreshToken";

export function getAdminSessionToken() {
  if (typeof window === "undefined") return "";
  for (const key of ADMIN_TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return "";
}

export function getAdminRefreshToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || "";
}

export function setAdminSession(token: string, refreshToken?: string) {
  if (typeof document === "undefined") return;
  localStorage.setItem("adminToken", token);
  localStorage.setItem("logixa_token", token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAdminSession() {
  if (typeof document === "undefined") return;
  for (const key of ADMIN_TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  document.cookie = `${ADMIN_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
