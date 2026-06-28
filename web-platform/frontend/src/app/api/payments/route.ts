import { NextRequest, NextResponse } from "next/server";

// Beta preview payment data. Replace with Stripe/customer records before production.
const betaSamplePayments = [
  {
    id: "pay-1",
    amount: 29.0,
    currency: "USD",
    status: "paid",
    created_at: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Pro Plan - Monthly Subscription",
    invoice_id: "inv-001",
  },
  {
    id: "pay-2",
    amount: 29.0,
    currency: "USD",
    status: "paid",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Pro Plan - Monthly Subscription",
    invoice_id: "inv-002",
  },
  {
    id: "pay-3",
    amount: 29.0,
    currency: "USD",
    status: "paid",
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Pro Plan - Monthly Subscription",
    invoice_id: "inv-003",
  },
  {
    id: "pay-4",
    amount: 29.0,
    currency: "USD",
    status: "paid",
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Pro Plan - Monthly Subscription",
    invoice_id: "inv-004",
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let filtered = betaSamplePayments;

    // Filter by status
    if (status && status !== "all") {
      filtered = filtered.filter((p) => p.status === status);
    }

    // Sort by date (newest first) and limit
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      beta_mode: true,
      source: "sample_payments",
      payments: filtered.slice(0, limit),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
