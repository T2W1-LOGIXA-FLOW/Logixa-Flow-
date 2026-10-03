import { describe, expect, it, vi } from "vitest";

import { adminFetch, login, validateAdminToken } from "./api";

describe("admin API authentication", () => {
  it("signs in through Supabase Auth with the submitted email and password", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        access_token: "supabase-access-token",
        refresh_token: "supabase-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
      }),
    );

    const session = await login("admin@example.com", "password");

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/auth/v1/token?grant_type=password");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "admin@example.com",
      password: "password",
    });
    expect(session.access_token).toBe("supabase-access-token");
    fetchMock.mockRestore();
  });

  it("formats the admin bearer header at runtime", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    await adminFetch("/api/admin/example", "admin-token");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("Authorization")).toBe("Bearer admin-token");
    expect((headers as Headers).get("Content-Type")).toBe("application/json");
    fetchMock.mockRestore();
  });

  it("uses the supplied token without changing public validation behavior", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    await expect(validateAdminToken("admin-token")).resolves.toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: "Bearer admin-token" });
    await expect(validateAdminToken("")).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});
