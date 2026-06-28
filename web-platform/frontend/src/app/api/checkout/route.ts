import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    // Get user from session/auth (this is a simplified example)
    const userId = "user-123"; // Replace with actual user ID from auth

    // Map plan ID to Stripe price ID
    const stripePriceMap: Record<string, string> = {
      free: "", // Free doesn't need checkout
      pro: process.env.STRIPE_PRICE_PRO || "",
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "",
    };

    if (planId === "free") {
      // Handle free plan directly
      return NextResponse.json({
        success: true,
        message: "Free plan activated",
      });
    }

    const priceId = stripePriceMap[planId];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const baseUrl = request.nextUrl.origin;
    const session = await createCheckoutSession(
      userId,
      priceId,
      `${baseUrl}/checkout/success`,
      `${baseUrl}/checkout/cancel`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
