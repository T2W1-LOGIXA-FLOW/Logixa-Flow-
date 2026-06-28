import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build where clause
    const where = status && status !== "all" ? { status } : {};

    // Fetch submissions from database
    const submissions = await prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
