import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.example.com/session/123" }),
}));

const { POST } = await import("./route");
const { createCheckoutSession } = await import("@/lib/stripe");

describe("/api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_CHECKOUT_ENABLED;
    process.env.STRIPE_PRICE_PRO = "price_pro_123";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_enterprise_123";
  });

  it.each([undefined, "false", "TRUE"])(
    "returns 503 and does not create a session when checkout is disabled (%s)",
    async (checkoutEnabled) => {
      if (checkoutEnabled !== undefined) {
        process.env.STRIPE_CHECKOUT_ENABLED = checkoutEnabled;
      }

      const request = new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: "pro" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Checkout is temporarily unavailable",
      });
      expect(createCheckoutSession).not.toHaveBeenCalled();
    }
  );

  it("creates a checkout session for a valid plan", async () => {
    process.env.STRIPE_CHECKOUT_ENABLED = "true";
    const request = new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: "pro" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.example.com/session/123");
    expect(createCheckoutSession).toHaveBeenCalledWith(
      "price_pro_123",
      "http://localhost/checkout/success",
      "http://localhost/checkout/cancel"
    );
  });
});
