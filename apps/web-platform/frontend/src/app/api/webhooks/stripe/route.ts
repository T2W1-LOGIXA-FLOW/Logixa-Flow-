import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// These events currently have no durable subscription/payment handlers. Never
// acknowledge them as successful: Stripe would stop retrying and billing state
// would silently drift from the application database.
const unimplementedEventTypes = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

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

  if (unimplementedEventTypes.has(event.type)) {
    return NextResponse.json(
      {
        error:
          "Stripe event processing is not implemented; billing remains unavailable",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ received: true });
}
