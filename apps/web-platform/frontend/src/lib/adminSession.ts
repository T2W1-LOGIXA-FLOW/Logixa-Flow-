// src/lib/adminSession.ts
//
import { getSupabaseClient } from "@/lib/supabase";

const LEGACY_SESSION_KEYS = ["adminToken", "logixa_token", "adminRefreshToken"];
let legacyArtifactsCleared = false;

function clearLegacySessionArtifacts() {
  if (typeof window === "undefined") return;
  legacyArtifactsCleared = true;
  for (const key of LEGACY_SESSION_KEYS) {
    window.localStorage.removeItem(key);
  }
  document.cookie = "adminToken=; path=/; max-age=0; SameSite=Lax";
}

export async function getAdminSessionToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (!legacyArtifactsCleared) clearLegacySessionArtifacts();
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) {
    console.error("Could not read the Supabase session");
    return "";
  }
  return data.session?.access_token || "";
}

export async function clearAdminSession(): Promise<void> {
  clearLegacySessionArtifacts();
  const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not clear the local Supabase session");
}

export async function logoutAdminSession(): Promise<void> {
  let globalSignOutFailed = false;
  try {
    const { error } = await getSupabaseClient().auth.signOut({ scope: "global" });
    globalSignOutFailed = Boolean(error);
  } catch {
    globalSignOutFailed = true;
  }
  clearLegacySessionArtifacts();
  if (globalSignOutFailed) {
    let localSignOutFailed = false;
    try {
      const localResult = await getSupabaseClient().auth.signOut({ scope: "local" });
      localSignOutFailed = Boolean(localResult.error);
    } catch {
      localSignOutFailed = true;
    }
    if (localSignOutFailed) throw new Error("Supabase sign-out failed");
    throw new Error("This device was signed out, but other sessions could not be revoked");
  }
}
