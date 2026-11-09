import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("stripe", () => ({
  default: class StripeMock {
    webhooks = {
      constructEvent: vi.fn().mockReturnValue({
        type: "checkout.session.completed",
      }),
    };
  },
}));

describe("/api/webhooks/stripe", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, "false"])(
    "returns 503 when Stripe checkout is disabled (%s)",
    async (stripeEnabled) => {
      if (stripeEnabled === undefined) {
        vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "");
      } else {
        vi.stubEnv("STRIPE_CHECKOUT_ENABLED", stripeEnabled);
      }

      const request = new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ type: "checkout.session.completed" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Stripe integration is temporarily disabled",
      });
    }
  );

  it("does not acknowledge a verified subscription event without a handler", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_placeholder");

    const request = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test-signature" },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "Stripe event processing is not implemented; billing remains unavailable",
    });
  });
});
