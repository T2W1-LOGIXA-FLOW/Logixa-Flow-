import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  const stripeEnabled =
    process.env.STRIPE_CHECKOUT_ENABLED === "true";

  if (!stripeEnabled) {
    return NextResponse.json(
      { error: "Stripe integration is temporarily disabled" },
      { status: 503 }
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { beta_mode: true, error: "Stripe webhook is not configured" },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Handle successful subscription
        // Update user subscription in database here
        break;

      case "customer.subscription.updated":
        // Update subscription details in database
        break;

      case "customer.subscription.deleted":
        // Mark subscription as inactive
        break;

      case "invoice.payment_succeeded":
        // Update payment history
        break;

      case "invoice.payment_failed":
        // Send notification to user
        break;

      default:
        // Unhandled event type
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
