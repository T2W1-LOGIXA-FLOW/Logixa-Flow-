import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearAdminSession, getAdminSessionToken, logoutAdminSession } from "./adminSession";

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => supabase,
}));

describe("admin Supabase session lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "adminToken=legacy-token; path=/";
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "supabase-session-token" } },
      error: null,
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  it("reads the current access token from the Supabase-managed session", async () => {
    localStorage.setItem("adminToken", "legacy-token");

    await expect(getAdminSessionToken()).resolves.toBe("supabase-session-token");
    expect(supabase.auth.getSession).toHaveBeenCalledOnce();
  });

  it("clears legacy artifacts and signs out the local Supabase session", async () => {
    localStorage.setItem("adminToken", "legacy-token");
    localStorage.setItem("logixa_token", "legacy-token");
    localStorage.setItem("adminRefreshToken", "legacy-refresh-token");

    await clearAdminSession();

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(localStorage.getItem("adminToken")).toBeNull();
    expect(localStorage.getItem("logixa_token")).toBeNull();
    expect(localStorage.getItem("adminRefreshToken")).toBeNull();
    expect(document.cookie).not.toContain("adminToken=");
  });

  it("requests server-side revocation when logging out", async () => {
    await logoutAdminSession();

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("clears this device but reports when global revocation fails", async () => {
    supabase.auth.signOut
      .mockResolvedValueOnce({ error: new Error("network unavailable") })
      .mockResolvedValueOnce({ error: null });

    await expect(logoutAdminSession()).rejects.toThrow(
      "This device was signed out, but other sessions could not be revoked",
    );
    expect(supabase.auth.signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(supabase.auth.signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });
});
