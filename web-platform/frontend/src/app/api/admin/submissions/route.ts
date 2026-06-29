import { NextRequest, NextResponse } from "next/server";

const betaSubmissions = [
  {
    id: "beta-submission-1",
    name: "Beta Visitor",
    email: "beta@example.com",
    phone: "",
    subject: "Beta inquiry",
    message: "Connect the Render backend admin endpoint for live submissions.",
    status: "pending",
    created_at: new Date().toISOString(),
    read_at: null,
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const submissions =
      status && status !== "all"
        ? betaSubmissions.filter((submission) => submission.status === status)
        : betaSubmissions;

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
