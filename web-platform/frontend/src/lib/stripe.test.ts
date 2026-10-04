import { afterEach, describe, expect, it, vi } from "vitest";
import { createCheckoutSession } from "./stripe";

describe("createCheckoutSession", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, "false"])(
    "throws when checkout is disabled (%s)",
    async (checkoutEnabled) => {
      vi.stubEnv("STRIPE_CHECKOUT_ENABLED", checkoutEnabled ?? "");

      await expect(
        createCheckoutSession(
          "price_pro_123",
          "http://localhost/checkout/success",
          "http://localhost/checkout/cancel"
        )
      ).rejects.toThrow("Stripe checkout is disabled");
    }
  );

  it("throws when enabled without a Stripe secret instead of returning successUrl", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    await expect(
      createCheckoutSession(
        "price_pro_123",
        "http://localhost/checkout/success",
        "http://localhost/checkout/cancel"
      )
    ).rejects.toThrow("Stripe checkout is not configured");
  });
});
