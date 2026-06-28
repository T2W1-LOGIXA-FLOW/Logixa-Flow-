import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build where clause
    const where = status && status !== "all" ? { status } : {};

    // Fetch payments from database
    const payments = await prisma.paymentHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
