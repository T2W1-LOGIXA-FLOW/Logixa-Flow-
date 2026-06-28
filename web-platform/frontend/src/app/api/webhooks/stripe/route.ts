import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
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
