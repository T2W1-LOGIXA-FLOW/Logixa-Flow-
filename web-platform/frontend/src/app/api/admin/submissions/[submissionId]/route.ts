import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    void request;
    const params = await context.params;
    const submissionId = params.submissionId;

    return NextResponse.json({
      id: submissionId,
      name: "Beta Visitor",
      email: "beta@example.com",
      phone: "",
      subject: "Beta inquiry",
      message: "Live submission storage is handled by the Render backend.",
      status: "pending",
      created_at: new Date().toISOString(),
      read_at: null,
    });
  } catch (error) {
    console.error("Failed to fetch submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await context.params;
    const submissionId = params.submissionId;
    const body = await request.json();

    return NextResponse.json({
      id: submissionId,
      status: body.status || "reviewed",
      read_at: body.read_at || new Date().toISOString(),
      beta_mode: true,
    });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
