import { NextRequest, NextResponse } from "next/server";

import { requireNextAdmin } from "@/lib/admin-auth";

type EnvProviderStatus = {
  key: string;
  label: string;
  env: string;
  configured: boolean;
  required: boolean;
  state: "ready" | "missing" | "fallback";
};

function provider(key: string, label: string, env: string, required = false): EnvProviderStatus {
  const configured = Boolean(process.env[env]);
  return {
    key,
    label,
    env,
    configured,
    required,
    state: configured ? "ready" : required ? "missing" : "fallback",
  };
}

export async function GET(request: NextRequest) {
  const unauthorized = requireNextAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({
    providers: [
      provider("stripe_secret", "Stripe Secret", "STRIPE_SECRET_KEY"),
      provider("stripe_webhook", "Stripe Webhook", "STRIPE_WEBHOOK_SECRET"),
      provider("stripe_pro_price", "Stripe Pro Price", "STRIPE_PRICE_PRO"),
      provider("stripe_enterprise_price", "Stripe Enterprise Price", "STRIPE_PRICE_ENTERPRISE"),
      provider("email_user", "Email User", "EMAIL_USER"),
      provider("email_password", "Email Password", "EMAIL_PASSWORD"),
      provider("email_from", "Email From", "EMAIL_FROM"),
      provider("email_admin", "Email Admin", "EMAIL_ADMIN"),
      provider("site_url", "Public Site URL", "NEXT_PUBLIC_SITE_URL"),
      provider("api_url", "Backend API URL", "NEXT_PUBLIC_API_URL", true),
    ],
  });
}
