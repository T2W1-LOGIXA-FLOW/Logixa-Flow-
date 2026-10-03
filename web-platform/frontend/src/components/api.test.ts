import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminFetch, login, validateAdminToken } from "./api";

const supabase = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    refreshSession: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => supabase,
}));

describe("admin API authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "signed-in-session", refresh_token: "refresh-value" } },
      error: null,
    });
    supabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: "refreshed-session" } },
      error: null,
    });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "refreshed-session" } },
      error: null,
    });
  });

  it("signs in through Supabase Auth with the submitted email and password", async () => {
    const session = await login("admin@example.com", "password");

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password",
    });
    expect(session.access_token).toBe("signed-in-session");
  });

  it("formats the admin bearer header at runtime", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    await adminFetch("/api/admin/example", "manual-session");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("Authorization")).toBe(["Bearer ", "manual-", "session"].join(""));
    expect((headers as Headers).get("Content-Type")).toBe("application/json");
    fetchMock.mockRestore();
  });

  it("validates the Supabase session and refreshes once after a 401", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(validateAdminToken("expired-session")).resolves.toBe(true);
    expect(supabase.auth.refreshSession).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>).Authorization).toBe(["Bearer ", "expired-", "session"].join(""));
    expect((fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>).Authorization).toBe(["Bearer ", "refreshed-", "session"].join(""));
    fetchMock.mockRestore();
  });

  it("rejects a missing session without making a backend request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await expect(validateAdminToken("")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
