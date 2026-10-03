// Safe client-side JWT helpers.
// Tokens are issued and verified by Supabase Auth/backend only.
// These helpers are for UI decoding; they never sign or verify tokens.

export interface TokenPayload {
  userId?: string;
  email?: string;
  role?: string;
  sub?: string;
  iat?: number;
  exp?: number;
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof atob === "function") return atob(padded);
  return "";
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 <= Date.now();
}
