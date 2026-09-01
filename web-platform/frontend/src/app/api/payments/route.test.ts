import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

const { GET } = await import("./route");

describe("/api/payments", () => {
  it("returns payment records as JSON", async () => {
    const request = new NextRequest("http://localhost/api/payments?status=paid&limit=10");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.beta_mode).toBe(true);
    expect(data.source).toBe("sample_payments");
    expect(Array.isArray(data.payments)).toBe(true);
    expect(data.payments.length).toBeGreaterThan(0);
  });
});
