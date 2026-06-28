import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-05-27.dahlia",
});

export const PRICING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: ["Up to 5 contacts/month", "Basic analytics", "Email support"],
  },
  pro: {
    id: "price_pro", // Replace with actual Stripe price ID
    name: "Pro",
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features: ["Unlimited contacts", "Advanced analytics", "Priority support", "Custom branding"],
  },
  enterprise: {
    id: "price_enterprise", // Replace with actual Stripe price ID
    name: "Enterprise",
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA"],
  },
};

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: {
      userId,
    },
  });

  return session;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function getSubscriptionDetails(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return null;
  }

  return subscriptions.data[0];
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

export async function createPaymentIntent(
  amount: number,
  currency: string = "usd",
  metadata?: Record<string, string>
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
  });

  return paymentIntent;
}
