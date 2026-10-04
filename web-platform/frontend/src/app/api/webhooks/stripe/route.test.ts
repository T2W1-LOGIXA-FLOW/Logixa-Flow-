import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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
});
