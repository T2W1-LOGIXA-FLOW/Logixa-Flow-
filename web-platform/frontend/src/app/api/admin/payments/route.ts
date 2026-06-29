import { NextRequest, NextResponse } from "next/server";

const betaPayments = [
  {
    id: "beta-payment-1",
    user_id: "beta-user",
    amount: 0,
    currency: "USD",
    status: "pending",
    description: "Beta mode. Connect Stripe before production billing.",
    created_at: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const payments =
      status && status !== "all"
        ? betaPayments.filter((payment) => payment.status === status)
        : betaPayments;

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
